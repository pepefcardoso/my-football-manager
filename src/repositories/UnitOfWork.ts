import { db, type DbInstance } from "../lib/db";
import type { IUnitOfWork } from "./IUnitOfWork";
import type { IRepositoryContainer } from "./IRepositories";
import { RepositoryFactory } from "./RepositoryContainer";
import { Logger } from "../lib/Logger";

export class UnitOfWork implements IUnitOfWork {
  private readonly dbInstance: DbInstance;
  private readonly logger: Logger;

  constructor(dbInstance: DbInstance = db) {
    this.dbInstance = dbInstance;
    this.logger = new Logger("UnitOfWork");
  }

  async execute<T>(
    work: (repos: IRepositoryContainer) => Promise<T>
  ): Promise<T> {
    return this.dbInstance.transaction(async (tx) => {
      const transactionalRepos = RepositoryFactory.create(tx);

      try {
        const result = await work(transactionalRepos);
        return result;
      } catch (error) {
        this.logger.error("Transação abortada devido a erro:", error);
        tx.rollback();
        throw error;
      }
    });
  }
}
