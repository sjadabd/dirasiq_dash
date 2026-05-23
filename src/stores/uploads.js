// useUploadsStore — global Pinia store for in-flight Bunny video uploads.
//
// Lives outside any single page component so the upload XHR keeps
// running (and the progress bar keeps animating) when the teacher
// navigates away from the lesson dialog. The accompanying
// UploadsWidget.vue (mounted in the default layout) renders the
// state as a floating tray à la Gmail attachments.
//
// State shape per upload:
//   {
//     id:            string,        // local UUID for the slot
//     lessonId:      string,        // backend lesson id (Bunny-linked)
//     courseId:      string,        // owning course id (for back-nav)
//     courseTitle:   string,
//     lessonTitle:   string,
//     fileName:      string,
//     progress:      0..100,
//     status:        'uploading' | 'syncing' | 'completed' | 'failed' | 'cancelled',
//     errorMessage:  string | null,
//     startedAt:     number (ms),
//     finishedAt:    number | null,
//     _xhr:          XMLHttpRequest, // kept so cancel() can abort
//   }
//
// Survival scope: the store survives ROUTE NAVIGATION inside the SPA.
// A browser reload or tab close kills the XHR — that's a browser
// constraint (true reload-survival would require either (a) a server-
// proxied upload + socket replay OR (b) a Service Worker doing
// background fetch; both out of scope for this phase).

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import Teacher from '@/api/teacher/teacher_api.js'

function randomId () {
  // crypto.randomUUID is reliable in modern browsers + Vite dev/prod.
  try { return globalThis.crypto.randomUUID() } catch { /* fallback */ }
  return `u_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const useUploadsStore = defineStore('uploads', () => {
  /** @type {import('vue').Ref<Array<object>>} */
  const items = ref([])
  /** Widget visibility — collapses to a single chip when false. */
  const expanded = ref(true)

  // Derived counts for the widget header.
  const inFlightCount = computed(
    () => items.value.filter(u => u.status === 'uploading' || u.status === 'syncing').length,
  )
  const failedCount = computed(
    () => items.value.filter(u => u.status === 'failed').length,
  )
  const isBusy = computed(() => inFlightCount.value > 0)

  /**
   * Start a direct-PUT upload to Bunny + sync the lesson row when done.
   *
   * Args:
   *   - lessonId, courseId, lessonTitle, courseTitle
   *   - fileName (string), file (File or Blob)
   *   - uploadContract: { url, method, headers } (from createVideoLesson response)
   *
   * Returns the slot object (reactive — the caller can watch its
   * `.progress` and `.status` for in-dialog feedback even though the
   * widget owns the canonical UI).
   */
  function startUpload (args) {
    const slot = {
      id: randomId(),
      lessonId: args.lessonId,
      courseId: args.courseId,
      courseTitle: args.courseTitle || '',
      lessonTitle: args.lessonTitle || '',
      fileName: args.fileName || '',
      progress: 0,
      status: 'uploading',
      errorMessage: null,
      startedAt: Date.now(),
      finishedAt: null,
      _xhr: null,
    }

    // Build the XHR ourselves so we can keep the handle for cancel().
    const xhr = new XMLHttpRequest()
    xhr.open(args.uploadContract.method || 'PUT', args.uploadContract.url, true)
    for (const [k, v] of Object.entries(args.uploadContract.headers || {})) {
      try { xhr.setRequestHeader(k, v) } catch (_) { /* some headers are forbidden — ignore */ }
    }
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return
      slot.progress = Math.min(99, Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        slot.progress = 100
        slot.status = 'syncing'
        // Tell the backend to reconcile the lesson with Bunny immediately so
        // the lesson card flips from 'uploaded' to 'processing'/'ready'
        // without waiting for the webhook latency.
        try {
          await Teacher.syncVideoLesson(slot.courseId, slot.lessonId)
        } catch (_) { /* swallow; webhook will eventually update */ }
        slot.status = 'completed'
        slot.finishedAt = Date.now()
        // Auto-evict completed entries after 8s so the widget stays clean.
        setTimeout(() => evict(slot.id), 8_000)
      } else {
        slot.status = 'failed'
        slot.errorMessage = `الرفع فشل (HTTP ${xhr.status})`
        slot.finishedAt = Date.now()
      }
    }
    xhr.onerror = () => {
      slot.status = 'failed'
      slot.errorMessage = 'خطأ في الشبكة أثناء رفع الفيديو'
      slot.finishedAt = Date.now()
    }
    xhr.onabort = () => {
      slot.status = 'cancelled'
      slot.errorMessage = 'تم إلغاء الرفع'
      slot.finishedAt = Date.now()
    }
    slot._xhr = xhr
    items.value.push(slot)
    xhr.send(args.file)
    expanded.value = true
    return slot
  }

  /** Abort an in-flight upload. No-op if already finished. */
  function cancel (slotId) {
    const slot = items.value.find(u => u.id === slotId)
    if (!slot || !slot._xhr) return
    if (slot.status === 'uploading' || slot.status === 'syncing') {
      try { slot._xhr.abort() } catch (_) { /* no-op */ }
    }
  }

  /** Remove a slot from the list (also aborts if still running). */
  function evict (slotId) {
    const idx = items.value.findIndex(u => u.id === slotId)
    if (idx === -1) return
    const slot = items.value[idx]
    if (slot._xhr && (slot.status === 'uploading' || slot.status === 'syncing')) {
      try { slot._xhr.abort() } catch (_) { /* no-op */ }
    }
    items.value.splice(idx, 1)
  }

  /** Clear all completed / failed / cancelled entries. */
  function clearFinished () {
    items.value = items.value.filter(
      u => u.status === 'uploading' || u.status === 'syncing',
    )
  }

  /** Subset for a specific course id — used by the detail page. */
  function forCourse (courseId) {
    return computed(() => items.value.filter(u => u.courseId === courseId))
  }

  /** Find a specific slot by lessonId. */
  function forLesson (lessonId) {
    return computed(() => items.value.find(u => u.lessonId === lessonId) || null)
  }

  function toggleExpanded () { expanded.value = !expanded.value }

  return {
    items,
    expanded,
    inFlightCount,
    failedCount,
    isBusy,
    startUpload,
    cancel,
    evict,
    clearFinished,
    forCourse,
    forLesson,
    toggleExpanded,
  }
})
