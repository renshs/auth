/**
 * @file src/db.ts
 * @brief SQLite helpers for the authentication app.
 */

import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";

export type Db = sqlite3.Database;

/**
 * @brief Open a sqlite database and ensure the parent directory exists.
 * @param dbFile Database file path.
 * @return Open sqlite3 database instance.
 */
export function openDb(dbFile: string): Db {
  const abs = path.resolve(dbFile);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  return new sqlite3.Database(abs);
}

/**
 * @brief Run a SQL statement without returning rows.
 * @param db Database instance.
 * @param sql SQL statement.
 * @param params Statement parameters.
 * @return Promise resolved when the statement completes.
 */
export function run(db: Db, sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

/**
 * @brief Get a single row from a SQL query.
 * @param db Database instance.
 * @param sql SQL query.
 * @param params Query parameters.
 * @return Promise resolved with the row or undefined.
 */
export function get<T>(db: Db, sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T | undefined)));
  });
}
