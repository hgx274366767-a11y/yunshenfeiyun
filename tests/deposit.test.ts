/**
 * 保证金计算单元测试
 *
 * 覆盖：普通订单、大额订单（保证金险）、应急订单、边界值
 */
import { describe, it, expect } from "vitest";

// ============================================================
// 从 deposit-calc.ts 提取的纯函数（与生产代码一致）
// ============================================================

interface DepositInput {
  transport_price: number;
  insurance_premium: number;
  order_type?: string;
  is_large_order?: boolean;
}

interface DepositResult {
  amount: number;
  type: "cash" | "deposit_insurance" | "waived";
  is_large_order: boolean;
  insurance_premium: number;
  insurance_coverage: number;
  breakdown: {
    final_price: number;
    deposit_rate: number;
    insurance_rate: number;
  };
}

function calcDeposit(input: DepositInput): DepositResult {
  const finalPrice = input.transport_price + (input.insurance_premium || 0);
  const isLargeOrder = input.is_large_order ?? (input.transport_price >= 5000);

  if (input.order_type === "emergency") {
    return {
      amount: 0,
      type: "waived",
      is_large_order: false,
      insurance_premium: 0,
      insurance_coverage: 0,
      breakdown: {
        final_price: Math.round(finalPrice * 100) / 100,
        deposit_rate: 0,
        insurance_rate: 0,
      },
    };
  }

  if (isLargeOrder) {
    const depositAmount = Math.round(finalPrice * 0.5 * 100) / 100;
    const insuranceRate = 0.03;
    const insurancePremium = Math.round(depositAmount * insuranceRate * 100) / 100;

    return {
      amount: depositAmount,
      type: "deposit_insurance",
      is_large_order: true,
      insurance_premium: insurancePremium,
      insurance_coverage: depositAmount,
      breakdown: {
        final_price: Math.round(finalPrice * 100) / 100,
        deposit_rate: 0.5,
        insurance_rate: insuranceRate,
      },
    };
  }

  const depositAmount = Math.round(finalPrice * 0.5 * 100) / 100;

  return {
    amount: depositAmount,
    type: "cash",
    is_large_order: false,
    insurance_premium: 0,
    insurance_coverage: 0,
    breakdown: {
      final_price: Math.round(finalPrice * 100) / 100,
      deposit_rate: 0.5,
      insurance_rate: 0,
    },
  };
}

// ============================================================
// 普通订单保证金
// ============================================================

describe("普通订单保证金", () => {
  it("运费100元 → 保证金50元", () => {
    const result = calcDeposit({ transport_price: 100, insurance_premium: 0 });
    expect(result.amount).toBe(50);
    expect(result.type).toBe("cash");
    expect(result.is_large_order).toBe(false);
  });

  it("运费200元 + 保费5元 → 保证金102.5元 (finalPrice=205)", () => {
    const result = calcDeposit({ transport_price: 200, insurance_premium: 5 });
    expect(result.amount).toBe(102.5);
    expect(result.type).toBe("cash");
    expect(result.breakdown.final_price).toBe(205);
  });

  it("运费4999元（大额边界-1）→ 现金保证金", () => {
    const result = calcDeposit({ transport_price: 4999, insurance_premium: 0 });
    expect(result.type).toBe("cash");
    expect(result.amount).toBe(2499.5);
    expect(result.is_large_order).toBe(false);
  });

  it("运费0元 → 保证金0元", () => {
    const result = calcDeposit({ transport_price: 0, insurance_premium: 0 });
    expect(result.amount).toBe(0);
    expect(result.type).toBe("cash");
  });

  it("保证金率固定 50%", () => {
    const result = calcDeposit({ transport_price: 300, insurance_premium: 0 });
    expect(result.breakdown.deposit_rate).toBe(0.5);
    expect(result.amount).toBe(150);
  });
});

// ============================================================
// 大额订单保证金险
// ============================================================

describe("大额订单 — 保证金险模式", () => {
  it("运费5000元（边界）→ 保证金2500，保费75，保证金险", () => {
    const result = calcDeposit({ transport_price: 5000, insurance_premium: 0 });
    expect(result.type).toBe("deposit_insurance");
    expect(result.is_large_order).toBe(true);
    expect(result.amount).toBe(2500);
    expect(result.insurance_premium).toBe(75);
    expect(result.insurance_coverage).toBe(2500);
  });

  it("运费10000元 + 保费50元 → 保证金5025 (finalPrice=10050)", () => {
    const result = calcDeposit({ transport_price: 10000, insurance_premium: 50 });
    expect(result.amount).toBe(5025);
    expect(result.insurance_premium).toBe(150.75);
    expect(result.type).toBe("deposit_insurance");
    expect(result.breakdown.final_price).toBe(10050);
  });

  it("显式 is_large_order=true 强制保证金险", () => {
    const result = calcDeposit({
      transport_price: 3000,
      insurance_premium: 0,
      is_large_order: true,
    });
    expect(result.type).toBe("deposit_insurance");
    expect(result.amount).toBe(1500);
    expect(result.insurance_premium).toBe(45);
  });

  it("保证金险保费 = 保证金 × 3%", () => {
    const result = calcDeposit({ transport_price: 8000, insurance_premium: 0 });
    expect(result.amount).toBe(4000);
    expect(result.insurance_premium).toBe(120);
    expect(result.breakdown.insurance_rate).toBe(0.03);
  });

  it("保证金险保额 = 保证金全额", () => {
    const result = calcDeposit({ transport_price: 6000, insurance_premium: 0 });
    expect(result.amount).toBe(3000);
    expect(result.insurance_coverage).toBe(3000);
  });
});

// ============================================================
// 应急订单免保证金
// ============================================================

describe("应急订单 — 免保证金", () => {
  it("应急订单运费500元 → 免保证金", () => {
    const result = calcDeposit({
      transport_price: 500,
      insurance_premium: 0,
      order_type: "emergency",
    });
    expect(result.type).toBe("waived");
    expect(result.amount).toBe(0);
    expect(result.insurance_premium).toBe(0);
    expect(result.insurance_coverage).toBe(0);
  });

  it("应急订单即使大额也免保证金", () => {
    const result = calcDeposit({
      transport_price: 10000,
      insurance_premium: 0,
      order_type: "emergency",
    });
    expect(result.type).toBe("waived");
    expect(result.amount).toBe(0);
  });

  it("应急订单 is_large_order 强制为 false", () => {
    const result = calcDeposit({
      transport_price: 10000,
      insurance_premium: 0,
      order_type: "emergency",
    });
    expect(result.is_large_order).toBe(false);
  });

  it("应急订单 breakdown 费率为 0", () => {
    const result = calcDeposit({
      transport_price: 500,
      insurance_premium: 0,
      order_type: "emergency",
    });
    expect(result.breakdown.deposit_rate).toBe(0);
    expect(result.breakdown.insurance_rate).toBe(0);
  });
});

// ============================================================
// 边界和精度
// ============================================================

describe("保证金边界与精度", () => {
  it("运费小数精度 — 123.45元 → 保证金 61.73（四舍五入到分）", () => {
    const result = calcDeposit({ transport_price: 123.45, insurance_premium: 0 });
    expect(result.amount).toBe(61.73);
  });

  it("finalPrice 精度保留2位小数", () => {
    const result = calcDeposit({ transport_price: 333.33, insurance_premium: 5.55 });
    expect(result.breakdown.final_price).toBe(338.88);
  });
});
