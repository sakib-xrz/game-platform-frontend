export const createBetRequestId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `bet-${crypto.randomUUID()}`;
  }
  return `bet-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
};
