import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar } from 'quasar'
import quasarLang from 'quasar/lang/fr'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import App from './App.vue'
import router from './router'
import { supabase } from './services/supabase'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(Quasar, {
  plugins: {
    Notify: {},
    Dialog: {},
    Loading: {},
    LocalStorage: {}
  },
  lang: quasarLang,
  config: {
    brand: {
      primary: '#1976d2',
      secondary: '#26a69a',
      accent: '#9c27b0',
      dark: '#1d1d1d',
      positive: '#21ba45',
      negative: '#c10015',
      info: '#31ccec',
      warning: '#f2c037'
    }
  }
})
app.use(router)

// Set up auth state listener (will be initialized in router guard)
import('./stores/auth').then(({ useAuthStore }) => {
  import('./stores/business').then(({ useBusinessStore }) => {
    const authStore = useAuthStore()
    const businessStore = useBusinessStore()

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          authStore.user = session.user
          await businessStore.loadBusiness()
        }
      } else if (event === 'SIGNED_OUT') {
        authStore.user = null
        businessStore.clearBusiness()
      }
    })
  })
})

app.mount('#app')

