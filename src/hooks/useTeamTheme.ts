import { useEffect } from "react";
import type { Team } from "../domain/models";

export function useTeamTheme(team: Team | null) {
  useEffect(() => {
    const root = document.documentElement;
    const primary = team?.primaryColor || "#059669";
    const secondary = team?.secondaryColor || "#10b981";
    root.style.setProperty("--team-primary", primary);
    root.style.setProperty("--team-secondary", secondary);
    root.style.setProperty("--team-primary-10", `${primary}1A`);
    root.style.setProperty("--team-primary-20", `${primary}33`);
    root.style.setProperty("--team-primary-50", `${primary}80`);
    root.style.setProperty("--team-primary-80", `${primary}CC`);
  }, [team?.id, team?.primaryColor, team?.secondaryColor]);
}
