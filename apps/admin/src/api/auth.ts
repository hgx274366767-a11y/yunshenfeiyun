import { supabase } from './supabase'

export interface AdminUser {
  id: string
  email: string
  role: string
}

/** 邮箱密码登录 */
export async function login(email: string, password: string): Promise<AdminUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)

  // 验证是否为 admin 角色
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    await supabase.auth.signOut()
    throw new Error('无管理员权限')
  }

  return { id: data.user.id, email: data.user.email || '', role: profile.role }
}

/** 退出登录 */
export async function logout() {
  await supabase.auth.signOut()
}

/** 获取当前登录用户 */
export async function getCurrentUser(): Promise<AdminUser | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') return null

  return { id: user.id, email: user.email || '', role: profile.role }
}
