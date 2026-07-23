import type { AuthRepository } from "@/features/auth/auth";
import type { LocalDatabaseFactory } from "@/platform/database/databaseFactory";
import type { PrivateSyncService } from "@/features/sync/privateSync";
import type { PublicDiscovery } from "@/features/publication/supabasePublications";

export type PlatformKind = "android" | "ios" | "web";

export interface AppDependencies {
  auth: AuthRepository;
  databases: LocalDatabaseFactory;
  sync?: PrivateSyncService;
  discovery?: PublicDiscovery;
  platform: PlatformKind;
  now(): string;
  newId(): string;
}
