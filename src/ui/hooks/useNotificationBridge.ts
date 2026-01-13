import { useEffect } from "react";
import { eventBus } from "../../core/events/EventBus";
import { useGameStore } from "../../state/useGameStore";
import { generateNotification } from "../../core/systems/NotificationSystem";
import { GameState } from "../../core/models/gameState";
import { RelatedEntity } from "../../core/models/events";
import { logger } from "../../core/utils/Logger";

export const useNotificationBridge = () => {
  const setState = useGameStore((s) => s.setState);

  useEffect(() => {
    logger.debug(
      "NotificationBridge",
      "🔌 Conectando listeners de notificação..."
    );

    const unsubs: Array<() => void> = [];

    const dispatchNotification = (
      type: "CRITICAL" | "IMPORTANT" | "INFO",
      title: string,
      message: string,
      relatedEntity?: RelatedEntity
    ) => {
      setState((state: GameState) => {
        const notification = generateNotification(
          state,
          type,
          title,
          message,
          relatedEntity
        );

        eventBus.emit(state, "NOTIFICATION_CREATED", { notification });
      });
    };

    unsubs.push(
      eventBus.on("PLAYER_RECOVERED", (_state, payload) => {
        dispatchNotification(
          "IMPORTANT",
          "Retorno de Lesão",
          `${payload.injuryName} curada. Jogador de volta aos treinos.`,
          { type: "PLAYER", id: payload.playerId }
        );
      })
    );

    unsubs.push(
      eventBus.on("PLAYER_INJURY_OCCURRED", (_state, payload) => {
        dispatchNotification(
          "CRITICAL",
          "Lesão Confirmada",
          `Lesão (${payload.injuryName}) confirmada. Tempo de recuperação: ${payload.daysOut} dias.`,
          { type: "PLAYER", id: payload.playerId }
        );
      })
    );

    unsubs.push(
      eventBus.on("PLAYER_DEVELOPMENT_BOOST", (_state, payload) => {
        const attrName =
          payload.attribute.charAt(0).toUpperCase() +
          payload.attribute.slice(1);
        dispatchNotification(
          "INFO",
          "Destaque no Treino",
          `Evolução notável em ${attrName} (+${payload.value.toFixed(2)}).`,
          { type: "PLAYER", id: payload.playerId }
        );
      })
    );

    unsubs.push(
      eventBus.on("MATCH_FINISHED", (currentState, payload) => {
        const match = currentState.matches.matches[payload.matchId];
        if (!match) return;

        const userClubId = currentState.meta.userClubId;
        if (
          match.homeClubId !== userClubId &&
          match.awayClubId !== userClubId
        ) {
          return;
        }

        const homeClub = currentState.clubs.clubs[match.homeClubId];
        const awayClub = currentState.clubs.clubs[match.awayClubId];

        const outcomeEmoji =
          (match.homeClubId === userClubId &&
            payload.homeScore > payload.awayScore) ||
          (match.awayClubId === userClubId &&
            payload.awayScore > payload.homeScore)
            ? "✅ Vitória!"
            : payload.homeScore === payload.awayScore
            ? "⚖️ Empate"
            : "❌ Derrota";

        dispatchNotification(
          "INFO",
          `Fim de Jogo: ${outcomeEmoji}`,
          `${homeClub.name} ${payload.homeScore} x ${payload.awayScore} ${awayClub.name}`,
          { type: "MATCH", id: payload.matchId }
        );
      })
    );

    return () => {
      logger.debug("NotificationBridge", "🔌 Desconectando listeners...");
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
  }, [setState]);
};
