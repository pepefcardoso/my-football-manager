# Guia de Interface e UX (Maestro Project)

**Versão:** 1.0.0
**Status:** Em Desenvolvimento

Este documento define os princípios, padrões e tokens de design para a interface do projeto Maestro. O objetivo é garantir uma experiência coesa, performática e focada na leitura de dados (Data-Driven UI).

---

## 1. Filosofia de Design

O Maestro é um jogo de simulação de gestão. Diferente de jogos de ação ou sites de marketing, a nossa prioridade é a **Densidade de Informação** e a **Redução da Carga Cognitiva**.

### Princípios Fundamentais

1. **A Informação é Rei:** O utilizador passa 90% do tempo a ler tabelas, atributos e relatórios. A UI deve ser invisível, servindo apenas como moldura para os dados.
2. **Dark Mode Nativo:** Para evitar fadiga visual em sessões longas de jogo (2h+), utilizamos um esquema de cores escuras com baixo brilho e alto contraste semântico.
3. **Feedback Imediato:** Cada clique, hover ou ação deve ter uma resposta visual instantânea. O jogo nunca deve parecer "congelado".
4. **Consistência de Desktop:** A interface comporta-se como uma aplicação nativa (sem scroll na janela inteira, apenas nos painéis de conteúdo).

---

## 2. Stack Tecnológica de UI

- **Framework:** React 18+ (Componentização).
- **Estilização:** Tailwind CSS (Utility-first para rapidez e padronização).
- **Ícones:** Lucide React (Geométricos, limpos e consistentes).
- **Fontes:** Inter (Sans-serif, otimizada para ecrãs).
- **Gestão de Estado UI:** Zustand (`useUIStore`) - Separação total entre dados do jogo e estado visual.

---

## 3. Design Tokens (Tailwind)

As cores e espaçamentos são centralizados no `tailwind.config.js`. Nunca use valores hexadecimais (`#123456`) diretamente nos componentes.

### Paleta de Cores Semântica

| Token                     | Classe Tailwind               | Utilização                                            |
| ------------------------- | ----------------------------- | ----------------------------------------------------- |
| **Background Principal**  | `bg-background`               | Fundo da janela, atrás de tudo. (Slate 900)           |
| **Background Secundário** | `bg-background-secondary`     | Cards, Sidebar, Cabeçalhos. (Slate 800)               |
| **Background Terciário**  | `bg-background-tertiary`      | Bordas, Separadores, Hovers. (Slate 700)              |
| **Ação / Primária**       | `bg-primary` / `text-primary` | Botões principais, Links, Destaques. (Blue 500)       |
| **Texto Principal**       | `text-text-primary`           | Títulos, Valores importantes. (Slate 50)              |
| **Texto Secundário**      | `text-text-secondary`         | Rótulos (Labels), Metadados. (Slate 400)              |
| **Texto Muted**           | `text-text-muted`             | Texto desabilitado ou de pouco interesse. (Slate 500) |

### Cores de Status (Feedback)

Utilizadas para atributos de jogadores ou resultados de partidas.

- 🟢 **Sucesso (`text-status-success`):** Atributos 16-20, Vitórias, Lucro, Moral Alta.
- 🟡 **Aviso (`text-status-warning`):** Atributos 11-15, Empates, Lesões Leves.
- 🔴 **Perigo (`text-status-danger`):** Atributos 0-10, Derrotas, Prejuízo, Expulsões.

---

## 4. Arquitetura de Layout

O layout segue o padrão **App Shell**:

1. **Sidebar Fixa (Esquerda):** Navegação primária. Nunca sai do ecrã.
2. **Header Fixo (Topo):** Informações de contexto (Data do jogo, Próximo desafio).
3. **Área de Conteúdo (Centro):** O único lugar onde ocorre scroll vertical.

### Regras de Implementação

- **Scrollbars:** Personalizadas no `index.css` para serem finas e escuras.
- **Bordas:** Use bordas sutis (`border-background-tertiary`) para separar seções em vez de sombras pesadas.
- **Vidro (Glassmorphism):** Use com moderação (apenas em overlays ou headers flutuantes) através da classe utilitária `.panel-glass`.

---

## 5. Componentes e Padrões (Do's & Don'ts)

### Botões

- **Do:** Usar `bg-primary` apenas para a ação principal da tela (ex: "Continuar", "Confirmar Transferência").
- **Do:** Usar `hover:bg-opacity-90` ou `hover:brightness-110` para feedback.
- **Don't:** Usar múltiplos botões primários na mesma visualização.

### Tabelas (O coração do jogo)

- **Do:** Alinhar textos à esquerda e números à direita.
- **Do:** Usar fonte monoespaçada (`font-mono`) para dados financeiros ou datas.
- **Do:** Destacar a linha ao passar o rato (`hover:bg-background-tertiary`).

### Tipografia

- **Títulos:** Font-bold, tracking-wide.
- **Corpo:** Text-sm (14px) é o padrão.
- **Dados Densos:** Text-xs (12px) é aceitável para tabelas grandes, desde que o contraste seja alto.

---

## 6. Acessibilidade e UX

- **Tamanho de Clique:** Botões e links devem ter uma área de clique mínima de 32x32px.
- **Contraste:** Evitar texto cinza escuro sobre fundo preto. Use sempre `text-text-secondary` no mínimo.
- **Estados Vazios:** Se uma lista não tem itens (ex: "Sem transferências"), mostre sempre uma mensagem explicativa e amigável, nunca um espaço em branco.

---

## 7. Integração com Lógica (Clean Code)

A UI deve ser "burra".

- ❌ **Errado:** O botão calcula o salário restante ao ser clicado.
- ✅ **Correto:** O botão chama `actions.submitOffer()`, a lógica processa, o estado atualiza, e a UI apenas reflete o novo valor.

```tsx
// Exemplo de Componente "Clean"
const PlayerCard = ({ player }) => {
  // A UI apenas pede a cor, não calcula se é bom ou mau
  const statusColor = getAttributeColor(player.finish);

  return (
    <div className="bg-background-secondary p-4 rounded border border-background-tertiary">
      <h3 className="text-text-primary">{player.name}</h3>
      <span className={`font-bold ${statusColor}`}>{player.finish}</span>
    </div>
  );
};
```
