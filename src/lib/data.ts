import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "./supabase";
import type {
  Chat,
  Friendship,
  Item,
  ItemImage,
  Loan,
  Location,
  Profile,
  Sprite,
} from "./model";

export type Data = {
  profiles: Profile[];
  items: Item[];
  loans: Loan[];
  friends: Friendship[];
  chats: Chat[];
  locations: Location[];
  sprites: Sprite[];
  images: ItemImage[];
};
const empty = (): Data => ({
  profiles: [],
  items: [],
  loans: [],
  friends: [],
  chats: [],
  locations: [],
  sprites: [],
  images: [],
});
const tables = {
  profiles: "profiles",
  items: "item_catalog",
  loans: "loan_catalog",
  friends: "friendships",
  chats: "chats",
  locations: "item_locations",
  sprites: "sprites",
  images: "item_images",
} as const;

export function useData(userId?: string) {
  const [data, setData] = useState<Data>(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    if (!userId) {
      setData(empty());
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    try {
      const entries = await Promise.all(
        Object.entries(tables).map(async ([key, table]) => {
          const result = await db().from(table).select("*");
          if (result.error) throw result.error;
          return [key, result.data] as const;
        }),
      );
      if (generation.current === request) {
        setData(Object.fromEntries(entries) as Data);
        setError("");
      }
    } catch (e) {
      if (generation.current === request)
        setError((e as Error).message || "Could not load your shelf.");
    } finally {
      if (generation.current === request) setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    setData(empty());
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  return { ...data, loading, error, reload };
}

export async function uploadImage(bucket: string, path: string, file: File) {
  const result = await db()
    .storage.from(bucket)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (result.error) throw result.error;
  return path;
}

type ResultError = { message: string; code?: string } | null;
export function check<T>(result: { data: T; error: ResultError }): T;
export function check(result: { error: ResultError }): void;
export function check(result: { data?: unknown; error: ResultError }) {
  if (result.error) throw result.error;
  return result.data;
}
