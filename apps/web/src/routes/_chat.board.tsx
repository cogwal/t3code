import { Navigate, createFileRoute } from "@tanstack/react-router";

// Fork: the board is the home page now; old links and bookmarks land there.
export const Route = createFileRoute("/_chat/board")({
  component: () => <Navigate to="/" replace />,
});
