import { useCallback, useEffect, useRef, useState } from "react";
import type { ArenaEngine } from "./game/engine";
import { BOMB_MAPS, MAP_LIST, type MapId } from "./game/maps";
import { GEAR, SHOP_TABS, WEAPONS, shopOf, startWeapon, type ShopTab, type WeaponId } from "./game/weapons";
import { MODE_BLURB, MODE_LABEL, type GameMode, type HudState, type Team } from "./game/types";
import { BLUE_CHARS, RED_CHARS, loadProfile, payout, rankFor, saveProfile, type Profile } from "./game/profile";

const MODES: GameMode[] = ["classic","resurrection","ctf","zombie","bomb","knives","deathmatch","armsrace","sniper"];
const NAMES = ["Ranger","Scout","Vesper","Comet","Quill","Harbor","Nimbus","Atlas"];
type Screen = "home" | "setup" | "playing" | "results";
function cn(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(" "); }
function randomName() { return `${NAMES[Math.floor(Math.random()*NAMES.length)]}-${Math.floor(10+Math.random()*89)}`; }
function formatTime(s: number) { const t=Math.max(0,Math.ceil(s)); return `${Math.floor(t/60)}:${(t%60).toString().padStart(2,"0")}`; }

export function GameApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [homeTab, setHomeTab] = useState<"play"|"armory"|"settings">("play");
  const [mode, setMode] = useState<GameMode>("classic");
  const [mapId, setMapId] = useState<MapId>("room");
  const [team, setTeam] = useState<Team>("blue");
  const [bots, setBots] = useState(7);
  const [shopTab, setShopTab] = useState<ShopTab>("pistol");
  const [profile, setProfile] = useState<Profile>(() => {
    const p = typeof window === "undefined" ? null : loadProfile();
    if (!p) return { name: randomName(), credits: 800, xp: 0, owned: ["knife","pm"], primary: "pm", secondary: "knife", lookScale: 1.2, invertY: false, muted: false, startMoney: 800, character: "Alpha", autoFire: false };
    if (p.name === "Ranger-01") p.name = randomName();
    return p;
  });
  const [hud, setHud] = useState<HudState | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [reward, setReward] = useState<{credits:number;xp:number}|null>(null);
  const [matchId, setMatchId] = useState(0);
  const [shopMsg, setShopMsg] = useState("");
  const [buyOpen, setBuyOpen] = useState(false);
  useEffect(() => { saveProfile(profile); }, [profile]);
  const patch = (partial: Partial<Profile>) => setProfile((p) => ({ ...p, ...partial }));
  useEffect(() => { if (mode === "bomb" && !BOMB_MAPS.includes(mapId)) setMapId((BOMB_MAPS[0] as MapId) || "desert3"); }, [mode, mapId]);
  const startSolo = () => { setWinner(null); setReward(null); setBuyOpen(false); setMatchId((n)=>n+1); setScreen("playing"); };
  const onMatchEnd = useCallback((w: string) => { setWinner(w); setScreen("results"); }, []);
  useEffect(() => {
    if (screen !== "results" || !hud || reward) return;
    const won = !!winner && winner !== "Draw";
    const pay = payout(Math.floor(hud.personal), won);
    setReward(pay);
    setProfile((p) => ({ ...p, credits: p.credits + pay.credits, xp: p.xp + pay.xp }));
  }, [screen, hud, reward, winner]);
  const chars = team === "blue" ? BLUE_CHARS : RED_CHARS;
  const maps = mode === "bomb" ? MAP_LIST.filter((m) => m.bombOk) : MAP_LIST;
  const rank = rankFor(profile.xp);
  return (
    <div className="shell">
      <div className="edge red" /><div className="edge blue" />
      {(screen === "playing" || screen === "results") && (
        <PlayView key={matchId} mode={mode} mapId={mapId} team={team} name={profile.name} primary={startWeapon(mode)} lookScale={profile.lookScale} invertY={profile.invertY} muted={profile.muted} startMoney={profile.startMoney} botCount={bots} onHud={setHud} onMatchEnd={onMatchEnd} />
      )}
      {screen === "home" && (
        <div className="hq">
          <header className="topbar"><div><p className="kicker">Special Forces Group style</p><h1>PULSE FORCE</h1></div><div className="stats"><div><span>Credits</span><b>{profile.credits}</b></div><div><span>{rank.current.name}</span><b>XP {profile.xp}</b></div></div></header>
          <div className="xpbar"><i style={{ width: `${Math.round(rank.pct*100)}%` }} /></div>
          {homeTab === "play" && (
            <section className="pane">
              <p className="lead">Same loop as the SFG2 app: New Game, pick mode and map, then buy gear in the match with cash.</p>
              <button className="deploy" onClick={() => setScreen("setup")}>New Game</button>
              <button className="ghost" onClick={() => setShopMsg("Solo bots are ready. Online rooms use the same match rules.")}>Multiplayer</button>
              {shopMsg && <p className="muted">{shopMsg}</p>}
              <div className="home-meta"><span>9 modes</span><span>30 maps</span><span>In-match shop</span><span>Bots</span></div>
            </section>
          )}
          {homeTab === "armory" && (
            <section className="pane">
              <p className="lead">HQ unlocks stay on this device. In a match you still buy with round cash.</p>
              <div className="shop">
                {(["pm","glock","deagle","mp5","ak47","m4","awp","m249"] as WeaponId[]).map((id) => {
                  const w = WEAPONS[id]; const owned = profile.owned.includes(id);
                  return <article key={id} className={cn("shop-card", owned && "owned")}><div><b>{w.name}</b><span>${w.price}</span></div><button disabled={owned} onClick={() => {
                    if (profile.credits < w.price) { setShopMsg("Need more credits"); return; }
                    setProfile((p)=>({...p, credits:p.credits-w.price, owned:[...p.owned,id]}));
                  }}>{owned?"Owned":`Buy ${w.price}`}</button></article>;
                })}
              </div>
            </section>
          )}
          {homeTab === "settings" && (
            <section className="pane">
              <label>Callsign</label>
              <input value={profile.name} maxLength={16} onChange={(e)=>patch({name:e.target.value.slice(0,16)})} />
              <label>Look sensitivity {profile.lookScale.toFixed(2)}x</label>
              <input type="range" min={0.4} max={2.4} step={0.05} value={profile.lookScale} onChange={(e)=>patch({lookScale:Number(e.target.value)})} />
              <label>Start money ${profile.startMoney}</label>
              <input type="range" min={400} max={4000} step={100} value={profile.startMoney} onChange={(e)=>patch({startMoney:Number(e.target.value)})} />
              <div className="row">
                <button className={cn("card", profile.invertY && "on")} onClick={()=>patch({invertY:!profile.invertY})}><b>{profile.invertY?"Y inverted":"Y normal"}</b></button>
                <button className={cn("card", profile.muted && "on")} onClick={()=>patch({muted:!profile.muted})}><b>{profile.muted?"Muted":"Sound on"}</b></button>
              </div>
            </section>
          )}
          <nav className="tabs three">{(["play","armory","settings"] as const).map((t)=>(<button key={t} className={cn(homeTab===t && "on")} onClick={()=>setHomeTab(t)}>{t}</button>))}</nav>
        </div>
      )}
      {screen === "setup" && (
        <div className="hq">
          <header className="topbar"><div><p className="kicker">New Game</p><h1>DEPLOY</h1></div><button className="ghost slim" onClick={()=>setScreen("home")}>Back</button></header>
          <section className="pane">
            <label>Mode</label>
            <div className="grid4">{MODES.map((m)=>(<button key={m} className={cn("card", mode===m && "on")} onClick={()=>setMode(m)}><b>{MODE_LABEL[m]}</b></button>))}</div>
            <p className="muted">{MODE_BLURB[mode]}</p>
            {mode!=="deathmatch" && mode!=="armsrace" && (
              <>
                <label>Team</label>
                <div className="row">
                  <button className={cn("team blue", team==="blue" && "on")} onClick={()=>{setTeam("blue"); patch({character:BLUE_CHARS[0]!});}}>Force</button>
                  <button className={cn("team red", team==="red" && "on")} onClick={()=>{setTeam("red"); patch({character:RED_CHARS[0]!});}}>Rogue</button>
                </div>
                <label>Character</label>
                <div className="grid4">{chars.map((c)=>(<button key={c} className={cn("card", profile.character===c && "on")} onClick={()=>patch({character:c})}><b>{c}</b></button>))}</div>
              </>
            )}
            <label>Map · {maps.length}</label>
            <div className="grid3 mapgrid">{maps.map((m)=>(<button key={m.id} className={cn("card", mapId===m.id && "on")} onClick={()=>setMapId(m.id)}><b>{m.name}</b><span>{m.code}</span></button>))}</div>
            <label>Bots {bots}</label>
            <input type="range" min={2} max={9} step={1} value={bots} onChange={(e)=>setBots(Number(e.target.value))} />
            <p className="muted">Spawn with a sidearm. Open BUY in-match to spend ${profile.startMoney}.</p>
            <button className="deploy" onClick={startSolo}>Start</button>
          </section>
        </div>
      )}
      {screen === "playing" && hud && (
        <Hud hud={hud} muted={profile.muted} buyOpen={buyOpen} shopTab={shopTab} onShopTab={setShopTab}
          onBuy={(id)=>{ const ok = window.__pulseBuy?.(id); setShopMsg(ok?"Purchased":"Not enough cash"); }}
          onToggleBuy={()=>{ setBuyOpen((v)=>!v); window.__pulseArena?.toggleShop?.(); }}
          onMuted={(v)=>patch({muted:v})} onLeave={()=>setScreen("home")} />
      )}
      {screen === "results" && (
        <div className="overlay"><div className="panel">
          <p className="kicker">Match over</p><h2>{winner ?? "Draw"}</h2>
          {reward && <p className="muted">+{reward.credits} credits · +{reward.xp} XP</p>}
          <ul>{hud?.board.map((p)=>(<li key={p.id}><span className={p.team}>{p.name}{p.bot?" · bot":""}</span><span>{Math.floor(p.score)}</span></li>))}</ul>
          <div className="row"><button className="deploy" onClick={startSolo}>Redeploy</button><button onClick={()=>setScreen("home")}>Menu</button></div>
        </div></div>
      )}
    </div>
  );
}
