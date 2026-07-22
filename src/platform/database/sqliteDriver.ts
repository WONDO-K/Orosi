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

class CapacitorSqlDriver implements SqlDriver {
  constructor(private readonly connection: SQLiteDBConnection) {}

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
    await this.connection.close();
  }
}

function databaseName(ownerId: string): string {
  if (!/^[A-Za-z0-9-]{1,128}$/.test(ownerId)) {
    throw new Error("Invalid local account id");
  }
  return `orosi_${ownerId.replaceAll("-", "")}`;
}

function randomPassphrase(): string {
  return [...crypto.getRandomValues(new Uint8Array(32))]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export class CapacitorSqliteDatabaseFactory implements LocalDatabaseFactory {
  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);

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

    const connection = await this.sqlite.createConnection(
      name,
      true,
      "secret",
      1,
      false,
    );
    await connection.open();
    const driver = new CapacitorSqlDriver(connection);
    await driver.execute(migration001);
    return new SqliteNoteRepository(ownerId, driver);
  }

  async destroy(ownerId: string): Promise<void> {
    const name = databaseName(ownerId);
    const isOpen =
      (await this.sqlite.isConnection(name, false)).result === true;
    if (isOpen) await this.sqlite.closeConnection(name, false);
    const exists = (await this.sqlite.isDatabase(name)).result === true;
    if (exists) {
      await CapacitorSQLite.deleteDatabase({ database: name, readonly: false });
    }
  }
}
