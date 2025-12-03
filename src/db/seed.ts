import { db } from "./client";
import {
  teams,
  players,
  staff,
  competitions,
  seasons,
  gameState,
  matches,
  financialRecords,
} from "./schema";

const FIRST_NAMES = [
  "João",
  "Pedro",
  "Tiago",
  "Lucas",
  "Mateus",
  "Gabriel",
  "Rafael",
  "Bruno",
  "André",
  "Miguel",
  "Rui",
  "Nuno",
  "Ricardo",
  "Diogo",
  "Gonçalo",
  "Carlos",
  "Fernando",
  "Manuel",
  "Paulo",
  "António",
];

const LAST_NAMES = [
  "Silva",
  "Santos",
  "Ferreira",
  "Pereira",
  "Oliveira",
  "Costa",
  "Rodrigues",
  "Martins",
  "Gomes",
  "Lopes",
  "Almeida",
  "Carvalho",
  "Sousa",
  "Ribeiro",
  "Rocha",
  "Monteiro",
];

const TEAMS_DATA = [
  {
    name: "Red Eagles",
    short: "RED",
    primary: "#ef4444",
    secondary: "#ffffff",
    rep: 8500,
    budget: 50000000,
  },
  {
    name: "Blue Dragons",
    short: "BLU",
    primary: "#3b82f6",
    secondary: "#ffffff",
    rep: 8200,
    budget: 48000000,
  },
  {
    name: "Green Lions",
    short: "GRN",
    primary: "#22c55e",
    secondary: "#ffffff",
    rep: 7800,
    budget: 45000000,
  },
  {
    name: "White Warriors",
    short: "WHT",
    primary: "#f8fafc",
    secondary: "#0f172a",
    rep: 7200,
    budget: 38000000,
  },
  {
    name: "Black Panthers",
    short: "BLK",
    primary: "#1e293b",
    secondary: "#fbbf24",
    rep: 6800,
    budget: 35000000,
  },
  {
    name: "Golden Suns",
    short: "GLD",
    primary: "#eab308",
    secondary: "#1e293b",
    rep: 6200,
    budget: 30000000,
  },
  {
    name: "Silver Stars",
    short: "SLV",
    primary: "#94a3b8",
    secondary: "#0f172a",
    rep: 5800,
    budget: 25000000,
  },
  {
    name: "Purple Knights",
    short: "PRP",
    primary: "#a855f7",
    secondary: "#ffffff",
    rep: 5400,
    budget: 22000000,
  },
  {
    name: "Orange Tigers",
    short: "ORG",
    primary: "#f97316",
    secondary: "#ffffff",
    rep: 5000,
    budget: 20000000,
  },
  {
    name: "Cyan Dolphins",
    short: "CYN",
    primary: "#06b6d4",
    secondary: "#ffffff",
    rep: 4600,
    budget: 18000000,
  },
  {
    name: "Pink Flamingos",
    short: "PNK",
    primary: "#ec4899",
    secondary: "#ffffff",
    rep: 4200,
    budget: 15000000,
  },
  {
    name: "Brown Bears",
    short: "BRN",
    primary: "#92400e",
    secondary: "#fef3c7",
    rep: 3800,
    budget: 12000000,
  },
];

// const POSITIONS = ["GK", "DF", "MF", "FW"] as const;

const STAFF_ROLES = [
  "head_coach",
  "assistant_coach",
  "fitness_coach",
  "medical_doctor",
  "physiotherapist",
  "scout",
] as const;

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePlayer(teamId: number, position: string, isYouth = false) {
  const age = isYouth ? randomInt(16, 19) : randomInt(18, 34);
  const overall = isYouth ? randomInt(45, 65) : randomInt(55, 88);
  const potential = overall + randomInt(0, Math.max(0, 90 - overall));

  let finishing = randomInt(40, 80);
  let passing = randomInt(40, 80);
  let dribbling = randomInt(40, 80);
  let defending = randomInt(40, 80);
  let physical = randomInt(50, 85);
  let pace = randomInt(50, 85);
  let shooting = randomInt(40, 80);

  if (position === "GK") {
    defending = randomInt(60, 90);
    finishing = randomInt(20, 40);
    dribbling = randomInt(30, 50);
  } else if (position === "DF") {
    defending = randomInt(65, 90);
    physical = randomInt(65, 90);
    finishing = randomInt(30, 55);
  } else if (position === "MF") {
    passing = randomInt(65, 90);
    dribbling = randomInt(60, 85);
  } else if (position === "FW") {
    finishing = randomInt(65, 90);
    shooting = randomInt(65, 90);
    pace = randomInt(65, 90);
  }

  return {
    teamId,
    firstName: random(FIRST_NAMES),
    lastName: random(LAST_NAMES),
    age,
    nationality: "BRA",
    position,
    preferredFoot: Math.random() > 0.3 ? "right" : "left",
    overall,
    potential,
    finishing,
    passing,
    dribbling,
    defending,
    physical,
    pace,
    shooting,
    moral: randomInt(70, 100),
    energy: randomInt(80, 100),
    fitness: randomInt(75, 100),
    form: randomInt(40, 70),
    salary: overall * 1000 + randomInt(5000, 20000),
    contractEnd: `${2025 + randomInt(1, 4)}-12-31`,
    releaseClause: overall * 100000 + randomInt(500000, 2000000),
    isFullyScounted: !isYouth,
    scoutingProgress: isYouth ? 0 : 100,
    isYouth,
    youthLevel: isYouth ? "sub-20" : null,
    isInjured: false,
    injuryType: null,
    injuryDaysRemaining: 0,
    yellowCards: 0,
    redCards: 0,
    suspensionGamesRemaining: 0,
    isCaptain: false,
  };
}

function generateStaffMember(teamId: number, role: string) {
  return {
    teamId,
    firstName: random(FIRST_NAMES),
    lastName: random(LAST_NAMES),
    age: randomInt(35, 65),
    nationality: "BRA",
    role,
    overall: randomInt(50, 85),
    salary: randomInt(15000, 80000),
    contractEnd: `${2025 + randomInt(1, 3)}-12-31`,
    specialization:
      role === "scout" ? random(["south_america", "europe", "youth"]) : null,
  };
}

async function main() {
  console.log("🌱 Iniciando Seed do Banco de Dados...\n");

  console.log("🧹 Limpando dados antigos...");
  await db.delete(financialRecords);
  await db.delete(matches);
  await db.delete(staff);
  await db.delete(players);
  await db.delete(competitions);
  await db.delete(seasons);
  await db.delete(gameState);
  await db.delete(teams);

  console.log("⚽ Criando times...");
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
        headCoachId: null,
        footballDirectorId: null,
        executiveDirectorId: null,
      }))
    )
    .returning({ id: teams.id, name: teams.name });

  console.log(`✅ ${insertedTeams.length} times criados`);

  console.log("🏃 Criando jogadores...");
  const allPlayers = [];

  for (const team of insertedTeams) {
    const squad = [
      ...Array(3).fill("GK"),
      ...Array(8).fill("DF"),
      ...Array(8).fill("MF"),
      ...Array(6).fill("FW"),
    ];

    for (const pos of squad) {
      allPlayers.push(generatePlayer(team.id, pos, false));
    }

    for (let i = 0; i < 15; i++) {
      allPlayers.push(
        generatePlayer(team.id, random(["DF", "MF", "FW"]), true)
      );
    }
  }

  await db.insert(players).values(allPlayers);
  console.log(`✅ ${allPlayers.length} jogadores criados`);

  for (const team of insertedTeams) {
    const teamPlayers = allPlayers.filter(
      (p) => p.teamId === team.id && !p.isYouth
    );

    const captain = teamPlayers.reduce((best, current) =>
      current.overall > best.overall ? current : best
    );

    captain.isCaptain = true;

    // await db
    //   .update(players)
    //   .set({ isCaptain: true })
    //   .where(players.firstName.name.equals(captain.firstName).and(players.lastName.data.equals(captain.lastName)));
  }

  console.log("👔 Criando staff técnico...");
  const allStaff = [];

  for (const team of insertedTeams) {
    for (const role of STAFF_ROLES) {
      allStaff.push(generateStaffMember(team.id, role));
    }
  }

  const insertedStaff = await db.insert(staff).values(allStaff).returning();
  console.log(`✅ ${insertedStaff.length} profissionais criados`);

  console.log("🏆 Criando competições...");
  await db.insert(competitions).values([
    {
      name: "Campeonato Nacional",
      shortName: "CN",
      country: "Brasil",
      tier: 1,
      format: "league",
      teams: 12,
      prize: 5000000,
      reputation: 8000,
    },
    {
      name: "Copa Nacional",
      shortName: "Copa",
      country: "Brasil",
      tier: 1,
      format: "knockout",
      teams: 16,
      prize: 2000000,
      reputation: 7000,
    },
    {
      name: "Libertadores Sul-Americana",
      shortName: "LSA",
      country: "Sul América",
      tier: 1,
      format: "group_knockout",
      teams: 16,
      prize: 10000000,
      reputation: 9000,
    },
  ]);
  console.log("✅ Competições criadas");

  console.log("📅 Criando temporada...");
  const [season] = await db
    .insert(seasons)
    .values({
      year: 2025,
      startDate: "2025-01-15",
      endDate: "2025-12-15",
      isActive: true,
    })
    .returning();
  console.log(`✅ Temporada ${season.year} criada`);

  console.log("🎮 Criando estado do jogo...");
  await db.insert(gameState).values({
    currentDate: "2025-01-15",
    currentSeasonId: season.id,
    managerName: "Treinador",
    playerTeamId: insertedTeams[0].id,
    simulationSpeed: 1,
  });
  console.log("✅ Estado inicial criado");

  console.log("\n" + "=".repeat(50));
  console.log("✅ SEED CONCLUÍDO COM SUCESSO!");
  console.log("=".repeat(50));
  console.log(`📊 Resumo:`);
  console.log(`   • ${insertedTeams.length} times`);
  console.log(`   • ${allPlayers.length} jogadores`);
  console.log(`   • ${insertedStaff.length} profissionais`);
  console.log(`   • 3 competições`);
  console.log(`   • 1 temporada ativa`);
  console.log("\n💾 Banco de dados: game.db");
}

main().catch((err) => {
  console.error("❌ Erro no seed:", err);
  process.exit(1);
});
