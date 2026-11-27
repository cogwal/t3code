import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";
import { T, useGT } from "gt-react";
import { AlarmClockIcon, CheckCheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react";
import type { ReactNode } from "react";

import { openCommandPalette } from "../../commandPaletteBus";
import { ProjectFavicon } from "../ProjectFavicon";
import { Button } from "../ui/button";
import { Menu, MenuItem, MenuItemDetail, MenuPopup, MenuSeparator, MenuTrigger } from "../ui/menu";
import type { BoardProjectLabel } from "./useBoardProjectLabels";

const SETTLED_SHOWN = 10;

/**
 * The threads that left the board, one click away: snoozed ones until they wake and the most
 * recently settled ones, each opening the thread beside the rail.
 */
export function ThreadBoardShelves(props: {
  snoozed: ReadonlyArray<EnvironmentThreadShell>;
  settled: ReadonlyArray<EnvironmentThreadShell>;
  projectLabels: ReadonlyMap<string, BoardProjectLabel>;
  onOpen: (thread: EnvironmentThreadShell) => void;
}) {
  const gt = useGT();
  return (
    <div className="flex shrink-0 items-center gap-1">
      {props.snoozed.length === 0 ? null : (
        <Shelf
          icon={<AlarmClockIcon aria-hidden />}
          label={gt("Snoozed", { $context: "board rail section" })}
          count={props.snoozed.length}
          threads={props.snoozed}
          projectLabels={props.projectLabels}
          onOpen={props.onOpen}
        />
      )}
      <Shelf
        icon={<CheckCheckIcon aria-hidden />}
        label={gt("Settled", { $context: "board rail section" })}
        threads={props.settled.slice(0, SETTLED_SHOWN)}
        projectLabels={props.projectLabels}
        onOpen={props.onOpen}
      />
    </div>
  );
}

function Shelf(props: {
  icon: ReactNode;
  label: string;
  count?: number;
  threads: ReadonlyArray<EnvironmentThreadShell>;
  projectLabels: ReadonlyMap<string, BoardProjectLabel>;
  onOpen: (thread: EnvironmentThreadShell) => void;
}) {
  return (
    <Menu>
      <MenuTrigger render={<Button size="sm" variant="ghost" />}>
        {props.icon}
        {props.label}
        {props.count === undefined ? null : (
          <span className="text-muted-foreground tabular-nums">{props.count}</span>
        )}
        <ChevronDownIcon aria-hidden className="text-muted-foreground" />
      </MenuTrigger>
      <MenuPopup side="bottom" align="start" className="max-w-80">
        {props.threads.map((thread) => {
          const project = props.projectLabels.get(`${thread.environmentId}:${thread.projectId}`);
          return (
            <MenuItem
              key={`${thread.environmentId}:${thread.id}`}
              onClick={() => props.onOpen(thread)}
            >
              {project ? (
                <ProjectFavicon project={project.favicon} className="size-3.5 shrink-0" />
              ) : null}
              <span className="min-w-0 truncate">{thread.title}</span>
              {project ? <MenuItemDetail>{project.displayName}</MenuItemDetail> : null}
            </MenuItem>
          );
        })}
        {props.threads.length > 0 ? <MenuSeparator /> : null}
        <MenuItem onClick={() => openCommandPalette()}>
          <SearchIcon aria-hidden />
          <T>Search all threads</T>
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}
