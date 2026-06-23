/**
 * 云深飞运 - 阿里云短信验证码发送
 * POST /send-sms
 * Body: { phone: string }
 * Response: { success: boolean, message: string }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors } from "../_shared/cors.ts";
import { json } from "../_shared/responses.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// 阿里云配置
const ACCESS_KEY_ID = Deno.env.get("ALIBABA_CLOUD_ACCESS_KEY_ID") || "";
const ACCESS_KEY_SECRET = Deno.env.get("ALIBABA_CLOUD_ACCESS_KEY_SECRET") || "";
const SIGN_NAME = "云深织梦科技有限公司";
const TEMPLATE_CODE = "SMS_335225974";

// 生成6位验证码
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// URL 编码
function encodeURIComponent_(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A")
    .replace(/%20/g, "+");
}

// 阿里云 API 签名
async function sign(
  method: string,
  params: Record<string, string>,
  secret: string
): Promise<string> {
  const sortedKeys = Object.keys(params).sort();
  const canonicalQuery = sortedKeys
    .map((k) => `${encodeURIComponent_(k)}=${encodeURIComponent_(params[k])}`)
    .join("&");

  const stringToSign = `${method}&${encodeURIComponent_("/")}&${encodeURIComponent_(canonicalQuery)}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret + "&");
  const msgData = encoder.encode(stringToSign);

  const signature = await crypto.subtle.sign(
    "HMAC-SHA1",
    await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    ),
    msgData
  );

  return btoa(
    String.fromCharCode(...new Uint8Array(signature))
  );
}

// 发送阿里云短信
async function sendAliyunSms(
  phone: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  const timestamp = new Date()
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[:-]|\.\d{3}/g, "")
    .replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, "$1-$2-$3T$4:$5:$6Z");

  const nonce = crypto.randomUUID();

  const params: Record<string, string> = {
    AccessKeyId: ACCESS_KEY_ID,
    Action: "SendSms",
    Format: "JSON",
    PhoneNumbers: phone,
    SignName: SIGN_NAME,
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: nonce,
    SignatureVersion: "1.0",
    TemplateCode: TEMPLATE_CODE,
    TemplateParam: JSON.stringify({ code }),
    Timestamp: timestamp,
    Version: "2017-05-25",
  };

  const signature = await sign("GET", params, ACCESS_KEY_SECRET);
  params.Signature = signature;

  const queryString = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent_(k)}=${encodeURIComponent_(params[k])}`)
    .join("&");

  const url = `https://dysmsapi.aliyuncs.com/?${queryString}`;

  try {
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.Code === "OK") {
      return { success: true, message: "验证码发送成功" };
    } else {
      console.error("[SMS Error]", data);
      return {
        success: false,
        message: data.Message || "短信发送失败",
      };
    }
  } catch (err) {
    console.error("[SMS Fetch Error]", err);
    return { success: false, message: "短信服务连接失败" };
  }
}

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "POST") {
    return json(405, { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "仅支持 POST" } });
  }

  try {
    const { phone } = await req.json();

    // 验证手机号
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return json(400, {
        success: false,
        error: { code: "INVALID_PHONE", message: "请输入有效的11位手机号" },
      });
    }

    // 创建 Supabase 客户端
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 检查发送频率（60秒内不能重复发送）
    const { data: recentCode } = await supabase
      .from("sms_codes")
      .select("id, created_at")
      .eq("phone", phone)
      .gte("created_at", new Date(Date.now() - 60 * 1000).toISOString())
      .limit(1)
      .single();

    if (recentCode) {
      return json(429, {
        success: false,
        error: { code: "TOO_FREQUENT", message: "发送太频繁，请60秒后重试" },
      });
    }

    // 生成验证码
    const code = generateCode();

    // 存储验证码到数据库（5分钟有效）
    const { error: insertError } = await supabase.from("sms_codes").insert({
      phone,
      code,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      used: false,
    });

    if (insertError) {
      console.error("[Insert Code Error]", insertError);
      return json(500, {
        success: false,
        error: { code: "STORE_FAILED", message: "验证码存储失败" },
      });
    }

    // 发送短信
    const result = await sendAliyunSms(phone, code);

    if (result.success) {
      return json(200, { success: true, data: { message: "验证码发送成功" } });
    } else {
      return json(500, {
        success: false,
        error: { code: "SMS_FAILED", message: result.message },
      });
    }
  } catch (err) {
    console.error("[SendSMS Error]", err);
    return json(500, {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "服务内部错误" },
    });
  }
});
