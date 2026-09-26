export type Account = {
  id: string;
  email: string;
  pass: string;
  name: string;
};

const USERS = "pulse-force-users-v1";
const SESSION = "pulse-force-session-user-v1";

function norm(email: string) {
  return email.trim().toLowerCase();
}

export function makeId(email: string) {
  const s = norm(email);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return "PF-" + (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function loadUsers(): Account[] {
  try {
    const raw = JSON.parse(localStorage.getItem(USERS) || "[]") as Account[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveUsers(list: Account[]) {
  localStorage.setItem(USERS, JSON.stringify(list));
}

export function currentAccount(): Account | null {
  try {
    const id = localStorage.getItem(SESSION);
    if (!id) return null;
    return loadUsers().find((u) => u.id === id) ?? null;
  } catch {
    return null;
  }
}

export function signUp(email: string, password: string, name: string) {
  const e = norm(email);
  if (!e.includes("@") || password.length < 4) return { ok: false, error: "Email and password (4+) required" };
  const users = loadUsers();
  if (users.some((u) => u.email === e)) return { ok: false, error: "Email already used" };
  const acc: Account = { id: makeId(e), email: e, pass: password, name: name.slice(0, 16) || e.split("@")[0]! };
  saveUsers([...users, acc]);
  localStorage.setItem(SESSION, acc.id);
  return { ok: true, account: acc };
}

export function signIn(email: string, password: string) {
  const acc = loadUsers().find((u) => u.email === norm(email) && u.pass === password);
  if (!acc) return { ok: false, error: "Wrong email or password" };
  localStorage.setItem(SESSION, acc.id);
  return { ok: true, account: acc };
}

export function signOut() {
  localStorage.removeItem(SESSION);
}

export function renameAccount(name: string) {
  const cur = currentAccount();
  if (!cur) return null;
  const next = { ...cur, name: name.slice(0, 16) };
  saveUsers(loadUsers().map((u) => (u.id === cur.id ? next : u)));
  return next;
}
