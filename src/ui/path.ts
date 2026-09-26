export type UiPage =
  | "main"
  | "game"
  | "singleplayer"
  | "multiplayer"
  | "settings"
  | "team"
  | "serverplayer"
  | "friendlist"
  | "armory";

export type UiAction =
  | ""
  | "create"
  | "join"
  | "game"
  | "find"
  | "filter"
  | "search"
  | "add"
  | "request"
  | "character"
  | "lobby";

export type Route = {
  page: UiPage;
  action: UiAction;
  server: string;
  q: string;
  filter: string;
  mode: string;
  map: string;
};

const PAGES: UiPage[] = [
  "main",
  "game",
  "singleplayer",
  "multiplayer",
  "settings",
  "team",
  "serverplayer",
  "friendlist",
  "armory",
];

const ACTIONS: UiAction[] = [
  "",
  "create",
  "join",
  "game",
  "find",
  "filter",
  "search",
  "add",
  "request",
  "character",
  "lobby",
];

function isPage(v: string): v is UiPage {
  return (PAGES as string[]).includes(v);
}
function isAction(v: string): v is UiAction {
  return (ACTIONS as string[]).includes(v);
}

export function emptyRoute(): Route {
  return { page: "main", action: "", server: "", q: "", filter: "", mode: "", map: "" };
}

export function parseLocation(loc: { pathname: string; search: string; hash: string }): Route {
  const params = new URLSearchParams(loc.search.replace(/^\?/, ""));
  const hash = loc.hash.startsWith("#") ? loc.hash.slice(1) : loc.hash;
  const rawPath = (hash.startsWith("/ui") ? hash : loc.pathname) || "/";
  const parts = rawPath.split("/").filter(Boolean);

  if (parts[0] === "index.html" || parts[0] === "index") parts.shift();
  if (params.get("index") === "ui" && parts.length === 0) parts.push("ui", "main");
  if (parts[0] !== "ui") {
    const qPage = params.get("ui") || params.get("page");
    if (qPage && isPage(qPage)) {
      return fromQuery(params, qPage);
    }
    if (parts.length === 0 || parts[0] === "") return emptyRoute();
  } else {
    parts.shift();
  }

  const page = isPage(parts[0] || "") ? (parts[0] as UiPage) : "main";
  let action: UiAction = "";
  let server = "";
  if (parts[1] && isAction(parts[1])) {
    action = parts[1];
    if (action === "game" && parts[2]) server = decodeURIComponent(parts.slice(2).join("/"));
  } else if (parts[1]) {
    server = decodeURIComponent(parts.slice(1).join("/"));
    action = "game";
  }

  const qAction = params.get("view") || params.get("action") || "";
  if (!action && isAction(qAction)) action = qAction;

  return {
    page,
    action,
    server: params.get("server") || server,
    q: params.get("q") || params.get("search") || "",
    filter: params.get("filter") || "",
    mode: params.get("mode") || "",
    map: params.get("map") || "",
  };
}

function fromQuery(params: URLSearchParams, page: UiPage): Route {
  const view = params.get("view") || params.get("action") || "";
  return {
    page,
    action: isAction(view) ? view : "",
    server: params.get("server") || "",
    q: params.get("q") || params.get("search") || "",
    filter: params.get("filter") || "",
    mode: params.get("mode") || "",
    map: params.get("map") || "",
  };
}

export function toPath(route: Partial<Route>): string {
  const page = route.page || "main";
  const action = route.action || "";
  let path = `/ui/${page}`;
  if (action) path += `/${action}`;
  if (action === "game" && route.server) path += `/${encodeURIComponent(route.server)}`;
  const qs = new URLSearchParams();
  if (route.q) qs.set("q", route.q);
  if (route.filter) qs.set("filter", route.filter);
  if (route.mode) qs.set("mode", route.mode);
  if (route.map) qs.set("map", route.map);
  if (route.server && action !== "game") qs.set("server", route.server);
  const tail = qs.toString();
  return tail ? `${path}?${tail}` : path;
}

export function go(route: Partial<Route>, replace = false) {
  const url = toPath(route);
  if (replace) history.replaceState(route, "", url);
  else history.pushState(route, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export const LINKS: { label: string; route: Partial<Route> }[] = [
  { label: "Main", route: { page: "main" } },
  { label: "Game", route: { page: "game" } },
  { label: "Singleplayer", route: { page: "singleplayer" } },
  { label: "SP Create", route: { page: "singleplayer", action: "create" } },
  { label: "SP Game", route: { page: "singleplayer", action: "game" } },
  { label: "Multiplayer", route: { page: "multiplayer" } },
  { label: "MP Create", route: { page: "multiplayer", action: "create" } },
  { label: "MP Join", route: { page: "multiplayer", action: "join" } },
  { label: "MP Game", route: { page: "multiplayer", action: "game" } },
  { label: "Settings", route: { page: "settings" } },
  { label: "Team", route: { page: "team" } },
  { label: "Servers", route: { page: "serverplayer" } },
  { label: "Create Server", route: { page: "serverplayer", action: "create" } },
  { label: "Join Server", route: { page: "serverplayer", action: "join" } },
  { label: "Search Servers", route: { page: "serverplayer", action: "search" } },
  { label: "Filter Servers", route: { page: "serverplayer", action: "filter" } },
  { label: "Friends", route: { page: "friendlist" } },
  { label: "Find Friends", route: { page: "friendlist", action: "find" } },
  { label: "Search Friends", route: { page: "friendlist", action: "search" } },
  { label: "Add Friend", route: { page: "friendlist", action: "add" } },
  { label: "Requests", route: { page: "friendlist", action: "request" } },
];
