/**
 * Mock保险服务商 — MVP阶段平台内部记录保单
 *
 * V2替换为真实保险公司API（平安/人保等）
 */
import {
  InsuranceProvider,
  InsurancePolicy,
  CreatePolicyParams,
  ClaimParams,
} from "./interface.ts";

export class MockInsuranceProvider implements InsuranceProvider {
  readonly code = "mock_yunshen";
  readonly name = "云深飞运平台保险（内部）";

  private policies = new Map<string, InsurancePolicy>();

  async createPolicy(params: CreatePolicyParams): Promise<InsurancePolicy> {
    const now = new Date();
    const coverageAmount = Math.max(params.order_amount * 1.2, 1000);
    const premium = Math.round(params.order_amount * 0.03 * 100) / 100;

    const policy: InsurancePolicy = {
      policy_number: `YF-PO-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${rand4()}`,
      provider_code: this.code,
      coverage_amount: coverageAmount,
      premium,
      effective_at: now.toISOString(),
      expire_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    };

    this.policies.set(policy.policy_number, policy);
    return policy;
  }

  async getPolicy(policyNumber: string): Promise<InsurancePolicy | null> {
    return this.policies.get(policyNumber) || null;
  }

  async fileClaim(params: ClaimParams): Promise<{ claim_id: string; status: string }> {
    const claimId = `YF-CL-${Date.now()}-${rand4()}`;
    return { claim_id: claimId, status: "pending_review" };
  }
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function rand4(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
