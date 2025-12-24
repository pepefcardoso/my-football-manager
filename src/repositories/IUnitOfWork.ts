import type { IRepositoryContainer } from "./IRepositories";
import type { DbInstance } from "../lib/db";

export interface IUnitOfWork {
  execute<T>(
    work: (repos: IRepositoryContainer, db: DbInstance) => Promise<T>
  ): Promise<T>;
}
