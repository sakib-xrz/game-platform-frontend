export function suitSymbol(code: string): string {
  const suit = code[1];
  if (suit === "H") return "♥";
  if (suit === "D") return "♦";
  if (suit === "C") return "♣";
  return "♠";
}

export function rankLabel(code: string): string {
  const rank = code[0];
  if (rank === "T") return "10";
  return rank;
}

export function isRedSuit(code: string): boolean {
  return code[1] === "H" || code[1] === "D";
}

export function handCategoryLabel(category: string): string {
  switch (category) {
    case "trail":
      return "Trail";
    case "pure_sequence":
      return "Pure sequence";
    case "sequence":
      return "Sequence";
    case "color":
      return "Color";
    case "pair":
      return "Pair";
    case "high_card":
      return "High card";
    default:
      return category.replaceAll("_", " ");
  }
}
