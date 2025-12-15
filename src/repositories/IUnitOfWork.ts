import type { IRepositoryContainer } from "./IRepositories";
import type { DbInstance } from "../lib/db";

export interface IUnitOfWork {
  /**
   * Executa uma operação dentro de uma transação do banco de dados.
   * * @param work Callback que recebe os repositórios transacionais E a instância do banco (para operações raw)
   */
  execute<T>(
    work: (repos: IRepositoryContainer, db: DbInstance) => Promise<T>
  ): Promise<T>;
}
