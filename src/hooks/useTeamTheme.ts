import { useEffect } from "react";
import type { Team } from "../domain/models";

export function useTeamTheme(team: Team | null) {
  useEffect(() => {
    const root = document.documentElement;

    if (team) {
      root.style.setProperty("--team-primary", team.primaryColor);
      root.style.setProperty("--team-secondary", team.secondaryColor);
      root.style.setProperty("--team-primary-dim", `${team.primaryColor}CC`);
    } else {
      root.style.setProperty("--team-primary", "#059669");
      root.style.setProperty("--team-secondary", "#10b981");
    }
  }, [team?.id, team?.primaryColor, team?.secondaryColor, team]);
}
