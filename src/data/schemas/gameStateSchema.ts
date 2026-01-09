import { z } from "zod";

const IDSchema = z.string().default("");
const TimestampSchema = z.coerce.number().default(0);
const MoneySchema = z.coerce.number().default(0);
const AttributeSchema = z.coerce.number().min(1).max(100).catch(10);
const FootSchema = z.union([
  z.literal("LEFT"),
  z.literal("RIGHT"),
  z.literal("BOTH"),
  z.string(),
]);
const PositionSchema = z.string().default("UNKNOWN");
const MatchStatusSchema = z
  .enum(["SCHEDULED", "IN_PROGRESS", "FINISHED", "POSTPONED"])
  .catch("SCHEDULED");
const UserIdSchema = IDSchema;
const ClubIdSchema = IDSchema;
const PlayerIdSchema = IDSchema;
const MatchIdSchema = IDSchema;
const NationIdSchema = IDSchema;

const SeasonSchema = z.object({
  id: IDSchema,
  year: z.number(),
  beginning: TimestampSchema,
  ending: TimestampSchema,
  active: z.boolean(),
});

const CompetitionSchema = z.object({
  id: IDSchema,
  name: z.string(),
  nickname: z.string(),
  type: z.string(),
  hierarchyLevel: z.number(),
  standardFormatType: z.string(),
  standingsPriority: z.string(),
});

const CompetitionSeasonSchema = z.object({
  id: IDSchema,
  competitionId: IDSchema,
  seasonId: IDSchema,
  tieBreakingCriteria1: z.string(),
  tieBreakingCriteria2: z.string(),
  tieBreakingCriteria3: z.string(),
  tieBreakingCriteria4: z.string(),
});

const CompetitionFaseSchema = z.object({
  id: IDSchema,
  competitionSeasonId: IDSchema,
  name: z.string(),
  orderIndex: z.number(),
  type: z.string(),
  isTwoLeggedKnockout: z.boolean(),
  isFinalSingleGame: z.boolean(),
});

const CompetitionGroupSchema = z.object({
  id: IDSchema,
  competitionFaseId: IDSchema,
  name: z.string(),
});

const ClubCompetitionSeasonSchema = z.object({
  id: IDSchema,
  competitionSeasonId: IDSchema,
  clubId: ClubIdSchema,
});

const CompetitionStandingSchema = z.object({
  id: IDSchema,
  competitionGroupId: IDSchema,
  clubCompetitionSeasonId: IDSchema,
  points: z.number().default(0),
  gamesPlayed: z.number().default(0),
  wins: z.number().default(0),
  draws: z.number().default(0),
  defeats: z.number().default(0),
  goalsScored: z.number().default(0),
  goalsConceded: z.number().default(0),
  goalsBalance: z.number().default(0),
});

const ClassificationRuleSchema = z.object({
  id: IDSchema,
  competitionSeasonId: IDSchema,
  competitionFaseId: IDSchema,
  ruleType: z.string(),
  startPosition: z.number(),
  endPosition: z.number(),
  slotQuantity: z.number(),
  priorityOrder: z.number(),
  destinyCompetitionId: IDSchema,
  destinyStageKey: z.string(),
});

const PrizeRuleSchema = z.object({
  id: IDSchema,
  competitionSeasonId: IDSchema,
  competitionFaseId: IDSchema.nullable(),
  ruleType: z.string(),
  position: z.number().nullable(),
  amount: MoneySchema,
});

const ContractSchema = z.object({
  id: IDSchema,
  playerId: PlayerIdSchema,
  clubId: ClubIdSchema,
  startDate: TimestampSchema,
  endDate: TimestampSchema,
  monthlyWage: MoneySchema,
  releaseClause: MoneySchema,
  isLoaned: z.boolean().default(false),
  active: z.boolean().default(true),
});

const StaffContractSchema = z.object({
  id: IDSchema,
  staffId: IDSchema,
  clubId: ClubIdSchema,
  monthlyWage: MoneySchema,
  releaseClause: MoneySchema,
  active: z.boolean().default(true),
});

const ClubManagerSchema = z.object({
  id: IDSchema,
  clubId: ClubIdSchema,
  managerId: IDSchema,
  monthlyWage: MoneySchema,
  releaseClause: MoneySchema,
  expirationDate: TimestampSchema,
  createdAt: TimestampSchema,
});

const TransferOfferSchema = z.object({
  id: IDSchema,
  playerId: PlayerIdSchema,
  buyingClubId: ClubIdSchema,
  sellingClubId: ClubIdSchema,
  offerDate: TimestampSchema,
  status: z
    .enum(["PENDING", "ACCEPTED", "REJECTED", "NEGOTIATING"])
    .catch("PENDING"),
  feeAmount: MoneySchema,
  wageOffer: MoneySchema,
  contractYears: z.number(),
  type: z.string(),
  rejectionReason: z.string().nullable().optional(),
  expiresAt: TimestampSchema,
});

const PlayerLoanSchema = z.object({
  id: IDSchema,
  contractId: IDSchema,
  originClubId: ClubIdSchema,
  destinyClubId: ClubIdSchema,
  expirationDate: TimestampSchema,
  fee: MoneySchema,
  wagePercentagePaidByDestiny: AttributeSchema,
});

const ScoutingKnowledgeSchema = z.object({
  id: IDSchema,
  observingClubId: ClubIdSchema,
  targetPlayerId: PlayerIdSchema,
  knowledgeLevel: AttributeSchema,
  lastUpdated: TimestampSchema,
});

export const MetaSchema = z
  .object({
    version: z.string().default("2.0.0"),
    saveName: z.string().default("New Save"),
    currentDate: TimestampSchema,
    currentUserManagerId: UserIdSchema,
    userClubId: ClubIdSchema.nullable().default(null),
    activeSeasonId: IDSchema,
    persistenceMode: z.enum(["DISK", "MEMORY"]).default("DISK"),
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
      managers: z.record(IDSchema, z.any()), // TODO: Implementar ManagerSchema
      players: z.record(PlayerIdSchema, PlayerSchema).catch({}),
      staff: z.record(IDSchema, z.any()), // TODO: Implementar StaffSchema
      playerStates: z.record(IDSchema, z.any()), // TODO: Implementar PlayerStateSchema
      playerInjuries: z.record(IDSchema, z.any()),
      playerSecondaryPositions: z.record(z.string(), z.any()),
    }),

    clubs: z.object({
      clubs: z.record(ClubIdSchema, ClubSchema).catch({}),
      infras: z.record(IDSchema, z.any()), // TODO: ClubInfraSchema
      finances: z.record(IDSchema, z.any()), // TODO: ClubFinancesSchema
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

    competitions: z.object({
      seasons: z.record(IDSchema, SeasonSchema),
      competitions: z.record(IDSchema, CompetitionSchema),
      competitionSeasons: z.record(IDSchema, CompetitionSeasonSchema),
      clubCompetitionSeasons: z.record(IDSchema, ClubCompetitionSeasonSchema),
      fases: z.record(IDSchema, CompetitionFaseSchema),
      groups: z.record(IDSchema, CompetitionGroupSchema),
      standings: z.record(IDSchema, CompetitionStandingSchema),
      standingsLookup: z.record(z.string(), IDSchema),
      rules: z.object({
        classification: z.record(IDSchema, ClassificationRuleSchema),
        prizes: z.record(IDSchema, PrizeRuleSchema),
      }),
    }),

    market: z.object({
      contracts: z.record(IDSchema, ContractSchema),
      staffContracts: z.record(IDSchema, StaffContractSchema),
      clubManagers: z.record(IDSchema, ClubManagerSchema),
      transferOffers: z.record(IDSchema, TransferOfferSchema),
      loans: z.record(IDSchema, PlayerLoanSchema),
      scoutingKnowledge: z.record(z.string(), ScoutingKnowledgeSchema),
      playerContractIndex: z.record(PlayerIdSchema, IDSchema),
      clubSquadIndex: z.record(ClubIdSchema, z.array(PlayerIdSchema)),
    }),

    world: z.any(), // TODO: Tipar World Domain
    system: z.any(), // TODO: Tipar System Domain
  })
  .passthrough();

export type Meta = z.infer<typeof MetaSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type Club = z.infer<typeof ClubSchema>;
export type Match = z.infer<typeof MatchSchema>;
export type GameState = z.infer<typeof GameStateSchema>;

export type PlayerId = z.infer<typeof PlayerIdSchema>;
export type ClubId = z.infer<typeof ClubIdSchema>;
