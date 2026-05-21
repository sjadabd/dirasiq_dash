// =============================================================================
//  Single switch for "where does the dashboard connect to?"
// =============================================================================
//
// Flip `USE_LOCAL` and every API + chat + socket call follows. No env files
// needed.
//
//   USE_LOCAL = true   →  localhost (local backend running on your machine)
//   USE_LOCAL = false  →  production domains (api.mulhimiq.com + chat.mulhimiq.com)
//
// Build-time env vars still win when set, so CI / Docker builds get the
// canonical production values via `.env.production`. This file is the
// operator-friendly override for day-to-day dev when you want to ping
// production from your local browser without editing env files.
//
// Imported by:
//   - src/utils/axios.js          (main API HTTP)
//   - src/utils/chat-axios.js     (chat REST)
//   - src/utils/chat-socket.js    (Socket.IO origin)
//   - src/pages/chat/conversations/index.vue  (attachment URL resolution)

const USE_LOCAL = false // ← FLIP this one line

const LOCAL = Object.freeze({
  api: "http://localhost:3000/api",
  chat: "http://localhost:3001",
})

const PUBLIC_URLS = Object.freeze({
  api: "https://api.mulhimiq.com/api",
  chat: "https://chat.mulhimiq.com",
})

const target = USE_LOCAL ? LOCAL : PUBLIC_URLS

// Env-file values always win — keeps CI builds + `.env.production` deterministic.
// When no env file supplies the value, the boolean above decides.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || target.api
export const CHAT_BASE_URL = import.meta.env.VITE_CHAT_BASE_URL || target.chat
export { USE_LOCAL }
