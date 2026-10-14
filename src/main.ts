import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from './cog/config';
import { LoadoutScene } from './cog/scenes/LoadoutScene';
import { MapScene } from './cog/scenes/MapScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#05080f',
  pixelArt: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [LoadoutScene, MapScene]
});
