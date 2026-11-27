import { scopedThreadKey } from "@t3tools/client-runtime/environment";
import type { ScopedThreadRef } from "@t3tools/contracts";
import { useSyncExternalStore } from "react";

import type { ThreadRouteTarget } from "../../threadRoutes";

/**
 * What the board remembers about the stage beside the rail: the last thread or draft that had
 * it (for the board's "back" button), and the card a just-sent new thread became (highlighted
 * once when the board shows it). Module state, so it survives the board and the rail swapping.
 */
let lastStage: ThreadRouteTarget | null = null;
let arrivingKey: string | null = null;
const listeners = new Set<() => void>();

export function rememberStage(target: ThreadRouteTarget) {
  if (sameTarget(lastStage, target)) return;
  lastStage = target;
  for (const listener of listeners) listener();
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
