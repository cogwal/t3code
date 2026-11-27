import { effectiveSnoozed } from "@t3tools/client-runtime/state/thread-settled";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";

import { useDelegatedUnderParent, useQuietThreadShells } from "../../state/entities";
import { filterSidebarV2VisibleThreads, useSnoozeWakeClock } from "../Sidebar.logic";
import { resolveBoardCard, type BoardCard } from "./threadBoard.logic";

export interface BoardThreads {
  readonly cards: ReadonlyArray<BoardCard>;
  /** Off the board until they wake, soonest first. */
  readonly snoozed: ReadonlyArray<EnvironmentThreadShell>;
  /** Off the board for good (until reopened), most recently settled first. */
  readonly settled: ReadonlyArray<EnvironmentThreadShell>;
}

/**
 * Every visible thread, split into board cards and the snoozed and settled ones, from the
 * shells the client already holds. Quiet shells skip streaming ticks, and the snooze clock
 * re-renders exactly when a snoozed thread wakes.
 */
export function useBoardThreads(): BoardThreads {
  const threads = useQuietThreadShells();
  const delegatedUnderParent = useDelegatedUnderParent();
  const now = new Date(useSnoozeWakeClock(threads)).toISOString();
  const cards: BoardCard[] = [];
  const snoozed: EnvironmentThreadShell[] = [];
  const settled: EnvironmentThreadShell[] = [];
  for (const thread of filterSidebarV2VisibleThreads(threads, null, delegatedUnderParent)) {
    const card = resolveBoardCard(thread, now);
    if (card !== null) cards.push(card);
    else if (thread.settledOverride === "settled") settled.push(thread);
    else if (effectiveSnoozed(thread, { now })) snoozed.push(thread);
  }
  snoozed.sort((a, b) => (a.snoozedUntil ?? "").localeCompare(b.snoozedUntil ?? ""));
  settled.sort((a, b) => (b.settledAt ?? "").localeCompare(a.settledAt ?? ""));
  return { cards, snoozed, settled };
}
