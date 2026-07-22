import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from "@capacitor-community/sqlite";
import type { LocalDatabaseFactory } from "./databaseFactory";
import migration001 from "./migrations/001_notes.sql?raw";
import { SqliteNoteRepository } from "./sqliteNotes";

export interface SqlDriver {
  execute(statements: string): Promise<void>;
  run(statement: string, values?: unknown[]): Promise<number>;
  query<T extends Record<string, unknown>>(
    statement: string,
    values?: unknown[],
  ): Promise<T[]>;
  close(): Promise<void>;
}

export interface SqliteConnectionManager {
  isDatabase(database: string): Promise<{ result?: boolean }>;
  isSecretStored(): Promise<{ result?: boolean }>;
  setEncryptionSecret(passphrase: string): Promise<void>;
  createConnection(
    database: string,
    encrypted: boolean,
    mode: string,
    version: number,
    readonly: boolean,
  ): Promise<SQLiteDBConnection>;
  isConnection(
    database: string,
    readonly: boolean,
  ): Promise<{ result?: boolean }>;
  closeConnection(database: string, readonly: boolean): Promise<void>;
  deleteDatabase(database: string): Promise<void>;
}

class CapacitorSqliteConnectionManager implements SqliteConnectionManager {
  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);

  isDatabase(database: string) {
    return this.sqlite.isDatabase(database);
  }

  isSecretStored() {
    return this.sqlite.isSecretStored();
  }

  setEncryptionSecret(passphrase: string) {
    return this.sqlite.setEncryptionSecret(passphrase);
  }

  createConnection(
    database: string,
    encrypted: boolean,
    mode: string,
    version: number,
    readonly: boolean,
  ) {
    return this.sqlite.createConnection(
      database,
      encrypted,
      mode,
      version,
      readonly,
    );
  }

  isConnection(database: string, readonly: boolean) {
    return this.sqlite.isConnection(database, readonly);
  }

  closeConnection(database: string, readonly: boolean) {
    return this.sqlite.closeConnection(database, readonly);
  }

  deleteDatabase(database: string) {
    return CapacitorSQLite.deleteDatabase({ database, readonly: false });
  }
}

class CapacitorSqlDriver implements SqlDriver {
  constructor(
    private readonly connection: SQLiteDBConnection,
    private readonly manager: SqliteConnectionManager,
    private readonly database: string,
  ) {}

  async execute(statements: string): Promise<void> {
    await this.connection.execute(statements, true);
  }

  async run(statement: string, values: unknown[] = []): Promise<number> {
    const result = await this.connection.run(statement, values, true);
    return result.changes?.changes ?? 0;
  }

  async query<T extends Record<string, unknown>>(
    statement: string,
    values: unknown[] = [],
  ): Promise<T[]> {
    const result = await this.connection.query(statement, values);
    return (result.values ?? []) as T[];
  }

  async close(): Promise<void> {
    await this.manager.closeConnection(this.database, false);
  }
}

function databaseName(ownerId: string): string {
  if (!/^[A-Za-z0-9-]{1,128}$/.test(ownerId)) {
    throw new Error("Invalid local account id");
  }
  return `orosi_${ownerId}`;
}

function randomPassphrase(): string {
  return [...crypto.getRandomValues(new Uint8Array(32))]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export class CapacitorSqliteDatabaseFactory implements LocalDatabaseFactory {
  constructor(
    private readonly sqlite: SqliteConnectionManager = new CapacitorSqliteConnectionManager(),
  ) {}

  async open(ownerId: string): Promise<SqliteNoteRepository> {
    const name = databaseName(ownerId);
    const exists = (await this.sqlite.isDatabase(name)).result === true;
    const hasSecret = (await this.sqlite.isSecretStored()).result === true;
    if (exists && !hasSecret) {
      throw new Error(
        "Local encrypted notes cannot be opened because the encryption secret is unavailable.",
      );
    }
    if (!hasSecret) await this.sqlite.setEncryptionSecret(randomPassphrase());

    try {
      const connection = await this.sqlite.createConnection(
        name,
        true,
        "secret",
        1,
        false,
      );
      await connection.open();
      const driver = new CapacitorSqlDriver(connection, this.sqlite, name);
      await driver.execute(migration001);
      return new SqliteNoteRepository(ownerId, driver);
    } catch (error) {
      await this.closeRegisteredConnection(name);
      throw error;
    }
  }

  async destroy(ownerId: string): Promise<void> {
    const name = databaseName(ownerId);
    const isOpen =
      (await this.sqlite.isConnection(name, false)).result === true;
    if (isOpen) await this.sqlite.closeConnection(name, false);
    const exists = (await this.sqlite.isDatabase(name)).result === true;
    if (exists) await this.sqlite.deleteDatabase(name);
  }

  private async closeRegisteredConnection(name: string): Promise<void> {
    if ((await this.sqlite.isConnection(name, false)).result === true) {
      await this.sqlite.closeConnection(name, false);
    }
  }
}
