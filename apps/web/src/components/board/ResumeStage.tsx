import { useNavigate } from "@tanstack/react-router";
import { useGT } from "gt-react";
import { ArrowUpRightIcon } from "lucide-react";

import { useComposerDraftStore } from "../../composerDraftStore";
import { useQuietThreadShell } from "../../state/entities";
import { buildDraftThreadRouteParams, buildThreadRouteParams } from "../../threadRoutes";
import { Button } from "../ui/button";
import { SharedTooltipTrigger } from "../ui/shared-tooltip";
import { useLastStage } from "./boardStage";

/**
 * Picks up the thread or draft that last had the stage, so board and thread are one click apart.
 * It reads as going forward into work: the board is home, the thread is where you go from it.
 */
export function ResumeStage() {
  const gt = useGT();
  const navigate = useNavigate();
  const stage = useLastStage();
  const thread = useQuietThreadShell(stage?.kind === "server" ? stage.threadRef : null);
  const draftOpen = useComposerDraftStore((store) =>
    stage?.kind === "draft" ? store.getDraftSession(stage.draftId)?.promotedTo == null : false,
  );
  if (stage === null) return null;
  const title =
    stage.kind === "draft"
      ? draftOpen
        ? gt("New thread")
        : null
      : thread !== null && thread.archivedAt === null
        ? thread.title
        : null;
  if (title === null) return null;
  const open = () => {
    if (stage.kind === "server") {
      void navigate({
        to: "/$environmentId/$threadId",
        params: buildThreadRouteParams(stage.threadRef),
      });
    } else {
      void navigate({ to: "/draft/$draftId", params: buildDraftThreadRouteParams(stage.draftId) });
    }
  };
  return (
    <SharedTooltipTrigger
      render={
        <Button
          size="sm"
          variant="outline"
          className="max-w-64 min-w-0 shrink"
          aria-label={gt("Resume {title}", { title })}
          onClick={open}
        />
      }
      label={gt("Resume {title}", { title })}
      side="bottom"
    >
      <span className="truncate">{title}</span>
      <ArrowUpRightIcon aria-hidden className="text-muted-foreground" />
    </SharedTooltipTrigger>
  );
}
