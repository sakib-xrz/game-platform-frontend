export type DemoOption = {
  id: string;
  code: string;
  name: string;
  image_url: string | null;
  display_order: number;
  payout_numerator: string;
  payout_denominator: string;
  payout_multiplier: string;
  weight: number;
};

export type DemoChip = {
  id: string;
  amount: string;
  display_order: number;
  is_enabled: boolean;
};

export type DemoGreedyKind = "greedy" | "greedy-classic" | "lucky-77";

export type DemoGreedyCatalog = {
  kind: DemoGreedyKind;
  gameCode: string;
  gameName: string;
  singleOptionPerRound: boolean;
  slotMap?: string[];
  betting_duration_ms: number;
  lock_duration_ms: number;
  drawing_duration_ms: number;
  result_duration_ms: number;
  min_bet: string;
  max_single_bet: string;
  max_round_bet: string;
  options: DemoOption[];
  chips: DemoChip[];
};

const CHIPS: DemoChip[] = [10, 50, 100, 500, 1000, 5000].map((amount, index) => ({
  id: `chip-${amount}`,
  amount: String(amount),
  display_order: index + 1,
  is_enabled: true,
}));

function option(
  game: string,
  code: string,
  name: string,
  order: number,
  numerator: number,
  weight: number,
  image_url: string | null,
): DemoOption {
  return {
    id: `${game}-${code.toLowerCase()}`,
    code,
    name,
    image_url,
    display_order: order,
    payout_numerator: String(numerator),
    payout_denominator: "1",
    payout_multiplier: `${numerator}x`,
    weight,
  };
}

const GREEDY_ART = "/assets/greedy";
const CLASSIC_ART = "/assets/greedy-classic";

export const DEMO_GREEDY_CATALOGS: Record<DemoGreedyKind, DemoGreedyCatalog> = {
  greedy: {
    kind: "greedy",
    gameCode: "GREEDY",
    gameName: "Greedy",
    singleOptionPerRound: false,
    betting_duration_ms: 15_000,
    lock_duration_ms: 1_000,
    drawing_duration_ms: 4_000,
    result_duration_ms: 3_000,
    min_bet: "10",
    max_single_bet: "10000",
    max_round_bet: "50000",
    chips: CHIPS,
    options: [
      option("greedy", "HOT_DOG", "Hot dog", 1, 10, 45, `${GREEDY_ART}/hot-dog.png`),
      option("greedy", "KEBAB", "Barbecue kebab", 2, 15, 30, `${GREEDY_ART}/kebab.png`),
      option("greedy", "HAM", "Ham", 3, 25, 18, `${GREEDY_ART}/ham.png`),
      option("greedy", "STEAK", "Grilled steak", 4, 45, 10, `${GREEDY_ART}/steak.png`),
      option("greedy", "CARROT", "Carrot", 5, 5, 90, `${GREEDY_ART}/carrot.png`),
      option("greedy", "CORN", "Corn", 6, 5, 90, `${GREEDY_ART}/corn.png`),
      option("greedy", "CABBAGE", "Cabbage", 7, 5, 90, `${GREEDY_ART}/cabbage.png`),
      option("greedy", "TOMATO", "Tomato", 8, 5, 90, `${GREEDY_ART}/tomato.png`),
    ],
  },
  "greedy-classic": {
    kind: "greedy-classic",
    gameCode: "GREEDY_CLASSIC",
    gameName: "Greedy Classic",
    singleOptionPerRound: false,
    betting_duration_ms: 15_000,
    lock_duration_ms: 1_000,
    drawing_duration_ms: 4_000,
    result_duration_ms: 3_000,
    min_bet: "10",
    max_single_bet: "10000",
    max_round_bet: "50000",
    chips: CHIPS,
    options: [
      option("classic", "HOT_DOG", "Hot dog", 1, 4, 210, `${CLASSIC_ART}/hot-dog.png`),
      option("classic", "KEBAB", "Barbecue kebab", 2, 5, 168, `${CLASSIC_ART}/kebab.png`),
      option("classic", "HAM", "Ham", 3, 6, 140, `${CLASSIC_ART}/ham.png`),
      option("classic", "STEAK", "Grilled steak", 4, 7, 120, `${CLASSIC_ART}/steak.png`),
      option("classic", "CARROT", "Carrot", 5, 8, 105, `${CLASSIC_ART}/carrot.png`),
      option("classic", "CORN", "Corn", 6, 10, 84, `${CLASSIC_ART}/corn.png`),
      option("classic", "CABBAGE", "Cabbage", 7, 15, 56, `${CLASSIC_ART}/cabbage.png`),
      option("classic", "TOMATO", "Tomato", 8, 20, 42, `${CLASSIC_ART}/tomato.png`),
    ],
  },
  "lucky-77": {
    kind: "lucky-77",
    gameCode: "LUCKY_77",
    gameName: "Lucky 77",
    singleOptionPerRound: true,
    slotMap: [
      "APPLE",
      "WATERMELON",
      "APPLE",
      "WATERMELON",
      "SEVENTY_SEVEN",
      "APPLE",
      "WATERMELON",
      "APPLE",
      "WATERMELON",
    ],
    betting_duration_ms: 15_000,
    lock_duration_ms: 1_000,
    drawing_duration_ms: 4_000,
    result_duration_ms: 3_000,
    min_bet: "10",
    max_single_bet: "10000",
    max_round_bet: "50000",
    chips: CHIPS,
    options: [
      option("lucky", "APPLE", "Apple", 1, 2, 4, "/assets/lucky-77/apple.png"),
      option("lucky", "WATERMELON", "Watermelon", 2, 2, 4, "/assets/lucky-77/watermelon.png"),
      option("lucky", "SEVENTY_SEVEN", "77", 3, 8, 1, "/assets/lucky-77/seven-emblem.png"),
    ],
  },
};

export const DEMO_TEEN_PATTI = {
  gameCode: "TEEN_PATTI",
  gameName: "Teen Patti",
  betting_duration_ms: 15_000,
  lock_duration_ms: 1_500,
  drawing_duration_ms: 5_500,
  result_duration_ms: 5_000,
  min_bet: "10",
  max_single_bet: "10000",
  max_round_bet: "50000",
  rake_bps: 500,
  chips: CHIPS,
  options: [
    { id: "tp-deck-a", code: "DECK_A", name: "Hand 1", image_url: null, display_order: 1 },
    { id: "tp-deck-b", code: "DECK_B", name: "Hand 2", image_url: null, display_order: 2 },
    { id: "tp-deck-c", code: "DECK_C", name: "Hand 3", image_url: null, display_order: 3 },
  ],
} as const;

export const DEMO_BOT_NAMES = [
  "Ayaan",
  "Nora",
  "Rafi",
  "Mila",
  "Zayan",
  "Hana",
  "Imran",
  "Lina",
  "Kabir",
  "Safa",
  "Omar",
  "Yara",
] as const;

export function payoutAmount(stake: bigint, numerator: string, denominator: string): bigint {
  const den = BigInt(denominator);
  if (den <= 0n) return 0n;
  return (stake * BigInt(numerator)) / den;
}

export function pickWeightedIndex(weights: number[]): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * total;
  for (let index = 0; index < weights.length; index += 1) {
    roll -= weights[index] ?? 0;
    if (roll <= 0) return index;
  }
  return Math.max(0, weights.length - 1);
}
