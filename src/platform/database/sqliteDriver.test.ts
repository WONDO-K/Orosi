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
  readonly closed: string[] = [];
  readonly deleted: string[] = [];
  readonly databases = new Set<string>();
  readonly lifecycleEvents: string[] = [];
  readonly registered = new Set<string>();
  secretStored = true;
  nextOpenError?: Error;
  nextExecuteError?: Error;
  private pauseNextCreate = false;
  private pauseNextDelete = false;
  private resumeCreate?: () => void;
  private resumeDelete?: () => void;
  private createdPaused: () => void = () => undefined;
  private readonly createPaused = new Promise<void>((resolve) => {
    this.createdPaused = resolve;
  });
  private deletedPaused: () => void = () => undefined;
  private readonly deletePaused = new Promise<void>((resolve) => {
    this.deletedPaused = resolve;
  });

  isDatabase(database: string): Promise<{ result?: boolean }> {
    return Promise.resolve({ result: this.databases.has(database) });
  }

  isSecretStored(): Promise<{ result?: boolean }> {
    return Promise.resolve({ result: this.secretStored });
  }

  setEncryptionSecret(): Promise<void> {
    return Promise.resolve();
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

  isConnection(database: string): Promise<{ result?: boolean }> {
    return Promise.resolve({ result: this.registered.has(database) });
  }

  closeConnection(database: string): Promise<void> {
    this.closed.push(database);
    this.registered.delete(database);
    this.lifecycleEvents.push(`closed:${database}`);
    return Promise.resolve();
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

describe("CapacitorSqliteDatabaseFactory", () => {
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
