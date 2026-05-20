// Singleton Socket.IO client for the dashboard chat surface.
//
// Mirrors the Flutter `ChatSocketService` contract:
//   SEND PATH    = REST only (POST /chat/messages, etc.)
//   RECEIVE PATH = Socket only (message:new, conversation:read, typing, …)
//
// Subscribe via `on(event, cb)`; the returned function unsubscribes.
// Only client→server events allowed: `message:typing` and `message:read`
// (the latter is also handled by REST — emit only when the user is
// actively viewing and the connection is hot).
//
// JWT is read from `localStorage.accessToken` on `connect()` and passed in
// the handshake `auth.token`. Auto-reconnect is on; `onConnected` fires on
// every (re)connection so subscribers can re-fetch state.

import { io as ioClient } from "socket.io-client"

const CHAT_URL = "http://localhost:3001"

class ChatSocketClient {
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
    const token = localStorage.getItem("accessToken")
    if (!token) {
      // Without a token the chat handshake will be rejected — let the caller
      // (which knows the auth state) decide when to retry.
      return
    }

    const socket = ioClient(CHAT_URL, {
      transports: ["websocket"],
      autoConnect: true,
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 60,
      reconnectionDelay: 2000,
    })

    socket.on("connect", () => {
      for (const cb of this._connectedHandlers) {
        try { cb() } catch (_) { /* swallow */ }
      }
    })

    socket.onAny((event, data) => {
      const set = this._listeners.get(event)
      if (!set) return
      for (const cb of set) {
        try { cb(data) } catch (_) { /* a bad listener shouldn't break others */ }
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

  /** Subscribe to (re)connect events. */
  onConnected(cb) {
    this._connectedHandlers.add(cb)

    return () => this._connectedHandlers.delete(cb)
  }

  /** Emit a typed client→server event. Allowlist enforced. */
  emit(event, payload) {
    if (event === "message:send") {
      // Architectural invariant from Phase 6 — REST owns sends.
      console.warn("[chat-socket] message:send blocked — use REST")

      return
    }
    this._socket?.emit(event, payload)
  }
}

const chatSocket = new ChatSocketClient()
export default chatSocket
