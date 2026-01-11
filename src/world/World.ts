import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import { worldDB } from "../utils/DB";
import { BLOCK_DEFS, hexToRgb } from "../constants/BlockTextures";
import { BLOCK } from "../constants/Blocks";
import { FurnaceManager } from "../crafting/FurnaceManager";
// Замените на правильный путь к Zombie
import { Zombie } from "../mobs/Zombie";

type Chunk = {
  mesh: THREE.Mesh;
  // Visual mesh only, data is stored in chunksData
};

// УБЕДИТЕСЬ ЧТО КЛАСС World ЭКСПОРТИРУЕТСЯ
export class World {
  private scene: THREE.Scene;
  private chunkSize: number = 32;
  private chunkHeight: number = 128;

  // Visuals
  private chunks: Map<string, Chunk> = new Map();

  // Data Store
  private chunksData: Map<string, Uint8Array> = new Map();
  private dirtyChunks: Set<string> = new Set();
  private knownChunkKeys: Set<string> = new Set(); // Keys that exist in DB
  private loadingChunks: Set<string> = new Set(); // Keys currently being fetched from DB

  private seed: number;
  private noise2D: (x: number, y: number) => number;
  public noiseTexture: THREE.DataTexture;

  // Terrain Settings
  private TERRAIN_SCALE = 50;
  private TERRAIN_HEIGHT = 8;
  private OFFSET = 4;

  // Настройки генерации домов
  private HOUSE_SPAWN_CHANCE: number = 1.0; // 100% для тестирования, потом можно поставить 0.3
  private HOUSE_WIDTH: number = 6;
  private HOUSE_DEPTH: number = 6;
  private HOUSE_HEIGHT: number = 4;

  // Настройки админской комнаты
  private ADMIN_ROOM_SPAWN_CHANCE: number = 0.1; // 10% шанс
  private ADMIN_ROOM_WIDTH: number = 4;
  private ADMIN_ROOM_DEPTH: number = 5;
  private ADMIN_ROOM_HEIGHT: number = 3;

  // Мобы
  private mobs: Zombie[] = [];
  private mobSpawnTimer: number = 0;
  private mobSpawnInterval: number = 10000; // Спавнить мобов каждые 10 секунд
  private maxMobs: number = 20;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.seed = Math.floor(Math.random() * 2147483647);
    
    // Создаем генератор шума прямо в конструкторе
    let a = this.seed;
    const random = () => {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    this.noise2D = createNoise2D(random);
    
    this.noiseTexture = this.createNoiseTexture();
    
    // Для отладки - делаем мир доступным глобально
    (window as any).debugWorld = this;
    (window as any).debugAdminRooms = () => this.debugAdminRooms();
  }

  // --- Persistence Methods ---

  public async loadWorld(): Promise<{
    playerPosition?: THREE.Vector3;
    inventory?: any;
  }> {
    await worldDB.init();

    // Load meta
    const meta = await worldDB.get("player", "meta");

    // Load all chunk keys so we know what to fetch vs generate
    const keys = await worldDB.keys("chunks");
    keys.forEach((k) => this.knownChunkKeys.add(k as string));

    if (meta && meta.seed !== undefined) {
      this.seed = meta.seed;
      console.log(`Loaded seed: ${this.seed}`);
      // Recreate noise generator with loaded seed
      let a = this.seed;
      const random = () => {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      this.noise2D = createNoise2D(random);
    } else {
      console.log(`No seed found, using current: ${this.seed}`);
    }

    console.log(
      `Loaded world index. ${this.knownChunkKeys.size} chunks in DB.`,
    );

    return meta
      ? {
          playerPosition: new THREE.Vector3(
            meta.position.x,
            meta.position.y,
            meta.position.z,
          ),
          inventory: meta.inventory,
        }
      : {};
  }

  public async saveWorld(playerData: {
    position: THREE.Vector3;
    inventory: any;
  }) {
    console.log("Saving world...");

    // Save Meta
    await worldDB.set(
      "player",
      {
        position: {
          x: playerData.position.x,
          y: playerData.position.y,
          z: playerData.position.z,
        },
        inventory: playerData.inventory,
        seed: this.seed,
      },
      "meta",
    );

    // Save Dirty Chunks
    const promises: Promise<void>[] = [];
    for (const key of this.dirtyChunks) {
      const data = this.chunksData.get(key);
      if (data) {
        promises.push(worldDB.set(key, data, "chunks"));
        this.knownChunkKeys.add(key);
      }
    }

    await Promise.all(promises);
    this.dirtyChunks.clear();
    console.log("World saved.");
  }

  public async deleteWorld() {
    console.log("Deleting world...");
    await worldDB.init();
    await worldDB.clear();

    this.chunksData.clear();
    this.dirtyChunks.clear();
    this.knownChunkKeys.clear();
    this.loadingChunks.clear();

    // Remove all meshes
    for (const [key, chunk] of this.chunks) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      (chunk.mesh.material as THREE.Material).dispose();
    }
    this.chunks.clear();

    // Очищаем мобов
    this.clearMobs();

    // Reset seed
    this.seed = Math.floor(Math.random() * 2147483647);
    let a = this.seed;
    const random = () => {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    this.noise2D = createNoise2D(random);

    console.log("World deleted.");
  }

  private checkMemory(playerPos: THREE.Vector3) {
    if (this.chunksData.size <= 500) return;

    const cx = Math.floor(playerPos.x / this.chunkSize);
    const cz = Math.floor(playerPos.z / this.chunkSize);

    // Find furthest chunks
    const entries = Array.from(this.chunksData.entries());
    entries.sort((a, b) => {
      const [ak] = a;
      const [bk] = b;
      const [ax, az] = ak.split(",").map(Number);
      const [bx, bz] = bk.split(",").map(Number);

      const distA = (ax - cx) ** 2 + (az - cz) ** 2;
      const distB = (bx - cx) ** 2 + (bz - cz) ** 2;

      return distB - distA; // Descending distance
    });

    // Remove 50 furthest chunks
    for (let i = 0; i < 50; i++) {
      if (i >= entries.length) break;
      const [key, data] = entries[i];

      // Ensure saved if dirty
      if (this.dirtyChunks.has(key)) {
        worldDB.set(key, data, "chunks").then(() => {
          this.knownChunkKeys.add(key);
        });
        this.dirtyChunks.delete(key);
      }

      this.chunksData.delete(key);

      // Also remove mesh if exists
      const chunk = this.chunks.get(key);
      if (chunk) {
        this.scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
        (chunk.mesh.material as THREE.Material).dispose();
        this.chunks.delete(key);
      }
    }
    console.log("Memory cleanup performed.");
  }

  // --- Core Logic ---

  private createNoiseTexture(): THREE.DataTexture {
    const width = 192; // 12 * 16
    const height = 16;
    const data = new Uint8Array(width * height * 4); // RGBA

    for (let i = 0; i < width * height; i++) {
      const stride = i * 4;
      const x = i % width;
      const y = Math.floor(i / width);

      const v = Math.floor(Math.random() * (255 - 150) + 150); // 150-255
      data[stride] = v; // R
      data[stride + 1] = v; // G
      data[stride + 2] = v; // B
      data[stride + 3] = 255; // Default Alpha

      // Alpha/Texture logic
      if (x >= 16 && x < 32) {
        // Leaves (Middle 16)
        if (Math.random() < 0.4) {
          data[stride + 3] = 0;
        }
      } else if (x >= 32 && x < 48) {
        // Planks (Right 16)
        const woodGrain = 230 + Math.random() * 20;
        data[stride] = woodGrain;
        data[stride + 1] = woodGrain;
        data[stride + 2] = woodGrain;

        if (y % 4 === 0) {
          data[stride] = 100;
          data[stride + 1] = 100;
          data[stride + 2] = 100;
        }
      } else if (x >= 48 && x < 96) {
        // Crafting Table Slots (48-64: Top, 64-80: Side, 80-96: Bottom)
        const localX = x % 16;

        let def = null;

        if (x >= 48 && x < 64) def = BLOCK_DEFS.CRAFTING_TABLE_TOP;
        else if (x >= 64 && x < 80) def = BLOCK_DEFS.CRAFTING_TABLE_SIDE;
        else {
          // Bottom - Looks like Planks but darker
          const woodGrain = 150 + Math.random() * 20;
          data[stride] = woodGrain;
          data[stride + 1] = woodGrain;
          data[stride + 2] = woodGrain;
          if (y % 4 === 0) {
            data[stride] = 80;
            data[stride + 1] = 80;
            data[stride + 2] = 80;
          }
          continue;
        }

        // Apply pattern from Def
        if (def && def.pattern && def.colors) {
          const char = def.pattern[y][localX];

          // 1: Primary, 2: Secondary
          let colorHex = def.colors.primary;
          if (char === "2") colorHex = def.colors.secondary;

          const rgb = hexToRgb(colorHex);

          data[stride] = rgb.r;
          data[stride + 1] = rgb.g;
          data[stride + 2] = rgb.b;
        }
      } else if (x >= 96 && x < 128) {
        // Ores (96-112: Coal, 112-128: Iron)
        const localX = x % 16;
        let def = null;
        if (x < 112) def = BLOCK_DEFS.COAL_ORE;
        else def = BLOCK_DEFS.IRON_ORE;

        if (def && def.pattern && def.colors) {
          const char = def.pattern[y][localX];

          if (char === "2") {
            // Secondary (Base) -> Match Stone appearance
            const noiseV = Math.floor(Math.random() * (255 - 150) + 150);
            const stoneV = Math.floor(noiseV * 0.5);

            data[stride] = stoneV;
            data[stride + 1] = stoneV;
            data[stride + 2] = stoneV;
          } else {
            // Primary (Ore)
            const rgb = hexToRgb(def.colors.primary);
            data[stride] = rgb.r;
            data[stride + 1] = rgb.g;
            data[stride + 2] = rgb.b;
          }
        }
      } else if (x >= 128) {
        // Furnace (128-144: Front, 144-160: Side, 160-176: Top)
        const localX = x % 16;
        let def = null;
        if (x < 144) def = BLOCK_DEFS.FURNACE_FRONT;
        else if (x < 160) def = BLOCK_DEFS.FURNACE_SIDE;
        else if (x < 176) def = BLOCK_DEFS.FURNACE_TOP;

        if (def && def.pattern && def.colors) {
          const char = def.pattern[y][localX];
          let colorHex = def.colors.primary;
          if (char === "2") colorHex = def.colors.secondary;
          const rgb = hexToRgb(colorHex);

          // Apply noise for grain
          const noise = Math.random() * 0.1 - 0.05; // +/- 5%
          const r = Math.min(255, Math.max(0, rgb.r + noise * 255));
          const g = Math.min(255, Math.max(0, rgb.g + noise * 255));
          const b = Math.min(255, Math.max(0, rgb.b + noise * 255));

          data[stride] = r;
          data[stride + 1] = g;
          data[stride + 2] = b;
        }
      }
    }
    const texture = new THREE.DataTexture(
      data,
      width,
      height,
      THREE.RGBAFormat,
    );
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
  }

  public update(playerPos: THREE.Vector3, deltaTime?: number) {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) ||
      (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    const radius = isMobile ? 2 : 3; // 5x5 vs 7x7

    const cx = Math.floor(playerPos.x / this.chunkSize);
    const cz = Math.floor(playerPos.z / this.chunkSize);

    const activeChunks = new Set<string>();

    // Generate grid
    for (let x = cx - radius; x <= cx + radius; x++) {
      for (let z = cz - radius; z <= cz + radius; z++) {
        const key = `${x},${z}`;
        activeChunks.add(key);

        if (!this.chunks.has(key)) {
          this.ensureChunk(x, z, key);
        }
      }
    }

    // Unload far visuals
    for (const [key, chunk] of this.chunks) {
      if (!activeChunks.has(key)) {
        this.scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
        (chunk.mesh.material as THREE.Material).dispose();
        this.chunks.delete(key);
      }
    }

    // Memory cleanup occasionally (more aggressive on mobile)
    if (Math.random() < (isMobile ? 0.05 : 0.01)) {
      this.checkMemory(playerPos);
    }

    // Обновляем логику мобов если передан deltaTime
    if (deltaTime !== undefined) {
      this.updateMobs(playerPos, deltaTime);
    }
  }

  // Методы для работы с мобами
  private updateMobs(playerPos: THREE.Vector3, deltaTime: number) {
    // Обновляем таймер спавна
    this.mobSpawnTimer += deltaTime;
    
    // Спавним новых мобов по таймеру
    if (this.mobSpawnTimer >= this.mobSpawnInterval && this.mobs.length < this.maxMobs) {
      this.spawnMobsNearPlayer(playerPos);
      this.mobSpawnTimer = 0;
    }
    
    // Обновляем существующих мобов
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];
      mob.update(deltaTime, playerPos);
      
      // Удаляем мобов, которые слишком далеко от игрока
      const distance = mob.getPosition().distanceTo(playerPos);
      if (distance > 100) {
        mob.remove();
        this.mobs.splice(i, 1);
      }
    }
  }

  private spawnMobsNearPlayer(playerPos: THREE.Vector3) {
    const spawnDistance = 30; // Дистанция спавна от игрока
    const spawnCount = Math.min(3, this.maxMobs - this.mobs.length); // Максимум 3 моба за раз
    
    for (let i = 0; i < spawnCount; i++) {
      // Случайный угол вокруг игрока
      const angle = Math.random() * Math.PI * 2;
      const spawnX = playerPos.x + Math.sin(angle) * spawnDistance;
      const spawnZ = playerPos.z + Math.cos(angle) * spawnDistance;
      
      // Находим Y координату (высоту земли)
      const spawnY = this.getTopY(spawnX, spawnZ) + 1;
      
      // Проверяем, можно ли спавнить здесь (не в воде, не внутри блока)
      if (spawnY > 0 && this.getBlock(spawnX, spawnY, spawnZ) === BLOCK.AIR) {
        // 5% шанс на большого зомби
        const isBig = Math.random() < 0.05;
        const zombie = new Zombie(this, this.scene, spawnX, spawnY, spawnZ, isBig);
        this.mobs.push(zombie);
      }
    }
  }

  // Функция для спавна зомби с 5% шансом на большого
  public spawnRandomZombie(x: number, y: number, z: number): Zombie {
    const isBig = Math.random() < 0.05; // 5% шанс
    const zombie = new Zombie(this, this.scene, x, y, z, isBig);
    this.mobs.push(zombie);
    return zombie;
  }

  // Обработка клавиши G для принудительного спавна большого зомби возле игрока
  public setupDebugKeybindings(playerPos: THREE.Vector3) {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'g' || event.key === 'G') {
        // Спавним большого зомби на небольшом расстоянии от игрока
        const spawnDistance = 5;
        const angle = Math.random() * Math.PI * 2;
        const spawnX = playerPos.x + Math.sin(angle) * spawnDistance;
        const spawnZ = playerPos.z + Math.cos(angle) * spawnDistance;
        const spawnY = this.getTopY(spawnX, spawnZ) + 1;
        
        const bigZombie = new Zombie(this, this.scene, spawnX, spawnY, spawnZ, true);
        this.mobs.push(bigZombie);
        
        console.log("Принудительно заспавнен большой красный зомби!");
      }
    });
  }

  // Получить всех мобов (для обработки в основном игровом цикле)
  public getMobs(): Zombie[] {
    return this.mobs;
  }

  // Удалить моба
  public removeMob(mob: Zombie) {
    const index = this.mobs.indexOf(mob);
    if (index !== -1) {
      mob.remove();
      this.mobs.splice(index, 1);
    }
  }

  // Очистить всех мобов (при перезагрузке мира и т.д.)
  public clearMobs() {
    for (const mob of this.mobs) {
      mob.remove();
    }
    this.mobs = [];
  }

  public async loadChunk(cx: number, cz: number) {
    const key = `${cx},${cz}`;
    await this.ensureChunk(cx, cz, key);
  }

  public async waitForChunk(cx: number, cz: number): Promise<void> {
    const key = `${cx},${cz}`;
    // If already loaded in memory
    if (this.chunksData.has(key)) return;

    // Poll until loaded (simple but effective for init)
    return new Promise((resolve) => {
      const check = () => {
        if (this.chunksData.has(key)) {
          resolve();
        } else {
          // Trigger load if not loading? ensureChunk handles dupes
          this.ensureChunk(cx, cz, key);
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  public getTopY(worldX: number, worldZ: number): number {
    const cx = Math.floor(worldX / this.chunkSize);
    const cz = Math.floor(worldZ / this.chunkSize);
    const key = `${cx},${cz}`;
    const data = this.chunksData.get(key);

    if (!data) return this.getTerrainHeight(worldX, worldZ);

    const localX = worldX - cx * this.chunkSize;
    const localZ = worldZ - cz * this.chunkSize;

    // Scan down from top
    for (let y = this.chunkHeight - 1; y >= 0; y--) {
      const index = this.getBlockIndex(localX, y, localZ);
      if (data[index] !== BLOCK.AIR) {
        return y;
      }
    }
    return 0; // Fallback
  }

  private async ensureChunk(cx: number, cz: number, key: string) {
    // 1. Check RAM
    if (this.chunksData.has(key)) {
      this.buildChunkMesh(cx, cz, this.chunksData.get(key)!);
      return;
    }

    // 2. Check DB
    if (this.knownChunkKeys.has(key)) {
      if (this.loadingChunks.has(key)) return; // Already loading
      this.loadingChunks.add(key);

      worldDB
        .get(key, "chunks")
        .then((data: Uint8Array) => {
          if (data) {
            this.chunksData.set(key, data);
            this.buildChunkMesh(cx, cz, data);
          } else {
            // Fallback if key existed but data missing?
            this.generateChunk(cx, cz);
          }
        })
        .finally(() => {
          this.loadingChunks.delete(key);
        });
      return;
    }

    // 3. Generate New
    this.generateChunk(cx, cz);
  }

  public isChunkLoaded(x: number, z: number): boolean {
    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const key = `${cx},${cz}`;
    return this.chunksData.has(key);
  }

  public hasBlock(x: number, y: number, z: number): boolean {
    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const key = `${cx},${cz}`;

    const data = this.chunksData.get(key);
    if (!data) return false;

    // Convert to local chunk coordinates
    const localX = x - cx * this.chunkSize;
    const localZ = z - cz * this.chunkSize;
    const localY = y;

    if (localY < 0 || localY >= this.chunkHeight) return false;

    const index = this.getBlockIndex(localX, localY, localZ);
    return data[index] !== BLOCK.AIR;
  }

  public getBreakTime(blockType: number, toolId: number = 0): number {
    // Default fallback
    let time = 1000;

    switch (blockType) {
      case BLOCK.GRASS:
      case BLOCK.DIRT:
        if (toolId === BLOCK.IRON_SHOVEL) time = 100;
        else if (toolId === BLOCK.STONE_SHOVEL) time = 200;
        else if (toolId === BLOCK.WOODEN_SHOVEL) time = 400;
        else time = 750;
        break;

      case BLOCK.STONE:
      case BLOCK.FURNACE:
        if (toolId === BLOCK.IRON_PICKAXE) time = 400;
        else if (toolId === BLOCK.STONE_PICKAXE) time = 600;
        else if (toolId === BLOCK.WOODEN_PICKAXE) time = 1150;
        else time = 7500;
        break;

      case BLOCK.IRON_ORE:
        if (toolId === BLOCK.IRON_PICKAXE) time = 800;
        else if (toolId === BLOCK.STONE_PICKAXE) time = 1150;
        else if (toolId === BLOCK.WOODEN_PICKAXE) time = 7500;
        else time = 15000;
        break;

      case BLOCK.COAL_ORE:
        if (toolId === BLOCK.IRON_PICKAXE) time = 800;
        else if (toolId === BLOCK.STONE_PICKAXE) time = 1150;
        else if (toolId === BLOCK.WOODEN_PICKAXE) time = 2250;
        else time = 15000;
        break;

      case BLOCK.LEAVES:
        time = 500;
        break;
      case BLOCK.WOOD:
      case BLOCK.PLANKS:
        // Keep existing logic for wood/planks (approx 3s base / multiplier)
        let multiplier = 1;
        if (
          toolId === BLOCK.WOODEN_AXE ||
          toolId === BLOCK.STONE_AXE ||
          toolId === BLOCK.IRON_AXE
        ) {
          if (toolId === BLOCK.IRON_AXE) multiplier = 8;
          else if (toolId === BLOCK.STONE_AXE) multiplier = 4;
          else multiplier = 2;
        }
        time = 3000 / multiplier;
        break;

      case BLOCK.BEDROCK:
        return Infinity;

      default:
        // Other blocks default to 1s
        time = 1000;
        break;
    }

    return time;
  }

  public getBlock(x: number, y: number, z: number): number {
    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const key = `${cx},${cz}`;

    const data = this.chunksData.get(key);
    if (!data) return 0; // AIR

    const localX = x - cx * this.chunkSize;
    const localZ = z - cz * this.chunkSize;
    const localY = y;

    if (localY < 0 || localY >= this.chunkHeight) return 0;

    const index = this.getBlockIndex(localX, localY, localZ);
    return data[index];
  }

  public setBlock(x: number, y: number, z: number, type: number) {
    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const key = `${cx},${cz}`;

    const data = this.chunksData.get(key);
    if (!data) return;

    const localX = x - cx * this.chunkSize;
    const localZ = z - cz * this.chunkSize;
    const localY = y;

    if (localY < 0 || localY >= this.chunkHeight) return;

    const index = this.getBlockIndex(localX, localY, localZ);
    data[index] = type;
    this.dirtyChunks.add(key); // Mark for save

    // Regenerate mesh for CURRENT chunk
    const updateChunkMesh = (k: string, cx: number, cz: number) => {
      const chunk = this.chunks.get(k);
      if (chunk) {
        this.scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
        (chunk.mesh.material as THREE.Material).dispose();
      }
      const chunkData = this.chunksData.get(k);
      if (chunkData) {
        const newMesh = this.generateChunkMesh(chunkData, cx, cz);
        this.scene.add(newMesh);
        this.chunks.set(k, { mesh: newMesh });
      }
    };

    updateChunkMesh(key, cx, cz);

    // Regenerate Neighbors if on border
    if (localX === 0) updateChunkMesh(`${cx - 1},${cz}`, cx - 1, cz);
    if (localX === this.chunkSize - 1)
      updateChunkMesh(`${cx + 1},${cz}`, cx + 1, cz);
    if (localZ === 0) updateChunkMesh(`${cx},${cz - 1}`, cx, cz - 1);
    if (localZ === this.chunkSize - 1)
      updateChunkMesh(`${cx},${cz + 1}`, cx, cz + 1);
  }

  private getBlockIndex(x: number, y: number, z: number): number {
    return x + y * this.chunkSize + z * this.chunkSize * this.chunkHeight;
  }

  private placeTree(
    data: Uint8Array,
    startX: number,
    startY: number,
    startZ: number,
  ) {
    const trunkHeight = Math.floor(Math.random() * 2) + 4; // 4-5 blocks

    // Trunk
    for (let y = 0; y < trunkHeight; y++) {
      const currentY = startY + y;
      if (currentY < this.chunkHeight) {
        const index = this.getBlockIndex(startX, currentY, startZ);
        data[index] = BLOCK.WOOD;
      }
    }

    // Leaves (Volumetric)
    const leavesStart = startY + trunkHeight - 2;
    const leavesEnd = startY + trunkHeight + 1; // 1 block above trunk top

    for (let y = leavesStart; y <= leavesEnd; y++) {
      const dy = y - (startY + trunkHeight - 1); // Distance from top of trunk
      let radius = 2;
      if (dy === 2)
        radius = 1; // Top tip
      else if (dy === -1) radius = 2; // Bottomest layer

      for (let x = startX - radius; x <= startX + radius; x++) {
        for (let z = startZ - radius; z <= startZ + radius; z++) {
          // Corner rounding
          const dx = x - startX;
          const dz = z - startZ;
          if (Math.abs(dx) === radius && Math.abs(dz) === radius) {
            // Skip corners randomly to make it less square
            if (Math.random() < 0.4) continue;
          }

          if (
            x >= 0 &&
            x < this.chunkSize &&
            y >= 0 &&
            y < this.chunkHeight &&
            z >= 0 &&
            z < this.chunkSize
          ) {
            const index = this.getBlockIndex(x, y, z);
            // Don't overwrite trunk
            if (data[index] !== BLOCK.WOOD) {
              data[index] = BLOCK.LEAVES;
            }
          }
        }
      }
    }
  }

  public getTerrainHeight(worldX: number, worldZ: number): number {
    const noiseValue = this.noise2D(
      worldX / this.TERRAIN_SCALE,
      worldZ / this.TERRAIN_SCALE,
    );
    // Must match generateChunk logic exactly
    let height = Math.floor(noiseValue * this.TERRAIN_HEIGHT) + 20;
    if (height < 1) height = 1;
    if (height >= this.chunkHeight) height = this.chunkHeight - 1;
    return height;
  }

  // Функция для проверки, можно ли построить дом в данной области
  private canPlaceHouse(data: Uint8Array, startX: number, startZ: number, surfaceHeight: number): boolean {
    const houseWidth = this.HOUSE_WIDTH;
    const houseDepth = this.HOUSE_DEPTH;
    const houseHeight = this.HOUSE_HEIGHT;
    
    // УВЕЛИЧИВАЕМ ГРАНИЦЫ ПРОВЕРКИ
    if (startX < 2 || startX + houseWidth >= this.chunkSize - 2 ||
        startZ < 2 || startZ + houseDepth >= this.chunkSize - 2) {
      return false;
    }
    
    // ПРОВЕРКА 1: Основание дома
    for (let x = startX; x < startX + houseWidth; x++) {
      for (let z = startZ; z < startZ + houseDepth; z++) {
        // Блок в основании (земля)
        const groundIndex = this.getBlockIndex(x, surfaceHeight, z);
        const groundBlock = data[groundIndex];
        
        // Блок над основанием (должен быть AIR для пола)
        const floorIndex = this.getBlockIndex(x, surfaceHeight + 1, z);
        const floorBlock = data[floorIndex];
        
        // Допустимые блоки для основания
        const isValidGround = groundBlock === BLOCK.GRASS || 
                             groundBlock === BLOCK.DIRT || 
                             groundBlock === BLOCK.STONE;
        
        // Проверяем, что земля подходит и место для пола свободно
        if (!isValidGround || floorBlock !== BLOCK.AIR) {
          return false;
        }
        
        // ПРОВЕРКА 2: Пространство для стен и крыши
        for (let y = surfaceHeight + 2; y <= surfaceHeight + houseHeight; y++) {
          if (y >= this.chunkHeight) return false;
          
          const index = this.getBlockIndex(x, y, z);
          if (data[index] !== BLOCK.AIR) {
            return false;
          }
        }
      }
    }
    
    // ПРОВЕРКА 3: Нет деревьев рядом (упрощенная проверка)
    const clearance = 2; // Уменьшаем с 3 до 2
    for (let x = startX - clearance; x < startX + houseWidth + clearance; x++) {
      for (let z = startZ - clearance; z < startZ + houseDepth + clearance; z++) {
        if (x < 0 || x >= this.chunkSize || z < 0 || z >= this.chunkSize) continue;
        
        // Проверяем только на уровне дома
        for (let y = surfaceHeight; y <= surfaceHeight + houseHeight + 2; y++) {
          if (y >= this.chunkHeight) break;
          
          const index = this.getBlockIndex(x, y, z);
          const block = data[index];
          if (block === BLOCK.LEAVES || block === BLOCK.WOOD) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  // Функция для создания дома
  private placeHouse(data: Uint8Array, startX: number, startZ: number, surfaceHeight: number) {
    const houseWidth = this.HOUSE_WIDTH;
    const houseDepth = this.HOUSE_DEPTH;
    const houseHeight = this.HOUSE_HEIGHT;
    
    console.log(`🔨 Строим дом на координатах: x=${startX}, z=${startZ}, y=${surfaceHeight}`);
    
    // 1. Основание (пол) - поднимаем дом на 1 блок над землей
    const floorY = surfaceHeight + 1;
    for (let x = startX; x < startX + houseWidth; x++) {
      for (let z = startZ; z < startZ + houseDepth; z++) {
        const index = this.getBlockIndex(x, floorY, z);
        data[index] = BLOCK.PLANKS;
      }
    }
    
    // 2. Стены (только по периметру, без углов для дверей/окон)
    for (let y = floorY + 1; y < floorY + houseHeight; y++) {
      // Передняя и задняя стены (с дверью и окнами)
      for (let x = startX; x < startX + houseWidth; x++) {
        // Задняя стена (полная)
        let index = this.getBlockIndex(x, y, startZ);
        data[index] = BLOCK.PLANKS;
        
        // Передняя стена (с дверью по центру)
        index = this.getBlockIndex(x, y, startZ + houseDepth - 1);
        // Оставляем место для двери в центре (блоки 2 и 3 из 6)
        const isDoorColumn = (x === startX + 2 || x === startX + 3);
        if (!isDoorColumn) {
          data[index] = BLOCK.PLANKS;
        }
      }
      
      // Боковые стены (с окнами)
      for (let z = startZ; z < startZ + houseDepth; z++) {
        // Левая стена
        let index = this.getBlockIndex(startX, y, z);
        // Оставляем окна на высоте y = floorY + 2
        const isWindowHeight = (y === floorY + 2);
        const isWindowColumn = (z === startZ + 2 || z === startZ + 3);
        if (!(isWindowHeight && isWindowColumn)) {
          data[index] = BLOCK.PLANKS;
        }
        
        // Правая стена
        index = this.getBlockIndex(startX + houseWidth - 1, y, z);
        if (!(isWindowHeight && isWindowColumn)) {
          data[index] = BLOCK.PLANKS;
        }
      }
    }
    
    // 3. Крыша
    const roofY = floorY + houseHeight;
    for (let x = startX; x < startX + houseWidth; x++) {
      for (let z = startZ; z < startZ + houseDepth; z++) {
        const index = this.getBlockIndex(x, roofY, z);
        data[index] = BLOCK.PLANKS;
      }
    }
    
    // 4. Дверь (2 блока в высоту)
    const doorX1 = startX + 2;
    const doorX2 = startX + 3;
    const doorZ = startZ + houseDepth - 1;
    
    for (let y = floorY + 1; y <= floorY + 2; y++) {
      let index = this.getBlockIndex(doorX1, y, doorZ);
      data[index] = BLOCK.AIR; // Пустое пространство
      
      index = this.getBlockIndex(doorX2, y, doorZ);
      data[index] = BLOCK.AIR;
    }
    
    // 5. Печь в левом ближнем углу
    const furnaceX = startX + 1;
    const furnaceZ = startZ + 1;
    const furnaceIndex = this.getBlockIndex(furnaceX, floorY + 1, furnaceZ);
    data[furnaceIndex] = BLOCK.FURNACE;
    
    // 6. Верстак в правом дальнем углу
    const craftingTableX = startX + houseWidth - 2;
    const craftingTableZ = startZ + houseDepth - 2;
    const craftingTableIndex = this.getBlockIndex(craftingTableX, floorY + 1, craftingTableZ);
    data[craftingTableIndex] = BLOCK.CRAFTING_TABLE;
    
    console.log(`✅ Дом построен! Печь: [${furnaceX}, ${floorY + 1}, ${furnaceZ}], Верстак: [${craftingTableX}, ${floorY + 1}, ${craftingTableZ}]`);
  }

  // Метод для отладки - проверка генерации домов
  public debugHouses(): string {
    console.log("=== ОТЛАДКА ГЕНЕРАЦИИ ДОМОВ ===");
    
    let craftingTables = 0;
    let furnaces = 0;
    let planks = 0;
    let adminRooms = 0;
    
    for (const [key, data] of this.chunksData) {
      for (let i = 0; i < data.length; i++) {
        const blockType = data[i];
        if (blockType === BLOCK.CRAFTING_TABLE) craftingTables++;
        if (blockType === BLOCK.FURNACE) furnaces++;
        if (blockType === BLOCK.PLANKS) planks++;
      }
    }
    
    // Вызываем отдельную функцию для подсчета админских комнат
    adminRooms = this.countAdminRooms();
    
    const result = `
Чанков в памяти: ${this.chunksData.size}
Обычных верстаков: ${craftingTables}
Обычных печей: ${furnaces}
Досок: ${planks}
Примерно обычных домов: ${Math.min(craftingTables, furnaces)}
Админских комнат: ${adminRooms}
Шанс спавна домов: ${this.HOUSE_SPAWN_CHANCE * 100}%
Шанс спавна админской комнаты: ${this.ADMIN_ROOM_SPAWN_CHANCE * 100}%
`;
    
    console.log(result);
    alert(result);
    return result;
  }

  // Метод для изменения шанса спавна домов
  public setHouseSpawnChance(chance: number): void {
    if (chance >= 0 && chance <= 1) {
      this.HOUSE_SPAWN_CHANCE = chance;
      console.log(`Шанс спавна домов изменен на ${chance * 100}%`);
    } else {
      console.error("Шанс должен быть между 0 и 1");
    }
  }

  // Метод проверки возможности размещения админской комнаты
  private canPlaceAdminRoom(data: Uint8Array, startX: number, startZ: number, startY: number): boolean {
    const width = this.ADMIN_ROOM_WIDTH;
    const depth = this.ADMIN_ROOM_DEPTH;
    const height = this.ADMIN_ROOM_HEIGHT;
    
    // Проверяем границы
    if (startX < 1 || startX + width >= this.chunkSize - 1 ||
        startZ < 1 || startZ + depth >= this.chunkSize - 1 ||
        startY < 2 || startY + height >= 10) { // Не выше 10 уровня
      return false;
    }
    
    // Проверяем, что есть пространство для комнаты
    for (let x = startX - 1; x < startX + width + 1; x++) {
      for (let z = startZ - 1; z < startZ + depth + 1; z++) {
        for (let y = startY - 1; y < startY + height + 1; y++) {
          // Пропускаем проверку для пола (будем заменять на бедрок)
          if (y >= startY && y < startY + height && 
              x >= startX && x < startX + width && 
              z >= startZ && z < startZ + depth) {
            continue;
          }
          
          // Проверяем, что блок не бедрок (комната должна быть вырезана в камне)
          if (x >= 0 && x < this.chunkSize && 
              y >= 0 && y < this.chunkHeight && 
              z >= 0 && z < this.chunkSize) {
            const index = this.getBlockIndex(x, y, z);
            if (data[index] === BLOCK.BEDROCK) {
              return false; // Нельзя строить в бедроке
            }
          }
        }
      }
    }
    
    return true;
  }

  // Метод создания админской комнаты
  private placeAdminRoom(data: Uint8Array, startX: number, startZ: number, startY: number) {
    const width = this.ADMIN_ROOM_WIDTH;
    const depth = this.ADMIN_ROOM_DEPTH;
    const height = this.ADMIN_ROOM_HEIGHT;
    
    console.log(`🏗️ Создаю админскую комнату ${width}x${depth}x${height} на [${startX},${startY},${startZ}]`);
    
    // 1. Пол и потолок из бедрока
    for (let x = startX; x < startX + width; x++) {
      for (let z = startZ; z < startZ + depth; z++) {
        // Пол (bedrock)
        const floorIndex = this.getBlockIndex(x, startY, z);
        data[floorIndex] = BLOCK.BEDROCK;
        
        // Потолок (bedrock)
        const ceilingIndex = this.getBlockIndex(x, startY + height - 1, z);
        data[ceilingIndex] = BLOCK.BEDROCK;
      }
    }
    
    // 2. Стены из бедрока
    for (let y = startY; y < startY + height; y++) {
      // Передняя и задняя стены
      for (let x = startX; x < startX + width; x++) {
        // Задняя стена
        const backWallIndex = this.getBlockIndex(x, y, startZ);
        data[backWallIndex] = BLOCK.BEDROCK;
        
        // Передняя стена (с дверью в центре)
        const frontWallIndex = this.getBlockIndex(x, y, startZ + depth - 1);
        // Оставляем проход для двери в центре (ширина 2 блока)
        const isDoorColumn = (x === startX + Math.floor(width/2) - 1 || 
                             x === startX + Math.floor(width/2));
        if (!(isDoorColumn && y > startY && y < startY + height - 1)) {
          data[frontWallIndex] = BLOCK.BEDROCK;
        }
      }
      
      // Боковые стены
      for (let z = startZ; z < startZ + depth; z++) {
        // Левая стена
        const leftWallIndex = this.getBlockIndex(startX, y, z);
        data[leftWallIndex] = BLOCK.BEDROCK;
        
        // Правая стена
        const rightWallIndex = this.getBlockIndex(startX + width - 1, y, z);
        data[rightWallIndex] = BLOCK.BEDROCK;
      }
    }
    
    // 3. Очищаем внутреннее пространство комнаты (AIR)
    for (let x = startX + 1; x < startX + width - 1; x++) {
      for (let z = startZ + 1; z < startZ + depth - 1; z++) {
        for (let y = startY + 1; y < startY + height - 1; y++) {
          const index = this.getBlockIndex(x, y, z);
          data[index] = BLOCK.AIR;
        }
      }
    }
    
    // 4. Размещаем мебель (50% шанс для каждого предмета)
    
    // Печка в левом дальнем углу
    if (Math.random() < 0.5) {
      const furnaceX = startX + 1;
      const furnaceZ = startZ + 1;
      const furnaceIndex = this.getBlockIndex(furnaceX, startY + 1, furnaceZ);
      data[furnaceIndex] = BLOCK.FURNACE;
      console.log(`🔥 Печка в админской комнате: [${furnaceX},${startY + 1},${furnaceZ}]`);
    }
    
    // Верстак в правом дальнем углу
    if (Math.random() < 0.5) {
      const tableX = startX + width - 2;
      const tableZ = startZ + depth - 2;
      const tableIndex = this.getBlockIndex(tableX, startY + 1, tableZ);
      data[tableIndex] = BLOCK.CRAFTING_TABLE;
      console.log(`🛠️ Верстак в админской комнате: [${tableX},${startY + 1},${tableZ}]`);
    }
    
    // Сундук (если есть такой блок) или камень в центре
    const centerX = startX + Math.floor(width / 2);
    const centerZ = startZ + Math.floor(depth / 2);
    const centerIndex = this.getBlockIndex(centerX, startY + 1, centerZ);
    // Если есть блок сундука - используем его, иначе - камень
    if (typeof BLOCK.CHEST !== 'undefined') {
      data[centerIndex] = BLOCK.CHEST;
    } else {
      data[centerIndex] = BLOCK.STONE;
    }
    
    // 5. Факелы для освещения (если есть такой блок)
    if (typeof BLOCK.TORCH !== 'undefined') {
      // Факел на каждой стене
      const torchY = startY + 2;
      
      // Задняя стена
      const torch1X = startX + Math.floor(width / 2);
      const torch1Z = startZ;
      const torch1Index = this.getBlockIndex(torch1X, torchY, torch1Z);
      data[torch1Index] = BLOCK.TORCH;
      
      // Передняя стена (рядом с дверью)
      const torch2X = startX + Math.floor(width / 2);
      const torch2Z = startZ + depth - 1;
      const torch2Index = this.getBlockIndex(torch2X, torchY, torch2Z);
      data[torch2Index] = BLOCK.TORCH;
    }
    
    console.log(`✅ Админская комната создана!`);
  }

  // Метод для отладки админских комнат
  public debugAdminRooms(): string {
    console.log("=== ОТЛАДКА АДМИНСКИХ КОМНАТ ===");
    
    let adminRooms = 0;
    let bedrockCount = 0;
    
    // Ищем характерные структуры: 4x5 комнаты из бедрока
    for (const [key, data] of this.chunksData) {
      for (let y = 2; y < 10; y++) { // Ищем на уровнях 2-10
        for (let x = 0; x < this.chunkSize - this.ADMIN_ROOM_WIDTH; x++) {
          for (let z = 0; z < this.chunkSize - this.ADMIN_ROOM_DEPTH; z++) {
            // Проверяем, есть ли здесь комната из бедрока
            let isRoom = true;
            
            // Проверяем пол и потолок
            for (let dx = 0; dx < this.ADMIN_ROOM_WIDTH; dx++) {
              for (let dz = 0; dz < this.ADMIN_ROOM_DEPTH; dz++) {
                // Пол
                const floorIndex = this.getBlockIndex(x + dx, y, z + dz);
                if (data[floorIndex] !== BLOCK.BEDROCK) {
                  isRoom = false;
                  break;
                }
                
                // Потолок (если есть место)
                if (y + this.ADMIN_ROOM_HEIGHT - 1 < this.chunkHeight) {
                  const ceilingIndex = this.getBlockIndex(x + dx, y + this.ADMIN_ROOM_HEIGHT - 1, z + dz);
                  if (data[ceilingIndex] !== BLOCK.BEDROCK) {
                    isRoom = false;
                    break;
                  }
                }
              }
              if (!isRoom) break;
            }
            
            if (isRoom) {
              adminRooms++;
            }
          }
        }
      }
      
      // Считаем общее количество бедрока
      for (let i = 0; i < data.length; i++) {
        if (data[i] === BLOCK.BEDROCK) bedrockCount++;
      }
    }
    
    const result = `
Админских комнат обнаружено: ${adminRooms}
Блоков бедрока всего: ${bedrockCount}
Шанс спавна комнаты: ${this.ADMIN_ROOM_SPAWN_CHANCE * 100}%
`;
    
    console.log(result);
    return result;
  }

  // Вспомогательный метод для подсчета админских комнат
  private countAdminRooms(): number {
    let roomCount = 0;
    
    for (const [key, data] of this.chunksData) {
      for (let y = 2; y < 10; y++) {
        for (let x = 0; x < this.chunkSize - this.ADMIN_ROOM_WIDTH; x++) {
          for (let z = 0; z < this.chunkSize - this.ADMIN_ROOM_DEPTH; z++) {
            let isRoom = true;
            
            // Простая проверка - углы комнаты из бедрока
            const corners = [
              [x, y, z],
              [x + this.ADMIN_ROOM_WIDTH - 1, y, z],
              [x, y, z + this.ADMIN_ROOM_DEPTH - 1],
              [x + this.ADMIN_ROOM_WIDTH - 1, y, z + this.ADMIN_ROOM_DEPTH - 1]
            ];
            
            for (const [cx, cy, cz] of corners) {
              if (cx < this.chunkSize && cz < this.chunkSize) {
                const index = this.getBlockIndex(cx, cy, cz);
                if (data[index] !== BLOCK.BEDROCK) {
                  isRoom = false;
                  break;
                }
              }
            }
            
            if (isRoom) {
              roomCount++;
              // Перепрыгиваем вперед, чтобы не считать перекрывающиеся комнаты
              z += this.ADMIN_ROOM_DEPTH;
            }
          }
        }
      }
    }
    
    return roomCount;
  }

  private generateChunk(cx: number, cz: number) {
    const key = `${cx},${cz}`;
    console.log(`🔧 Генерирую чанк ${cx},${cz} с домами...`);
    
    const data = new Uint8Array(
      this.chunkSize * this.chunkSize * this.chunkHeight,
    );
    const startX = cx * this.chunkSize;
    const startZ = cz * this.chunkSize;

    // 1. Generate Terrain
    for (let x = 0; x < this.chunkSize; x++) {
      for (let z = 0; z < this.chunkSize; z++) {
        const worldX = startX + x;
        const worldZ = startZ + z;

        const noiseValue = this.noise2D(
          worldX / this.TERRAIN_SCALE,
          worldZ / this.TERRAIN_SCALE,
        );
        // Ensure OFFSET is at least 18-20 to allow 16+ layers of stone (since bedrock is y=0)
        let height = Math.floor(noiseValue * this.TERRAIN_HEIGHT) + 20;

        if (height < 1) height = 1;
        if (height >= this.chunkHeight) height = this.chunkHeight - 1;

        for (let y = 0; y <= height; y++) {
          let type = BLOCK.STONE;
          if (y === 0) type = BLOCK.BEDROCK;
          else if (y === height) type = BLOCK.GRASS;
          else if (y >= height - 3) type = BLOCK.DIRT;

          const index = this.getBlockIndex(x, y, z);
          data[index] = type;
        }
      }
    }

    // 1.5 Generate Ores (Veins)
    let coalCount = 0;
    let ironCount = 0;

    const generateVein = (
      blockType: number,
      targetLen: number,
      attempts: number,
    ) => {
      for (let i = 0; i < attempts; i++) {
        // Pick random start
        let vx = Math.floor(Math.random() * this.chunkSize);
        let vz = Math.floor(Math.random() * this.chunkSize);

        // Better height targeting: Find the surface to ensure we spawn in Stone
        const worldX = startX + vx;
        const worldZ = startZ + vz;
        const noiseValue = this.noise2D(
          worldX / this.TERRAIN_SCALE,
          worldZ / this.TERRAIN_SCALE,
        );
        let surfaceHeight = Math.floor(noiseValue * this.TERRAIN_HEIGHT) + 20;
        // Clamp to max stone layer (approx surface - 3 for dirt/grass)
        let maxStoneY = surfaceHeight - 3;
        if (maxStoneY < 2) maxStoneY = 2;

        let vy = Math.floor(Math.random() * (maxStoneY - 1)) + 1; // 1 to maxStoneY

        let index = this.getBlockIndex(vx, vy, vz);
        if (data[index] === BLOCK.STONE) {
          data[index] = blockType;
          if (blockType === BLOCK.COAL_ORE) coalCount++;
          else ironCount++;

          // Grow vein
          let currentLen = 1;
          let fails = 0;
          while (currentLen < targetLen && fails < 10) {
            // Try to move
            const dir = Math.floor(Math.random() * 6);
            let nx = vx,
              ny = vy,
              nz = vz;

            if (dir === 0) nx++;
            else if (dir === 1) nx--;
            else if (dir === 2) ny++;
            else if (dir === 3) ny--;
            else if (dir === 4) nz++;
            else if (dir === 5) nz--;

            if (
              nx >= 0 &&
              nx < this.chunkSize &&
              ny > 0 &&
              ny < this.chunkHeight &&
              nz >= 0 &&
              nz < this.chunkSize
            ) {
              index = this.getBlockIndex(nx, ny, nz);
              if (data[index] === BLOCK.STONE) {
                data[index] = blockType;
                vx = nx;
                vy = ny;
                vz = nz; // Move cursor
                currentLen++;
                if (blockType === BLOCK.COAL_ORE) coalCount++;
                else ironCount++;
              } else if (data[index] === blockType) {
                vx = nx;
                vy = ny;
                vz = nz; // Already ore, just move there
              } else {
                fails++; // Hit non-stone
              }
            } else {
              fails++; // Out of bounds
            }
          }
        }
      }
    };

    // Coal: Very Frequent
    generateVein(BLOCK.COAL_ORE, 8, 80);

    // Iron: Frequent
    generateVein(BLOCK.IRON_ORE, 6, 50);

    // 2. Generate Admin Room (под землей, рядом с бедроком)
    if (Math.random() < this.ADMIN_ROOM_SPAWN_CHANCE) {
      this.generateAdminRoom(data, cx, cz);
    }

    // 3. Generate Houses - УПРОЩАЕМ И ИСПРАВЛЯЕМ
    const housesToTry = 10; // Пробуем 10 мест в чанке
    let houseBuilt = false;
    
    for (let attempt = 0; attempt < housesToTry; attempt++) {
      // Выбираем случайное место в чанке (но не слишком близко к краям)
      const x = Math.floor(Math.random() * (this.chunkSize - 10)) + 5;
      const z = Math.floor(Math.random() * (this.chunkSize - 10)) + 5;
      
      // Находим поверхность в этой точке
      let surfaceHeight = -1;
      for (let y = this.chunkHeight - 1; y >= 0; y--) {
        const index = this.getBlockIndex(x, y, z);
        if (data[index] !== BLOCK.AIR) {
          surfaceHeight = y;
          break;
        }
      }
      
      // Проверяем условия
      if (surfaceHeight >= 10 && surfaceHeight <= 50) { // Не слишком низко и не слишком высоко
        // Проверяем, что поверхность ровная в радиусе 4 блоков
        let isFlat = true;
        for (let dx = -3; dx <= 3; dx++) {
          for (let dz = -3; dz <= 3; dz++) {
            const nx = x + dx;
            const nz = z + dz;
            if (nx >= 0 && nx < this.chunkSize && nz >= 0 && nz < this.chunkSize) {
              // Находим высоту в соседней точке
              let neighborHeight = -1;
              for (let y = this.chunkHeight - 1; y >= 0; y--) {
                const index = this.getBlockIndex(nx, y, nz);
                if (data[index] !== BLOCK.AIR) {
                  neighborHeight = y;
                  break;
                }
              }
              // Если перепад высот больше 1, место не подходит
              if (Math.abs(neighborHeight - surfaceHeight) > 1) {
                isFlat = false;
                break;
              }
            }
          }
          if (!isFlat) break;
        }
        
        if (isFlat && this.canPlaceHouse(data, x, z, surfaceHeight)) {
          // Используем установленный шанс
          if (Math.random() < this.HOUSE_SPAWN_CHANCE) {
            console.log(`🏠 Генерирую дом в чанке [${cx},${cz}] на координатах x=${x}, z=${z}, y=${surfaceHeight}`);
            this.placeHouse(data, x, z, surfaceHeight);
            houseBuilt = true;
            break; // Генерируем только один дом на чанк
          }
        }
      }
    }

    // 4. Generate Trees (Уменьшаем вероятность еще сильнее для домов)
    for (let x = 0; x < this.chunkSize; x++) {
      for (let z = 0; z < this.chunkSize; z++) {
        if (x < 2 || x >= this.chunkSize - 2 || z < 2 || z >= this.chunkSize - 2)
          continue;

        let height = -1;
        for (let y = this.chunkHeight - 1; y >= 0; y--) {
          if (data[this.getBlockIndex(x, y, z)] !== BLOCK.AIR) {
            height = y;
            break;
          }
        }

        if (height > 0) {
          const index = this.getBlockIndex(x, height, z);
          if (data[index] === BLOCK.GRASS) {
            // Еще больше уменьшаем деревья - 0.2%
            if (Math.random() < 0.002) {
              this.placeTree(data, x, height + 1, z);
            }
          }
        }
      }
    }

    // Save to Global Store
    this.chunksData.set(key, data);
    this.dirtyChunks.add(key); // New chunk = needs save

    // Проверяем, есть ли в чанке верстаки
    let craftingTables = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] === BLOCK.CRAFTING_TABLE) craftingTables++;
    }
    console.log(`📊 Чанк ${cx},${cz}: верстаков = ${craftingTables}, дом построен: ${houseBuilt ? 'Да' : 'Нет'}`);

    // 5. Generate Mesh
    this.buildChunkMesh(cx, cz, data);
  }

  private buildChunkMesh(cx: number, cz: number, data: Uint8Array) {
    const key = `${cx},${cz}`;
    if (this.chunks.has(key)) return; // Already has mesh

    const mesh = this.generateChunkMesh(data, cx, cz);
    this.scene.add(mesh);
    this.chunks.set(key, { mesh });
  }

  private generateChunkMesh(
    data: Uint8Array,
    cx: number,
    cz: number,
  ): THREE.Mesh {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];

    const startX = cx * this.chunkSize;
    const startZ = cz * this.chunkSize;

    // Helper to add face
    const addFace = (
      x: number,
      y: number,
      z: number,
      type: number,
      side: string,
    ) => {
      // Local block coords
      const localX = x;
      const localY = y;
      const localZ = z;

      const x0 = localX;
      const x1 = localX + 1;
      const y0 = localY;
      const y1 = localY + 1;
      const z0 = localZ;
      const z1 = localZ + 1;

      // Color Logic
      let r = 0.5,
        g = 0.5,
        b = 0.5;
      if (type === BLOCK.STONE) {
        r = 0.5;
        g = 0.5;
        b = 0.5;
      } else if (type === BLOCK.BEDROCK) {
        r = 0.05;
        g = 0.05;
        b = 0.05;
      } // Very Dark
      else if (type === BLOCK.DIRT) {
        r = 0.54;
        g = 0.27;
        b = 0.07;
      } // Brown
      else if (type === BLOCK.GRASS) {
        if (side === "top") {
          r = 0.33;
          g = 0.6;
          b = 0.33;
        } // Green
        else {
          r = 0.54;
          g = 0.27;
          b = 0.07;
        } // Dirt side
      } else if (type === BLOCK.WOOD) {
        r = 0.4;
        g = 0.2;
        b = 0.0;
      } // Dark Brown
      else if (type === BLOCK.LEAVES) {
        r = 0.13;
        g = 0.55;
        b = 0.13;
      } // Forest Green
      else if (type === BLOCK.PLANKS) {
        r = 0.76;
        g = 0.6;
        b = 0.42;
      } // Light Wood
      else if (type === BLOCK.CRAFTING_TABLE) {
        r = 1.0;
        g = 1.0;
        b = 1.0;
      } // Texture handles color
      else if (type === BLOCK.STICK) {
        r = 0.4;
        g = 0.2;
        b = 0.0;
      } // Stick
      else if (type >= 20) {
        r = 1;
        g = 0;
        b = 1;
      } // Error/Tool color (Magenta)

      // Append data based on side
      if (side === "top") {
        // y+
        positions.push(x0, y1, z1, x1, y1, z1, x0, y1, z0, x1, y1, z0);
        normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
      } else if (side === "bottom") {
        // y-
        positions.push(x0, y0, z0, x1, y0, z0, x0, y0, z1, x1, y0, z1);
        normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0);
      } else if (side === "front") {
        // z+
        positions.push(x0, y0, z1, x1, y0, z1, x0, y1, z1, x1, y1, z1);
        normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
      } else if (side === "back") {
        // z-
        positions.push(x1, y0, z0, x0, y0, z0, x1, y1, z0, x0, y1, z0);
        normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1);
      } else if (side === "right") {
        // x+
        positions.push(x1, y0, z1, x1, y0, z0, x1, y1, z1, x1, y1, z0);
        normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0);
      } else if (side === "left") {
        // x-
        positions.push(x0, y0, z0, x0, y0, z1, x0, y1, z0, x0, y1, z1);
        normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0);
      }

      // UVs
      // Atlas (Total slots: 12, step 1/12)
      // 0: Noise, 1: Leaves, 2: Planks, 3: CT Top, 4: CT Side, 5: CT Bottom
      // 6: Coal Ore, 7: Iron Ore, 8: Furnace Front, 9: Furnace Side, 10: Furnace Top
      const uvStep = 1.0 / 12.0;
      const uvInset = 0.001;
      let u0 = 0 + uvInset;
      let u1 = uvStep - uvInset;

      if (type === BLOCK.LEAVES) {
        u0 = uvStep * 1 + uvInset;
        u1 = uvStep * 2 - uvInset;
      } else if (type === BLOCK.PLANKS) {
        u0 = uvStep * 2 + uvInset;
        u1 = uvStep * 3 - uvInset;
      } else if (type === BLOCK.CRAFTING_TABLE) {
        if (side === "top") {
          u0 = uvStep * 3 + uvInset;
          u1 = uvStep * 4 - uvInset;
        } else if (side === "bottom") {
          u0 = uvStep * 5 + uvInset;
          u1 = uvStep * 6 - uvInset;
        } else {
          // Side
          u0 = uvStep * 4 + uvInset;
          u1 = uvStep * 5 - uvInset;
        }
      } else if (type === BLOCK.COAL_ORE) {
        u0 = uvStep * 6 + uvInset;
        u1 = uvStep * 7 - uvInset;
      } else if (type === BLOCK.IRON_ORE) {
        u0 = uvStep * 7 + uvInset;
        u1 = uvStep * 8 - uvInset;
      } else if (type === BLOCK.FURNACE) {
        if (side === "top") {
          u0 = uvStep * 10 + uvInset;
          u1 = uvStep * 11 - uvInset;
        } else if (side === "bottom") {
          u0 = uvStep * 9 + uvInset;
          u1 = uvStep * 10 - uvInset;
        } else {
          // Check Furnace Manager for rotation
          const furnace = FurnaceManager.getInstance().getFurnace(
            startX + x,
            y,
            startZ + z,
          );

          let frontFace = "front"; // Default South (+Z)
          let rot = furnace ? furnace.rotation : 0;

          // Rotation: 0=North, 1=East, 2=South, 3=West
          // We want the "front" texture to appear on the face corresponding to rotation.

          // Faces: front(+z), back(-z), right(+x), left(-x)
          // Rot 0 (North/-Z): Front texture on "back" face
          // Rot 1 (East/+X): Front texture on "right" face
          // Rot 2 (South/+Z): Front texture on "front" face
          // Rot 3 (West/-X): Front texture on "left" face

          if (rot === 0) frontFace = "back";
          else if (rot === 1) frontFace = "right";
          else if (rot === 2) frontFace = "front";
          else if (rot === 3) frontFace = "left";

          if (side === frontFace) {
            u0 = uvStep * 8 + uvInset;
            u1 = uvStep * 9 - uvInset;
          } else {
            u0 = uvStep * 9 + uvInset;
            u1 = uvStep * 10 - uvInset;
          }
        }
      }

      uvs.push(u0, 0, u1, 0, u0, 1, u1, 1);

      // Colors (4 vertices per face)
      // Handle Ore/Furnace colors specifically to reset to White (texture handles color)
      if (
        type === BLOCK.COAL_ORE ||
        type === BLOCK.IRON_ORE ||
        type === BLOCK.FURNACE
      ) {
        r = 1.0;
        g = 1.0;
        b = 1.0;
      }

      for (let i = 0; i < 4; i++) colors.push(r, g, b);
    };

    // Helper to check transparency
    const isTransparent = (t: number) => {
      return t === BLOCK.AIR || t === BLOCK.LEAVES;
    };

    // Iterate
    for (let x = 0; x < this.chunkSize; x++) {
      for (let y = 0; y < this.chunkHeight; y++) {
        for (let z = 0; z < this.chunkSize; z++) {
          const index = this.getBlockIndex(x, y, z);
          const type = data[index];

          if (type === BLOCK.AIR) continue;

          // Check neighbors
          // We draw a face if the neighbor is transparent (Air or Leaves)
          // Exception: If both are leaves, do we draw?
          // Yes, for high quality foliage we usually do.
          // Or if neighbor is AIR.

          const checkNeighbor = (nx: number, ny: number, nz: number) => {
            // Calculate global coordinate
            const gx = startX + nx;
            const gz = startZ + nz;
            const gy = ny; // Y is 0..15 relative to chunk, but we only have 1 vertical chunk layer so Y is global too basically.
            // But wait, the loop uses y from 0..15. World.getHeight is different.
            // Actually, `y` passed here is local (0-15).

            // If Y is out of vertical bounds (0-15), assume transparent (sky/void)
            if (gy < 0 || gy >= this.chunkHeight) return true;

            // Determine which chunk this neighbor belongs to
            const ncx = Math.floor(gx / this.chunkSize);
            const ncz = Math.floor(gz / this.chunkSize);

            // If it's the current chunk (common case)
            if (ncx === cx && ncz === cz) {
              const index = this.getBlockIndex(nx, ny, nz);
              return isTransparent(data[index]);
            }

            // Neighbor is in another chunk
            const nKey = `${ncx},${ncz}`;
            const nData = this.chunksData.get(nKey);

            // If neighbor chunk is loaded, check its block
            if (nData) {
              // Calculate local coordinates in that chunk
              const locX = gx - ncx * this.chunkSize;
              const locZ = gz - ncz * this.chunkSize;
              const index = this.getBlockIndex(locX, gy, locZ);
              return isTransparent(nData[index]);
            }

            // If neighbor chunk is NOT loaded, we must draw the face to prevent "holes" into the void
            return true;
          };

          // Top
          if (checkNeighbor(x, y + 1, z)) addFace(x, y, z, type, "top");
          // Bottom
          if (checkNeighbor(x, y - 1, z)) addFace(x, y, z, type, "bottom");
          // Front (z+)
          if (checkNeighbor(x, y, z + 1)) addFace(x, y, z, type, "front");
          // Back (z-)
          if (checkNeighbor(x, y, z - 1)) addFace(x, y, z, type, "back");
          // Right (x+)
          if (checkNeighbor(x + 1, y, z)) addFace(x, y, z, type, "right");
          // Left (x-)
          if (checkNeighbor(x - 1, y, z)) addFace(x, y, z, type, "left");
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    const indices: number[] = [];

    // Convert quads (4 verts) to triangles (6 indices)
    const vertCount = positions.length / 3;
    for (let i = 0; i < vertCount; i += 4) {
      indices.push(i, i + 1, i + 2);
      indices.push(i + 2, i + 1, i + 3);
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere(); // Important for culling

    const material = new THREE.MeshStandardMaterial({
      map: this.noiseTexture,
      vertexColors: true,
      roughness: 0.8,
      alphaTest: 0.5,
      transparent: true, // Allows partial transparency if we wanted, but alphaTest handles cutout
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(startX, 0, startZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }
}