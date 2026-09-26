import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GameApp } from "@/components/game/GameApp";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg text-muted">
        <p className="font-display text-2xl tracking-wide">Loading Pulse Force…</p>
      </div>
    );
  }
  return <GameApp />;
}
