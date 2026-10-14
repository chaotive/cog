import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  public create(): void {
    this.createProceduralTextures();
    this.scene.start('TitleScene');
  }

  private createProceduralTextures(): void {
    const tileSize = 32;

    // 1. Terrain: Deep Ocean
    this.createTileTexture('tile_DEEP_OCEAN', tileSize, (ctx) => {
      ctx.fillStyle = '#0f2d4a';
      ctx.fillRect(0, 0, tileSize, tileSize);
      // Wave crests
      ctx.fillStyle = '#163e63';
      ctx.fillRect(4, 6, 8, 2);
      ctx.fillRect(18, 18, 10, 2);
      ctx.fillRect(8, 26, 6, 2);
    });

    // 2. Terrain: Shallow Ocean
    this.createTileTexture('tile_SHALLOW_OCEAN', tileSize, (ctx) => {
      ctx.fillStyle = '#1b557a';
      ctx.fillRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#2774a3';
      ctx.fillRect(6, 8, 12, 2);
      ctx.fillRect(14, 20, 14, 2);
      ctx.fillStyle = '#489ad4';
      ctx.fillRect(8, 9, 4, 1);
    });

    // 3. Terrain: Coast / Beach
    this.createTileTexture('tile_COAST', tileSize, (ctx) => {
      ctx.fillStyle = '#d9c58b';
      ctx.fillRect(0, 0, tileSize, tileSize);
      // Small sand specks
      ctx.fillStyle = '#bda568';
      ctx.fillRect(4, 6, 2, 2);
      ctx.fillRect(20, 12, 2, 2);
      ctx.fillRect(12, 24, 2, 2);
      ctx.fillRect(26, 22, 2, 2);
      // Shell
      ctx.fillStyle = '#f0e6d2';
      ctx.fillRect(16, 16, 2, 2);
    });

    // 4. Terrain: Plains / Grassland
    this.createTileTexture('tile_PLAINS', tileSize, (ctx) => {
      ctx.fillStyle = '#5e8c31';
      ctx.fillRect(0, 0, tileSize, tileSize);
      // Grass blades
      ctx.fillStyle = '#73a83d';
      ctx.fillRect(6, 10, 2, 4);
      ctx.fillRect(8, 8, 2, 6);
      ctx.fillRect(20, 18, 2, 5);
      ctx.fillRect(22, 16, 2, 7);
      ctx.fillRect(14, 24, 2, 4);
    });

    // 5. Terrain: Forest
    this.createTileTexture('tile_FOREST', tileSize, (ctx) => {
      ctx.fillStyle = '#3a6b2d';
      ctx.fillRect(0, 0, tileSize, tileSize);
      // Tree 1
      ctx.fillStyle = '#5c4033';
      ctx.fillRect(8, 18, 4, 8);
      ctx.fillStyle = '#1f4e1b';
      ctx.beginPath();
      ctx.arc(10, 14, 8, 0, Math.PI * 2);
      ctx.fill();
      // Tree 2
      ctx.fillStyle = '#5c4033';
      ctx.fillRect(20, 20, 4, 8);
      ctx.fillStyle = '#265c22';
      ctx.beginPath();
      ctx.arc(22, 15, 9, 0, Math.PI * 2);
      ctx.fill();
    });

    // 6. Terrain: Jungle
    this.createTileTexture('tile_JUNGLE', tileSize, (ctx) => {
      ctx.fillStyle = '#18471e';
      ctx.fillRect(0, 0, tileSize, tileSize);
      // Exotic palm leaves / thick canopy
      ctx.fillStyle = '#0f3114';
      ctx.fillRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#2d7a36';
      ctx.beginPath();
      ctx.arc(16, 16, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#429e4d';
      ctx.beginPath();
      ctx.arc(16, 16, 7, 0, Math.PI * 2);
      ctx.fill();
      // Jungle flowers
      ctx.fillStyle = '#e63946';
      ctx.fillRect(10, 12, 3, 3);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(22, 20, 3, 3);
    });

    // 7. Terrain: Hills
    this.createTileTexture('tile_HILLS', tileSize, (ctx) => {
      ctx.fillStyle = '#6b8036';
      ctx.fillRect(0, 0, tileSize, tileSize);
      // Hill mound
      ctx.fillStyle = '#8a7747';
      ctx.beginPath();
      ctx.arc(16, 32, 16, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#a18d5b';
      ctx.beginPath();
      ctx.arc(16, 32, 12, Math.PI, 0);
      ctx.fill();
    });

    // 8. Terrain: Mountains
    this.createTileTexture('tile_MOUNTAINS', tileSize, (ctx) => {
      ctx.fillStyle = '#4a443d';
      ctx.fillRect(0, 0, tileSize, tileSize);
      // Mountain triangle
      ctx.fillStyle = '#6b645b';
      ctx.beginPath();
      ctx.moveTo(16, 4);
      ctx.lineTo(2, 30);
      ctx.lineTo(30, 30);
      ctx.closePath();
      ctx.fill();
      // Mountain shadow
      ctx.fillStyle = '#3a342e';
      ctx.beginPath();
      ctx.moveTo(16, 4);
      ctx.lineTo(30, 30);
      ctx.lineTo(16, 30);
      ctx.closePath();
      ctx.fill();
      // Snow cap
      ctx.fillStyle = '#f8f9fa';
      ctx.beginPath();
      ctx.moveTo(16, 4);
      ctx.lineTo(11, 14);
      ctx.lineTo(21, 14);
      ctx.closePath();
      ctx.fill();
    });

    // 9. Terrain: Swamp
    this.createTileTexture('tile_SWAMP', tileSize, (ctx) => {
      ctx.fillStyle = '#3e4a2d';
      ctx.fillRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#26331a';
      ctx.fillRect(4, 10, 12, 6);
      ctx.fillRect(16, 18, 12, 8);
      // Marsh reeds
      ctx.fillStyle = '#7a8244';
      ctx.fillRect(6, 6, 2, 10);
      ctx.fillRect(20, 14, 2, 8);
    });

    // 10. Terrain: River
    this.createTileTexture('tile_RIVER', tileSize, (ctx) => {
      ctx.fillStyle = '#4c7a2b';
      ctx.fillRect(0, 0, tileSize, tileSize);
      // Water body
      ctx.fillStyle = '#3282b8';
      ctx.fillRect(0, 8, tileSize, 16);
      ctx.fillStyle = '#489ad4';
      ctx.fillRect(4, 12, 10, 3);
      ctx.fillRect(18, 16, 10, 3);
    });

    // 11. Fog textures
    this.createTileTexture('fog_hidden', tileSize, (ctx) => {
      ctx.fillStyle = '#0a0908';
      ctx.fillRect(0, 0, tileSize, tileSize);
      // Parchment uncharted crosshatching
      ctx.strokeStyle = '#181512';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(tileSize, tileSize);
      ctx.moveTo(tileSize, 0);
      ctx.lineTo(0, tileSize);
      ctx.stroke();
    });

    this.createTileTexture('fog_explored', tileSize, (ctx) => {
      ctx.fillStyle = 'rgba(10, 9, 8, 0.65)';
      ctx.fillRect(0, 0, tileSize, tileSize);
    });

    // 12. Player Party Sprite
    this.createTileTexture('sprite_player', tileSize, (ctx) => {
      // Captain Body
      ctx.fillStyle = '#1e3d59'; // Blue tunic
      ctx.fillRect(10, 14, 12, 12);
      // Steel Morion Helmet
      ctx.fillStyle = '#c0c0c0';
      ctx.beginPath();
      ctx.arc(16, 10, 6, 0, Math.PI * 2);
      ctx.fill();
      // Helmet crest
      ctx.fillStyle = '#d62828';
      ctx.fillRect(14, 2, 4, 5);
      // Face
      ctx.fillStyle = '#ffcc99';
      ctx.fillRect(13, 9, 6, 4);
      // Golden Sword
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(22, 12, 3, 14);
      ctx.fillRect(20, 18, 7, 2);
      // Royal Flag
      ctx.fillStyle = '#f77f00';
      ctx.fillRect(5, 4, 8, 6);
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(4, 4, 2, 22);
    });

    // 13. Ship Sprite
    this.createTileTexture('sprite_ship', tileSize, (ctx) => {
      // Hull
      ctx.fillStyle = '#8b4513';
      ctx.beginPath();
      ctx.moveTo(4, 20);
      ctx.lineTo(28, 20);
      ctx.lineTo(24, 28);
      ctx.lineTo(8, 28);
      ctx.closePath();
      ctx.fill();
      // Masts
      ctx.fillStyle = '#5c2c16';
      ctx.fillRect(11, 6, 2, 16);
      ctx.fillRect(21, 8, 2, 14);
      // White Sails
      ctx.fillStyle = '#f4f1de';
      ctx.fillRect(7, 8, 10, 8);
      ctx.fillRect(17, 10, 10, 7);
      // Red Cross on Main Sail
      ctx.fillStyle = '#b7094c';
      ctx.fillRect(11, 8, 2, 8);
      ctx.fillRect(8, 11, 8, 2);
    });

    // 14. Enemy: Jaguar
    this.createTileTexture('enemy_JAGUAR', tileSize, (ctx) => {
      ctx.fillStyle = '#f4a261'; // Tawny coat
      ctx.beginPath();
      ctx.ellipse(16, 18, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.arc(24, 14, 5, 0, Math.PI * 2);
      ctx.fill();
      // Ears
      ctx.fillRect(24, 8, 2, 3);
      ctx.fillRect(27, 9, 2, 3);
      // Rosettes / Spots
      ctx.fillStyle = '#4a2810';
      ctx.fillRect(12, 16, 2, 2);
      ctx.fillRect(16, 15, 2, 2);
      ctx.fillRect(18, 19, 2, 2);
      ctx.fillRect(25, 13, 2, 2);
      // Tail
      ctx.strokeStyle = '#f4a261';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(6, 18);
      ctx.quadraticCurveTo(2, 12, 4, 8);
      ctx.stroke();
    });

    // 15. Enemy: Alligator
    this.createTileTexture('enemy_ALLIGATOR', tileSize, (ctx) => {
      ctx.fillStyle = '#2b472b'; // Dark moss green
      ctx.beginPath();
      ctx.ellipse(16, 16, 13, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Snout
      ctx.fillRect(26, 14, 5, 4);
      // Ridge scales
      ctx.fillStyle = '#1b301b';
      ctx.fillRect(8, 12, 3, 2);
      ctx.fillRect(13, 11, 3, 2);
      ctx.fillRect(18, 12, 3, 2);
      // Yellow eye
      ctx.fillStyle = '#ffe600';
      ctx.fillRect(24, 13, 2, 2);
    });

    // 16. Enemy: Hostile Patrol
    this.createTileTexture('enemy_HOSTILE_PATROL', tileSize, (ctx) => {
      ctx.fillStyle = '#a63a24';
      ctx.fillRect(12, 14, 8, 10);
      // Head with feather headdress
      ctx.fillStyle = '#d4804d';
      ctx.beginPath();
      ctx.arc(16, 10, 5, 0, Math.PI * 2);
      ctx.fill();
      // Feathers
      ctx.fillStyle = '#e63946';
      ctx.fillRect(14, 2, 2, 5);
      ctx.fillStyle = '#ffbe0b';
      ctx.fillRect(17, 3, 2, 4);
      // Spear
      ctx.fillStyle = '#3a5a40';
      ctx.fillRect(22, 4, 2, 22);
      ctx.fillStyle = '#silver';
      ctx.beginPath();
      ctx.moveTo(23, 1);
      ctx.lineTo(21, 5);
      ctx.lineTo(25, 5);
      ctx.closePath();
      ctx.fill();
    });

    // 17. Enemy: Rival Conquistador
    this.createTileTexture('enemy_RIVAL_CONQUISTADOR', tileSize, (ctx) => {
      ctx.fillStyle = '#3f1651'; // Purple livery
      ctx.fillRect(10, 14, 12, 12);
      // Black helmet
      ctx.fillStyle = '#2b2d42';
      ctx.beginPath();
      ctx.arc(16, 10, 6, 0, Math.PI * 2);
      ctx.fill();
      // Black cross
      ctx.fillStyle = '#d90429';
      ctx.fillRect(15, 15, 2, 8);
      ctx.fillRect(13, 17, 6, 2);
      // Halberd
      ctx.fillStyle = '#8d99ae';
      ctx.fillRect(6, 4, 2, 22);
      ctx.fillRect(4, 4, 6, 4);
    });

    // 18. Landmark: Ship Anchor
    this.createTileTexture('landmark_SHIP_ANCHOR', tileSize, (ctx) => {
      ctx.fillStyle = '#deb887';
      ctx.fillRect(4, 4, 24, 24);
      // Anchor drawing
      ctx.strokeStyle = '#2b1d0c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(16, 10, 4, 0, Math.PI * 2);
      ctx.moveTo(16, 14);
      ctx.lineTo(16, 26);
      ctx.moveTo(10, 18);
      ctx.lineTo(22, 18);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(16, 22, 7, 0, Math.PI);
      ctx.stroke();
    });

    // 19. Landmark: Native Village
    this.createTileTexture('landmark_NATIVE_VILLAGE', tileSize, (ctx) => {
      // Hut 1
      ctx.fillStyle = '#b07d4f';
      ctx.beginPath();
      ctx.arc(12, 20, 7, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#4a2810';
      ctx.fillRect(10, 16, 4, 5);
      // Hut 2
      ctx.fillStyle = '#9c663b';
      ctx.beginPath();
      ctx.arc(22, 16, 6, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#4a2810';
      ctx.fillRect(20, 13, 3, 4);
      // Campfire
      ctx.fillStyle = '#e63946';
      ctx.fillRect(15, 22, 3, 3);
      ctx.fillStyle = '#ffbe0b';
      ctx.fillRect(16, 21, 2, 2);
    });

    // 20. Landmark: Ancient Ruins
    this.createTileTexture('landmark_ANCIENT_RUINS', tileSize, (ctx) => {
      ctx.fillStyle = '#6c757d';
      // Stone pillar 1
      ctx.fillRect(6, 8, 6, 18);
      // Stone pillar 2
      ctx.fillRect(20, 10, 6, 16);
      // Overhanging lintel stone
      ctx.fillRect(4, 6, 24, 4);
      // Moss overlay
      ctx.fillStyle = '#2d6a4f';
      ctx.fillRect(6, 10, 3, 4);
      ctx.fillRect(22, 18, 4, 3);
      // Carved glyph in gold
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(14, 14, 4, 4);
    });

    // 21. Landmark: Golden Temple
    this.createTileTexture('landmark_GOLDEN_TEMPLE', tileSize, (ctx) => {
      // Stepped pyramid
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(4, 22, 24, 7);
      ctx.fillStyle = '#e5c158';
      ctx.fillRect(7, 16, 18, 6);
      ctx.fillStyle = '#f3d57d';
      ctx.fillRect(10, 10, 12, 6);
      // Apex shrine
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(13, 6, 6, 4);
      // Sun Idol
      ctx.fillStyle = '#ff4500';
      ctx.fillRect(15, 7, 2, 2);
    });

    // 22. Landmark: City of Gold (El Dorado!)
    this.createTileTexture('landmark_CITY_OF_GOLD', tileSize, (ctx) => {
      // Magnificent golden palace with towers
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(4, 14, 24, 14);
      // Towers
      ctx.fillStyle = '#ffb703';
      ctx.fillRect(4, 6, 6, 10);
      ctx.fillRect(22, 6, 6, 10);
      // Spires
      ctx.fillStyle = '#fb8500';
      ctx.beginPath();
      ctx.moveTo(7, 1);
      ctx.lineTo(4, 6);
      ctx.lineTo(10, 6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(25, 1);
      ctx.lineTo(22, 6);
      ctx.lineTo(28, 6);
      ctx.closePath();
      ctx.fill();
      // Great golden dome
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.arc(16, 12, 7, Math.PI, 0);
      ctx.fill();
      // Royal emerald gate
      ctx.fillStyle = '#06d6a0';
      ctx.fillRect(13, 18, 6, 10);
    });

    // 23. Landmark: Fresh Spring
    this.createTileTexture('landmark_FRESH_SPRING', tileSize, (ctx) => {
      ctx.fillStyle = '#52b788';
      ctx.fillRect(0, 0, tileSize, tileSize);
      // Crystal clear pond
      ctx.fillStyle = '#00b4d8';
      ctx.beginPath();
      ctx.arc(16, 16, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#90e0ef';
      ctx.beginPath();
      ctx.arc(16, 16, 6, 0, Math.PI * 2);
      ctx.fill();
      // Water bubbles
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(14, 14, 2, 2);
    });

    // 24. UI Selection Cursor
    this.createTileTexture('selection_cursor', tileSize, (ctx) => {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, tileSize - 2, tileSize - 2);
    });
  }

  private createTileTexture(key: string, size: number, drawFn: (ctx: CanvasRenderingContext2D) => void): void {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawFn(ctx);
      this.textures.addCanvas(key, canvas);
    }
  }
}
