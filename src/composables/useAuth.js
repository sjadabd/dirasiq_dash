import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

// حالة المستخدم العامة
const user = ref(null)
const token = ref(null)
const isAuthenticated = ref(false)

export function useAuth() {
  const router = useRouter()

  // تحميل البيانات من localStorage عند بدء التطبيق
  const loadUserFromStorage = () => {
    const userData = localStorage.getItem('user')
    const accessToken = localStorage.getItem('accessToken')
    
    if (userData && accessToken) {
      user.value = JSON.parse(userData)
      token.value = accessToken
      isAuthenticated.value = true
      return true
    }
    
    return false
  }

  // تحميل البيانات تلقائياً عند استدعاء useAuth
  if (!isAuthenticated.value) {
    loadUserFromStorage()
  }

  // دالة تسجيل الدخول
  const login = (userData, accessToken) => {
    user.value = userData
    token.value = accessToken
    isAuthenticated.value = true
    
    // حفظ في localStorage
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('accessToken', accessToken)
  }

  // دالة تسجيل الخروج
  const logout = () => {
    user.value = null
    token.value = null
    isAuthenticated.value = false
    
    // حذف من localStorage
    localStorage.removeItem('user')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('results')
    
    // توجيه لصفحة تسجيل الدخول
    router.push('/login')
  }

  // دالة تحديث بيانات المستخدم
  const updateUser = (userData) => {
    user.value = { ...user.value, ...userData }
    localStorage.setItem('user', JSON.stringify(user.value))
  }


  // دالة التحقق من الحاجة لإكمال الملف الشخصي
  const requiresProfileCompletion = computed(() => {
    if (!user.value) return false
    
    return !user.value.phone || 
           !user.value.address || 
           !user.value.bio || 
           user.value.experienceYears === 0
  })

  // دالة التوجيه بناءً على حالة المستخدم
  const redirectBasedOnUserStatus = () => {
    if (!isAuthenticated.value) {
      router.push('/login')
      return
    }

    const userType = user.value?.userType
    
    switch (userType) {
      case 'teacher':
        if (requiresProfileCompletion.value) {
          router.push('/teacher/profile-setup')
        } else {
          router.push('/teacher/dashboard')
        }
        break
        
      case 'super_admin':
      case 'admin':
        router.push('/admin/dashboard')
        break
        
      case 'student':
        if (requiresProfileCompletion.value) {
          router.push('/student/profile-setup')
        } else {
          router.push('/student/dashboard')
        }
        break
        
      default:
        router.push('/dashboard')
    }
  }

  // دالة التحقق من صلاحية المستخدم
  const hasPermission = (permission) => {
    if (!user.value) return false
    
    // يمكنك إضافة منطق الصلاحيات هنا
    switch (permission) {
      case 'teacher':
        return user.value.userType === 'teacher'
      case 'student':
        return user.value.userType === 'student'
      case 'admin':
        return user.value.userType === 'admin'
      case 'super_admin':
        return user.value.userType === 'super_admin'
      case 'any_admin':
        return user.value.userType === 'admin' || user.value.userType === 'super_admin'
      default:
        return false
    }
  }

  // دالة التحقق من حالة المستخدم
  const isUserActive = computed(() => {
    return user.value?.status === 'active'
  })

  return {
    // البيانات
    user: computed(() => user.value),
    token: computed(() => token.value),
    isAuthenticated: computed(() => isAuthenticated.value),
    requiresProfileCompletion,
    isUserActive,
    
    // الدوال
    login,
    logout,
    updateUser,
    loadUserFromStorage,
    redirectBasedOnUserStatus,
    hasPermission
  }
}
