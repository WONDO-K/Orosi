import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { createSupabaseAuthRepository } from "@/features/auth/supabaseAuth";
import { IndexedDbDatabaseFactory } from "@/platform/database/indexedDbNotes";
import { CapacitorSqliteDatabaseFactory } from "@/platform/database/sqliteDriver";
import { PrivateSyncService } from "@/features/sync/privateSync";
import { createSupabasePrivateSyncRemote } from "@/features/sync/supabasePrivateSync";
import type { AppDependencies, PlatformKind } from "./dependencies";

export function createRuntimeDependencies(): AppDependencies {
  const now = () => new Date().toISOString();
  const newId = () => crypto.randomUUID();
  return {
    auth: createSupabaseAuthRepository(import.meta.env),
    databases: Capacitor.isNativePlatform()
      ? new CapacitorSqliteDatabaseFactory()
      : new IndexedDbDatabaseFactory(),
    sync: new PrivateSyncService(
      createSupabasePrivateSyncRemote(import.meta.env),
      newId,
      now,
    ),
    platform: Capacitor.getPlatform() as PlatformKind,
    now,
    newId,
  };
}

export async function attachOAuthCallback(
  dependencies: AppDependencies,
): Promise<() => Promise<void>> {
  const handle = await CapacitorApp.addListener("appUrlOpen", ({ url }) => {
    try {
      const callback = new URL(url);
      if (
        callback.protocol === "orosi:" &&
        callback.hostname === "auth" &&
        callback.pathname === "/callback" &&
        callback.port === "" &&
        callback.username === "" &&
        callback.password === ""
      ) {
        void dependencies.auth.completeOAuth(url);
      }
    } catch {
      // Ignore malformed deep links.
    }
  });
  return () => handle.remove();
}
