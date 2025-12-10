import { db, type DbInstance, type DbTransaction } from "../lib/db";

export abstract class BaseRepository {
  protected readonly db: DbInstance | DbTransaction;

  constructor(dbImpl: DbInstance | DbTransaction = db) {
    this.db = dbImpl;
  }
}
