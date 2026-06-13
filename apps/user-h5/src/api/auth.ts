import { supabase } from './supabase'

export interface SendOtpParams {
  phone: string
}

export interface VerifyOtpParams {
  phone: string
  token: string
}

export const authApi = {
  /**
   * 发送短信验证码
   */
  async sendOtp(params: SendOtpParams): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signInWithOtp({
      phone: params.phone,
    })

    if (error) {
      return { error: error.message }
    }
    return {}
  },

  /**
   * 验证短信验证码并登录
   */
  async verifyOtp(params: VerifyOtpParams): Promise<{ error?: string }> {
    const { error } = await supabase.auth.verifyOtp({
      phone: params.phone,
      token: params.token,
      type: 'sms',
    })

    if (error) {
      return { error: error.message }
    }
    return {}
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
