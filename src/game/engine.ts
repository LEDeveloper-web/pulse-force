import * as THREE from "three";
import { GameAudio } from "./audio";
import { GameInput } from "./input";
import { EYE, HEIGHT, RADIUS, createWorld, makeAvatar, spawnBurst, tickBursts, type WorldHandle } from "./level";
import { getMap, inHill, inOwnBase, inZone, spawnPoint, type ArenaMap, type Solid } from "./maps";
import { GUNGAME_ORDER, getWeapon, type WeaponId } from "./weapons";
import type { Actor, DomSite, EngineConfig, FeedItem, FlagState, GameMode, HillState, HudState, Team } from "./types";
import { MATCH } from "./types";

const GRAVITY = 24, JUMP_VEL = 8.2, WALK = 7.5, SPRINT = 10.6, STEP = 1 / 60;
const BOT_NAMES = ["Nova", "Drift", "Echo", "Bolt", "Quartz", "Pico", "Kite", "Ridge"];
const LOADOUT: WeaponId[] = ["rifle", "smg", "shot", "pistol"];
const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _origin = new THREE.Vector3();
const _dir = new THREE.Vector3(), _hit = new THREE.Vector3(), _euler = new THREE.Euler();
const _quat = new THREE.Quaternion(), _unitZ = new THREE.Vector3(0, 0, 1), _look = new THREE.Vector3();

function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
function lerpAngle(a: number, b: number, t: number) {
  let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, t);
}
function lookDir(yaw: number, pitch: number, out: THREE.Vector3) {
  _euler.set(pitch, yaw, 0, "YXZ"); _quat.setFromEuler(_euler); out.set(0, 0, -1).applyQuaternion(_quat);
}
function moveBasis(yaw: number) { _fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); _right.set(Math.cos(yaw), 0, -Math.sin(yaw)); }
function circleHits(x: number, z: number, s: Solid, r: number) {
  const dx = x - clamp(x, s.minx, s.maxx), dz = z - clamp(z, s.minz, s.maxz);
  return dx * dx + dz * dz < r * r;
}
function rayAabb(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, s: Solid, maxT: number) {
  let tmin = 0, tmax = maxT;
  const orig = [ox, oy, oz], dir = [dx, dy, dz], min = [s.minx, s.miny, s.minz], max = [s.maxx, s.maxy, s.maxz];
  for (let i = 0; i < 3; i++) {
    const d = dir[i]!, o = orig[i]!;
    if (Math.abs(d) < 1e-8) { if (o < min[i]! || o > max[i]!) return Infinity; continue; }
    let t1 = (min[i]! - o) / d, t2 = (max[i]! - o) / d;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return Infinity;
  }
  return tmin >= 0 ? tmin : Infinity;
}
function rayCylinder(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, ax: number, ay: number, az: number, r: number, h: number) {
  const ex = ox - ax, ez = oz - az, a = dx * dx + dz * dz;
  if (a < 1e-8) return Infinity;
  const b = 2 * (ex * dx + ez * dz), c = ex * ex + ez * ez - r * r, disc = b * b - 4 * a * c;
  if (disc < 0) return Infinity;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  if (t < 0.05 || t > 80) return Infinity;
  const y = oy + dy * t;
  return y < ay || y > ay + h ? Infinity : t;
}
function makeActor(id: string, name: string, team: Team, isBot: boolean, isLocal: boolean, slot: number, map: ArenaMap, weapon: WeaponId): Actor {
  const sp = spawnPoint(map, team, slot), w = getWeapon(weapon);
  return { id, name, team, isBot, isLocal, x: sp.x, y: sp.y, z: sp.z, vx: 0, vy: 0, vz: 0, yaw: sp.yaw, pitch: 0, hp: 100, alive: true, respawn: 0, grounded: true, ammo: w.mag, reserve: w.reserve, cooldown: 0, reload: 0, score: 0, fireHeld: false, jumpHeld: false, sprint: false, moveX: 0, moveY: 0, flash: 0, bob: 0, stuck: 0, aiTarget: null, aiTimer: Math.random() * 0.4, carrying: null, weapon, wantSlot: 0 };
}

export class ArenaEngine {
  private world: WorldHandle;
  private input = new GameInput();
  private audio = new GameAudio();
  private cfg: EngineConfig;
  private map: ArenaMap;
  private actors: Actor[] = [];
  private flags: FlagState[] = [];
  private hill: HillState = { owner: "neutral", progress: 0, label: "MID" };
  private sites: DomSite[] = [];
  private hpIndex = 0;
  private hpTimer = 28;
  private streak = 0;
  private scores = { red: 0, blue: 0 };
  private timeLeft = MATCH.duration;
  private countdown = MATCH.countdown;
  private winner: string | null = null;
  private feed: FeedItem[] = [];
  private feedId = 1;
  private paused = false;
  private raf = 0;
  private acc = 0;
  private last = 0;
  private lastHud = 0;
  private lastStep = 0;
  private tick = 0;
  private shake = 0;
  private recoil = 0;
  private hudHitUntil = 0;
  private hudHurtUntil = 0;
  private tracerLife: number[] = [];
  private disposed = false;
  private dragLook = false;
  private lastPtr = { x: 0, y: 0 };

  constructor(cfg: EngineConfig) {
    this.cfg = cfg;
    const src = getMap(cfg.mapId);
    this.map = { ...src, hill: { ...src.hill } };
    this.world = createWorld(cfg.canvas, this.map);
    this.input.attach(cfg.canvas);
    this.flags = [
      { team: "red", x: this.map.flagHome.red.x, y: 0, z: this.map.flagHome.red.z, home: true, carrierId: null },
      { team: "blue", x: this.map.flagHome.blue.x, y: 0, z: this.map.flagHome.blue.z, home: true, carrierId: null },
    ];
    this.sites = this.map.points.map((pt) => ({ id: pt.id, owner: "neutral" as const }));
    this.hill.label = this.map.hardpoints[0]?.id ?? "MID";
    this.buildRoster();
    for (const a of this.actors) {
      if (a.isLocal) continue;
      const av = makeAvatar(a.team, a.name);
      this.world.avatars.set(a.id, av);
      this.world.scene.add(av);
    }
    this.tracerLife = this.world.tracers.map(() => 0);
    this.cfg.canvas.addEventListener("pointerdown", this.onPtrDown);
    window.addEventListener("pointermove", this.onPtrMove);
    window.addEventListener("pointerup", this.onPtrUp);
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  start() {
    this.audio.unlock();
    this.last = performance.now();
    const loop = (now: number) => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      this.frame(dt, now);
    };
    this.raf = requestAnimationFrame(loop);
    (window as any).__pulseArena = { started: true, mode: this.cfg.mode, setPaused: (v: boolean) => this.setPaused(v), setMuted: (v: boolean) => this.audio.setMuted(v) };
    this.emitHud();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.input.detach(this.cfg.canvas);
    window.removeEventListener("resize", this.resize);
    this.cfg.canvas.removeEventListener("pointerdown", this.onPtrDown);
    window.removeEventListener("pointermove", this.onPtrMove);
    window.removeEventListener("pointerup", this.onPtrUp);
    this.world.dispose();
  }

  setPaused(v: boolean) { this.paused = v; }
  setTouchMove(x: number, y: number) { this.input.touchMoveX = x; this.input.touchMoveY = y; }
  setTouchFire(v: boolean) { this.input.fireHeld = v; }
  queueJump() { this.input.queuedJump = true; }
  addLook(dx: number, dy: number) { this.input.addLook(dx, dy); }
  unlockAudio() { this.audio.unlock(); }

  private buildRoster() {
    const cfg = this.cfg;
    const localTeam = cfg.mode === "inf" ? "blue" : cfg.team;
    this.actors.push(makeActor(cfg.selfId, cfg.playerName, localTeam, false, true, 0, this.map, cfg.mode === "gg" ? GUNGAME_ORDER[0]! : cfg.weapon || "rifle"));
    let redN = localTeam === "red" ? 1 : 0, blueN = localTeam === "blue" ? 1 : 0;
    for (let i = 0; i < 7; i++) {
      const team: Team = cfg.mode === "ffa" ? (i % 2 === 0 ? "red" : "blue") : redN <= blueN ? (redN++, "red") : (blueN++, "blue");
      const w = cfg.mode === "gg" ? GUNGAME_ORDER[0]! : LOADOUT[i % 3]!;
      this.actors.push(makeActor(`bot-${i}`, BOT_NAMES[i % BOT_NAMES.length]!, team, true, false, team === "red" ? redN : blueN, this.map, w));
    }
    if (cfg.mode === "inf") {
      const bot = this.actors.find((a) => a.isBot);
      if (bot) { bot.team = "red"; this.pushFeed(`${bot.name} is the starter hunter`); }
    }
  }

  private resize = () => {
    const canvas = this.cfg.canvas, parent = canvas.parentElement;
    const w = parent?.clientWidth || window.innerWidth, h = parent?.clientHeight || window.innerHeight;
    this.world.renderer.setSize(w, h, false);
    this.world.camera.aspect = w / Math.max(1, h);
    this.world.camera.updateProjectionMatrix();
    this.world.overlayCam.aspect = this.world.camera.aspect;
    this.world.overlayCam.updateProjectionMatrix();
  };
  private onPtrDown = (e: PointerEvent) => {
    if (this.input.locked || e.pointerType === "touch") return;
    this.dragLook = true; this.lastPtr = { x: e.clientX, y: e.clientY };
  };
  private onPtrMove = (e: PointerEvent) => {
    if (!this.dragLook || this.input.locked) return;
    this.input.addLook(e.clientX - this.lastPtr.x, e.clientY - this.lastPtr.y);
    this.lastPtr = { x: e.clientX, y: e.clientY };
  };
  private onPtrUp = () => { this.dragLook = false; };

  private frame(dt: number, now: number) {
    this.input.update();
    if (this.input.pausePressed) this.paused = !this.paused;
    if (this.paused && !this.winner) { this.render(dt); this.emitHud(); return; }
    this.acc += dt;
    while (this.acc >= STEP) { this.acc -= STEP; this.fixed(STEP); }
    this.render(dt);
    if (now - this.lastHud > 50) { this.lastHud = now; this.emitHud(); }
  }

  private local() { return this.actors.find((a) => a.isLocal) ?? this.actors[0]!; }

  private fixed(dt: number) {
    this.tick++;
    if (this.winner) return;
    if (this.countdown > 0) this.countdown = Math.max(0, this.countdown - dt);
    else this.timeLeft = Math.max(0, this.timeLeft - dt);
    const me = this.local();
    const look = this.input.sampleLook();
    me.yaw -= look.dx * this.input.sens;
    me.pitch = clamp(me.pitch - look.dy * this.input.sens, -1.35, 1.35);
    me.moveX = this.input.moveX; me.moveY = this.input.moveY;
    me.fireHeld = this.input.fire;
    me.jumpHeld = this.input.jumpPressed || (this.input.jump && me.grounded);
    me.sprint = this.input.sprint;
    if (this.input.reloadPressed) this.startReload(me);
    this.applyWeaponInput(me, this.input.slot, this.input.nextPressed);
    for (const a of this.actors) {
      if (a.isBot) this.thinkBot(a, dt);
      if (!a.alive) { a.respawn -= dt; if (a.respawn <= 0) this.respawn(a); continue; }
      this.integrate(a, dt);
      this.tryFire(a);
      if (a.reload > 0) {
        a.reload -= dt;
        if (a.reload <= 0) {
          const need = getWeapon(a.weapon).mag - a.ammo;
          const got = Math.min(need, a.reserve);
          a.ammo += got; a.reserve -= got;
        }
      }
      a.cooldown = Math.max(0, a.cooldown - dt);
      a.flash = Math.max(0, a.flash - dt);
    }
    if (this.cfg.mode === "ctf") this.tickCtf();
    if (this.cfg.mode === "koth") this.tickHill(dt);
    if (this.cfg.mode === "dom") this.tickDom(dt);
    if (this.cfg.mode === "hp") this.tickHardpoint(dt);
    this.checkWin();
  }

  private integrate(a: Actor, dt: number) {
    moveBasis(a.yaw);
    const speed = (a.sprint ? SPRINT : WALK) * getWeapon(a.weapon).move;
    const k = (a.grounded ? 14 : 5) * dt;
    a.vx += ((_right.x * a.moveX + _fwd.x * a.moveY) * speed - a.vx) * Math.min(1, k);
    a.vz += ((_right.z * a.moveX + _fwd.z * a.moveY) * speed - a.vz) * Math.min(1, k);
    if (a.grounded && a.jumpHeld) { a.vy = JUMP_VEL; a.grounded = false; }
    a.jumpHeld = false;
    a.vy -= GRAVITY * dt;
    const prevY = a.y;
    a.y += a.vy * dt; a.grounded = false;
    if (a.y <= 0) { a.y = 0; a.vy = 0; a.grounded = true; }
    for (const s of this.map.solids) {
      if (!circleHits(a.x, a.z, s, RADIUS * 0.92)) continue;
      if (prevY >= s.maxy - 0.12 && a.y <= s.maxy && a.vy <= 0.4) { a.y = s.maxy; a.vy = 0; a.grounded = true; }
      else if (a.vy > 0 && prevY + HEIGHT <= s.miny + 0.04 && a.y + HEIGHT > s.miny) { a.y = s.miny - HEIGHT; a.vy = 0; }
    }
    a.x += a.vx * dt; a.z += a.vz * dt;
    this.resolveXZ(a);
    a.x = clamp(a.x, -this.map.size + 0.5, this.map.size - 0.5);
    a.z = clamp(a.z, -this.map.size + 0.5, this.map.size - 0.5);
    if (a.y < -2) this.respawn(a);
    const spd = Math.hypot(a.vx, a.vz);
    if (a.moveX || a.moveY) { a.bob += spd * dt; a.stuck = spd < 0.4 ? a.stuck + dt : 0; } else a.stuck = 0;
    if (a.isLocal && a.grounded && spd > 2.5) {
      this.lastStep += dt;
      if (this.lastStep > (a.sprint ? 0.3 : 0.4)) { this.lastStep = 0; this.audio.step(); }
    }
  }

  private resolveXZ(a: Actor) {
    for (const s of this.map.solids) {
      if (a.y + 0.18 >= s.maxy || a.y + HEIGHT <= s.miny) continue;
      const cx = clamp(a.x, s.minx, s.maxx), cz = clamp(a.z, s.minz, s.maxz);
      let dx = a.x - cx, dz = a.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= RADIUS * RADIUS && !(a.x > s.minx && a.x < s.maxx && a.z > s.minz && a.z < s.maxz)) continue;
      const stepH = s.maxy - a.y;
      if (stepH > 0.02 && stepH < 0.42 && a.vy <= 0.6) { a.y = s.maxy; a.vy = 0; a.grounded = true; continue; }
      if (d2 < 1e-8) {
        const left = a.x - s.minx, right = s.maxx - a.x, back = a.z - s.minz, fwd = s.maxz - a.z;
        const m = Math.min(left, right, back, fwd);
        if (m === left) a.x = s.minx - RADIUS; else if (m === right) a.x = s.maxx + RADIUS;
        else if (m === back) a.z = s.minz - RADIUS; else a.z = s.maxz + RADIUS;
      } else {
        const d = Math.sqrt(d2), push = (RADIUS - d) / d + 0.001;
        a.x += dx * push; a.z += dz * push;
      }
    }
  }

  private startReload(a: Actor) {
    const w = getWeapon(a.weapon);
    if (a.reload > 0 || a.ammo >= w.mag || a.reserve <= 0) return;
    a.reload = w.reload; if (a.isLocal) this.audio.reload();
  }
  private applyWeaponInput(a: Actor, slot: number, next: boolean) {
    if (this.cfg.mode === "gg") return;
    if (next) this.equip(a, LOADOUT[(Math.max(0, LOADOUT.indexOf(a.weapon)) + 1) % LOADOUT.length]!);
    else if (slot >= 1 && slot <= LOADOUT.length) this.equip(a, LOADOUT[slot - 1]!);
  }
  private equip(a: Actor, id: WeaponId) {
    if (a.weapon === id) return;
    a.weapon = id; const w = getWeapon(id);
    a.ammo = w.mag; a.reserve = Math.max(a.reserve, w.reserve); a.reload = 0.2; a.cooldown = 0.18;
  }

  private tryFire(a: Actor) {
    if (this.countdown > 0 || !a.alive || !a.fireHeld || a.reload > 0 || a.cooldown > 0) return;
    const w = getWeapon(a.weapon);
    if (a.ammo <= 0) { if (a.isLocal) { this.audio.empty(); a.cooldown = 0.25; this.startReload(a); } return; }
    a.ammo -= 1; a.cooldown = w.fireCd; a.flash = 0.07;
    if (a.isLocal) { this.audio.fire(); this.recoil += w.recoil; this.shake = Math.max(this.shake, w.recoil * 1.6); }
    lookDir(a.yaw, a.pitch, _dir); _origin.set(a.x, a.y + EYE, a.z);
    for (let n = 0; n < w.pellets; n++) {
      const dir = _dir.clone();
      const spr = w.spread * (a.sprint ? 1.6 : 1) * (Math.random() - 0.5);
      dir.x += spr; dir.y += spr * 0.5; dir.z += spr; dir.normalize();
      const hit = this.hitscan(_origin, dir, a.id, w.range);
      _hit.copy(_origin).addScaledVector(dir, hit.t);
      if (n === 0) this.spawnTracer(_origin, _hit, a.team);
      if (hit.actor) this.hurt(hit.actor, a, w.damage);
    }
  }

  private hitscan(origin: THREE.Vector3, dir: THREE.Vector3, selfId: string, range = 70) {
    let best = range, actor: Actor | null = null;
    for (const s of this.map.solids) { const t = rayAabb(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, s, best); if (t < best) { best = t; actor = null; } }
    for (const o of this.actors) {
      if (!o.alive || o.id === selfId) continue;
      const t = rayCylinder(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, o.x, o.y, o.z, 0.42, HEIGHT);
      if (t < best) { best = t; actor = o; }
    }
    return { t: best, actor };
  }
  private los(a: Actor, b: Actor) {
    _origin.set(a.x, a.y + EYE, a.z);
    _dir.set(b.x - a.x, b.y + 1.1 - (a.y + EYE), b.z - a.z);
    const dist = _dir.length(); if (dist < 0.2) return true; _dir.multiplyScalar(1 / dist);
    for (const s of this.map.solids) if (rayAabb(_origin.x, _origin.y, _origin.z, _dir.x, _dir.y, _dir.z, s, dist) < dist - 0.4) return false;
    return true;
  }
  private isEnemy(a: Actor, b: Actor) {
    if (a.id === b.id) return false;
    if (this.cfg.mode === "ffa" || this.cfg.mode === "gg") return true;
    return a.team !== b.team;
  }

  private hurt(target: Actor, from: Actor, dmg: number) {
    if (!this.isEnemy(from, target) || !target.alive) return;
    target.hp -= dmg;
    if (from.isLocal) { this.hudHitUntil = performance.now() + 180; this.audio.hit(); }
    if (target.isLocal) { this.hudHurtUntil = performance.now() + 280; this.shake = 0.22; this.audio.hurt(); }
    if (target.hp > 0) return;
    target.hp = 0; target.alive = false; target.respawn = MATCH.respawn; from.score += 1;
    if (from.isLocal) this.streak += 1; if (target.isLocal) this.streak = 0;
    if (["tdm", "ctf", "koth", "dom", "hp"].includes(this.cfg.mode)) this.scores[from.team] += 1;
    if (this.cfg.mode === "gg") this.equip(from, GUNGAME_ORDER[Math.min(from.score, GUNGAME_ORDER.length - 1)]!);
    if (this.cfg.mode === "inf" && from.team === "red" && target.team === "blue") { target.team = "red"; this.pushFeed(`${target.name} joined the hunt`); }
    if (target.carrying) {
      const flag = this.flags.find((f) => f.team === target.carrying);
      if (flag) { flag.carrierId = null; flag.x = target.x; flag.y = 0; flag.z = target.z; flag.home = false; }
      target.carrying = null;
    }
    this.pushFeed(`${from.name} tagged ${target.name}`);
    this.audio.tag();
    const burst = this.world.bursts.find((p) => !p.visible) ?? this.world.bursts[0]!;
    spawnBurst(burst, target.x, target.y + 1, target.z, target.team === "red" ? 0xe24b4b : 0x3d8bff);
  }

  private respawn(a: Actor) {
    const slot = this.actors.filter((p) => p.team === a.team).indexOf(a);
    const sp = spawnPoint(this.map, a.team, Math.max(0, slot));
    a.x = sp.x; a.y = 0; a.z = sp.z; a.yaw = sp.yaw; a.pitch = 0; a.vx = a.vy = a.vz = 0;
    a.hp = 100; a.alive = true; a.ammo = getWeapon(a.weapon).mag; a.cooldown = 0.4; a.reload = 0; a.carrying = null;
  }

  private thinkBot(a: Actor, dt: number) {
    if (!a.alive) return;
    const enemies = this.actors.filter((o) => o.alive && this.isEnemy(a, o));
    let destX = a.x, destZ = a.z, focus: Actor | null = null, best = 1e9;
    for (const e of enemies) { const d = Math.hypot(e.x - a.x, e.z - a.z); if (d < best) { best = d; focus = e; } }
    if (this.cfg.mode === "ctf") {
      if (a.carrying) { destX = this.map.flagHome[a.team].x; destZ = this.map.flagHome[a.team].z; }
      else { const enemyFlag = this.flags.find((f) => f.team !== a.team); if (enemyFlag && !enemyFlag.carrierId) { destX = enemyFlag.x; destZ = enemyFlag.z; } else if (focus) { destX = focus.x; destZ = focus.z; } }
    } else if ((this.cfg.mode === "koth" || this.cfg.mode === "hp") && !inHill(this.map, a.x, a.y, a.z)) { destX = this.map.hill.x; destZ = this.map.hill.z; }
    else if (this.cfg.mode === "dom") { const open = this.map.points[this.tick % this.map.points.length]!; destX = open.x; destZ = open.z; }
    else if (focus) { destX = focus.x; destZ = focus.z; }
    const dx = destX - a.x, dz = destZ - a.z, dist = Math.hypot(dx, dz);
    a.yaw = lerpAngle(a.yaw, Math.atan2(-dx, -dz), 3.6 * dt);
    if (focus) {
      const fx = focus.x - a.x, fy = focus.y + 1.15 - (a.y + EYE), fz = focus.z - a.z, hyp = Math.hypot(fx, fy, fz) || 1;
      a.pitch = lerpAngle(a.pitch, Math.asin(clamp(fy / hyp, -0.7, 0.7)), 3 * dt);
    }
    a.moveY = dist > 1.4 ? 1 : dist > 0.5 ? 0.35 : 0;
    a.moveX = Math.sin(this.tick * 0.07 + a.x) * 0.4;
    a.sprint = dist > 7; a.jumpHeld = a.stuck > 0.45; a.fireHeld = false;
    if (focus && dist < 38 && this.los(a, focus) && Math.abs(lerpAngle(a.yaw, Math.atan2(-(focus.x - a.x), -(focus.z - a.z)), 1) - a.yaw) < 0.22) a.fireHeld = true;
    if (a.ammo <= 4 && a.reload <= 0) this.startReload(a);
  }

  private tickCtf() {
    for (const a of this.actors) {
      if (!a.alive) continue;
      for (const flag of this.flags) {
        if (flag.carrierId || Math.hypot(a.x - flag.x, a.z - flag.z) > 1.45) continue;
        if (flag.team === a.team) {
          if (!flag.home) { flag.x = this.map.flagHome[flag.team].x; flag.y = 0; flag.z = this.map.flagHome[flag.team].z; flag.home = true; this.pushFeed(`${a.name} returned the ${flag.team} flag`); this.audio.pickup(); }
        } else if (!a.carrying) { flag.carrierId = a.id; flag.home = false; a.carrying = flag.team; this.pushFeed(`${a.name} took the ${flag.team} flag`); this.audio.pickup(); }
      }
      if (a.carrying && inOwnBase(this.map, a.x, a.z, a.team)) {
        const own = this.flags.find((f) => f.team === a.team);
        if (own?.home) {
          this.scores[a.team] += 1; a.score += 1;
          const held = this.flags.find((f) => f.team === a.carrying);
          if (held) { held.carrierId = null; held.home = true; held.x = this.map.flagHome[held.team].x; held.y = 0; held.z = this.map.flagHome[held.team].z; }
          a.carrying = null; this.pushFeed(`${a.name} captured a flag`); this.audio.cap();
        }
      }
    }
    for (const flag of this.flags) {
      if (!flag.carrierId) continue;
      const c = this.actors.find((p) => p.id === flag.carrierId);
      if (!c || !c.alive) { flag.carrierId = null; continue; }
      flag.x = c.x; flag.y = c.y; flag.z = c.z;
    }
  }

  private tickHill(dt: number) {
    const on = this.actors.filter((a) => a.alive && inHill(this.map, a.x, a.y, a.z));
    const red = on.some((a) => a.team === "red"), blue = on.some((a) => a.team === "blue");
    if (red && blue) this.hill.owner = "contested";
    else if (red) this.hill.owner = "red";
    else if (blue) this.hill.owner = "blue";
    else this.hill.owner = this.hill.owner === "contested" ? "neutral" : this.hill.owner;
    if (this.hill.owner === "red" || this.hill.owner === "blue") {
      this.scores[this.hill.owner] += dt * 2.2;
      this.hill.progress = (this.scores[this.hill.owner] / MATCH.kothLimit) * 100;
    }
  }
  private tickDom(dt: number) {
    for (let i = 0; i < this.map.points.length; i++) {
      const z = this.map.points[i]!, site = this.sites[i]; if (!site) continue;
      const on = this.actors.filter((a) => a.alive && inZone(a.x, a.z, z));
      const red = on.some((a) => a.team === "red"), blue = on.some((a) => a.team === "blue");
      if (red && blue) site.owner = "contested"; else if (red) site.owner = "red"; else if (blue) site.owner = "blue";
      if (site.owner === "red" || site.owner === "blue") this.scores[site.owner] += dt * 1.6;
    }
    const held = this.sites.filter((s) => s.owner === "red" || s.owner === "blue");
    this.hill.owner = held.length === 0 ? "neutral" : held.every((s) => s.owner === held[0]!.owner) ? held[0]!.owner : "contested";
    this.hill.label = this.sites.map((s) => `${s.id}${s.owner === "red" ? "R" : s.owner === "blue" ? "B" : "-"}`).join(" ");
  }
  private tickHardpoint(dt: number) {
    this.hpTimer -= dt;
    if (this.hpTimer <= 0) {
      this.hpIndex = (this.hpIndex + 1) % Math.max(1, this.map.hardpoints.length);
      this.hpTimer = 28;
      const z = this.map.hardpoints[this.hpIndex]!;
      this.map.hill = { x: z.x, y: 0, z: z.z, r: z.r };
      this.world.hillGlow.position.set(z.x, 0.16, z.z);
      this.hill.label = z.id;
      this.pushFeed(`Hardpoint moves to ${z.id}`);
    }
    this.tickHill(dt);
  }

  private checkWin() {
    if (this.winner) return;
    const mode = this.cfg.mode;
    let win: string | null = null;
    if (mode === "ffa" || mode === "gg") {
      const top = [...this.actors].sort((a, b) => b.score - a.score)[0];
      const limit = mode === "gg" ? MATCH.ggLimit : MATCH.ffaLimit;
      if (top && (top.score >= limit || (this.timeLeft <= 0 && this.countdown <= 0))) win = top.name;
    } else if (mode === "inf") {
      if (!this.actors.some((a) => a.team === "blue")) win = "Hunters";
      else if (this.timeLeft <= 0 && this.countdown <= 0) win = "Survivors";
    } else {
      const limit = mode === "tdm" ? MATCH.tdmLimit : mode === "ctf" ? MATCH.ctfLimit : mode === "dom" ? MATCH.domLimit : mode === "hp" ? MATCH.hpLimit : MATCH.kothLimit;
      if (this.scores.red >= limit) win = "Red Team";
      else if (this.scores.blue >= limit) win = "Blue Team";
      else if (this.timeLeft <= 0 && this.countdown <= 0) win = this.scores.red === this.scores.blue ? "Draw" : this.scores.red > this.scores.blue ? "Red Team" : "Blue Team";
    }
    if (win) { this.winner = win; this.audio.win(); this.cfg.onMatchEnd(win); }
  }

  private pushFeed(text: string) { this.feed.unshift({ id: this.feedId++, text, at: performance.now() }); this.feed = this.feed.slice(0, 5); }
  private spawnTracer(from: THREE.Vector3, to: THREE.Vector3, team: Team) {
    const idx = Math.max(0, this.world.tracers.findIndex((_, i) => this.tracerLife[i]! <= 0));
    const tr = this.world.tracers[idx]!;
    _look.copy(to).sub(from);
    const len = Math.max(0.4, _look.length());
    tr.position.copy(from).addScaledVector(_look.normalize(), len * 0.5);
    tr.quaternion.setFromUnitVectors(_unitZ, _look);
    tr.scale.set(1, 1, len); tr.visible = true;
    const mat = tr.material as THREE.MeshBasicMaterial;
    mat.color.setHex(team === "red" ? 0xff8a8a : 0x9ec1ff); mat.opacity = 0.95;
    this.tracerLife[idx] = 0.08;
  }

  private render(dt: number) {
    const me = this.local(), cam = this.world.camera;
    this.recoil *= Math.pow(0.001, dt); this.shake *= Math.pow(0.0002, dt);
    const bobY = me.alive && me.grounded ? Math.sin(me.bob * 9) * Math.min(0.05, Math.hypot(me.vx, me.vz) * 0.008) : 0;
    cam.position.set(me.x + (Math.random() - 0.5) * this.shake, me.y + EYE + bobY, me.z);
    _euler.set(me.pitch + this.recoil, me.yaw, 0, "YXZ"); cam.quaternion.setFromEuler(_euler);
    const gun = this.world.viewmodel.userData.gun as THREE.Group;
    this.world.viewmodel.position.set(0.28 + me.moveX * 0.02, -0.22 + bobY * 1.4, -0.52);
    gun.rotation.x = this.recoil * 1.8 + (me.reload > 0 ? 0.55 : 0);
    (this.world.muzzle.material as THREE.MeshBasicMaterial).opacity = me.flash > 0 ? 0.9 : 0;
    for (let i = 0; i < this.world.tracers.length; i++) {
      this.tracerLife[i] = Math.max(0, this.tracerLife[i]! - dt);
      const tr = this.world.tracers[i]!;
      (tr.material as THREE.MeshBasicMaterial).opacity = this.tracerLife[i]! * 10;
      tr.visible = this.tracerLife[i]! > 0;
    }
    tickBursts(this.world.bursts, dt);
    for (const a of this.actors) {
      const av = this.world.avatars.get(a.id); if (!av) continue;
      av.visible = a.alive && !a.isLocal; av.position.set(a.x, a.y, a.z); av.rotation.y = a.yaw + Math.PI;
      (av.userData.nameplate as THREE.Sprite | undefined)?.lookAt(cam.position);
    }
    for (const team of ["red", "blue"] as const) {
      const flag = this.flags.find((f) => f.team === team)!, mesh = this.world.flags[team];
      mesh.position.set(flag.x, flag.y + (flag.carrierId ? 2.05 : 0), flag.z);
      mesh.visible = !flag.carrierId || flag.carrierId !== me.id;
    }
    const glow = this.world.hillGlow.material as THREE.MeshBasicMaterial;
    glow.color.setHex(this.hill.owner === "red" ? 0xe24b4b : this.hill.owner === "blue" ? 0x3d8bff : this.hill.owner === "contested" ? 0xd4d8de : 0x6a6a74);
    glow.opacity = this.hill.owner === "neutral" ? 0.22 : 0.5;
    const r = this.world.renderer; r.autoClear = true; r.render(this.world.scene, cam); r.autoClear = false; r.clearDepth(); r.render(this.world.overlay, this.world.overlayCam); r.autoClear = true;
  }

  private emitHud() {
    const me = this.local();
    this.cfg.onHud({
      hp: me.hp, ammo: me.ammo, reserve: me.reserve, reloading: me.reload > 0, team: me.team, mode: this.cfg.mode,
      scores: { red: this.scores.red, blue: this.scores.blue }, personal: me.score, timeLeft: this.timeLeft, countdown: this.countdown,
      alive: me.alive, respawnIn: me.respawn, hitUntil: this.hudHitUntil, hurtUntil: this.hudHurtUntil,
      message: this.winner ? `${this.winner} wins` : this.countdown > 0 ? String(Math.ceil(this.countdown)) : "",
      carrying: me.carrying, hill: this.hill, sites: this.sites, feed: this.feed,
      board: this.actors.map((a) => ({ id: a.id, name: a.name, team: a.team, score: a.score, bot: a.isBot })).sort((a, b) => b.score - a.score),
      locked: this.input.locked, paused: this.paused, winner: this.winner, looking: this.dragLook || this.input.locked,
      weapon: me.weapon, weaponName: getWeapon(me.weapon).name, mapName: this.map.name, streak: this.streak,
    });
  }
}
