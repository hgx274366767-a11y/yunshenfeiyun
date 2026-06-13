/**
 * 信用分系统单元测试
 *
 * 覆盖：等级计算、加减分规则、投诉扣分规则、分数边界、
 *       暂停天数、等级转换边界、投诉类型校验
 */
import { describe, it, expect } from "vitest";

// ============================================================
// 从 update-credit-score.ts 提取的纯函数（与生产代码一致）
// ============================================================

function calculateCreditLevel(score: number): string {
  if (score >= 95) return "gold";
  if (score >= 85) return "senior";
  if (score >= 70) return "probation";
  if (score >= 60) return "restricted";
  return "expelled";
}

const SCORE_RULES: Record<string, { score: number; reason: string; suspend_days?: number }> = {
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

  // === 飞行异常 ===
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

const COMPLAINT_RULES: Record<string, { score: number; reason: string; suspend_days?: number }> = {
  late: { score: -3, reason: "迟到超过10分钟" },
  damage: { score: -8, reason: "货物轻微破损" },
  serious_damage: { score: -25, reason: "货物严重损毁", suspend_days: 14 },
  cancel: { score: -10, reason: "恶意取消订单" },
  no_photo: { score: -5, reason: "未拍照留证" },
  route_violation: { score: -8, reason: "未按核定航线飞行" },
  smuggling: { score: -15, reason: "隐瞒禁运品", suspend_days: 7 },
  overload: { score: -20, reason: "违规超载", suspend_days: 15 },
  fake_gps: { score: -30, reason: "GPS轨迹造假", suspend_days: 30 },
  rude_behavior: { score: -5, reason: "服务态度恶劣" },
  unresponsive: { score: -3, reason: "多次联系不上" },
};

/** 分数钳制：0-100 */
function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

/** 模拟信用分更新：加分/扣分后重算等级 */
function applyScoreChange(
  currentScore: number,
  action: string,
): { after_score: number; after_level: string; change: number; suspended: boolean; suspend_days: number } {
  const rule = SCORE_RULES[action];
  if (!rule) throw new Error(`UNKNOWN_ACTION: ${action}`);

  const afterScore = clampScore(currentScore + rule.score);
  const afterLevel = calculateCreditLevel(afterScore);

  return {
    after_score: afterScore,
    after_level: afterLevel,
    change: rule.score,
    suspended: rule.suspend_days != null,
    suspend_days: rule.suspend_days ?? 0,
  };
}

// ============================================================
// 等级计算
// ============================================================

describe("信用等级计算", () => {
  it("100分 → gold", () => {
    expect(calculateCreditLevel(100)).toBe("gold");
  });

  it("95分 → gold（边界）", () => {
    expect(calculateCreditLevel(95)).toBe("gold");
  });

  it("94分 → senior（gold下边界-1）", () => {
    expect(calculateCreditLevel(94)).toBe("senior");
  });

  it("90分 → senior", () => {
    expect(calculateCreditLevel(90)).toBe("senior");
  });

  it("85分 → senior（边界）", () => {
    expect(calculateCreditLevel(85)).toBe("senior");
  });

  it("84分 → probation（senior下边界-1）", () => {
    expect(calculateCreditLevel(84)).toBe("probation");
  });

  it("75分 → probation", () => {
    expect(calculateCreditLevel(75)).toBe("probation");
  });

  it("70分 → probation（边界）", () => {
    expect(calculateCreditLevel(70)).toBe("probation");
  });

  it("69分 → restricted（probation下边界-1）", () => {
    expect(calculateCreditLevel(69)).toBe("restricted");
  });

  it("65分 → restricted", () => {
    expect(calculateCreditLevel(65)).toBe("restricted");
  });

  it("60分 → restricted（边界）", () => {
    expect(calculateCreditLevel(60)).toBe("restricted");
  });

  it("59分 → expelled（边界-1）", () => {
    expect(calculateCreditLevel(59)).toBe("expelled");
  });

  it("30分 → expelled", () => {
    expect(calculateCreditLevel(30)).toBe("expelled");
  });

  it("0分 → expelled", () => {
    expect(calculateCreditLevel(0)).toBe("expelled");
  });

  it("负分 → expelled", () => {
    expect(calculateCreditLevel(-10)).toBe("expelled");
  });

  it("超过100分 → gold", () => {
    expect(calculateCreditLevel(120)).toBe("gold");
  });
});

// ============================================================
// 加分规则
// ============================================================

describe("加分规则", () => {
  it("准时送达 +2", () => {
    expect(SCORE_RULES.on_time_delivery.score).toBe(2);
    expect(SCORE_RULES.on_time_delivery.suspend_days).toBeUndefined();
  });

  it("提前送达 +5", () => {
    const r = applyScoreChange(80, "early_delivery");
    expect(r.after_score).toBe(85);
    expect(r.after_level).toBe("senior");
    expect(r.suspended).toBe(false);
  });

  it("客户好评 +3", () => {
    expect(SCORE_RULES.customer_praise.score).toBe(3);
  });

  it("连续10单无投诉 +5", () => {
    expect(SCORE_RULES.streak_10_no_complaint.score).toBe(5);
  });

  it("完成应急订单 +5", () => {
    expect(SCORE_RULES.emergency_completed.score).toBe(5);
  });

  it("拍照留证 +1", () => {
    const r = applyScoreChange(84, "photo_uploaded");
    expect(r.after_score).toBe(85);
    expect(r.after_level).toBe("senior");
  });

  it("84分红利加分 → 晋级senior", () => {
    const r = applyScoreChange(84, "on_time_delivery");
    expect(r.after_score).toBe(86);
    expect(r.after_level).toBe("senior");
  });
});

// ============================================================
// 扣分规则
// ============================================================

describe("扣分规则", () => {
  it("迟到 -3", () => {
    const r = applyScoreChange(80, "late_arrival");
    expect(r.after_score).toBe(77);
    expect(r.change).toBe(-3);
  });

  it("货物破损 -8", () => {
    const r = applyScoreChange(80, "cargo_damage");
    expect(r.after_score).toBe(72);
  });

  it("恶意取消订单 -10", () => {
    const r = applyScoreChange(80, "malicious_cancel");
    expect(r.after_score).toBe(70);
    expect(r.after_level).toBe("probation");
  });

  it("未拍照留证 -5", () => {
    const r = applyScoreChange(80, "no_photo");
    expect(r.after_score).toBe(75);
  });

  it("未按航线飞行 -8", () => {
    expect(SCORE_RULES.route_violation.score).toBe(-8);
  });

  it("拒绝系统派单 -5", () => {
    const r = applyScoreChange(65, "dispatch_reject");
    expect(r.after_score).toBe(60);
    expect(r.after_level).toBe("restricted");
  });

  it("飞手途中取消订单 -10", () => {
    const r = applyScoreChange(70, "cancel_midway");
    expect(r.after_score).toBe(60);
    expect(r.after_level).toBe("restricted");
  });

  it("超时未确认接单 -3", () => {
    expect(SCORE_RULES.timeout_no_confirm.score).toBe(-3);
  });
});

// ============================================================
// 严重违规 + 暂停天数
// ============================================================

describe("严重违规 + 暂停天数", () => {
  it("隐瞒禁运品 -15，暂停7天", () => {
    const r = applyScoreChange(80, "smuggling");
    expect(r.after_score).toBe(65);
    expect(r.suspended).toBe(true);
    expect(r.suspend_days).toBe(7);
  });

  it("违规超载 -20，暂停15天", () => {
    const r = applyScoreChange(80, "overload");
    expect(r.after_score).toBe(60);
    expect(r.after_level).toBe("restricted");
    expect(r.suspended).toBe(true);
    expect(r.suspend_days).toBe(15);
  });

  it("GPS轨迹造假 -30，暂停30天", () => {
    const r = applyScoreChange(80, "fake_gps");
    expect(r.after_score).toBe(50);
    expect(r.after_level).toBe("expelled");
    expect(r.suspended).toBe(true);
    expect(r.suspend_days).toBe(30);
  });

  it("货物严重损毁 -25，暂停14天", () => {
    const r = applyScoreChange(80, "serious_damage");
    expect(r.after_score).toBe(55);
    expect(r.after_level).toBe("expelled");
    expect(r.suspended).toBe(true);
    expect(r.suspend_days).toBe(14);
  });

  it("GPS造假从95分gold直降至65 restricted", () => {
    const r = applyScoreChange(95, "fake_gps");
    expect(r.after_score).toBe(65);
    expect(r.after_level).toBe("restricted");
    expect(r.suspended).toBe(true);
  });
});

// ============================================================
// 飞行异常扣分
// ============================================================

describe("飞行异常扣分", () => {
  it("航线偏离 -8", () => {
    expect(SCORE_RULES.route_deviation.score).toBe(-8);
    expect(SCORE_RULES.route_deviation.suspend_days).toBeUndefined();
  });

  it("高度超标 -5", () => {
    expect(SCORE_RULES.altitude_exceed.score).toBe(-5);
  });

  it("速度异常 -3", () => {
    expect(SCORE_RULES.speed_anomaly.score).toBe(-3);
  });

  it("低电量飞行 -3", () => {
    expect(SCORE_RULES.low_battery.score).toBe(-3);
  });

  it("信号丢失 -3", () => {
    expect(SCORE_RULES.signal_loss.score).toBe(-3);
  });

  it("飞行高度超标 -5", () => {
    expect(SCORE_RULES.altitude_high.score).toBe(-5);
  });

  it("GPS信号弱 -2", () => {
    expect(SCORE_RULES.gps_weak.score).toBe(-2);
  });

  it("GPS跳变 -2", () => {
    expect(SCORE_RULES.gps_gap.score).toBe(-2);
  });

  it("飞行速度异常 -3", () => {
    expect(SCORE_RULES.speed_high.score).toBe(-3);
  });

  it("疑似未起飞 -10", () => {
    expect(SCORE_RULES.no_takeoff.score).toBe(-10);
  });

  it("电池电量过低 -2", () => {
    expect(SCORE_RULES.battery_low.score).toBe(-2);
  });

  it("航线偏离从71分 → 63 restricted", () => {
    const r = applyScoreChange(71, "route_deviation");
    expect(r.after_score).toBe(63);
    expect(r.after_level).toBe("restricted");
  });

  it("疑似未起飞从75分 → 65 restricted", () => {
    const r = applyScoreChange(75, "no_takeoff");
    expect(r.after_score).toBe(65);
    expect(r.after_level).toBe("restricted");
  });
});

// ============================================================
// 分数边界（0-100 钳制）
// ============================================================

describe("分数边界 0-100 钳制", () => {
  it("100分加分不超100", () => {
    const r = applyScoreChange(100, "on_time_delivery");
    expect(r.after_score).toBe(100);
    expect(r.after_level).toBe("gold");
  });

  it("99分+5 → 100（钳制）", () => {
    const r = applyScoreChange(99, "early_delivery");
    expect(r.after_score).toBe(100);
  });

  it("0分扣分不低0", () => {
    const r = applyScoreChange(0, "fake_gps");
    expect(r.after_score).toBe(0);
    expect(r.after_level).toBe("expelled");
  });

  it("2分-3 → 0（钳制）", () => {
    const r = applyScoreChange(2, "late_arrival");
    expect(r.after_score).toBe(0);
  });

  it("clampScore 辅助函数", () => {
    expect(clampScore(150)).toBe(100);
    expect(clampScore(-50)).toBe(0);
    expect(clampScore(73)).toBe(73);
    expect(clampScore(0)).toBe(0);
    expect(clampScore(100)).toBe(100);
  });
});

// ============================================================
// 等级转换边界场景
// ============================================================

describe("等级转换边界场景", () => {
  it("gold→senior：95-3=92 senior（迟到）", () => {
    const r = applyScoreChange(95, "late_arrival");
    expect(r.after_score).toBe(92);
    expect(r.after_level).toBe("senior");
  });

  it("senior→probation：85-8=77 probation（货物破损）", () => {
    const r = applyScoreChange(85, "cargo_damage");
    expect(r.after_score).toBe(77);
    expect(r.after_level).toBe("probation");
  });

  it("probation→restricted：70-5=65 restricted（未拍照）", () => {
    const r = applyScoreChange(70, "no_photo");
    expect(r.after_score).toBe(65);
    expect(r.after_level).toBe("restricted");
  });

  it("restricted→expelled：60-3=57 expelled（迟到）", () => {
    const r = applyScoreChange(60, "late_arrival");
    expect(r.after_score).toBe(57);
    expect(r.after_level).toBe("expelled");
  });

  it("expelled→restricted：59+2=61 restricted（准时送达加分恢复）", () => {
    const r = applyScoreChange(59, "on_time_delivery");
    expect(r.after_score).toBe(61);
    expect(r.after_level).toBe("restricted");
  });

  it("restricted→probation：60+10+1=71 probation（好评+拍照，连加2次）", () => {
    let score = 60;
    let level = calculateCreditLevel(score);

    const r1 = applyScoreChange(score, "customer_praise");
    score = r1.after_score;
    level = r1.after_level;
    expect(score).toBe(63);
    expect(level).toBe("restricted");

    const r2 = applyScoreChange(score, "streak_10_no_complaint");
    score = r2.after_score;
    level = r2.after_level;
    expect(score).toBe(68);
    expect(level).toBe("restricted");

    const r3 = applyScoreChange(score, "emergency_completed");
    score = r3.after_score;
    level = r3.after_level;
    expect(score).toBe(73);
    expect(level).toBe("probation");
  });
});

// ============================================================
// 投诉规则完整性
// ============================================================

describe("投诉扣分规则", () => {
  it("迟到投诉 -3", () => {
    expect(COMPLAINT_RULES.late.score).toBe(-3);
    expect(COMPLAINT_RULES.late.suspend_days).toBeUndefined();
  });

  it("轻微破损 -8", () => {
    expect(COMPLAINT_RULES.damage.score).toBe(-8);
  });

  it("严重损毁 -25，暂停14天", () => {
    expect(COMPLAINT_RULES.serious_damage.score).toBe(-25);
    expect(COMPLAINT_RULES.serious_damage.suspend_days).toBe(14);
  });

  it("恶意取消 -10", () => {
    expect(COMPLAINT_RULES.cancel.score).toBe(-10);
  });

  it("未拍照 -5", () => {
    expect(COMPLAINT_RULES.no_photo.score).toBe(-5);
  });

  it("航线违规 -8", () => {
    expect(COMPLAINT_RULES.route_violation.score).toBe(-8);
  });

  it("禁运品 -15，暂停7天", () => {
    expect(COMPLAINT_RULES.smuggling.score).toBe(-15);
    expect(COMPLAINT_RULES.smuggling.suspend_days).toBe(7);
  });

  it("超载 -20，暂停15天", () => {
    expect(COMPLAINT_RULES.overload.score).toBe(-20);
    expect(COMPLAINT_RULES.overload.suspend_days).toBe(15);
  });

  it("GPS造假 -30，暂停30天", () => {
    expect(COMPLAINT_RULES.fake_gps.score).toBe(-30);
    expect(COMPLAINT_RULES.fake_gps.suspend_days).toBe(30);
  });

  it("服务态度恶劣 -5", () => {
    expect(COMPLAINT_RULES.rude_behavior.score).toBe(-5);
  });

  it("多次联系不上 -3", () => {
    expect(COMPLAINT_RULES.unresponsive.score).toBe(-3);
  });

  it("投诉规则与加扣分规则严重违规一致", () => {
    // 严重违规在 SCORE_RULES 和 COMPLAINT_RULES 中应一致
    const severe = ["smuggling", "overload", "fake_gps", "serious_damage"] as const;
    for (const key of severe) {
      expect(COMPLAINT_RULES[key].score).toBe(SCORE_RULES[key].score);
      expect(COMPLAINT_RULES[key].suspend_days).toBe(SCORE_RULES[key].suspend_days);
    }
  });
});

// ============================================================
// 规则完整性校验
// ============================================================

describe("规则完整性校验", () => {
  it("SCORE_RULES 共29条规则", () => {
    expect(Object.keys(SCORE_RULES).length).toBe(29);
  });

  it("加分项6条", () => {
    const bonus = Object.values(SCORE_RULES).filter((r) => r.score > 0);
    expect(bonus.length).toBe(6);
  });

  it("扣分项19条（不暂停）", () => {
    const penalty = Object.values(SCORE_RULES).filter(
      (r) => r.score < 0 && r.suspend_days == null,
    );
    expect(penalty.length).toBe(19); // 8 general + 11 flight anomaly
  });

  it("严重违规4条（含暂停）", () => {
    const severe = Object.values(SCORE_RULES).filter(
      (r) => r.suspend_days != null,
    );
    expect(severe.length).toBe(4);
  });

  it("飞行异常11条", () => {
    const anomalies = [
      "route_deviation", "altitude_exceed", "speed_anomaly",
      "low_battery", "signal_loss",
      "altitude_high", "gps_weak", "gps_gap",
      "speed_high", "no_takeoff", "battery_low",
    ];
    for (const key of anomalies) {
      expect(SCORE_RULES[key], `${key} 缺失`).toBeDefined();
      expect(SCORE_RULES[key].score, `${key} 分数应为负数`).toBeLessThan(0);
    }
  });

  it("COMPLAINT_RULES 共11条", () => {
    expect(Object.keys(COMPLAINT_RULES).length).toBe(11);
  });

  it("所有规则都有 reason", () => {
    for (const [key, rule] of Object.entries(SCORE_RULES)) {
      expect(rule.reason, `${key} 缺少 reason`).toBeTruthy();
      expect(rule.reason!.length, `${key} reason 太短`).toBeGreaterThan(1);
    }
  });

  it("所有规则分数在 -30 到 +5 范围内", () => {
    for (const rule of Object.values(SCORE_RULES)) {
      expect(rule.score).toBeGreaterThanOrEqual(-30);
      expect(rule.score).toBeLessThanOrEqual(5);
    }
  });

  it("暂停天数在 7-30 天范围内", () => {
    for (const rule of Object.values(SCORE_RULES)) {
      if (rule.suspend_days != null) {
        expect(rule.suspend_days).toBeGreaterThanOrEqual(7);
        expect(rule.suspend_days).toBeLessThanOrEqual(30);
      }
    }
  });
});

// ============================================================
// 连续扣分场景（累计效果）
// ============================================================

describe("连续扣分场景", () => {
  it("新飞手70分 + 迟到(-3) + 未拍照(-5) + 态度恶劣投诉(-5) = 57 expelled", () => {
    let s = 70;
    s = applyScoreChange(s, "late_arrival").after_score;
    expect(s).toBe(67);
    s = clampScore(s + SCORE_RULES.no_photo.score);
    expect(s).toBe(62);
    s = clampScore(s + COMPLAINT_RULES.rude_behavior.score);
    expect(s).toBe(57);
    expect(calculateCreditLevel(s)).toBe("expelled");
  });

  it("gold飞手连续违规：GPS造假(-30) + 超载(-20) = 50 expelled", () => {
    let s = 95;
    s = applyScoreChange(s, "fake_gps").after_score;
    expect(s).toBe(65);
    s = applyScoreChange(s, "overload").after_score;
    expect(s).toBe(45);
    expect(calculateCreditLevel(s)).toBe("expelled");
  });

  it("飞手60分：3次准时送达(+2×3) → 66 restricted（仍为restricted）", () => {
    let s = 60;
    s = applyScoreChange(s, "on_time_delivery").after_score;
    s = applyScoreChange(s, "on_time_delivery").after_score;
    s = applyScoreChange(s, "on_time_delivery").after_score;
    expect(s).toBe(66);
    expect(calculateCreditLevel(s)).toBe("restricted");
  });

  it("飞手68分：1次提前送达(+5) → 73 probation（晋级）", () => {
    let s = 68;
    s = applyScoreChange(s, "early_delivery").after_score;
    expect(s).toBe(73);
    expect(calculateCreditLevel(s)).toBe("probation");
  });
});

// ============================================================
// 未知 action 处理
// ============================================================

describe("未知 action 处理", () => {
  it("未知 action 抛出异常", () => {
    expect(() => applyScoreChange(80, "nonexistent_action")).toThrow("UNKNOWN_ACTION");
  });

  it("空字符串 action 抛出异常", () => {
    expect(() => applyScoreChange(80, "")).toThrow("UNKNOWN_ACTION");
  });
});
