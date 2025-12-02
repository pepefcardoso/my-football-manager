/// <reference types="vite/client" />

interface Team {
  id: number;
  name: string;
  shortName: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  reputation: number | null;
  budget: number | null;
}

declare namespace NodeJS {
  interface Process {
    resourcesPath: string;
  }
}

interface Window {
  electronAPI: {
    getTeams: () => Promise<Team[]>;
  }
}