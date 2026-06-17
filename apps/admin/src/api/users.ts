import { supabase } from './supabase'

export interface User {
  id: string
  phone: string
  real_name: string | null
  role: string
  status: string
  credit_score: number
  credit_level: string
  created_at: string
  last_login_at: string | null
}

/** 用户列表 */
export async function listUsers(params?: { page?: number; role?: string }) {
  const page = params?.page || 1
  const pageSize = 20

  let query = supabase
    .from('users')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (params?.role) {
    query = query.eq('role', params.role)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data as User[], total: count || 0 }
}

/** 用户统计 */
export async function getUserStats() {
  const [total, clients, pilots] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'client'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'pilot'),
  ])

  return {
    total: total.count || 0,
    clients: clients.count || 0,
    pilots: pilots.count || 0,
  }
}
