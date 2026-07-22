import type { AuthRepository } from "@/features/auth/auth";
import type { LocalDatabaseFactory } from "@/platform/database/databaseFactory";

export type PlatformKind = "android" | "ios" | "web";

export interface AppDependencies {
  auth: AuthRepository;
  databases: LocalDatabaseFactory;
  platform: PlatformKind;
  now(): string;
  newId(): string;
}
