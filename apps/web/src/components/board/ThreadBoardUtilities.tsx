import { useNavigate } from "@tanstack/react-router";
import { useGT } from "gt-react";
import { ChartNoAxesColumnIcon, SettingsIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useIssuesSupported, usePullRequestsSupported } from "../../state/environments";
import { readIssueListPreferences } from "../issue/issueListPreferences";
import { IssueGlyph } from "../issue/issuePresentation";
import { PullRequestGlyph } from "../pullRequest/pullRequestIcons";
import { readPullRequestListPreferences } from "../pullRequest/pullRequestListPreferences";
import { SidebarUpdatePill } from "../sidebar/SidebarUpdatePill";
import { Button } from "../ui/button";
import { SidebarMenu } from "../ui/sidebar";
import { SharedTooltipTrigger } from "../ui/shared-tooltip";

/** The sidebar footer's links and update pill, for the full board, which has no sidebar. */
export function ThreadBoardUtilities() {
  const gt = useGT();
  const navigate = useNavigate();
  const pullRequestsSupported = usePullRequestsSupported();
  const issuesSupported = useIssuesSupported();
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <SidebarMenu className="flex-row items-center">
        <SidebarUpdatePill />
      </SidebarMenu>
      {pullRequestsSupported ? (
        <UtilityButton
          label={gt("Pull requests")}
          onClick={() =>
            void navigate({ to: "/pull-requests", search: readPullRequestListPreferences() })
          }
        >
          <PullRequestGlyph.pullRequest />
        </UtilityButton>
      ) : null}
      {issuesSupported ? (
        <UtilityButton
          label={gt("Issues", { $context: "sidebar link to the list of issues" })}
          onClick={() => void navigate({ to: "/issues", search: readIssueListPreferences() })}
        >
          <IssueGlyph.issue />
        </UtilityButton>
      ) : null}
      <UtilityButton label={gt("Usage")} onClick={() => void navigate({ to: "/usage" })}>
        <ChartNoAxesColumnIcon />
      </UtilityButton>
      <UtilityButton label={gt("Settings")} onClick={() => void navigate({ to: "/settings" })}>
        <SettingsIcon />
      </UtilityButton>
    </div>
  );
}

function UtilityButton(props: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <SharedTooltipTrigger
      render={
        <Button size="icon-sm" variant="ghost" aria-label={props.label} onClick={props.onClick} />
      }
      label={props.label}
      side="bottom"
    >
      {props.children}
    </SharedTooltipTrigger>
  );
}
