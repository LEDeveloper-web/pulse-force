import * as THREE from "three";
import type { Team } from "./types";
import type { ArenaMap, Solid } from "./maps";
import { MAPS } from "./maps";

export type { Solid } from "./maps";
export { spawnPoint, inHill, inOwnBase, getMap, MAPS, MAP_LIST } from "./maps";

export const ARENA = 22;
export const EYE = 1.48;
export const RADIUS = 0.38;
export const HEIGHT = 1.62;
export const SOLIDS = (MAPS.room ?? Object.values(MAPS)[0]!).solids;
function gridTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#9aa0aa";
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#c4c8d0";
  g.lineWidth = 2;
  for (let i = 0; i <= 512; i += 32) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 512);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i);
    g.lineTo(512, i);
    g.stroke();
  }
  g.strokeStyle = "#3a3a44";
  g.lineWidth = 3;
  g.strokeRect(8, 8, 496, 496);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export type WorldHandle = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  overlay: THREE.Scene;
  overlayCam: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  viewmodel: THREE.Group;
  muzzle: THREE.Mesh;
  tracers: THREE.Mesh[];
  bursts: THREE.Points[];
  avatars: Map<string, THREE.Group>;
  flags: { red: THREE.Group; blue: THREE.Group };
  hillGlow: THREE.Mesh;
  dispose: () => void;
};

export function createWorld(canvas: HTMLCanvasElement, map: ArenaMap = MAPS.room): WorldHandle {
  const scene = new THREE.Scene();
  const size = map.size;
  const sky = new THREE.Color(map.bg).lerp(new THREE.Color(0x8aa0b8), 0.55);
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 22, Math.max(36, map.fogFar));

  const camera = new THREE.PerspectiveCamera(80, 1, 0.05, 120);
  const overlay = new THREE.Scene();
  const overlayCam = new THREE.PerspectiveCamera(70, 1, 0.05, 10);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = true;

  const hemi = new THREE.HemisphereLight(0xd8e4f4, 0x4a3a28, 1.35);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.85);
  sun.position.set(12, 22, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -28;
  sun.shadow.camera.right = 28;
  sun.shadow.camera.top = 28;
  sun.shadow.camera.bottom = -28;
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 60;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xc8c8d0, 0.85));

  const redLight = new THREE.PointLight(0xe24b4b, 18, 16, 2);
  redLight.position.set(map.flagHome.red.x, 3.2, map.flagHome.red.z);
  scene.add(redLight);
  const blueLight = new THREE.PointLight(0x3d8bff, 18, 16, 2);
  blueLight.position.set(map.flagHome.blue.x, 3.2, map.flagHome.blue.z);
  scene.add(blueLight);
  const hillLight = new THREE.PointLight(0xd4d8de, 10, 12, 2);
  hillLight.position.set(0, 3.4, 0);
  scene.add(hillLight);

  const floorTex = gridTexture();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(size * 2 + 4, size * 2 + 4),
    new THREE.MeshLambertMaterial({ map: floorTex, color: map.floor }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const redZone = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 8),
    new THREE.MeshLambertMaterial({ color: 0x5a1c1c, transparent: true, opacity: 0.55 }),
  );
  redZone.rotation.x = -Math.PI / 2;
  redZone.position.set(map.flagHome.red.x, 0.02, map.flagHome.red.z);
  scene.add(redZone);
  const blueZone = redZone.clone();
  (blueZone.material as THREE.MeshLambertMaterial).color.set(0x163056);
  blueZone.position.set(map.flagHome.blue.x, 0.02, map.flagHome.blue.z);
  scene.add(blueZone);

  const mats: Record<Solid["kind"], THREE.MeshLambertMaterial> = {
    wall: new THREE.MeshLambertMaterial({ color: 0x6e7380 }),
    crate: new THREE.MeshLambertMaterial({ color: 0x8a6a48 }),
    hill: new THREE.MeshLambertMaterial({ color: 0x7a808c }),
    base: new THREE.MeshLambertMaterial({ color: 0x888890 }),
    trim: new THREE.MeshLambertMaterial({ color: 0xd4d8de }),
  };
  const redMat = new THREE.MeshLambertMaterial({ color: 0xe24b4b, emissive: 0x4a1010 });
  const blueMat = new THREE.MeshLambertMaterial({ color: 0x3d8bff, emissive: 0x102040 });

  for (const s of map.solids) {
    const w = s.maxx - s.minx;
    const h = s.maxy - s.miny;
    const d = s.maxz - s.minz;
    const geo = new THREE.BoxGeometry(w, h, d);
    let mat: THREE.Material = mats[s.kind];
    if (s.kind === "base" && s.team === "red") mat = redMat;
    if (s.kind === "base" && s.team === "blue") mat = blueMat;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((s.minx + s.maxx) / 2, (s.miny + s.maxy) / 2, (s.minz + s.maxz) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  const hillGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.2, 0.08, 32),
    new THREE.MeshBasicMaterial({ color: 0xd4d8de, transparent: true, opacity: 0.35 }),
  );
  hillGlow.position.set(map.hill.x, Math.max(0.12, map.hill.y + 0.08), map.hill.z);
  scene.add(hillGlow);

  function makeFlag(team: Team) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8),
      new THREE.MeshLambertMaterial({ color: 0x9aa0aa }),
    );
    pole.position.y = 1.3;
    pole.castShadow = true;
    g.add(pole);
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.55),
      new THREE.MeshLambertMaterial({
        color: team === "red" ? 0xe24b4b : 0x3d8bff,
        side: THREE.DoubleSide,
        emissive: team === "red" ? 0x3a0808 : 0x081430,
      }),
    );
    cloth.position.set(0.48, 2.15, 0);
    g.add(cloth);
    const home = map.flagHome[team];
    g.position.set(home.x, home.y, home.z);
    scene.add(g);
    return g;
  }

  const flags = { red: makeFlag("red"), blue: makeFlag("blue") };

  const viewmodel = makeViewmodel();
  overlay.add(viewmodel);
  const muzzle = viewmodel.getObjectByName("muzzle") as THREE.Mesh;

  const tracers: THREE.Mesh[] = [];
  const tracerGeo = new THREE.BoxGeometry(0.04, 0.04, 1);
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(
      tracerGeo,
      new THREE.MeshBasicMaterial({ color: 0xf4f6fa, transparent: true, opacity: 0 }),
    );
    m.visible = false;
    scene.add(m);
    tracers.push(m);
  }

  const bursts: THREE.Points[] = [];
  const burstGeo = new THREE.BufferGeometry();
  const burstCount = 18;
  burstGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(burstCount * 3), 3));
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Points(
      burstGeo.clone(),
      new THREE.PointsMaterial({ color: 0xd4d8de, size: 0.12, transparent: true, opacity: 0 }),
    );
    p.visible = false;
    scene.add(p);
    bursts.push(p);
  }

  const disposables: THREE.Object3D[] = [];

  function dispose() {
    floorTex.dispose();
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
    overlay.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
    for (const d of disposables) {
      void d;
    }
  }

  return {
    scene,
    camera,
    overlay,
    overlayCam,
    renderer,
    viewmodel,
    muzzle,
    tracers,
    bursts,
    avatars: new Map(),
    flags,
    hillGlow,
    dispose,
  };
}
