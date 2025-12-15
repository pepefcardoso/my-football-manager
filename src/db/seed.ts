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
} from "./schema";
import { Logger } from "../lib/Logger";
import { TEAMS_DATA } from "./seeds/data";
import {
  generatePlayer,
  generateStaffMember,
  randomInt,
} from "./seeds/generators";
import { quickSimulateMatch } from "./seeds/match-simulator";
import { CompetitionScheduler } from "../services/CompetitionScheduler";
import { eq } from "drizzle-orm";
import {
  Position,
  StaffRole,
  FinancialCategory,
  TransferStatus,
} from "../domain/enums";

const logger = new Logger("Seed");

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
  logger.info(
    "🌱 Iniciando Seed Completo do Banco de Dados (Brasileirão 2025)..."
  );

  logger.info("🗑️  Limpando dados antigos...");
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

  logger.info("📅 Criando Temporada 2025...");
  const [season] = await db
    .insert(seasons)
    .values({
      year: 2025,
      startDate: "2025-01-15",
      endDate: "2025-12-15",
      isActive: true,
    })
    .returning();

  logger.info("🛡️  Criando Times...");
  const insertedTeamsMap = new Map<string, typeof teams.$inferSelect>();

  for (const t of TEAMS_DATA) {
    const [inserted] = await db
      .insert(teams)
      .values({
        name: t.name,
        shortName: t.short,
        primaryColor: t.primary,
        secondaryColor: t.secondary,
        reputation: t.rep,
        budget: t.budget,
        isHuman: false,
        stadiumCapacity: randomInt(30000, 70000),
        stadiumQuality: randomInt(60, 90),
        trainingCenterQuality: randomInt(50, 90),
        youthAcademyQuality: randomInt(50, 90),
        fanSatisfaction: randomInt(50, 80),
        fanBase: randomInt(100000, 2000000),
      })
      .returning();

    insertedTeamsMap.set(t.name, inserted);
  }

  const insertedTeams = Array.from(insertedTeamsMap.values());

  const humanTeam = insertedTeamsMap.get("Botafogo")!;
  await db
    .update(teams)
    .set({ isHuman: true })
    .where(eq(teams.id, humanTeam.id));

  const freeAgentData = [
    {
      firstName: "Veterano",
      lastName: "Livre",
      age: 34,
      nationality: "ARG",
      position: Position.MF,
      overall: 82,
      potential: 82,
      isYouth: false,
    },
    {
      firstName: "Jovem",
      lastName: "Mercado",
      age: 20,
      nationality: "POR",
      position: Position.FW,
      overall: 70,
      potential: 90,
      isYouth: true,
    },
  ];

  logger.info("🆓 Adicionando Agentes Livres ao Mercado...");

  for (const fa of freeAgentData) {
    const attrs = generateAttributesFromOverall(fa.position, fa.overall);

    await db.insert(players).values({
      teamId: null,
      firstName: fa.firstName,
      lastName: fa.lastName,
      age: fa.age,
      nationality: fa.nationality,
      position: fa.position,
      preferredFoot: Math.random() > 0.5 ? "right" : "left",
      overall: fa.overall,
      potential: fa.potential,
      ...attrs,
      moral: randomInt(80, 100),
      energy: 100,
      fitness: 95,
      form: randomInt(60, 80),
      isYouth: fa.isYouth,
      isInjured: false,
      injuryDaysRemaining: 0,
      isCaptain: false,
      suspensionGamesRemaining: 0,
    });
  }

  let playerToSellId: number | undefined;
  let playerToBuyId: number | undefined;
  let playerForHistoryId: number | undefined;

  const teamProponentId = insertedTeamsMap.get("Flamengo")!.id;
  const teamTargetId = insertedTeamsMap.get("São Paulo")!.id;
  const teamHistoryFromId = insertedTeamsMap.get("Palmeiras")!.id;
  const teamHistoryToId = insertedTeamsMap.get("Corinthians")!.id;

  logger.info("🏃 Criando Elencos e Staff...");
  let totalPlayers = 0;
  const allScouts: { id: number; teamId: number }[] = [];

  for (const teamData of TEAMS_DATA) {
    const dbTeam = insertedTeamsMap.get(teamData.name)!;
    const teamPlayers = [];

    const requiredPositions = {
      [Position.GK]: 3,
      [Position.DF]: 8,
      [Position.MF]: 8,
      [Position.FW]: 6,
    };

    if (teamData.realPlayers && teamData.realPlayers.length > 0) {
      for (const realPlayer of teamData.realPlayers) {
        const attrs = generateAttributesFromOverall(
          realPlayer.position,
          realPlayer.overall
        );

        const pData = {
          teamId: dbTeam.id,
          firstName: realPlayer.firstName,
          lastName: realPlayer.lastName,
          age: realPlayer.age,
          nationality: realPlayer.nationality,
          position: realPlayer.position,
          preferredFoot: Math.random() > 0.2 ? "right" : "left",
          overall: realPlayer.overall,
          potential: realPlayer.potential,
          ...attrs,
          moral: randomInt(80, 100),
          energy: randomInt(90, 100),
          fitness: randomInt(80, 100),
          form: randomInt(60, 80),
          isYouth: false,
          isInjured: false,
          isCaptain: false,
          suspensionGamesRemaining: 0,
          injuryDaysRemaining: 0,
        };

        const [newPlayer] = await db.insert(players).values(pData).returning();
        teamPlayers.push(newPlayer);

        await db.insert(playerContracts).values({
          playerId: newPlayer.id,
          teamId: dbTeam.id,
          startDate: "2024-01-01",
          endDate: `${2026 + randomInt(0, 3)}-12-31`,
          wage: realPlayer.overall * 1500 + randomInt(5000, 20000),
          releaseClause:
            realPlayer.overall * 100000 + randomInt(1000000, 5000000),
          type: "professional",
          status: "active",
        });

        if (dbTeam.isHuman && realPlayer.lastName === "Henrique") {
          playerToSellId = newPlayer.id;
        } else if (
          teamData.name === "São Paulo" &&
          realPlayer.lastName === "Calleri"
        ) {
          playerToBuyId = newPlayer.id;
        } else if (
          teamData.name === "Palmeiras" &&
          realPlayer.lastName === "Veiga"
        ) {
          playerForHistoryId = newPlayer.id;
        }

        if (requiredPositions[realPlayer.position as Position] > 0) {
          requiredPositions[realPlayer.position as Position]--;
        }
      }
    }

    for (const [pos, count] of Object.entries(requiredPositions)) {
      for (let i = 0; i < count; i++) {
        const pData = generatePlayer(dbTeam.id, pos, false);
        const [newPlayer] = await db.insert(players).values(pData).returning();
        teamPlayers.push(newPlayer);

        await db.insert(playerContracts).values({
          playerId: newPlayer.id,
          teamId: dbTeam.id,
          startDate: "2024-01-01",
          endDate: `${2025 + randomInt(1, 3)}-12-31`,
          wage: newPlayer.overall * 800 + randomInt(1000, 5000),
          releaseClause: newPlayer.overall * 50000 + randomInt(500000, 2000000),
          type: "professional",
          status: "active",
        });
      }
    }

    for (let i = 0; i < 10; i++) {
      const positions = [Position.GK, Position.DF, Position.MF, Position.FW];
      const pData = generatePlayer(dbTeam.id, positions[randomInt(0, 3)], true);
      const [youthPlayer] = await db.insert(players).values(pData).returning();

      await db.insert(playerContracts).values({
        playerId: youthPlayer.id,
        teamId: dbTeam.id,
        startDate: "2024-01-01",
        endDate: "2027-12-31",
        wage: randomInt(200, 800),
        releaseClause: randomInt(100000, 500000),
        type: "youth",
        status: "active",
      });
    }

    if (teamPlayers.length > 0) {
      const captain = teamPlayers.reduce((prev, current) =>
        prev.overall > current.overall ? prev : current
      );
      await db
        .update(players)
        .set({ isCaptain: true })
        .where(eq(players.id, captain.id));
    }

    totalPlayers += teamPlayers.length + 10;

    const roles = Object.values(StaffRole);
    for (const role of roles) {
      const count = role === StaffRole.SCOUT ? 3 : 1;
      for (let k = 0; k < count; k++) {
        const sData = generateStaffMember(dbTeam.id, role);
        const [newStaff] = await db.insert(staff).values(sData).returning();
        if (role === StaffRole.SCOUT) {
          allScouts.push({ id: newStaff.id, teamId: dbTeam.id });
        }
      }
    }

    if (dbTeam.isHuman) {
      await db.insert(financialRecords).values([
        {
          teamId: dbTeam.id,
          seasonId: season.id,
          date: "2025-01-01",
          type: "income",
          category: FinancialCategory.SPONSORS,
          amount: 15000000,
          description: "Pagamento Patrocínio Master",
        },
        {
          teamId: dbTeam.id,
          seasonId: season.id,
          date: "2025-01-05",
          type: "expense",
          category: FinancialCategory.INFRASTRUCTURE,
          amount: 500000,
          description: "Manutenção Pré-temporada",
        },
        {
          teamId: dbTeam.id,
          seasonId: season.id,
          date: "2025-01-10",
          type: "income",
          category: FinancialCategory.TV_RIGHTS,
          amount: 12000000,
          description: "Cota de TV (Parcela 1)",
        },
      ]);
    }
  }

  logger.info("🏆 Criando Competições...");
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

  await db.insert(competitions).values({
    name: "Copa do Brasil",
    shortName: "CDB",
    country: "Brasil",
    tier: 1,
    type: "knockout",
    teams: 32,
    prize: 70000000,
    reputation: 8000,
    priority: 2,
    window: "national",
    startMonth: 3,
    endMonth: 11,
  });

  await db.insert(competitions).values({
    name: "Copa Libertadores",
    shortName: "LIB",
    country: "Continental",
    tier: 1,
    type: "group_knockout",
    teams: 32,
    prize: 100000000,
    reputation: 9500,
    priority: 1,
    window: "continental",
    startMonth: 4,
    endMonth: 11,
  });

  logger.info("🔍 Gerando dados de Scouting iniciais...");
  const otherTeamsPlayers = await db.query.players.findMany({
    where: (players, { ne }) => ne(players.teamId, humanTeam.id),
    limit: 15,
  });

  const humanScouts = allScouts.filter((s) => s.teamId === humanTeam.id);

  if (humanScouts.length > 0 && otherTeamsPlayers.length > 0) {
    const reports = otherTeamsPlayers.map((p, index) => ({
      playerId: p.id,
      teamId: humanTeam.id,
      scoutId: humanScouts[index % humanScouts.length].id,
      date: "2025-01-14",
      progress: randomInt(20, 80),
      overallEstimate: Math.round(p.overall * (randomInt(95, 105) / 100)),
      potentialEstimate: Math.round(p.potential * (randomInt(90, 110) / 100)),
      notes: "Jogador observado durante a pré-temporada.",
      recommendation: p.overall > 78 ? "Contratar" : "Observar",
    }));
    await db.insert(scoutingReports).values(reports);
  }

  logger.info("📜 Gerando Histórico da Temporada 2024 (Simulado)...");
  const [season2024] = await db
    .insert(seasons)
    .values({
      year: 2024,
      startDate: "2024-01-15",
      endDate: "2024-12-15",
      isActive: false,
    })
    .returning();

  const teamIds = insertedTeams.map((t) => t.id);
  const fixtures2024 = CompetitionScheduler.generateLeagueFixtures(
    teamIds,
    false
  );

  const standingsMap = new Map<
    number,
    { w: number; d: number; l: number; gf: number; ga: number; pts: number }
  >();
  teamIds.forEach((id) =>
    standingsMap.set(id, { w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 })
  );

  const historyMatches = [];

  for (const fixture of fixtures2024) {
    const homeTeam = insertedTeams.find((t) => t.id === fixture.homeTeamId)!;
    const awayTeam = insertedTeams.find((t) => t.id === fixture.awayTeamId)!;

    const result = quickSimulateMatch(
      homeTeam.reputation!,
      awayTeam.reputation!
    );

    const homeStats = standingsMap.get(homeTeam.id)!;
    const awayStats = standingsMap.get(awayTeam.id)!;

    homeStats.gf += result.homeScore;
    homeStats.ga += result.awayScore;
    awayStats.gf += result.awayScore;
    awayStats.ga += result.homeScore;

    if (result.homeScore > result.awayScore) {
      homeStats.w++;
      homeStats.pts += 3;
      awayStats.l++;
    } else if (result.awayScore > result.homeScore) {
      awayStats.w++;
      awayStats.pts += 3;
      homeStats.l++;
    } else {
      homeStats.d++;
      homeStats.pts += 1;
      awayStats.d++;
      awayStats.pts += 1;
    }

    historyMatches.push({
      competitionId: brasileirao.id,
      seasonId: season2024.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      date: "2024-06-01",
      round: fixture.round,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      isPlayed: true,
      attendance: randomInt(15000, homeTeam.stadiumCapacity!),
      ticketRevenue: 0,
      weather: "sunny",
    });
  }

  await db.insert(matches).values(historyMatches);

  const standingsInserts = [];
  for (const [tId, stats] of standingsMap.entries()) {
    standingsInserts.push({
      competitionId: brasileirao.id,
      seasonId: season2024.id,
      teamId: tId,
      played: teamIds.length - 1,
      wins: stats.w,
      draws: stats.d,
      losses: stats.l,
      goalsFor: stats.gf,
      goalsAgainst: stats.ga,
      points: stats.pts,
    });
  }
  await db.insert(competitionStandings).values(standingsInserts);

  logger.info("📅 Iniciando Temporada Ativa 2025...");
  const [season2025] = await db
    .insert(seasons)
    .values({
      year: 2025,
      startDate: "2025-01-15",
      endDate: "2025-12-15",
      isActive: true,
    })
    .returning();

  const fixtures2025 = CompetitionScheduler.generateLeagueFixtures(
    teamIds,
    true
  );

  const futureMatches = fixtures2025.map((f) => {
    const startDate = new Date("2025-04-13");
    const roundDate = new Date(startDate);
    roundDate.setDate(startDate.getDate() + (f.round - 1) * 7);

    return {
      competitionId: brasileirao.id,
      seasonId: season2025.id,
      homeTeamId: f.homeTeamId,
      awayTeamId: f.awayTeamId,
      date: roundDate.toISOString().split("T")[0],
      round: f.round,
      isPlayed: false,
      weather: "sunny",
    };
  });

  const batchSize = 100;
  for (let i = 0; i < futureMatches.length; i += batchSize) {
    await db.insert(matches).values(futureMatches.slice(i, i + batchSize));
  }

  const zeroStandings = insertedTeams.map((t) => ({
    competitionId: brasileirao.id,
    seasonId: season2025.id,
    teamId: t.id,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }));
  await db.insert(competitionStandings).values(zeroStandings);

  logger.info("💰 Gerando Propostas de Transferência Iniciais e Histórico...");

  if (playerToSellId && teamProponentId) {
    await db.insert(transferProposals).values({
      playerId: playerToSellId,
      fromTeamId: teamProponentId,
      toTeamId: humanTeam.id,
      type: "transfer",
      status: TransferStatus.PENDING,
      fee: 35000000,
      wageOffer: 500000,
      contractLength: 4,
      createdAt: "2025-01-14",
      responseDeadline: "2025-01-18",
    });
  }

  if (playerToBuyId && teamTargetId) {
    await db.insert(transferProposals).values({
      playerId: playerToBuyId,
      fromTeamId: humanTeam.id,
      toTeamId: teamTargetId,
      type: "transfer",
      status: TransferStatus.NEGOTIATING,
      fee: 10000000,
      wageOffer: 250000,
      contractLength: 5,
      createdAt: "2025-01-12",
      responseDeadline: "2025-01-16",
      counterOfferFee: 18000000,
    });
  }

  if (playerForHistoryId && teamHistoryFromId && teamHistoryToId) {
    await db.insert(transfers).values({
      playerId: playerForHistoryId,
      fromTeamId: teamHistoryFromId,
      toTeamId: teamHistoryToId,
      fee: 12500000,
      date: "2024-07-01",
      seasonId: season2024.id,
      type: "transfer",
    });
  }

  logger.info("💾 Salvando Estado Inicial...");
  await db.insert(gameState).values({
    saveId: "save_init_seed",
    currentDate: "2025-01-15",
    currentSeasonId: season2025.id,
    managerName: "Treinador",
    playerTeamId: humanTeam.id,
    simulationSpeed: 1,
    trainingFocus: "technical",
  });

  logger.info("✅ SEED CONCLUÍDO COM SUCESSO!");
  logger.info(`• ${insertedTeams.length} times criados.`);
  logger.info(`• ${totalPlayers} jogadores gerados.`);
  logger.info(`• Dados reais de ${humanTeam.name} e rivais carregados.`);
}

main().catch((err) => {
  logger.error("❌ Erro no seed:", err);
  process.exit(1);
});
