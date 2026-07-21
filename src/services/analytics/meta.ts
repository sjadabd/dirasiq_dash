/**
 * Meta (Facebook) Pixel analytics wrapper.
 *
 * Loads `fbevents.js` once, queues events via Meta's stub until the script
 * arrives, and fails silently when the pixel is blocked (ad blockers / CSP /
 * network errors) so the dashboard never crashes.
 */

const DEFAULT_PIXEL_ID = '1430821178897123'
const SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js'
const SCRIPT_DOM_ID = 'meta-fbevents'

type FbqCommand = [string, ...unknown[]]

interface FbqFunction {
  (...args: FbqCommand): void
  callMethod?: (...args: FbqCommand) => void
  queue: FbqCommand[]
  loaded: boolean
  version: string
  push: FbqFunction
}

declare global {
  interface Window {
    fbq?: FbqFunction
    _fbq?: FbqFunction
  }
}

export type MetaEventParams = Record<
  string,
  string | number | boolean | ReadonlyArray<string | number> | null | undefined
>

function resolvePixelId(): string {
  const fromEnv = import.meta.env.VITE_META_PIXEL_ID
  if (typeof fromEnv === 'string' && fromEnv.trim())
    return fromEnv.trim()

  return DEFAULT_PIXEL_ID
}

function isPixelEnabled(): boolean {
  const flag = import.meta.env.VITE_META_PIXEL_ENABLED
  if (flag === 'false' || flag === '0')
    return false

  return Boolean(resolvePixelId())
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/**
 * Install Meta's official `fbq` stub so calls made before `fbevents.js`
 * loads are queued (same behaviour as Meta's snippet).
 */
function ensureFbqStub(): FbqFunction | null {
  if (!isBrowser())
    return null

  if (window.fbq)
    return window.fbq

  const fbq = function (...args: FbqCommand) {
    if (typeof fbq.callMethod === 'function')
      fbq.callMethod(...args)
    else
      fbq.queue.push(args)
  } as FbqFunction

  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []

  window.fbq = fbq
  if (!window._fbq)
    window._fbq = fbq

  return fbq
}

function hasPixelScript(): boolean {
  if (!isBrowser())
    return false

  return Boolean(
    document.getElementById(SCRIPT_DOM_ID)
    || document.querySelector(`script[src="${SCRIPT_SRC}"]`),
  )
}

/**
 * Inject `fbevents.js` once, asynchronously. Resolves `false` on failure
 * (blocked / offline) without throwing.
 */
function loadFbeventsScript(): Promise<boolean> {
  if (!isBrowser())
    return Promise.resolve(false)

  if (hasPixelScript())
    return Promise.resolve(true)

  return new Promise(resolve => {
    try {
      const script = document.createElement('script')
      script.id = SCRIPT_DOM_ID
      script.async = true
      script.src = SCRIPT_SRC
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)

      const firstScript = document.getElementsByTagName('script')[0]
      if (firstScript?.parentNode)
        firstScript.parentNode.insertBefore(script, firstScript)
      else
        document.head.appendChild(script)
    }
    catch {
      resolve(false)
    }
  })
}

function safeFbq(...args: FbqCommand): void {
  try {
    if (!isPixelEnabled())
      return

    const fbq = window.fbq ?? ensureFbqStub()
    if (!fbq)
      return

    fbq(...args)
  }
  catch {
    // Intentionally silent — Meta may be blocked or unavailable.
  }
}

let initPromise: Promise<boolean> | null = null

/**
 * Initialise the Pixel once. Safe to call repeatedly.
 * Stub + `fbq('init')` run synchronously; the remote script loads async.
 */
export function initMetaPixel(): Promise<boolean> {
  if (initPromise)
    return initPromise

  if (!isPixelEnabled()) {
    initPromise = Promise.resolve(false)

    return initPromise
  }

  const fbq = ensureFbqStub()
  if (!fbq) {
    initPromise = Promise.resolve(false)

    return initPromise
  }

  try {
    fbq('init', resolvePixelId())
  }
  catch {
    initPromise = Promise.resolve(false)

    return initPromise
  }

  initPromise = loadFbeventsScript()

  return initPromise
}

// ---------------------------------------------------------------------------
// Standard Meta events
// ---------------------------------------------------------------------------

export function trackPageView(): void {
  safeFbq('track', 'PageView')
}

export function trackCompleteRegistration(params?: MetaEventParams): void {
  safeFbq('track', 'CompleteRegistration', params)
}

export function trackViewContent(params?: MetaEventParams): void {
  safeFbq('track', 'ViewContent', params)
}

export function trackLead(params?: MetaEventParams): void {
  safeFbq('track', 'Lead', params)
}

export function trackSearch(params?: MetaEventParams): void {
  safeFbq('track', 'Search', params)
}

export function trackCustom(eventName: string, params?: MetaEventParams): void {
  if (!eventName || typeof eventName !== 'string')
    return

  safeFbq('trackCustom', eventName, params)
}

// ---------------------------------------------------------------------------
// Domain helpers (call explicitly when the product event happens)
// ---------------------------------------------------------------------------

export function trackTeacherRegistration(): void {
  trackCompleteRegistration({
    content_name: 'teacher_registration',
    status: true,
  })
}

export function trackStudentRegistration(): void {
  trackCompleteRegistration({
    content_name: 'student_registration',
    status: true,
  })
}

export function trackLogin(): void {
  trackCustom('Login')
}

export function trackCourseView(courseId: string | number): void {
  trackViewContent({
    content_ids: [String(courseId)],
    content_type: 'course',
    content_name: 'course',
  })
}

export function trackPurchase(value: number, currency = 'IQD'): void {
  safeFbq('track', 'Purchase', {
    value,
    currency,
  })
}
