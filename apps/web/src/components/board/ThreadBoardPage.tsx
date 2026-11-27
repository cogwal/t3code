import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { useNavigate } from "@tanstack/react-router";
import { msg, T, useGT, useMessages } from "gt-react";
import { ChevronDownIcon, SearchIcon, SquarePenIcon } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { isElectron } from "~/env";
import { useSidebarProjectGroups } from "../../hooks/useSidebarProjectGroups";
import { cn } from "../../lib/utils";
import { buildThreadRouteParams } from "../../threadRoutes";
import { ProjectFavicon } from "../ProjectFavicon";
import { Button } from "../ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/input-group";
import { SidebarInset } from "../ui/sidebar";
import { ThreadBoardCard } from "./ThreadBoardCard";
import { ThreadBoardUndoNotice } from "./ThreadBoardUndoNotice";
import { ThreadBoardUtilities } from "./ThreadBoardUtilities";
import { ResumeStage } from "./ResumeStage";
import { ThreadBoardShelves } from "./ThreadBoardShelves";
import { useBoardThreads } from "./useBoardCards";
import { useBoardProjectLabels } from "./useBoardProjectLabels";
import { useBoardNewThread } from "./useBoardNewThread";
import {
  BOARD_LANES,
  buildBoardSwimlanes,
  resolveBoardArrowTarget,
  type BoardArrowKey,
  type BoardCard,
  type BoardLane,
} from "./threadBoard.logic";

const LANE_PRESENTATION: Record<BoardLane, { label: string; dotClassName: string }> = {
  needs: { label: msg("Needs you", { $context: "board lane" }), dotClassName: "bg-warning" },
  working: { label: msg("Working", { $context: "board lane" }), dotClassName: "bg-info" },
  done: { label: msg("Done", { $context: "board lane" }), dotClassName: "bg-success" },
};

/**
 * The home page: every thread, in project swimlanes crossed with state lanes. Opening a card
 * or starting a thread folds the board into the sidebar rail (ThreadBoardRail).
 */
export function ThreadBoardPage(props: { background?: boolean } = {}) {
  const gt = useGT();
  const m = useMessages();
  const navigate = useNavigate();
  const startNewThread = useBoardNewThread();
  const { cards: boardCards, snoozed, settled } = useBoardThreads();
  const groups = useSidebarProjectGroups();
  const projectLabels = useBoardProjectLabels();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());

  const needle = query.trim().toLowerCase();
  const cards = needle
    ? boardCards.filter((card) => card.thread.title.toLowerCase().includes(needle))
    : boardCards;
  const swimlanes = buildBoardSwimlanes(groups, cards);

  const openThread = (thread: Pick<BoardCard["thread"], "environmentId" | "id">) => {
    void navigate({
      to: "/$environmentId/$threadId",
      params: buildThreadRouteParams(scopeThreadRef(thread.environmentId, thread.id)),
    });
  };
  const onBoardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current =
      event.target instanceof HTMLElement ? event.target.dataset.boardCard : undefined;
    if (current === undefined || !ARROW_KEYS.has(event.key)) return;
    const grid = swimlanes
      .filter(({ group }) => !collapsed.has(group.projectKey))
      .map(({ lanes }) => BOARD_LANES.map((lane) => lanes[lane].map(cardKey)));
    const target = resolveBoardArrowTarget(grid, current, event.key as BoardArrowKey);
    if (target === null) return;
    event.preventDefault();
    event.currentTarget.querySelector<HTMLElement>(`[data-board-card="${target}"]`)?.focus();
  };
  const toggleCollapsed = (projectKey: string) => {
    const next = new Set(collapsed);
    if (!next.delete(projectKey)) next.add(projectKey);
    setCollapsed(next);
  };

  return (
    <SidebarInset
      inert={props.background}
      className="h-dvh min-h-0 overflow-hidden overscroll-y-none"
    >
      <header
        className={cn(
          "flex h-[var(--workspace-topbar-height)] shrink-0 items-center gap-3 border-b pr-(--workspace-gutter-end) pl-(--workspace-controls-left)",
          isElectron && "drag-region wco:pr-(--workspace-native-controls-inset)",
        )}
      >
        <Button size="sm" onClick={() => startNewThread()}>
          <SquarePenIcon aria-hidden />
          <T>New thread</T>
        </Button>
        <ResumeStage />
        <span className="flex-1" />
        <ThreadBoardUndoNotice />
        <ThreadBoardShelves
          snoozed={snoozed}
          settled={settled}
          projectLabels={projectLabels}
          onOpen={openThread}
        />
        <InputGroup className="w-60 min-w-28 shrink">
          <InputGroupAddon>
            <SearchIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label={gt("Search threads on the board")}
            placeholder={gt("Search threads")}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </InputGroup>
        <span aria-hidden className="h-5 w-px shrink-0 bg-border" />
        <ThreadBoardUtilities />
      </header>

      <div className="flex min-h-0 flex-1">
        <div
          data-board-scroll=""
          onKeyDown={onBoardKeyDown}
          className="flex min-h-0 flex-1 flex-col overflow-auto px-4 pb-4 scrollbar-gutter-both"
        >
          {swimlanes.length === 0 ? (
            <p className="mx-auto mt-16 max-w-sm text-center text-sm text-muted-foreground">
              {needle ? (
                <T>No threads match.</T>
              ) : (
                <T>
                  Nothing on the board. Threads that are running, waiting on you, or done show up
                  here.
                </T>
              )}
            </p>
          ) : (
            // The last swimlane grows, so its lanes reach the bottom instead of stopping mid-page.
            <div className="flex min-w-[46rem] grow flex-col">
              <div className="sticky top-0 z-10 grid grid-cols-3 gap-2.5 bg-background surface-grain pt-3 pb-1.5">
                {BOARD_LANES.map((lane) => (
                  <div key={lane} className="flex items-center gap-2 px-1 text-sm font-semibold">
                    <span
                      aria-hidden
                      className={cn("size-2 rounded-full", LANE_PRESENTATION[lane].dotClassName)}
                    />
                    {m(LANE_PRESENTATION[lane].label)}
                    <span className="font-medium text-muted-foreground">
                      {cards.filter((card) => card.lane === lane).length}
                    </span>
                  </div>
                ))}
              </div>
              {swimlanes.map(({ group, lanes }) => {
                const isCollapsed = collapsed.has(group.projectKey);
                return (
                  <section
                    key={group.projectKey}
                    className="mt-2.5 flex flex-col last:grow"
                    aria-label={group.displayName}
                  >
                    <button
                      type="button"
                      aria-expanded={!isCollapsed}
                      onClick={() => toggleCollapsed(group.projectKey)}
                      className="flex h-8 w-full items-center gap-2 rounded-lg px-1.5 text-left text-sm font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <ChevronDownIcon
                        aria-hidden
                        className={cn(
                          "size-4 text-muted-foreground transition-transform",
                          isCollapsed && "-rotate-90",
                        )}
                      />
                      <ProjectFavicon project={group} className="size-4" />
                      <span className="truncate">{group.displayName}</span>
                      <span className="ml-1 flex items-center gap-2.5 text-xs font-normal text-muted-foreground">
                        {BOARD_LANES.map((lane) =>
                          lanes[lane].length === 0 ? null : (
                            <span key={lane} className="flex items-center gap-1.5">
                              <span
                                aria-hidden
                                className={cn(
                                  "size-2 rounded-full",
                                  LANE_PRESENTATION[lane].dotClassName,
                                )}
                              />
                              {lanes[lane].length}
                            </span>
                          ),
                        )}
                      </span>
                    </button>
                    {isCollapsed ? null : (
                      <div className="mt-1 grid grow grid-cols-3 gap-2.5">
                        {BOARD_LANES.map((lane) => (
                          <div
                            key={lane}
                            className={cn(
                              "flex min-h-13 flex-col gap-1.5 rounded-xl border p-1.5",
                              lanes[lane].length === 0 ? "border-dashed" : "bg-muted/60",
                            )}
                          >
                            {lanes[lane].map((card) => (
                              <ThreadBoardCard
                                key={card.thread.id}
                                card={card}
                                cardKey={cardKey(card)}
                                onOpen={() => openThread(card.thread)}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SidebarInset>
  );
}

const ARROW_KEYS: ReadonlySet<string> = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

const cardKey = (card: BoardCard) => `${card.thread.environmentId}:${card.thread.id}`;
