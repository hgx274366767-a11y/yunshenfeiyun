/**
 * 动态定价算法 — 五维修正因子
 * 地形 + 供需 + 时效 + 风险 + 政策
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const QQMAP_KEY = Deno.env.get("QQMAP_KEY")!;

interface PricingInput {
  pickup_lng: number;
  pickup_lat: number;
  delivery_lng: number;
  delivery_lat: number;
  goods_weight: number;
  goods_type: "agricultural" | "forestry" | "construction" | "emergency";
  terrain_type?: "PLAIN" | "HILLY" | "MOUNTAIN" | "URBAN";
}

interface PricingResult {
  base_price: number;
  distance_km: number;
  weight_kg: number;
  max_payload_kg: number;
  weight_factor: number;
  terrain_factor: number;
  supply_demand_factor: number;
  urgency_factor: number;
  risk_factor: number;
  policy_factor: number;
  total_price: number;
  insurance_premium: number;
  deposit_required: number;
  can_use_deposit_insurance: boolean;
  breakdown: Record<string, string>;
}

export async function calculatePrice(
  supabase: ReturnType<typeof createClient>,
  input: PricingInput
): Promise<PricingResult> {
  // 1. 加载定价配置
  const { data: pricingRows } = await supabase
    .from("pricing_config").select("config_key, config_value").eq("is_active", true);
  const config: Record<string, any> = {};
  (pricingRows || []).forEach((r: any) => { config[r.config_key] = r.config_value; });

  // 2. 计算距离（腾讯地图优先，Haversine fallback）
  let distanceKm: number;
  try {
    distanceKm = await qqMapDistance(input);
  } catch {
    distanceKm = haversineDistance(
      input.pickup_lat, input.pickup_lng,
      input.delivery_lat, input.delivery_lng
    ) * 1.3;
  }

  // 3. 载重计算（核心定价驱动）
  const maxPayload = config["max_payload_kg"]?.value ?? 85;  // T100 最大吊运载重
  const weightFactor = Math.ceil(input.goods_weight / maxPayload); // 需要的架次数
  const effectiveWeight = weightFactor * maxPayload;

  // 4. 六维修正（载重 + 地形 + 供需 + 时效 + 风险 + 政策）
  const unitPricePerTrip = config["unit_price_per_trip"]?.value ?? 3.5; // 每架次每公里基准价
  const basePrice = unitPricePerTrip * distanceKm * weightFactor;

  const terrainFactor = getTerrainFactor(config, input.terrain_type);
  const supplyFactor = await getSupplyFactor(supabase);
  const urgencyFactor = 1.0;
  const riskFactor = await getRiskFactor();
  // 应急订单：平台佣金全免（policyFactor=0 意味着 basePrice 为 0），实际改为打 1 折（保留成本）
  const policyFactor = input.goods_type === "emergency" ? 0.1 : 1.0;

  // 不可恢复：大风≥6级
  if (riskFactor === 0) {
    throw new Error("WEATHER_UNSAFE: 当前风速≥6级，禁止作业");
  }

  const totalPrice = basePrice * terrainFactor * supplyFactor * urgencyFactor * riskFactor * policyFactor;

  // 5. 保险和保证金
  const insuranceRate = 0.005;
  const insurancePremium = totalPrice * insuranceRate;
  const depositAmount = totalPrice * 0.5;
  const isLargeOrder = totalPrice >= 5000;

  return {
    base_price: round(basePrice),
    distance_km: round(distanceKm, 1),
    weight_kg: input.goods_weight,
    max_payload_kg: maxPayload,
    weight_factor: weightFactor,
    terrain_factor: terrainFactor,
    supply_demand_factor: supplyFactor,
    urgency_factor: urgencyFactor,
    risk_factor: riskFactor,
    policy_factor: policyFactor,
    total_price: round(totalPrice),
    insurance_premium: round(insurancePremium),
    deposit_required: round(depositAmount),
    can_use_deposit_insurance: isLargeOrder,
    breakdown: {
      weight: `${input.goods_weight}kg ÷ ${maxPayload}kg/架次 = ${weightFactor}架次`,
      base: `基准价: ${round(basePrice)}元 (${round(distanceKm, 1)}km × ${weightFactor}架次 × ${unitPricePerTrip}元/km)`,
      terrain: `地形: ×${terrainFactor}`,
      supply: `供需: ×${supplyFactor}`,
      risk: `风险: ×${riskFactor}`,
      policy: input.goods_type === "emergency" ? "应急订单: 0佣金" : "",
    },
  };
}

// === 距离计算 ===

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function qqMapDistance(input: PricingInput): Promise<number> {
  const url = `https://apis.map.qq.com/ws/distance/v1/matrix/?mode=driving&from=${input.pickup_lat},${input.pickup_lng}&to=${input.delivery_lat},${input.delivery_lng}&key=${QQMAP_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status === 0 && json.result?.rows?.[0]?.elements?.[0]?.distance) {
    return json.result.rows[0].elements[0].distance / 1000;
  }
  throw new Error("腾讯地图API失败");
}

// === 修正因子 ===

function getTerrainFactor(config: Record<string, any>, terrainType?: string): number {
  const factors = config["terrain_factors"] ?? {
    PLAIN: 0,
    HILLY: 0.08,
    MOUNTAIN: 0.15,
    URBAN: 0.05,
  };
  const terrain = terrainType ?? "MOUNTAIN"; // 川渝默认山地
  const surcharge = factors[terrain] ?? 0.15;
  return 1.0 + surcharge;
}

async function getSupplyFactor(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { count: online } = await supabase.from("pilots")
    .select("*", { count: "exact", head: true }).eq("online_status", "online");
  const { count: pending } = await supabase.from("orders")
    .select("*", { count: "exact", head: true })
    .in("status", ["grabbable_gold", "grabbable_senior", "grabbable_all"]);
  const ratio = (pending || 0) / Math.max(online || 1, 1);
  if (ratio > 2) return 1.15;
  if (ratio < 0.5) return 0.9;
  return 1.0;
}

async function getRiskFactor(): Promise<number> {
  // 对接气象 API 的占位实现
  // 大风≥6级（风速>13.8m/s）时返回 0 触发禁止作业
  // TODO: 对接真实气象 API（和风天气/彩云天气）
  try {
    const weatherKey = Deno.env.get("WEATHER_API_KEY");
    if (!weatherKey) return 1.0; // 未配置天气 API 时默认安全

    // 占位：实际对接后替换为真实 API 调用
    // const res = await fetch(`https://api.qweather.com/v7/weather/now?location=106.55,29.56&key=${weatherKey}`);
    // const data = await res.json();
    // const windSpeed = parseFloat(data.now?.windSpeed ?? "0");
    // if (windSpeed >= 13.8) return 0; // ≥6级大风，禁止作业
    // if (windSpeed >= 10.8) return 1.2; // 5级风，风险加价20%
    return 1.0;
  } catch {
    return 1.0;
  }
}

function round(v: number, d = 2): number {
  return Number(Math.round(Number(v + "e" + d)) + "e-" + d);
}
