import { GameState } from "../models/gameState";

export const isValidGameState = (data: unknown): data is GameState => {
  if (!data || typeof data !== "object") {
    return false;
  }

  const state = data as Partial<GameState>;

  if (!state.meta || typeof state.meta !== "object") {
    console.error("[TypeGuard] Falha: 'meta' ausente ou inválido.");
    return false;
  }

  if (
    typeof state.meta.saveName !== "string" ||
    typeof state.meta.version !== "string"
  ) {
    console.error(
      "[TypeGuard] Falha: 'meta.saveName' ou 'meta.version' inválidos."
    );
    return false;
  }

  const requiredDomains = [
    "people",
    "clubs",
    "competitions",
    "matches",
    "market",
    "system",
  ] as const;

  for (const domain of requiredDomains) {
    if (!state[domain] || typeof state[domain] !== "object") {
      console.error(`[TypeGuard] Falha: Domínio '${domain}' ausente.`);
      return false;
    }
  }

  if (!state.people?.players || typeof state.people.players !== "object") {
    console.error("[TypeGuard] Falha: 'people.players' ausente.");
    return false;
  }

  return true;
};
