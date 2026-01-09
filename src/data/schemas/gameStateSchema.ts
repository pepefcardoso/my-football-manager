import { z } from "zod";

const createIdSchema = <T extends string>(brand: T) => z.string().brand(brand);

const IDSchema = z.string().default("");
const TimestampSchema = z.coerce.number().default(0);
const MoneySchema = z.coerce.number().default(0);
const AttributeSchema = z.coerce.number().min(1).max(100).catch(10);
const FootSchema = z.union([z.literal("LEFT"), z.literal("RIGHT"), z.string()]);
const PositionSchema = z.string().default("UNKNOWN");
const MatchStatusSchema = z.string().default("SCHEDULED");

const UserIdSchema = createIdSchema("UserId");
const ClubIdSchema = createIdSchema("ClubId");
const PlayerIdSchema = createIdSchema("PlayerId");
const MatchIdSchema = createIdSchema("MatchId");
const NationIdSchema = createIdSchema("NationId");

export const MetaSchema = z
  .object({
    version: z.string().default("1.0.0"),
    saveName: z.string().default("New Save"),
    currentDate: TimestampSchema,
    currentUserManagerId: UserIdSchema,
    userClubId: ClubIdSchema.nullable().default(null),
    activeSeasonId: IDSchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .passthrough();

export const PlayerSchema = z
  .object({
    id: PlayerIdSchema,
    name: z.string().default("Unknown Player"),
    nickname: z.string().optional(),
    nationId: NationIdSchema,
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
  .passthrough();

export const ClubSchema = z
  .object({
    id: ClubIdSchema,
    dateFounded: TimestampSchema,
    name: z.string(),
    nickname: z.string().default(""),
    cityId: IDSchema,
    nationId: NationIdSchema,
    primaryColor: z.string().default("#000000"),
    secondaryColor: z.string().default("#FFFFFF"),
    badgeId: z.string().default("default_badge"),
    kitId: z.string().default("default_kit"),
    fanBaseCurrent: z.number().catch(0),
    fanBaseMax: z.number().catch(1000),
    fanBaseMin: z.number().catch(0),
    reputation: z.number().min(0).max(10000).catch(0),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .passthrough();

export const MatchSchema = z
  .object({
    id: MatchIdSchema,
    competitionGroupId: IDSchema.optional(),
    stadiumId: IDSchema,
    homeClubId: ClubIdSchema,
    awayClubId: ClubIdSchema,
    homeGoals: z.coerce.number().catch(0),
    awayGoals: z.coerce.number().catch(0),
    homePenalties: z.coerce.number().nullable().catch(null),
    awayPenalties: z.coerce.number().nullable().catch(null),
    roundNumber: z.number().catch(1),
    datetime: TimestampSchema,
    status: MatchStatusSchema,
    attendance: z.number().catch(0),
    ticketRevenue: MoneySchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .passthrough();

const TempLineupSchema = z
  .object({
    starters: z.array(z.string()),
    bench: z.array(z.string()),
    reserves: z.array(z.string()),
    lastUpdated: z.number(),
  })
  .nullable()
  .optional();

export const GameStateSchema = z
  .object({
    meta: MetaSchema,

    people: z.object({
      managers: z.record(IDSchema, z.any()),
      players: z.record(PlayerIdSchema, PlayerSchema).catch({}),
      staff: z.record(IDSchema, z.any()),
      playerStates: z.record(IDSchema, z.any()),
      playerInjuries: z.record(IDSchema, z.any()),
      playerSecondaryPositions: z.record(z.string(), z.any()),
    }),

    clubs: z.object({
      clubs: z.record(ClubIdSchema, ClubSchema).catch({}),
      infras: z.record(IDSchema, z.any()),
      finances: z.record(IDSchema, z.any()),
      relationships: z.record(IDSchema, z.any()),
      rivalries: z.record(z.string(), z.any()),
      stadiums: z.record(IDSchema, z.any()),
      sponsorships: z.record(IDSchema, z.any()),
    }),

    matches: z.object({
      matches: z.record(MatchIdSchema, MatchSchema).catch({}),
      events: z.record(IDSchema, z.any()),
      playerStats: z.record(IDSchema, z.any()),
      formations: z.record(IDSchema, z.any()),
      positions: z.record(IDSchema, z.any()),
      teamTactics: z.record(IDSchema, z.any()),
      tempLineup: TempLineupSchema,
    }),

    competitions: z.any(),
    market: z.any(),
    world: z.any(),
    system: z.any(),
  })
  .passthrough();

export type Meta = z.infer<typeof MetaSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type Club = z.infer<typeof ClubSchema>;
export type Match = z.infer<typeof MatchSchema>;
export type GameState = z.infer<typeof GameStateSchema>;

export type PlayerId = z.infer<typeof PlayerIdSchema>;
export type ClubId = z.infer<typeof ClubIdSchema>;
