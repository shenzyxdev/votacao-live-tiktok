🗳️ Super Urna Live (TikTok LIVE Interactive Voting Game)
Um jogo interativo de apuração e disputa de votos em tempo real desenvolvido para transmissões verticais (9:16) no TikTok LIVE (via OBS Studio, TikTok Live Studio ou Mobile). Os espectadores votam ao vivo através do chat, curtidas, novos seguidores e combos especiais, acompanhando a apuração instantânea na tela da urna eletrônica.

✨ Funcionalidades Principais
📟 Urna Eletrônica Interativa com Áudio Oficial:
Visor animado que digita os números em tempo real, mostra a foto do candidato/equipe, exibe o @nome do espectador que votou e toca o clássico som de confirmação ("Plim-Plim!") sintetizado via Web Audio API.
📊 Barras de Apuração em Tempo Real (% e Total de Votos):
Cálculo automático de porcentagem e total de votos de cada um dos 3 lados (13, 22 e 14), com destaque para quem está liderando a rodada.
👑 Pódio com Reis da Votação (MVPs):
Coroa automaticamente os espectadores que mais contribuíram para cada lado, exibindo o @usuario no topo de cada equipe.
💗 Meta de Curtidas (Modo Fúria — Votos 2X):
Barra de progresso alimentada pelas curtidas da live. Ao bater a meta, ativa o multiplicador de Votos em Dobro (2X) por tempo limitado.
➕ Bônus de Novo Seguidor:
Quem segue a transmissão ganha destaque imediato na tela e adiciona votos bônus instantâneos na urna.
🔥 Combos e Viradas de Placar:
Suporte completo a interações rápidas, viradas de votos e super pacotes que disparam animações especiais e narração por voz em português.
🖥️ Painel de Controle Sincronizado + Modo Limpo (?mode=obs):
Controle total pelo PC (http://localhost:3000) sincronizado em tempo real via Socket.io com a tela limpa vertical (?mode=obs) para captura no OBS Studio, TikTok Live Studio ou celular.

🚀 Como Instalar e Rodar em Qualquer Computador
1. Pré-requisitos
Ter o Node.js instalado no computador.
2. Clonar ou Baixar o Repositório
No terminal (Git Bash ou CMD), execute:
git clone https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git
cd NOME_DO_REPOSITORIO
(Ou baixe o arquivo .zip pelo botão verde Code -> Download ZIP no GitHub e extraia em uma pasta).
3. Instalar as Dependências
Dentro da pasta do projeto, instale os pacotes necessários:
npm install express socket.io tiktok-live-connector@latest
4. Iniciar o Servidor
Execute o comando abaixo para ligar o servidor local:
node server.js

📱 Como Transmitir no TikTok Live Studio / OBS Studio
Painel de Comando (PC):
Abra no navegador: http://localhost:3000
Digite o @usuario da conta que está ao vivo no TikTok e clique em Conectar Live.
Tela Limpa Vertical 9:16 (Captura da Live):
Abra em uma janela separada: http://localhost:3000/?mode=obs (ou use o IP da sua rede local no celular: http://SEU_IP:3000/?mode=obs).
No OBS Studio ou TikTok Live Studio, adicione uma fonte de Captura de Janela (ou fonte de Navegador com largura 414 e altura 736).
Dê um clique na tela do jogo para liberar o som da urna e do narrador.

🛠️ Estrutura de Arquivos
index.html — Interface vertical 9:16 da Super Urna Live, animações de apuração, sintetizador de áudio da urna e painel de controle administrativo.
server.js — Servidor Node.js + Socket.io integrado ao tiktok-live-connector para leitura em tempo real de comentários, curtidas, seguidores e presentes.
package.json — Configuração e dependências do projeto.
