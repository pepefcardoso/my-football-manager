import { GameState } from "../../core/models/gameState";
import { eventBus } from "../../core/events/EventBus";
import { generateNotification } from "../../core/systems/NotificationSystem";
import { useGameStore } from "../useGameStore";

let cleanupFunctions: Array<() => void> = [];

export const setupNotificationBridge = (): void => {
  cleanupFunctions.forEach((unsubscribe) => unsubscribe());
  cleanupFunctions = [];

  const createAndEmit = (
    type: "CRITICAL" | "IMPORTANT" | "INFO",
    title: string,
    message: string,
    relatedEntity?: { type: any; id: string }
  ) => {
    useGameStore.getState().setState((state: GameState) => {
      const notification = generateNotification(
        state,
        type,
        title,
        message,
        relatedEntity as any
      );

      eventBus.emit(state, "NOTIFICATION_CREATED", { notification });
    });
  };

  cleanupFunctions.push(
    eventBus.on("PLAYER_RECOVERED", (_state, payload) => {
      createAndEmit(
        "IMPORTANT",
        "Retorno de Lesão",
        `${payload.injuryName} curada. Jogador de volta aos treinos.`,
        { type: "PLAYER", id: payload.playerId }
      );
    })
  );

  cleanupFunctions.push(
    eventBus.on("PLAYER_INJURY_OCCURRED", (_state, payload) => {
      createAndEmit(
        "CRITICAL",
        "Lesão Confirmada",
        `Lesão (${payload.injuryName}) confirmada. Tempo de recuperação: ${payload.daysOut} dias.`,
        { type: "PLAYER", id: payload.playerId }
      );
    })
  );

  cleanupFunctions.push(
    eventBus.on("PLAYER_DEVELOPMENT_BOOST", (_state, payload) => {
      const attrName =
        payload.attribute.charAt(0).toUpperCase() + payload.attribute.slice(1);
      createAndEmit(
        "INFO",
        "Destaque no Treino",
        `Evolução notável em ${attrName} (+${payload.value.toFixed(2)}).`,
        { type: "PLAYER", id: payload.playerId }
      );
    })
  );

  cleanupFunctions.push(
    eventBus.on("MATCH_FINISHED", (state, payload) => {
      const match = state.matches.matches[payload.matchId];
      if (!match) return;

      const userClubId = state.meta.userClubId;
      if (match.homeClubId !== userClubId && match.awayClubId !== userClubId) {
        return;
      }

      const homeClub = state.clubs.clubs[match.homeClubId];
      const awayClub = state.clubs.clubs[match.awayClubId];

      const outcomeEmoji =
        (match.homeClubId === userClubId &&
          payload.homeScore > payload.awayScore) ||
        (match.awayClubId === userClubId &&
          payload.awayScore > payload.homeScore)
          ? "✅ Vitória!"
          : payload.homeScore === payload.awayScore
          ? "⚖️ Empate"
          : "❌ Derrota";

      createAndEmit(
        "INFO",
        `Fim de Jogo: ${outcomeEmoji}`,
        `${homeClub.name} ${payload.homeScore} x ${payload.awayScore} ${awayClub.name}`,
        { type: "MATCH", id: payload.matchId }
      );
    })
  );
};
