import { db } from "./client";
import { teams, players, gameState } from "./schema";

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
];

const TEAMS_DATA = [
  {
    name: "Red Eagles",
    shortName: "RED",
    primary: "#ef4444",
    secondary: "#ffffff",
    rep: 8000,
  },
  {
    name: "Blue Dragons",
    shortName: "BLU",
    primary: "#3b82f6",
    secondary: "#ffffff",
    rep: 8000,
  },
  {
    name: "Green Lions",
    shortName: "GRN",
    primary: "#22c55e",
    secondary: "#ffffff",
    rep: 7500,
  },
  {
    name: "White Warriors",
    shortName: "WHT",
    primary: "#f8fafc",
    secondary: "#0f172a",
    rep: 6000,
  },
  {
    name: "Black Panthers",
    shortName: "BLK",
    primary: "#1e293b",
    secondary: "#fbbf24",
    rep: 5500,
  },
  {
    name: "Golden Suns",
    shortName: "GLD",
    primary: "#eab308",
    secondary: "#1e293b",
    rep: 5000,
  },
  {
    name: "Silver Stars",
    shortName: "SLV",
    primary: "#94a3b8",
    secondary: "#0f172a",
    rep: 4500,
  },
  {
    name: "Purple Knights",
    shortName: "PRP",
    primary: "#a855f7",
    secondary: "#ffffff",
    rep: 4000,
  },
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("🌱 A iniciar o Seed do Banco de Dados...");

  console.log("🧹 A limpar dados antigos...");
  await db.delete(players);
  await db.delete(teams);
  await db.delete(gameState);

  console.log("⚽ A criar equipas...");
  const insertedTeams = await db
    .insert(teams)
    .values(
      TEAMS_DATA.map((t) => ({
        name: t.name,
        shortName: t.shortName,
        primaryColor: t.primary,
        secondaryColor: t.secondary,
        reputation: t.rep,
        budget: getRandomInt(5000000, 50000000),
      }))
    )
    .returning({ id: teams.id, name: teams.name });

  console.log("🏃 A criar plantéis...");
  const allPlayers = [];

  for (const team of insertedTeams) {
    const squadDistribution = [
      "GK",
      "GK",
      "GK",
      "DF",
      "DF",
      "DF",
      "DF",
      "DF",
      "DF",
      "DF",
      "MF",
      "MF",
      "MF",
      "MF",
      "MF",
      "MF",
      "MF",
      "FW",
      "FW",
      "FW",
      "FW",
      "FW",
    ];

    for (const pos of squadDistribution) {
      allPlayers.push({
        teamId: team.id,
        firstName: getRandomItem(FIRST_NAMES),
        lastName: getRandomItem(LAST_NAMES),
        position: pos,
        age: getRandomInt(17, 34),
        overall: getRandomInt(50, 90),
        attack: getRandomInt(40, 90),
        defense: getRandomInt(40, 90),
        physical: getRandomInt(40, 90),
        moral: 100,
        energy: 100,
      });
    }
  }

  await db.insert(players).values(allPlayers);

  console.log(
    `✅ Sucesso! Criadas ${insertedTeams.length} equipas e ${allPlayers.length} jogadores.`
  );
  console.log("📁 Banco de dados atualizado: game.db");
}

main().catch((err) => {
  console.error("❌ Erro no seed:", err);
  process.exit(1);
});
