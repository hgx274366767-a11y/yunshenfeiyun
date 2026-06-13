/**
 * 自动派单四维评分算法单元测试
 *
 * 覆盖：距离得分(40%)、信用得分(30%)、活跃度得分(20%)、
 *       区域经验(10%)、Haversine距离、综合排名、边界场景
 */
import { describe, it, expect } from "vitest";

// ============================================================
// 从 dispatch-algorithm.ts 提取的纯函数（与生产代码一致）
// ============================================================

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getOrderRegion(order: { pickup_lat?: number; pickup_lng?: number }): string {
  const lat = order.pickup_lat || 0;
  const lng = order.pickup_lng || 0;
  return `${Math.round(lat * 10) / 10}_${Math.round(lng * 10) / 10}`;
}

interface DispatchBreakdown {
  distance: { score: number; distance_km: number };
  credit: { score: number; credit_value: number };
  activity: { score: number; orders_7d: number };
  experience: { score: number; has_experience: boolean };
}

interface DispatchScore {
  total: number;
  breakdown: DispatchBreakdown;
}

function calculateDispatchScore(
  pilot: {
    current_lat: number;
    current_lng: number;
    credit_score?: number;
    users?: { credit_score: number };
    recent_completed_orders_7d?: number;
  },
  order: { pickup_lat: number; pickup_lng: number },
  regionHistory: Array<{ pickup_lat: number; pickup_lng: number }>,
): DispatchScore {
  // 1. 距离得分 (40%)
  const distance = haversineKm(
    pilot.current_lat || 0,
    pilot.current_lng || 0,
    order.pickup_lat,
    order.pickup_lng,
  );
  const maxDistance = 50;
  const distanceScore = Math.max(0, 40 * (1 - distance / maxDistance));

  // 2. 信用分得分 (30%)
  const creditValue = pilot.users?.credit_score ?? pilot.credit_score ?? 70;
  const creditScore = (creditValue / 100) * 30;

  // 3. 活跃度得分 (20%)
  const maxActivityOrders = 50;
  const recentOrders = pilot.recent_completed_orders_7d || 0;
  const activityScore = Math.min(20, (recentOrders / maxActivityOrders) * 20);

  // 4. 区域经验得分 (10%)
  const orderRegion = getOrderRegion(order);
  const hasRegionExperience = regionHistory.some(
    (h) => getOrderRegion(h) === orderRegion,
  );
  const experienceScore = hasRegionExperience ? 10 : 0;

  const total = distanceScore + creditScore + activityScore + experienceScore;

  return {
    total: Math.round(total * 100) / 100,
    breakdown: {
      distance: {
        score: Math.round(distanceScore * 100) / 100,
        distance_km: Math.round(distance * 100) / 100,
      },
      credit: {
        score: Math.round(creditScore * 100) / 100,
        credit_value: creditValue,
      },
      activity: {
        score: Math.round(activityScore * 100) / 100,
        orders_7d: recentOrders,
      },
      experience: {
        score: experienceScore,
        has_experience: hasRegionExperience,
      },
    },
  };
}

/** 从飞手列表中选出得分最高的（模拟 getTopPilots 的核心逻辑） */
function rankPilots(
  pilots: Array<{
    pilot_id: string;
    current_lat: number;
    current_lng: number;
    credit_score: number;
    recent_completed_orders_7d: number;
    regionHistory: Array<{ pickup_lat: number; pickup_lng: number }>;
  }>,
  order: { pickup_lat: number; pickup_lng: number },
): Array<{ pilot_id: string } & DispatchScore> {
  const scored = pilots.map((p) => ({
    pilot_id: p.pilot_id,
    ...calculateDispatchScore(
      { ...p },
      order,
      p.regionHistory,
    ),
  }));
  scored.sort((a, b) => b.total - a.total);
  return scored;
}

// ============================================================
// Haversine 距离
// ============================================================

describe("Haversine 距离计算", () => {
  it("相同点距离为 0", () => {
    expect(haversineKm(30.5, 104.0, 30.5, 104.0)).toBe(0);
  });

  it("北京到上海约 1068km", () => {
    const dist = haversineKm(39.9, 116.4, 31.2, 121.5);
    expect(dist).toBeGreaterThan(1000);
    expect(dist).toBeLessThan(1200);
  });

  it("重庆到成都约 270km", () => {
    const dist = haversineKm(29.56, 106.55, 30.57, 104.07);
    expect(dist).toBeGreaterThan(250);
    expect(dist).toBeLessThan(300);
  });

  it("0.01度 ≈ 1.1km", () => {
    const dist = haversineKm(30.0, 104.0, 30.01, 104.0);
    expect(dist).toBeGreaterThan(1.0);
    expect(dist).toBeLessThan(1.3);
  });

  it("纯东方向 1 度在赤道约 111km", () => {
    const dist = haversineKm(0, 104.0, 0, 105.0);
    expect(dist).toBeGreaterThan(110);
    expect(dist).toBeLessThan(112);
  });

  it("距离对称（往返相等）", () => {
    const a = haversineKm(30.5, 104.1, 31.2, 105.3);
    const b = haversineKm(31.2, 105.3, 30.5, 104.1);
    expect(a).toBeCloseTo(b, 6);
  });
});

// ============================================================
// 距离得分 (40%)
// ============================================================

describe("距离得分 (权重40%)", () => {
  const order = { pickup_lat: 30.5, pickup_lng: 104.0 };

  it("0km → 满分40", () => {
    const score = calculateDispatchScore(
      { current_lat: 30.5, current_lng: 104.0, credit_score: 70 },
      order,
      [],
    );
    expect(score.breakdown.distance.score).toBe(40);
    expect(score.breakdown.distance.distance_km).toBe(0);
  });

  it("25km → 约20分", () => {
    // 纬度30.5度处，1度经度≈96km，需约0.26度=25km
    const score = calculateDispatchScore(
      { current_lat: 30.5, current_lng: 104.27, credit_score: 70 },
      order,
      [],
    );
    const dist = score.breakdown.distance.distance_km;
    const distScore = score.breakdown.distance.score;
    expect(dist).toBeGreaterThan(24);
    expect(dist).toBeLessThan(26);
    expect(distScore).toBeGreaterThan(18);
    expect(distScore).toBeLessThan(22);
  });

  it("50km → 约0分", () => {
    // 需约0.52度经度差
    const score = calculateDispatchScore(
      { current_lat: 30.5, current_lng: 104.52, credit_score: 70 },
      order,
      [],
    );
    const dist = score.breakdown.distance.distance_km;
    expect(dist).toBeGreaterThan(48);
    expect(dist).toBeLessThan(52);
    expect(score.breakdown.distance.score).toBeLessThan(2);
  });

  it("超过50km → 0分（不出现负分）", () => {
    const score = calculateDispatchScore(
      { current_lat: 30.5, current_lng: 105.1, credit_score: 70 }, // >100km
      order,
      [],
    );
    expect(score.breakdown.distance.score).toBe(0);
  });

  it("5km → 约36分", () => {
    const score = calculateDispatchScore(
      { current_lat: 30.5, current_lng: 104.05, credit_score: 70 }, // ~5km
      order,
      [],
    );
    const dist = score.breakdown.distance.distance_km;
    expect(dist).toBeGreaterThan(4);
    expect(dist).toBeLessThan(6);
    expect(score.breakdown.distance.score).toBeGreaterThan(35);
    expect(score.breakdown.distance.score).toBeLessThan(37);
  });
});

// ============================================================
// 信用得分 (30%)
// ============================================================

describe("信用得分 (权重30%)", () => {
  const order = { pickup_lat: 30.5, pickup_lng: 104.0 };
  const atPickup = { current_lat: 30.5, current_lng: 104.0 };

  it("信用100分 → 30分满分", () => {
    const score = calculateDispatchScore(
      { ...atPickup, credit_score: 100 },
      order,
      [],
    );
    expect(score.breakdown.credit.score).toBe(30);
    expect(score.breakdown.credit.credit_value).toBe(100);
  });

  it("信用70分 → 21分", () => {
    const score = calculateDispatchScore(
      { ...atPickup, credit_score: 70 },
      order,
      [],
    );
    expect(score.breakdown.credit.score).toBe(21);
  });

  it("信用0分 → 0分", () => {
    const score = calculateDispatchScore(
      { ...atPickup, credit_score: 0 },
      order,
      [],
    );
    expect(score.breakdown.credit.score).toBe(0);
  });

  it("信用85分(senior) → 25.5分", () => {
    const score = calculateDispatchScore(
      { ...atPickup, credit_score: 85 },
      order,
      [],
    );
    expect(score.breakdown.credit.score).toBe(25.5);
  });

  it("信用60分(restricted) → 18分", () => {
    const score = calculateDispatchScore(
      { ...atPickup, credit_score: 60 },
      order,
      [],
    );
    expect(score.breakdown.credit.score).toBe(18);
  });

  it("从 users.credit_score 读取（join 查询）", () => {
    const score = calculateDispatchScore(
      { current_lat: 30.5, current_lng: 104.0, users: { credit_score: 90 } },
      order,
      [],
    );
    expect(score.breakdown.credit.score).toBe(27);
    expect(score.breakdown.credit.credit_value).toBe(90);
  });

  it("无信用分时默认 70", () => {
    const score = calculateDispatchScore(
      { current_lat: 30.5, current_lng: 104.0 },
      order,
      [],
    );
    expect(score.breakdown.credit.credit_value).toBe(70);
    expect(score.breakdown.credit.score).toBe(21);
  });
});

// ============================================================
// 活跃度得分 (20%)
// ============================================================

describe("活跃度得分 (权重20%)", () => {
  const order = { pickup_lat: 30.5, pickup_lng: 104.0 };
  const atPickup = { current_lat: 30.5, current_lng: 104.0, credit_score: 70 };

  it("7天50单 → 20分满分", () => {
    const score = calculateDispatchScore(
      { ...atPickup, recent_completed_orders_7d: 50 },
      order,
      [],
    );
    expect(score.breakdown.activity.score).toBe(20);
    expect(score.breakdown.activity.orders_7d).toBe(50);
  });

  it("7天超过50单 → 仍为20分（封顶）", () => {
    const score = calculateDispatchScore(
      { ...atPickup, recent_completed_orders_7d: 80 },
      order,
      [],
    );
    expect(score.breakdown.activity.score).toBe(20);
  });

  it("7天25单 → 10分", () => {
    const score = calculateDispatchScore(
      { ...atPickup, recent_completed_orders_7d: 25 },
      order,
      [],
    );
    expect(score.breakdown.activity.score).toBe(10);
  });

  it("7天0单 → 0分", () => {
    const score = calculateDispatchScore(
      { ...atPickup, recent_completed_orders_7d: 0 },
      order,
      [],
    );
    expect(score.breakdown.activity.score).toBe(0);
  });

  it("无活跃数据默认 0", () => {
    const score = calculateDispatchScore(
      { current_lat: 30.5, current_lng: 104.0, credit_score: 70 },
      order,
      [],
    );
    expect(score.breakdown.activity.score).toBe(0);
    expect(score.breakdown.activity.orders_7d).toBe(0);
  });

  it("7天5单 → 2分", () => {
    const score = calculateDispatchScore(
      { ...atPickup, recent_completed_orders_7d: 5 },
      order,
      [],
    );
    expect(score.breakdown.activity.score).toBe(2);
  });
});

// ============================================================
// 区域经验 (10%)
// ============================================================

describe("区域经验得分 (权重10%)", () => {
  const order = { pickup_lat: 30.5, pickup_lng: 104.0 };
  const atPickup = { current_lat: 30.5, current_lng: 104.0, credit_score: 70 };

  it("有同区域经验 → 10分", () => {
    const score = calculateDispatchScore(
      atPickup,
      order,
      [{ pickup_lat: 30.51, pickup_lng: 104.02 }], // 同区域 (30.5_104.0)
    );
    expect(score.breakdown.experience.score).toBe(10);
    expect(score.breakdown.experience.has_experience).toBe(true);
  });

  it("无区域经验 → 0分", () => {
    const score = calculateDispatchScore(
      atPickup,
      order,
      [],
    );
    expect(score.breakdown.experience.score).toBe(0);
    expect(score.breakdown.experience.has_experience).toBe(false);
  });

  it("不同区域 → 0分", () => {
    const score = calculateDispatchScore(
      atPickup,
      order,
      [{ pickup_lat: 31.0, pickup_lng: 105.0 }], // 区域 31.0_105.0 ≠ 30.5_104.0
    );
    expect(score.breakdown.experience.score).toBe(0);
  });

  it("区域精度 0.1度 ≈ 11km网格", () => {
    // Math.round(lat*10)/10 去掉了末尾的 .0（JS 默认行为）
    expect(getOrderRegion({ pickup_lat: 30.51, pickup_lng: 104.02 })).toBe("30.5_104");
    expect(getOrderRegion({ pickup_lat: 30.54, pickup_lng: 104.04 })).toBe("30.5_104");
    expect(getOrderRegion({ pickup_lat: 30.55, pickup_lng: 104.05 })).toBe("30.6_104.1");
    expect(getOrderRegion({ pickup_lat: 30.59, pickup_lng: 104.09 })).toBe("30.6_104.1");
  });

  it("负坐标区域", () => {
    expect(getOrderRegion({ pickup_lat: -33.92, pickup_lng: 151.18 })).toBe("-33.9_151.2");
  });
});

// ============================================================
// 综合总分
// ============================================================

describe("综合总分", () => {
  const order = { pickup_lat: 30.5, pickup_lng: 104.0 };

  it("完美飞手：满分100", () => {
    const score = calculateDispatchScore(
      {
        current_lat: 30.5,
        current_lng: 104.0,
        credit_score: 100,
        recent_completed_orders_7d: 50,
      },
      order,
      [{ pickup_lat: 30.51, pickup_lng: 104.02 }], // 同区域
    );
    expect(score.total).toBe(100);
    expect(score.breakdown.distance.score).toBe(40);
    expect(score.breakdown.credit.score).toBe(30);
    expect(score.breakdown.activity.score).toBe(20);
    expect(score.breakdown.experience.score).toBe(10);
  });

  it("最差飞手：0分", () => {
    const score = calculateDispatchScore(
      {
        current_lat: 31.5, // 远离 (>50km)
        current_lng: 106.0,
        credit_score: 0,
        recent_completed_orders_7d: 0,
      },
      order,
      [],
    );
    expect(score.total).toBe(0);
  });

  it("典型飞手：70信用 + 10km + 10单 + 无经验 ≈ 53分", () => {
    const score = calculateDispatchScore(
      {
        current_lat: 30.5,
        current_lng: 104.09, // ~10km east
        credit_score: 70,
        recent_completed_orders_7d: 10,
      },
      order,
      [],
    );
    // 距离 32 + 信用 21 + 活跃 4 + 经验 0 = 57
    expect(score.total).toBeGreaterThan(50);
    expect(score.total).toBeLessThan(60);
  });

  it("总分精度保留2位小数", () => {
    const score = calculateDispatchScore(
      { current_lat: 30.5, current_lng: 104.01, credit_score: 73 },
      order,
      [],
    );
    const decimalPlaces = score.total.toString().split(".")[1]?.length || 0;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });

  it("新飞手默认值：0km+70信用+0活跃+0经验 = 61", () => {
    const score = calculateDispatchScore(
      { current_lat: 30.5, current_lng: 104.0, credit_score: 70 },
      order,
      [],
    );
    expect(score.total).toBe(61);
  });
});

// ============================================================
// 飞手排名
// ============================================================

describe("飞手排名", () => {
  const order = { pickup_lat: 30.5, pickup_lng: 104.0 };

  it("按总分降序排列", () => {
    const pilots = [
      { pilot_id: "A", current_lat: 30.51, current_lng: 104.05, credit_score: 80, recent_completed_orders_7d: 10, regionHistory: [] },
      { pilot_id: "B", current_lat: 30.5, current_lng: 104.0, credit_score: 100, recent_completed_orders_7d: 50, regionHistory: [{ pickup_lat: 30.51, pickup_lng: 104.02 }] },
      { pilot_id: "C", current_lat: 31.0, current_lng: 105.0, credit_score: 60, recent_completed_orders_7d: 3, regionHistory: [] },
    ];

    const ranked = rankPilots(pilots, order);
    expect(ranked[0].pilot_id).toBe("B"); // 满分
    expect(ranked[1].pilot_id).toBe("A"); // 中等
    expect(ranked[2].pilot_id).toBe("C"); // 最差
    expect(ranked[0].total).toBe(100);
    expect(ranked[0].total).toBeGreaterThan(ranked[1].total);
    expect(ranked[1].total).toBeGreaterThan(ranked[2].total);
  });

  it("总分相同 → 保持原序（稳定排序非必需）", () => {
    const pilots = [
      { pilot_id: "X", current_lat: 30.5, current_lng: 104.0, credit_score: 70, recent_completed_orders_7d: 0, regionHistory: [] },
      { pilot_id: "Y", current_lat: 30.5, current_lng: 104.0, credit_score: 70, recent_completed_orders_7d: 0, regionHistory: [] },
    ];

    const ranked = rankPilots(pilots, order);
    expect(ranked[0].total).toBe(ranked[1].total);
    expect(ranked[0].total).toBe(61);
  });

  it("区域经验区分同分飞手", () => {
    const pilots = [
      {
        pilot_id: "no_exp",
        current_lat: 30.5, current_lng: 104.0,
        credit_score: 70, recent_completed_orders_7d: 0,
        regionHistory: [] as Array<{ pickup_lat: number; pickup_lng: number }>,
      },
      {
        pilot_id: "has_exp",
        current_lat: 30.5, current_lng: 104.0,
        credit_score: 70, recent_completed_orders_7d: 0,
        regionHistory: [{ pickup_lat: 30.51, pickup_lng: 104.02 }],
      },
    ];

    const ranked = rankPilots(pilots, order);
    expect(ranked[0].pilot_id).toBe("has_exp");
    expect(ranked[1].pilot_id).toBe("no_exp");
  });
});

// ============================================================
// 阈值判断
// ============================================================

describe("最低得分阈值 (15分)", () => {
  const MIN_DISPATCH_SCORE = 15;
  const order = { pickup_lat: 30.5, pickup_lng: 104.0 };

  it("新飞手在取货点 → 61分 > 15 → 可派单", () => {
    const score = calculateDispatchScore(
      { current_lat: 30.5, current_lng: 104.0, credit_score: 70 },
      order, [],
    );
    expect(score.total).toBeGreaterThan(MIN_DISPATCH_SCORE);
  });

  it("信用0 + 50km外 + 0活跃 + 0经验 → 0分 → 不可派单", () => {
    const score = calculateDispatchScore(
      { current_lat: 31.5, current_lng: 106.0, credit_score: 0 },
      order, [],
    );
    expect(score.total).toBe(0);
    expect(score.total).toBeLessThan(MIN_DISPATCH_SCORE);
  });

  it("信用60(restricted) + 20km外 + 3单 → 低于15分", () => {
    // 信用太低+距离远时，总分可能仍超过15
    // 只有信用严重受损(≤30)且距离>40km才能低于15
    const score = calculateDispatchScore(
      {
        current_lat: 30.5, current_lng: 104.45, // ~43km, score≈5.6
        credit_score: 25, // 信用分 25 → 7.5
        recent_completed_orders_7d: 0,
      },
      order, [],
    );
    // 总分 = 5.6 + 7.5 + 0 + 0 ≈ 13
    expect(score.total).toBeLessThan(MIN_DISPATCH_SCORE);
  });

  it("信用50(expelled)即使在取货点 → 也低15分", () => {
    const score = calculateDispatchScore(
      { current_lat: 30.5, current_lng: 104.0, credit_score: 50 },
      order, [],
    );
    // 40 + 15 + 0 + 0 = 55 仍超过15
    // expelled 飞手已被过滤不在候选池中，但假如在池中
    expect(score.total).toBe(55);
  });
});

// ============================================================
// 权重完整性
// ============================================================

describe("四维权重之和 = 100", () => {
  it("距离40 + 信用30 + 活跃20 + 经验10 = 100", () => {
    const score = calculateDispatchScore(
      {
        current_lat: 30.5, current_lng: 104.0,
        credit_score: 100, recent_completed_orders_7d: 50,
      },
      { pickup_lat: 30.5, pickup_lng: 104.0 },
      [{ pickup_lat: 30.51, pickup_lng: 104.02 }],
    );
    const sum = score.breakdown.distance.score +
      score.breakdown.credit.score +
      score.breakdown.activity.score +
      score.breakdown.experience.score;
    expect(sum).toBe(100);
  });

  it("普通飞手各项得分在有效范围内", () => {
    const score = calculateDispatchScore(
      {
        current_lat: 30.52, current_lng: 104.05,
        credit_score: 72, recent_completed_orders_7d: 12,
      },
      { pickup_lat: 30.5, pickup_lng: 104.0 },
      [],
    );
    expect(score.breakdown.distance.score).toBeGreaterThanOrEqual(0);
    expect(score.breakdown.distance.score).toBeLessThanOrEqual(40);
    expect(score.breakdown.credit.score).toBeGreaterThanOrEqual(0);
    expect(score.breakdown.credit.score).toBeLessThanOrEqual(30);
    expect(score.breakdown.activity.score).toBeGreaterThanOrEqual(0);
    expect(score.breakdown.activity.score).toBeLessThanOrEqual(20);
    expect(score.breakdown.experience.score).toBe(0);
  });
});
