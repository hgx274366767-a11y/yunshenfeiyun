import { supabase } from './supabase'

export interface SendOtpParams {
  phone: string
}

export interface VerifyOtpParams {
  phone: string
  token: string
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const authApi = {
  /**
   * 发送短信验证码（调用 Edge Function）
   */
  async sendOtp(params: SendOtpParams): Promise<{ error?: string }> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ phone: params.phone }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        return { error: data.error || '验证码发送失败' }
      }
      return {}
    } catch (error) {
      return { error: '网络错误，请稍后重试' }
    }
  },

  /**
   * 验证短信验证码并登录（调用 Edge Function）
   */
  async verifyOtp(params: VerifyOtpParams): Promise<{ error?: string }> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ phone: params.phone, code: params.token }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        return { error: data.error || '验证码验证失败' }
      }

      // 存储用户信息到本地
      if (data.data?.user) {
        localStorage.setItem('user', JSON.stringify(data.data.user))
      }

      return {}
    } catch (error) {
      return { error: '网络错误，请稍后重试' }
    }
  },

  /**
   * 退出登录
   */
  async signOut(): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { error: error.message }
    }
    return {}
  },

  /**
   * 获取当前会话
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  /**
   * 获取当前用户
   */
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },
}
