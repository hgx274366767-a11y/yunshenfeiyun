/**
 * 共享数学工具
 */
export function round(v: number, d = 2): number {
  const factor = 10 ** d;
  return Math.round(v * factor) / factor;
}
