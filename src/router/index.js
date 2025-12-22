import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  // Main app routes (with header)
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('../views/HomeView.vue')
      },
      {
        path: 'login',
        name: 'login',
        component: () => import('../views/auth/LoginView.vue'),
        meta: { requiresGuest: true }
      },
      {
        path: 'signup',
        name: 'signup',
        component: () => import('../views/auth/SignupView.vue'),
        meta: { requiresGuest: true }
      },
      {
        path: 'onboarding',
        name: 'onboarding',
        component: () => import('../views/onboarding/OnboardingView.vue'),
        meta: { requiresAuth: true, requiresNoBusiness: true }
      },
      {
        path: 'services',
        name: 'services',
        component: () => import('../views/services/ServicesView.vue'),
        meta: { requiresAuth: true, requiresBusiness: true }
      },
      {
        path: 'appointments',
        name: 'appointments',
        component: () => import('../views/appointments/AppointmentsView.vue'),
        meta: { requiresAuth: true, requiresBusiness: true }
      },
      {
        path: 'page',
        name: 'page',
        component: () => import('../views/page/PageView.vue'),
        meta: { requiresAuth: true, requiresBusiness: true }
      }
    ]
  },
  // Appointment form routes (no layout header/footer) - MUST come before /:slug catch-all
  {
    path: '/appointments',
    component: () => import('../layouts/SimpleLayout.vue'),
    children: [
      {
        path: 'new',
        name: 'appointment-new',
        component: () => import('../views/appointments/AppointmentFormView.vue'),
        meta: { requiresAuth: true, requiresBusiness: true }
      },
      {
        path: ':id/edit',
        name: 'appointment-edit',
        component: () => import('../views/appointments/AppointmentFormView.vue'),
        meta: { requiresAuth: true, requiresBusiness: true }
      }
    ]
  },
  // Service form routes (no layout header/footer) - MUST come before /:slug catch-all
  {
    path: '/services',
    component: () => import('../layouts/SimpleLayout.vue'),
    children: [
      {
        path: 'new',
        name: 'service-new',
        component: () => import('../views/services/ServiceFormView.vue'),
        meta: { requiresAuth: true, requiresBusiness: true }
      },
      {
        path: ':id/edit',
        name: 'service-edit',
        component: () => import('../views/services/ServiceFormView.vue'),
        meta: { requiresAuth: true, requiresBusiness: true }
      }
    ]
  },
  // Block date route (no layout header/footer)
  {
    path: '/availability',
    component: () => import('../layouts/SimpleLayout.vue'),
    children: [
      {
        path: 'block',
        name: 'block-date',
        component: () => import('../views/availability/BlockDateView.vue'),
        meta: { requiresAuth: true, requiresBusiness: true }
      }
    ]
  },
  // Photos management route (no layout header/footer)
  {
    path: '/page',
    component: () => import('../layouts/SimpleLayout.vue'),
    children: [
      {
        path: 'photos',
        name: 'page-photos',
        component: () => import('../views/page/PhotosView.vue'),
        meta: { requiresAuth: true, requiresBusiness: true }
      }
    ]
  },
  // Public routes (no auth, no layout header) - MUST come before /:slug catch-all
  {
    path: '/book/:slug',
    name: 'public-booking',
    component: () => import('../views/public/BookingView.vue')
  },
  {
    path: '/cancel/:token',
    name: 'cancel-appointment',
    component: () => import('../views/public/CancelAppointmentView.vue')
  },
  // Public business page (must be last to catch /:slug)
  {
    path: '/:slug',
    name: 'public-business',
    component: () => import('../views/public/BusinessView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Track if initial auth check has been done
let authInitialized = false

router.beforeEach(async (to, from, next) => {
  // Dynamic imports to avoid circular dependencies
  const authModule = await import('../stores/auth')
  const profileModule = await import('../stores/profile')

  const authStore = authModule.useAuthStore()
  const profileStore = profileModule.useProfileStore()

  // Initialize auth on first navigation if not already done
  if (!authInitialized) {
    authInitialized = true
    await authStore.init()
    // Load profile if authenticated
    if (authStore.isAuthenticated) {
      await profileStore.loadProfile()
    }
  }

  // Wait if initialization is in progress
  if (authStore.loading) {
    await new Promise((resolve) => {
      const checkLoading = setInterval(() => {
        if (!authStore.loading) {
          clearInterval(checkLoading)
          resolve()
        }
      }, 50)
    })
  }

  const isAuthenticated = authStore.isAuthenticated
  const hasProfile = profileStore.hasProfile

  // If user is authenticated and on home page, redirect to appointments or onboarding
  if (to.name === 'home' && isAuthenticated) {
    return next(hasProfile ? { path: '/appointments' } : { path: '/onboarding' })
  }

  // Guest routes - redirect if already authenticated
  if (to.meta.requiresGuest && isAuthenticated) {
    return next(hasProfile ? { path: '/appointments' } : { path: '/onboarding' })
  }

  // Auth required - redirect to login if not authenticated
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  // Business required (now Profile required) - redirect to onboarding if no profile
  if (to.meta.requiresBusiness && !hasProfile) {
    return next({ path: '/onboarding' })
  }

  // No business required (onboarding) - redirect to appointments if profile exists
  if (to.meta.requiresNoBusiness && hasProfile) {
    return next({ path: '/appointments' })
  }

  next()
})

export default router

