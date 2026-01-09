import { v4 as uuidv4 } from "uuid";
import { GameState } from "../models/gameState";
import {
  Notification,
  NotificationType,
  RelatedEntity,
} from "../models/events";
import { ID } from "../models/types";

const createNotificationObject = (
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

  return {
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
};

export const generateNotification = (
  state: GameState,
  type: NotificationType,
  title: string,
  message: string,
  relatedEntity?: RelatedEntity,
  expiresInDays: number = 7
): Notification => {
  const notification = createNotificationObject(
    state,
    type,
    title,
    message,
    relatedEntity,
    expiresInDays
  );

  state.system.notifications[notification.id] = notification;

  const keys = Object.keys(state.system.notifications);
  if (keys.length > 100) {
    const oldestKey = keys.sort(
      (a, b) =>
        state.system.notifications[a].date - state.system.notifications[b].date
    )[0];
    delete state.system.notifications[oldestKey];
  }

  return notification;
};

export const markAsRead = (state: GameState, notificationId: ID): void => {
  if (state.system.notifications[notificationId]) {
    state.system.notifications[notificationId].isRead = true;
  }
};

export const deleteNotification = (
  state: GameState,
  notificationId: ID
): void => {
  if (state.system.notifications[notificationId]) {
    delete state.system.notifications[notificationId];
  }
};

export const cleanOldNotifications = (state: GameState): void => {
  const currentDate = state.meta.currentDate;

  for (const id in state.system.notifications) {
    const notification = state.system.notifications[id];

    if (notification.expiresAt && currentDate > notification.expiresAt) {
      delete state.system.notifications[id];
      continue;
    }

    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (notification.isRead && currentDate - notification.date > thirtyDays) {
      delete state.system.notifications[id];
    }
  }
};

const checkExpiringContracts = (state: GameState): Notification[] => {
  const generatedNotifications: Notification[] = [];
  const userClubId = state.meta.userClubId;
  if (!userClubId) return [];

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const currentDate = state.meta.currentDate;

  for (const contractId in state.market.contracts) {
    const contract = state.market.contracts[contractId];

    if (contract.clubId !== userClubId || !contract.active) continue;

    const daysRemaining = Math.ceil(
      (contract.endDate - currentDate) / ONE_DAY_MS
    );
    const player = state.people.players[contract.playerId];

    if (!player) continue;

    if (daysRemaining === 30) {
      generatedNotifications.push(
        generateNotification(
          state,
          "IMPORTANT",
          "Contrato Expirando",
          `O contrato de ${player.name} expira em 30 dias. Considere renovar.`,
          { type: "PLAYER", id: player.id }
        )
      );
    }

    if (daysRemaining === 7) {
      generatedNotifications.push(
        generateNotification(
          state,
          "CRITICAL",
          "Contrato no Fim",
          `Última chamada! O contrato de ${player.name} termina em uma semana.`,
          { type: "PLAYER", id: player.id }
        )
      );
    }
  }
  return generatedNotifications;
};

export const processDailyNotifications = (state: GameState): Notification[] => {
  cleanOldNotifications(state);
  return checkExpiringContracts(state);
};
