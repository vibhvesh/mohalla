"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCity } from "@/components/city";
import { useSession } from "@/components/session";
import { Banner, Button, EmptyState, StatusPill } from "@/components/ui";
import { api } from "@/lib/client";
import { sportLabel } from "@/lib/sports";

type Game = {
  id: string;
  sport: string;
  title: string;
  area: string;
  city: string;
  date: string;
  time: string;
  playersNeeded: number;
  spotsLeft: number;
  note: string;
  status: string;
  host: { name: string };
  players: string[];
  joined: boolean;
  hosting: boolean;
  venue: { id: string; name: string } | null;
};

export function GamesView() {
  const { city } = useCity();
  const { user } = useSession();
  const [games, setGames] = useState<Game[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ games: Game[] }>(`/api/games?city=${encodeURIComponent(city)}`)
      .then((data) => setGames(data.games))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load games"));
  }, [city]);

  useEffect(() => {
    load();
  }, [load, user]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pitch-soft">{city}</p>
          <h1 className="font-display text-4xl text-pitch">Pickup games</h1>
        </div>
        <Link href="/games/new" className="rounded-full bg-pitch px-4 py-2 text-sm font-semibold text-lime">
          Post
        </Link>
      </div>
      <p className="text-sm leading-6 text-muted">Need four for cricket at 7? Post it. Players nearby can join the side.</p>
      {error ? <Banner>{error}</Banner> : null}
      {games.length === 0 ? (
        <EmptyState title="No open games" body="Be the first to post. Say the sport, the area, and how many players you still need." />
      ) : (
        games.map((game) => (
          <article key={game.id} className="space-y-2 rounded-3xl bg-card p-4 ring-1 ring-line">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{sportLabel(game.sport)}</p>
                <h2 className="font-display text-2xl text-pitch">{game.title}</h2>
              </div>
              <StatusPill status={game.status === "full" ? "full" : "open"} />
            </div>
            <p className="text-sm text-muted">
              {game.date} · {game.time} · {game.area}, {game.city}
            </p>
            <p className="text-sm">
              Host {game.host.name} · {game.spotsLeft} spot{game.spotsLeft === 1 ? "" : "s"} left of {game.playersNeeded}
            </p>
            {game.venue ? (
              <Link href={`/venues/${game.venue.id}`} className="text-sm font-semibold text-pitch">
                {game.venue.name}
              </Link>
            ) : null}
            {game.note ? <p className="text-sm leading-6">{game.note}</p> : null}
            {game.players.length ? <p className="text-xs text-muted">Joined: {game.players.join(", ")}</p> : null}
            {game.hosting ? (
              <p className="text-sm font-semibold">You are hosting</p>
            ) : game.joined ? (
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  api(`/api/games/${game.id}/join`, { method: "DELETE" }).then(load).catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Could not leave");
                  });
                }}
              >
                Leave game
              </Button>
            ) : user ? (
              <Button
                type="button"
                disabled={game.spotsLeft === 0}
                onClick={() => {
                  api(`/api/games/${game.id}/join`, { method: "POST" }).then(load).catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Could not join");
                  });
                }}
              >
                Join
              </Button>
            ) : (
              <Link href="/login?next=/games" className="inline-flex text-sm font-semibold text-pitch">
                Log in to join
              </Link>
            )}
          </article>
        ))
      )}
    </div>
  );
}
