import { supabase } from './supabase'

export interface Pilot {
  id: string
  user_id: string
  license_type: string | null
  license_no: string | null
  drone_model: string | null
  cert_status: string
  online_status: string
  total_orders: number
  completed_orders: number
  avg_rating: number
  created_at: string
  // 关联的 user 信息
  users?: { phone: string; real_name: string; status: string }
}

/** 飞手列表 */
export async function listPilots(params?: { page?: number; pageSize?: number; certStatus?: string }) {
  const page = params?.page || 1
  const pageSize = params?.pageSize || 20

  let query = supabase
    .from('pilots')
    .select('*, users!inner(phone, real_name, status)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (params?.certStatus) {
    query = query.eq('cert_status', params.certStatus)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data as Pilot[], total: count || 0 }
}

/** 飞手详情 */
export async function getPilotDetail(id: string) {
  const { data, error } = await supabase
    .from('pilots')
    .select('*, users!inner(phone, real_name, status, credit_score, credit_level)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

/** 审核飞手认证 */
export async function updateCertStatus(pilotId: string, status: 'approved' | 'rejected', reason?: string) {
  const { error } = await supabase
    .from('pilots')
    .update({
      cert_status: status,
      cert_reject_reason: reason || null,
      cert_reviewed_at: new Date().toISOString(),
    })
    .eq('id', pilotId)
  if (error) throw error
}
