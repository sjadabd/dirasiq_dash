// useGoogleIdentity — lightweight composable around Google Identity Services
// for flows that want JUST the id_token + email without doing the legacy
// "sign in + create session" round-trip.
//
// The login page initializes Google with a callback that POSTs to
// /auth/google-auth. The teacher-application form needs a DIFFERENT
// callback that captures the idToken so it can be sent later as part of
// the multi-step submit. This composable lets each consumer wire its own
// callback without fighting the global SDK init.
//
// Usage:
//   import { useGoogleIdentity } from '@/composables/useGoogleIdentity'
//   const { renderButton, lastIdentity } = useGoogleIdentity()
//   onMounted(() => renderButton('my-target-div', (identity) => {
//     // identity: { idToken: string, email: string, name: string, picture: string }
//   }))

import { ref } from 'vue'

/** base64url → JSON. Returns null on parse failure. */
function decodeJwtPayload (idToken) {
  try {
    const parts = idToken.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4)
    const decoded = atob(padded)


    // Properly decode UTF-8 (atob returns bytes-as-chars).
    const utf8 = decodeURIComponent(
      decoded.split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
    )

    
    return JSON.parse(utf8)
  } catch (_) {
    return null
  }
}

export function useGoogleIdentity () {
  const lastIdentity = ref(null)

  /**
   * Render the Google sign-in button into the DOM element with id
   * `targetElementId`. The supplied `onIdentity` callback fires with
   * `{ idToken, email, name, picture }` every time the user completes
   * the Google flow.
   *
   * Multiple calls re-render (clears the existing button) so it's safe to
   * call from `watch` when a tab/dialog toggles.
   *
   * Returns true if the render started, false if the SDK or client id is
   * missing (the caller should fall back to a graceful empty state).
   */
  function renderButton (targetElementId, onIdentity, opts = {}) {
    const google = window.google
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!google?.accounts?.id || !clientId) {
      // SDK not loaded yet OR client id env var missing.
      // Caller can retry later when SDK becomes available.
      // eslint-disable-next-line no-console
      console.warn('useGoogleIdentity: Google SDK or VITE_GOOGLE_CLIENT_ID unavailable')
      
      return false
    }

    google.accounts.id.initialize({
      client_id: clientId,
      callback: response => {
        const idToken = response?.credential
        if (!idToken) return
        const payload = decodeJwtPayload(idToken) || {}

        const identity = {
          idToken,
          email: payload.email || '',
          name: payload.name || '',
          picture: payload.picture || '',
        }

        lastIdentity.value = identity
        try {
          onIdentity(identity)
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('useGoogleIdentity onIdentity threw', e)
        }
      },
      ux_mode: 'popup',
      auto_select: false,
      use_fedcm_for_prompt: false,
    })

    const el = document.getElementById(targetElementId)
    if (!el) return false
    el.innerHTML = ''
    google.accounts.id.renderButton(el, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'center',
      width: 320,
      ...opts,
    })
    
    return true
  }

  return { renderButton, lastIdentity }
}
