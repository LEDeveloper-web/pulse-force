export type NetRole = "solo" | "host" | "member";
export type Party = {
  role: NetRole;
  code: string;
  ip: string;
  kind: "local" | "online";
  country: string;
};

export type PartyEvent =
  | { t: "hello"; name: string; party: Party }
  | { t: "end"; winner: string }
  | { t: "vote"; name: string; map: string }
  | { t: "pick-ready"; name: string }
  | { t: "start"; map: string; match: number }
  | { t: "phase"; phase: "vote" | "pick" | "play"; map?: string; match?: number }
  | { t: "bye"; reason: string };

const KEY = "pulse-force-party-v1";

export function loadParty(): Party {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") as Party | null;
    if (raw && raw.code) return raw;
  } catch { /* ignore */ }
  return { role: "solo", code: "", ip: "", kind: "local", country: "INT" };
}

export function saveParty(p: Party) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearParty() {
  localStorage.removeItem(KEY);
}

function roomCode() {
  return "HOST-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function detectHostIp(): Promise<string> {
  try {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.createDataChannel("pulse");
    const ips = new Set<string>();
    const done = new Promise<string>((resolve) => {
      const t = window.setTimeout(() => resolve([...ips][0] || ""), 1800);
      pc.onicecandidate = (ev) => {
        const c = ev.candidate?.candidate || "";
        const m = c.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
        if (m && m[1] && !m[1].startsWith("0.") && !m[1].startsWith("127.")) ips.add(m[1]);
        if (!ev.candidate) {
          window.clearTimeout(t);
          resolve([...ips].find((ip) => ip.startsWith("192.") || ip.startsWith("10.") || ip.startsWith("172.")) || [...ips][0] || "");
        }
      };
    });
    await pc.setLocalDescription(await pc.createOffer());
    const ip = await done;
    pc.close();
    return ip;
  } catch {
    return "";
  }
}

export async function hostParty(kind: "local" | "online", country = "INT"): Promise<Party> {
  const ip = await detectHostIp();
  const party: Party = { role: "host", code: roomCode(), ip: ip || "pending", kind, country };
  saveParty(party);
  return party;
}

export function joinParty(codeOrIp: string, kind: "local" | "online"): Party | null {
  const raw = codeOrIp.trim();
  if (!raw) return null;
  const party: Party = {
    role: "member",
    code: raw.toUpperCase().startsWith("HOST-") ? raw.toUpperCase() : raw,
    ip: raw,
    kind,
    country: "INT",
  };
  saveParty(party);
  return party;
}

function busName(party: Party) {
  const key = (party.ip || party.code || "solo").replace(/[^a-zA-Z0-9._-]/g, "_");
  return "pulse-force-bus-" + key;
}

export function openPartyBus(party: Party, onEvent: (ev: PartyEvent) => void) {
  if (!party.code && !party.ip) return { send: (_: PartyEvent) => {}, close: () => {} };
  let ch: BroadcastChannel | null = null;
  try {
    ch = new BroadcastChannel(busName(party));
    ch.onmessage = (m) => {
      if (m.data && typeof m.data === "object" && "t" in m.data) onEvent(m.data as PartyEvent);
    };
  } catch { /* ignore */ }
  return {
    send(ev: PartyEvent) {
      try { ch?.postMessage(ev); } catch { /* ignore */ }
    },
    close() {
      try { ch?.close(); } catch { /* ignore */ }
    },
  };
}
