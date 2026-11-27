import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentId, ScopedThreadRef, ThreadId } from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import { useSyncExternalStore } from "react";

import { DraftId } from "../../composerDraftStore";
import { getLocalStorageItem, setLocalStorageItem } from "../../hooks/useLocalStorage";
import type { ThreadRouteTarget } from "../../threadRoutes";

// Kept across reloads so the board's Resume button still knows where you were.
const LAST_STAGE_KEY = "t3code:board:last-stage";
const StoredStage = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("server"),
    environmentId: Schema.String,
    threadId: Schema.String,
  }),
  Schema.Struct({ kind: Schema.Literal("draft"), draftId: Schema.String }),
]);

/**
 * What the board remembers about the stage beside the rail: the last thread or draft that had
 * it (for the board's Resume button), and the card a just-sent new thread became (highlighted
 * once when the board shows it). Module state, so it survives the board and the rail swapping.
 */
let lastStage: ThreadRouteTarget | null = readStoredStage();
let arrivingKey: string | null = null;
const listeners = new Set<() => void>();

export function rememberStage(target: ThreadRouteTarget) {
  if (sameTarget(lastStage, target)) return;
  lastStage = target;
  try {
    setLocalStorageItem(
      LAST_STAGE_KEY,
      target.kind === "server"
        ? {
            kind: "server" as const,
            environmentId: target.threadRef.environmentId,
            threadId: target.threadRef.threadId,
          }
        : { kind: "draft" as const, draftId: target.draftId },
      StoredStage,
    );
  } catch {
    // Storage can be unavailable (private windows); Resume then lasts for this session only.
  }
  for (const listener of listeners) listener();
}

function readStoredStage(): ThreadRouteTarget | null {
  try {
    const stored = getLocalStorageItem(LAST_STAGE_KEY, StoredStage);
    if (stored === null) return null;
    return stored.kind === "server"
      ? {
          kind: "server",
          threadRef: scopeThreadRef(
            stored.environmentId as EnvironmentId,
            stored.threadId as ThreadId,
          ),
        }
      : { kind: "draft", draftId: DraftId.make(stored.draftId) };
  } catch {
    return null;
  }
}

export function useLastStage(): ThreadRouteTarget | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => lastStage,
  );
}

export function markArriving(threadRef: ScopedThreadRef) {
  arrivingKey = scopedThreadKey(threadRef);
}

/** True once for the card a new thread became; later calls return false. */
export function takeArriving(key: string): boolean {
  if (arrivingKey !== key) return false;
  arrivingKey = null;
  return true;
}

function sameTarget(a: ThreadRouteTarget | null, b: ThreadRouteTarget) {
  if (a === null || a.kind !== b.kind) return false;
  return a.kind === "server" && b.kind === "server"
    ? scopedThreadKey(a.threadRef) === scopedThreadKey(b.threadRef)
    : a.kind === "draft" && b.kind === "draft" && a.draftId === b.draftId;
}
