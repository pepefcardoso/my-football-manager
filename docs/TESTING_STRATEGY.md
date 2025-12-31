### 1. Instruções para criar o ficheiro

Cria um novo ficheiro em: `project/docs/TESTING_STRATEGY.md`

### 2. Conteúdo do Ficheiro

```markdown
# Estratégia de Testes e Qualidade (QA)

**Versão:** 1.0.0
**Status:** Ativo
**Tecnologia:** Vitest + React Testing Library

Este documento define os princípios, a arquitetura e as diretrizes para garantir a robustez do motor de simulação do "Maestro".

---

## 1. Filosofia: "O Motor é Sagrado"

Num jogo de simulação complexo, a lógica (Core) é o ativo mais valioso. Um bug na UI é irritante; um bug no cálculo financeiro ou na simulação da partida destrói o save do jogador.

### Os 3 Pilares dos Nossos Testes
1.  **Velocidade Extrema:** Os testes devem rodar em milissegundos. Se demorar, o dev não roda.
2.  **Determinismo:** O jogo usa muito RNG (Random Number Generation). Nos testes, o "acaso" deve ser controlado (Mocked) para que o resultado seja sempre previsível.
3.  **Isolamento de Plataforma:** O código deve ser testável no terminal, sem depender de janelas do Electron ou navegadores reais.

---

## 2. Stack Tecnológica

* **Runner:** [Vitest](https://vitest.dev/) (Substituto rápido do Jest, nativo do Vite).
* **Environment:** `jsdom` (Para simular `window`, `localStorage` e DOM quando necessário).
* **Assertions:** API padrão do Vitest (`expect`, `describe`, `it`).
* **Coverage:** v8.

---

## 3. Arquitetura de Testes (A Pirâmide)

Dada a arquitetura "Data-Oriented" do projeto, focamos pesadamente na base da pirâmide.

### 3.1. Nível 1: Core Systems (Unitários Puros)
* **Alvo:** `src/core/systems/*.ts` (MatchEngine, EconomySystem, TimeSystem).
* **Característica:** TypeScript puro. Sem React, sem Electron, sem Zustand.
* **O que testar:**
    * Regras de negócio (ex: "Jogador lesionado não joga").
    * Matemática financeira (ex: "Juros compostos da dívida").
    * Algoritmos de jogo.
* **Mocking:** `Math.random()` deve ser sempre mockado ou "seeded".

### 3.2. Nível 2: Adaptadores e Dados (Unitários com Mocks)
* **Alvo:** `src/data/*.ts` (FileSystem, Serializers).
* **Característica:** Interagem com o "mundo exterior" (Disco, APIs).
* **Estratégia:** Boundary Mocking.
    * Não testamos se o Electron grava o ficheiro (isso é problema do Electron).
    * Testamos se o nosso código envia os dados corretos para a ponte IPC.
    * *Exemplo:* `src/data/__tests__/fileSystem.test.ts`.

### 3.3. Nível 3: Integração de Estado (Store)
* **Alvo:** `src/state/useGameStore.ts`.
* **Característica:** Testa como as Actions alteram o GameState.
* **Estratégia:**
    1.  Estado Inicial.
    2.  Disparar Action (ex: `advanceDay()`).
    3.  Assert no novo Estado.

### 3.4. Nível 4: UI Components (Snapshot/Visual)
* **Alvo:** `src/ui/**/*.tsx`.
* **Prioridade:** Baixa.
* **Regra:** Como a UI é "burra" (apenas exibe dados), testamos apenas se componentes complexos renderizam sem explodir. Lógica de UI é um *code smell*.

---

## 4. Guidelines e Padrões (Clean Code)

### 4.1. Localização dos Ficheiros
Os testes ficam colados à implementação ("Colocation") ou numa pasta `__tests__` no mesmo nível.
* `src/core/systems/TimeSystem.ts`
* `src/core/systems/__tests__/TimeSystem.test.ts`

### 4.2. Padrão AAA (Arrange, Act, Assert)
Todo teste deve seguir esta estrutura visualmente clara.

```typescript
it('should promote youth player to senior squad', () => {
  // ARRANGE (Preparar o cenário)
  const club = createMockClub();
  const youthPlayer = createYouthPlayer();
  
  // ACT (Executar a ação)
  const result = promotePlayer(club, youthPlayer);

  // ASSERT (Verificar o resultado)
  expect(result.success).toBe(true);
  expect(club.players).toContain(youthPlayer.id);
});

```

### 4.3. Factories vs JSON Gigantes

Nunca copie e cole objetos JSON gigantes de 500 linhas nos testes. Use "Object Mothers" ou Factories.

**Mau:**

```typescript
const state = { meta: { ... }, clubs: { ... }, players: { ... } ... } // 50 linhas de lixo

```

**Bom:**

```typescript
const state = createMockGameState(); // Função helper reutilizável
const player = createMockPlayer({ skill: 99 }); // Override específico

```

---

## 5. Lidando com Dependências Externas (Mocks)

### 5.1. Electron IPC e Window

O ambiente de teste (JSDOM) não tem o binário do Electron. Devemos injetar mocks globais.

```typescript
// Exemplo de Mock do Electron API
const electronMock = {
  saveGame: vi.fn(),
  loadGame: vi.fn()
};
vi.stubGlobal('electronAPI', electronMock);

```

### 5.2. Tempo e Datas

Nunca use `setTimeout` em testes de lógica. Use Fake Timers do Vitest para controlar o relógio do sistema, essencial para testar `advanceDay`.

```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

it('should pass 24 hours', () => {
  const date = new Date(2024, 0, 1);
  vi.setSystemTime(date);
  // ... executa lógica
  expect(newDate.getDate()).toBe(2);
});

```

---

## 6. Comandos Úteis

* `npm test` - Roda todos os testes.
* `npm test -- ui` - Abre a interface gráfica do Vitest (excelente para debug).
* `npm test -- coverage` - Gera relatório de cobertura de código.