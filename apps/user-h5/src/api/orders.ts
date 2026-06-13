import type { CreateOrderParams, Order, OrderStatus, PriceEstimate } from '@/types'
import { supabase } from './supabase'

export interface OrderListParams {
  status?: OrderStatus
  page?: number
  pageSize?: number
}

export const ordersApi = {
  /**
   * 获取当前用户的订单列表
   */
  async getList(params: OrderListParams = {}): Promise<{ data: Order[] | null, error?: string }> {
    const { status, page = 1, pageSize = 10 } = params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: '未登录' }
    }

    let query = supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
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
   * 创建订单
   */
  async create(params: CreateOrderParams): Promise<{ data: Order | null, error?: string }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: '未登录' }
    }

    // 先尝试调用 Edge Function 创建订单
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (token) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const response = await fetch(`${supabaseUrl}/functions/v1/create-order`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            goods_type: params.goods_type,
            goods_weight: params.goods_weight,
            goods_desc: params.goods_desc,
            pickup_address: params.pickup_address,
            pickup_lat: params.pickup_lat,
            pickup_lng: params.pickup_lng,
            delivery_address: params.delivery_address,
            delivery_lat: params.delivery_lat,
            delivery_lng: params.delivery_lng,
            altitude: params.altitude,
            elevation_diff: params.elevation_diff,
            lifting_method: params.lifting_method,
            urgency: params.urgency,
            contact_phone: params.contact_phone,
            remark: params.remark,
          }),
        })

        if (response.ok) {
          const result = await response.json()
          return { data: result.order || result.data || result }
        }
      }
    }
    catch (err) {
      console.warn('[orders.create] Edge Function 调用失败，降级到直接插入:', err)
    }

    // 降级方案：直接插入 orders 表
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        goods_type: params.goods_type,
        goods_weight: params.goods_weight,
        goods_desc: params.goods_desc || null,
        pickup_address: params.pickup_address,
        pickup_lat: params.pickup_lat || null,
        pickup_lng: params.pickup_lng || null,
        delivery_address: params.delivery_address,
        delivery_lat: params.delivery_lat || null,
        delivery_lng: params.delivery_lng || null,
        altitude: params.altitude,
        elevation_diff: params.elevation_diff,
        lifting_method: params.lifting_method,
        price: 0,
        remark: params.remark || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }
    return { data: data as Order }
  },

  /**
   * 取消订单
   */
  async cancel(id: string): Promise<{ error?: string }> {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }
    return {}
  },

  /**
   * 估算价格
   */
  async estimatePrice(params: {
    goods_weight: number
    altitude: number
    elevation_diff: number
    urgency: string
  }): Promise<{ data: PriceEstimate | null, error?: string }> {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (token) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const response = await fetch(`${supabaseUrl}/functions/v1/pricing/calculate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        })

        if (response.ok) {
          const result = await response.json()
          return { data: result }
        }
      }
    }
    catch (err) {
      console.warn('[orders.estimatePrice] Pricing API 调用失败，降级到本地估算:', err)
    }

    // 降级方案：简单估算
    const base = 50
    const weightFee = params.goods_weight * 2
    const altitudeFee = params.altitude * 0.5
    const elevationFee = params.elevation_diff * 0.3
    const urgencyMultipliers: Record<string, number> = {
      '2h': 1.5,
      'today': 1.2,
      'tomorrow': 1.0,
      'any': 1.0,
    }
    const urgencyFee = (urgencyMultipliers[params.urgency] || 1.0) - 1
    const subtotal = base + weightFee + altitudeFee + elevationFee
    const total = Math.round(subtotal * (1 + urgencyFee))

    return {
      data: {
        base_price: base,
        distance_fee: 0,
        weight_fee: weightFee,
        altitude_fee: altitudeFee,
        urgency_fee: Math.round(subtotal * urgencyFee),
        total_price: total,
      },
    }
  },
}
