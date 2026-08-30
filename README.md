# 👻 PhantomPlayer

O **PhantomPlayer** é uma aplicação desktop autônoma, segura e altamente eficiente construída com Electron e Node.js. Utilizando a robusta biblioteca oficial, este projeto foi meticulosamente desenhado para interagir de forma direta com a rede central da Steam (Steam3 network). O seu principal objetivo é simular tempo de jogo autêntico e farmar horas em múltiplos títulos de forma simultânea, garantindo um processo contínuo e estável sem a necessidade de intervenção manual constante.

Diferente das abordagens tradicionais, o PhantomPlayer opera inteiramente em segundo plano (modo headless). Isso significa que ele simula a presença do usuário nos servidores da Valve consumindo o mínimo absoluto de recursos de processamento e memória RAM do sistema. Dessa forma, ele elimina completamente a necessidade de possuir um hardware potente, de fazer o download de arquivos pesados ou de executar a interface gráfica dos jogos no seu computador.

A arquitetura do projeto foi estruturada com um foco rigoroso na segurança da conta do usuário. Nenhuma credencial sensível fica exposta diretamente no código fonte, sendo todo o gerenciamento de senhas realizado através de encriptação nativa do sistema operativo (DPAPI no Windows). Além disso, o sistema conta com suporte nativo e integrado ao Steam Guard, permitindo a autenticação de dois fatores pela interface gráfica para assegurar que apenas o proprietário legítimo tenha controle absoluto sobre a sessão ativa.

---

## 📥 Download e Instalação

1. Vá à secção [**Releases**](../../releases) deste repositório
2. Baixe o ficheiro `PhantomPlayer Setup X.X.X.exe`
3. Execute o instalador e siga as instruções
4. Abra o **PhantomPlayer** e faça login com a sua conta Steam

> **Nota:** Não é necessário instalar Node.js nem qualquer outra ferramenta. O instalador inclui tudo.

---

## ✨ Funcionalidades

- 🎮 **Interface gráfica** — Sem terminal, sem ficheiros de configuração
- 📱 **Login por QR Code** — Leia o código QR com a app Steam do telemóvel
- 🔐 **Steam Guard integrado** — Código de autenticação pedido visualmente
- 🕹️ **Pesquisa de jogos** — Encontre jogos por nome diretamente na app
- 🖼️ **Banners HD** — Imagens oficiais da Steam em alta qualidade
- ⏱️ **Rastreio de horas** — Veja quanto tempo já foi farmado por jogo
- 🎨 **Temas personalizáveis** — Phantom Purple, Steam Blue, Cyberpunk Yellow, Midnight Black, Forest Green
- 🔒 **Credenciais encriptadas** — Encriptação nativa do Windows (DPAPI)
- 📌 **System tray** — Minimiza para a bandeja do sistema
- 🌐 **Bilingue** — Interface em Português e Inglês
- 🔄 **Reconexão automática** — Retoma a sessão após quedas temporárias da Steam
- ⏲️ **Temporizadores** — Limite global, hora de paragem e duração individual por jogo
- 🗂️ **Perfis de farm** — Guarde conjuntos de jogos, rotação e duração
- 🃏 **Fila inteligente de cartas** — Revê periodicamente os drops e remove jogos concluídos
- 📊 **Histórico de sessões** — Registo de início, fim, jogos e horas efetivas
- 🛑 **Controles de segurança** — Limite simultâneo, pausa por jogo externo e paragem de emergência
- 💾 **Backup sem segredos** — Exportação JSON, importação e sessões em CSV

---

## 🎮 Como usar

1. **Abra** o PhantomPlayer
2. **Leia o QR Code** com a app Steam do telemóvel (ou use login clássico)
3. **Pesquise jogos** por nome ou adicione por **AppID**
4. Clique em **Iniciar Farm**
5. Pronto! Pode minimizar para a bandeja do sistema

---

## 🔒 Segurança

- Nenhuma credencial é guardada no código fonte ou no repositório
- As senhas são encriptadas pelo **DPAPI do Windows** (o mesmo sistema usado pelo Chrome)
- O ficheiro de configuração fica em `%APPDATA%` — fora do projeto
- Toda a comunicação é feita diretamente com os servidores da Valve
- Tokens de sessão também são protegidos pela encriptação nativa do sistema
- Backups nunca incluem senha, token de sessão ou cookies
- A aplicação permite apagar todos os dados locais e encerrar a sessão imediatamente

---

## 🧪 Testes

```bash
npm test
```

A suíte cobre normalização e limites de jogos, contagem de horas, reconexão, pausa quando outro jogo está ativo, temporizadores, rotação e o contrato entre a interface e a bridge do Electron.

---

## 🛠️ Para Desenvolvedores

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Git](https://git-scm.com/)

### Executar em modo desenvolvimento

```bash
git clone https://github.com/Rcandido42/PhantomPlayer.git
cd PhantomPlayer
npm install
npm start
```

### Gerar o instalador `.exe`

```bash
npm run build
```

O instalador será gerado na pasta `dist/`.

---

## 📁 Estrutura do Projeto

```
PhantomPlayer/
├── main.js              # Processo principal Electron
├── preload.js           # Bridge segura (contextBridge)
├── src/
│   ├── steam/
│   │   └── client.js    # Lógica de conexão steam-user
│   └── store/
│       └── settings.js  # Configurações e credenciais encriptadas
├── renderer/
│   ├── index.html       # Interface gráfica
│   ├── styles.css       # Design dark mode premium
│   └── app.js           # Lógica da UI + tradução PT/EN
├── assets/
│   ├── icon.png         # Ícone da aplicação
│   └── icon.ico         # Ícone do instalador Windows
├── package.json
└── README.md
```

---

## 📄 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).
