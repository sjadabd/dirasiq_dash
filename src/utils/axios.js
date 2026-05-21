import { router } from "@/plugins/1.router/index";
import axios from "axios";
import { API_BASE_URL } from "@/utils/api-mode";

// Base URL is sourced from `@/utils/api-mode` — flip `USE_LOCAL` there to
// switch the whole dashboard between localhost and production in one line.
// Env files (`.env.development` / `.env.production`) still take precedence
// when present, so CI / Docker builds stay deterministic.
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 100000,
});

// Auth pages that should NEVER trigger a redirect-on-401 (they are the
// redirect target — re-redirecting would create a loop and looks like the
// app is "kicking the user out" on visiting an unrelated page).
const AUTH_PATHS = new Set([
  "/login", "/register", "/forgot-password", "/reset-password", "/verify-email",
  "/errors/unauthorized", "/errors/not-found", "/errors/server-error",
]);

// Some endpoints are "best-effort" probes — losing them shouldn't kick the
// user out. We treat their 401s as silent failures. Skip the redirect for any
// URL containing these substrings.
const SOFT_AUTH_URLS = [
  "/notifications/user/my-notifications",
  "/onesignal-player-id",
];

// Debounce: if many concurrent requests all return 401 in the same tick
// (typical of a page that fan-outs API calls on mount), redirect ONCE.
let redirecting = false;
const redirectOnce = (path) => {
  if (redirecting) return;
  redirecting = true;
  router.replace(path).finally(() => {
    setTimeout(() => { redirecting = false; }, 1500);
  });
};

axiosInstance.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("accessToken");
    config.headers = config.headers || {};
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    if (!response) return Promise.reject(error);

    const url = String(config?.url || "");
    const currentPath = router?.currentRoute?.value?.path || window.location.pathname;

    // 🛑 403 — not authorized to access this route
    if (
      response.status === 403 &&
      response.data?.message?.includes("not authorized to access this route")
    ) {
      localStorage.setItem(
        "unauthorized_message",
        response.data?.message || "ليس لديك صلاحية للوصول إلى هذه الصفحة",
      );
      redirectOnce("/errors/unauthorized");
      return Promise.reject(error);
    }

    // 🛑 401 — token issue
    if (response.status === 401) {
      // Silent failure for best-effort probes (notifications poll, onesignal sync)
      if (SOFT_AUTH_URLS.some((u) => url.includes(u))) {
        return Promise.reject(error);
      }

      // Already on an auth/error page — don't redirect again (would loop).
      if (AUTH_PATHS.has(currentPath)) {
        return Promise.reject(error);
      }

      // Only treat as a real logout if the backend says the token itself is
      // bad/expired. A 401 from a wrong-credentials login attempt or a
      // ROLE_REQUIRED 403 reaching here would NOT have these codes.
      const code = response.data?.errors?.[0]?.code;
      const isTokenIssue =
        code === "TOKEN_EXPIRED" ||
        code === "TOKEN_INVALID" ||
        code === "UNAUTHORIZED" ||
        !code; // legacy: no error code → fall back to old behaviour

      if (isTokenIssue) {
        // Preserve where the user was so we can return them after re-login.
        const returnTo = currentPath && currentPath !== "/" ? currentPath : null;
        if (returnTo) localStorage.setItem("returnTo", returnTo);

        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem("results");
        localStorage.setItem("reloaded", "false");

        // Store a friendly note for the login page to display.
        localStorage.setItem(
          "auth_message",
          code === "TOKEN_EXPIRED"
            ? "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى."
            : "يرجى تسجيل الدخول للمتابعة.",
        );

        redirectOnce("/login");
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
