/**
 * 支付服务入口 — POST /payment/create | POST /payment/refund | POST /payment/notify
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";
import { json } from "../_shared/responses.ts";
import { authMiddleware } from "../_shared/permissions.ts";
import { createPaymentOrder } from "./create-order.ts";
import { refundOrder } from "./refund.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  // 微信支付回调不需要用户认证（微信服务器调用）
  const url = new URL(req.url);
  const isNotify = url.pathname.endsWith("/notify");

  // 非回调接口需要身份验证
  if (!isNotify) {
    const authUser = await authMiddleware(req, supabase);
    if (!authUser) {
      return json(401, { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } });
    }
  }

  const url = new URL(req.url);

  try {
    if (url.pathname.endsWith("/create") && req.method === "POST") {
      const body = await req.json();
      const result = await createPaymentOrder(supabase, body);
      return json(200, { success: true, data: result });
    }

    if (url.pathname.endsWith("/refund") && req.method === "POST") {
      const body = await req.json();
      // 校验订单所有权
      if (body.user_id) {
        const { data: order } = await supabase
          .from("orders")
          .select("user_id")
          .eq("id", body.order_id)
          .single();
        if (!order || order.user_id !== body.user_id) {
          return json(403, {
            success: false,
            error: { code: "NOT_ORDER_OWNER", message: "只能退款自己的订单" },
          });
        }
      }
      const result = await refundOrder(supabase, body);
      return json(200, { success: true, data: result });
    }

    // 微信支付回调
    if (url.pathname.endsWith("/notify") && req.method === "POST") {
      const body = await req.json();
      const outTradeNo = body.out_trade_no;

      if (body.trade_state === "SUCCESS") {
        await supabase.from("deposits").update({
          status: "paid",
          wx_transaction_id: body.transaction_id,
          paid_at: new Date().toISOString(),
        }).eq("wx_out_trade_no", outTradeNo);

        // 关联订单更新支付状态
        const { data: deposit } = await supabase
          .from("deposits")
          .select("order_id")
          .eq("wx_out_trade_no", outTradeNo)
          .single();

        if (deposit) {
          await supabase.from("orders").update({
            payment_status: "paid",
            updated_at: new Date().toISOString(),
          }).eq("id", deposit.order_id);
        }
      }

      return json(200, { code: "SUCCESS", message: "OK" });
    }

    return json(404, { success: false, error: { code: "NOT_FOUND" } });
  } catch (err: any) {
    return json(500, { success: false, error: { code: "PAYMENT_FAILED", message: err.message } });
  }
});
