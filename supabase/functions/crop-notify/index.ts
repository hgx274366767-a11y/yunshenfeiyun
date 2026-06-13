/**
 * 供需预测通知 — crop-notify/
 *
 * pg_cron 每日触发。读取 crop_calendar 配置表，
 * 在采收季前 N 天自动通知区域内飞手。
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";
import { json } from "../_shared/responses.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  // 定时任务：仅 service_role 或 admin 可调用
  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && authHeader !== `Bearer ${serviceKey}`) {
    return json(403, { success: false, error: { code: "FORBIDDEN", message: "仅内部服务可调用" } });
  }

  try {
    const today = new Date();

    const { data: crops } = await supabase.from("crop_calendar").select("*").eq("is_active", true);

    if (!crops?.length) {
      return json(200, { success: true, data: { notified: 0, message: "无活跃作物日历" } });
    }

    for (const crop of crops) {
      const notifyDays = crop.notify_days_before || 3;
      const harvestStart = new Date(today.getFullYear(), crop.harvest_month_start - 1, 1);
      const daysUntilHarvest = Math.ceil((harvestStart.getTime() - today.getTime()) / (86400 * 1000));

      if (daysUntilHarvest > 0 && daysUntilHarvest <= notifyDays) {
        await supabase.from("announcements").insert({
          title: `${crop.crop_name}采收季即将开始`,
          content: `${crop.region}${crop.crop_name}采收季预计${notifyDays}天后开始，预计吊运需求${crop.expected_volume_kg}kg，请提前做好准备`,
          type: "info",
          target_roles: ["pilot"],
        });
      }
    }

    return json(200, { success: true, data: { message: `检查完成，处理了 ${crops.length} 条作物日历` } });

  } catch (err) {
    return json(500, { success: false, error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "失败" } });
  }
});
