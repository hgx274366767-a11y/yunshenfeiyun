/**
 * 微信登录核心逻辑 — code → openid → 查建用户 → 签发凭证
 *
 * 流程：
 * 1. 调用微信 jscode2session 换 openid/unionid
 * 2. 查 public.users，不存在则创建
 * 3. 确保 auth.users 对应账号存在（密码由 openid + secret 派生）
 * 4. 返回 user + Supabase 登录凭证
 */
import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const WX_CLIENT_APPID = Deno.env.get("WX_CLIENT_APPID")!;
const WX_PILOT_APPID = Deno.env.get("WX_PILOT_APPID")!;
const WX_APP_SECRET = Deno.env.get("WX_APP_SECRET")!;
const APP_SECRET_SALT = Deno.env.get("APP_SECRET_SALT") || "yunshen_2024_salt";

export interface WxLoginInput {
  code: string;
  role: "client" | "pilot";
  appid?: string;
  /** 微信侧用户信息（昵称、头像等） */
  nick_name?: string;
  avatar_url?: string;
}

export interface WxLoginResult {
  user: {
    id: string;
    phone: string;
    role: string;
    credit_score: number;
    credit_level: string;
    wx_nickname: string | null;
    wx_avatar: string | null;
  };
  /** Supabase Auth 登录凭证 */
  auth_email: string;
  auth_password: string;
}

export async function wxLogin(
  supabase: SupabaseClient,
  input: WxLoginInput
): Promise<WxLoginResult> {
  // 1. 微信 code → openid
  const appId = input.appid || (input.role === "pilot" ? WX_PILOT_APPID : WX_CLIENT_APPID);

  const wxRes = await fetch(
    `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${WX_APP_SECRET}&js_code=${input.code}&grant_type=authorization_code`
  );
  const wxData = await wxRes.json();

  if (!wxData.openid || wxData.errcode) {
    throw new Error(`WX_AUTH_FAILED: ${wxData.errmsg || "微信登录失败，errcode=" + (wxData.errcode || "unknown")}`);
  }

  const { openid, unionid } = wxData;

  // 2. 查找或创建 public.users 记录
  const { data: existingUser } = await supabase
    .from("users")
    .select("id, phone, role, status, credit_score, credit_level, wx_nickname, wx_avatar")
    .eq("wx_openid", openid)
    .maybeSingle();

  let user = existingUser;

  if (!user) {
    // phone 为 NOT NULL，用 openid 后10位生成唯一占位号（后续通过绑定手机号更新）
    const placeholderPhone = `wx_${openid.slice(-10)}`;

    // 检查占位号是否已被其他用户占用（极小概率）
    const { data: phoneExists } = await supabase
      .from("users")
      .select("id")
      .eq("phone", placeholderPhone)
      .maybeSingle();

    const phone = phoneExists
      ? `wx_${Date.now().toString().slice(-10)}`
      : placeholderPhone;

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        phone,
        wx_openid: openid,
        wx_unionid: unionid || null,
        wx_nickname: input.nick_name || null,
        wx_avatar: input.avatar_url || null,
        role: input.role || "client",
        credit_score: 70,
        credit_level: "probation",
        status: "active",
        last_login_at: new Date().toISOString(),
      })
      .select("id, phone, role, status, credit_score, credit_level, wx_nickname, wx_avatar")
      .single();

    if (insertError) throw new Error(`USER_CREATE_FAILED: ${insertError.message}`);
    user = newUser;
  } else {
    // 更新登录时间和微信信息
    await supabase
      .from("users")
      .update({
        last_login_at: new Date().toISOString(),
        wx_nickname: input.nick_name || user.wx_nickname,
        wx_avatar: input.avatar_url || user.wx_avatar,
        wx_unionid: unionid || undefined,
      })
      .eq("id", user.id);
  }

  // 3. 状态检查
  if (user.status === "banned") {
    throw new Error("USER_BANNED: 账号已被封禁");
  }

  // 4. 确保 auth.users 存在（Supabase Auth 凭据）
  const authEmail = `${user.id}@yunshen.local`;
  const authPassword = await derivePassword(openid, APP_SECRET_SALT);

  // 先查 auth.users 是否已存在
  const { data: authUser } = await supabase.auth.admin.getUserByEmail(authEmail).catch(() => ({ data: null }));

  if (!authUser) {
    const { error: createAuthError } = await supabase.auth.admin.createUser({
      email: authEmail,
      password: authPassword,
      email_confirm: true,
      user_metadata: {
        wx_openid: openid,
        role: user.role,
        public_user_id: user.id,
      },
    });

    // 已存在也视为正常（并发创建场景）
    if (createAuthError && !createAuthError.message.includes("already been registered")) {
      throw new Error(`AUTH_CREATE_FAILED: ${createAuthError.message}`);
    }
  }

  return {
    user: {
      id: user.id,
      phone: user.phone,
      role: user.role,
      credit_score: user.credit_score,
      credit_level: user.credit_level,
      wx_nickname: user.wx_nickname,
      wx_avatar: user.wx_avatar,
    },
    auth_email: authEmail,
    auth_password: authPassword,
  };
}

/**
 * 派生确定性的 auth 密码（openid + 服务器盐 → SHA-256 hex）
 * 确保同一 openid 每次登录获得相同密码，客户端用其 signInWithPassword
 */
async function derivePassword(openid: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${openid}:${salt}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
