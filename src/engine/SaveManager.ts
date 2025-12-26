import type { IRepositoryContainer } from "../repositories/IRepositories";
import { Logger } from "../lib/Logger";
import { Result } from "../domain/ServiceResults";
import type { ServiceResult } from "../domain/ServiceResults";
import type {
  GameSave,
  CreateSaveOptions,
  SaveValidationResult,
  GameSaveMetadata,
  GameStateSnapshot,
  TeamSnapshot,
  PlayerSnapshot,
  StaffSnapshot,
  MatchSnapshot,
  StandingSnapshot,
  FinancialSnapshot,
  TransferSnapshot,
  ScoutingSnapshot,
  TransferProposalSnapshot,
  ClubInterestSnapshot,
} from "../domain/GameSaveTypes";
import * as schema from "../db/schema";
import type { IUnitOfWork } from "../repositories/IUnitOfWork";
import { sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

const CURRENT_SAVE_VERSION = "1.0.0";
const MATCH_HISTORY_DEFAULT_LIMIT = 500;
const FINANCIAL_RECORD_DEFAULT_LIMIT = 1000;

export class SaveManager {
  private readonly repos: IRepositoryContainer;
  private readonly logger: Logger;
  private readonly unitOfWork: IUnitOfWork;
  private readonly db: BetterSQLite3Database<typeof schema>;

  constructor(
    repositories: IRepositoryContainer,
    unitOfWork: IUnitOfWork,
    db: BetterSQLite3Database<typeof schema>
  ) {
    this.repos = repositories;
    this.unitOfWork = unitOfWork;
    this.db = db;
    this.logger = new Logger("SaveManager");
  }

  async createSaveContext(
    options: CreateSaveOptions
  ): Promise<ServiceResult<GameSave>> {
    try {
      this.logger.info(`Creating save: ${options.filename}`);

      const gameStateResult = await this.captureGameState(options.filename);
      if (Result.isFailure(gameStateResult)) {
        return gameStateResult;
      }
      const { metadata, gameState } = gameStateResult.data;

      const [
        teams,
        players,
        staff,
        matches,
        standings,
        financialRecords,
        transfers,
        scoutingReports,
        transferProposals,
        clubInterests,
      ] = await Promise.all([
        this.captureTeams(),
        this.capturePlayers(),
        this.captureStaff(),
        this.captureMatches(options.matchHistoryLimit),
        this.captureStandings(),
        this.captureFinancialRecords(options.financialRecordLimit),
        this.captureTransfers(),
        this.captureScoutingReports(),
        this.captureTransferProposals(),
        this.captureClubInterests(),
      ]);

      const save: GameSave = {
        metadata,
        gameState,
        teams,
        players,
        staff,
        matches,
        standings,
        financialRecords,
        transfers,
        scoutingReports,
        transferProposals,
        clubInterests,
      };

      this.logger.info(
        `Save created successfully. Stats: ${teams.length} teams, ${players.length} players, ${matches.length} matches`
      );

      return Result.success(save, "Save context created successfully");
    } catch (error) {
      this.logger.error("Failed to create save context:", error);
      return Result.fail(
        `Failed to create save: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  validateSave(save: GameSave): SaveValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!save.metadata || !save.gameState) {
      errors.push("Save file is missing critical metadata or game state");
    }

    const version = save.metadata?.version || "0.0.0";
    const isCompatible = this.isVersionCompatible(version);

    if (!isCompatible) {
      errors.push(
        `Save version ${version} is not compatible with current game version ${CURRENT_SAVE_VERSION}`
      );
    }

    if (!save.teams || save.teams.length === 0) {
      errors.push("Save contains no team data");
    }

    if (!save.players || save.players.length === 0) {
      warnings.push("Save contains no player data (unusual but not critical)");
    }

    const teamIds = new Set(save.teams.map((t) => t.id));
    const orphanedPlayers = save.players.filter(
      (p) => p.teamId !== null && !teamIds.has(p.teamId)
    );
    if (orphanedPlayers.length > 0) {
      warnings.push(
        `${orphanedPlayers.length} players reference non-existent teams`
      );
    }

    return {
      isValid: errors.length === 0,
      version,
      isCompatible,
      errors,
      warnings,
    };
  }

  validateSaveCompatibility(metadata: GameSaveMetadata): boolean {
    return this.isVersionCompatible(metadata.version);
  }

  private async captureGameState(
    filename: string
  ): Promise<
    ServiceResult<{ metadata: GameSaveMetadata; gameState: GameStateSnapshot }>
  > {
    try {
      const state = await this.repos.gameState.findCurrent();

      if (!state) {
        return Result.fail("No active game state found to save");
      }

      let teamName = "Unemployed";
      let teamReputation = 0;
      let primaryColor = "#1e293b";

      if (state.playerTeamId) {
        const team = await this.repos.teams.findById(state.playerTeamId);
        if (team) {
          teamName = team.name;
          teamReputation = team.reputation;
          primaryColor = team.primaryColor;
        }
      }

      let seasonYear = new Date(state.currentDate).getFullYear();
      if (state.currentSeasonId) {
        const season = await this.repos.seasons.findActiveSeason();
        if (season) {
          seasonYear = season.year;
        }
      }

      const saveId = filename;

      const metadata: GameSaveMetadata = {
        id: saveId,
        filename,
        managerName: state.managerName,
        teamName,
        teamId: state.playerTeamId || 0,
        currentDate: state.currentDate,
        seasonYear,
        reputation: teamReputation,
        playTimeSeconds: (state as any).totalPlayTime || 0,
        lastSaveTimestamp: new Date().toISOString(),
        version: CURRENT_SAVE_VERSION,
        primaryColor,
      };

      const gameState: GameStateSnapshot = {
        currentDate: state.currentDate,
        currentSeasonId: state.currentSeasonId,
        managerName: state.managerName,
        playerTeamId: state.playerTeamId,
        trainingFocus: state.trainingFocus,
        simulationSpeed: state.simulationSpeed,
        totalPlayTime: (state as any).totalPlayTime || 0,
        saveId,
      };

      return Result.success({ metadata, gameState });
    } catch (error) {
      this.logger.error("Failed to capture game state:", error);
      return Result.fail("Failed to capture game state");
    }
  }

  private async captureTeams(): Promise<TeamSnapshot[]> {
    try {
      const teams = await this.repos.teams.findAll();
      return teams.map((team) => ({
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
        badgeUrl: team.badgeUrl,
        reputation: team.reputation,
        budget: team.budget,
        isHuman: team.isHuman,
        stadiumCapacity: team.stadiumCapacity,
        stadiumQuality: team.stadiumQuality,
        trainingCenterQuality: team.trainingCenterQuality,
        youthAcademyQuality: team.youthAcademyQuality,
        fanSatisfaction: team.fanSatisfaction,
        fanBase: team.fanBase,
        transferBudget: team.transferBudget,
        transferStrategy: team.transferStrategy,
      }));
    } catch (error) {
      this.logger.error("Failed to capture teams:", error);
      return [];
    }
  }

  private async capturePlayers(): Promise<PlayerSnapshot[]> {
    try {
      const allTeams = await this.repos.teams.findAll();
      const allPlayers: PlayerSnapshot[] = [];

      for (const team of allTeams) {
        const players = await this.repos.players.findByTeamId(team.id);

        for (const player of players) {
          const playerWithContract = player as any;

          allPlayers.push({
            id: player.id,
            teamId: player.teamId,
            firstName: player.firstName,
            lastName: player.lastName,
            age: player.age,
            nationality: player.nationality,
            position: player.position,
            preferredFoot: player.preferredFoot,
            overall: player.overall,
            potential: player.potential,
            finishing: player.finishing,
            passing: player.passing,
            dribbling: player.dribbling,
            defending: player.defending,
            shooting: player.shooting,
            physical: player.physical,
            pace: player.pace,
            moral: player.moral,
            energy: player.energy,
            fitness: player.fitness,
            form: player.form,
            isYouth: player.isYouth,
            isInjured: player.isInjured,
            injuryType: player.injuryType,
            injuryDaysRemaining: player.injuryDaysRemaining,
            isCaptain: player.isCaptain,
            suspensionGamesRemaining: player.suspensionGamesRemaining,
            contractWage: playerWithContract.salary || null,
            contractStartDate: playerWithContract.contractStart || null,
            contractEndDate: playerWithContract.contractEnd || null,
            contractType: playerWithContract.contractType || null,
            contractStatus: playerWithContract.contractStatus || null,
          });
        }
      }

      const freeAgents = await this.repos.players.findFreeAgents();
      for (const player of freeAgents) {
        allPlayers.push({
          id: player.id,
          teamId: null,
          firstName: player.firstName,
          lastName: player.lastName,
          age: player.age,
          nationality: player.nationality,
          position: player.position,
          preferredFoot: player.preferredFoot,
          overall: player.overall,
          potential: player.potential,
          finishing: player.finishing,
          passing: player.passing,
          dribbling: player.dribbling,
          defending: player.defending,
          shooting: player.shooting,
          physical: player.physical,
          pace: player.pace,
          moral: player.moral,
          energy: player.energy,
          fitness: player.fitness,
          form: player.form,
          isYouth: player.isYouth,
          isInjured: player.isInjured,
          injuryType: player.injuryType,
          injuryDaysRemaining: player.injuryDaysRemaining,
          isCaptain: player.isCaptain,
          suspensionGamesRemaining: player.suspensionGamesRemaining,
          contractWage: null,
          contractStartDate: null,
          contractEndDate: null,
          contractType: null,
          contractStatus: null,
        });
      }

      return allPlayers;
    } catch (error) {
      this.logger.error("Failed to capture players:", error);
      return [];
    }
  }

  private async captureStaff(): Promise<StaffSnapshot[]> {
    try {
      const allTeams = await this.repos.teams.findAll();
      const allStaff: StaffSnapshot[] = [];

      for (const team of allTeams) {
        const staff = await this.repos.staff.findByTeamId(team.id);
        allStaff.push(
          ...staff.map((s) => ({
            id: s.id,
            teamId: s.teamId,
            firstName: s.firstName,
            lastName: s.lastName,
            age: s.age,
            nationality: s.nationality,
            role: s.role,
            overall: s.overall,
            salary: s.salary,
            contractEnd: s.contractEnd,
            specialization: s.specialization,
          }))
        );
      }

      const freeAgentStaff = await this.repos.staff.findFreeAgents();
      allStaff.push(
        ...freeAgentStaff.map((s) => ({
          id: s.id,
          teamId: null,
          firstName: s.firstName,
          lastName: s.lastName,
          age: s.age,
          nationality: s.nationality,
          role: s.role,
          overall: s.overall,
          salary: s.salary,
          contractEnd: s.contractEnd,
          specialization: s.specialization,
        }))
      );

      return allStaff;
    } catch (error) {
      this.logger.error("Failed to capture staff:", error);
      return [];
    }
  }

  private async captureMatches(
    limit: number = MATCH_HISTORY_DEFAULT_LIMIT
  ): Promise<MatchSnapshot[]> {
    try {
      const season = await this.repos.seasons.findActiveSeason();
      if (!season) return [];

      const currentDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(season.startDate);
      const endDate = new Date(currentDate);

      const matches = await this.repos.matches.findByDateRange(
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0]
      );

      const sortedMatches = matches
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);

      return sortedMatches.map((m) => ({
        id: m.id,
        competitionId: m.competitionId,
        seasonId: m.seasonId,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        date: m.date,
        round: m.round,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        isPlayed: m.isPlayed,
        attendance: m.attendance,
        ticketRevenue: m.ticketRevenue,
        weather: m.weather,
        groupName: m.groupName || null,
      }));
    } catch (error) {
      this.logger.error("Failed to capture matches:", error);
      return [];
    }
  }

  private async captureStandings(): Promise<StandingSnapshot[]> {
    try {
      const season = await this.repos.seasons.findActiveSeason();
      if (!season) return [];

      const competitions = await this.repos.competitions.findAll();
      const allStandings: StandingSnapshot[] = [];

      for (const comp of competitions) {
        const standings = await this.repos.competitions.getStandings(
          comp.id,
          season.id
        );
        allStandings.push(
          ...standings.map((s) => ({
            id: s.id,
            competitionId: s.competitionId,
            seasonId: s.seasonId,
            teamId: s.teamId,
            groupName: s.groupName || null,
            phase: s.phase || null,
            played: s.played,
            wins: s.wins,
            draws: s.draws,
            losses: s.losses,
            goalsFor: s.goalsFor,
            goalsAgainst: s.goalsAgainst,
            points: s.points,
          }))
        );
      }

      return allStandings;
    } catch (error) {
      this.logger.error("Failed to capture standings:", error);
      return [];
    }
  }

  private async captureFinancialRecords(
    limit: number = FINANCIAL_RECORD_DEFAULT_LIMIT
  ): Promise<FinancialSnapshot[]> {
    try {
      const season = await this.repos.seasons.findActiveSeason();
      if (!season) return [];

      const allTeams = await this.repos.teams.findAll();
      const allRecords: FinancialSnapshot[] = [];

      for (const team of allTeams) {
        const records = await this.repos.financial.findByTeamAndSeason(
          team.id,
          season.id
        );

        const limitedRecords = records
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
          .slice(0, Math.floor(limit / allTeams.length));

        allRecords.push(
          ...limitedRecords.map((r) => ({
            id: r.id,
            teamId: r.teamId,
            seasonId: r.seasonId,
            date: r.date,
            type: r.type,
            category: r.category,
            amount: r.amount,
            description: r.description,
          }))
        );
      }

      return allRecords;
    } catch (error) {
      this.logger.error("Failed to capture financial records:", error);
      return [];
    }
  }

  private async captureTransfers(): Promise<TransferSnapshot[]> {
    try {
      const season = await this.repos.seasons.findActiveSeason();
      if (!season) return [];

      const transfers = await this.repos.transfers.findRecent(200);

      return transfers.map((t) => ({
        id: t.id,
        playerId: t.playerId,
        fromTeamId: t.fromTeamId,
        toTeamId: t.toTeamId,
        fee: t.fee,
        date: t.date,
        seasonId: t.seasonId,
        type: t.type,
      }));
    } catch (error) {
      this.logger.error("Failed to capture transfers:", error);
      return [];
    }
  }

  private async captureScoutingReports(): Promise<ScoutingSnapshot[]> {
    try {
      const allReports = await this.repos.scouting.findActiveReports();

      return allReports.map((r) => ({
        id: r.id,
        playerId: r.playerId,
        scoutId: r.scoutId,
        teamId: r.teamId,
        date: r.date,
        progress: r.progress,
        overallEstimate: r.overallEstimate,
        potentialEstimate: r.potentialEstimate,
        notes: r.notes,
        recommendation: r.recommendation,
      }));
    } catch (error) {
      this.logger.error("Failed to capture scouting reports:", error);
      return [];
    }
  }

  private async captureTransferProposals(): Promise<
    TransferProposalSnapshot[]
  > {
    try {
      const allTeams = await this.repos.teams.findAll();
      const proposalsMap = new Map<number, TransferProposalSnapshot>();

      for (const team of allTeams) {
        const received = await this.repos.transferProposals.findReceivedByTeam(
          team.id
        );
        const sent = await this.repos.transferProposals.findSentByTeam(team.id);

        const proposals = [...received, ...sent];

        for (const p of proposals) {
          if (!proposalsMap.has(p.id)) {
            proposalsMap.set(p.id, {
              id: p.id,
              playerId: p.playerId,
              fromTeamId: p.fromTeamId,
              toTeamId: p.toTeamId,
              type: p.type,
              status: p.status,
              fee: p.fee,
              wageOffer: p.wageOffer,
              contractLength: p.contractLength,
              createdAt: p.createdAt,
              responseDeadline: p.responseDeadline,
              counterOfferFee: p.counterOfferFee,
              rejectionReason: p.rejectionReason,
            });
          }
        }
      }

      return Array.from(proposalsMap.values());
    } catch (error) {
      this.logger.error("Failed to capture transfer proposals:", error);
      return [];
    }
  }

  private async captureClubInterests(): Promise<ClubInterestSnapshot[]> {
    try {
      const allTeams = await this.repos.teams.findAll();
      const allInterests: ClubInterestSnapshot[] = [];

      for (const team of allTeams) {
        const interests = await this.repos.clubInterests.findByTeamId(team.id);

        allInterests.push(
          ...interests.map((i) => ({
            id: i.id,
            teamId: i.teamId,
            playerId: i.playerId,
            interestLevel: i.interestLevel,
            priority: i.priority,
            maxFeeWillingToPay: i.maxFeeWillingToPay,
            dateAdded: i.dateAdded,
          }))
        );
      }

      return allInterests;
    } catch (error) {
      this.logger.error("Failed to capture club interests:", error);
      return [];
    }
  }

  private generateSaveId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `save_${timestamp}_${random}`;
  }

  private isVersionCompatible(version: string): boolean {
    const [currentMajor] = CURRENT_SAVE_VERSION.split(".");
    const [saveMajor] = version.split(".");
    return currentMajor === saveMajor;
  }

  async loadSave(save: GameSave): Promise<ServiceResult<void>> {
    this.logger.info(`Starting load process for save: ${save.metadata.id}`);

    const validation = this.validateSave(save);
    if (!validation.isValid) {
      return Result.fail(`Invalid save file: ${validation.errors.join(", ")}`);
    }

    try {
      this.logger.debug("🔧 Disabling FK constraints globally for load...");
      this.db.run(sql`PRAGMA foreign_keys = OFF`);

      await this.unitOfWork.execute(async (_txRepos, txDb) => {
        this.logger.debug("🧹 Wiping current database state...");

        await txDb.delete(schema.gameState);
        await txDb.delete(schema.financialRecords);
        await txDb.delete(schema.matchEvents);
        await txDb.delete(schema.scoutingReports);
        await txDb.delete(schema.transfers);
        await txDb.delete(schema.transferProposals);
        await txDb.delete(schema.clubInterests);
        await txDb.delete(schema.playerCompetitionStats);
        await txDb.delete(schema.competitionStandings);
        await txDb.delete(schema.matches);
        await txDb.delete(schema.playerContracts);
        await txDb.delete(schema.players);
        await txDb.delete(schema.staff);
        await txDb.delete(schema.teams);
        await txDb.delete(schema.seasons);

        this.logger.debug("📥 Restoring tables...");

        const seasonsToRestore = new Map<number, number>();

        const registerSeason = (id: number | null | undefined) => {
          if (typeof id === "number" && !seasonsToRestore.has(id)) {
            const currentId = save.gameState.currentSeasonId || id;
            const currentYear = save.metadata.seasonYear;
            const diff = currentId - id;
            seasonsToRestore.set(id, currentYear - diff);
          }
        };

        registerSeason(save.gameState.currentSeasonId);
        save.matches.forEach((m) => registerSeason(m.seasonId));
        save.standings.forEach((s) => registerSeason(s.seasonId));
        save.financialRecords.forEach((f) => registerSeason(f.seasonId));
        save.transfers.forEach((t) => registerSeason(t.seasonId));

        if (seasonsToRestore.size > 0) {
          for (const [id, year] of seasonsToRestore.entries()) {
            await txDb.insert(schema.seasons).values({
              id: id,
              year: year,
              startDate: `${year}-01-01`,
              endDate: `${year}-12-31`,
              isActive: id === save.gameState.currentSeasonId,
            });
          }
          this.logger.debug(`Restored ${seasonsToRestore.size} seasons.`);
        }

        if (save.teams.length > 0) {
          await txDb.insert(schema.teams).values(save.teams);
        }

        if (save.staff.length > 0) {
          await txDb.insert(schema.staff).values(save.staff);
        }

        if (save.players.length > 0) {
          const playersData = save.players.map((p) => ({
            id: p.id,
            teamId: p.teamId,
            firstName: p.firstName,
            lastName: p.lastName,
            age: p.age,
            nationality: p.nationality,
            position: p.position,
            preferredFoot: p.preferredFoot,
            overall: p.overall,
            potential: p.potential,
            finishing: p.finishing,
            passing: p.passing,
            dribbling: p.dribbling,
            defending: p.defending,
            shooting: p.shooting,
            physical: p.physical,
            pace: p.pace,
            moral: p.moral,
            energy: p.energy,
            fitness: p.fitness,
            form: p.form,
            isYouth: p.isYouth,
            isInjured: p.isInjured,
            injuryType: p.injuryType,
            injuryDaysRemaining: p.injuryDaysRemaining,
            isCaptain: p.isCaptain,
            suspensionGamesRemaining: p.suspensionGamesRemaining,
          }));
          await txDb.insert(schema.players).values(playersData);

          const contractsData = save.players
            .filter((p) => p.contractType !== null && p.teamId !== null)
            .map((p) => ({
              playerId: p.id,
              teamId: p.teamId!,
              startDate: p.contractStartDate || new Date().toISOString(),
              endDate: p.contractEndDate || new Date().toISOString(),
              wage: p.contractWage || 0,
              type: p.contractType || "professional",
              status: p.contractStatus || "active",
            }));

          if (contractsData.length > 0) {
            await txDb.insert(schema.playerContracts).values(contractsData);
          }
        }

        if (save.matches.length > 0) {
          await txDb.insert(schema.matches).values(save.matches);
        }

        if (save.standings.length > 0) {
          await txDb.insert(schema.competitionStandings).values(save.standings);
        }

        if (save.financialRecords.length > 0) {
          await txDb
            .insert(schema.financialRecords)
            .values(save.financialRecords);
        }

        if (save.transfers.length > 0) {
          await txDb.insert(schema.transfers).values(save.transfers);
        }

        if (save.scoutingReports.length > 0) {
          await txDb
            .insert(schema.scoutingReports)
            .values(save.scoutingReports);
        }

        if (save.transferProposals.length > 0) {
          const uniqueProposals = Array.from(
            new Map(save.transferProposals.map((p) => [p.id, p])).values()
          );

          if (uniqueProposals.length < save.transferProposals.length) {
            this.logger.warn(
              `Fixed corrupted save: Removed ${
                save.transferProposals.length - uniqueProposals.length
              } duplicate transfer proposals.`
            );
          }

          await txDb.insert(schema.transferProposals).values(uniqueProposals);
        }

        if (save.clubInterests.length > 0) {
          await txDb.insert(schema.clubInterests).values(save.clubInterests);
        }

        await txDb.insert(schema.gameState).values({
          saveId: save.metadata.id,
          currentDate: save.gameState.currentDate,
          currentSeasonId: save.gameState.currentSeasonId,
          managerName: save.gameState.managerName,
          playerTeamId: save.gameState.playerTeamId,
          trainingFocus: save.gameState.trainingFocus,
          simulationSpeed: save.gameState.simulationSpeed,
          totalPlayTime: save.gameState.totalPlayTime,
          lastPlayedAt: new Date().toISOString(),
        });
      });

      this.logger.debug("🔒 Re-enabling FK constraints...");
      this.db.run(sql`PRAGMA foreign_keys = ON`);

      const violations = this.db.all(sql`PRAGMA foreign_key_check`);
      if (violations.length > 0) {
        const v = violations[0] as any;
        this.logger.error(`Integrity Violation: ${JSON.stringify(v)}`);
        // Opcional: Lançar erro aqui se quiser ser estrito, ou deixar passar se for recuperável
      }

      this.logger.info("Save loaded successfully.");
      return Result.success(undefined, "Game loaded successfully");
    } catch (error) {
      try {
        this.db.run(sql`PRAGMA foreign_keys = ON`);
      } catch (e) {
        this.logger.error("Failed to re-enable FK constraints:", e);
      }

      this.logger.error("Failed to load save:", error);
      return Result.fail(
        `Fatal error loading save: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
