Technical Design Document (TDD) - Football Manager Project
Versão: 1.0.0 (Reboot)
Tipo de Projeto: Desktop Application (Electron + React)
Arquitetura: State-Driven / Data-Oriented
1. Visão Geral e Filosofia
Este projeto é um jogo de simulação de gestão de futebol single-player. Diferente de aplicações web tradicionais (E-commerce, SaaS), um jogo exige performance em tempo real e manipulação massiva de dados na memória.
Os 3 Mandamentos do Novo Projeto:
A Memória (RAM) é a Verdade: Durante o jogo, todos os dados (jogadores, clubes, ligas) vivem num único objeto global na memória. Não há leituras de banco de dados (SQL) durante a simulação.
Separação Igreja-Estado (UI vs Core):
Core (Lógica): Código TypeScript puro. Não sabe que o React existe. Não sabe o que é um <div>. É testável no terminal.
UI (Interface): Apenas desenha o estado na tela e captura cliques. Nunca faz cálculos de regra de negócio.
Simplicidade nos Dados: Usaremos estruturas de dados otimizadas para leitura rápida (HashMaps/Dicionários) em vez de Arrays para grandes listas.
2. Stack Tecnológica
A escolha das tecnologias foca na rapidez de desenvolvimento (DX) e performance de execução.
Runtime: Electron (Para rodar como app Desktop nativa).
Linguagem: TypeScript (Configurado no modo strict).
Frontend Framework: React + Vite (Rápido, leve).
State Management: Zustand (Store global) + Immer (Para manipular o estado complexo de forma imutável e simples).
Persistência (Save/Load): Serialização de JSON (Escrever o estado da memória num ficheiro local). Abandonaremos o SQL complexo nesta fase inicial.
Estilização: Tailwind CSS (Shadcn/UI opcional para componentes prontos).
3. Arquitetura de Dados (Data-Oriented)
Em vez de classes com comportamento (Player.shoot()), usaremos Interfaces de Dados e Sistemas que processam esses dados.
3.1. O GameState (A Fonte da Verdade)
Todo o jogo cabe dentro de uma interface.
TypeScript
// Estrutura simplificada do Estado Global
interface GameState {
  meta: {
    saveName: string;
    currentDate: string; // ISO Date
    userClubId: string;
  };
  // Dicionários (Record) para acesso O(1) -> Instantâneo
  clubs: Record<string, Club>;
  players: Record<string, Player>;
  matches: Record<string, Match>;
  leagues: Record<string, League>;
}

3.2. Entidades Principais (Models)
Localização: src/core/models/
As entidades são apenas dados.
Player: ID, nome, atributos (0-100), id do clube atual.
Club: ID, nome, cor, reputação, orçamento.
Match: ID, timeA, timeB, scoreA, scoreB, data, jogado (boolean).
4. Estrutura de Diretórios
Esta organização impede que o código "esparguete" se forme.
Plaintext
src/
├── core/                  # 🧠 O MOTOR (TypeScript Puro)
│   ├── constants/         # Configs globais (ex: STARTING_BUDGET)
│   ├── models/            # Interfaces (Tipos de dados)
│   ├── systems/           # A Lógica do jogo (Funções puras)
│   │   ├── MatchEngine.ts      # Resolve partidas
│   │   ├── EconomySystem.ts    # Paga salários, bilheteira
│   │   └── TimeSystem.ts       # Avança o calendário
│   └── utils/             # Geradores (RNG, Nomes aleatórios)
│
├── state/                 # ⚡ O ESTADO (Zustand)
│   ├── useGameStore.ts    # O "Banco de Dados" na memória
│   └── actions.ts         # Funções que a UI chama para mudar o estado
│
├── data/                  # 💾 O DISCO (Save/Load)
│   ├── fileSystem.ts      # Ler/Escrever JSON no disco
│   └── initialSetup.ts    # Cria o "Novo Jogo" (dados iniciais)
│
├── ui/                    # 🎨 A TELA (React)
│   ├── components/        # Botões, Cards, Tabelas
│   ├── screens/           # Telas (Dashboard, Elenco, Tática)
│   ├── layouts/           # Sidebar, Header
│   └── hooks/             # Facilitadores de acesso ao Store
│
├── main.tsx               # Ponto de entrada React
└── worker/                # (Opcional) Para simulações pesadas em background
5. Fluxo de Execução (O "Game Loop")
Como o jogo funciona quando o utilizador clica em "Continuar"?
Input: Usuário clica em "Avançar Dia" na UI.
Dispatch: UI chama useGameStore.getState().advanceDay().
Core Processing (TimeSystem):
Incrementa a data no estado.
Verifica se há jogos (matches) agendados para hoje.
Se houver jogo: Chama MatchEngine.simulate(match).
Verifica finanças: Chama EconomySystem.processDaily(club).
Atualiza lesões/treino.
State Update: O Zustand aplica as mudanças ao GameState.
Render: O React percebe que o GameState mudou e atualiza a tela automaticamente.
6. Padrões de Código (Guidelines)
Regra do "Sem Dependência Inversa"
✅ UI importa de State.
✅ State importa de Core.
❌ Core NUNCA importa de UI ou State. (O Core deve ser independente).
Tratamento de IDs
Sempre usar string (UUID ou nanoid) para IDs. Evitar números autoincrementais para facilitar a fusão de dados ou geração dinâmica.
Salvar e Carregar (Persistência)
Em vez de salvar cada alteração no disco (lento), o jogo só salva quando o utilizador clica em "Salvar" ou ao sair.
O salvamento é um JSON.stringify(gameState) escrito num arquivo .json protegido.

