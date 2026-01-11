import type { InventorySlot } from "../inventory/Inventory";
import { worldDB } from "../utils/DB";
import { BLOCK } from "../constants/Blocks";

export interface FurnaceData {
  x: number;
  y: number;
  z: number;
  rotation: number; // 0=North, 1=East, 2=South, 3=West
  input: InventorySlot;
  fuel: InventorySlot;
  output: InventorySlot;
  burnTime: number; // Remaining seconds for current fuel
  maxBurnTime: number; // Total seconds for the fuel item consumed
  cookTime: number; // Current cook progress (seconds)
  totalCookTime: number; // Seconds required to cook current item
}

export class FurnaceManager {
  private static instance: FurnaceManager;
  private furnaces: Map<string, FurnaceData> = new Map();
  private dirty: boolean = false;

  private constructor() {}

  public static getInstance(): FurnaceManager {
    if (!FurnaceManager.instance) {
      FurnaceManager.instance = new FurnaceManager();
    }
    return FurnaceManager.instance;
  }

  public getFurnace(x: number, y: number, z: number): FurnaceData | undefined {
    return this.furnaces.get(`${x},${y},${z}`);
  }

  public createFurnace(x: number, y: number, z: number, rotation: number = 0) {
    const key = `${x},${y},${z}`;
    if (this.furnaces.has(key)) return;

    this.furnaces.set(key, {
      x,
      y,
      z,
      rotation,
      input: { id: 0, count: 0 },
      fuel: { id: 0, count: 0 },
      output: { id: 0, count: 0 },
      burnTime: 0,
      maxBurnTime: 0,
      cookTime: 0,
      totalCookTime: 10, // Default 10 seconds
    });
    this.dirty = true;
  }

  public removeFurnace(x: number, y: number, z: number): InventorySlot[] {
    const key = `${x},${y},${z}`;
    const furnace = this.furnaces.get(key);
    if (!furnace) return [];

    const drops: InventorySlot[] = [];
    if (furnace.input.count > 0 && furnace.input.id !== 0)
      drops.push({ ...furnace.input });
    if (furnace.fuel.count > 0 && furnace.fuel.id !== 0)
      drops.push({ ...furnace.fuel });
    if (furnace.output.count > 0 && furnace.output.id !== 0)
      drops.push({ ...furnace.output });

    this.furnaces.delete(key);
    this.dirty = true;
    worldDB.delete(key, "blockEntities");

    return drops;
  }

  public tick(deltaTime: number) {
    // deltaTime in seconds
    let globalChanged = false;

    this.furnaces.forEach((furnace) => {
      let isBurning = furnace.burnTime > 0;
      let inventoryChanged = false;

      if (isBurning) {
        furnace.burnTime -= deltaTime;
        if (furnace.burnTime < 0) furnace.burnTime = 0;
      }

      // Check if we need to burn more fuel
      // Needs to have input and be smeltable to start burning fuel
      if (!isBurning && this.canSmelt(furnace)) {
        const fuelValue = this.getFuelBurnTime(furnace.fuel.id);
        if (fuelValue > 0) {
          furnace.fuel.count--;
          if (furnace.fuel.count === 0) furnace.fuel.id = 0;
          furnace.burnTime = fuelValue;
          furnace.maxBurnTime = fuelValue;
          isBurning = true;
          inventoryChanged = true;
        }
      } else if (!isBurning && furnace.burnTime <= 0) {
        // Not burning, can't smelt or no fuel
      }

      // Cook logic
      if (isBurning && this.canSmelt(furnace)) {
        furnace.cookTime += deltaTime;
        if (furnace.cookTime >= furnace.totalCookTime) {
          this.smelt(furnace);
          inventoryChanged = true;
        }
      } else {
        // Reset cook progress if not burning (or cooldown)
        if (furnace.cookTime > 0) {
          furnace.cookTime = Math.max(0, furnace.cookTime - deltaTime * 2);
          // inventoryChanged = true; // Visual change only, no item change
        }
      }

      if (inventoryChanged) {
        globalChanged = true;
        this.dirty = true;
      }
    });
  }

  private canSmelt(furnace: FurnaceData): boolean {
    if (furnace.input.id === 0) return false;
    const result = this.getSmeltingResult(furnace.input.id);
    if (!result) return false;
    if (furnace.output.id === 0) return true;
    if (furnace.output.id !== result.id) return false;
    if (furnace.output.count + result.count > 64) return false;
    return true;
  }

  private smelt(furnace: FurnaceData) {
    const result = this.getSmeltingResult(furnace.input.id);
    if (!result) return;

    furnace.input.count--;
    if (furnace.input.count === 0) furnace.input.id = 0;

    if (furnace.output.id === 0) {
      furnace.output.id = result.id;
      furnace.output.count = result.count;
    } else {
      furnace.output.count += result.count;
    }
    furnace.cookTime = 0;
  }

  private getFuelBurnTime(id: number): number {
    if (id === BLOCK.COAL) return 80;
    if (id === BLOCK.WOOD) return 15;
    if (id === BLOCK.PLANKS) return 15;
    if (id === BLOCK.STICK) return 5;
    if (id === BLOCK.CRAFTING_TABLE) return 15;
    return 0;
  }

  private getSmeltingResult(id: number): { id: number; count: number } | null {
    if (id === BLOCK.IRON_ORE) return { id: BLOCK.IRON_INGOT, count: 1 };
    if (id === BLOCK.RAW_MEAT) return { id: BLOCK.COOKED_MEAT, count: 1 };
    // Add more here if needed
    return null;
  }

  // Persistence
  public async save() {
    if (!this.dirty) return;
    const promises: Promise<void>[] = [];
    this.furnaces.forEach((data, key) => {
      promises.push(worldDB.set(key, data, "blockEntities"));
    });
    await Promise.all(promises);
    this.dirty = false;
  }

  public async load() {
    try {
      await worldDB.init(); // Ensure DB is open
      const keys = await worldDB.keys("blockEntities");
      for (const key of keys) {
        const data = await worldDB.get(key as string, "blockEntities");
        if (data) {
          this.furnaces.set(key as string, data);
        }
      }
      console.log(`Loaded ${this.furnaces.size} furnaces.`);
    } catch (e) {
      console.warn("Failed to load block entities", e);
    }
  }
}
