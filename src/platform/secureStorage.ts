import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import type { SupportedStorage } from "@supabase/supabase-js";

export interface SecureKeyValueStore extends SupportedStorage {
  clearNamespace(): Promise<void>;
}

export class CapacitorSecureKeyValueStore implements SecureKeyValueStore {
  private readonly ready = SecureStorage.setKeyPrefix("orosi_");

  async getItem(key: string): Promise<string | null> {
    await this.ready;
    return SecureStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.ready;
    await SecureStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await this.ready;
    await SecureStorage.removeItem(key);
  }

  async clearNamespace(): Promise<void> {
    await this.ready;
    await SecureStorage.clear(false);
  }
}
