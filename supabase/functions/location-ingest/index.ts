/**
 * GPS位置上报 — location-ingest/
 *
 * 飞手每5秒上报GPS位置到 Supabase Realtime 通道。
 * 写入 pilots 表 current_lat/current_lng，触发 Realtime 广播给客户端。
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";
import { json } from "../_shared/responses.ts";
import { authMiddleware } from "../_shared/permissions.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  // 身份验证：仅飞手可上报位置
  const authUser = await authMiddleware(req, supabase);
  if (!authUser) {
    return json(401, { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } });
  }
  if (authUser.role !== "pilot" && authUser.role !== "admin") {
    return json(403, { success: false, error: { code: "FORBIDDEN", message: "仅飞手可上报位置" } });
  }

  if (req.method !== "POST") {
    return json(405, { success: false, error: { code: "METHOD_NOT_ALLOWED" } });
  }

  try {
    const { lat, lng, accuracy } = await req.json();

    // 用认证用户 ID，不用客户端传的 pilot_user_id（防伪造）
    const { error } = await supabase.from("pilots").update({
      current_lat: lat,
      current_lng: lng,
      current_location_updated_at: new Date().toISOString(),
    }).eq("user_id", authUser.userId);

    if (error) throw error;

    const signalStatus = accuracy > 50 ? "weak" : "good";

    return json(200, { success: true, data: { signal: signalStatus, updated_at: new Date().toISOString() } });

  } catch (err) {
    return json(500, { success: false, error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "位置上报失败" } });
  }
});
