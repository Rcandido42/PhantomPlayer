# 👻 PhantomPlayer

O **PhantomPlayer** é uma aplicação desktop autônoma, segura e altamente eficiente construída com Electron e Node.js. Utilizando a robusta biblioteca oficial, este projeto foi meticulosamente desenhado para interagir de forma direta com a rede central da Steam (Steam3 network). O seu principal objetivo é simular tempo de jogo autêntico e farmar horas em múltiplos títulos de forma simultânea, garantindo um processo contínuo e estável sem a necessidade de intervenção manual constante.

Diferente das abordagens tradicionais, o PhantomPlayer opera inteiramente em segundo plano (modo headless). Isso significa que ele simula a presença do usuário nos servidores da Valve consumindo o mínimo absoluto de recursos de processamento e memória RAM do sistema. Dessa forma, ele elimina completamente a necessidade de possuir um hardware potente, de fazer o download de arquivos pesados ou de executar a interface gráfica dos jogos no seu computador.

A arquitetura do projeto foi estruturada com um foco rigoroso na segurança da conta do usuário. Nenhuma credencial sensível fica exposta diretamente no código fonte, sendo todo o gerenciamento de senhas realizado através de encriptação nativa do sistema operativo (DPAPI no Windows). Além disso, o sistema conta com suporte nativo e integrado ao Steam Guard, permitindo a autenticação de dois fatores pela interface gráfica para assegurar que apenas o proprietário legítimo tenha controle absoluto sobre a sessão ativa.

---

## ✨ Funcionalidades

- 🎮 **Interface gráfica** — Sem terminal, sem ficheiros de configuração
- 🔐 **Steam Guard integrado** — Código de autenticação pedido visualmente
- 🕹️ **Pesquisa de jogos** — Encontre jogos por nome diretamente na app
- ⏱️ **Rastreio de horas** — Veja quanto tempo já foi farmado por jogo
- 🔒 **Credenciais encriptadas** — Encriptação nativa do Windows (DPAPI)
- 📌 **System tray** — Minimiza para a bandeja do sistema
- 🌐 **Bilingue** — Interface em Português e Inglês

---

## 🚀 Instalação e Uso

### Opção 1: Instalador (recomendado)

1. Faça o download do instalador `.exe` na secção [Releases](../../releases)
2. Execute o instalador e siga as instruções
3. Abra o **PhantomPlayer**, faça login com a sua conta Steam e comece a farmar

### Opção 2: A partir do código fonte

#### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Git](https://git-scm.com/)

#### Passos

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/PhantomPlayer.git
cd PhantomPlayer

# Instalar dependências
npm install

# Iniciar a aplicação
npm start
```

#### Gerar o instalador `.exe`

```bash
npm run build
```

O instalador será gerado na pasta `dist/`.

---

## 🎮 Como usar

1. **Abra** o PhantomPlayer
2. **Faça login** com o seu nome de utilizador e senha da Steam
3. Se tiver **Steam Guard**, digite o código quando solicitado
4. **Pesquise jogos** por nome ou adicione por **AppID**
5. Clique em **Iniciar Farm**
6. Pronto! Pode minimizar para a bandeja do sistema

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
│   └── icon.png         # Ícone da aplicação
├── package.json
└── README.md
```
