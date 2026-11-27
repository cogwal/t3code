import type { ProjectFavicon } from "../ProjectFavicon";
import { useSidebarProjectGroups } from "../../hooks/useSidebarProjectGroups";

export type BoardProjectLabel = {
  readonly displayName: string;
  readonly favicon: Parameters<typeof ProjectFavicon>[0]["project"];
};

/** Project name and favicon by `environmentId:projectId`, grouped like the sidebar. */
export function useBoardProjectLabels(): ReadonlyMap<string, BoardProjectLabel> {
  const groups = useSidebarProjectGroups();
  const labels = new Map<string, BoardProjectLabel>();
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
