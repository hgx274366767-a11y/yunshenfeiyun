/**
 * 定价引擎入口 — POST /pricing/calculate
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";
import { json, badRequest } from "../_shared/responses.ts";
import { calculatePrice } from "./calculate-price.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "POST") {
    return json(405, { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "仅支持 POST" } });
  }
  try {
    const result = await calculatePrice(supabase, await req.json());
    return json(200, { success: true, data: result });
  } catch (err: any) {
    if (err.message?.startsWith("WEATHER_UNSAFE")) {
      return badRequest("WEATHER_UNSAFE", err.message);
    }
    return json(500, { success: false, error: { code: "INTERNAL_ERROR", message: err.message } });
  }
});
