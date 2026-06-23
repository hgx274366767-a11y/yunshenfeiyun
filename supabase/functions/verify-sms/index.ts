/**
 * 云深飞运 - 短信验证码验证 + 登录
 * POST /verify-sms
 * Body: { phone: string, code: string }
 * Response: { success: boolean, user?: object, token?: string }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors } from "../_shared/cors.ts";
import { json } from "../_shared/responses.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// 验证码存储（与 send-sms 共享，生产环境用 Redis）
// 注意：由于 Edge Function 是无状态的，这里用数据库存储验证码
// 在 send-sms 中也写入数据库

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "POST") {
    return json(405, { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "仅支持 POST" } });
  }

  try {
    const { phone, code } = await req.json();

    // 验证参数
    if (!phone || !code) {
      return json(400, {
        success: false,
        error: { code: "INVALID_PARAMS", message: "手机号和验证码不能为空" },
      });
    }

    // 创建 Supabase 客户端
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 查询验证码
    const { data: codeRecord, error: queryError } = await supabase
      .from("sms_codes")
      .select("*")
      .eq("phone", phone)
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (queryError || !codeRecord) {
      return json(400, {
        success: false,
        error: { code: "INVALID_CODE", message: "验证码无效或已过期" },
      });
    }

    // 标记验证码已使用
    await supabase
      .from("sms_codes")
      .update({ used: true })
      .eq("id", codeRecord.id);

    // 查找或创建用户
    let { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .single();

    if (!user) {
      // 创建新用户
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          phone,
          role: "client",
          status: "active",
          credit_score: 100,
          credit_level: "gold",
        })
        .select()
        .single();

      if (createError) {
        console.error("[Create User Error]", createError);
        return json(500, {
          success: false,
          error: { code: "CREATE_USER_FAILED", message: "创建用户失败" },
        });
      }
      user = newUser;
    }

    // 生成 Supabase Auth token（使用 service role 模拟登录）
    // 注意：这里简化处理，实际应该用 Supabase Auth 的 OTP 登录
    // 临时方案：返回用户信息，前端存储

    return json(200, {
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role,
        },
        message: "登录成功",
      },
    });
  } catch (err) {
    console.error("[VerifySMS Error]", err);
    return json(500, {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "服务内部错误" },
    });
  }
});
