import type { User } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const loading = ref(false)

  /**
   * 初始化：检查当前会话
   */
  async function init() {
    loading.value = true
    try {
      const { session } = await authApi.getSession()
      if (session?.user) {
        user.value = {
          id: session.user.id,
          phone: session.user.phone ?? '',
          role: 'pilot',
        }
        isAuthenticated.value = true
      }
    }
    finally {
      loading.value = false
    }
  }

  /**
   * 发送验证码
   */
  async function sendOtp(phone: string): Promise<{ error?: string }> {
    return authApi.sendOtp({ phone })
  }

  /**
   * 验证码登录
   */
  async function login(phone: string, token: string): Promise<{ error?: string }> {
    loading.value = true
    try {
      const result = await authApi.verifyOtp({ phone, token })
      if (result.error) {
        return result
      }

      const { user: currentUser } = await authApi.getUser()
      if (currentUser) {
        user.value = {
          id: currentUser.id,
          phone: currentUser.phone ?? '',
          role: 'pilot',
        }
        isAuthenticated.value = true
      }
      return {}
    }
    finally {
      loading.value = false
    }
  }

  /**
   * 退出登录
   */
  async function logout() {
    await authApi.signOut()
    user.value = null
    isAuthenticated.value = false
  }

  return {
    user,
    isAuthenticated,
    loading,
    init,
    sendOtp,
    login,
    logout,
  }
})
