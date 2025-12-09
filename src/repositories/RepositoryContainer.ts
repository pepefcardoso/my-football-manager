import { playerRepository } from "../repositories/PlayerRepository";
import { teamRepository } from "../repositories/TeamRepository";
import { staffRepository } from "../repositories/StaffRepository";
import { matchRepository } from "../repositories/MatchRepository";
import { competitionRepository } from "../repositories/CompetitionRepository";
import { seasonRepository } from "../repositories/SeasonRepository";
import { financialRepository } from "../repositories/FinancialRepository";
import { scoutingRepository } from "../repositories/ScoutingRepository";
import { transferRepository } from "../repositories/TransferRepository";
import type { IRepositoryContainer } from "./IRepositories";

/**
 * Container de produção com implementações reais
 */
class ProductionRepositoryContainer implements IRepositoryContainer {
  public readonly players = playerRepository;
  public readonly teams = teamRepository;
  public readonly staff = staffRepository;
  public readonly matches = matchRepository;
  public readonly competitions = competitionRepository;
  public readonly seasons = seasonRepository;
  public readonly financial = financialRepository;
  public readonly scouting = scoutingRepository;
  public readonly transfers = transferRepository;
}

/**
 * Singleton global do container
 */
export const repositoryContainer: IRepositoryContainer =
  new ProductionRepositoryContainer();

/**
 * Factory para criar containers customizados (útil para testes)
 */
export function createRepositoryContainer(
  overrides?: Partial<IRepositoryContainer>
): IRepositoryContainer {
  return {
    ...repositoryContainer,
    ...overrides,
  };
}
