import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import {
  CapacitorSqliteDatabaseFactory,
  type SqliteConnectionManager,
} from "./sqliteDriver";

class RecordingConnection {
  constructor(
    private readonly openError?: Error,
    private readonly executeError?: Error,
    private readonly onOpen: () => void = () => undefined,
  ) {}

  open(): Promise<void> {
    if (this.openError) return Promise.reject(this.openError);
    this.onOpen();
    return Promise.resolve();
  }

  execute(): Promise<{ changes?: { changes?: number } }> {
    return this.executeError
      ? Promise.reject(this.executeError)
      : Promise.resolve({});
  }

  run(): Promise<{ changes?: { changes?: number } }> {
    return Promise.resolve({});
  }

  query(): Promise<{ values?: Record<string, unknown>[] }> {
    return Promise.resolve({ values: [] });
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

class RecordingManager implements SqliteConnectionManager {
  readonly created: string[] = [];
  readonly closeAttempts: string[] = [];
  readonly closed: string[] = [];
  readonly deleted: string[] = [];
  readonly databases = new Set<string>();
  readonly storedSecrets: string[] = [];
  readonly lifecycleEvents: string[] = [];
  readonly registered = new Set<string>();
  secretStored = true;
  databaseListError?: Error;
  nextCloseError?: Error;
  nextOpenError?: Error;
  nextExecuteError?: Error;
  private pauseNextClose = false;
  private pauseNextCreate = false;
  private pauseNextDelete = false;
  private pauseNextSecretSet = false;
  private resumeClose?: () => void;
  private resumeCreate?: () => void;
  private resumeDelete?: () => void;
  private resumeSecretSet?: () => void;
  private closePaused: () => void = () => undefined;
  private readonly pausedClose = new Promise<void>((resolve) => {
    this.closePaused = resolve;
  });
  private createdPaused: () => void = () => undefined;
  private readonly createPaused = new Promise<void>((resolve) => {
    this.createdPaused = resolve;
  });
  private deletedPaused: () => void = () => undefined;
  private readonly deletePaused = new Promise<void>((resolve) => {
    this.deletedPaused = resolve;
  });
  private secretSetPaused: () => void = () => undefined;
  private readonly pausedSecretSet = new Promise<void>((resolve) => {
    this.secretSetPaused = resolve;
  });

  isDatabase(database: string): Promise<{ result?: boolean }> {
    return Promise.resolve({ result: this.databases.has(database) });
  }

  isSecretStored(): Promise<{ result?: boolean }> {
    return Promise.resolve({ result: this.secretStored });
  }

  async setEncryptionSecret(passphrase: string): Promise<void> {
    this.storedSecrets.push(passphrase);
    if (this.pauseNextSecretSet) {
      this.pauseNextSecretSet = false;
      this.secretSetPaused();
      await new Promise<void>((resolve) => {
        this.resumeSecretSet = resolve;
      });
    }
    this.secretStored = true;
  }

  getDatabaseList(): Promise<{ values?: unknown[] }> {
    if (this.databaseListError) {
      return Promise.reject(this.databaseListError);
    }
    return Promise.resolve({
      values: [...this.databases].map((name) => `${name}SQLite.db`),
    });
  }

  pauseBeforeNextSecretSet(): void {
    this.pauseNextSecretSet = true;
  }

  waitForPausedSecretSet(): Promise<void> {
    return this.pausedSecretSet;
  }

  resumePausedSecretSet(): void {
    this.resumeSecretSet?.();
  }

  async createConnection(database: string): Promise<SQLiteDBConnection> {
    if (this.registered.has(database)) {
      throw new Error("Connection already registered");
    }
    this.created.push(database);
    this.registered.add(database);
    this.lifecycleEvents.push(`registered:${database}`);
    if (this.pauseNextCreate) {
      this.pauseNextCreate = false;
      this.createdPaused();
      await new Promise<void>((resolve) => {
        this.resumeCreate = resolve;
      });
    }
    const connection = new RecordingConnection(
      this.nextOpenError,
      this.nextExecuteError,
      () => {
        this.databases.add(database);
        this.lifecycleEvents.push(`opened:${database}`);
      },
    );
    this.nextOpenError = undefined;
    this.nextExecuteError = undefined;
    return connection as unknown as SQLiteDBConnection;
  }

  pauseAfterNextRegistration(): void {
    this.pauseNextCreate = true;
  }

  waitForPausedCreate(): Promise<void> {
    return this.createPaused;
  }

  resumePausedCreate(): void {
    this.resumeCreate?.();
  }

  pauseBeforeNextDelete(): void {
    this.pauseNextDelete = true;
  }

  waitForPausedDelete(): Promise<void> {
    return this.deletePaused;
  }

  resumePausedDelete(): void {
    this.resumeDelete?.();
  }

  pauseBeforeNextClose(): void {
    this.pauseNextClose = true;
  }

  waitForPausedClose(): Promise<void> {
    return this.pausedClose;
  }

  resumePausedClose(): void {
    this.resumeClose?.();
  }

  isConnection(database: string): Promise<{ result?: boolean }> {
    return Promise.resolve({ result: this.registered.has(database) });
  }

  async closeConnection(database: string): Promise<void> {
    this.closeAttempts.push(database);
    if (this.pauseNextClose) {
      this.pauseNextClose = false;
      this.closePaused();
      await new Promise<void>((resolve) => {
        this.resumeClose = resolve;
      });
    }
    if (this.nextCloseError) {
      const error = this.nextCloseError;
      this.nextCloseError = undefined;
      throw error;
    }
    this.closed.push(database);
    this.registered.delete(database);
    this.lifecycleEvents.push(`closed:${database}`);
  }

  async deleteDatabase(database: string): Promise<void> {
    if (this.pauseNextDelete) {
      this.pauseNextDelete = false;
      this.deletedPaused();
      await new Promise<void>((resolve) => {
        this.resumeDelete = resolve;
      });
    }
    this.deleted.push(database);
    this.databases.delete(database);
    this.lifecycleEvents.push(`deleted:${database}`);
  }
}

async function flushMicrotasks(): Promise<void> {
  for (let index = 0; index < 10; index += 1) {
    await Promise.resolve();
  }
}

describe("CapacitorSqliteDatabaseFactory", () => {
  it("sets the app-global encryption secret once for concurrent different-owner opens", async () => {
    const manager = new RecordingManager();
    manager.secretStored = false;
    manager.databaseListError = new Error(
      "getDatabaseList: No databases available ",
    );
    manager.pauseBeforeNextSecretSet();
    const factory = new CapacitorSqliteDatabaseFactory(manager);

    const firstOpening = factory.open("user-a");
    await manager.waitForPausedSecretSet();
    const secondOpening = factory.open("user-b");
    await flushMicrotasks();

    manager.resumePausedSecretSet();
    await Promise.all([firstOpening, secondOpening]);

    expect(manager.storedSecrets).toHaveLength(1);
    expect(manager.created).toEqual(["orosi_user-a", "orosi_user-b"]);
  });

  it("fails closed when any Orosi database exists without the app-global secret", async () => {
    const manager = new RecordingManager();
    manager.secretStored = false;
    manager.databases.add("orosi_user-a");
    const factory = new CapacitorSqliteDatabaseFactory(manager);

    await expect(factory.open("user-b")).rejects.toThrow(
      "encryption secret is unavailable",
    );

    expect(manager.storedSecrets).toEqual([]);
    expect(manager.created).toEqual([]);
  });

  it("propagates unrelated database-list errors without setting a secret", async () => {
    const manager = new RecordingManager();
    manager.secretStored = false;
    manager.databaseListError = new Error("database list permission denied");
    const factory = new CapacitorSqliteDatabaseFactory(manager);

    await expect(factory.open("user-a")).rejects.toThrow(
      "database list permission denied",
    );

    expect(manager.storedSecrets).toEqual([]);
    expect(manager.created).toEqual([]);
  });

  it("removes the manager registration when a repository closes so it can reopen", async () => {
    const manager = new RecordingManager();
    const factory = new CapacitorSqliteDatabaseFactory(manager);

    const first = await factory.open("user-a");
    await first.close();
    await expect(factory.open("user-a")).resolves.toBeDefined();

    expect(manager.closed).toEqual(["orosi_user-a"]);
  });

  it("cleans up a registered connection when opening fails", async () => {
    const manager = new RecordingManager();
    manager.nextOpenError = new Error("open failed");
    const factory = new CapacitorSqliteDatabaseFactory(manager);

    await expect(factory.open("user-a")).rejects.toThrow("open failed");

    expect(manager.closed).toEqual(["orosi_user-a"]);
    expect(manager.registered).toEqual(new Set());
  });

  it("retries a failed final lease close", async () => {
    const manager = new RecordingManager();
    const factory = new CapacitorSqliteDatabaseFactory(manager);
    const repository = await factory.open("user-a");
    manager.nextCloseError = new Error("close failed");

    await expect(repository.close()).rejects.toThrow("close failed");
    await expect(repository.close()).resolves.toBeUndefined();

    expect(manager.closeAttempts).toEqual(["orosi_user-a", "orosi_user-a"]);
    expect(manager.closed).toEqual(["orosi_user-a"]);
    expect(manager.registered).toEqual(new Set());
  });

  it("continues authoritative destroy cleanup after a pending close fails", async () => {
    const manager = new RecordingManager();
    const factory = new CapacitorSqliteDatabaseFactory(manager);
    const repository = await factory.open("user-a");
    manager.nextCloseError = new Error("close failed");
    manager.pauseBeforeNextClose();

    const closing = repository.close();
    await manager.waitForPausedClose();
    const destroying = factory.destroy("user-a");
    const closeResult = expect(closing).rejects.toThrow("close failed");
    const destroyResult = expect(destroying).resolves.toBeUndefined();

    manager.resumePausedClose();

    await closeResult;
    await destroyResult;
    expect(manager.closeAttempts).toEqual(["orosi_user-a", "orosi_user-a"]);
    expect(manager.closed).toEqual(["orosi_user-a"]);
    expect(manager.deleted).toEqual(["orosi_user-a"]);
    expect(manager.registered).toEqual(new Set());
    expect(manager.databases).toEqual(new Set());
  });

  it("cleans up its registered connection when migration execution fails", async () => {
    const manager = new RecordingManager();
    manager.nextExecuteError = new Error("migration failed");
    const factory = new CapacitorSqliteDatabaseFactory(manager);

    await expect(factory.open("user-a")).rejects.toThrow("migration failed");

    expect(manager.closed).toEqual(["orosi_user-a"]);
    expect(manager.registered).toEqual(new Set());
  });

  it("shares a live connection between concurrent leases until the final close", async () => {
    const manager = new RecordingManager();
    manager.pauseAfterNextRegistration();
    const factory = new CapacitorSqliteDatabaseFactory(manager);

    const firstOpening = factory.open("user-a");
    await manager.waitForPausedCreate();
    const secondOpening = factory.open("user-a");

    manager.resumePausedCreate();
    const [first, second] = await Promise.all([firstOpening, secondOpening]);

    expect(manager.created).toEqual(["orosi_user-a"]);
    expect(manager.registered).toEqual(new Set(["orosi_user-a"]));

    await first.close();

    expect(manager.closed).toEqual([]);
    expect(manager.registered).toEqual(new Set(["orosi_user-a"]));

    await second.close();

    expect(manager.closed).toEqual(["orosi_user-a"]);
    expect(manager.registered).toEqual(new Set());
  });

  it("waits for an in-flight open and invalidates it before deleting the database", async () => {
    const manager = new RecordingManager();
    manager.pauseAfterNextRegistration();
    const factory = new CapacitorSqliteDatabaseFactory(manager);

    const opening = factory.open("user-a");
    await manager.waitForPausedCreate();
    const destroying = factory.destroy("user-a");

    manager.resumePausedCreate();

    await expect(opening).rejects.toThrow("destroyed while opening");
    await expect(destroying).resolves.toBeUndefined();
    expect(manager.lifecycleEvents).toEqual([
      "registered:orosi_user-a",
      "opened:orosi_user-a",
      "closed:orosi_user-a",
      "deleted:orosi_user-a",
    ]);
    expect(manager.registered).toEqual(new Set());
    expect(manager.databases).toEqual(new Set());
  });

  it("does not let a new open slip through an active destroy", async () => {
    const manager = new RecordingManager();
    const factory = new CapacitorSqliteDatabaseFactory(manager);
    await factory.open("user-a");
    manager.pauseBeforeNextDelete();

    const destroying = factory.destroy("user-a");
    await manager.waitForPausedDelete();
    const reopening = factory.open("user-a");

    manager.resumePausedDelete();

    await expect(destroying).resolves.toBeUndefined();
    await expect(reopening).resolves.toBeDefined();
    expect(manager.lifecycleEvents).toEqual([
      "registered:orosi_user-a",
      "opened:orosi_user-a",
      "closed:orosi_user-a",
      "deleted:orosi_user-a",
      "registered:orosi_user-a",
      "opened:orosi_user-a",
    ]);
  });

  it("uses different database names and destroy targets for distinct valid owners", async () => {
    const manager = new RecordingManager();
    manager.databases.add("orosi_user-a");
    manager.databases.add("orosi_usera");
    const factory = new CapacitorSqliteDatabaseFactory(manager);

    await factory.open("user-a");
    await factory.open("usera");
    await factory.destroy("user-a");
    await factory.destroy("usera");

    expect(manager.created).toEqual(["orosi_user-a", "orosi_usera"]);
    expect(manager.deleted).toEqual(["orosi_user-a", "orosi_usera"]);
  });
});
