import { useState } from "react";
import { MAP_LIST, type MapId } from "../game/maps";
import { MODE_LABEL, type GameMode, type HudState, type Team } from "../game/types";
import { BLUE_CHARS, RED_CHARS } from "../game/profile";
import { signIn, signUp, type Account } from "./account";
import { go } from "./path";
import type { Party } from "./net";

function cn(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(" "); }

export function AuthModal(props: { onClose: () => void; onOk: (a: Account) => void }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  return (
    <div className="overlay">
      <div className="panel">
        <p className="kicker">{mode === "in" ? "Sign in" : "Sign up"}</p>
        <h2>{mode === "in" ? "Welcome back" : "Create ID"}</h2>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mail.com" autoComplete="email" />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} />
        {err && <p className="muted">{err}</p>}
        <button className="big" onClick={() => {
          const res = mode === "in" ? signIn(email, password) : signUp(email, password, email.split("@")[0] || "Ranger");
          if (!res.ok || !res.account) { setErr(res.error || "Failed"); return; }
          props.onOk(res.account);
        }}>{mode === "in" ? "Sign in" : "Sign up"}</button>
        <button className="big alt" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "Need an ID? Sign up" : "Have an ID? Sign in"}</button>
        <button className="backonly" onClick={props.onClose}>Close</button>
      </div>
    </div>
  );
}

export function NeedAccount(props: { onAuth: () => void }) {
  return (
    <div className="screen screen-srv">
      <p className="kicker">ServerPlayer</p>
      <h1>Account required</h1>
      <p className="muted">Online servers need a signed-in ID. Singleplayer and Multiplayer do not.</p>
      <button className="big" onClick={props.onAuth}>Sign in or sign up</button>
      <button className="big alt" onClick={() => go({ page: "main" })}>Back to main</button>
    </div>
  );
}

export function ResultsCard(props: {
  winner: string; hud: HudState | null; kind: "solo" | "host" | "member";
  onMain: () => void; onPlayAgain: () => void; onLeave?: () => void;
}) {
  return (
    <div className="overlay">
      <div className="panel">
        <p className="kicker">Match over</p>
        <h2>{props.winner}</h2>
        <ul>{(props.hud?.board || []).map((p) => (
          <li key={p.id}><span className={p.team}>{p.name}{p.bot ? " · bot" : ""}</span><span>{Math.floor(p.score)}</span></li>
        ))}</ul>
        {props.kind === "member" ? (
          <>
            <button className="big" onClick={props.onPlayAgain}>Play again</button>
            <button className="big alt" onClick={props.onLeave || props.onMain}>Leave</button>
          </>
        ) : props.kind === "solo" ? (
          <>
            <button className="big" onClick={props.onPlayAgain}>Play game</button>
            <button className="big alt" onClick={props.onMain}>Main menu</button>
          </>
        ) : (
          <>
            <button className="big" onClick={props.onPlayAgain}>Play again</button>
            <button className="big alt" onClick={props.onMain}>Main menu</button>
          </>
        )}
      </div>
    </div>
  );
}

export function PauseMenu(props: { party: Party; onResume: () => void; onExit: () => void }) {
  const showIp = props.party.role !== "solo" && props.party.kind === "local";
  return (
    <div className="overlay">
      <div className="panel">
        <p className="kicker">Menu</p>
        <h2>Paused</h2>
        {showIp && (
          <p className="muted ip-line">
            Host IP <b>{props.party.ip || "—"}</b>
            {props.party.code ? <> · {props.party.code}</> : null}
          </p>
        )}
        {props.party.kind === "online" && props.party.role !== "solo" && (
          <p className="muted">Online server · {props.party.code || "official"}</p>
        )}
        <button className="big" onClick={props.onResume}>Resume</button>
        <button className="big alt" onClick={props.onExit}>Exit to main</button>
      </div>
    </div>
  );
}

export function VoteMap(props: { mapId: MapId; votes: Record<string, string>; onPick: (id: MapId) => void; onNext: () => void; locked?: boolean }) {
  const tally = Object.values(props.votes).reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});
  return (
    <div className="screen screen-mp">
      <p className="kicker">Play again</p>
      <h1>Vote map</h1>
      <p className="muted">Everyone who joined votes a map. After this you pick your own team and operator.</p>
      <div className="grid3 mapgrid">{MAP_LIST.map((m) => (
        <button key={m.id} className={cn("card", props.mapId === m.id && "on")} onClick={() => props.onPick(m.id)}>
          <b>{m.name}</b>
          <span>{m.code}{tally[m.id] ? ` · ${tally[m.id]} vote` : ""}</span>
        </button>
      ))}</div>
      <button className="big" disabled={props.locked} onClick={props.onNext}>{props.locked ? "Waiting for host" : "Lock vote"}</button>
    </div>
  );
}

export function PickOperator(props: {
  team: Team; character: string;
  onTeam: (t: Team) => void; onCharacter: (c: string) => void; onStart: () => void;
  waiting?: boolean;
}) {
  const chars = props.team === "blue" ? BLUE_CHARS : RED_CHARS;
  return (
    <div className="screen screen-team">
      <p className="kicker">Play again</p>
      <h1>Choose operator</h1>
      <p className="muted">Pick Force (blue) or Rogue (red). This is your choice, not a vote.</p>
      <div className="row">
        <button className={cn("team blue", props.team === "blue" && "on")} onClick={() => props.onTeam("blue")}>Force · blue</button>
        <button className={cn("team red", props.team === "red" && "on")} onClick={() => props.onTeam("red")}>Rogue · red</button>
      </div>
      <div className="grid4">{chars.map((c) => (
        <button key={c} className={cn("card", props.character === c && "on")} onClick={() => props.onCharacter(c)}><b>{c}</b></button>
      ))}</div>
      <button className="big" onClick={props.onStart}>{props.waiting ? "Ready — waiting" : "Start next match"}</button>
    </div>
  );
}

export function AccountChip(props: { account: Account | null; onOpen: () => void; onSignOut: () => void }) {
  return (
    <button className="authchip" onClick={() => {
      if (props.account) { props.onSignOut(); return; }
      props.onOpen();
    }}>{props.account ? props.account.id : "Sign in"}</button>
  );
}

export function modeLabel(mode: GameMode) { return MODE_LABEL[mode]; }
