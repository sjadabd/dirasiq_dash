// Singleton Socket.IO client for realtime push from the MAIN API
// (NOT the chat micro-service — that's `chat-socket.js`).
//
// Mirrors the Flutter `RealtimeService` contract:
//   - JWT in handshake `auth.token` (read from localStorage.accessToken)
//   - Auto-reconnect with the same token
//   - Subscribers register via `on(event, cb)` → returns unsubscribe fn
//
// Events emitted by the server today (see
// dirasiq_api/src/services/video-course-events.service.ts):
//   - 'video-course:created'        super_admins only
//   - 'video-course:approved'       teacher only  — { course, at }
//   - 'video-course:rejected'       teacher only  — { course, at }
//   - 'video-lesson:status_changed' teacher only  — { lesson, at, previousStatus }
//
// CSP: the dashboard's `index.html` allows `https://api.mulhimiq.com` and
// `wss://api.mulhimiq.com` in `connect-src`. Local dev uses
// VITE_CSP_DEV_CONNECT to add `http://localhost:3000` + `ws://localhost:3000`.

import { io as ioClient } from "socket.io-client"
import { API_BASE_URL } from "@/utils/api-mode"

// Strip the trailing `/api` so socket.io reaches the root host where the
// server mounts `path: '/socket.io'`. Defensive against the slash with /
// without — both produce the same base.
const REALTIME_URL = API_BASE_URL.replace(/\/api\/?$/, "")

class RealtimeSocketClient {
  constructor() {
    this._socket = null
    this._listeners = new Map() // event → Set<cb>
    this._connectedHandlers = new Set()
  }

  get isConnected() {
    return this._socket?.connected === true
  }

  /** Idempotent — multiple calls share the same socket instance. */
  connect() {
    if (this._socket && this._socket.connected) return
    // Tear down a stale disconnected socket before creating a fresh one
    // — otherwise the new connect() is a no-op and we silently stay
    // offline forever after one bad disconnect.
    if (this._socket) {
      try { this._socket.removeAllListeners() } catch (_) { /* nop */ }
      try { this._socket.disconnect() } catch (_) { /* nop */ }
      this._socket = null
    }

    const token = localStorage.getItem("accessToken")
    console.info(`[realtime] connect() called — token present: ${!!token}`)
    if (!token) {
      // Without a token the handshake will be rejected — let the caller
      // (which knows the auth state) decide when to retry.
      return
    }

    const socket = ioClient(REALTIME_URL, {
      transports: ["websocket"],
      autoConnect: true,
      auth: { token },
      reconnection: true,
      // Unbounded retry. The default 5 would silently park the socket
      // after the first bad disconnect (e.g. during an API deploy);
      // a finite number is the worst of both worlds because the user
      // never knows realtime stopped working.
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
    })

    socket.on("connect", () => {
      console.info(`[realtime] ✅ socket connected to ${REALTIME_URL}`)
      for (const cb of this._connectedHandlers) {
        try { cb() } catch (_) { /* swallow */ }
      }
    })

    socket.on("connect_error", err => {
      console.warn(`[realtime] ❌ connect_error: ${err?.message || err}`)
    })

    socket.on("disconnect", reason => {
      console.info(`[realtime] socket disconnected: ${reason}`)
    })

    socket.onAny((event, data) => {
      const set = this._listeners.get(event)
      const n = set?.size ?? 0
      console.info(`[realtime] 📨 event="${event}" listeners=${n}`, data)
      if (!set) return

      // Iterate over a snapshot — a subscriber that unsubscribes from
      // inside its own callback would otherwise mutate the live Set.
      for (const cb of Array.from(set)) {
        try { cb(data) } catch (e) {
          console.warn(`[realtime] listener for "${event}" threw:`, e)
        }
      }
    })

    this._socket = socket
  }

  disconnect() {
    if (this._socket) {
      this._socket.removeAllListeners()
      this._socket.disconnect()
      this._socket = null
    }
  }

  /** Subscribe; returns an unsubscribe function. */
  on(event, cb) {
    let set = this._listeners.get(event)
    if (!set) {
      set = new Set()
      this._listeners.set(event, set)
    }
    set.add(cb)

    return () => set.delete(cb)
  }

  /** Subscribe to (re)connect events. Returns an unsubscribe fn. */
  onConnected(cb) {
    this._connectedHandlers.add(cb)

    return () => this._connectedHandlers.delete(cb)
  }

  /** Wipe every subscriber (use on logout only). */
  clearListeners() {
    this._listeners.clear()
    this._connectedHandlers.clear()
  }
}

const realtimeSocket = new RealtimeSocketClient()
export default realtimeSocket
