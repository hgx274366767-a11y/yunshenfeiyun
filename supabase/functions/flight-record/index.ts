/**
 * 飞行记录入口 — POST /flight-record/upload (multipart CSV)
 *
 * 流程：接收CSV → 解析 → 合规校验 → 存储到 flight_records 表
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";
import { json } from "../_shared/responses.ts";
import { authMiddleware } from "../_shared/permissions.ts";
import { parseFlightCsv } from "./parse-csv.ts";
import { validateCompliance } from "./validate-compliance.ts";
import { updateCreditScore } from "../credit-calc/update-credit-score.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  // 身份验证：仅飞手可上传飞行记录
  const authUser = await authMiddleware(req, supabase);
  if (!authUser) {
    return json(401, { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } });
  }
  if (authUser.role !== "pilot" && authUser.role !== "admin") {
    return json(403, { success: false, error: { code: "FORBIDDEN", message: "仅飞手可上传飞行记录" } });
  }

  const url = new URL(req.url);

  try {
    if (req.method !== "POST") {
      return json(405, { success: false, error: { code: "METHOD_NOT_ALLOWED" } });
    }

    let orderId: string;
    let csvContent: string;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      orderId = form.get("order_id") as string;
      const file = form.get("file") as File;
      if (!orderId || !file) throw new Error("缺少 order_id 或 file");
      csvContent = await file.text();
    } else {
      const body = await req.json();
      orderId = body.order_id;
      csvContent = body.csv_content;
      if (!orderId || !csvContent) throw new Error("缺少 order_id 或 csv_content");
    }

    // 验证订单存在
    const { data: order } = await supabase
      .from("orders")
      .select("id, order_no, pilot_id")
      .eq("id", orderId)
      .single();

    if (!order) throw new Error("ORDER_NOT_FOUND: 订单不存在");

    // 解析
    const parsed = parseFlightCsv(csvContent);

    // 合规校验
    const compliance = validateCompliance(parsed);

    // 存储到 Supabase Storage
    const fileName = `flight-logs/${orderId}_${Date.now()}.csv`;
    const { error: uploadErr } = await supabase.storage
      .from("flight-records")
      .upload(fileName, new Blob([csvContent], { type: "text/csv" }), {
        upsert: true,
      });

    if (uploadErr) throw new Error(`UPLOAD_FAILED: ${uploadErr.message}`);

    const { data: publicUrl } = supabase.storage
      .from("flight-records")
      .getPublicUrl(fileName);

    // 写入飞行记录表
    const { error: insertErr } = await supabase.from("flight_records").insert({
      order_id: orderId,
      pilot_id: order.pilot_id,
      file_url: publicUrl.publicUrl,
      parsed_data: {
        stats: parsed.stats,
        track: parsed.records.slice(0, 500), // 最多存500行轨迹
      },
      anomalies: compliance.anomalies,
      compliance_passed: compliance.passed,
      uploaded_at: new Date().toISOString(),
    });

    if (insertErr) throw new Error(`INSERT_FAILED: ${insertErr.message}`);

    // 合规异常 → 扣信用分（通过统一入口）
    if (compliance.anomalies.length > 0 && order.pilot_id) {
      const criticalAnomalies = compliance.anomalies.filter(
        (a) => a.severity === "critical",
      );
      for (const anomaly of criticalAnomalies) {
        try {
          await updateCreditScore(supabase, {
            user_id: order.pilot_id,
            pilot_id: order.pilot_id,
            order_id: orderId,
            action: anomaly.type,
            reason: anomaly.message,
          });
        } catch (err: any) {
          console.warn(`[flight-record] 信用扣分失败 (${anomaly.type}):`, err.message);
        }
      }
    }

    return json(200, {
      success: true,
      data: {
        order_id: orderId,
        file_url: publicUrl.publicUrl,
        stats: parsed.stats,
        compliance,
      },
    });
  } catch (err: any) {
    const msg = err.message || "上传失败";
    const status = msg.includes("ORDER_NOT_FOUND") ? 404 : 500;
    return json(status, { success: false, error: { code: "UPLOAD_FAILED", message: msg } });
  }
});
