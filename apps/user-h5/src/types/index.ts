export type { Database } from './database'

export interface User {
  id: string
  phone: string
  role: 'user' | 'pilot'
}

export interface ApiResponse<T> {
  data: T | null
  error?: string
}

// ========== 订单 ==========

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

// ========== 订单状态 ==========

export type OrderStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'

export const ORDER_STATUS_MAP: Record<OrderStatus, { label: string, class: string }> = {
  pending: { label: '待接单', class: 'status-pending' },
  accepted: { label: '已接单', class: 'status-accepted' },
  in_progress: { label: '执行中', class: 'status-in-progress' },
  completed: { label: '已完成', class: 'status-completed' },
  cancelled: { label: '已取消', class: 'status-cancelled' },
}

// ========== 订单类型 ==========

export const ORDER_TYPE_MAP: Record<string, string> = {
  agri_up: '农资上山',
  agri_down: '农产品下山',
  emergency: '应急吊运',
  forestry: '林业物资',
}

export const TERRAIN_MAP: Record<string, string> = {
  PLAIN: '平原',
  HILL: '丘陵',
  MOUNTAIN: '山区',
  VALLEY: '峡谷',
  CROSSING: '跨江',
}

// ========== 时效选项 ==========

export const URGENCY_OPTIONS = [
  { value: '2h', label: '2小时内' },
  { value: 'today', label: '今天内' },
  { value: 'tomorrow', label: '明天内' },
  { value: 'any', label: '不限' },
]

// ========== 货物类型 ==========

export const GOODS_TYPE_OPTIONS = [
  '农资化肥',
  '农产品',
  '水果生鲜',
  '建材物资',
  '应急物资',
  '林业物资',
  '其他',
]

// ========== 吊运方式 ==========

export const LIFTING_METHOD_OPTIONS = [
  '标准吊运',
  '精准投放',
  '多点联运',
  '紧急吊运',
]

// ========== 创建订单参数 ==========

export interface CreateOrderParams {
  goods_type: string
  goods_weight: number
  goods_desc?: string
  pickup_address: string
  pickup_lat?: number
  pickup_lng?: number
  delivery_address: string
  delivery_lat?: number
  delivery_lng?: number
  altitude: number
  elevation_diff: number
  lifting_method: string
  urgency: string
  contact_phone: string
  remark?: string
}

// ========== 价格估算 ==========

export interface PriceEstimate {
  base_price: number
  distance_fee: number
  weight_fee: number
  altitude_fee: number
  urgency_fee: number
  total_price: number
}
