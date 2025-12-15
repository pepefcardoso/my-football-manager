import { RandomEngine } from "../../engine/RandomEngine";
import type { NarrativeEvent, EventTriggerContext } from "../narrative";

export class EventLibrary {
  /**
   * Gera um evento de Crise de Balneário se a moral estiver baixa.
   */
  static getDressingRoomCrisis(
    context: EventTriggerContext
  ): NarrativeEvent | null {
    if (context.averageMorale > 45) return null;

    if (!RandomEngine.chance(30)) return null;

    return {
      id: `crisis_dressing_${Date.now()}`,
      title: "Crise no Vestiário",
      description:
        "O clima no vestiário está pesado. Líderes do elenco reclamam da falta de resultados e da gestão do grupo.",
      category: "player",
      importance: "high",
      date: context.currentDate,
      options: [
        {
          id: "crisis_meeting",
          label: "Convocar Reunião de Emergência",
          effectDescription: "Tenta recuperar a união (+Moral, -Energia)",
        },
        {
          id: "crisis_hardline",
          label: "Cobrar Profissionalismo",
          effectDescription: "Postura dura (+Fitness, Risco de -Moral)",
        },
        {
          id: "crisis_ignore",
          label: "Ignorar e Focar no Treino",
          effectDescription: "O problema pode piorar",
        },
      ],
    };
  }

  /**
   * Gera um evento de Entrevista Pós-Jogo ou Coletiva de Imprensa.
   */
  static getMediaInterview(
    context: EventTriggerContext
  ): NarrativeEvent | null {
    if (!RandomEngine.chance(15)) return null;

    return {
      id: `media_interview_${Date.now()}`,
      title: "Coletiva de Imprensa",
      description:
        "Jornalistas questionam sobre o momento atual do clube e suas expectativas para a temporada.",
      category: "media",
      importance: "medium",
      date: context.currentDate,
      options: [
        {
          id: "media_praise_players",
          label: "Elogiar o Elenco",
          effectDescription: "Protege os jogadores (+Moral, +Reputação)",
        },
        {
          id: "media_promise_title",
          label: "Prometer Títulos",
          effectDescription: "Aumenta expectativa da torcida (Risco alto)",
        },
        {
          id: "media_deflect",
          label: "Evitar Polêmicas",
          effectDescription: "Sem grandes efeitos",
        },
      ],
    };
  }

  /**
   * Gera um evento raro de Venda do Clube (Takeover).
   */
  static getClubTakeover(context: EventTriggerContext): NarrativeEvent | null {
    const isRareChance = RandomEngine.chance(0.5);
    const isDebtTrigger = context.budget < -5_000_000 && RandomEngine.chance(5);

    if (!isRareChance && !isDebtTrigger) return null;

    const investorType = RandomEngine.chance(50) ? "Tycoon" : "Consortium";

    const description =
      investorType === "Tycoon"
        ? "Um bilionário estrangeiro fez uma oferta para comprar o clube e promete injetar capital pesado."
        : "Um consórcio local propõe assumir a gestão para sanear as dívidas e reestruturar o clube.";

    return {
      id: `takeover_${Date.now()}`,
      title: "Proposta de Compra do Clube",
      description: description,
      category: "board",
      importance: "critical",
      date: context.currentDate,
      options: [
        {
          id: "takeover_welcome",
          label: "Apoiar a Venda",
          effectDescription: "Grande injeção de dinheiro (+Orçamento)",
        },
        {
          id: "takeover_cautious",
          label: "Pedir Cautela",
          effectDescription: "Manter a identidade do clube (+Estabilidade)",
        },
      ],
    };
  }
}
