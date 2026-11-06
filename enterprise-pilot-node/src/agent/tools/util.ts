/** 工具参数容错:模型产参不可信,统一在这里做钳制与归一化。 */

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

/** 模型可能给出 2026/11/01 或 2026.11.01,统一成 YYYY-MM-DD 再做字符串比较。 */
export function normalizeDate(value: unknown): string | null {
    if (typeof value !== "string" || !value.trim()) return null;
    return value.trim().replaceAll("/", "-").replaceAll(".", "-").slice(0, 10);
}
