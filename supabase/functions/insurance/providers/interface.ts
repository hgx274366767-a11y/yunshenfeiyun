/**
 * 保险服务商接口 — 策略模式
 *
 * 当前MVP使用 MockProvider（平台内部记录），V2对接真实保险API
 */
export interface InsurancePolicy {
  policy_number: string;
  provider_code: string;
  coverage_amount: number;
  premium: number;
  effective_at: string;
  expire_at: string;
  status: "active" | "expired" | "cancelled";
}

export interface InsuranceProvider {
  readonly code: string;
  readonly name: string;

  /** 创建保单 */
  createPolicy(params: CreatePolicyParams): Promise<InsurancePolicy>;

  /** 查询保单 */
  getPolicy(policyNumber: string): Promise<InsurancePolicy | null>;

  /** 理赔申请 */
  fileClaim(params: ClaimParams): Promise<{ claim_id: string; status: string }>;
}

export interface CreatePolicyParams {
  order_id: string;
  user_id: string;
  order_amount: number;
  cargo_type: string;
  cargo_value?: number;
}

export interface ClaimParams {
  policy_number: string;
  order_id: string;
  claim_amount: number;
  description: string;
  evidence_urls?: string[];
}
