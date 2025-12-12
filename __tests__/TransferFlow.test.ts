import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { TransferService } from "../src/services/transfer/TransferService";
import {
  TransferStatus,
  TransferType,
  TransferStrategy,
  Position,
} from "../src/domain/enums";
import { createRepositoryContainer } from "../src/repositories/RepositoryContainer";
import { UnitOfWork } from "../src/repositories/UnitOfWork";
import { GameEventBus } from "../src/services/events/GameEventBus";
import { FinancialCategory } from "../src/domain/enums";
import { AITransferDecisionMaker } from "../src/services/ai/AITransferDecisionMaker";
import { SquadAnalysisService } from "../src/services/ai/SquadAnalysisService";
import { TransferWindowManager } from "../src/services/transfer/TransferWindowManager";
import { FinancialHealthChecker } from "../src/services/finance/FinancialHealthChecker";
import { Result } from "../src/services/types/ServiceResults";

vi.mock("../src/lib/db", () => {
  const mockTransaction = <T>(callback: (tx: any) => T): T => {
    const mockTx = {
      rollback: vi.fn(),
    };
    return callback(mockTx);
  };

  return {
    db: {
      transaction: vi.fn().mockImplementation(mockTransaction),
    },
    DbInstance: {} as any,
    DbTransaction: {} as any,
  };
});

const mockRepos = createRepositoryContainer();
const mockUnitOfWork = new UnitOfWork(vi.fn() as any);
const mockEventBus = new GameEventBus();

const mockSquadAnalysis = new SquadAnalysisService(mockRepos);
const mockTransferWindow = new TransferWindowManager(mockRepos);
const mockFinancialHealth = new FinancialHealthChecker(mockRepos, mockEventBus);

const aiDecisionMaker = new AITransferDecisionMaker(
  mockRepos,
  {} as TransferService,
  mockSquadAnalysis,
  mockTransferWindow,
  mockFinancialHealth
);

const transferService = new TransferService(
  mockRepos,
  mockUnitOfWork,
  mockEventBus
);
(aiDecisionMaker as any).transferService = transferService;

describe("Transferência de Ponta a Ponta (Integração de Serviços)", () => {
  const BUYING_TEAM_ID = 1;
  const SELLING_TEAM_ID = 99;
  const PLAYER_ID = 1001;
  const ACCEPT_FEE = 2000000;

  const getBaseProposal = async (id: number, status: TransferStatus) => {
    if (id === 123) {
      return {
        id: 123,
        playerId: PLAYER_ID,
        fromTeamId: SELLING_TEAM_ID,
        toTeamId: BUYING_TEAM_ID,
        type: TransferType.TRANSFER,
        status: status,
        fee: ACCEPT_FEE,
        wageOffer: 100000,
        contractLength: 4,
        createdAt: "2025-07-01",
        responseDeadline: "2025-07-04",
        counterOfferFee: null,
        player: await mockRepos.players.findById(PLAYER_ID),
        fromTeam: await mockRepos.teams.findById(SELLING_TEAM_ID),
        toTeam: await mockRepos.teams.findById(BUYING_TEAM_ID),
      };
    }
    return undefined;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(mockEventBus, "publish").mockClear();

    mockRepos.teams.findById = vi.fn().mockImplementation(async (id) => {
      if (id === BUYING_TEAM_ID) {
        return {
          id: BUYING_TEAM_ID,
          name: "Time Comprador",
          budget: 10000000,
          isHuman: true,
        };
      }
      if (id === SELLING_TEAM_ID) {
        return {
          id: SELLING_TEAM_ID,
          name: "Time AI",
          budget: 5000000,
          isHuman: false,
          transferStrategy: TransferStrategy.BALANCED,
        };
      }
      return undefined;
    });

    mockRepos.players.findById = vi.fn().mockResolvedValue({
      id: PLAYER_ID,
      teamId: SELLING_TEAM_ID,
      firstName: "Test",
      lastName: "Player",
      overall: 75,
      potential: 85,
      age: 24,
      position: Position.MF,
      finishing: 70,
      passing: 80,
      dribbling: 75,
      defending: 60,
      shooting: 70,
      physical: 75,
      pace: 75,
      moral: 80,
      energy: 90,
      fitness: 90,
      isYouth: false,
      isInjured: false,
      injuryDaysRemaining: 0,
      suspensionGamesRemaining: 0,
      contractEnd: "2027-12-31",
    });

    mockRepos.transfers.findByPlayerId = vi.fn().mockResolvedValue([]);
    mockRepos.players.findByTeamId = vi.fn().mockResolvedValue([]);

    mockRepos.transferProposals.findActiveProposal = vi
      .fn()
      .mockResolvedValue(undefined);

    mockRepos.transferProposals.create = vi.fn().mockResolvedValue(123);

    const findByIdMock = vi.fn() as Mock;

    findByIdMock
      .mockImplementationOnce(async (id: number) => {
        return getBaseProposal(id, TransferStatus.PENDING);
      })
      .mockImplementationOnce(async (id: number) => {
        return getBaseProposal(id, TransferStatus.PENDING);
      })
      .mockImplementationOnce(async (id: number) => {
        return getBaseProposal(id, TransferStatus.ACCEPTED);
      })
      .mockImplementation(async (id: number) => {
        return getBaseProposal(id, TransferStatus.COMPLETED);
      });

    mockRepos.transferProposals.findById = findByIdMock;

    mockRepos.teams.updateBudget = vi.fn().mockResolvedValue(undefined);
    mockRepos.financial.addRecord = vi.fn().mockResolvedValue(undefined);
    mockRepos.players.update = vi.fn().mockResolvedValue(undefined);
    mockRepos.transfers.create = vi.fn().mockResolvedValue(undefined);
    mockRepos.transferProposals.update = vi.fn().mockResolvedValue(undefined);
    mockRepos.seasons.findActiveSeason = vi
      .fn()
      .mockResolvedValue({ id: 1, year: 2025 });

    mockUnitOfWork.execute = vi.fn().mockImplementation(async (work) => {
      return work(mockRepos);
    });

    mockTransferWindow.isWindowOpen = vi.fn().mockReturnValue(true);
  });

  it("deve executar o fluxo de transferência completo (Proposta -> Aceite -> Finalização)", async () => {
    const offerInput = {
      playerId: PLAYER_ID,
      fromTeamId: SELLING_TEAM_ID,
      toTeamId: BUYING_TEAM_ID,
      type: TransferType.TRANSFER,
      fee: ACCEPT_FEE,
      wageOffer: 100000,
      contractLength: 4,
      currentDate: "2025-07-01",
      seasonId: 1,
    };

    const proposalResult = await transferService.createProposal(
      offerInput as any
    );
    expect(Result.isSuccess(proposalResult)).toBe(true);
    const proposalId = Result.unwrap(proposalResult);

    const aiEvaluation = await aiDecisionMaker.evaluateIncomingProposal(
      proposalId,
      "2025-07-02"
    );
    expect(Result.isSuccess(aiEvaluation)).toBe(true);

    expect(Result.unwrap(aiEvaluation).decision).toBe("accept");

    expect(mockRepos.transferProposals.update).toHaveBeenCalledWith(
      proposalId,
      expect.objectContaining({ status: TransferStatus.ACCEPTED })
    );

    const finalizeResult = await transferService.finalizeTransfer(proposalId);
    expect(Result.isSuccess(finalizeResult)).toBe(true);

    expect(mockUnitOfWork.execute).toHaveBeenCalledTimes(1);

    expect(mockRepos.teams.updateBudget).toHaveBeenCalledWith(
      BUYING_TEAM_ID,
      10000000 - ACCEPT_FEE
    );
    expect(mockRepos.teams.updateBudget).toHaveBeenCalledWith(
      SELLING_TEAM_ID,
      5000000 + ACCEPT_FEE
    );

    expect(mockRepos.financial.addRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: BUYING_TEAM_ID,
        type: "expense",
        category: FinancialCategory.TRANSFER_OUT,
        amount: ACCEPT_FEE,
      })
    );
    expect(mockRepos.financial.addRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: SELLING_TEAM_ID,
        type: "income",
        category: FinancialCategory.TRANSFER_IN,
        amount: ACCEPT_FEE,
      })
    );

    expect(mockRepos.players.update).toHaveBeenCalledWith(
      PLAYER_ID,
      expect.objectContaining({
        teamId: BUYING_TEAM_ID,
        moral: 85,
      })
    );

    expect(mockRepos.transferProposals.update).toHaveBeenCalledWith(
      proposalId,
      { status: TransferStatus.COMPLETED }
    );
    expect(mockRepos.transfers.create).toHaveBeenCalledTimes(1);

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      "TRANSFER_COMPLETED",
      expect.objectContaining({ playerId: PLAYER_ID, fee: ACCEPT_FEE })
    );
  });
});
