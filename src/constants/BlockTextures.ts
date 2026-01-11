// 0: Transparent (Not used for blocks usually, but kept for consistency)
// 1: Primary Color
// 2: Secondary Color (Darker detail)

export const CT_TOP_PATTERN = [
  "2222222222222222",
  "2111111111111112",
  "2111111111111112",
  "2112222222222112",
  "2112112112112112",
  "2112112112112112",
  "2112222222222112",
  "2112112112112112",
  "2112112112112112",
  "2112222222222112",
  "2112112112112112",
  "2112112112112112",
  "2112222222222112",
  "2111111111111112",
  "2111111111111112",
  "2222222222222222",
];

export const CT_SIDE_PATTERN = [
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
];

export const PLANKS_PATTERN = [
  // Simple procedural noise fallback or defined pattern
  // For now we use a placeholder or assume procedural generation for noise-based blocks
  // but here is a simple planks pattern if needed
  "1111111111111111",
  "1111111111111111",
  "1111111111111111",
  "2222222222222222",
  "1111111111111111",
  "1111111111111111",
  "1111111111111111",
  "2222222222222222",
  "1111111111111111",
  "1111111111111111",
  "1111111111111111",
  "2222222222222222",
  "1111111111111111",
  "1111111111111111",
  "1111111111111111",
  "2222222222222222",
];

export const ORE_PATTERN = [
  "2222222222222222",
  "2211122222111222",
  "2211122222111222",
  "2221222222212222",
  "2222222222222222",
  "2222111222222222",
  "2222111222222222",
  "2222212222222222",
  "2222222222111222",
  "2222222222111222",
  "2222222222212222",
  "2211122222222222",
  "2211122222222222",
  "2221222222222222",
  "2222222222222222",
  "2222222222222222",
];

export const FURNACE_FRONT_PATTERN = [
  "2222222222222222",
  "2222222222222222",
  "2211111111111122",
  "2212222222222122",
  "2212222222222122",
  "2212222222222122",
  "2211111111111122",
  "2222222222222222",
  "2222222222222222",
  "2211111111111122",
  "2212222222222122",
  "2212111111112122",
  "2212111111112122",
  "2212222222222122",
  "2211111111111122",
  "2222222222222222",
];

export const FURNACE_TOP_PATTERN = [
  "2222222222222222",
  "2111111111111112",
  "2122222222222212",
  "2121111111111212",
  "2121111111111212",
  "2121111111111212",
  "2121111111111212",
  "2121111111111212",
  "2121111111111212",
  "2121111111111212",
  "2121111111111212",
  "2121111111111212",
  "2121111111111212",
  "2122222222222212",
  "2111111111111112",
  "2222222222222222",
];

export const BLOCK_COLORS = {
  WOOD_PRIMARY: "#B47850", // Light Brown (180, 120, 80)
  WOOD_SECONDARY: "#50321E", // Dark Brown (80, 50, 30)
  COAL_BLACK: "#2A2A2A", // Dark Grey/Black
  IRON_BEIGE: "#E6C8A0", // Beige/Light Orange
  STONE_GREY: "#7D7D7D", // Standard Stone
  FURNACE_DARK: "#404040",
};

export interface BlockTextureDef {
  pattern?: string[];
  colors?: { primary: string; secondary: string };
}

export const BLOCK_DEFS: Record<string, BlockTextureDef> = {
  CRAFTING_TABLE_TOP: {
    pattern: CT_TOP_PATTERN,
    colors: {
      primary: BLOCK_COLORS.WOOD_PRIMARY,
      secondary: BLOCK_COLORS.WOOD_SECONDARY,
    },
  },
  CRAFTING_TABLE_SIDE: {
    pattern: CT_SIDE_PATTERN,
    colors: {
      primary: BLOCK_COLORS.WOOD_PRIMARY,
      secondary: BLOCK_COLORS.WOOD_SECONDARY,
    },
  },
  COAL_ORE: {
    pattern: ORE_PATTERN,
    colors: {
      primary: BLOCK_COLORS.COAL_BLACK,
      secondary: BLOCK_COLORS.STONE_GREY,
    },
  },
  IRON_ORE: {
    pattern: ORE_PATTERN,
    colors: {
      primary: BLOCK_COLORS.IRON_BEIGE,
      secondary: BLOCK_COLORS.STONE_GREY,
    },
  },
  FURNACE_FRONT: {
    pattern: FURNACE_FRONT_PATTERN,
    colors: {
      primary: BLOCK_COLORS.FURNACE_DARK,
      secondary: BLOCK_COLORS.STONE_GREY,
    },
  },
  FURNACE_SIDE: {
    pattern: CT_SIDE_PATTERN, // Re-using simple side pattern
    colors: {
      primary: BLOCK_COLORS.FURNACE_DARK,
      secondary: BLOCK_COLORS.STONE_GREY,
    },
  },
  FURNACE_TOP: {
    pattern: FURNACE_TOP_PATTERN,
    colors: {
      primary: BLOCK_COLORS.FURNACE_DARK,
      secondary: BLOCK_COLORS.STONE_GREY,
    },
  },
};

// Helper to convert hex to rgb
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}
