import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { TitleScene } from './scenes/TitleScene'
import { GameScene } from './scenes/GameScene'
import { OverworldScene } from './scenes/OverworldScene'
import { BattleScene } from './scenes/BattleScene'

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#030806',
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  scene: [BootScene, TitleScene, GameScene, OverworldScene, BattleScene],
}
