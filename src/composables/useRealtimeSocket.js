// Vue composable that wraps `realtime-socket.js` with lifecycle-safe
// subscriptions.
//
// Usage in a page:
//
//   import { useRealtimeSocket } from '@/composables/useRealtimeSocket'
//
//   useRealtimeSocket({
//     'video-course:approved': (data) => { refetch(); notify('approved') },
//     'video-course:rejected': (data) => { refetch(); notify('rejected') },
//   })
//
// What it guarantees:
//   - The singleton socket is connected (idempotent — no-op if already on).
//   - Every handler is unsubscribed in `onBeforeUnmount` so navigating away
//     doesn't accumulate dead listeners.
//   - Re-emits on every `(re)connect` so callers can re-fetch state if
//     they want — opt-in via `onReconnect`.

import { onBeforeUnmount, onMounted } from "vue"

import realtimeSocket from "@/utils/realtime-socket"

/**
 * Register a bundle of realtime event handlers scoped to the calling
 * component's lifecycle.
 *
 * @param {Record<string, (data: any) => void>} handlers  event → callback
 * @param {{ onReconnect?: () => void }} [opts]
 */
export function useRealtimeSocket(handlers, opts = {}) {
  const unsubs = []

  onMounted(() => {
    // Idempotent — connects only if not already open. The connect happens
    // inside the singleton; multiple components can mount + unmount
    // without churning the underlying socket.
    realtimeSocket.connect()

    for (const [event, cb] of Object.entries(handlers || {})) {
      if (typeof cb !== "function") continue
      unsubs.push(realtimeSocket.on(event, cb))
    }

    if (typeof opts.onReconnect === "function") {
      unsubs.push(realtimeSocket.onConnected(opts.onReconnect))
    }
  })

  onBeforeUnmount(() => {
    for (const u of unsubs) {
      try { u() } catch (_) { /* nop */ }
    }
    unsubs.length = 0
  })
}
