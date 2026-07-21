import { router } from '@/plugins/1.router'
import { initMetaPixel, trackPageView } from '@/services/analytics'

/**
 * Meta Pixel plugin.
 * - Loads the pixel once (async, non-blocking).
 * - Tracks PageView on first ready + every subsequent route change.
 */
export default function () {
  // Stub + init are sync; remote script loads async and does not block paint.
  void initMetaPixel()

  router.isReady().then(() => {
    trackPageView()
  })

  router.afterEach((_to, from) => {
    // Initial navigation is covered by isReady() above.
    if (from.matched.length === 0)
      return

    trackPageView()
  })
}
