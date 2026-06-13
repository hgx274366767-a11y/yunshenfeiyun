/**
 * 创建订单核心逻辑
 * 定价 → 入库 → 保险 → 保证金 → 抢单窗口初始化
 */
import { haversineDistance } from "../pricing/calculate-price.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CreateOrderInput {
  user_id: string;
  order_type: string;
  goods_type: string;
  goods_weight: number;
  goods_value?: number;
  goods_desc?: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  terrain_type: string;
  is_crossing_river?: boolean;
  is_precision_required?: boolean;
  time_required?: string;
  is_emergency?: boolean;
}

export interface PriceResult {
  distance: number;
  basePrice: number;
  weightFactor: number;
  transportPrice: number;
  insurancePremium: number;
  insuranceRate: number;
  finalPrice: number;
  breakdown: Record<string, unknown>;
}

export interface CreateOrderResult {
  order: any;
  price_info: PriceResult;
  deposit_info: {
    amount: number;
    type: string;
    isLargeOrder: boolean;
    insurancePremium: number;
  };
  insurance_policy: any;
}

export async function createOrder(
  supabase: ReturnType<typeof createClient>,
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  // 1. 计算价格
  const priceResult = await calcPrice(supabase, input);

  // 2. 计算抢单窗口
  const now = new Date();
  const priceValidUntil = new Date(now.getTime() + 15 * 60 * 1000);
  const grabEligibleAfter = new Date(now.getTime() + 5 * 60 * 1000);

  // 3. 创建订单
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: input.user_id,
      order_type: input.order_type,
      goods_type: input.goods_type,
      goods_weight: input.goods_weight,
      goods_value: input.goods_value ?? priceResult.transportPrice,
      goods_desc: input.goods_desc,
      pickup_address: input.pickup_address,
      pickup_lat: input.pickup_lat,
      pickup_lng: input.pickup_lng,
      delivery_address: input.delivery_address,
      delivery_lat: input.delivery_lat,
      delivery_lng: input.delivery_lng,
      straight_line_distance: priceResult.distance,
      terrain_type: input.terrain_type,
      is_crossing_river: input.is_crossing_river || false,
      is_precision_required: input.is_precision_required || false,
      time_required: input.time_required || "STANDARD",
      base_price: priceResult.basePrice,
      transport_price: priceResult.transportPrice,
      insurance_premium: priceResult.insurancePremium,
      insurance_rate: priceResult.insuranceRate,
      final_price: priceResult.finalPrice,
      price_valid_until: priceValidUntil.toISOString(),
      price_breakdown: priceResult.breakdown,
      status: "grabbable_gold",
      is_basic_order: priceResult.transportPrice < 200,
      is_emergency: input.is_emergency || false,
      grab_eligible_after: grabEligibleAfter.toISOString(),
      current_eligible_level: "gold",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .select()
    .single();

  if (orderError) throw new Error(`创建订单失败: ${orderError.message}`);

  // 4. 创建保险保单
  const insurancePolicy = await createInsurancePolicy(supabase, order, input.user_id);

  // 5. 计算保证金
  const depositInfo = calcDeposit(order);

  // 6. 更新订单关联信息
  await supabase
    .from("orders")
    .update({
      insurance_policy_id: insurancePolicy.id,
      insurance_coverage: insurancePolicy.coverage_amount,
      deposit_amount: depositInfo.amount,
      deposit_type: depositInfo.type,
      is_large_order: depositInfo.isLargeOrder,
    })
    .eq("id", order.id);

  // 7. 记录订单日志
  await supabase.from("order_logs").insert({
    order_id: order.id,
    action: "order_created",
    new_status: "grabbable_gold",
    remark: "订单创建成功，进入金牌优先抢单窗口",
  });

  // 8. 应急订单广播通知所有在线飞手
  if (input.is_emergency) {
    const { data: onlinePilots } = await supabase
      .from("pilots")
      .select("user_id, name")
      .eq("online_status", "online");

    if (onlinePilots?.length) {
      const messages = onlinePilots.map((p: any) => ({
        user_id: p.user_id,
        title: "应急订单通知",
        content: `新应急订单 #${(order.order_no || order.id).slice(-8)}：${getOrderTypeName(input.order_type)}，¥${priceResult.finalPrice}`,
        type: "order",
        related_order_id: order.id,
      }));
      await supabase.from("messages").insert(messages);
    }
  }

  return {
    order,
    price_info: priceResult,
    deposit_info: depositInfo,
    insurance_policy: insurancePolicy,
  };
}

// === 定价计算 ===

async function calcPrice(
  supabase: ReturnType<typeof createClient>,
  input: CreateOrderInput
): Promise<PriceResult> {
  // 加载配置
  const { data: pricingRows } = await supabase
    .from("pricing_config")
    .select("config_key, config_value")
    .eq("is_active", true);

  const config: Record<string, any> = {};
  (pricingRows || []).forEach((r: any) => { config[r.config_key] = r.config_value; });

  // 距离
  const distance = haversineDistance(
    input.pickup_lat, input.pickup_lng,
    input.delivery_lat, input.delivery_lng
  ) * 1.3; // 直线距离 × 1.3 ≈ 道路距离

  // 载重架次：ceil(重量 / 最大载重)，与 pricing 函数保持一致
  const maxPayload = config["max_payload_kg"]?.value ?? 85;
  const weightFactor = Math.ceil(input.goods_weight / maxPayload);

  // 基础价格 = 单架次每公里单价 × 距离 × 架次数
  const unitPrice = config["unit_price"]?.value ?? 3.5;
  const basePrice = distance * unitPrice * weightFactor;

  // 地形因子
  const terrainFactors = config["terrain_factors"]?.value ?? { MOUNTAIN: 0.15, HILL: 0.05, PLAIN: 0 };
  let terrainFactor = terrainFactors[input.terrain_type] ?? 0.10;
  if (input.is_crossing_river) terrainFactor += 0.15;

  // 时效因子
  const timeFactors: Record<string, number> = {
    STANDARD: 0, URGENT_2H: 0.30, URGENT_4H: 0.20, SAME_DAY: 0.10,
  };
  const timeFactor = timeFactors[input.time_required || "STANDARD"] || 0;

  const transportPrice = Math.round(basePrice * (1 + terrainFactor + timeFactor) * 100) / 100;

  // 保险
  const { data: insCfg } = await supabase
    .from("system_config")
    .select("config_value")
    .eq("config_group", "insurance")
    .eq("config_key", "cargo_rate_max")
    .eq("is_active", true)
    .single();

  const goodsValue = input.goods_value ?? transportPrice;
  const insuranceRate = insCfg?.config_value?.value ?? 0.005;
  const insurancePremium = Math.round(goodsValue * insuranceRate * 1.2 * 100) / 100;
  const finalPrice = Math.round((transportPrice + insurancePremium) * 100) / 100;

  return {
    distance: Math.round(distance * 100) / 100,
    basePrice: Math.round(basePrice * 100) / 100,
    weightFactor,
    transportPrice,
    insurancePremium,
    insuranceRate,
    finalPrice,
    breakdown: {
      distance: Math.round(distance * 100) / 100,
      max_payload_kg: maxPayload,
      weight_factor: weightFactor,
      unit_price: unitPrice,
      terrain_factor: terrainFactor,
      time_factor: timeFactor,
      insurance_rate: insuranceRate,
    },
  };
}

// === 保险保单 ===

async function createInsurancePolicy(
  supabase: ReturnType<typeof createClient>,
  order: any,
  userId: string
): Promise<any> {
  const goodsValue = order.goods_value || order.transport_price;
  const coverageAmount = Math.round(goodsValue * 1.2 * 100) / 100;

  const { data: policy, error } = await supabase
    .from("insurance_policies")
    .insert({
      order_id: order.id,
      provider: "yunshen_internal",
      coverage_type: "cargo",
      insured_name: userId,
      coverage_amount: coverageAmount,
      premium: order.insurance_premium,
      premium_rate: order.insurance_rate,
      effective_date: new Date().toISOString(),
      expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      cargo_description: order.goods_desc,
      cargo_value: goodsValue,
      cargo_weight: order.goods_weight,
      status: "active",
    })
    .select()
    .single();

  if (error) throw new Error(`保险保单创建失败: ${error.message}`);
  return policy;
}

// === 保证金计算 ===

function calcDeposit(order: any) {
  const finalPrice = order.transport_price + (order.insurance_premium || 0);
  const depositAmount = Math.round(finalPrice * 0.5 * 100) / 100;
  const isLargeOrder = finalPrice >= 5000;

  if (isLargeOrder) {
    const insuranceRate = 0.03;
    const insurancePremium = Math.round(depositAmount * insuranceRate * 100) / 100;
    return {
      amount: depositAmount,
      type: "deposit_insurance",
      isLargeOrder: true,
      insurancePremium,
    };
  }

  return {
    amount: depositAmount,
    type: "cash",
    isLargeOrder: false,
    insurancePremium: 0,
  };
}

function getOrderTypeName(type: string): string {
  const map: Record<string, string> = {
    agri_up: "农资上山",
    agri_down: "农产品下山",
    emergency: "应急吊运",
    forestry: "林业物资",
  };
  return map[type] || type;
}
