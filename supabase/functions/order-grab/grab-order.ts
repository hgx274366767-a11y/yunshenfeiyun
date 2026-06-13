/**
 * 分层抢单核心逻辑
 * 通过 RPC attempt_grab_order 原子操作完成抢单
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface GrabInput {
  order_id: string;
  pilot_id: string;
}

export interface GrabResult {
  success: boolean;
  order_id: string;
  pilot_id: string;
  eligible_level: string;
  minutes_since_create: number;
}

export async function grabOrder(
  supabase: ReturnType<typeof createClient>,
  input: GrabInput
): Promise<GrabResult> {
  // 1. 加载抢单配置
  const { data: rows } = await supabase
    .from("system_config")
    .select("config_key, config_value")
    .eq("config_group", "grab")
    .eq("is_active", true);

  const grabCfg: Record<string, any> = {};
  (rows || []).forEach((r: any) => { grabCfg[r.config_key] = r.config_value; });

  // 2. 加载信用等级阈值
  const { data: creditRows } = await supabase
    .from("system_config")
    .select("config_key, config_value")
    .eq("config_group", "credit")
    .eq("is_active", true);

  const creditCfg: Record<string, any> = {};
  (creditRows || []).forEach((r: any) => { creditCfg[r.config_key] = r.config_value; });

  const levelThresholds = creditCfg["level_thresholds"]?.value ?? { gold: 95, senior: 85, probation: 70 };

  // 3. 调用数据库原子函数（行级锁保证唯一飞手）
  const { data, error } = await supabase.rpc("attempt_grab_order", {
    p_order_id: input.order_id,
    p_pilot_id: input.pilot_id,
    p_gold_window_minutes: grabCfg["gold_window_minutes"]?.value ?? 5,
    p_senior_window_minutes: grabCfg["senior_window_minutes"]?.value ?? 5,
    p_gold_threshold: levelThresholds.gold,
    p_senior_threshold: levelThresholds.senior,
  });

  if (error) {
    throw new Error(`GRAB_FAILED: ${error.message}`);
  }

  const result = data as any;
  if (!result?.success) {
    throw new Error(result?.error || "抢单失败");
  }

  // 4. 通知客户端（通过 messages 表 + Realtime）
  const { data: order } = await supabase
    .from("orders")
    .select("order_no, user_id")
    .eq("id", input.order_id)
    .single();

  if (order) {
    await supabase.from("messages").insert({
      user_id: order.user_id,
      title: "飞手已接单",
      content: `订单 ${order.order_no} 已被飞手接单，请等待吊运`,
      type: "order",
      related_order_id: input.order_id,
    });
  }

  return result as GrabResult;
}
