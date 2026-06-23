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
   * 发送验证码（使用邮箱验证码，手机号作为邮箱前缀）
   */
  async sendOtp(params: SendOtpParams): Promise<{ error?: string }> {
    // 将手机号转换为邮箱格式：13800138000 -> 13800138000@yunshenfeiyun.com
    const email = `${params.phone}@yunshenfeiyun.com`

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
    })

    if (error) {
      return { error: error.message }
    }
    return {}
  },

  /**
   * 验证验证码并登录
   */
  async verifyOtp(params: VerifyOtpParams): Promise<{ error?: string }> {
    // 将手机号转换为邮箱格式
    const email = `${params.phone}@yunshenfeiyun.com`

    const { error } = await supabase.auth.verifyOtp({
      email: email,
      token: params.token,
      type: 'email',
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
