import { useState, useCallback } from "react";
import type { Match } from "../../domain/models";

export type MatchViewState = "calendar" | "pre-match" | "match";

export function useMatchNavigation() {
  const [view, setView] = useState<MatchViewState>("calendar");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const navigateToPreMatch = useCallback((match: Match) => {
    setSelectedMatch(match);
    setView("pre-match");
  }, []);

  const navigateToMatch = useCallback(() => {
    setView("match");
  }, []);

  const backToCalendar = useCallback(() => {
    setSelectedMatch(null);
    setView("calendar");
  }, []);

  return {
    view,
    selectedMatch,
    navigateToPreMatch,
    navigateToMatch,
    backToCalendar,
  };
}
