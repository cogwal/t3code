import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { canSnooze } from "@t3tools/client-runtime/state/thread-settled";
import { AuthOrchestrationOperateScope } from "@t3tools/contracts";
import { T, useGT, useMessages } from "gt-react";
import { CheckIcon, ClockIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { useClientSettings } from "../../hooks/useSettings";
import { useThreadActions } from "../../hooks/useThreadActions";
import { cn } from "../../lib/utils";
import { useEnvironmentScope } from "../../state/session";
import { requestCustomSnooze } from "../CustomSnoozeDialog";
import { pickSnoozePreset, resolveSnoozePresets } from "../Sidebar.snooze";
import { Menu, MenuItem, MenuItemDetail, MenuPopup, MenuSeparator, MenuTrigger } from "../ui/menu";
import { SharedTooltipTrigger } from "../ui/shared-tooltip";
import type { BoardCard } from "./threadBoard.logic";

// Static class strings per host, so Tailwind sees every group-hover variant.
const REVEAL_ON_HOVER = {
  card: "group-hover/board-card:pointer-events-auto group-hover/board-card:opacity-100",
  rail: "group-hover/rail-row:pointer-events-auto group-hover/rail-row:opacity-100",
} as const;

/**
 * Snooze and Settle, shown over `children` (the card's time) while the card is hovered or
 * focused, like the sidebar row's controls.
 */
export function ThreadBoardCardActions(props: {
  card: BoardCard;
  host: keyof typeof REVEAL_ON_HOVER;
  /** The surface under the controls, so they cover what they sit on. */
  surfaceClassName: string;
  children?: ReactNode;
}) {
  const { thread } = props.card;
  const threadRef = scopeThreadRef(thread.environmentId, thread.id);
  const gt = useGT();
  const m = useMessages();
  const { settleThread, snoozeThread } = useThreadActions();
  const canOperate = useEnvironmentScope(threadRef.environmentId, AuthOrchestrationOperateScope);
  const timestampFormat = useClientSettings((settings) => settings.timestampFormat);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  if (!canOperate) return props.children ?? null;

  // oxlint-disable-next-line react/purity -- Read when the card renders; snooze eligibility only depends on time for queued turns.
  const snoozeAllowed = canSnooze(thread, { now: new Date().toISOString() });
  const presets = snoozeOpen
    ? // oxlint-disable-next-line react/purity -- Presets are resolved only while the menu is open, so each opening reads a fresh time.
      resolveSnoozePresets(new Date(), timestampFormat, threadRef.environmentId, m)
    : [];
  const buttonClassName =
    "inline-flex h-5 cursor-pointer items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

  return (
    <span className="relative flex shrink-0 items-center">
      {props.children}
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 flex items-center rounded-md opacity-0 has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:opacity-100",
          REVEAL_ON_HOVER[props.host],
          props.surfaceClassName,
          snoozeOpen && "pointer-events-auto opacity-100",
        )}
      >
        {snoozeAllowed ? (
          <Menu open={snoozeOpen} onOpenChange={setSnoozeOpen}>
            <SharedTooltipTrigger
              render={
                <MenuTrigger
                  render={
                    <button
                      type="button"
                      aria-label={gt("Snooze thread")}
                      className={buttonClassName}
                    />
                  }
                />
              }
              label={gt("Snooze thread")}
            >
              <ClockIcon aria-hidden className="size-3" />
            </SharedTooltipTrigger>
            <MenuPopup side="bottom" align="end">
              {presets.map((preset) => (
                <MenuItem
                  key={preset.id}
                  onClick={() => {
                    const picked = pickSnoozePreset(
                      presets,
                      preset.id,
                      timestampFormat,
                      threadRef.environmentId,
                    );
                    if (picked) void snoozeThread(threadRef, picked.snoozedUntil);
                  }}
                >
                  {preset.label}
                  <MenuItemDetail>{preset.whenLabel}</MenuItemDetail>
                </MenuItem>
              ))}
              {presets.length > 0 ? <MenuSeparator /> : null}
              <MenuItem
                onClick={async () => {
                  const choice = await requestCustomSnooze();
                  if (choice) void snoozeThread(threadRef, choice.snoozedUntil);
                }}
              >
                <T>Custom…</T>
              </MenuItem>
            </MenuPopup>
          </Menu>
        ) : null}
        <SharedTooltipTrigger
          render={
            <button
              type="button"
              aria-label={gt("Settle thread")}
              onClick={() => void settleThread(threadRef)}
              className={buttonClassName}
            />
          }
          label={gt("Settle thread")}
        >
          <CheckIcon aria-hidden className="size-3.5" />
          <T>Settle</T>
        </SharedTooltipTrigger>
      </span>
    </span>
  );
}
