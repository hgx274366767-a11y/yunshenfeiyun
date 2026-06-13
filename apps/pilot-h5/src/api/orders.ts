import type { GrabbableOrder, OrderStatus, TaskInfo } from '@/types'
import { supabase } from './supabase'

export interface Order {
  id: string
  order_no: string
  status: OrderStatus
  goods_type: string
  goods_weight: number
  goods_desc?: string | null
  pickup_address: string
  pickup_lat?: number | null
  pickup_lng?: number | null
  delivery_address: string
  delivery_lat?: number | null
  delivery_lng?: number | null
  altitude: number
  elevation_diff: number
  lifting_method: string
  price: number
  remark?: string | null
  created_at: string
  updated_at: string
}

export interface OrderListParams {
  status?: OrderStatus
  page?: number
  pageSize?: number
}

export const ordersApi = {
  /**
   * 获取订单列表
   */
  async getList(params: OrderListParams = {}): Promise<{ data: Order[] | null, error?: string }> {
    const { status, page = 1, pageSize = 10 } = params

    let query: any = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error: error.message }
    }
    return { data: data as Order[] }
  },

  /**
   * 获取订单详情
   */
  async getDetail(id: string): Promise<{ data: Order | null, error?: string }> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }
    return { data: data as Order }
  },

  /**
   * 接受订单
   */
  async accept(id: string): Promise<{ error?: string }> {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }
    return {}
  },

  /**
   * 完成订单
   */
  async complete(id: string): Promise<{ error?: string }> {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }
    return {}
  },

  /**
   * 获取可抢单列表（分层抢单）
   */
  async getGrabbableList(): Promise<{ data: GrabbableOrder[], error?: string }> {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        return { data: [], error: '未登录' }
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/pilot-orders/grabbable`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        return await this._fallbackGrabbableList()
      }

      const result = await response.json()
      return { data: result.orders || result.data || [] }
    }
    catch {
      return await this._fallbackGrabbableList()
    }
  },

  /**
   * 降级方案：直接查询 pending 订单
   */
  async _fallbackGrabbableList(): Promise<{ data: GrabbableOrder[], error?: string }> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return { data: [], error: error.message }
    }

    const mapped: GrabbableOrder[] = (data || []).map((o: any) => ({
      id: o.id,
      order_type: o.order_type || 'agri_up',
      status: 'grabbable_all',
      goods_type: o.goods_type || '物资',
      goods_weight: o.goods_weight || 0,
      straight_line_distance: 0,
      pickup_address: o.pickup_address || '',
      delivery_address: o.delivery_address || '',
      pickup_lat: o.pickup_lat || 0,
      pickup_lng: o.pickup_lng || 0,
      delivery_lat: o.delivery_lat || 0,
      delivery_lng: o.delivery_lng || 0,
      terrain_type: 'MOUNTAIN',
      final_price: o.price || 0,
      insurance_premium: 0,
      pilot_deposit_amount: 0,
      is_basic_order: true,
      is_emergency: false,
      current_eligible_level: 'all',
      grab_eligible_after: new Date().toISOString(),
      created_at: o.created_at,
      altitude: o.altitude,
      elevation_diff: o.elevation_diff,
      lifting_method: o.lifting_method,
    }))

    return { data: mapped }
  },

  /**
   * 抢单
   */
  async grabOrder(orderId: string): Promise<{ error?: string }> {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        return { error: '未登录' }
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/order-grab`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_id: orderId }),
      })

      if (!response.ok) {
        return await this._fallbackGrabOrder(orderId)
      }

      return {}
    }
    catch {
      return await this._fallbackGrabOrder(orderId)
    }
  },

  /**
   * 降级方案：直接更新订单状态
   */
  async _fallbackGrabOrder(orderId: string): Promise<{ error?: string }> {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', 'pending')

    if (error) {
      return { error: error.message }
    }
    return {}
  },

  /**
   * 获取当前执行中的任务
   */
  async getCurrentTask(): Promise<{ data: TaskInfo | null, error?: string }> {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        return { data: null, error: '未登录' }
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/pilot-orders/task/current`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        return { data: result.data || result }
      }
    }
    catch {
      // 降级
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user)
      return { data: null, error: '未登录' }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('pilot_id', user.id)
      .in('status', ['accepted', 'in_progress'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return { data: null, error: error?.message || '暂无执行中的任务' }
    }

    const task: TaskInfo = {
      id: (data as any).id,
      order_id: (data as any).id,
      status: (data as any).status,
      goods_type: (data as any).goods_type,
      goods_weight: (data as any).goods_weight,
      distance_km: 0,
      pickup_address: (data as any).pickup_address,
      pickup_lat: (data as any).pickup_lat || 0,
      pickup_lng: (data as any).pickup_lng || 0,
      delivery_address: (data as any).delivery_address,
      delivery_lat: (data as any).delivery_lat || 0,
      delivery_lng: (data as any).delivery_lng || 0,
      total_price: (data as any).price,
      current_step: (data as any).status === 'accepted' ? 'assigned' : 'executing',
      earnings: (data as any).price,
      altitude: (data as any).altitude,
      elevation_diff: (data as any).elevation_diff,
      lifting_method: (data as any).lifting_method,
    }

    return { data: task }
  },

  /**
   * 更新任务步骤
   */
  async updateTaskStep(orderId: string, step: string): Promise<{ error?: string }> {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (token) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const response = await fetch(`${supabaseUrl}/functions/v1/pilot-orders/step`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ order_id: orderId, step }),
        })

        if (response.ok)
          return {}
      }
    }
    catch {
      // 降级
    }

    const statusMap: Record<string, string> = {
      arrived_pickup: 'in_progress',
      executing: 'in_progress',
      completed: 'completed',
    }

    const newStatus = statusMap[step]
    if (newStatus) {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)

      if (error)
        return { error: error.message }
    }

    return {}
  },

  /**
   * 飞手上下线
   */
  async setOnlineStatus(online: boolean): Promise<{ error?: string }> {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (token) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const response = await fetch(`${supabaseUrl}/functions/v1/pilot-orders/online-status`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ online }),
        })

        if (response.ok)
          return {}
      }
    }
    catch {
      // 降级
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('pilots')
        .update({ status: online ? 'online' : 'offline' })
        .eq('user_id', user.id)
    }

    return {}
  },

  /**
   * 获取飞手统计信息
   */
  async getPilotStats(): Promise<{ data: Partial<import('@/types').PilotInfo> | null, error?: string }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user)
      return { data: null, error: '未登录' }

    const { data, error } = await supabase
      .from('pilots')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return { data: null, error: error?.message || '获取信息失败' }
    }

    return {
      data: {
        id: (data as any).id,
        name: (data as any).name,
        phone: (data as any).phone,
        avatar: (data as any).avatar || '',
        credit_score: (data as any).rating * 20,
        online_status: (data as any).status === 'online',
        cert_status: 'approved',
        license_no: '',
        drone_model: '',
        total_orders: (data as any).total_orders,
        total_earnings: 0,
        today_orders: 0,
      },
    }
  },
}
