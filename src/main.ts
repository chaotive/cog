import Phaser from 'phaser';
import { BootScene } from './cog/scenes/BootScene';
import { TitleScene } from './cog/scenes/TitleScene';
import { OutfittingScene } from './cog/scenes/OutfittingScene';
import { SeaVoyageScene } from './cog/scenes/SeaVoyageScene';
import { ExplorationScene } from './cog/scenes/ExplorationScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 960,
  height: 640,
  backgroundColor: '#12100e',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, OutfittingScene, SeaVoyageScene, ExplorationScene],
};

window.addEventListener('DOMContentLoaded', () => {
  new Phaser.Game(config);
});
