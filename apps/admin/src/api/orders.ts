import { supabase } from './supabase'

export interface Order {
  id: string
  order_no: string
  user_id: string
  pilot_id: string | null
  order_type: string
  goods_type: string
  goods_weight: number
  final_price: number
  status: string
  terrain_type: string
  pickup_address: string
  delivery_address: string
  straight_line_distance: number
  created_at: string
  updated_at: string
  completed_at: string | null
  users?: { phone: string; real_name: string }
}

const ORDER_PAGE_SIZE = 20

/** 订单列表 */
export async function listOrders(params?: {
  page?: number
  status?: string
  orderType?: string
}) {
  const page = params?.page || 1

  let query = supabase
    .from('orders')
    .select('*, users!orders_user_id_fkey(phone, real_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * ORDER_PAGE_SIZE, page * ORDER_PAGE_SIZE - 1)

  if (params?.status) {
    query = query.eq('status', params.status)
  }
  if (params?.orderType) {
    query = query.eq('order_type', params.orderType)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data as Order[], total: count || 0 }
}

/** 订单详情 */
export async function getOrderDetail(id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, users!orders_user_id_fkey(phone, real_name), pilots!orders_pilot_id_fkey(user_id)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

/** 更新订单状态 */
export async function updateOrderStatus(orderId: string, status: string, remark?: string) {
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
  if (error) throw error

  // 写入订单日志
  await supabase.from('order_logs').insert({
    order_id: orderId,
    action: `admin_status_change`,
    new_status: status,
    remark: remark || `管理员手动调整为 ${status}`,
  })
}

/** 订单统计 */
export async function getOrderStats() {
  const [total, completed, active] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', [
      'grabbable_gold', 'grabbable_senior', 'grabbable_all',
      'accepted', 'in_flight', 'picked_up',
    ]),
  ])

  const { data: revenueData } = await supabase
    .from('orders')
    .select('final_price')
    .eq('status', 'completed')

  const totalRevenue = revenueData?.reduce((sum, o) => sum + (o.final_price || 0), 0) || 0

  return {
    total: total.count || 0,
    completed: completed.count || 0,
    active: active.count || 0,
    totalRevenue,
  }
}
