/**
 * 自动派单定时任务 — 由 pg_cron / 外部定时器周期性调用
 *
 * 扫描超过 auto_dispatch_hours 小时无人接单的订单，自动派单
 * 默认 48 小时
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { findBestPilot } from "./dispatch-algorithm.ts";

export interface DispatchCronResult {
  processed: number;
  dispatched: number;
  suspended: number;
  failed: number;
  details: Array<{
    order_id: string;
    pilot_id?: string;
    score?: number;
    reason?: string;
  }>;
}

export async function runAutoDispatch(
  supabase: ReturnType<typeof createClient>,
): Promise<DispatchCronResult> {
  const now = new Date();

  // 加载配置：触发时长
  const { data: cfgRow } = await supabase
    .from("system_config")
    .select("config_value")
    .eq("config_group", "dispatch")
    .eq("config_key", "auto_dispatch_hours")
    .eq("is_active", true)
    .single();

  const triggerHours = cfgRow?.config_value?.value ?? 48;
  const cutoff = new Date(now.getTime() - triggerHours * 60 * 60 * 1000);

  // 查找超时无人接单且未派单过的订单
  const { data: pendingOrders } = await supabase
    .from("orders")
    .select("id, order_no, user_id")
    .in("status", ["grabbable_gold", "grabbable_senior", "grabbable_all"])
    .lte("created_at", cutoff.toISOString())
    .is("current_dispatch_pilot_id", null);

  if (!pendingOrders || pendingOrders.length === 0) {
    return { processed: 0, dispatched: 0, suspended: 0, failed: 0, details: [] };
  }

  let dispatched = 0;
  let suspended = 0;
  let failed = 0;
  const details: DispatchCronResult["details"] = [];

  for (const order of pendingOrders) {
    try {
      const result = await findBestPilot(supabase, { order_id: order.id });

      if (result.dispatched && result.pilot) {
        const dispatchRound = 1;
        const confirmDeadline = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        // 写入订单
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            status: "dispatch_sent",
            current_dispatch_pilot_id: result.pilot.user_id,
            dispatch_type: "auto",
            auto_dispatch_at: now.toISOString(),
            auto_dispatch_candidates: [result.pilot],
            auto_dispatch_round: dispatchRound,
            auto_dispatch_confirm_deadline: confirmDeadline,
            updated_at: now.toISOString(),
          })
          .eq("id", order.id);

        if (updateError) {
          failed++;
          details.push({ order_id: order.id, reason: updateError.message });
          continue;
        }

        // 派单日志
        await supabase.from("dispatch_logs").insert({
          order_id: order.id,
          pilot_id: result.pilot.user_id,
          dispatch_type: "auto",
          score_breakdown: result.pilot.breakdown,
          dispatch_round: dispatchRound,
          status: "sent",
          sent_at: now.toISOString(),
        });

        // 通知飞手
        await supabase.from("messages").insert({
          user_id: result.pilot.user_id,
          title: "系统自动派单",
          content: `订单 ${order.order_no} 超过${triggerHours}小时无人接单，系统已自动分配给您，请在15分钟内确认`,
          type: "order",
          related_order_id: order.id,
        });

        dispatched++;
        details.push({
          order_id: order.id,
          pilot_id: result.pilot.user_id,
          score: result.pilot.total,
        });
      } else {
        // 无可用飞手 → 挂起
        await supabase
          .from("orders")
          .update({
            status: "dispatch_pending",
            updated_at: now.toISOString(),
          })
          .eq("id", order.id);

        // 通知用户
        if (order.user_id) {
          await supabase.from("messages").insert({
            user_id: order.user_id,
            title: "订单暂无人接单",
            content: `订单 ${order.order_no} 超过${triggerHours}小时无人接单，当前无可用飞手，已挂起`,
            type: "order",
            related_order_id: order.id,
          });
        }

        suspended++;
        details.push({
          order_id: order.id,
          reason: result.reason || "无可用飞手",
        });
      }
    } catch (err: any) {
      failed++;
      details.push({ order_id: order.id, reason: err.message });
    }
  }

  return { processed: pendingOrders.length, dispatched, suspended, failed, details };
}
