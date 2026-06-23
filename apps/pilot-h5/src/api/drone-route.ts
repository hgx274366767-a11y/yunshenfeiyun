/**
 * 无人机航线智能规划 API
 * 后端地址：https://api.yunshenfeiyun.cn
 */

const API_BASE_URL = 'https://api.yunshenfeiyun.cn'

// 航线规划请求参数
export interface RoutePlanParams {
  start_lat: number
  start_lng: number
  end_lat: number
  end_lng: number
  altitude?: number
  drone_type?: string
}

// 航线优化请求参数
export interface RouteOptimizeParams {
  waypoints: Array<{ lat: number; lng: number; altitude?: number }>
  drone_type?: string
}

// 天气查询参数
export interface WeatherParams {
  lat: number
  lng: number
}

// 禁飞区检查参数
export interface GeofenceCheckParams {
  lat: number
  lng: number
  radius?: number
}

// 航线点
export interface RoutePoint {
  lat: number
  lng: number
  altitude: number
  distance?: number
}

// 航线规划结果
export interface RoutePlanResult {
  success: boolean
  data?: {
    route_id: string
    waypoints: RoutePoint[]
    total_distance: number
    estimated_time: number
    flight_path: string
  }
  error?: string
}

// 航线优化结果
export interface RouteOptimizeResult {
  success: boolean
  data?: {
    optimized_waypoints: RoutePoint[]
    original_distance: number
    optimized_distance: number
    saved_distance: number
  }
  error?: string
}

// 天气信息
export interface WeatherInfo {
  success: boolean
  data?: {
    temperature: number
    humidity: number
    wind_speed: number
    wind_direction: string
    visibility: number
    condition: string
    is_flyable: boolean
  }
  error?: string
}

// 禁飞区检查结果
export interface GeofenceCheckResult {
  success: boolean
  data?: {
    is_safe: boolean
    zone_name?: string
    zone_type?: string
    message: string
  }
  error?: string
}

// 无人机型号
export interface DroneModel {
  id: string
  name: string
  max_payload: number
  max_flight_time: number
  max_range: number
  features: string[]
}

// API 错误处理
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '网络错误' }))
    throw new Error(error.message || `请求失败: ${response.status}`)
  }
  return response.json()
}

// 通用请求方法
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  return handleResponse<T>(response)
}

/**
 * 规划航线
 */
export async function planRoute(params: RoutePlanParams): Promise<RoutePlanResult> {
  return request<RoutePlanResult>('/api/v1/routes/plan', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/**
 * 优化航线
 */
export async function optimizeRoute(params: RouteOptimizeParams): Promise<RouteOptimizeResult> {
  return request<RouteOptimizeResult>('/api/v1/routes/optimize', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/**
 * 查询天气
 */
export async function getWeather(params: WeatherParams): Promise<WeatherInfo> {
  const queryString = new URLSearchParams({
    lat: params.lat.toString(),
    lng: params.lng.toString(),
  }).toString()
  return request<WeatherInfo>(`/api/v1/weather?${queryString}`)
}

/**
 * 检查禁飞区
 */
export async function checkGeofence(params: GeofenceCheckParams): Promise<GeofenceCheckResult> {
  return request<GeofenceCheckResult>('/api/v1/geofence/check', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/**
 * 获取支持的无人机型号
 */
export async function getDroneModels(): Promise<{ success: boolean; data: DroneModel[] }> {
  return request<{ success: boolean; data: DroneModel[] }>('/api/v1/drones')
}
