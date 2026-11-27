import { useNavigate } from "@tanstack/react-router";
import { useGT } from "gt-react";
import { SquareKanbanIcon } from "lucide-react";

import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useSidebar } from "../ui/sidebar";
import { SharedTooltipTrigger } from "../ui/shared-tooltip";
import { useBoardThreads } from "./useBoardCards";

/**
 * The way home to the board, next to the sidebar toggle in the title bar, so it stays when the
 * sidebar is collapsed. The badge counts the threads waiting on you.
 */
export function BoardHomeControl(props: { onBackdrop: boolean }) {
  const gt = useGT();
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const needsYou = useBoardThreads().cards.filter((card) => card.lane === "needs").length;
  const label =
    needsYou === 0
      ? gt("Board", { $context: "go to the thread board" })
      : gt("Board, {count} need you", { count: needsYou });
  return (
    <SharedTooltipTrigger
      render={
        <Button
          size="icon"
          variant={props.onBackdrop ? "media-navigation" : "ghost"}
          aria-label={label}
          className={cn(
            "pointer-events-auto relative ml-1 size-[var(--workspace-titlebar-control-size)]! [-webkit-app-region:no-drag]",
            props.onBackdrop && "top-auto translate-y-0",
          )}
          onClick={() => {
            if (isMobile) setOpenMobile(false);
            void navigate({ to: "/" });
          }}
        />
      }
      label={label}
      side="bottom"
    >
      <SquareKanbanIcon className="size-4" />
      {needsYou === 0 ? null : (
        <Badge size="sm" variant="warning" className="absolute -top-1 -right-1.5" aria-hidden>
          {needsYou}
        </Badge>
      )}
    </SharedTooltipTrigger>
  );
}
