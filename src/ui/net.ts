export type NetRole = "solo" | "host" | "member";
export type Party = {
  role: NetRole;
  code: string;
  ip: string;
  kind: "local" | "online";
  country: string;
};

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
