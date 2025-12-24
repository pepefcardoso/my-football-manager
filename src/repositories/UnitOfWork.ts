import { sql } from "drizzle-orm";
import { db, type DbInstance } from "../lib/db";
import type { IUnitOfWork } from "./IUnitOfWork";
import type { IRepositoryContainer } from "./IRepositories";
import { RepositoryFactory } from "./RepositoryContainer";
import { Logger } from "../lib/Logger";
import type { GameEventBus } from "../lib/GameEventBus";

export class UnitOfWork implements IUnitOfWork {
  private readonly dbInstance: DbInstance;
  private readonly logger: Logger;
  private readonly eventBus?: GameEventBus;

  constructor(dbInstance: DbInstance = db, eventBus?: GameEventBus) {
    this.dbInstance = dbInstance;
    this.logger = new Logger("UnitOfWork");
    this.eventBus = eventBus;
  }

  async execute<T>(
    work: (repos: IRepositoryContainer, db: DbInstance) => Promise<T>
  ): Promise<T> {
    const savepointId = `sp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    let isRootTransaction = false;

    try {
      try {
        this.dbInstance.run(sql`BEGIN TRANSACTION`);
        isRootTransaction = true;
      } catch (e: any) {
        const msg = e.message || "";
        const causeMsg = e.cause?.message || "";

        const isNestedTransactionError =
          msg.includes("within a transaction") ||
          causeMsg.includes("within a transaction");

        if (isNestedTransactionError) {
          this.dbInstance.run(sql.raw(`SAVEPOINT ${savepointId}`));
        } else {
          throw e;
        }
      }

      const transactionalRepos = RepositoryFactory.create(
        this.dbInstance,
        this.eventBus
      );

      const result = await work(transactionalRepos, this.dbInstance);

      if (isRootTransaction) {
        this.dbInstance.run(sql`COMMIT`);
      } else {
        this.dbInstance.run(sql.raw(`RELEASE SAVEPOINT ${savepointId}`));
      }

      return result;
    } catch (error) {
      try {
        if (isRootTransaction) {
          this.dbInstance.run(sql`ROLLBACK`);
        } else {
          this.dbInstance.run(sql.raw(`ROLLBACK TO SAVEPOINT ${savepointId}`));
        }
      } catch (rollbackError) {
        this.logger.error("Erro crítico ao fazer Rollback:", rollbackError);
      }

      throw error;
    }
  }
}
