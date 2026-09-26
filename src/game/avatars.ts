import * as THREE from "three";
import type { Team } from "./types";

export function makeViewmodel() {
  const root = new THREE.Group();
  root.position.set(0.28, -0.22, -0.52);
  const gun = new THREE.Group();
  const dark = new THREE.MeshLambertMaterial({ color: 0x1c1d22 });
  const steel = new THREE.MeshLambertMaterial({ color: 0x8b909a });
  const glow = new THREE.MeshLambertMaterial({ color: 0xd4d8de, emissive: 0x8a909a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.42), dark);
  body.position.set(0, 0.02, 0.04);
  gun.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.38, 10), steel);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.04, -0.28);
  gun.add(barrel);
  const cell = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.12), glow);
  cell.position.set(0, 0.02, 0.02);
  gun.add(cell);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.16), dark);
  stock.position.set(0, -0.02, 0.26);
  gun.add(stock);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.08), steel);
  mag.position.set(0, -0.1, 0.04);
  gun.add(mag);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.06), steel);
  sight.position.set(0, 0.12, -0.08);
  gun.add(sight);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
  muzzle.name = "muzzle";
  muzzle.position.set(0, 0.04, -0.48);
  gun.add(muzzle);
  root.add(gun);
  root.userData.gun = gun;
  return root;
}

export function makeAvatar(team: Team, name: string) {
  const g = new THREE.Group();
  const bodyCol = team === "red" ? 0xb03a3a : 0x2f6ccc;
  const dark = new THREE.MeshLambertMaterial({ color: 0x1a1b20 });
  const paint = new THREE.MeshLambertMaterial({ color: bodyCol, emissive: team === "red" ? 0x2a0808 : 0x081228 });
  const visor = new THREE.MeshLambertMaterial({ color: 0xd4d8de, emissive: 0x667088 });
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.7, 8), dark);
  legs.position.y = 0.35; legs.castShadow = true; g.add(legs);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.7, 10), paint);
  torso.position.y = 1.0; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), dark);
  head.position.y = 1.48; head.castShadow = true; g.add(head);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.08), visor);
  glass.position.set(0, 1.5, -0.14); g.add(glass);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.1), dark);
  pack.position.set(0, 1.05, 0.22); g.add(pack);
  const tag = makeNameplate(name, team);
  tag.position.y = 1.85; g.add(tag);
  g.userData.nameplate = tag;
  return g;
}

function makeNameplate(name: string, team: Team) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgba(9,9,11,0.7)"; ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = team === "red" ? "#e24b4b" : "#3d8bff"; ctx.fillRect(0, 0, 8, 64);
  ctx.font = "600 28px sans-serif"; ctx.fillStyle = "#f1f2f4"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(name.slice(0, 14), 132, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  spr.scale.set(1.2, 0.3, 1);
  return spr;
}

export function spawnBurst(points: THREE.Points, x: number, y: number, z: number, color: number) {
  const pos = points.geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, x, y, z);
  pos.needsUpdate = true;
  points.visible = true;
  (points.material as THREE.PointsMaterial).color.setHex(color);
  (points.material as THREE.PointsMaterial).opacity = 1;
  points.userData.life = 0.45;
  const vel: number[] = [];
  for (let i = 0; i < pos.count; i++) vel.push((Math.random() - 0.5) * 6, Math.random() * 5, (Math.random() - 0.5) * 6);
  points.userData.vel = vel;
}

export function tickBursts(bursts: THREE.Points[], dt: number) {
  for (const p of bursts) {
    if (!p.visible) continue;
    p.userData.life -= dt;
    if (p.userData.life <= 0) { p.visible = false; continue; }
    const pos = p.geometry.getAttribute("position") as THREE.BufferAttribute;
    const vel = p.userData.vel as number[];
    for (let i = 0; i < pos.count; i++) {
      vel[i * 3 + 1] -= 8 * dt;
      pos.setXYZ(i, pos.getX(i) + vel[i * 3]! * dt, pos.getY(i) + vel[i * 3 + 1]! * dt, pos.getZ(i) + vel[i * 3 + 2]! * dt);
    }
    pos.needsUpdate = true;
    (p.material as THREE.PointsMaterial).opacity = Math.max(0, p.userData.life / 0.45);
  }
}
