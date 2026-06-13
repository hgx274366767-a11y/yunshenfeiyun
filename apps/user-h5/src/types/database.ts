/**
 * Supabase 数据库类型定义
 * 基于云深飞运数据库 schema
 */

export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string
          order_no: string
          user_id: string
          pilot_id: string | null
          status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
          goods_type: string
          goods_weight: number
          goods_desc: string | null
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          delivery_address: string
          delivery_lat: number | null
          delivery_lng: number | null
          altitude: number
          elevation_diff: number
          lifting_method: string
          price: number
          remark: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['orders']['Row']>
      }
      pilots: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string
          avatar: string | null
          status: 'offline' | 'online' | 'busy'
          rating: number
          total_orders: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['pilots']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['pilots']['Row']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
