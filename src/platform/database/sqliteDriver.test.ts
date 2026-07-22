import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import {
  CapacitorSqliteDatabaseFactory,
  type SqliteConnectionManager,
} from "./sqliteDriver";

class RecordingConnection {
  constructor(private readonly openError?: Error) {}

  open(): Promise<void> {
    return this.openError ? Promise.reject(this.openError) : Promise.resolve();
  }

  execute(): Promise<{ changes?: { changes?: number } }> {
    return Promise.resolve({});
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
  readonly registered = new Set<string>();
  databaseExists = false;
  secretStored = true;
  nextOpenError?: Error;
  private pauseNextCreate = false;
  private resumeCreate?: () => void;
  private createdPaused: () => void = () => undefined;
  private readonly createPaused = new Promise<void>((resolve) => {
    this.createdPaused = resolve;
  });

  isDatabase(): Promise<{ result?: boolean }> {
    return Promise.resolve({ result: this.databaseExists });
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
    if (this.pauseNextCreate) {
      this.pauseNextCreate = false;
      this.createdPaused();
      await new Promise<void>((resolve) => {
        this.resumeCreate = resolve;
      });
    }
    const connection = new RecordingConnection(this.nextOpenError);
    this.nextOpenError = undefined;
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

  isConnection(database: string): Promise<{ result?: boolean }> {
    return Promise.resolve({ result: this.registered.has(database) });
  }

  closeConnection(database: string): Promise<void> {
    this.closed.push(database);
    this.registered.delete(database);
    return Promise.resolve();
  }

  deleteDatabase(database: string): Promise<void> {
    this.deleted.push(database);
    return Promise.resolve();
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

  it("uses different database names and destroy targets for distinct valid owners", async () => {
    const manager = new RecordingManager();
    manager.databaseExists = true;
    const factory = new CapacitorSqliteDatabaseFactory(manager);

    await factory.open("user-a");
    await factory.open("usera");
    await factory.destroy("user-a");
    await factory.destroy("usera");

    expect(manager.created).toEqual(["orosi_user-a", "orosi_usera"]);
    expect(manager.deleted).toEqual(["orosi_user-a", "orosi_usera"]);
  });
});
