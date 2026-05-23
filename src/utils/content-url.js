// resolveContentUrl — turn any backend-emitted asset URL into the absolute
// URL the browser should fetch.
//
// Why this exists: most controllers return relative paths like
//   /public/uploads/video-courses/<id>/<file>.png
// alongside the canonical envelope's `content_url` field (e.g.
// "https://api.mulhimiq.com"). Templates need to render the full URL.
// Some endpoints (Bunny signed URLs, external CDN URLs) already ship an
// absolute URL — those must be passed through unchanged.
//
// Usage:
//   import { resolveContentUrl } from '@/utils/content-url'
//   const src = resolveContentUrl(course.coverImage)
//   <img :src="src" />
//
// Falls back to axiosInstance.defaults.baseURL (stripped of /api) when no
// content_url has been stashed yet — happens on the very first page load
// before any API response has been processed.

import axiosInstance from '@/utils/axios.js'

function pickBaseHost () {
  // Preferred: the live content_url written by the latest API response.
  // The axiosInstance.interceptors set it on localStorage in some flows;
  // we read here defensively.
  try {
    const fromStorage = localStorage.getItem('content_url')
    if (fromStorage) return fromStorage.replace(/\/$/, '')
  } catch (_) { /* ignore */ }

  // Fallback: derive from the axios base URL by trimming the /api suffix.
  const baseURL = axiosInstance?.defaults?.baseURL || ''
  return baseURL.replace(/\/api\/?$/, '').replace(/\/$/, '')
}

/**
 * Resolve any candidate URL to an absolute one usable by <img>, <video>,
 * <a href> etc. Pass-through for already-absolute (http/https/data/blob)
 * URLs. Returns the input as-is when it's falsy.
 */
export function resolveContentUrl (input) {
  if (!input) return input
  const s = String(input).trim()
  if (!s) return s

  // Absolute URL or data / blob URL → pass-through.
  if (/^(https?:)?\/\//i.test(s) || /^(data|blob):/i.test(s)) return s

  // Otherwise treat as server-relative and prepend the host.
  const host = pickBaseHost()
  if (!host) return s // best-effort: caller gets the raw path back
  if (s.startsWith('/')) return `${host}${s}`
  return `${host}/${s}`
}

/**
 * Vue helper — exposes the resolver as a per-component method via the
 * Composition API. Optional sugar; importing `resolveContentUrl`
 * directly works the same way in templates.
 */
export function useContentUrl () {
  return { resolve: resolveContentUrl }
}
