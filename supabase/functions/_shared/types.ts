/**
 * 通用类型定义 — 云深飞运 Edge Functions
 */
import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// 通用 API 响应格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// 订单状态枚举
export type OrderStatus =
  | "pending" | "paid"
  | "grabbable_gold" | "grabbable_senior" | "grabbable_all"
  | "dispatch_pending" | "dispatch_sent"
  | "accepted" | "departed" | "picked_up" | "in_flight"
  | "in_progress" | "delivering"
  | "delivered" | "completed"
  | "cancelled" | "refunded" | "expired" | "suspended" | "manual_intervention";

// 飞手信用等级
export type CreditLevel = "gold" | "senior" | "probation" | "restricted" | "expelled";

// 飞手认证状态
export type PilotCertStatus = "pending" | "approved" | "rejected";

// 飞手在线状态
export type PilotOnlineStatus = "online" | "offline" | "busy";

// 货物类型
export type CargoType = "agricultural" | "forestry" | "construction" | "emergency";

// 保险类型
export type CoverageType = "cargo" | "liability" | "personal_accident" | "deposit_guarantee";

// 支付状态
export type PaymentStatus = "unpaid" | "paid" | "refunding" | "refunded";

// 保证金类型
export type DepositType = "deposit" | "insurance" | "payment" | "refund";

// 派单类型
export type DispatchType = "auto" | "manual";

// 消息类型
export type MessageType = "order" | "system" | "emergency" | "marketing";

// 信用操作
export type CreditAction =
  | "on_time_confirm"
  | "five_star_rating"
  | "dispatch_reject"
  | "cancel_midway"
  | "compliance_violation"
  | "bonus_safe_flight";

// 抢单取消原因
export type ReleaseReason = "pilot_cancel" | "timeout" | "admin_cancel";

// 飞行异常类型
export type AnomalyType = "gps_weak" | "battery_low" | "altitude_high" | "speed_high" | "no_takeoff" | "gps_gap";

// 通知渠道
export type NotifyChannel = "wx_template" | "sms" | "in_app";

// 配置获取辅助函数
export async function getSystemConfig(
  supabase: SupabaseClient,
  group: string,
  key?: string
): Promise<Record<string, any> | any> {
  let query = supabase
    .from("system_config")
    .select("config_key, config_value")
    .eq("config_group", group)
    .eq("is_active", true);

  if (key) {
    const { data } = await query.eq("config_key", key).single();
    return data?.config_value;
  }

  const { data: rows } = await query;
  const config: Record<string, any> = {};
  (rows || []).forEach((r: any) => { config[r.config_key] = r.config_value; });
  return config;
}

// 获取信用等级配置
export async function getCreditThresholds(supabase: SupabaseClient): Promise<Record<string, number>> {
  const value = await getSystemConfig(supabase, "credit", "level_thresholds");
  return value?.value ?? { gold: 95, senior: 85, probation: 70 };
}

// 获取抢单配置
export async function getGrabConfig(supabase: SupabaseClient): Promise<Record<string, any>> {
  return getSystemConfig(supabase, "grab");
}

// 获取派单配置
export async function getDispatchConfig(supabase: SupabaseClient): Promise<Record<string, any>> {
  return getSystemConfig(supabase, "dispatch");
}
