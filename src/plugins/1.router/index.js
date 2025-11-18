import { setupLayouts } from 'virtual:generated-layouts'
import { createRouter, createWebHistory } from 'vue-router/auto'

function recursiveLayouts(route) {
  if (route.children) {
    for (let i = 0; i < route.children.length; i++)
      route.children[i] = recursiveLayouts(route.children[i])

    return route
  }

  return setupLayouts([route])[0]
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to) {
    if (to.hash)
      return { el: to.hash, behavior: 'smooth', top: 60 }

    return { top: 0 }
  },
  extendRoutes: pages => {
    const routes = [...pages].map(route => recursiveLayouts(route))

    // مسار قديم للتوافق مع روابط الدعوات: /register/teacher?ref=...
    // يعيد التوجيه إلى صفحة تسجيل/دخول المعلم الحالية في /login مع تمرير ref كما هو.
    routes.push({
      path: '/register/teacher',
      name: 'register-teacher-legacy',
      redirect: to => {
        const ref = to?.query?.ref
        const query = {}
        if (ref) query.ref = ref
        return { path: '/login', query }
      },
    })

    return routes
  },
})

router.onError(err => {
  const msg = err && err.message ? err.message : ''
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk')
  ) {
    const current = router.currentRoute.value.fullPath
    window.location.assign(current)
  }
})

export { router }
export default function (app) {
  app.use(router)
}
