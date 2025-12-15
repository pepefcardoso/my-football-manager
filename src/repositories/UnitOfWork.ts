import { sql } from "drizzle-orm";
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
    work: (repos: IRepositoryContainer, db: DbInstance) => Promise<T>
  ): Promise<T> {
    try {
      this.dbInstance.run(sql`BEGIN TRANSACTION`);

      const transactionalRepos = RepositoryFactory.create(this.dbInstance);

      const result = await work(transactionalRepos, this.dbInstance);

      this.dbInstance.run(sql`COMMIT`);

      return result;
    } catch (error) {
      this.logger.error("Transação abortada. Iniciando Rollback...", error);
      try {
        this.dbInstance.run(sql`ROLLBACK`);
      } catch (rollbackError) {
        this.logger.error("Erro crítico no Rollback:", rollbackError);
      }
      throw error;
    }
  }
}
