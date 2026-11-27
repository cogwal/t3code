import { useLayoutEffect, type RefObject } from "react";

import { takeArriving } from "./boardStage";
import type { BoardLane } from "./threadBoard.logic";

interface Placement {
  readonly lane: BoardLane;
  readonly left: number;
  readonly top: number;
  readonly at: number;
}

// A card remounts when it changes lane, so its last spot has to outlive the component.
const lastPlacement = new Map<string, Placement>();
// Older placements belong to an earlier visit or scroll position; sliding from them would mislead.
const MOVE_WINDOW_MS = 1_000;

function measure(element: HTMLElement) {
  const scroller = element.closest<HTMLElement>("[data-board-scroll]");
  const rect = element.getBoundingClientRect();
  const origin = scroller?.getBoundingClientRect();
  return {
    left: rect.left - (origin?.left ?? 0) + (scroller?.scrollLeft ?? 0),
    top: rect.top - (origin?.top ?? 0) + (scroller?.scrollTop ?? 0),
  };
}

/** Slides a card from its old lane to its new one, once, when its thread changes state. */
export function useLaneChangeAnimation(
  ref: RefObject<HTMLElement | null>,
  key: string,
  lane: BoardLane,
) {
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- reads and animates the card's DOM position; no React state involved
  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const previous = lastPlacement.get(key);
    if (
      previous !== undefined &&
      previous.lane !== lane &&
      performance.now() - previous.at < MOVE_WINDOW_MS &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const now = measure(element);
      element.animate(
        [
          { transform: `translate(${previous.left - now.left}px, ${previous.top - now.top}px)` },
          { transform: "none" },
        ],
        { duration: 320, easing: "cubic-bezier(0.32, 0.72, 0, 1)" },
      );
    }
    // Runs before React detaches the card, so the element can still be measured.
    return () => {
      lastPlacement.set(key, { lane, ...measure(element), at: performance.now() });
    };
  }, [ref, key, lane]);
}

/** Brings a just-started thread's card into view and rings it once, so you see where it went. */
export function useArrivalHighlight(ref: RefObject<HTMLElement | null>, key: string) {
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- one-shot DOM scroll and animation for the card a new thread became; no React state involved
  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null || !takeArriving(key)) return;
    element.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    element.animate(
      [
        { boxShadow: "0 0 0 3px var(--ring)" },
        { boxShadow: "0 0 0 3px var(--ring)", offset: 0.6 },
        { boxShadow: "0 0 0 0 transparent" },
      ],
      { duration: 1800, easing: "ease-out" },
    );
  }, [ref, key]);
}
