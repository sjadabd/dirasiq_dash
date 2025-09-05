import App from '@/App.vue'
import { registerPlugins } from '@core/utils/plugins'
import { createApp } from 'vue'

// Styles
import '@core/scss/template/index.scss'
import '@styles/styles.scss'

// Create vue app
const app = createApp(App)

// تحميل بيانات المستخدم من localStorage عند بدء التطبيق
const loadUserFromStorage = () => {
  const userData = localStorage.getItem('user')
  const accessToken = localStorage.getItem('accessToken')
  
  if (userData && accessToken) {
    // إضافة البيانات إلى global properties للوصول إليها في أي مكان
    app.config.globalProperties.$user = JSON.parse(userData)
    app.config.globalProperties.$token = accessToken
    app.config.globalProperties.$isAuthenticated = true
  }
}

// تحميل البيانات
loadUserFromStorage()

// Register plugins
registerPlugins(app)

// Mount vue app
app.mount('#app')
