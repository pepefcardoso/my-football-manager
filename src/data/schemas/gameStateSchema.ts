import { z } from "zod";

const IDSchema = z.string();
const TimestampSchema = z.number();
const MoneySchema = z.number();
const AttributeSchema = z.number().min(0).max(100);

const MetaSchema = z.object({
  version: z.string(),
  saveName: z.string(),
  currentDate: TimestampSchema,
  currentUserManagerId: IDSchema,
  userClubId: IDSchema.nullable(),
  activeSeasonId: IDSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});


const PlayerSchema = z
  .object({
    id: IDSchema,
    name: z.string(),
    primaryPositionId: IDSchema,
    overall: AttributeSchema, 
    marketValue: MoneySchema.optional(), 
  })
  .passthrough(); 

const ClubSchema = z
  .object({
    id: IDSchema,
    name: z.string(),
    reputation: z.number(),
  })
  .passthrough();

const MatchSchema = z
  .object({
    id: IDSchema,
    homeClubId: IDSchema,
    awayClubId: IDSchema,
    status: z.enum(["SCHEDULED", "IN_PROGRESS", "FINISHED", "POSTPONED"]),
    homeGoals: z.number(),
    awayGoals: z.number(),
  })
  .passthrough();

export const GameStateSchema = z.object({
  meta: MetaSchema,
  managers: z.record(IDSchema, z.any()),
  players: z.record(IDSchema, PlayerSchema),
  clubs: z.record(IDSchema, ClubSchema),
  matches: z.record(IDSchema, MatchSchema),
  staff: z.record(IDSchema, z.any()),
  scoutingKnowledge: z.record(z.string(), z.any()),
  clubInfras: z.record(IDSchema, z.any()),
  clubFinances: z.record(IDSchema, z.any()),
  clubRelationships: z.record(IDSchema, z.any()),
  clubRivalries: z.record(z.string(), z.any()),
  financialEntries: z.record(IDSchema, z.any()),
  stadiums: z.record(IDSchema, z.any()),
  sponsorships: z.record(IDSchema, z.any()),
  nations: z.record(IDSchema, z.any()),
  cities: z.record(IDSchema, z.any()),
  seasons: z.record(IDSchema, z.any()),
  competitions: z.record(IDSchema, z.any()),
  competitionSeasons: z.record(IDSchema, z.any()),
  clubCompetitionSeasons: z.record(IDSchema, z.any()),
  competitionFases: z.record(IDSchema, z.any()),
  competitionGroups: z.record(IDSchema, z.any()),
  classificationRules: z.record(IDSchema, z.any()),
  prizeRules: z.record(IDSchema, z.any()),
  standings: z.record(IDSchema, z.any()),
  matchEvents: z.record(IDSchema, z.array(z.any())),
  playerMatchStats: z.record(IDSchema, z.any()),
  contracts: z.record(IDSchema, z.any()),
  clubManagers: z.record(IDSchema, z.any()),
  staffContracts: z.record(IDSchema, z.any()),
  transferOffers: z.record(IDSchema, z.any()),
  playerLoans: z.record(IDSchema, z.any()),
  playerStates: z.record(IDSchema, z.any()),
  playerInjuries: z.record(IDSchema, z.any()),
  playerSeasonStats: z.record(z.string(), z.any()),
  playerSecondaryPositions: z.record(z.string(), z.any()),
  formations: z.record(IDSchema, z.any()),
  positions: z.record(IDSchema, z.any()),
  teamTactics: z.record(IDSchema, z.any()),
  news: z.record(IDSchema, z.any()),
  notifications: z.record(IDSchema, z.any()),
  scheduledEvents: z.record(IDSchema, z.any()),
  gameEvents: z.record(IDSchema, z.any()),
});
