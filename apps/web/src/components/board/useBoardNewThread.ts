import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import { useRouter, type AnyRouter } from "@tanstack/react-router";

import { openCommandPalette } from "../../commandPaletteBus";
import { useComposerDraftStore } from "../../composerDraftStore";
import { useNewThreadHandler } from "../../hooks/useHandleNewThread";
import { readThreadShell } from "../../state/entities";
import { resolveThreadRouteTarget } from "../../threadRoutes";

/**
 * Starts a new thread in the project of the thread on screen, or asks for a project when none
 * is (the full board) or Shift is held. The draft opens in the stage beside the rail.
 */
export function useBoardNewThread() {
  const router = useRouter();
  const handleNewThread = useNewThreadHandler();
  return (event?: { readonly shiftKey: boolean }) => {
    const projectRef = event?.shiftKey ? null : readRouteProjectRef(router);
    if (projectRef === null) {
      openCommandPalette({ open: "new-thread-in" });
      return;
    }
    void handleNewThread(projectRef);
  };
}

function readRouteProjectRef(router: AnyRouter) {
  const target = resolveThreadRouteTarget(router.state.matches.at(-1)?.params ?? {});
  if (target === null) return null;
  if (target.kind === "server") {
    const shell = readThreadShell(target.threadRef);
    return shell === null ? null : scopeProjectRef(shell.environmentId, shell.projectId);
  }
  const draft = useComposerDraftStore.getState().getDraftSession(target.draftId);
  return draft === null ? null : scopeProjectRef(draft.environmentId, draft.projectId);
}
