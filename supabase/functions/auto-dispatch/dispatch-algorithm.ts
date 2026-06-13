/**
 * 自动派单算法 — 四维权重评分
 *
 * 距离 40% + 信用 30% + 活跃度 20% + 区域经验 10%
 * 48小时无人接单后触发
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface DispatchScore {
  total: number;
  breakdown: {
    distance: { score: number; distance_km: number };
    credit: { score: number; credit_value: number };
    activity: { score: number; orders_7d: number };
    experience: { score: number; has_experience: boolean };
  };
}

export interface PilotWithScore extends DispatchScore {
  pilot_id: string;
  user_id: string;
  credit_level: string;
  current_lat: number;
  current_lng: number;
}

export async function calculateDispatchScore(
  pilot: any,
  order: any,
  regionHistory: any[],
): Promise<DispatchScore> {
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
    (h: any) => getOrderRegion(h) === orderRegion,
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

export async function getTopPilots(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  limit = 10,
): Promise<PilotWithScore[]> {
  const { data: order } = await supabase
    .from("orders")
    .select("id, pickup_lat, pickup_lng, order_no")
    .eq("id", orderId)
    .single();

  if (!order) throw new Error("ORDER_NOT_FOUND: 订单不存在");

  // 查询候选飞手：在线 + 已认证 + 已缴保证金
  const { data: pilots } = await supabase
    .from("pilots")
    .select("*, users!pilots_user_id_fkey(credit_level, credit_score)")
    .eq("online_status", "online")
    .eq("cert_status", "approved")
    .eq("deposit_status", "paid");

  if (!pilots || pilots.length === 0) return [];

  // 查询所有飞手的历史订单区域（用于区域经验计算）
  const { data: allCompleted } = await supabase
    .from("orders")
    .select("pilot_id, pickup_lat, pickup_lng")
    .not("pilot_id", "is", null)
    .in("status", ["completed", "delivered"]);

  const historyByPilot = new Map<string, any[]>();
  (allCompleted || []).forEach((o: any) => {
    if (!historyByPilot.has(o.pilot_id)) historyByPilot.set(o.pilot_id, []);
    historyByPilot.get(o.pilot_id)!.push(o);
  });

  const scored: PilotWithScore[] = [];

  for (const pilot of pilots) {
    const regionHistory = historyByPilot.get(pilot.user_id) || [];
    const score = await calculateDispatchScore(pilot, order, regionHistory);

    scored.push({
      ...score,
      pilot_id: pilot.id,
      user_id: pilot.user_id,
      credit_level: pilot.users?.credit_level || "probation",
      current_lat: pilot.current_lat,
      current_lng: pilot.current_lng,
    });
  }

  scored.sort((a, b) => b.total - a.total);
  return scored.slice(0, limit);
}

/**
 * 保留旧接口兼容 dispatch-cron
 */
export async function findBestPilot(
  supabase: ReturnType<typeof createClient>,
  input: { order_id: string },
): Promise<{ dispatched: boolean; pilot?: PilotWithScore; reason?: string }> {
  const topPilots = await getTopPilots(supabase, input.order_id, 1);

  if (topPilots.length === 0) {
    return { dispatched: false, reason: "当前无可用飞手在线" };
  }

  const best = topPilots[0];

  if (best.total < 15) {
    return { dispatched: false, reason: `最佳匹配飞手得分过低(${best.total})，不适合自动派单` };
  }

  return { dispatched: true, pilot: best };
}

// === 工具函数 ===

function getOrderRegion(order: any): string {
  const lat = order.pickup_lat || 0;
  const lng = order.pickup_lng || 0;
  return `${Math.round(lat * 10) / 10}_${Math.round(lng * 10) / 10}`;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
