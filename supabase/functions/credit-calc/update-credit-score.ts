/**
 * 信用分更新 — 核心逻辑
 *
 * 加减分 → 等级重算 → 飞手状态同步 → 日志记录
 * 等级阈值: gold≥95 / senior≥85 / probation≥70 / restricted≥60 / expelled<60
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// 加减分规则（配置化，可从 DB system_config 覆盖）
// ============================================================

export const SCORE_RULES: Record<string, { score: number; reason: string; suspend_days?: number }> = {
  // === 加分项 ===
  on_time_delivery: { score: 2, reason: "准时送达" },
  early_delivery: { score: 5, reason: "提前送达" },
  customer_praise: { score: 3, reason: "客户好评" },
  streak_10_no_complaint: { score: 5, reason: "连续10单无投诉" },
  emergency_completed: { score: 5, reason: "完成应急订单" },
  photo_uploaded: { score: 1, reason: "按要求拍照留证" },

  // === 扣分项 ===
  late_arrival: { score: -3, reason: "迟到超过10分钟" },
  cargo_damage: { score: -8, reason: "货物轻微破损" },
  malicious_cancel: { score: -10, reason: "恶意取消订单" },
  no_photo: { score: -5, reason: "未拍照留证" },
  route_violation: { score: -8, reason: "未按核定航线飞行" },
  dispatch_reject: { score: -5, reason: "拒绝系统派单" },
  cancel_midway: { score: -10, reason: "飞手途中取消订单" },
  timeout_no_confirm: { score: -3, reason: "超时未确认接单" },

  // === 严重违规（含暂停天数） ===
  smuggling: { score: -15, reason: "隐瞒禁运品", suspend_days: 7 },
  overload: { score: -20, reason: "违规超载", suspend_days: 15 },
  fake_gps: { score: -30, reason: "GPS轨迹造假", suspend_days: 30 },
  serious_damage: { score: -25, reason: "货物严重损毁", suspend_days: 14 },

  // === 飞行异常（来自 flight-record 检测） ===
  route_deviation: { score: -8, reason: "航线偏离" },
  altitude_exceed: { score: -5, reason: "高度超标" },
  speed_anomaly: { score: -3, reason: "速度异常" },
  low_battery: { score: -3, reason: "低电量飞行" },
  signal_loss: { score: -3, reason: "信号丢失" },
  altitude_high: { score: -5, reason: "飞行高度超标" },
  gps_weak: { score: -2, reason: "GPS信号弱" },
  gps_gap: { score: -2, reason: "GPS信号跳变" },
  speed_high: { score: -3, reason: "飞行速度异常" },
  no_takeoff: { score: -10, reason: "疑似未起飞" },
  battery_low: { score: -2, reason: "电池电量过低" },
};

// ============================================================
// 类型定义
// ============================================================

export interface CreditUpdateInput {
  user_id: string;
  pilot_id?: string;
  order_id?: string;
  action: string;
  change_amount?: number;
  reason?: string;
}

export interface CreditUpdateResult {
  user_id: string;
  before_score: number;
  after_score: number;
  change: number;
  before_level: string;
  after_level: string;
  level_changed: boolean;
  suspended: boolean;
  suspend_until?: string;
}

// ============================================================
// 核心函数：更新信用分
// ============================================================

export async function updateCreditScore(
  supabase: ReturnType<typeof createClient>,
  input: CreditUpdateInput,
): Promise<CreditUpdateResult> {
  let changeAmount = input.change_amount ?? 0;
  let reason = input.reason ?? "";

  if (!input.change_amount && input.action) {
    const rule = SCORE_RULES[input.action];
    if (rule) {
      changeAmount = rule.score;
      reason = input.reason || rule.reason;
    }
  }

  // 1. 读取当前信用分 + 暂停状态
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("credit_score, credit_level, status")
    .eq("id", input.user_id)
    .single();

  if (userError || !user) {
    throw new Error("USER_NOT_FOUND: 用户不存在");
  }

  const beforeScore = user.credit_score ?? 70;
  const beforeLevel = user.credit_level ?? "probation";

  // 检查暂停是否已到期（自动恢复）
  if (user.status === "suspended") {
    await tryRestoreFromSuspension(supabase, input.user_id);
  }

  // 2. 计算新分数（0-100 封顶）
  const newScore = Math.max(0, Math.min(100, beforeScore + changeAmount));
  const newLevel = calculateCreditLevel(newScore);

  // 3. 更新用户表
  const { error: updateError } = await supabase
    .from("users")
    .update({
      credit_score: newScore,
      credit_level: newLevel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.user_id);

  if (updateError) throw new Error(`UPDATE_FAILED: ${updateError.message}`);

  // 4. 写入信用分日志
  await supabase.from("credit_score_logs").insert({
    user_id: input.user_id,
    pilot_id: input.pilot_id || input.user_id,
    order_id: input.order_id,
    action: input.action,
    change_amount: changeAmount,
    before_score: beforeScore,
    after_score: newScore,
    reason,
    created_at: new Date().toISOString(),
  });

  // 5. 等级变更 → 同步飞手状态
  let suspended = false;
  let suspendUntil: string | undefined;

  if (newLevel !== beforeLevel) {
    if (newLevel === "expelled") {
      await supabase
        .from("pilots")
        .update({ deposit_status: "frozen", online_status: "offline" })
        .eq("user_id", input.user_id);

      await supabase
        .from("users")
        .update({ status: "suspended" })
        .eq("id", input.user_id);

      suspended = true;
    }

    if (beforeLevel === "expelled" && newLevel !== "expelled") {
      await supabase
        .from("pilots")
        .update({ deposit_status: "paid" })
        .eq("user_id", input.user_id);

      await supabase
        .from("users")
        .update({ status: "active" })
        .eq("id", input.user_id);
    }
  }

  // 6. 检查严重违规的暂停天数
  const rule = SCORE_RULES[input.action];
  if (rule?.suspend_days) {
    suspendUntil = new Date(
      Date.now() + rule.suspend_days * 24 * 60 * 60 * 1000,
    ).toISOString();

    await supabase
      .from("users")
      .update({ status: "suspended" })
      .eq("id", input.user_id);

    await supabase
      .from("pilots")
      .update({ online_status: "offline" })
      .eq("user_id", input.user_id);

    suspended = true;

    await supabase.from("credit_score_logs").insert({
      user_id: input.user_id,
      pilot_id: input.pilot_id || input.user_id,
      order_id: input.order_id,
      action: "suspend_applied",
      change_amount: 0,
      before_score: newScore,
      after_score: newScore,
      reason: `暂停接单 ${rule.suspend_days} 天，至 ${suspendUntil}`,
      created_at: new Date().toISOString(),
    });
  }

  return {
    user_id: input.user_id,
    before_score: beforeScore,
    after_score: newScore,
    change: changeAmount,
    before_level: beforeLevel,
    after_level: newLevel,
    level_changed: newLevel !== beforeLevel,
    suspended,
    suspend_until: suspendUntil,
  };
}

// ============================================================
// 等级计算
// ============================================================

export function calculateCreditLevel(score: number): string {
  if (score >= 95) return "gold";
  if (score >= 85) return "senior";
  if (score >= 70) return "probation";
  if (score >= 60) return "restricted";
  return "expelled";
}

// ============================================================
// 查询飞手当前信用状态
// ============================================================

export async function getPilotCredit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data: user } = await supabase
    .from("users")
    .select("id, credit_score, credit_level, status")
    .eq("id", userId)
    .single();

  if (!user) throw new Error("USER_NOT_FOUND");

  if (user.status === "suspended") {
    await tryRestoreFromSuspension(supabase, userId);

    const { data: refreshed } = await supabase
      .from("users")
      .select("id, credit_score, credit_level, status")
      .eq("id", userId)
      .single();
    if (refreshed) {
      user.credit_score = refreshed.credit_score;
      user.credit_level = refreshed.credit_level;
      user.status = refreshed.status;
    }
  }

  const { data: logs } = await supabase
    .from("credit_score_logs")
    .select("action, change_amount, reason, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    user_id: user.id,
    credit_score: user.credit_score,
    credit_level: user.credit_level,
    status: user.status,
    recent_logs: logs || [],
  };
}

// ============================================================
// 暂停到期自动恢复
// ============================================================

async function tryRestoreFromSuspension(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { data: suspendLog } = await supabase
    .from("credit_score_logs")
    .select("reason, created_at")
    .eq("user_id", userId)
    .eq("action", "suspend_applied")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!suspendLog) return false;

  const match = suspendLog.reason?.match(/至 (.+)$/);
  if (!match) return false;

  const suspendUntil = new Date(match[1].trim());
  if (isNaN(suspendUntil.getTime())) return false;

  if (new Date() < suspendUntil) return false;

  const { data: user } = await supabase
    .from("users")
    .select("credit_level")
    .eq("id", userId)
    .single();

  const newStatus = user?.credit_level === "expelled" ? "suspended" : "active";

  await supabase
    .from("users")
    .update({ status: newStatus })
    .eq("id", userId);

  if (newStatus === "active") {
    await supabase
      .from("pilots")
      .update({ online_status: "offline" })
      .eq("user_id", userId);

    await supabase.from("credit_score_logs").insert({
      user_id: userId,
      pilot_id: userId,
      action: "suspend_restored",
      change_amount: 0,
      before_score: 0,
      after_score: 0,
      reason: "暂停到期，自动恢复",
      created_at: new Date().toISOString(),
    });
  }

  return true;
}
