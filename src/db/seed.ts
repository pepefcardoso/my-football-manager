import { db } from "../lib/db";
import {
  teams,
  players,
  staff,
  competitions,
  seasons,
  gameState,
  matches,
  financialRecords,
  playerContracts,
  matchEvents,
  scoutingReports,
  transfers,
  competitionStandings,
  playerCompetitionStats,
  transferProposals,
  clubInterests,
  matchTactics,
  scheduledEvents,
} from "./schema";
import { Logger } from "../lib/Logger";
import { TEAMS_DATA } from "./seeds/data";
import {
  generatePlayer,
  generateStaffMember,
  randomInt,
  random,
} from "./seeds/generators";
import { quickSimulateMatch } from "./seeds/match-simulator";
import { CompetitionScheduler } from "../domain/logic/CompetitionScheduler";
import { eq } from "drizzle-orm";
import {
  Position,
  StaffRole,
  FinancialCategory,
  TransferStatus,
  TransferType,
} from "../domain/enums";

const logger = new Logger("Seed");

function calculateInfraStats(reputation: number) {
  const normalizedRep = Math.max(0, Math.min(1, (reputation - 5000) / 5000));
  const baseLevel = Math.floor(40 + normalizedRep * 55);
  const getLevel = () => {
    const variation = randomInt(-5, 5);
    return Math.max(10, Math.min(100, baseLevel + variation));
  };
  const baseCapacity = Math.round(reputation * 6);
  const capacity = Math.max(
    15000,
    Math.min(105000, baseCapacity + randomInt(-5000, 5000))
  );
  return {
    capacity,
    stadiumQuality: getLevel(),
    training: getLevel(),
    youth: getLevel(),
    medical: getLevel(),
    admin: getLevel(),
  };
}

function generateAttributesFromOverall(
  position: Position | string,
  overall: number
) {
  const variation = (base: number) => base + randomInt(-3, 3);

  const attrs = {
    finishing: overall - 15,
    passing: overall - 10,
    dribbling: overall - 10,
    defending: overall - 15,
    physical: overall - 5,
    pace: overall - 5,
    shooting: overall - 10,
  };

  if (position === Position.GK) {
    attrs.defending = variation(overall + 5);
    attrs.physical = variation(overall);
    attrs.passing = variation(overall - 20);
    attrs.finishing = variation(20);
    attrs.dribbling = variation(30);
    attrs.pace = variation(50);
    attrs.shooting = variation(20);
  } else if (position === Position.DF) {
    attrs.defending = variation(overall + 2);
    attrs.physical = variation(overall + 2);
    attrs.passing = variation(overall - 10);
    attrs.finishing = variation(overall - 25);
    attrs.dribbling = variation(overall - 15);
  } else if (position === Position.MF) {
    attrs.passing = variation(overall + 3);
    attrs.dribbling = variation(overall + 1);
    attrs.defending = variation(overall - 5);
    attrs.finishing = variation(overall - 10);
  } else if (position === Position.FW) {
    attrs.finishing = variation(overall + 3);
    attrs.shooting = variation(overall + 2);
    attrs.pace = variation(overall + 1);
    attrs.defending = variation(overall - 30);
    attrs.passing = variation(overall - 10);
  }

  for (const key in attrs) {
    const k = key as keyof typeof attrs;
    attrs[k] = Math.max(1, Math.min(99, attrs[k]));
  }

  return attrs;
}

async function main() {
  logger.info("🌱 INICIANDO SEED: BRASILEIRÃO 2025 (Infraestrutura 2.0)...");

  logger.info("🗑️  Limpando banco de dados...");
  await db.delete(matchTactics);
  await db.delete(scheduledEvents);
  await db.delete(clubInterests);
  await db.delete(matchEvents);
  await db.delete(scoutingReports);
  await db.delete(transfers);
  await db.delete(competitionStandings);
  await db.delete(playerCompetitionStats);
  await db.delete(playerContracts);
  await db.delete(financialRecords);
  await db.delete(gameState);
  await db.delete(matches);
  await db.delete(transferProposals);
  await db.delete(players);
  await db.delete(staff);
  await db.delete(competitions);
  await db.delete(seasons);
  await db.delete(teams);

  logger.info("📅 Criando Temporadas (2024 Histórica, 2025 Ativa)...");
  const [season2024] = await db
    .insert(seasons)
    .values({
      year: 2024,
      startDate: "2024-01-15",
      endDate: "2024-12-08",
      isActive: false,
    })
    .returning();

  const [season2025] = await db
    .insert(seasons)
    .values({
      year: 2025,
      startDate: "2025-01-15",
      endDate: "2025-12-07",
      isActive: true,
    })
    .returning();

  logger.info("🏆 Criando Campeonato Brasileiro Série A...");
  const [brasileirao] = await db
    .insert(competitions)
    .values({
      name: "Brasileirão Série A",
      shortName: "BSA",
      country: "Brasil",
      tier: 1,
      type: "league",
      teams: 20,
      prize: 50000000,
      reputation: 8500,
      priority: 1,
      window: "national",
      startMonth: 4,
      endMonth: 12,
    })
    .returning();

  logger.info("🛡️  Gerando Clubes, Elencos e Infraestrutura...");

  const insertedTeamsMap = new Map<string, typeof teams.$inferSelect>();
  let humanTeamId = 0;
  const allPlayerIds: number[] = [];

  for (const t of TEAMS_DATA) {
    const infra = calculateInfraStats(t.rep);

    const [insertedTeam] = await db
      .insert(teams)
      .values({
        name: t.name,
        shortName: t.short,
        primaryColor: t.primary,
        secondaryColor: t.secondary,
        reputation: t.rep,
        budget: t.budget,
        isHuman: false,
        stadiumCapacity: infra.capacity,
        stadiumQuality: infra.stadiumQuality,
        trainingCenterQuality: infra.training,
        youthAcademyQuality: infra.youth,
        medicalCenterQuality: infra.medical,
        administrativeCenterQuality: infra.admin,
        fanSatisfaction: randomInt(50, 90),
        fanBase: Math.round(t.rep * 250),
        transferBudget: Math.round(t.budget * 0.4),
      })
      .returning();

    insertedTeamsMap.set(t.name, insertedTeam);
    if (t.name === "Botafogo") humanTeamId = insertedTeam.id;

    logger.debug(
      `Time criado: ${t.name} (Rep: ${t.rep}, CT: ${infra.training}, Med: ${infra.medical})`
    );

    const teamPlayers = [];
    const positionsRequired = {
      [Position.GK]: 3,
      [Position.DF]: 8,
      [Position.MF]: 8,
      [Position.FW]: 6,
    };

    if (t.realPlayers) {
      for (const rp of t.realPlayers) {
        const attrs = generateAttributesFromOverall(rp.position, rp.overall);
        const [p] = await db
          .insert(players)
          .values({
            teamId: insertedTeam.id,
            firstName: rp.firstName,
            lastName: rp.lastName,
            age: rp.age,
            nationality: rp.nationality,
            position: rp.position,
            preferredFoot: Math.random() > 0.2 ? "right" : "left",
            overall: rp.overall,
            potential: rp.potential,
            ...attrs,
            moral: randomInt(85, 100),
            energy: 100,
            fitness: randomInt(90, 100),
            form: randomInt(60, 80),
            isYouth: false,
          })
          .returning();

        teamPlayers.push(p);
        allPlayerIds.push(p.id);

        await db.insert(playerContracts).values({
          playerId: p.id,
          teamId: insertedTeam.id,
          startDate: "2024-01-01",
          endDate: `${2026 + randomInt(0, 2)}-12-31`,
          wage: rp.overall * 2000,
          releaseClause: rp.overall * 150000,
          type: "professional",
          status: "active",
        });

        if (positionsRequired[rp.position as Position] > 0)
          positionsRequired[rp.position as Position]--;
      }
    }

    for (const [pos, count] of Object.entries(positionsRequired)) {
      for (let i = 0; i < count; i++) {
        const pData = generatePlayer(insertedTeam.id, pos, false);
        const [p] = await db.insert(players).values(pData).returning();
        teamPlayers.push(p);
        allPlayerIds.push(p.id);

        await db.insert(playerContracts).values({
          playerId: p.id,
          teamId: insertedTeam.id,
          startDate: "2024-01-01",
          endDate: `${2025 + randomInt(1, 3)}-12-31`,
          wage: p.overall * 1000,
          releaseClause: p.overall * 80000,
          type: "professional",
          status: "active",
        });
      }
    }

    for (let i = 0; i < 8; i++) {
      const pos = random([Position.GK, Position.DF, Position.MF, Position.FW]);
      const pData = generatePlayer(insertedTeam.id, pos, true);
      const [p] = await db.insert(players).values(pData).returning();
      allPlayerIds.push(p.id);

      await db.insert(playerContracts).values({
        playerId: p.id,
        teamId: insertedTeam.id,
        startDate: "2024-01-01",
        endDate: "2028-12-31",
        wage: 500,
        releaseClause: 5000000,
        type: "youth",
        status: "active",
      });
    }

    const captain = teamPlayers.sort((a, b) => b.overall - a.overall)[0];
    if (captain) {
      await db
        .update(players)
        .set({ isCaptain: true })
        .where(eq(players.id, captain.id));
    }

    const staffRoles = [
      { role: StaffRole.HEAD_COACH, count: 1 },
      { role: StaffRole.ASSISTANT_COACH, count: 1 },
      { role: StaffRole.SCOUT, count: 3 },
      { role: StaffRole.MEDICAL_DOCTOR, count: 2 },
      { role: StaffRole.FITNESS_COACH, count: 2 },
      { role: StaffRole.PHYSIOTHERAPIST, count: 2 },
    ];

    let headCoachId = null;

    for (const config of staffRoles) {
      for (let i = 0; i < config.count; i++) {
        const sData = generateStaffMember(insertedTeam.id, config.role);
        const [s] = await db.insert(staff).values(sData).returning();
        if (config.role === StaffRole.HEAD_COACH) headCoachId = s.id;
      }
    }

    if (headCoachId) {
      await db
        .update(teams)
        .set({ headCoachId })
        .where(eq(teams.id, insertedTeam.id));
    }

    await db.insert(financialRecords).values([
      {
        teamId: insertedTeam.id,
        seasonId: season2025.id,
        date: "2025-01-01",
        type: "income",
        category: FinancialCategory.SPONSORS,
        amount: Math.round(t.rep * 2000),
        description: "Cota Anual de Patrocínio Master",
      },
      {
        teamId: insertedTeam.id,
        seasonId: season2025.id,
        date: "2025-01-02",
        type: "income",
        category: FinancialCategory.TV_RIGHTS,
        amount: Math.round(t.rep * 1500),
        description: "Adiantamento TV Rights",
      },
      {
        teamId: insertedTeam.id,
        seasonId: season2025.id,
        date: "2025-01-05",
        type: "expense",
        category: FinancialCategory.INFRASTRUCTURE,
        amount: 250000,
        description: "Manutenção de Gramado",
      },
    ]);
  }

  await db
    .update(teams)
    .set({ isHuman: true })
    .where(eq(teams.id, humanTeamId));
  const insertedTeams = Array.from(insertedTeamsMap.values());
  const teamIds = insertedTeams.map((t) => t.id);

  logger.info("📜 Simulando Temporada 2024 para gerar histórico...");

  const fixtures2024 = CompetitionScheduler.generateLeagueFixtures(
    teamIds,
    false
  );
  const standings2024Map = new Map<
    number,
    typeof competitionStandings.$inferInsert
  >();

  teamIds.forEach((id) => {
    standings2024Map.set(id, {
      competitionId: brasileirao.id,
      seasonId: season2024.id,
      teamId: id,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    });
  });

  const matches2024 = [];

  for (const fixture of fixtures2024) {
    const homeTeam = insertedTeams.find((t) => t.id === fixture.homeTeamId)!;
    const awayTeam = insertedTeams.find((t) => t.id === fixture.awayTeamId)!;

    const result = quickSimulateMatch(homeTeam.reputation, awayTeam.reputation);

    const homeStats = standings2024Map.get(homeTeam.id)!;
    const awayStats = standings2024Map.get(awayTeam.id)!;

    homeStats.played!++;
    awayStats.played!++;
    homeStats.goalsFor! += result.homeScore;
    homeStats.goalsAgainst! += result.awayScore;
    awayStats.goalsFor! += result.awayScore;
    awayStats.goalsAgainst! += result.homeScore;

    if (result.homeScore > result.awayScore) {
      homeStats.wins!++;
      homeStats.points! += 3;
      awayStats.losses!++;
    } else if (result.awayScore > result.homeScore) {
      awayStats.wins!++;
      awayStats.points! += 3;
      homeStats.losses!++;
    } else {
      homeStats.draws!++;
      homeStats.points! += 1;
      awayStats.draws!++;
      awayStats.points! += 1;
    }

    matches2024.push({
      competitionId: brasileirao.id,
      seasonId: season2024.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      date: "2024-06-01",
      round: fixture.round,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      isPlayed: true,
      attendance: Math.round(homeTeam.stadiumCapacity * 0.7),
      ticketRevenue: Math.round(homeTeam.stadiumCapacity * 0.7 * 50),
      weather: "sunny",
    });
  }

  const batchSize = 100;
  for (let i = 0; i < matches2024.length; i += batchSize) {
    await db.insert(matches).values(matches2024.slice(i, i + batchSize));
  }

  await db
    .insert(competitionStandings)
    .values(Array.from(standings2024Map.values()));

  logger.info("📅 Gerando Calendário 2025...");

  const fixtures2025 = CompetitionScheduler.generateLeagueFixtures(
    teamIds,
    true
  );
  const matches2025 = fixtures2025.map((f) => {
    const startDate = new Date("2025-04-13");
    const matchDate = new Date(startDate);
    matchDate.setDate(startDate.getDate() + (f.round - 1) * 7);

    return {
      competitionId: brasileirao.id,
      seasonId: season2025.id,
      homeTeamId: f.homeTeamId,
      awayTeamId: f.awayTeamId,
      date: matchDate.toISOString().split("T")[0],
      round: f.round,
      isPlayed: false,
      weather: "sunny",
    };
  });

  for (let i = 0; i < matches2025.length; i += batchSize) {
    await db.insert(matches).values(matches2025.slice(i, i + batchSize));
  }

  const standings2025 = teamIds.map((id) => ({
    competitionId: brasileirao.id,
    seasonId: season2025.id,
    teamId: id,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }));
  await db.insert(competitionStandings).values(standings2025);

  logger.info("🕵️  Gerando Scouting e Transferências Dummy...");

  const randomPlayersToScout = allPlayerIds
    .sort(() => 0.5 - Math.random())
    .slice(0, 5);

  const humanScout = await db.query.staff.findFirst({
    where: (staff, { and, eq }) =>
      and(eq(staff.teamId, humanTeamId), eq(staff.role, StaffRole.SCOUT)),
  });

  if (humanScout) {
    for (const pid of randomPlayersToScout) {
      await db.insert(scoutingReports).values({
        playerId: pid,
        scoutId: humanScout.id,
        teamId: humanTeamId,
        date: "2025-01-10",
        progress: randomInt(10, 50),
        overallEstimate: randomInt(70, 90),
        potentialEstimate: randomInt(70, 95),
        notes: "Jogador observado em vídeos.",
        recommendation: "Observar",
      });
    }
  }

  const humanTeamPlayers = await db.query.players.findMany({
    where: eq(players.teamId, humanTeamId),
    limit: 1,
  });

  if (humanTeamPlayers.length > 0) {
    const targetPlayer = humanTeamPlayers[0];
    const buyerTeam = insertedTeams.find((t) => t.id !== humanTeamId)!;

    await db.insert(transferProposals).values({
      playerId: targetPlayer.id,
      fromTeamId: buyerTeam.id,
      toTeamId: humanTeamId,
      type: TransferType.TRANSFER,
      status: TransferStatus.PENDING,
      fee: targetPlayer.overall * 100000,
      wageOffer: targetPlayer.overall * 2500,
      contractLength: 3,
      createdAt: "2025-01-14",
      responseDeadline: "2025-01-20",
    });
  }

  logger.info("💾 Salvando GameState Inicial...");
  await db.insert(gameState).values({
    saveId: "default_seed",
    currentDate: "2025-01-15",
    currentSeasonId: season2025.id,
    managerName: "Manager",
    playerTeamId: humanTeamId,
    simulationSpeed: 1,
    trainingFocus: "technical",
    totalPlayTime: 0,
  });

  logger.info("✅ SEED CONCLUÍDO!");
  logger.info(`Times: ${insertedTeams.length}`);
  logger.info(`Jogadores: ${allPlayerIds.length}`);
  logger.info(
    `Partidas Geradas (2024+2025): ${matches2024.length + matches2025.length}`
  );
}

main().catch((err) => {
  logger.error("❌ Erro no seed:", err);
  process.exit(1);
});
