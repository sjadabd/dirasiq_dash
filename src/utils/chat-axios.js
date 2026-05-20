// Separate axios instance for the chat service (port 3001) — same JWT, but
// a different origin than the main API (`utils/axios.js`).
//
// Why a second instance:
//   - Different base URL (chat lives on its own process).
//   - Different 401 semantics — a chat 401 should NOT log the user out of the
//     dashboard (the main API token is the source of truth; chat just shares
//     the secret). We surface the error to the caller and let the page show
//     a toast instead of redirecting.
//   - Different timeout — chat REST calls are cheap reads; no need for the
//     100s timeout of the main client.
//
// CAUTION: do NOT use this for main-API calls. Always go through
// `@/utils/axios` for /api/* endpoints.

import axios from "axios"

const chatAxios = axios.create({
  // baseURL: "https://chat.mulhimiq.com",
  baseURL: "http://localhost:3001",
  timeout: 30000,
})

chatAxios.interceptors.request.use(
  async config => {
    const token = localStorage.getItem("accessToken")
    config.headers = config.headers || {}
    if (token) config.headers.Authorization = `Bearer ${token}`

    return config
  },
  error => Promise.reject(error),
)

// Pass-through error handling — the chat service surfaces ApiResponse-style
// errors that pages can inspect (status + errors[0].code).
chatAxios.interceptors.response.use(
  response => response,
  error => Promise.reject(error),
)

export default chatAxios
