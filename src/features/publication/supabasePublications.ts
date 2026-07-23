/* Supabase's untyped RPC/table boundary is validated by database RLS and this adapter's mapping. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-type-assertion */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { ProvenanceLink, PublicSnapshot } from "./publication";

const configSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

export interface PublicDiscovery {
  publish(snapshot: PublicSnapshot): Promise<void>;
  unpublish(publicationId: string): Promise<void>;
  search(query: string): Promise<PublicSnapshot[]>;
  get(publicationId: string, version: number): Promise<PublicSnapshot>;
  recordProvenance(
    destinationNoteId: string,
    link: ProvenanceLink,
  ): Promise<void>;
}

export class SupabasePublicDiscovery implements PublicDiscovery {
  constructor(private readonly client: SupabaseClient) {}
  async publish(snapshot: PublicSnapshot): Promise<void> {
    const { error } = await this.client.from("publications").upsert({
      id: snapshot.id,
      author_id: snapshot.authorId,
      state: "published",
      current_version: snapshot.version,
      unpublished_at: null,
    });
    if (error) throw error;
    const result = await this.client.from("publication_versions").insert({
      publication_id: snapshot.id,
      version: snapshot.version,
      author_id: snapshot.authorId,
      title: snapshot.title,
      document: snapshot.document,
      derived_text: snapshot.derivedText,
      tags: snapshot.tags,
      digest: snapshot.digest,
      published_at: snapshot.publishedAt,
    });
    if (result.error) throw result.error;
  }
  async unpublish(publicationId: string): Promise<void> {
    const { error } = await this.client
      .from("publications")
      .update({
        state: "unpublished",
        unpublished_at: new Date().toISOString(),
      })
      .eq("id", publicationId);
    if (error) throw error;
  }
  async search(query: string): Promise<PublicSnapshot[]> {
    if (!query.trim()) return [];
    const { data, error } = await this.client.rpc("search_publications", {
      query,
    });
    if (error) throw error;
    return (
      (data as unknown as Array<
        Omit<PublicSnapshot, "document" | "digest" | "publishedAt">
      >) ?? []
    ).map((row) => ({
      ...row,
      document: { type: "doc", content: [] },
      digest: "",
      publishedAt: "",
    }));
  }
  async get(publicationId: string, version: number): Promise<PublicSnapshot> {
    const { data, error } = await this.client
      .from("publication_versions")
      .select(
        "publication_id, version, author_id, title, document, derived_text, tags, digest, published_at",
      )
      .eq("publication_id", publicationId)
      .eq("version", version)
      .single();
    if (error) throw error;
    return {
      id: data.publication_id,
      version: data.version,
      authorId: data.author_id,
      title: data.title,
      document: data.document,
      derivedText: data.derived_text,
      tags: data.tags,
      digest: data.digest,
      publishedAt: data.published_at,
    } as PublicSnapshot;
  }
  async recordProvenance(
    destinationNoteId: string,
    link: ProvenanceLink,
  ): Promise<void> {
    const ownerId = (await this.client.auth.getUser()).data.user?.id;
    const { error } = await this.client
      .from("provenance_links")
      .insert({
        owner_id: ownerId,
        destination_note_id: destinationNoteId,
        publication_id: link.publicationId,
        version: link.version,
        author_id: link.authorId,
        scope: link.scope,
        digest: link.digest,
        destination_block_ids: link.destinationBlockIds,
        imported_at: link.importedAt,
      });
    if (error) throw error;
  }
}

export function createSupabasePublicDiscovery(
  environment: Record<string, unknown>,
): PublicDiscovery {
  const config = configSchema.parse(environment);
  return new SupabasePublicDiscovery(
    createClient(
      config.VITE_SUPABASE_URL,
      config.VITE_SUPABASE_PUBLISHABLE_KEY,
    ),
  );
}
