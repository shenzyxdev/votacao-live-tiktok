const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const tiktokConnector = require('tiktok-live-connector');

// Compatibilidade automática com versões novas e antigas da biblioteca do TikTok
const WebcastConnectionClass = tiktokConnector.TikTokLiveConnection || tiktokConnector.WebcastPushConnection;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(__dirname));

let tiktokConnection = null;
let lastVoterSide = {}; // Guarda o candidato escolhido por cada espectador no chat

// ESTADO GLOBAL CENTRALIZADO NO SERVIDOR (Sincroniza Tempo + Placar entre PC e Celular)
let masterClock = {
    timeRemaining: 300,
    isEnded: false,
    endCountdown: 10,
    votes: null
};

// Relógio Mestre do Servidor (1 segundo) -> Envia o tempo exato para PC e Celular juntos!
setInterval(() => {
    if (masterClock.isEnded) {
        masterClock.endCountdown--;
        if (masterClock.endCountdown <= 0) {
            masterClock.isEnded = false;
            masterClock.timeRemaining = 300;
            masterClock.endCountdown = 10;
            masterClock.votes = [100, 100, 100];
            io.emit('admin_command', { type: 'reset', payload: {} });
        }
    } else {
        masterClock.timeRemaining--;
        if (masterClock.timeRemaining <= 0) {
            masterClock.timeRemaining = 0;
            masterClock.isEnded = true;
            masterClock.endCountdown = 10;
        }
    }
    io.emit('clock_sync', masterClock);
}, 1000);

// Reconhece pelo nome do presente no TikTok para qual candidato ele vai!
function detectCandidateByGiftName(giftName = '') {
    const g = giftName.toUpperCase();
    if (g.includes('ROSE') || g.includes('ROSA') || g.includes('BEER') || g.includes('CERVEJA') || g.includes('HEART') || g.includes('CORA') || g.includes('ROCKET') || g.includes('FOGUETE') || g.includes('LION') || g.includes('LEÃO')) return 0;
    if (g.includes('COFFEE') || g.includes('CAF') || g.includes('ICE CREAM') || g.includes('CASQUINHA') || g.includes('GUN') || g.includes('ARMA') || g.includes('MONEY') || g.includes('SUNGLASS') || g.includes('ÓCULOS') || g.includes('GALAXY') || g.includes('GALÁXIA') || g.includes('HAWK') || g.includes('FALCON')) return 1;
    if (g.includes('TIKTOK') || g.includes('LIGHTNING') || g.includes('RAIO') || g.includes('HAT') || g.includes('CAP') || g.includes('BONÉ') || g.includes('CHAPÉU') || g.includes('TROPHY') || g.includes('TROFÉU') || g.includes('UNIVERSE') || g.includes('UNIVERSO')) return 2;
    return null;
}

function connectTikTok(username) {
    if (tiktokConnection) {
        try { tiktokConnection.disconnect(); } catch (e) {}
    }
    console.log('⏳ Tentando conectar na live de @' + username + '...');
    io.emit('admin_command', {
        type: 'tiktok_status',
        payload: {
            status: 'connecting',
            username,
            message: '⏳ Procurando live ativa de @' + username + '...'
        }
    });

    try {
        tiktokConnection = new WebcastConnectionClass(username, { processInitialData: false });
    } catch (e) {
        console.error('❌ Erro ao instanciar conexão:', e.message);
        io.emit('admin_command', {
            type: 'tiktok_status',
            payload: {
                status: 'error',
                username,
                message: '❌ Erro ao iniciar conexão: ' + e.message
            }
        });
        return;
    }

    tiktokConnection.connect().then(state => {
        console.log('✅ URNA CONECTADA NA LIVE DE @' + username + ' (Room ID: ' + state.roomId + ')');
        io.emit('admin_command', {
            type: 'tiktok_status',
            payload: {
                status: 'connected',
                username,
                message: '🟢 CONECTADO NA LIVE DE @' + username + ' (Sala: ' + state.roomId + ')'
            }
        });
    }).catch(err => {
        const errMsg = (err && err.message) ? err.message : String(err);
        console.error('❌ Erro ao conectar em @' + username + ':', errMsg);
        io.emit('admin_command', {
            type: 'tiktok_status',
            payload: {
                status: 'error',
                username,
                message: '❌ Falha ao conectar @' + username + ': Verifique se a conta já está AO VIVO no TikTok! (' + errMsg.substring(0, 60) + ')'
            }
        });
    });

    // 1. Comentários do Chat (Lê a mensagem exata do TikTok de forma blindada)
    tiktokConnection.on('chat', data => {
        const rawComment = data.comment || data.msg || data.content || '';
        const msg = String(rawComment).trim().toUpperCase();
        
        const user = {
            username: '@' + (data.uniqueId || 'usuario'),
            initials: (data.uniqueId || 'US').substring(0, 2).toUpperCase(),
            avatarUrl: data.profilePictureUrl || ''
        };

        // CORREÇÃO CRUCIAL: Captura mensagens exatas ou que contenham 13, 22 ou 14
        let cand = null;
        if (msg === '13' || msg.includes(' 13 ') || msg.startsWith('13 ') || msg.endsWith(' 13') || msg.includes('LULA') || msg.includes('PT')) cand = 0;
        else if (msg === '22' || msg.includes(' 22 ') || msg.startsWith('22 ') || msg.endsWith(' 22') || msg.includes('BOLSO') || msg.includes('MITO') || msg.includes('PL')) cand = 1;
        else if (msg === '14' || msg.includes(' 14 ') || msg.startsWith('14 ') || msg.endsWith(' 14') || msg.includes('RENAN') || msg.includes('MISSAO') || msg.includes('MISSÃO')) cand = 2;

        if (cand !== null && data.uniqueId) {
            lastVoterSide[data.uniqueId] = cand;
            io.emit('live_event', {
                type: 'vote',
                cand,
                tier: 'comment',
                giftName: '💬 ' + (cand === 0 ? '13' : cand === 1 ? '22' : '14'),
                user
            });
        } else {
            io.emit('live_event', {
                type: 'chat_raw',
                username: user.username,
                comment: rawComment
            });
        }
    });

    // 2. Presentes / Doações
    tiktokConnection.on('gift', data => {
        if (data.giftType === 1 && !data.repeatEnd) return;

        const repeatCount = data.repeatCount || 1;
        const coins = (data.diamondCount || 1) * repeatCount;

        let cand = detectCandidateByGiftName(data.giftName || '');
        if (cand === null) {
            if (lastVoterSide[data.uniqueId] !== undefined) {
                cand = lastVoterSide[data.uniqueId];
            } else {
                cand = data.uniqueId.length % 3;
            }
        }

        const tier = coins >= 300 ? 'whale' : (coins >= 30 ? 'steal' : 'rose');
        const user = {
            username: '@' + data.uniqueId,
            initials: data.uniqueId.substring(0, 2).toUpperCase(),
            avatarUrl: data.profilePictureUrl
        };

        io.emit('live_event', {
            type: 'vote',
            cand,
            tier,
            giftName: '🎁 ' + (data.giftName || 'Gift'),
            user
        });
    });

    // 3. Curtidas na Live
    tiktokConnection.on('like', data => {
        const count = data.likeCount || 15;
        const user = {
            username: '@' + data.uniqueId,
            initials: data.uniqueId.substring(0, 2).toUpperCase(),
            avatarUrl: data.profilePictureUrl
        };
        io.emit('live_event', { type: 'like', count, user });
    });

    // 4. Novos Seguidores na Live
    tiktokConnection.on('follow', data => {
        const cand = lastVoterSide[data.uniqueId] !== undefined ? lastVoterSide[data.uniqueId] : (data.uniqueId.length % 3);
        const user = {
            username: '@' + data.uniqueId,
            initials: data.uniqueId.substring(0, 2).toUpperCase(),
            avatarUrl: data.profilePictureUrl
        };
        io.emit('live_event', { type: 'follow', cand, user });
    });
}

io.on('connection', socket => {
    socket.emit('clock_sync', masterClock);

    socket.on('connect_tiktok', ({ username }) => connectTikTok(username));
    socket.on('admin_command', cmd => {
        if (cmd.type === 'reset') {
            masterClock.timeRemaining = 300;
            masterClock.isEnded = false;
            masterClock.endCountdown = 10;
            masterClock.votes = [100, 100, 100];
        }
        io.emit('admin_command', cmd);
    });
    socket.on('state_snapshot', snap => {
        if (snap && Array.isArray(snap.votes)) {
            masterClock.votes = snap.votes;
            socket.broadcast.emit('state_snapshot', snap);
        }
    });
});

server.listen(3000, '0.0.0.0', () => {
    console.log('✅ SERVIDOR DA SUPER URNA RODANDO EM TODA A REDE WI-FI!');
    console.log('🎮 Painel no PC: http://localhost:3000');
    console.log('📱 Tela Limpa Celular/Live: http://SEU_IP:3000/?mode=obs');
});