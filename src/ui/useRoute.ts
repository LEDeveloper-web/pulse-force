import { useEffect, useState } from "react";
import { emptyRoute, go, parseLocation, type Route } from "./path";

export function useRoute() {
  const [route, setRoute] = useState<Route>(() => {
    if (typeof window === "undefined") return emptyRoute();
    return parseLocation(window.location);
  });

  useEffect(() => {
    const sync = () => setRoute(parseLocation(window.location));
    const parsed = parseLocation(window.location);
    if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
      go(parsed.page === "main" && !parsed.action ? { page: "main" } : parsed, true);
    }
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  return route;
}
