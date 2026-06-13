/**
 * 创建订单入口 — POST /create-order
 *
 * 全链路：校验 → 定价 → 入库 → 保险 → 保证金 → 日志
 * 定价计算 100% 服务端完成，客户端只传参不传价
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";
import { json, badRequest, serverError } from "../_shared/responses.ts";
import { authMiddleware } from "../_shared/permissions.ts";
import { createOrder } from "./create-order.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "POST") {
    return json(405, { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "仅支持 POST" } });
  }

  // 身份验证：只有登录用户可以下单
  const authUser = await authMiddleware(req, supabase);
  if (!authUser) {
    return json(401, { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } });
  }
  if (authUser.role !== "client" && authUser.role !== "admin") {
    return json(403, { success: false, error: { code: "FORBIDDEN", message: "仅用户端可下单" } });
  }

  try {
    const body = await req.json();
    // 用认证用户 ID 覆盖客户端传入的 user_id（防伪造）
    body.user_id = authUser.userId;

    // 必填字段校验
    const required = [
      "user_id", "order_type", "goods_type", "goods_weight",
      "pickup_address", "pickup_lat", "pickup_lng",
      "delivery_address", "delivery_lat", "delivery_lng",
      "terrain_type",
    ];
    const missing = required.filter((f) => body[f] == null);
    if (missing.length) {
      return badRequest("MISSING_FIELDS", `缺少必填字段: ${missing.join(", ")}`);
    }

    // 不可恢复错误
    if (body.goods_weight <= 0) {
      return badRequest("INVALID_WEIGHT", "货物重量必须大于0");
    }

    const result = await createOrder(supabase, body);

    return json(201, { success: true, data: result });
  } catch (err: any) {
    console.error("Create order error:", err);
    return serverError(err, "CREATE_ORDER_FAILED");
  }
});
