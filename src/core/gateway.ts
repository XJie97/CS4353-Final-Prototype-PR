import type { Session } from "@supabase/supabase-js";
import { db } from "../lib/supabase";
export type Row = Record<string, any>;
export type Query = {
  eq?: Record<string, unknown>;
  in?: Record<string, unknown[]>;
  order?: string;
  limit?: number;
};
export interface DataGateway {
  list(table: string, query?: Query): Promise<Row[]>;
  insert(table: string, row: Row): Promise<Row>;
  update(table: string, id: string, row: Row): Promise<void>;
  remove(table: string, id: string): Promise<void>;
  rpc<T>(name: string, args?: Row): Promise<T>;
  upload(bucket: string, path: string, file: File): Promise<string>;
  removeFile(bucket: string, path: string): Promise<void>;
  signedUrl(bucket: string, path: string): Promise<string>;
  subscribe(
    table: string,
    filter: string | undefined,
    onChange: () => void,
  ): () => void;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  observeAuth(listener: (session: Session | null) => void): () => void;
}
function unwrap(result: { data: any; error: any }) {
  if (result.error) throw result.error;
  return result.data;
}
export const gateway: DataGateway = {
  async list(table, options = {}) {
    let q = db().from(table).select("*");
    for (const [k, v] of Object.entries(options.eq || {})) q = q.eq(k, v);
    for (const [k, v] of Object.entries(options.in || {})) q = q.in(k, v);
    if (options.order) q = q.order(options.order, { ascending: false });
    q = q.limit(options.limit || 1000);
    return unwrap(await q);
  },
  async insert(table, row) {
    return unwrap(await db().from(table).insert(row).select("*").single());
  },
  async update(table, id, row) {
    unwrap(await db().from(table).update(row).eq("id", id));
  },
  async remove(table, id) {
    unwrap(await db().from(table).delete().eq("id", id));
  },
  async rpc(name, args = {}) {
    return unwrap(await db().rpc(name, args));
  },
  async upload(bucket, path, file) {
    unwrap(
      await db()
        .storage.from(bucket)
        .upload(path, file, { upsert: false, contentType: file.type }),
    );
    return path;
  },
  async removeFile(bucket, path) {
    unwrap(await db().storage.from(bucket).remove([path]));
  },
  async signedUrl(bucket, path) {
    return unwrap(await db().storage.from(bucket).createSignedUrl(path, 600))
      .signedUrl;
  },
  subscribe(table, filter, onChange) {
    const client = db();
    let active = true;
    const channel = client
      .channel(`${table}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
        onChange,
      );
    // Finish applying the current session before joining, including after login.
    void client.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active || !data.session) return;
        await client.realtime.setAuth(data.session.access_token);
        if (!active) return;
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED" && active) onChange();
        });
      })
      .catch(() => {
        if (active) onChange();
      });
    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  },
  async signIn(email, password) {
    const { error } = await db().auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  async signOut() {
    const { error } = await db().auth.signOut();
    if (error) throw error;
  },
  observeAuth(listener) {
    const { data } = db().auth.onAuthStateChange((_e, s) => listener(s));
    return () => data.subscription.unsubscribe();
  },
};
