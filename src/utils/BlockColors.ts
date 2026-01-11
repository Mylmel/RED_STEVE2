// Утилита для получения цвета блока (для UI)

export function getBlockColor(id: number): string {
  if (id === 1) return "#559955"; // Grass
  if (id === 2) return "#8B4513"; // Dirt
  if (id === 3) return "#808080"; // Stone
  if (id === 5) return "#654321"; // Wood
  if (id === 6) return "#228B22"; // Leaves
  if (id === 7) return "#C29A6B"; // Planks
  if (id === 8) return "#654321"; // Stick
  if (id === 9) return "#a05a2b"; // Crafting Table
  if (id === 10) return "#333333"; // Coal Ore
  if (id === 11) return "#D2B48C"; // Iron Ore
  if (id === 12) return "#111111"; // Coal
  if (id === 13) return "#E0E0E0"; // Iron Ingot
  if (id === 14) return "#505050"; // Furnace
  if (id >= 20) return "transparent"; // Tools
  return "#fff"; // Default
}
