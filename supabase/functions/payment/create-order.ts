/**
 * 微信支付统一下单 — JSAPI 支付
 *
 * 微信支付V3 API: https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/direct-jsons/jsapi-prepay.html
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WX_MCHID = Deno.env.get("WX_PAY_MCHID")!;
const WX_PAY_V3_SECRET = Deno.env.get("WX_PAY_V3_SECRET")!;
const WX_CLIENT_APPID = Deno.env.get("WX_CLIENT_APPID")!;
const WX_PILOT_APPID = Deno.env.get("WX_PILOT_APPID")!;

export interface CreatePaymentInput {
  order_id: string;
  openid: string;
  amount: number;
  description: string;
  app_type: "client" | "pilot";
}

export interface PaymentResult {
  prepay_id: string;
  pay_sign: string;
  nonce_str: string;
  time_stamp: string;
  sign_type: string;
  package: string;
}

export async function createPaymentOrder(
  supabase: ReturnType<typeof createClient>,
  input: CreatePaymentInput
): Promise<PaymentResult> {
  // 检查微信支付配置是否完整
  if (!WX_MCHID || WX_MCHID === "PLACEHOLDER" || !WX_PAY_V3_SECRET || WX_PAY_V3_SECRET === "PLACEHOLDER") {
    throw new Error("WX_PAY_NOT_CONFIGURED: 微信支付尚未配置商户号和证书，请联系管理员");
  }

  const appId = input.app_type === "client" ? WX_CLIENT_APPID : WX_PILOT_APPID;

  // 生成商户订单号
  const outTradeNo = `YS${Date.now()}${Math.floor(Math.random() * 10000)}`;

  // 调用微信支付V3统一下单
  const wxBody = {
    appid: appId,
    mchid: WX_MCHID,
    description: input.description,
    out_trade_no: outTradeNo,
    notify_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment/notify`,
    amount: {
      total: Math.round(input.amount * 100), // 分
      currency: "CNY",
    },
    payer: { openid: input.openid },
  };

  const nonceStr = generateNonce(32);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signStr = buildSign("POST", "/v3/pay/transactions/jsapi", timestamp, nonceStr, wxBody);

  const res = await fetch("https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${WX_MCHID}",nonce_str="${nonceStr}",signature="${signStr}",timestamp="${timestamp}",serial_no="${await getSerialNo()}"`,
      Accept: "application/json",
    },
    body: JSON.stringify(wxBody),
  });

  const wxResult = await res.json();

  if (!res.ok) {
    throw new Error(`微信支付失败: ${wxResult.message || res.statusText}`);
  }

  // 记录支付日志
  await supabase.from("deposits").insert({
    order_id: input.order_id,
    deposit_type: "payment",
    amount: input.amount,
    wx_out_trade_no: outTradeNo,
    status: "pending",
  });

  // 生成前端调起支付参数
  const paySignStr = `${appId}\n${timestamp}\n${nonceStr}\nprepay_id=${wxResult.prepay_id}\n`;
  const paySign = await hmacSha256(WX_PAY_V3_SECRET, paySignStr);

  return {
    prepay_id: wxResult.prepay_id,
    pay_sign: paySign,
    nonce_str: nonceStr,
    time_stamp: timestamp,
    sign_type: "RSA",
    package: `prepay_id=${wxResult.prepay_id}`,
  };
}

async function buildSign(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  body: object
): Promise<string> {
  const bodyStr = JSON.stringify(body);
  const signStr = `${method}\n${path}\n${timestamp}\n${nonce}\n${bodyStr}\n`;
  // V3签名需要商户私钥 (PEM格式)，MVP阶段返回占位
  return "SIGN_PLACEHOLDER";
}

async function hmacSha256(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const dataBytes = encoder.encode(data);
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, dataBytes);
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function getSerialNo(): Promise<string> {
  // 证书序列号，从商户平台下载的证书中提取
  return "SERIAL_PLACEHOLDER";
}

function generateNonce(len: number): string {
  const chars = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
