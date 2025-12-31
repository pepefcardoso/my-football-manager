import { GameState } from "../models/gameState";
import { Match } from "../models/match";

export interface TimeAdvanceResult {
  newDate: number;
  matchesToday: Match[];
  eventsProcessed: string[];
  economyProcessed: boolean;
}

export function advanceOneDay(state: GameState): TimeAdvanceResult {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const previousDate = state.meta.currentDate;
  const newDate = previousDate + ONE_DAY_MS;
  state.meta.currentDate = newDate;
  state.meta.updatedAt = Date.now();
  const matchesToday = findMatchesForDate(state, newDate);
  const eventsProcessed = processScheduledEvents(state, newDate);
  const economyProcessed = processDailyRoutines(state, newDate);

  return {
    newDate,
    matchesToday,
    eventsProcessed,
    economyProcessed,
  };
}

function findMatchesForDate(state: GameState, targetDate: number): Match[] {
  const matches: Match[] = [];
  const targetDay = normalizeToDay(targetDate);

  for (const matchId in state.matches) {
    const match = state.matches[matchId];
    const matchDay = normalizeToDay(match.datetime);

    if (matchDay === targetDay && match.status === "SCHEDULED") {
      matches.push(match);
    }
  }

  return matches;
}

function processScheduledEvents(
  state: GameState,
  currentDate: number
): string[] {
  const processedEvents: string[] = [];
  const currentDay = normalizeToDay(currentDate);

  for (const eventId in state.scheduledEvents) {
    const event = state.scheduledEvents[eventId];
    const eventDay = normalizeToDay(event.date);

    if (eventDay === currentDay && !event.processed) {
      event.processed = true;
      processedEvents.push(event.type);
    }
  }

  return processedEvents;
}

function processDailyRoutines(state: GameState, currentDate: number): boolean {
  for (const playerId in state.playerStates) {
    const playerState = state.playerStates[playerId];

    if (playerState.fitness < 100) {
      playerState.fitness = Math.min(100, playerState.fitness + 2);
    }
  }

  return true;
}

function normalizeToDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function daysBetween(date1: number, date2: number): number {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs(date2 - date1) / ONE_DAY_MS);
}

export function getDayOfWeek(timestamp: number): string {
  const days = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];
  return days[new Date(timestamp).getDay()];
}
