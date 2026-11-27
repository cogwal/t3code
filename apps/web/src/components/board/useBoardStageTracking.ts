import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useComposerDraftStore, type DraftId } from "../../composerDraftStore";
import { markArriving, rememberStage } from "./boardStage";

/**
 * Runs while the rail is mounted. Remembers the thread or draft on the stage, and once the
 * draft on the stage is sent, goes back to the board, where its new card is highlighted.
 */
export function useBoardStageTracking(route: {
  readonly environmentId: string | null;
  readonly threadId: string | null;
  readonly draftId: string | null;
}) {
  const navigate = useNavigate();
  const { environmentId, threadId, draftId } = route;

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- records the stage in module state the board reads for its back button
  useEffect(() => {
    if (environmentId !== null && threadId !== null) {
      rememberStage({
        kind: "server",
        threadRef: scopeThreadRef(environmentId as EnvironmentId, threadId as ThreadId),
      });
    } else if (draftId !== null) {
      rememberStage({ kind: "draft", draftId: draftId as DraftId });
    }
  }, [environmentId, threadId, draftId]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- subscribes to the draft store so the board takes over the moment the draft becomes a thread
  useEffect(() => {
    if (draftId === null) return;
    const promotedRef = () => {
      const state = useComposerDraftStore.getState();
      return (
        state.getDraftSession(draftId as DraftId)?.promotedTo ??
        state.getPromotedDraftRedirect(draftId as DraftId)
      );
    };
    // A draft that was already sent (reopened from history) stays where it is.
    if (promotedRef() !== null) return;
    return useComposerDraftStore.subscribe(() => {
      const threadRef = promotedRef();
      if (threadRef === null) return;
      rememberStage({ kind: "server", threadRef });
      markArriving(threadRef);
      void navigate({ to: "/" });
    });
  }, [draftId, navigate]);
}
