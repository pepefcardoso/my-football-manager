# 📚 Documentação Técnica: Sistema de Transferências e Contratos

## 1. Arquitetura Central

O sistema de transferências segue o padrão Service Layer e utiliza o **Unit of Work** para garantir atomicidade nas operações críticas (Finalização de Transferência).

- **`TransferService`**: Contém a lógica de negócio para criação de propostas, respostas e a execução transacional (`finalizeTransfer`).
- **`TransferValidator`**: Aplica todas as regras de negócio e limites de jogo (orçamento, limite de jogadores, janela de transferência, lesões).
- **`TransferValuationEngine`**: Componente isolado de cálculo de valor de mercado e preço justo de transferência.

## 2. Lógica de Avaliação da AI (`AITransferDecisionMaker`)

A AI é o principal cliente de transferência no jogo. Ela toma decisões de compra e venda com base em quatro fatores principais:

### 2.1. Tomada de Decisão de Compra

1.  **Pré-requisitos:** Verifica se a `TransferWindowManager` indica que a janela está **Aberta** e se o `FinancialHealthChecker` permite transferências (sem *Transfer Ban*).
2.  **Identificação de Necessidade:** Utiliza o `SquadAnalysisService` para obter a **necessidade mais crítica** do elenco (ex: Posição `GK` com 1 jogador, ou Posição `MF` com OVR baixo).
3.  **Seleção de Alvo:** Filtra a lista de jogadores de interesse (`ClubInterests`) pela posição necessária, priorizando jogadores com alto *Overall* e alto nível de interesse (`HIGH_PRIORITY`/`CRITICAL`).
4.  **Viabilidade Financeira:** Utiliza `canAffordPlayer` para confirmar se o time tem orçamento para a `Fee` e espaço salarial para o `WageOffer` estimado.
5.  **Ação de Compra:** Se os requisitos forem atendidos, faz uma oferta inicial. A AI costuma oferecer um valor abaixo do preço de transferência calculado (`TransferValuationEngine`), mas acima do limite de rejeição, para iniciar a negociação.

### 2.2. Avaliação de Propostas Recebidas (Venda)

A decisão da AI ao receber uma proposta (`evaluateIncomingProposal`) baseia-se numa comparação simples:

$$\text{Rácio de Oferta Ajustado} = \frac{\text{Fee Oferecida}}{\text{Valuation do Jogador} \times \text{Fator de Ganância}}$$

1.  **Valuation (Preço Justo):** Calculado pelo `TransferValuationEngine`, ajustado pelo tempo restante de contrato do jogador (contratos curtos reduzem o valor).
2.  **Fator de Ganância (Greed Factor):** Varia com a `TransferStrategy` do clube (ex: *Selling Club* tem um fator mais baixo, facilitando a venda; *Youth Focused* tem um fator mais alto para jovens estrelas).
3.  **Decisão:**
    - Se $\text{Rácio Ajustado} < 0.7$: **Rejeitar**.
    - Se $0.7 \le \text{Rácio Ajustado} < 1.1$: **Contra-proposta** (Zona de Negociação). O valor da contra-proposta é calculado como o *Valuation* $\times$ um multiplicador aleatório alto.
    - Se $\text{Rácio Ajustado} \ge 1.3$: **Aceitar** imediatamente (Oferta Excelente).

## 3. Fluxo Transacional (Finalização)

O método `TransferService.finalizeTransfer` é executado dentro de uma transação (`UnitOfWork.execute`) para garantir que todas as etapas sejam concluídas ou nenhuma seja:

1.  **Débito Comprador:** Redução do `budget` do time comprador pelo valor da `fee`.
2.  **Crédito Vendedor:** Aumento do `budget` do time vendedor pelo valor da `fee`.
3.  **Registro Financeiro:** Criação de dois `FinancialRecord` (Expense para o comprador, Income para o vendedor).
4.  **Atualização do Jogador:** O `teamId` do jogador é movido para o time comprador e seu `moral` é ajustado.
5.  **Histórico:** Criação de um registro em `Transfers` (histórico).
6.  **Status Final:** Atualização do status da proposta para `COMPLETED`.
7.  **Evento:** Publicação do `GameEventType.TRANSFER_COMPLETED` no `GameEventBus`.

---

A sua estrutura de testes e documentação agora refletem a complexidade e os padrões de design aplicados ao seu sistema de transferências. Qual será o seu próximo objetivo?