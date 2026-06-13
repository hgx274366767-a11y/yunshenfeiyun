/**
 * 微信支付退款 — V3退款API
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WX_MCHID = Deno.env.get("WX_PAY_MCHID")!;

export interface RefundInput {
  order_id: string;
  reason: string;
  amount?: number; // 不传则全额退
}

export async function refundOrder(
  supabase: ReturnType<typeof createClient>,
  input: RefundInput
): Promise<{ refund_id: string; status: string }> {
  // 检查微信支付配置
  if (!WX_MCHID || WX_MCHID === "PLACEHOLDER") {
    throw new Error("WX_PAY_NOT_CONFIGURED: 微信支付尚未配置");
  }

  const { data: deposit } = await supabase
    .from("deposits")
    .select("wx_out_trade_no, amount")
    .eq("order_id", input.order_id)
    .eq("deposit_type", "payment")
    .eq("status", "paid")
    .single();

  if (!deposit) throw new Error("未找到已支付的保证金记录");

  const refundAmount = input.amount ?? deposit.amount;
  const outRefundNo = `RF${Date.now()}${Math.floor(Math.random() * 10000)}`;

  const res = await fetch("https://api.mch.weixin.qq.com/v3/refund/domestic/refunds", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      out_trade_no: deposit.wx_out_trade_no,
      out_refund_no: outRefundNo,
      amount: {
        refund: Math.round(refundAmount * 100),
        total: Math.round(deposit.amount * 100),
        currency: "CNY",
      },
      reason: input.reason,
    }),
  });

  const wxResult = await res.json();

  if (!res.ok) throw new Error(`退款失败: ${wxResult.message || res.statusText}`);

  // 更新保证金记录
  await supabase.from("deposits").insert({
    order_id: input.order_id,
    deposit_type: "refund",
    amount: -refundAmount,
    wx_out_trade_no: outRefundNo,
    status: wxResult.status === "SUCCESS" ? "refunded" : "refunding",
  });

  return { refund_id: outRefundNo, status: wxResult.status };
}
