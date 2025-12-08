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
import { Position, StaffRole, FinancialCategory } from "../domain/enums";

const logger = new Logger("Seed");

async function main() {
  logger.info("🌱 Iniciando Seed Completo do Banco de Dados...");

  logger.info("🗑️  Limpando dados antigos...");
  await db.delete(matchEvents);
  await db.delete(scoutingReports);
  await db.delete(transfers);
  await db.delete(competitionStandings);
  await db.delete(playerCompetitionStats);
  await db.delete(playerContracts);
  await db.delete(financialRecords);
  await db.delete(gameState);
  await db.delete(matches);
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

  logger.info("🛡️  Criando Times...");
  const insertedTeams = await db
    .insert(teams)
    .values(
      TEAMS_DATA.map((t) => ({
        name: t.name,
        shortName: t.short,
        primaryColor: t.primary,
        secondaryColor: t.secondary,
        reputation: t.rep,
        budget: t.budget,
        isHuman: false,
        stadiumCapacity: randomInt(15000, 60000),
        stadiumQuality: randomInt(50, 85),
        trainingCenterQuality: randomInt(40, 80),
        youthAcademyQuality: randomInt(35, 75),
        fanSatisfaction: randomInt(50, 80),
        fanBase: randomInt(50000, 500000),
      }))
    )
    .returning();

  const humanTeam = insertedTeams[0];
  await db
    .update(teams)
    .set({ isHuman: true })
    .where(eq(teams.id, humanTeam.id));

  logger.info("🏃 Criando Elencos e Staff...");
  let totalPlayers = 0;
  const allScouts: { id: number; teamId: number }[] = [];

  for (const team of insertedTeams) {
    const squadStructure = [
      ...Array(3).fill(Position.GK),
      ...Array(8).fill(Position.DF),
      ...Array(8).fill(Position.MF),
      ...Array(6).fill(Position.FW),
    ];

    const teamPlayers = [];

    for (const pos of squadStructure) {
      const pData = generatePlayer(team.id, pos, false);
      const [newPlayer] = await db.insert(players).values(pData).returning();
      teamPlayers.push(newPlayer);

      await db.insert(playerContracts).values({
        playerId: newPlayer.id,
        teamId: team.id,
        startDate: "2024-01-01",
        endDate: `${2025 + randomInt(1, 4)}-12-31`,
        wage: newPlayer.overall * 800 + randomInt(1000, 5000),
        releaseClause: newPlayer.overall * 50000 + randomInt(500000, 2000000),
        type: "professional",
        status: "active",
      });
    }

    for (let i = 0; i < 10; i++) {
      const positions = [Position.GK, Position.DF, Position.MF, Position.FW];
      const pData = generatePlayer(team.id, positions[randomInt(0, 3)], true);
      const [youthPlayer] = await db.insert(players).values(pData).returning();

      await db.insert(playerContracts).values({
        playerId: youthPlayer.id,
        teamId: team.id,
        startDate: "2024-01-01",
        endDate: "2026-12-31",
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

    totalPlayers += squadStructure.length + 10;

    const roles = Object.values(StaffRole);
    for (const role of roles) {
      const count = role === StaffRole.SCOUT ? 3 : 1;
      for (let k = 0; k < count; k++) {
        const sData = generateStaffMember(team.id, role);
        const [newStaff] = await db.insert(staff).values(sData).returning();
        if (role === StaffRole.SCOUT) {
          allScouts.push({ id: newStaff.id, teamId: team.id });
        }
      }
    }

    if (team.isHuman) {
      await db.insert(financialRecords).values([
        {
          teamId: team.id,
          seasonId: season.id,
          date: "2025-01-01",
          type: "income",
          category: FinancialCategory.SPONSORS,
          amount: 5000000,
          description: "Pagamento Patrocínio Master",
        },
        {
          teamId: team.id,
          seasonId: season.id,
          date: "2025-01-05",
          type: "expense",
          category: FinancialCategory.INFRASTRUCTURE,
          amount: 200000,
          description: "Manutenção Pré-temporada",
        },
        {
          teamId: team.id,
          seasonId: season.id,
          date: "2025-01-10",
          type: "income",
          category: FinancialCategory.TV_RIGHTS,
          amount: 2000000,
          description: "Cota de TV (Parcela 1)",
        },
      ]);
    }
  }

  logger.info("🏆 Criando Competições...");
  const [cnb] = await db
    .insert(competitions)
    .values({
      name: "Campeonato Nacional Brasileiro",
      shortName: "CNB",
      country: "Brasil",
      tier: 1,
      type: "league",
      teams: 12,
      prize: 15000000,
      reputation: 8000,
      priority: 1,
      window: "national",
      startMonth: 5,
      endMonth: 12,
    })
    .returning();

  await db.insert(competitions).values({
    name: "Copa Nacional",
    shortName: "Copa",
    country: "Brasil",
    tier: 1,
    type: "knockout",
    teams: 16,
    prize: 8000000,
    reputation: 7000,
    priority: 2,
    window: "national",
    startMonth: 5,
    endMonth: 11,
  });

  await db.insert(competitions).values({
    name: "Estadual",
    shortName: "EST",
    country: "Brasil",
    tier: 3,
    type: "league",
    teams: 12,
    prize: 1000000,
    reputation: 3000,
    priority: 3,
    window: "state",
    startMonth: 1,
    endMonth: 4,
  });

  logger.info("🔍 Gerando dados de Scouting iniciais...");
  const otherTeamsPlayers = await db.query.players.findMany({
    where: (players, { ne }) => ne(players.teamId, humanTeam.id),
    limit: 10,
  });

  const humanScouts = allScouts.filter((s) => s.teamId === humanTeam.id);

  if (humanScouts.length > 0 && otherTeamsPlayers.length > 0) {
    const reports = otherTeamsPlayers.map((p, index) => ({
      playerId: p.id,
      teamId: humanTeam.id,
      scoutId: humanScouts[index % humanScouts.length].id,
      date: "2025-01-14",
      progress: randomInt(20, 80),
      overallEstimate: Math.round(p.overall * (randomInt(90, 110) / 100)),
      potentialEstimate: Math.round(p.potential * (randomInt(90, 110) / 100)),
      notes: "Jogador observado durante a pré-temporada.",
      recommendation: p.overall > 70 ? "Contratar" : "Observar",
    }));
    await db.insert(scoutingReports).values(reports);
  }

  logger.info("📜 Gerando Histórico da Temporada 2024...");
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
    true
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
      competitionId: cnb.id,
      seasonId: season2024.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      date: "2024-06-01",
      round: fixture.round,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      isPlayed: true,
      attendance: randomInt(10000, homeTeam.stadiumCapacity!),
      ticketRevenue: 0,
      weather: "sunny",
    });
  }

  await db.insert(matches).values(historyMatches);

  const standingsInserts = [];
  for (const [tId, stats] of standingsMap.entries()) {
    standingsInserts.push({
      competitionId: cnb.id,
      seasonId: season2024.id,
      teamId: tId,
      played: (teamIds.length - 1) * 2,
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
    const roundDate = new Date("2025-05-01");
    roundDate.setDate(roundDate.getDate() + f.round * 7);

    return {
      competitionId: cnb.id,
      seasonId: season2025.id,
      homeTeamId: f.homeTeamId,
      awayTeamId: f.awayTeamId,
      date: roundDate.toISOString().split("T")[0],
      round: f.round,
      isPlayed: false,
      weather: "sunny",
    };
  });

  await db.insert(matches).values(futureMatches);

  const zeroStandings = insertedTeams.map((t) => ({
    competitionId: cnb.id,
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

  logger.info("💾 Salvando Estado Inicial...");
  await db.insert(gameState).values({
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
  logger.info(`• Dados financeiros e de scouting iniciados.`);
}

main().catch((err) => {
  logger.error("❌ Erro no seed:", err);
  process.exit(1);
});
