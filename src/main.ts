import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

// Bootstrap the Phaser game
const game = new Phaser.Game(gameConfig);

// Export for potential embedding in SPA contexts
export default game;
