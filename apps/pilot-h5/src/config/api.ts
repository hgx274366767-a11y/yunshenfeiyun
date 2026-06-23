/**
 * API 配置
 */

// 无人机航线规划 API
export const DRONE_ROUTE_API = {
  BASE_URL: 'https://api.yunshenfeiyun.cn',
  ENDPOINTS: {
    ROUTE_PLAN: '/api/v1/routes/plan',
    ROUTE_OPTIMIZE: '/api/v1/routes/optimize',
    WEATHER: '/api/v1/weather',
    GEOFENCE_CHECK: '/api/v1/geofence/check',
    DRONES: '/api/v1/drones',
  },
}

// Supabase 配置（从环境变量读取）
export const SUPABASE_CONFIG = {
  URL: import.meta.env.VITE_SUPABASE_URL || '',
  ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
}

// 其他配置
export const APP_CONFIG = {
  NAME: '云深飞运飞手端',
  VERSION: '1.0.0',
}
