import type { AuthRepository } from "@/features/auth/auth";
import type { LocalDatabaseFactory } from "@/platform/database/databaseFactory";
import type { PrivateSyncService } from "@/features/sync/privateSync";

export type PlatformKind = "android" | "ios" | "web";

export interface AppDependencies {
  auth: AuthRepository;
  databases: LocalDatabaseFactory;
  sync?: PrivateSyncService;
  platform: PlatformKind;
  now(): string;
  newId(): string;
}
