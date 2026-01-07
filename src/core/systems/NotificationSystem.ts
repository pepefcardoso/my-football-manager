import { v4 as uuidv4 } from "uuid";
import { GameState } from "../models/gameState";
import {
  Notification,
  NotificationType,
  RelatedEntity,
} from "../models/events";
import { eventBus } from "../events/EventBus";
import { ID } from "../models/types";

export const generateNotification = (
  state: GameState,
  type: NotificationType,
  title: string,
  message: string,
  relatedEntity?: RelatedEntity,
  expiresInDays: number = 7
): Notification => {
  const id = uuidv4();
  const managerId = state.meta.currentUserManagerId;
  const currentDate = state.meta.currentDate;
  const expirationDate = currentDate + expiresInDays * 24 * 60 * 60 * 1000;

  const notification: Notification = {
    id,
    managerId,
    type,
    title,
    message,
    date: currentDate,
    isRead: false,
    relatedEntity,
    expiresAt: expirationDate,
  };

  state.notifications[id] = notification;

  const keys = Object.keys(state.notifications);
  if (keys.length > 100) {
    const oldestKey = keys.sort(
      (a, b) => state.notifications[a].date - state.notifications[b].date
    )[0];
    delete state.notifications[oldestKey];
  }

  return notification;
};

export const markAsRead = (state: GameState, notificationId: ID): void => {
  if (state.notifications[notificationId]) {
    state.notifications[notificationId].isRead = true;
  }
};

export const deleteNotification = (
  state: GameState,
  notificationId: ID
): void => {
  if (state.notifications[notificationId]) {
    delete state.notifications[notificationId];
  }
};

export const cleanOldNotifications = (state: GameState): void => {
  const currentDate = state.meta.currentDate;

  for (const id in state.notifications) {
    const notification = state.notifications[id];

    if (notification.expiresAt && currentDate > notification.expiresAt) {
      delete state.notifications[id];
      continue;
    }

    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (notification.isRead && currentDate - notification.date > thirtyDays) {
      delete state.notifications[id];
    }
  }
};

const checkExpiringContracts = (state: GameState): void => {
  const userClubId = state.meta.userClubId;
  if (!userClubId) return;

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const currentDate = state.meta.currentDate;

  for (const contractId in state.contracts) {
    const contract = state.contracts[contractId];

    if (contract.clubId !== userClubId || !contract.active) continue;

    const daysRemaining = Math.ceil(
      (contract.endDate - currentDate) / ONE_DAY_MS
    );
    const player = state.players[contract.playerId];

    if (!player) continue;

    if (daysRemaining === 30) {
      generateNotification(
        state,
        "IMPORTANT",
        "Contrato Expirando",
        `O contrato de ${player.name} expira em 30 dias. Considere renovar.`,
        { type: "PLAYER", id: player.id }
      );
    }

    if (daysRemaining === 7) {
      generateNotification(
        state,
        "CRITICAL",
        "Contrato no Fim",
        `Última chamada! O contrato de ${player.name} termina em uma semana.`,
        { type: "PLAYER", id: player.id }
      );
    }
  }
};

export const processDailyNotifications = (state: GameState): void => {
  checkExpiringContracts(state);
  cleanOldNotifications(state);
};

export const setupNotificationListeners = (): void => {
  eventBus.clear();

  eventBus.on("PLAYER_RECOVERED", (state, payload) => {
    const player = state.players[payload.playerId];
    if (!player) return;

    generateNotification(
      state,
      "IMPORTANT",
      "Retorno de Lesão",
      `${player.name} recuperou-se totalmente (${payload.injuryName}) e voltou aos treinos.`,
      { type: "PLAYER", id: payload.playerId }
    );
  });

  eventBus.on("PLAYER_INJURY_OCCURRED", (state, payload) => {
    const player = state.players[payload.playerId];
    if (!player) return;

    generateNotification(
      state,
      "CRITICAL",
      "Lesão Confirmada",
      `${player.name} sofreu uma lesão (${payload.injuryName}) e ficará fora por cerca de ${payload.daysOut} dias.`,
      { type: "PLAYER", id: payload.playerId }
    );
  });

  eventBus.on("PLAYER_DEVELOPMENT_BOOST", (state, payload) => {
    const player = state.players[payload.playerId];
    if (!player) return;

    const attrName =
      payload.attribute.charAt(0).toUpperCase() + payload.attribute.slice(1);

    generateNotification(
      state,
      "INFO",
      "Destaque no Treino",
      `${
        player.name
      } impressionou a equipa técnica e melhorou o seu atributo de ${attrName} (+${payload.value.toFixed(
        2
      )}).`,
      { type: "PLAYER", id: payload.playerId }
    );
  });

  eventBus.on("MATCH_FINISHED", (state, payload) => {
    const match = state.matches[payload.matchId];
    if (!match) return;

    const userClubId = state.meta.userClubId;
    if (match.homeClubId !== userClubId && match.awayClubId !== userClubId) {
      return;
    }

    const homeClub = state.clubs[match.homeClubId];
    const awayClub = state.clubs[match.awayClubId];

    const title =
      match.homeClubId === userClubId
        ? `Resultado: vs ${awayClub.name}`
        : `Resultado: vs ${homeClub.name}`;

    const outcomeEmoji =
      (match.homeClubId === userClubId &&
        payload.homeScore > payload.awayScore) ||
      (match.awayClubId === userClubId && payload.awayScore > payload.homeScore)
        ? "✅ Vitória!"
        : payload.homeScore === payload.awayScore
        ? "⚖️ Empate"
        : "❌ Derrota";

    generateNotification(
      state,
      "INFO",
      title,
      `${outcomeEmoji} O jogo terminou: ${homeClub.name} ${payload.homeScore} x ${payload.awayScore} ${awayClub.name}.`,
      { type: "MATCH", id: payload.matchId }
    );
  });
};
