import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { createSupabaseAuthRepository } from "@/features/auth/supabaseAuth";
import { IndexedDbDatabaseFactory } from "@/platform/database/indexedDbNotes";
import type { AppDependencies, PlatformKind } from "./dependencies";

export function createRuntimeDependencies(): AppDependencies {
  return {
    auth: createSupabaseAuthRepository(import.meta.env),
    databases: new IndexedDbDatabaseFactory(),
    platform: Capacitor.getPlatform() as PlatformKind,
    now: () => new Date().toISOString(),
    newId: () => crypto.randomUUID(),
  };
}

export async function attachOAuthCallback(
  dependencies: AppDependencies,
): Promise<() => Promise<void>> {
  const handle = await CapacitorApp.addListener("appUrlOpen", ({ url }) => {
    if (url.startsWith("orosi://auth/callback"))
      void dependencies.auth.completeOAuth(url);
  });
  return () => handle.remove();
}
