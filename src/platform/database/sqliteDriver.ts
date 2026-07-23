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

class LeasedSqlDriver implements SqlDriver {
  private closed = false;

  constructor(
    private readonly shared: SqlDriver,
    private readonly release: () => Promise<void>,
  ) {}

  execute(statements: string): Promise<void> {
    return this.shared.execute(statements);
  }

  run(statement: string, values?: unknown[]): Promise<number> {
    return this.shared.run(statement, values);
  }

  query<T extends Record<string, unknown>>(
    statement: string,
    values?: unknown[],
  ): Promise<T[]> {
    return this.shared.query<T>(statement, values);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.release();
  }
}

interface SharedConnection {
  driver: SqlDriver;
  leases: number;
  closePromise?: Promise<void>;
}

interface DatabaseLifecycle {
  generation: number;
  connection?: SharedConnection;
  pendingConnection?: Promise<SharedConnection>;
  destroyPromise?: Promise<void>;
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
  private readonly lifecycles = new Map<string, DatabaseLifecycle>();

  constructor(
    private readonly sqlite: SqliteConnectionManager = new CapacitorSqliteConnectionManager(),
  ) {}

  async open(ownerId: string): Promise<SqliteNoteRepository> {
    const name = databaseName(ownerId);
    const { generation, lifecycle, shared } =
      await this.acquireConnection(name);
    if (lifecycle.generation !== generation || lifecycle.destroyPromise) {
      throw new Error("Local database was destroyed while opening.");
    }
    shared.leases += 1;
    return new SqliteNoteRepository(
      ownerId,
      new LeasedSqlDriver(shared.driver, () =>
        this.releaseConnection(lifecycle, shared),
      ),
    );
  }

  async destroy(ownerId: string): Promise<void> {
    const name = databaseName(ownerId);
    const lifecycle = this.getLifecycle(name);
    if (lifecycle.destroyPromise) {
      await lifecycle.destroyPromise;
      return;
    }

    lifecycle.generation += 1;
    const destroying = this.destroyLifecycle(name, lifecycle);
    lifecycle.destroyPromise = destroying;
    try {
      await destroying;
    } finally {
      if (lifecycle.destroyPromise === destroying) {
        lifecycle.destroyPromise = undefined;
      }
    }
  }

  private getLifecycle(name: string): DatabaseLifecycle {
    let lifecycle = this.lifecycles.get(name);
    if (!lifecycle) {
      lifecycle = { generation: 0 };
      this.lifecycles.set(name, lifecycle);
    }
    return lifecycle;
  }

  private async destroyLifecycle(
    name: string,
    lifecycle: DatabaseLifecycle,
  ): Promise<void> {
    const pending = lifecycle.pendingConnection;
    if (pending) {
      try {
        await pending;
      } catch {
        // Initialization owns cleanup for any connection it registered.
      }
    }

    const shared = lifecycle.connection;
    lifecycle.connection = undefined;
    if (shared?.closePromise) await shared.closePromise;

    const isOpen =
      (await this.sqlite.isConnection(name, false)).result === true;
    if (isOpen) await this.sqlite.closeConnection(name, false);
    const exists = (await this.sqlite.isDatabase(name)).result === true;
    if (exists) await this.sqlite.deleteDatabase(name);
  }

  private async acquireConnection(name: string): Promise<{
    generation: number;
    lifecycle: DatabaseLifecycle;
    shared: SharedConnection;
  }> {
    while (true) {
      const lifecycle = this.getLifecycle(name);
      if (lifecycle.destroyPromise) {
        await lifecycle.destroyPromise;
        continue;
      }

      const generation = lifecycle.generation;
      const existing = lifecycle.connection;
      if (existing) {
        if (existing.closePromise) {
          await existing.closePromise;
          continue;
        }
        return { generation, lifecycle, shared: existing };
      }

      let opening = lifecycle.pendingConnection;
      if (!opening) {
        opening = this.createConnection(name, lifecycle);
        lifecycle.pendingConnection = opening;
        void opening.then(
          () => {
            if (lifecycle.pendingConnection === opening) {
              lifecycle.pendingConnection = undefined;
            }
          },
          () => {
            if (lifecycle.pendingConnection === opening) {
              lifecycle.pendingConnection = undefined;
            }
          },
        );
      }

      const shared = await opening;
      if (lifecycle.generation !== generation || lifecycle.destroyPromise) {
        throw new Error("Local database was destroyed while opening.");
      }
      return { generation, lifecycle, shared };
    }
  }

  private async createConnection(
    name: string,
    lifecycle: DatabaseLifecycle,
  ): Promise<SharedConnection> {
    const exists = (await this.sqlite.isDatabase(name)).result === true;
    const hasSecret = (await this.sqlite.isSecretStored()).result === true;
    if (exists && !hasSecret) {
      throw new Error(
        "Local encrypted notes cannot be opened because the encryption secret is unavailable.",
      );
    }
    if (!hasSecret) await this.sqlite.setEncryptionSecret(randomPassphrase());

    let ownsConnection = false;
    try {
      const connection = await this.sqlite.createConnection(
        name,
        true,
        "secret",
        1,
        false,
      );
      ownsConnection = true;
      await connection.open();
      const driver = new CapacitorSqlDriver(connection, this.sqlite, name);
      await driver.execute(migration001);
      const shared = { driver, leases: 0 };
      lifecycle.connection = shared;
      return shared;
    } catch (error) {
      if (ownsConnection) await this.sqlite.closeConnection(name, false);
      throw error;
    }
  }

  private async releaseConnection(
    lifecycle: DatabaseLifecycle,
    shared: SharedConnection,
  ): Promise<void> {
    if (lifecycle.connection !== shared || shared.leases === 0) return;

    shared.leases -= 1;
    if (shared.leases > 0) return;

    shared.closePromise = shared.driver.close();
    try {
      await shared.closePromise;
    } finally {
      if (lifecycle.connection === shared) {
        lifecycle.connection = undefined;
      }
    }
  }
}
