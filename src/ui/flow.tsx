import { useState } from "react";
import { MAP_LIST, type MapId } from "../game/maps";
import { MODE_LABEL, type GameMode, type HudState, type Team } from "../game/types";
import { BLUE_CHARS, RED_CHARS } from "../game/profile";
import { signIn, signOut, signUp, type Account } from "./account";
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
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mail.com" />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
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

export function ResultsCard(props: {
  winner: string; hud: HudState | null; kind: "solo" | "host" | "member";
  onMain: () => void; onPlayAgain: () => void; onLeave?: () => void;
}) {
  return (
    <div className="overlay">
      <div className="panel">
        <p className="kicker">Match over</p>
        <h2>{props.winner}</h2>
        <ul>{props.hud?.board.map((p) => (
          <li key={p.id}><span className={p.team}>{p.name}{p.bot ? " · bot" : ""}</span><span>{Math.floor(p.score)}</span></li>
        ))}</ul>
        {props.kind === "member" ? (
          <><button className="big" onClick={props.onPlayAgain}>Play again</button><button className="big alt" onClick={props.onLeave || props.onMain}>Leave</button></>
        ) : (
          <><button className="big" onClick={props.onPlayAgain}>Play again</button><button className="big alt" onClick={props.onMain}>Main menu</button></>
        )}
      </div>
    </div>
  );
}

export function PauseMenu(props: { party: Party; onResume: () => void; onExit: () => void }) {
  return (
    <div className="overlay">
      <div className="panel">
        <p className="kicker">Menu</p>
        <h2>Paused</h2>
        {props.party.role !== "solo" && <p className="muted">IP {props.party.ip || "—"} · {props.party.code}</p>}
        <button className="big" onClick={props.onResume}>Resume</button>
        <button className="big alt" onClick={props.onExit}>Exit to main</button>
      </div>
    </div>
  );
}

export function VoteMap(props: { mapId: MapId; onPick: (id: MapId) => void; onNext: () => void }) {
  return (
    <div className="screen screen-mp">
      <p className="kicker">Play again</p>
      <h1>Vote map</h1>
      <p className="muted">Everyone picks a map. The most voted map is used.</p>
      <div className="grid3 mapgrid">{MAP_LIST.map((m) => (
        <button key={m.id} className={cn("card", props.mapId === m.id && "on")} onClick={() => props.onPick(m.id)}><b>{m.name}</b><span>{m.code}</span></button>
      ))}</div>
      <button className="big" onClick={props.onNext}>Lock vote</button>
    </div>
  );
}

export function PickOperator(props: {
  team: Team; character: string;
  onTeam: (t: Team) => void; onCharacter: (c: string) => void; onStart: () => void;
}) {
  const chars = props.team === "blue" ? BLUE_CHARS : RED_CHARS;
  return (
    <div className="screen screen-team">
      <p className="kicker">Play again</p>
      <h1>Choose operator</h1>
      <p className="muted">Pick your team. This is not a vote.</p>
      <div className="row">
        <button className={cn("team blue", props.team === "blue" && "on")} onClick={() => props.onTeam("blue")}>Force</button>
        <button className={cn("team red", props.team === "red" && "on")} onClick={() => props.onTeam("red")}>Rogue</button>
      </div>
      <div className="grid4">{chars.map((c) => (
        <button key={c} className={cn("card", props.character === c && "on")} onClick={() => props.onCharacter(c)}><b>{c}</b></button>
      ))}</div>
      <button className="big" onClick={props.onStart}>Start next match</button>
    </div>
  );
}

export function AccountChip(props: { account: Account | null; onOpen: () => void }) {
  return (
    <button className="authchip" onClick={() => {
      if (props.account) { signOut(); location.reload(); return; }
      props.onOpen();
    }}>{props.account ? props.account.id : "Sign in"}</button>
  );
}

export function modeLabel(mode: GameMode) { return MODE_LABEL[mode]; }
