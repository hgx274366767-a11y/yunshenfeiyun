/**
 * 派单触发 — 手动/自动派单
 *
 * 48小时后无人接单 → 自动派发给最佳飞手
 * 管理员可指定 pilot_id 手动派单
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTopPilots, type PilotWithScore } from "./dispatch-algorithm.ts";

export interface DispatchInput {
  order_id: string;
  pilot_id?: string; // 手动指定飞手（管理员）
}

export interface DispatchResult {
  order_id: string;
  pilot_id: string;
  pilot_name: string;
  score_breakdown: Record<string, unknown>;
  confirm_deadline: string;
  dispatch_round: number;
  dispatch_type: "manual" | "auto";
  candidates: PilotWithScore[];
}

export async function dispatchOrder(
  supabase: ReturnType<typeof createClient>,
  input: DispatchInput,
): Promise<DispatchResult> {
  const { order_id, pilot_id } = input;

  // 1. 加载订单
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", order_id)
    .single();

  if (orderError || !order) {
    throw new Error("ORDER_NOT_FOUND: 订单不存在");
  }

  // 只允许待派单或抢单失败的订单
  const dispatchableStatuses = [
    "grabbable_gold", "grabbable_senior", "grabbable_all",
    "dispatch_pending", "dispatch_sent",
  ];
  if (!dispatchableStatuses.includes(order.status)) {
    throw new Error(`ORDER_STATUS_INVALID: 订单状态 ${order.status} 不可派单`);
  }

  // 2. 48小时检查（手动派单跳过）
  if (!pilot_id) {
    const { data: cfgRow } = await supabase
      .from("system_config")
      .select("config_value")
      .eq("config_group", "dispatch")
      .eq("config_key", "auto_dispatch_hours")
      .eq("is_active", true)
      .single();

    const dispatchHours = cfgRow?.config_value?.value ?? 48;
    const createdAt = new Date(order.created_at).getTime();
    const hoursSinceCreation = (Date.now() - createdAt) / (1000 * 60 * 60);

    if (hoursSinceCreation < dispatchHours) {
      throw new Error(
        `DISPATCH_NOT_READY: 需等待${dispatchHours}小时后才能自动派单，当前仅${Math.round(hoursSinceCreation)}小时`,
      );
    }
  }

  // 3. 获取候选飞手
  const candidates = await getTopPilots(supabase, order_id, 10);

  if (candidates.length === 0) {
    throw new Error("NO_AVAILABLE_PILOT: 暂无可用飞手");
  }

  // 4. 确定目标飞手
  let targetPilot: PilotWithScore;
  let dispatchType: "manual" | "auto";

  if (pilot_id) {
    const manual = candidates.find((c) => c.user_id === pilot_id);
    if (!manual) {
      throw new Error("PILOT_NOT_AVAILABLE: 指定飞手不在线或不满足条件");
    }
    targetPilot = manual;
    dispatchType = "manual";
  } else {
    targetPilot = candidates[0];
    dispatchType = "auto";

    if (targetPilot.total < 15) {
      throw new Error(`SCORE_TOO_LOW: 最佳飞手得分${targetPilot.total}，不满足最低阈值`);
    }
  }

  // 5. 计算确认截止时间（15分钟）
  const dispatchRound = (order.auto_dispatch_round || 0) + 1;
  const confirmDeadline = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // 6. 更新订单
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "dispatch_sent",
      current_dispatch_pilot_id: targetPilot.user_id,
      dispatch_type: dispatchType,
      auto_dispatch_at: new Date().toISOString(),
      auto_dispatch_candidates: candidates,
      auto_dispatch_round: dispatchRound,
      auto_dispatch_confirm_deadline: confirmDeadline,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order_id);

  if (updateError) throw new Error(`ORDER_UPDATE_FAILED: ${updateError.message}`);

  // 7. 写入派单日志
  await supabase.from("dispatch_logs").insert({
    order_id,
    pilot_id: targetPilot.user_id,
    dispatch_type: dispatchType,
    score_breakdown: targetPilot.breakdown,
    dispatch_round: dispatchRound,
    status: "sent",
    sent_at: new Date().toISOString(),
  });

  // 8. 通知被派单的飞手
  await supabase.from("messages").insert({
    user_id: targetPilot.user_id,
    title: dispatchType === "auto" ? "系统自动派单" : "管理员指派订单",
    content: `订单 ${order.order_no} 已${dispatchType === "auto" ? "自动" : ""}分配给您，请在15分钟内确认接单`,
    type: "order",
    related_order_id: order_id,
  });

  // 9. 通知下单用户
  if (order.user_id) {
    await supabase.from("messages").insert({
      user_id: order.user_id,
      title: "订单已派单",
      content: `订单 ${order.order_no} 已派给飞手，等待确认`,
      type: "order",
      related_order_id: order_id,
    });
  }

  return {
    order_id,
    pilot_id: targetPilot.user_id,
    pilot_name: "",
    score_breakdown: targetPilot.breakdown,
    confirm_deadline: confirmDeadline,
    dispatch_round: dispatchRound,
    dispatch_type: dispatchType,
    candidates,
  };
}
