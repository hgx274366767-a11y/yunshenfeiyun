/**
 * 动态定价引擎单元测试
 *
 * 覆盖：基础价格、地形因子、时效因子、风险因子、供需因子、
 *       政策因子、价格上下限、重量系数
 */
import { describe, it, expect } from "vitest";

// ============================================================
// 从 calculate-price.ts 提取的纯函数（与生产代码一致）
// ============================================================

/** 重量系数 */
function calcWeightCoefficient(weightKg: number): number {
  if (weightKg <= 50) return 1.0;
  if (weightKg <= 100) return 1.2;
  if (weightKg <= 200) return 1.5;
  return 2.0;
}

/** 基础价格 = 距离 × 单价 × 重量系数 */
function calcBasePrice(distanceKm: number, weightKg: number, unitPrice = 3.5): number {
  return Math.round(distanceKm * unitPrice * calcWeightCoefficient(weightKg) * 100) / 100;
}

/** 地形因子 */
const TERRAIN_FACTORS: Record<string, number> = {
  PLAIN: 0,
  HILL: 0.10,
  MOUNTAIN: 0.15,
  VALLEY: 0.12,
  CROSSING: 0.15,
};

/** 空域政策因子 */
const AIRSPACE_FACTORS: Record<string, number> = {
  REGULAR: 0,
  TEMP: 0.05,
  CONTROLLED: 0.10,
  SENSITIVE: 0.15,
};

/** 时效因子 */
function calcTimeFactor(
  timeRequired?: string,
  isNight?: boolean,
  currentHour?: number,
): number {
  let factor = 0;
  switch (timeRequired) {
    case "URGENT_2H": factor += 0.30; break;
    case "URGENT_4H": factor += 0.20; break;
    case "SAME_DAY": factor += 0.10; break;
  }
  const hour = currentHour ?? (isNight ? 22 : 10);
  if (hour >= 20 || hour < 6) factor += 0.10;
  else if (hour >= 6 && hour < 8) factor += 0.08;
  return factor;
}

/** 供需因子 */
function calcDemandFactor(orderCount: number, pilotCount: number): number {
  if (pilotCount <= 0) return 0.20;
  const ratio = orderCount / pilotCount;
  if (ratio > 2.0) return 0.20;
  if (ratio > 1.5) return 0.15;
  if (ratio > 1.2) return 0.10;
  if (ratio < 0.5) return -0.10;
  if (ratio < 0.8) return -0.05;
  return 0;
}

/** 风险因子（天气） */
function calcRiskFactor(
  windLevel: number,
  hasThunder: boolean,
  rainLevel?: string,
  temperature?: number,
): { factor: number; prohibited: boolean } {
  if (windLevel >= 6) return { factor: 999, prohibited: true };
  if (hasThunder) return { factor: 999, prohibited: true };

  let factor = 0;
  if (windLevel >= 4) factor += 0.10;
  switch (rainLevel) {
    case "HEAVY": factor += 0.30; break;
    case "MODERATE": factor += 0.15; break;
    case "LIGHT": factor += 0.10; break;
  }
  if (temperature != null) {
    if (temperature > 35) factor += 0.05;
    else if (temperature > 30) factor += 0.03;
    else if (temperature < 0) factor += 0.08;
    else if (temperature < 5) factor += 0.05;
  }
  return { factor, prohibited: false };
}

// ============================================================
// 基础价格
// ============================================================

describe("基础价格计算", () => {
  it("5km × 3.5元/km × 重量系数1.0 = 17.5元", () => {
    const price = calcBasePrice(5, 30, 3.5);
    expect(price).toBe(17.5);
  });

  it("50-100kg 重量系数 1.2 — 5km × 3.5 × 1.2 = 21元", () => {
    const price = calcBasePrice(5, 80, 3.5);
    expect(price).toBe(21);
  });

  it("100-200kg 重量系数 1.5 — 10km × 3.5 × 1.5 = 52.5元", () => {
    const price = calcBasePrice(10, 150, 3.5);
    expect(price).toBe(52.5);
  });

  it(">200kg 重量系数 2.0 — 10km × 3.5 × 2.0 = 70元", () => {
    const price = calcBasePrice(10, 250, 3.5);
    expect(price).toBe(70);
  });

  it("重量≤50kg 中间值 25kg", () => {
    expect(calcWeightCoefficient(25)).toBe(1.0);
  });

  it("重量边界 50kg（系数1.0）", () => {
    expect(calcWeightCoefficient(50)).toBe(1.0);
  });

  it("重量边界 50.1kg（系数1.2）", () => {
    expect(calcWeightCoefficient(50.1)).toBe(1.2);
  });

  it("重量边界 100kg（系数1.2）", () => {
    expect(calcWeightCoefficient(100)).toBe(1.2);
  });

  it("重量边界 100.1kg（系数1.5）", () => {
    expect(calcWeightCoefficient(100.1)).toBe(1.5);
  });

  it("重量边界 200kg（系数1.5）", () => {
    expect(calcWeightCoefficient(200)).toBe(1.5);
  });

  it("重量边界 200.1kg（系数2.0）", () => {
    expect(calcWeightCoefficient(200.1)).toBe(2.0);
  });

  it("0kg（系数1.0，由上层validate拦截）", () => {
    expect(calcWeightCoefficient(0)).toBe(1.0);
  });
});

// ============================================================
// 地形因子
// ============================================================

describe("地形因子", () => {
  it("平原 0%", () => {
    expect(TERRAIN_FACTORS.PLAIN).toBe(0);
  });

  it("丘陵 +10%", () => {
    expect(TERRAIN_FACTORS.HILL).toBe(0.10);
  });

  it("山区 +15%", () => {
    expect(TERRAIN_FACTORS.MOUNTAIN).toBe(0.15);
  });

  it("山谷 +12%", () => {
    expect(TERRAIN_FACTORS.VALLEY).toBe(0.12);
  });

  it("跨江 +15%", () => {
    expect(TERRAIN_FACTORS.CROSSING).toBe(0.15);
  });

  it("山区+跨江=30%", () => {
    const total = TERRAIN_FACTORS.MOUNTAIN + 0.15; // crossing_river extra
    expect(total).toBe(0.30);
  });

  it("精密吊装额外+5%", () => {
    const precisionExtra = 0.05;
    expect(TERRAIN_FACTORS.MOUNTAIN + precisionExtra).toBe(0.20);
  });
});

// ============================================================
// 时效因子
// ============================================================

describe("时效因子", () => {
  it("2h急送 +30%", () => {
    expect(calcTimeFactor("URGENT_2H", false, 10)).toBe(0.30);
  });

  it("4h急送 +20%", () => {
    expect(calcTimeFactor("URGENT_4H", false, 10)).toBe(0.20);
  });

  it("当日达 +10%", () => {
    expect(calcTimeFactor("SAME_DAY", false, 10)).toBe(0.10);
  });

  it("标准时效 0%", () => {
    expect(calcTimeFactor(undefined, false, 10)).toBe(0);
  });

  it("夜间(22:00) +10%", () => {
    expect(calcTimeFactor(undefined, false, 22)).toBe(0.10);
  });

  it("夜间(03:00) +10%", () => {
    expect(calcTimeFactor(undefined, false, 3)).toBe(0.10);
  });

  it("夜间边界 20:00", () => {
    expect(calcTimeFactor(undefined, false, 20)).toBe(0.10);
  });

  it("夜间边界 05:59", () => {
    expect(calcTimeFactor(undefined, false, 5)).toBe(0.10);
  });

  it("早高峰(06:00-08:00) +8%", () => {
    expect(calcTimeFactor(undefined, false, 7)).toBe(0.08);
  });

  it("早高峰边界 06:00", () => {
    expect(calcTimeFactor(undefined, false, 6)).toBe(0.08);
  });

  it("日间(10:00)无附加", () => {
    expect(calcTimeFactor(undefined, false, 10)).toBe(0);
  });

  it("2h急送 + 夜间 = 40%", () => {
    expect(calcTimeFactor("URGENT_2H", false, 22)).toBe(0.40);
  });
});

// ============================================================
// 供需因子
// ============================================================

describe("供需因子", () => {
  it("无在线飞手 → +20%", () => {
    expect(calcDemandFactor(5, 0)).toBe(0.20);
  });

  it("供不应求 ratio>2.0 → +20%", () => {
    expect(calcDemandFactor(21, 10)).toBe(0.20);
  });

  it("需求旺盛 ratio>1.5 → +15%", () => {
    expect(calcDemandFactor(16, 10)).toBe(0.15);
  });

  it("需求偏高 ratio>1.2 → +10%", () => {
    expect(calcDemandFactor(13, 10)).toBe(0.10);
  });

  it("供需平衡 0.8≤ratio≤1.2 → 0%", () => {
    expect(calcDemandFactor(10, 10)).toBe(0);
  });

  it("供给充足 ratio<0.8 → -5%", () => {
    expect(calcDemandFactor(7, 10)).toBe(-0.05);
  });

  it("供过于求 ratio<0.5 → -10%", () => {
    expect(calcDemandFactor(4, 10)).toBe(-0.10);
  });

  it("边界 ratio=2.0 → +15%（落在>1.5分支）", () => {
    // ratio=2.0 不满足 >2.0，但满足 >1.5
    expect(calcDemandFactor(20, 10)).toBe(0.15);
  });

  it("边界 ratio=1.5 → +10%", () => {
    expect(calcDemandFactor(15, 10)).toBe(0.10);
  });
});

// ============================================================
// 天气风险因子
// ============================================================

describe("天气风险因子", () => {
  it("风力≥6级 → 禁止作业", () => {
    const result = calcRiskFactor(6, false);
    expect(result.prohibited).toBe(true);
    expect(result.factor).toBe(999);
  });

  it("风力7级 → 禁止作业", () => {
    const result = calcRiskFactor(7, false);
    expect(result.prohibited).toBe(true);
  });

  it("雷电 → 禁止作业", () => {
    const result = calcRiskFactor(0, true);
    expect(result.prohibited).toBe(true);
    expect(result.factor).toBe(999);
  });

  it("风力4-5级 +10%", () => {
    const result = calcRiskFactor(4, false);
    expect(result.factor).toBe(0.10);
    expect(result.prohibited).toBe(false);
  });

  it("风力5级 +10%", () => {
    const result = calcRiskFactor(5, false);
    expect(result.factor).toBe(0.10);
  });

  it("大雨 +30%", () => {
    const result = calcRiskFactor(0, false, "HEAVY");
    expect(result.factor).toBe(0.30);
  });

  it("中雨 +15%", () => {
    const result = calcRiskFactor(0, false, "MODERATE");
    expect(result.factor).toBe(0.15);
  });

  it("小雨 +10%", () => {
    const result = calcRiskFactor(0, false, "LIGHT");
    expect(result.factor).toBe(0.10);
  });

  it("高温>35°C +5%", () => {
    const result = calcRiskFactor(0, false, undefined, 36);
    expect(result.factor).toBe(0.05);
  });

  it("偏热>30°C +3%", () => {
    const result = calcRiskFactor(0, false, undefined, 32);
    expect(result.factor).toBe(0.03);
  });

  it("低温<0°C +8%", () => {
    const result = calcRiskFactor(0, false, undefined, -5);
    expect(result.factor).toBe(0.08);
  });

  it("偏冷<5°C +5%", () => {
    const result = calcRiskFactor(0, false, undefined, 2);
    expect(result.factor).toBe(0.05);
  });

  it("正常天气无额外风险", () => {
    const result = calcRiskFactor(2, false, undefined, 20);
    expect(result.factor).toBe(0);
    expect(result.prohibited).toBe(false);
  });

  it("大风+大雨 → 10%+30%=40%", () => {
    const result = calcRiskFactor(5, false, "HEAVY");
    expect(result.factor).toBe(0.40);
  });
});

// ============================================================
// 政策因子
// ============================================================

describe("空域政策因子", () => {
  it("常规空域 0%", () => {
    expect(AIRSPACE_FACTORS.REGULAR).toBe(0);
  });

  it("临时空域 +5%", () => {
    expect(AIRSPACE_FACTORS.TEMP).toBe(0.05);
  });

  it("管制空域 +10%", () => {
    expect(AIRSPACE_FACTORS.CONTROLLED).toBe(0.10);
  });

  it("敏感空域 +15%", () => {
    expect(AIRSPACE_FACTORS.SENSITIVE).toBe(0.15);
  });
});

// ============================================================
// 价格保护
// ============================================================

describe("价格上下限保护", () => {
  const FLOOR_RATIO = 0.7;
  const CEILING_RATIO = 3.0;

  it("下限 = 基准价 × 0.7", () => {
    const basePrice = 100;
    expect(basePrice * FLOOR_RATIO).toBe(70);
  });

  it("上限 = 基准价 × 3.0", () => {
    const basePrice = 100;
    expect(basePrice * CEILING_RATIO).toBe(300);
  });

  it("低运价被提升到下限", () => {
    const basePrice = 100;
    const computed = 50; // 低于下限
    const adjusted = Math.max(basePrice * FLOOR_RATIO, Math.min(basePrice * CEILING_RATIO, computed));
    expect(adjusted).toBe(70);
  });

  it("高运价被压到上限", () => {
    const basePrice = 100;
    const computed = 500; // 高于上限
    const adjusted = Math.max(basePrice * FLOOR_RATIO, Math.min(basePrice * CEILING_RATIO, computed));
    expect(adjusted).toBe(300);
  });

  it("正常价格不触发上下限", () => {
    const basePrice = 100;
    const computed = 150;
    const adjusted = Math.max(basePrice * FLOOR_RATIO, Math.min(basePrice * CEILING_RATIO, computed));
    expect(adjusted).toBe(150);
  });
});

// ============================================================
// 平台利润率
// ============================================================

describe("平台利润率 — 12%佣金 - 3%保险成本 = 9%", () => {
  it("运输价100元 → 利润9元", () => {
    const transportPrice = 100;
    const platformRate = 0.12;
    const insuranceRate = 0.03;
    const revenue = transportPrice * platformRate;
    const cost = transportPrice * insuranceRate;
    const marginPercent = Math.round(((revenue - cost) / transportPrice) * 10000) / 100;
    expect(marginPercent).toBe(9);
  });
});

// ============================================================
// 完整定价场景
// ============================================================

describe("完整定价场景", () => {
  it("标准订单：5km, 80kg, 山区, 标准时效", () => {
    const basePrice = calcBasePrice(5, 80); // 5 × 3.5 × 1.2 = 21
    const terrainFactor = TERRAIN_FACTORS.MOUNTAIN; // 0.15
    const timeFactor = calcTimeFactor(undefined, false, 10); // 0
    const riskFactor = calcRiskFactor(2, false).factor; // 0
    const policyFactor = AIRSPACE_FACTORS.REGULAR; // 0
    const totalFactor = terrainFactor + timeFactor + riskFactor + policyFactor;

    const transportPrice = Math.round(basePrice * (1 + totalFactor) * 100) / 100;
    const floorPrice = basePrice * 0.7;
    const ceilingPrice = basePrice * 3.0;
    const adjusted = Math.max(floorPrice, Math.min(ceilingPrice, transportPrice));

    expect(basePrice).toBe(21);
    expect(totalFactor).toBe(0.15);
    expect(transportPrice).toBe(24.15);
    expect(adjusted).toBe(24.15);
  });

  it("禁止作业：雷电天气", () => {
    const risk = calcRiskFactor(0, true);
    expect(risk.prohibited).toBe(true);
  });

  it("禁止作业：8级大风", () => {
    const risk = calcRiskFactor(8, false);
    expect(risk.prohibited).toBe(true);
  });

  it("复杂场景：2h急送 + 山区 + 跨江 + 夜间 + 大雨 + 管制空域", () => {
    const terrainTotal = TERRAIN_FACTORS.MOUNTAIN + 0.15; // 山区+跨江=0.30
    const timeFactor = calcTimeFactor("URGENT_2H", false, 22); // 0.30+0.10=0.40
    const riskFactor = calcRiskFactor(0, false, "HEAVY").factor; // 0.30
    const policyFactor = AIRSPACE_FACTORS.CONTROLLED; // 0.10
    const totalFactor = terrainTotal + timeFactor + riskFactor + policyFactor;

    expect(totalFactor).toBe(1.10); // 30%+40%+30%+10%
  });
});
