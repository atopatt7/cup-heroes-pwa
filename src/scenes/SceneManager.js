import { HeroManager } from '../game/HeroManager.js'
import { TitleScene } from './TitleScene.js'
import { BattleScene } from './BattleScene.js'
import { CupGameScene } from './CupGameScene.js'
import { UpgradeScene } from './UpgradeScene.js'
import { GameOverScene } from './GameOverScene.js'
import { VictoryScene } from './VictoryScene.js'

/**
 * SceneManager
 * 負責管理所有遊戲場景的切換與更新
 *
 * 場景列表：
 *  - 'title'    標題畫面
 *  - 'battle'   回合制戰鬥
 *  - 'cupgame'  杯球彈珠台
 *  - 'upgrade'  升級卡選擇
 *  - 'gameover' 遊戲結束
 *  - 'victory'  勝利畫面
 */
export class SceneManager {
  constructor(canvas, ctx) {
    this.canvas = canvas
    this.ctx = ctx
    this.currentScene = null
    this.scenes = {}
    this.running = false
    this.lastTime = 0
  }

  /** 註冊場景 */
  register(name, scene) {
    this.scenes[name] = scene
  }

  /** 切換場景 */
  switchTo(name, data = {}) {
    if (this.currentScene?.onExit) {
      this.currentScene.onExit()
    }
    this.currentScene = this.scenes[name]
    if (!this.currentScene) {
      console.error(`[SceneManager] 找不到場景: ${name}`)
      return
    }
    if (this.currentScene.onEnter) {
      this.currentScene.onEnter(data)
    }
    console.log(`[SceneManager] 切換到場景: ${name}`)
  }

  /** 啟動遊戲迴圈 */
  start() {
    this._loadScenes()
    this.switchTo('title')
    this.running = true
    requestAnimationFrame((t) => this._loop(t))
  }

  /** 建立新的遊戲狀態 */
  createGameState() {
    const heroManager = new HeroManager()
    return {
      heroManager,
      wave: 1,
      resource: 0,
    }
  }

  /** 遊戲主迴圈 */
  _loop(timestamp) {
    if (!this.running) return

    const delta = Math.min((timestamp - this.lastTime) / 1000, 0.05)
    this.lastTime = timestamp

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    if (this.currentScene) {
      this.currentScene.update(delta)
      this.currentScene.draw(this.ctx)
    }

    requestAnimationFrame((t) => this._loop(t))
  }

  /** 載入所有場景 */
  _loadScenes() {
    this.register('title',   new TitleScene(this))
    this.register('battle',  new BattleScene(this))
    this.register('cupgame', new CupGameScene(this))
    this.register('upgrade', new UpgradeScene(this))
    this.register('gameover',new GameOverScene(this))
    this.register('victory', new VictoryScene(this))
  }
}
