import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";
import type { EnvironmentId, ProjectId } from "@t3tools/contracts";
import { useNavigate, useParams } from "@tanstack/react-router";
import { msg, T, useGT, useMessages } from "gt-react";
import { ChevronDownIcon, SearchIcon, SquarePenIcon } from "lucide-react";
import { useState, type MouseEvent, type ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";

import { isElectron } from "~/env";
import { openCommandPalette } from "../../commandPaletteBus";
import {
  composerDraftHasUserContent,
  DraftId,
  useComposerDraftStore,
} from "../../composerDraftStore";
import { useSidebarProjectGroups } from "../../hooks/useSidebarProjectGroups";
import { cn } from "../../lib/utils";
import { buildDraftThreadRouteParams, buildThreadRouteParams } from "../../threadRoutes";
import { ProjectFavicon } from "../ProjectFavicon";
import { SidebarChromeFooter, SidebarChromeHeader } from "../sidebar/SidebarChrome";
import { Button } from "../ui/button";
import { SidebarContent, useSidebar } from "../ui/sidebar";
import { BoardStatusLabel } from "./ThreadBoardCard";
import { ThreadBoardCardMenu } from "./ThreadBoardCardMenu";
import { ThreadBoardFooterIcon } from "./ThreadBoardFooterIcon";
import { buildRailLanes, BOARD_LANES, type BoardCard, type BoardLane } from "./threadBoard.logic";
import { useBoardNewThread } from "./useBoardNewThread";
import { useBoardThreads } from "./useBoardCards";

const LANE_LABEL: Record<BoardLane, { label: string; dotClassName: string }> = {
  needs: { label: msg("Needs you", { $context: "board lane" }), dotClassName: "bg-warning" },
  working: { label: msg("Working", { $context: "board lane" }), dotClassName: "bg-info" },
  done: { label: msg("Done", { $context: "board lane" }), dotClassName: "bg-success" },
};
const SETTLED_SHOWN = 10;

type ProjectLabel = {
  readonly displayName: string;
  readonly favicon: Parameters<typeof ProjectFavicon>[0]["project"];
};

/**
 * The board folded into the sidebar while a thread or a new draft has the stage. Same lanes
 * as the board, every project together; only Needs you stays at full strength so the rail
 * does not compete with the thread.
 */
export function ThreadBoardRail() {
  const gt = useGT();
  const m = useMessages();
  const navigate = useNavigate();
  const startNewThread = useBoardNewThread();
  const { isMobile, setOpenMobile } = useSidebar();
  const { cards, snoozed, settled } = useBoardThreads();
  const lanes = buildRailLanes(cards);
  const projectLabels = useProjectLabels();
  const route = useParams({
    strict: false,
    select: (params) => ({
      threadKey:
        params.environmentId && params.threadId
          ? `${params.environmentId}:${params.threadId}`
          : null,
      draftId: params.draftId ?? null,
    }),
  });
  const drafts = useRailDrafts(route.draftId);

  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };
  const openThread = (thread: EnvironmentThreadShell) => {
    closeMobile();
    void navigate({
      to: "/$environmentId/$threadId",
      params: buildThreadRouteParams(scopeThreadRef(thread.environmentId, thread.id)),
    });
  };
  const openDraft = (draftId: DraftId) => {
    closeMobile();
    void navigate({ to: "/draft/$draftId", params: buildDraftThreadRouteParams(draftId) });
  };
  const projectOf = (thread: Pick<EnvironmentThreadShell, "environmentId" | "projectId">) =>
    projectLabels.get(`${thread.environmentId}:${thread.projectId}`) ?? null;
  const isCurrent = (thread: EnvironmentThreadShell) =>
    route.threadKey === `${thread.environmentId}:${thread.id}`;

  return (
    <>
      <SidebarChromeHeader isElectron={isElectron} />
      <div className="flex shrink-0 items-center gap-1.5 px-2 pb-2">
        <Button
          size="sm"
          variant="outline"
          className="min-w-0 flex-1 justify-start"
          onClick={() => {
            closeMobile();
            void navigate({ to: "/" });
          }}
        >
          <ThreadBoardFooterIcon />
          <T>Board</T>
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          aria-label={gt("New thread")}
          title={gt("New thread (Shift-click to pick a project)")}
          onClick={(event: MouseEvent) => {
            closeMobile();
            startNewThread(event);
          }}
        >
          <SquarePenIcon />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={gt("Search threads")}
          onClick={() => openCommandPalette()}
        >
          <SearchIcon />
        </Button>
      </div>
      <SidebarContent>
        <div className="flex flex-col gap-3 px-2 pb-3">
          {BOARD_LANES.map((lane) => {
            const laneCards = lanes[lane];
            const laneDrafts = lane === "working" ? drafts : [];
            if (laneCards.length === 0 && laneDrafts.length === 0) return null;
            return (
              <RailSection
                key={lane}
                label={m(LANE_LABEL[lane].label)}
                dotClassName={LANE_LABEL[lane].dotClassName}
                count={laneCards.length}
              >
                {laneDrafts.map((draft) => (
                  <RailDraftRow
                    key={draft.draftId}
                    draft={draft}
                    project={projectOf(draft)}
                    current={draft.draftId === route.draftId}
                    onOpen={() => openDraft(draft.draftId)}
                  />
                ))}
                {laneCards.map((card) => (
                  <RailCardRow
                    key={`${card.thread.environmentId}:${card.thread.id}`}
                    card={card}
                    project={projectOf(card.thread)}
                    current={isCurrent(card.thread)}
                    onOpen={() => openThread(card.thread)}
                  />
                ))}
              </RailSection>
            );
          })}
          {cards.length === 0 && drafts.length === 0 ? (
            <p className="px-2 pt-2 text-xs text-muted-foreground">
              <T>No threads on the board.</T>
            </p>
          ) : null}
          {snoozed.length === 0 ? null : (
            <RailSection
              label={gt("Snoozed", { $context: "board rail section" })}
              count={snoozed.length}
              collapsible
            >
              {snoozed.map((thread) => (
                <RailPlainRow
                  key={`${thread.environmentId}:${thread.id}`}
                  thread={thread}
                  project={projectOf(thread)}
                  current={isCurrent(thread)}
                  onOpen={() => openThread(thread)}
                />
              ))}
            </RailSection>
          )}
          {settled.length === 0 ? null : (
            <RailSection label={gt("Settled", { $context: "board rail section" })} collapsible>
              {settled.slice(0, SETTLED_SHOWN).map((thread) => (
                <RailPlainRow
                  key={`${thread.environmentId}:${thread.id}`}
                  thread={thread}
                  project={projectOf(thread)}
                  current={isCurrent(thread)}
                  onOpen={() => openThread(thread)}
                />
              ))}
              <button
                type="button"
                onClick={() => openCommandPalette()}
                className="flex h-7 items-center gap-2 rounded-md px-2 text-xs text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <SearchIcon aria-hidden className="size-3.5" />
                <T>Search all threads</T>
              </button>
            </RailSection>
          )}
        </div>
      </SidebarContent>
      <SidebarChromeFooter />
    </>
  );
}

function RailSection(props: {
  label: string;
  dotClassName?: string;
  count?: number;
  collapsible?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(!props.collapsible);
  const heading = (
    <>
      {props.dotClassName ? (
        <span aria-hidden className={cn("size-2 rounded-full", props.dotClassName)} />
      ) : null}
      <span>{props.label}</span>
      {props.count === undefined ? null : <span className="font-normal">{props.count}</span>}
    </>
  );
  return (
    <section aria-label={props.label} className="flex flex-col gap-0.5">
      {props.collapsible ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <ChevronDownIcon
            aria-hidden
            className={cn("size-3.5 transition-transform", !open && "-rotate-90")}
          />
          {heading}
        </button>
      ) : (
        <h2 className="flex h-6 items-center gap-1.5 px-2 text-xs font-medium text-muted-foreground">
          {heading}
        </h2>
      )}
      {open ? props.children : null}
    </section>
  );
}

function RailRow(props: {
  title: string;
  label: string;
  current: boolean;
  quiet: boolean;
  dashed?: boolean;
  onOpen: () => void;
  status: ReactNode;
  project: ProjectLabel | null;
  menu?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group/rail-row relative flex min-w-0 flex-col gap-0.5 rounded-md px-2 py-1.5",
        props.current ? "bg-sidebar-row-active" : "hover:bg-accent",
        props.dashed && "border border-dashed",
        props.quiet && !props.current && "opacity-70 hover:opacity-100",
      )}
    >
      {/* The whole row opens the thread; the menu sits above this button. */}
      <button
        type="button"
        onClick={props.onOpen}
        aria-label={props.label}
        aria-current={props.current ? "page" : undefined}
        className="absolute inset-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      />
      <span className="pointer-events-none truncate pr-5 text-sm font-medium">{props.title}</span>
      <span className="pointer-events-none flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        {props.status}
        {props.project === null ? null : (
          <span className="flex min-w-0 items-center gap-1">
            <ProjectFavicon project={props.project.favicon} className="size-3 shrink-0" />
            <span className="truncate">{props.project.displayName}</span>
          </span>
        )}
      </span>
      {props.menu ? (
        <span className="absolute top-1 right-1 opacity-0 group-hover/rail-row:opacity-100 has-[:focus-visible]:opacity-100 has-[[data-popup-open]]:opacity-100">
          {props.menu}
        </span>
      ) : null}
    </div>
  );
}

function RailCardRow(props: {
  card: BoardCard;
  project: ProjectLabel | null;
  current: boolean;
  onOpen: () => void;
}) {
  const gt = useGT();
  const { card } = props;
  return (
    <RailRow
      title={card.thread.title}
      label={gt("Open {title}", { title: card.thread.title })}
      current={props.current}
      quiet={card.lane !== "needs"}
      onOpen={props.onOpen}
      status={<BoardStatusLabel card={card} />}
      project={props.project}
      menu={<ThreadBoardCardMenu card={card} />}
    />
  );
}

function RailPlainRow(props: {
  thread: EnvironmentThreadShell;
  project: ProjectLabel | null;
  current: boolean;
  onOpen: () => void;
}) {
  const gt = useGT();
  return (
    <RailRow
      title={props.thread.title}
      label={gt("Open {title}", { title: props.thread.title })}
      current={props.current}
      quiet
      onOpen={props.onOpen}
      status={null}
      project={props.project}
    />
  );
}

function RailDraftRow(props: {
  draft: RailDraft;
  project: ProjectLabel | null;
  current: boolean;
  onOpen: () => void;
}) {
  const gt = useGT();
  const title = props.draft.preview || gt("New thread");
  return (
    <RailRow
      title={title}
      label={gt("Open draft {title}", { title })}
      current={props.current}
      quiet={false}
      dashed
      onOpen={props.onOpen}
      status={
        <span className="flex shrink-0 items-center gap-1.5 font-medium">
          <SquarePenIcon aria-hidden className="size-3.5" />
          <T>Draft</T>
        </span>
      }
      project={props.project}
    />
  );
}

type RailDraft = {
  readonly draftId: DraftId;
  readonly environmentId: EnvironmentId;
  readonly projectId: ProjectId;
  readonly preview: string;
};

/**
 * Unsent drafts with content, newest first, plus the draft on screen even while it is empty.
 * The draft on screen shows no preview, so typing in it does not re-render the rail.
 */
function useRailDrafts(routeDraftId: string | null): ReadonlyArray<RailDraft> {
  const listed = useComposerDraftStore(
    useShallow((store) => {
      const entries: Array<readonly [string, string]> = [];
      for (const [draftKey, session] of Object.entries(store.draftThreadsByThreadKey)) {
        if (session.promotedTo != null) continue;
        if (
          draftKey !== routeDraftId &&
          !composerDraftHasUserContent(store.draftsByThreadKey[draftKey])
        ) {
          continue;
        }
        entries.push([draftKey, session.createdAt]);
      }
      return entries.toSorted((a, b) => b[1].localeCompare(a[1])).map(([draftKey]) => draftKey);
    }),
  );
  const previews = useComposerDraftStore(
    useShallow((store) =>
      listed.map((draftKey) =>
        draftKey === routeDraftId
          ? ""
          : ((store.draftsByThreadKey[draftKey]?.prompt ?? "").trim().split("\n", 1)[0] ?? ""),
      ),
    ),
  );
  const sessions = useComposerDraftStore((store) => store.draftThreadsByThreadKey);
  return listed.flatMap((draftKey, index) => {
    const session = sessions[draftKey];
    if (session === undefined) return [];
    return [
      {
        draftId: DraftId.make(draftKey),
        environmentId: session.environmentId,
        projectId: session.projectId,
        preview: previews[index] ?? "",
      },
    ];
  });
}

function useProjectLabels(): ReadonlyMap<string, ProjectLabel> {
  const groups = useSidebarProjectGroups();
  const labels = new Map<string, ProjectLabel>();
  for (const group of groups) {
    for (const ref of group.memberProjectRefs) {
      labels.set(`${ref.environmentId}:${ref.projectId}`, {
        displayName: group.displayName,
        favicon: group,
      });
    }
  }
  return labels;
}
