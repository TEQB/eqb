/** Set immediately before an intentional sign-out so SessionManager skips the expiry toast. */
export const VOLUNTARY_LOGOUT_KEY = "eqb_voluntary_logout";

export function markVoluntaryLogout(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(VOLUNTARY_LOGOUT_KEY, "1");
  }
}

export function consumeVoluntaryLogoutFlag(): boolean {
  if (typeof sessionStorage !== "undefined") {
    const value = sessionStorage.getItem(VOLUNTARY_LOGOUT_KEY);
    if (value) {
      sessionStorage.removeItem(VOLUNTARY_LOGOUT_KEY);
      return true;
    }
  }
  if (typeof document !== "undefined" && document.cookie.includes("eqb_voluntary_logout=1")) {
    document.cookie = "eqb_voluntary_logout=; Max-Age=0; path=/";
    return true;
  }
  return false;
}

export function getLoginRedirectPath(): string {
  if (typeof window === "undefined") return "/login";
  return window.location.pathname.startsWith("/admin") ? getAdminLoginPath() : "/login";
}

function getAdminLoginPath(): string {
  const segments = window.location.pathname.split("/");
  if (segments[1] === "admin" && segments[2]) {
    return `/admin/${segments[2]}/login`;
  }
  return "/login";
}
