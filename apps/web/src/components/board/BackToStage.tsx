import { useNavigate } from "@tanstack/react-router";
import { useGT } from "gt-react";
import { ArrowLeftIcon } from "lucide-react";

import { useComposerDraftStore } from "../../composerDraftStore";
import { useQuietThreadShell } from "../../state/entities";
import { buildDraftThreadRouteParams, buildThreadRouteParams } from "../../threadRoutes";
import { Button } from "../ui/button";
import { SharedTooltipTrigger } from "../ui/shared-tooltip";
import { useLastStage } from "./boardStage";

/** Back to the thread or draft the board was opened from, so board and thread are one click apart. */
export function BackToStage() {
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
          variant="ghost"
          className="max-w-56 min-w-0 shrink"
          aria-label={gt("Back to {title}", { title })}
          onClick={open}
        />
      }
      label={gt("Back to {title}", { title })}
      side="bottom"
    >
      <ArrowLeftIcon aria-hidden />
      <span className="truncate">{title}</span>
    </SharedTooltipTrigger>
  );
}
