import type { IRepositoryContainer } from "./IRepositories";

export interface IUnitOfWork {
  /**
   * Executa uma operação dentro de uma transação do banco de dados.
   * Todos os repositórios acessados através do container fornecido no callback
   * compartilharão o mesmo contexto transacional.
   *
   * @param work Callback contendo a lógica de negócio
   */
  execute<T>(work: (repos: IRepositoryContainer) => Promise<T>): Promise<T>;
}
