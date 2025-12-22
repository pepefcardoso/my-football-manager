import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  team: {
    getTeams: () => ipcRenderer.invoke("team:getTeams"),
  },

  player: {
    getPlayers: (teamId: number) =>
      ipcRenderer.invoke("player:getPlayers", teamId),
    getYouthPlayers: (teamId: number) =>
      ipcRenderer.invoke("player:getYouthPlayers", teamId),
    getFreeAgents: () => ipcRenderer.invoke("player:getFreeAgents"),
    getPlayerWithContract: (playerId: number) =>
      ipcRenderer.invoke("player:getPlayerWithContract", playerId),
    updatePlayerCondition: (playerId: number, updates: any) =>
      ipcRenderer.invoke("player:updatePlayerCondition", {
        playerId,
        ...updates,
      }),
  },

  youth: {
    getPlayers: (teamId: number) =>
      ipcRenderer.invoke("youth:getPlayers", teamId),
    promote: (playerId: number, teamId: number) =>
      ipcRenderer.invoke("youth:promote", { playerId, teamId }),
    release: (playerId: number, teamId: number) =>
      ipcRenderer.invoke("youth:release", { playerId, teamId }),
  },

  staff: {
    getStaff: (teamId: number) => ipcRenderer.invoke("staff:getStaff", teamId),
    getFreeAgents: () => ipcRenderer.invoke("staff:getFreeAgents"),
    hireStaff: (
      teamId: number,
      staffId: number,
      salary: number,
      contractEnd: string
    ) =>
      ipcRenderer.invoke("staff:hireStaff", {
        teamId,
        staffId,
        salary,
        contractEnd,
      }),
    fireStaff: (staffId: number) =>
      ipcRenderer.invoke("staff:fireStaff", staffId),
  },

  match: {
    getMatches: (teamId: number, seasonId: number) =>
      ipcRenderer.invoke("match:getMatches", { teamId, seasonId }),
    startMatch: (matchId: number) =>
      ipcRenderer.invoke("match:startMatch", matchId),
    pauseMatch: (matchId: number) =>
      ipcRenderer.invoke("match:pauseMatch", matchId),
    resumeMatch: (matchId: number) =>
      ipcRenderer.invoke("match:resumeMatch", matchId),
    simulateMatchMinute: (matchId: number) =>
      ipcRenderer.invoke("match:simulateMatchMinute", matchId),
    simulateFullMatch: (matchId: number) =>
      ipcRenderer.invoke("match:simulateFullMatch", matchId),
    getMatchState: (matchId: number) =>
      ipcRenderer.invoke("match:getMatchState", matchId),
    simulateMatchesOfDate: (date: string) =>
      ipcRenderer.invoke("match:simulateMatchesOfDate", date),
    substitutePlayer: (
      matchId: number,
      isHome: boolean,
      playerOutId: number,
      playerInId: number
    ) =>
      ipcRenderer.invoke("match:substitutePlayer", {
        matchId,
        isHome,
        playerOutId,
        playerInId,
      }),
    updateLiveTactics: (
      matchId: number,
      isHome: boolean,
      tactics: Partial<{
        style:
          | "possession"
          | "counter_attack"
          | "pressing"
          | "long_ball"
          | "balanced";
        marking: "zonal" | "man_to_man" | "mixed" | "pressing_high";
        mentality:
          | "ultra_defensive"
          | "defensive"
          | "normal"
          | "attacking"
          | "ultra_attacking";
        passingDirectness: "short" | "mixed" | "long" | "direct";
      }>
    ) =>
      ipcRenderer.invoke("match:updateLiveTactics", {
        matchId,
        isHome,
        tactics,
      }),
    analyzeTactics: (matchId: number, isHome: boolean) =>
      ipcRenderer.invoke("match:analyzeTactics", { matchId, isHome }),
    suggestTactics: (matchId: number, isHome: boolean) =>
      ipcRenderer.invoke("match:suggestTactics", { matchId, isHome }),
    savePreMatchTactics: (matchId: number, homeLineup: any, awayLineup: any) =>
      ipcRenderer.invoke("match:savePreMatchTactics", {
        matchId,
        homeLineup,
        awayLineup,
      }),
  },

  competition: {
    getCompetitions: () => ipcRenderer.invoke("competition:getCompetitions"),
    getTeamForm: (teamId: number, competitionId: number, seasonId: number) =>
      ipcRenderer.invoke("competition:getTeamForm", {
        teamId,
        competitionId,
        seasonId,
      }),
    getStandings: (competitionId: number, seasonId: number) =>
      ipcRenderer.invoke("competition:getStandings", {
        competitionId,
        seasonId,
      }),
    getTopScorers: (competitionId: number, seasonId: number) =>
      ipcRenderer.invoke("competition:getTopScorers", {
        competitionId,
        seasonId,
      }),
    getTopGoalkeepers: (competitionId: number, seasonId: number) =>
      ipcRenderer.invoke("competition:getTopGoalkeepers", {
        competitionId,
        seasonId,
      }),
  },

  game: {
    getGameState: () => ipcRenderer.invoke("game:getGameState"),
    advanceDay: () => ipcRenderer.invoke("game:advanceDay"),
    startAutoSimulation: () => ipcRenderer.invoke("game:startAutoSimulation"),
    stopAutoSimulation: () => ipcRenderer.invoke("game:stopAutoSimulation"),
    onDailyUpdate: (callback: (data: any) => void) =>
      ipcRenderer.on("game:dailyUpdate", (_, data) => callback(data)),
    updateTrainingFocus: (focus: string) =>
      ipcRenderer.invoke("game:updateTrainingFocus", focus),
    saveGame: (filename: string) =>
      ipcRenderer.invoke("game:saveGame", filename),
    listSaves: () => ipcRenderer.invoke("game:listSaves"),
    loadGame: (filename: string) =>
      ipcRenderer.invoke("game:loadGame", filename),
    startNewGame: (data: {
      teamId: number;
      saveName: string;
      managerName: string;
    }) => ipcRenderer.invoke("game:startNewGame", data),
    respondToEvent: (data: any) =>
      ipcRenderer.invoke("game:respondToEvent", data),
  },

  finance: {
    checkFinancialHealth: (teamId: number) =>
      ipcRenderer.invoke("finance:checkFinancialHealth", teamId),
    canMakeTransfers: (teamId: number) =>
      ipcRenderer.invoke("finance:canMakeTransfers", teamId),
    getFinancialRecords: (teamId: number, seasonId: number) =>
      ipcRenderer.invoke("finance:getFinancialRecords", { teamId, seasonId }),
    getFinancialHealth: (teamId: number) =>
      ipcRenderer.invoke("finance:getFinancialHealth", teamId),
    getMonthlyReport: (teamId: number, seasonId: number) =>
      ipcRenderer.invoke("finance:getMonthlyReport", { teamId, seasonId }),
    getDashboard: (teamId: number, seasonId: number) =>
      ipcRenderer.invoke("finance:getDashboard", { teamId, seasonId }),
    calculatePlayerSalary: (
      playerId: number,
      teamId: number,
      isFreeTransfer: boolean
    ) =>
      ipcRenderer.invoke("finance:calculatePlayerSalary", {
        playerId,
        teamId,
        isFreeTransfer,
      }),
    getTeamWageBill: (teamId: number) =>
      ipcRenderer.invoke("finance:getTeamWageBill", teamId),
    getOperationalCosts: (teamId: number, matchesPlayed: number) =>
      ipcRenderer.invoke("finance:getOperationalCosts", {
        teamId,
        matchesPlayed,
      }),
    projectAnnualRevenue: (
      teamId: number,
      leaguePosition: number,
      homeMatches: number
    ) =>
      ipcRenderer.invoke("finance:projectAnnualRevenue", {
        teamId,
        leaguePosition,
        homeMatches,
      }),
  },

  contract: {
    getWageBill: (teamId: number) =>
      ipcRenderer.invoke("contract:getWageBill", teamId),
    renewPlayerContract: (
      playerId: number,
      newWage: number,
      newEndDate: string
    ) =>
      ipcRenderer.invoke("contract:renewPlayerContract", {
        playerId,
        newWage,
        newEndDate,
      }),
  },

  infrastructure: {
    getStatus: (teamId: number) =>
      ipcRenderer.invoke("infrastructure:getStatus", teamId),

    startUpgrade: (teamId: number, facilityType: string, amount: number = 1) =>
      ipcRenderer.invoke("infrastructure:startUpgrade", {
        teamId,
        facilityType,
        amount,
      }),

    downgradeFacility: (
      teamId: number,
      facilityType: string,
      amount: number = 1
    ) =>
      ipcRenderer.invoke("infrastructure:downgradeFacility", {
        teamId,
        facilityType,
        amount,
      }),
  },

  scouting: {
    getScoutedPlayer: (playerId: number, teamId: number) =>
      ipcRenderer.invoke("scouting:getScoutedPlayer", { playerId, teamId }),
    getScoutingList: (teamId: number) =>
      ipcRenderer.invoke("scouting:getScoutingList", teamId),
    assignScout: (scoutId: number, playerId: number) =>
      ipcRenderer.invoke("scouting:assignScout", { scoutId, playerId }),
    calculateScoutingAccuracy: (teamId: number) =>
      ipcRenderer.invoke("scouting:calculateScoutingAccuracy", teamId),
  },

  transfer: {
    getReceivedProposals: (teamId: number) =>
      ipcRenderer.invoke("transfer:getReceivedProposals", teamId),
    getSentProposals: (teamId: number) =>
      ipcRenderer.invoke("transfer:getSentProposals", teamId),
    createProposal: (input: any) =>
      ipcRenderer.invoke("transfer:createProposal", input),
    respondToProposal: (input: any) =>
      ipcRenderer.invoke("transfer:respondToProposal", input),
    finalizeTransfer: (proposalId: number) =>
      ipcRenderer.invoke("transfer:finalizeTransfer", proposalId),
    getTransferWindowStatus: (date: string) =>
      ipcRenderer.invoke("transfer:getTransferWindowStatus", date),
    onNotification: (callback: (data: any) => void) =>
      ipcRenderer.on("transfer:notification", (_, data) => callback(data)),
    getTransferHistory: (teamId: number) =>
      ipcRenderer.invoke("transfer:getTransferHistory", teamId),
  },

  marketing: {
    getFanSatisfaction: (teamId: number) =>
      ipcRenderer.invoke("marketing:getFanSatisfaction", teamId),
    calculateTicketPriceImpact: (teamId: number, proposedPrice: number) =>
      ipcRenderer.invoke("marketing:calculateTicketPriceImpact", {
        teamId,
        proposedPrice,
      }),
  },

  season: {
    getCurrentSeason: () => ipcRenderer.invoke("season:getCurrentSeason"),
    getRelegationZone: (
      competitionId: number,
      seasonId: number,
      zoneSize?: number
    ) =>
      ipcRenderer.invoke("season:getRelegationZone", {
        competitionId,
        seasonId,
        zoneSize,
      }),
  },
});
