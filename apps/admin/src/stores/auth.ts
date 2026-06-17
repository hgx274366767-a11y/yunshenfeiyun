import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getCurrentUser, login as apiLogin, logout as apiLogout, type AdminUser } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AdminUser | null>(null)
  const loading = ref(true)

  const isLoggedIn = computed(() => !!user.value)

  async function init() {
    loading.value = true
    try {
      user.value = await getCurrentUser()
    } catch {
      user.value = null
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string) {
    user.value = await apiLogin(email, password)
  }

  async function logout() {
    await apiLogout()
    user.value = null
  }

  return { user, loading, isLoggedIn, init, login, logout }
})
