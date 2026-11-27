import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { canSnooze } from "@t3tools/client-runtime/state/thread-settled";
import { AuthOrchestrationOperateScope } from "@t3tools/contracts";
import { T, useGT, useMessages } from "gt-react";
import { AlarmClockIcon, CheckCheckIcon, EllipsisIcon, SquareIcon } from "lucide-react";
import { useState } from "react";

import { useClientSettings } from "../../hooks/useSettings";
import { useThreadActions } from "../../hooks/useThreadActions";
import { cn } from "../../lib/utils";
import { useEnvironmentScope } from "../../state/session";
import { threadEnvironment } from "../../state/threads";
import { useAtomCommand } from "../../state/use-atom-command";
import { requestCustomSnooze } from "../CustomSnoozeDialog";
import { pickSnoozePreset, resolveSnoozePresets } from "../Sidebar.snooze";
import {
  Menu,
  MenuItem,
  MenuItemDetail,
  MenuPopup,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "../ui/menu";
import type { BoardCard } from "./threadBoard.logic";

/** Stop, settle and snooze for one card, so the board can be tidied without opening threads. */
export function ThreadBoardCardMenu(props: { card: BoardCard; className?: string }) {
  const { card } = props;
  const { thread } = card;
  const threadRef = scopeThreadRef(thread.environmentId, thread.id);
  const { settleThread, snoozeThread } = useThreadActions();
  const interrupt = useAtomCommand(threadEnvironment.interruptTurn);
  const canOperate = useEnvironmentScope(threadRef.environmentId, AuthOrchestrationOperateScope);
  const timestampFormat = useClientSettings((settings) => settings.timestampFormat);
  const m = useMessages();
  const gt = useGT();
  const [open, setOpen] = useState(false);
  if (!canOperate) return null;

  const activeRunId = thread.runtime?.activeRunId ?? null;
  // oxlint-disable-next-line react/purity -- Read only while the menu is open, so each opening sees a fresh time.
  const now = open ? new Date() : null;
  const presets =
    now === null ? [] : resolveSnoozePresets(now, timestampFormat, threadRef.environmentId, m);
  const snoozeAllowed = now !== null && canSnooze(thread, { now: now.toISOString() });

  return (
    <Menu open={open} onOpenChange={setOpen}>
      <MenuTrigger
        render={
          <button
            type="button"
            aria-label={gt("Actions for {title}", { title: thread.title })}
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-popup-open:bg-accent data-popup-open:text-foreground",
              props.className,
            )}
          />
        }
      >
        <EllipsisIcon aria-hidden className="size-4" />
      </MenuTrigger>
      <MenuPopup side="bottom" align="end">
        {activeRunId !== null ? (
          <MenuItem
            onClick={() =>
              void interrupt({
                environmentId: threadRef.environmentId,
                input: { threadId: threadRef.threadId, runId: activeRunId },
              })
            }
          >
            <SquareIcon aria-hidden />
            <T>Stop</T>
          </MenuItem>
        ) : null}
        {activeRunId !== null ? null : (
          <MenuItem onClick={() => void settleThread(threadRef)}>
            <CheckCheckIcon aria-hidden />
            <T>Settle</T>
            <MenuItemDetail>
              <T>Takes it off the board</T>
            </MenuItemDetail>
          </MenuItem>
        )}
        {snoozeAllowed ? (
          <MenuSub>
            <MenuSubTrigger>
              <AlarmClockIcon aria-hidden />
              <T>Snooze</T>
            </MenuSubTrigger>
            <MenuSubPopup>
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
            </MenuSubPopup>
          </MenuSub>
        ) : null}
      </MenuPopup>
    </Menu>
  );
}
