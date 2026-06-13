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

// ========== 飞手相关 ==========

export type CreditLevel = 'gold' | 'senior' | 'probation'

export interface PilotInfo {
  id: string
  name: string
  phone: string
  avatar: string
  credit_score: number
  online_status: boolean
  cert_status: 'pending' | 'approved' | 'rejected'
  license_no: string
  drone_model: string
  total_orders: number
  total_earnings: number
  today_orders: number
}

export interface GrabbableOrder {
  id: string
  order_type: string
  status: string
  goods_type: string
  goods_weight: number
  straight_line_distance: number
  pickup_address: string
  delivery_address: string
  pickup_lat: number
  pickup_lng: number
  delivery_lat: number
  delivery_lng: number
  terrain_type: string
  final_price: number
  insurance_premium: number
  pilot_deposit_amount: number
  is_basic_order: boolean
  is_emergency: boolean
  current_eligible_level: string
  grab_eligible_after: string
  created_at: string
  altitude?: number
  elevation_diff?: number
  lifting_method?: string
}

export interface TaskInfo {
  id: string
  order_id: string
  status: string
  goods_type: string
  goods_weight: number
  distance_km: number
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  delivery_address: string
  delivery_lat: number
  delivery_lng: number
  total_price: number
  current_step: string
  earnings: number
  altitude?: number
  elevation_diff?: number
  lifting_method?: string
}

export type TaskStep = 'assigned' | 'heading_pickup' | 'arrived_pickup' | 'executing' | 'completed'

export const TASK_STEP_MAP: Record<TaskStep, { label: string, index: number }> = {
  assigned: { label: '已接单', index: 0 },
  heading_pickup: { label: '前往取货点', index: 0 },
  arrived_pickup: { label: '已到达取货点', index: 1 },
  executing: { label: '吊运执行中', index: 2 },
  completed: { label: '已完成', index: 4 },
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
