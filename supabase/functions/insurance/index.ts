/**
 * 保险服务入口 — POST /insurance/create | POST /insurance/claim
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";
import { json } from "../_shared/responses.ts";
import { authMiddleware } from "../_shared/permissions.ts";
import { createPolicy, getProvider } from "./create-policy.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  // 身份验证
  const authUser = await authMiddleware(req, supabase);
  if (!authUser) {
    return json(401, { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } });
  }

  const url = new URL(req.url);

  try {
    if (url.pathname.endsWith("/create") && req.method === "POST") {
      const body = await req.json();
      const result = await createPolicy(supabase, body);
      return json(200, { success: true, data: result });
    }

    if (url.pathname.endsWith("/claim") && req.method === "POST") {
      const { policy_number, order_id, claim_amount, description, evidence_urls } = await req.json();
      const provider = getProvider("mock_yunshen")!;
      const claim = await provider.fileClaim({
        policy_number, order_id, claim_amount, description, evidence_urls,
      });

      // 记录理赔
      await supabase.from("insurance_policies").update({
        claim_id: claim.claim_id,
        claim_status: claim.status,
        claim_amount,
        claim_description: description,
        claim_filed_at: new Date().toISOString(),
      }).eq("policy_number", policy_number);

      return json(200, { success: true, data: claim });
    }

    return json(404, { success: false, error: { code: "NOT_FOUND" } });
  } catch (err: any) {
    return json(500, { success: false, error: { code: "INSURANCE_FAILED", message: err.message } });
  }
});
