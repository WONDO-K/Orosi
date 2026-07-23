import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { PrivateNote } from "@/features/notes/note";
import { CapacitorSecureKeyValueStore } from "@/platform/secureStorage";
import type { PrivateSyncRemote, RemoteSyncResult } from "./privateSync";

const configSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

interface RpcResult {
  status: "acknowledged" | "conflict";
  revision?: number;
  note?: PrivateNote;
}

export class SupabasePrivateSyncRemote implements PrivateSyncRemote {
  constructor(private readonly client: SupabaseClient) {}

  async pull(ownerId: string): Promise<PrivateNote[]> {
    const response = await this.client
      .from("private_notes")
      .select("payload, revision")
      .eq("owner_id", ownerId);
    if (response.error) throw response.error;
    const rows =
      (response.data as unknown as Array<{
        payload: unknown;
        revision: number;
      }> | null) ?? [];
    return rows.flatMap((row) => {
      const note = row.payload as PrivateNote;
      return note.ownerId === ownerId
        ? [
            {
              ...note,
              baseRevision: row.revision,
              syncState: "synced" as const,
            },
          ]
        : [];
    });
  }

  async push(input: {
    ownerId: string;
    note: PrivateNote;
    idempotencyKey: string;
  }): Promise<RemoteSyncResult> {
    const response = await this.client.rpc("sync_private_note", {
      input_note: input.note,
      input_base_revision: input.note.baseRevision,
      input_idempotency_key: input.idempotencyKey,
    });
    if (response.error) throw response.error;
    const result = response.data as unknown as RpcResult;
    if (
      result.status === "acknowledged" &&
      typeof result.revision === "number"
    ) {
      return { status: "acknowledged", revision: result.revision };
    }
    if (
      result.status === "conflict" &&
      result.note?.ownerId === input.ownerId
    ) {
      return { status: "conflict", note: result.note };
    }
    throw new Error("Invalid private-note synchronization response");
  }
}

export function createSupabasePrivateSyncRemote(
  environment: Record<string, unknown>,
): PrivateSyncRemote {
  const config = configSchema.parse(environment);
  const client = createClient(
    config.VITE_SUPABASE_URL,
    config.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        storage: new CapacitorSecureKeyValueStore(),
      },
    },
  );
  return new SupabasePrivateSyncRemote(client);
}
