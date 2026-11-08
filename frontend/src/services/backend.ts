/** 
 * If a local-only preview (src/local-preview/, git-ignored, never pushed) exists on
 * this machine and is switched on, it's used instead; otherwise this is Supabase-only.
 */
import { createClient } from '@supabase/supabase-js';
import type { Command } from '../app/domain';
import { tabAuthOptions } from './auth.ts';
import type { ComponentType } from 'react';
import { configured as supabaseConfigured, makeDemoServices, type DemoServices } from './demo';

/** A local preview provides: its backend, the account it starts signed in as, a strip for the app shell, and the "About" wording. */
export interface LocalPreview {
  backend: DemoServices;
  account(): string | null;
  Strip: ComponentType<{ onSwitch: () => void }>;
  about: string;
}
// import.meta.glob matches nothing when the folder is absent, so builds without it still work.
const previewModules = import.meta.glob<{ default: LocalPreview | null }>('../local-preview/index.ts', { eager: true });
/** The local preview when it exists and is switched on, otherwise null. */
export const localPreview: LocalPreview | null = Object.values(previewModules)[0]?.default ?? null;

/**
 * The connected demo, plus avatar saving. upstream's demo_command has no avatar
 * command, so `update-sprite` goes to its own RPC, demo_update_sprite (migration
 * 20261107000400). Everything else is passed straight through to services/demo.ts.
 * Built from our own client (one per tab, same auth settings as services()) so the
 * RPC shares the signed-in session.
 */
export function withAvatarApi(base: DemoServices, rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>): DemoServices {
  return {
    ...base,
    async execute(command: Command, requestId: string, revision: number | null) {
      if (command.type !== 'update-sprite') return base.execute(command, requestId, revision);
      const { error } = await rpc('demo_update_sprite', {
        sprite: { colour: command.colour, face: command.face, ...(command.face === 'drawn' ? { strokes: command.strokes } : {}) },
        request_id: requestId,
      });
      if (error) throw new Error(error.message);
    },
  };
}

function connected(): DemoServices | undefined {
  // Not configured: return nothing so AppProvider shows upstream's "Demo setup required" screen.
  if (!supabaseConfigured) return undefined;
  const client = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    { auth: tabAuthOptions(typeof window === 'undefined' ? undefined : window.sessionStorage) });
  return withAvatarApi(makeDemoServices(client), (fn, args) => client.rpc(fn, args));
}

let chosen: DemoServices | undefined;
let made = false;
/** The backend for this build, made once. Passed to <AppProvider backend={...}> in App.tsx. */
export function appBackend(): DemoServices | undefined {
  if (!made) { chosen = localPreview?.backend ?? connected(); made = true; }
  return chosen;
}
