# Gestor de Futebol 2D

Um jogo de gestão de futebol desenvolvido com tecnologias web modernas num ambiente desktop. O objetivo é gerir um clube, as suas finanças, plantel e táticas, simulando partidas e temporadas.

## 🚀 Tecnologias Utilizadas

O projeto utiliza uma stack robusta baseada em TypeScript:

- **Core:** [Electron](https://www.electronjs.org/) (Desktop App)
- **Interface:** [React](https://react.dev/) + TailwindCSS
- **Linguagem:** TypeScript
- **Base de Dados:** SQLite (via `better-sqlite3`)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Testes:** Vitest

## 🏗️ Estrutura e Arquitetura

O projeto segue uma arquitetura modular para separar a lógica de jogo da interface:

### 1. Camada de Apresentação (`src/components`)

Contém todos os componentes React. É onde o utilizador interage com o jogo (ex: ver o plantel, ver o estádio, definir táticas).

### 2. Camada de Serviços (`src/services`)

Contém a "Regra de Negócio" do jogo. Os serviços orquestram as ações complexas.

- Exemplos: `FinanceService` (gere dinheiro), `TransferService` (gere contratações), `SeasonService` (gere a época).

### 3. Motor de Jogo (`src/engine`)

Responsável pela simulação pura e matemática que não depende da interação direta do utilizador.

- **MatchEngine:** Simula os 90 minutos de uma partida.
- **TimeEngine:** Controla o avanço dos dias e eventos do calendário.

### 4. Camada de Dados (`src/repositories` e `src/db`)

Responsável por guardar e ler o jogo salvo (Save Game).

- Usa o padrão **Repository** para abstrair as queries SQL.
- Usa o **Drizzle ORM** para definir o esquema da base de dados.

## 🛠️ Como Instalar e Rodar

Certifica-te que tens o Node.js instalado.

1.  **Instalar dependências:**

    ```bash
    npm install
    ```

2.  **Configurar a Base de Dados (Primeira vez):**

    ```bash
    npm run db:generate
    npm run db:push
    npm run db:seed
    ```

3.  **Rodar em modo de desenvolvimento:**

    ```bash
    npm run dev
    ```

4.  **Compilar para produção (Windows/Mac/Linux):**
    ```bash
    npm run build
    ```

## 🧪 Testes

Para garantir que a simulação está correta, corre os testes unitários:

```bash
npm run test
```
