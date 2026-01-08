import { z } from "zod";

const IDSchema = z.string().min(1, { message: "ID cannot be empty" });
const TimestampSchema = z.number().int().min(0);
const MoneySchema = z.number().int().min(0);
const AttributeSchema = z.number().int().min(1).max(99);
const FootSchema = z.enum(["LEFT", "RIGHT", "BOTH"]);
const PositionSchema = z.enum(["GK", "DEF", "MID", "ATT"]);
const MatchStatusSchema = z.enum([
  "SCHEDULED",
  "IN_PROGRESS",
  "FINISHED",
  "POSTPONED",
]);

const MetaSchema = z
  .object({
    version: z.string(),
    saveName: z.string().min(1),
    currentDate: TimestampSchema,
    currentUserManagerId: IDSchema,
    userClubId: IDSchema.nullable(),
    activeSeasonId: IDSchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

const PlayerSchema = z
  .object({
    id: IDSchema,
    name: z.string().min(1),
    nickname: z.string(),
    nationId: IDSchema,
    birthDate: TimestampSchema,
    primaryPositionId: PositionSchema,
    preferredFoot: FootSchema,
    crossing: AttributeSchema,
    finishing: AttributeSchema,
    passing: AttributeSchema,
    technique: AttributeSchema,
    defending: AttributeSchema,
    gkReflexes: AttributeSchema,
    gkRushingOut: AttributeSchema,
    gkDistribution: AttributeSchema,
    speed: AttributeSchema,
    force: AttributeSchema,
    stamina: AttributeSchema,
    intelligence: AttributeSchema,
    determination: AttributeSchema,
    overall: AttributeSchema,
    potential: AttributeSchema,
    proneToInjury: AttributeSchema,
    marketValue: MoneySchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict()
  .refine((data) => data.potential >= data.overall, {
    message: "Player Potential must be greater than or equal to Overall",
    path: ["potential"], // Aponta o erro para o campo potential
  })
  .refine(
    (data) => {
      const age = (Date.now() - data.birthDate) / (365 * 24 * 60 * 60 * 1000);
      return age >= 14 && age <= 50;
    },
    {
      message: "Player age must be between 14 and 50",
      path: ["birthDate"],
    }
  );

const ClubSchema = z
  .object({
    id: IDSchema,
    dateFounded: TimestampSchema,
    name: z.string().min(1),
    nickname: z.string(),
    cityId: IDSchema,
    nationId: IDSchema,
    primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid Hex Color"),
    secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid Hex Color"),
    badgeId: z.string(),
    kitId: z.string(),
    fanBaseCurrent: z.number().int().min(0),
    fanBaseMax: z.number().int().min(0),
    fanBaseMin: z.number().int().min(0),
    reputation: z.number().int().min(0).max(10000),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

const MatchSchema = z
  .object({
    id: IDSchema,
    competitionGroupId: IDSchema.optional(),
    stadiumId: IDSchema,
    homeClubId: IDSchema,
    awayClubId: IDSchema,
    homeGoals: z.number().int().min(0),
    awayGoals: z.number().int().min(0),
    homePenalties: z.number().int().nullable(),
    awayPenalties: z.number().int().nullable(),
    roundNumber: z.number().int().min(1),
    datetime: TimestampSchema,
    status: MatchStatusSchema,
    attendance: z.number().int().min(0),
    ticketRevenue: MoneySchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

export const GameStateSchema = z
  .object({
    meta: MetaSchema,

    people: z.object({
      managers: z.record(IDSchema, z.any()), // TODO: Implementar ManagerSchema
      players: z.record(IDSchema, PlayerSchema),
      staff: z.record(IDSchema, z.any()),
      playerStates: z.record(IDSchema, z.any()),
      playerInjuries: z.record(IDSchema, z.any()),
      playerSecondaryPositions: z.record(z.string(), z.any()),
    }),

    clubs: z.object({
      clubs: z.record(IDSchema, ClubSchema),
      infras: z.record(IDSchema, z.any()),
      finances: z.record(IDSchema, z.any()),
      relationships: z.record(IDSchema, z.any()),
      rivalries: z.record(z.string(), z.any()),
      stadiums: z.record(IDSchema, z.any()),
      sponsorships: z.record(IDSchema, z.any()),
    }),

    matches: z.object({
      matches: z.record(IDSchema, MatchSchema),
      events: z.record(IDSchema, z.any()),
      playerStats: z.record(IDSchema, z.any()),
      formations: z.record(IDSchema, z.any()),
      positions: z.record(IDSchema, z.any()),
      teamTactics: z.record(IDSchema, z.any()),
    }),

    // TODO OUTROS SCHEMAS dos outros dominios
    competitions: z.any(),
    market: z.any(),
    world: z.any(),
    system: z.any(),
  })
  .strict();
