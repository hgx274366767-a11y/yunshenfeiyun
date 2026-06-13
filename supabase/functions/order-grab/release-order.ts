/**
 * 释放订单 — 飞手取消 / 超时确认
 * 订单重回抢单池，通知用户"飞手已变更"
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ReleaseInput {
  order_id: string;
  pilot_id: string;
  reason: "pilot_cancel" | "timeout" | "admin_cancel";
}

export async function releaseOrder(
  supabase: ReturnType<typeof createClient>,
  input: ReleaseInput
): Promise<void> {
  const { data: order } = await supabase
    .from("orders")
    .select("status, pilot_id, order_no, user_id")
    .eq("id", input.order_id)
    .single();

  if (!order || order.pilot_id !== input.pilot_id) {
    throw new Error("订单状态不符，无法取消");
  }

  // 状态回退：回到抢单池
  const { error } = await supabase
    .from("orders")
    .update({
      status: "grabbable_all",
      pilot_id: null,
      cancel_reason: `飞手取消: ${input.reason}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.order_id);

  if (error) throw new Error(error.message);

  // 通知用户
  await supabase.from("messages").insert({
    user_id: order.user_id,
    title: "飞手已变更",
    content: `订单 ${order.order_no} 因${input.reason === "timeout" ? "超时未确认" : "飞手取消"}，已重新开放抢单`,
    type: "order",
    related_order_id: input.order_id,
  });

  // 扣除信用分（非超时免罚次数内）
  if (input.reason !== "timeout") {
    const { data: creditCfg } = await supabase
      .from("system_config")
      .select("config_value")
      .eq("config_group", "credit")
      .eq("config_key", "bonus_dispatch_reject_free")
      .eq("is_active", true)
      .single();

    const { count: rejectCount } = await supabase
      .from("credit_score_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", input.pilot_id)
      .eq("action", "cancel_midway");

    const freeCount = creditCfg?.config_value?.value ?? 3;
    if ((rejectCount || 0) >= freeCount) {
      await supabase.rpc("update_credit_score", {
        p_user_id: input.pilot_id,
        p_change_amount: -10,
        p_action: "cancel_midway",
        p_order_id: input.order_id,
        p_reason: `飞手途中取消订单 ${order.order_no}`,
      });
    }
  }
}
