/**
 * 保单创建服务 — 下单自动生成保单记录
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { InsuranceProvider, CreatePolicyParams } from "./providers/interface.ts";
import { MockInsuranceProvider } from "./providers/mock-provider.ts";

const providers: Map<string, InsuranceProvider> = new Map();
providers.set("mock_yunshen", new MockInsuranceProvider());

export async function createPolicy(
  supabase: ReturnType<typeof createClient>,
  input: CreatePolicyParams
): Promise<{ policy_number: string; premium: number; coverage_amount: number }> {
  const provider = providers.get("mock_yunshen")!;

  const policy = await provider.createPolicy(input);

  // 写入保单表
  const { error } = await supabase.from("insurance_policies").insert({
    order_id: input.order_id,
    policy_number: policy.policy_number,
    provider_code: policy.provider_code,
    coverage_amount: policy.coverage_amount,
    premium: policy.premium,
    effective_at: policy.effective_at,
    expire_at: policy.expire_at,
    status: policy.status,
  });

  if (error) throw new Error(`保单创建失败: ${error.message}`);

  return {
    policy_number: policy.policy_number,
    premium: policy.premium,
    coverage_amount: policy.coverage_amount,
  };
}

export function getProvider(code: string): InsuranceProvider | undefined {
  return providers.get(code);
}
