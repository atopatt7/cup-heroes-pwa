// Game.js — 場景協調器（章節系統版本）
// 遊戲流程：
//   TitleScene → HeroSelectScene
//   → BattleScene (wave) → UpgradeScene (選卡)
//   → [每章結尾] → CupGameScene (球台)
//   → 下一波 or 章節完成 or 遊戲勝利

import { TitleScene }      from './scenes/TitleScene.js'
import { HeroSelectScene } from './scenes/HeroSelectScene.js'
import { BattleScene }     from './scenes/BattleScene.js'
import { CupGameScene }    from './scenes/CupGameScene.js'
import { UpgradeScene }    from './scenes/UpgradeScene.js'
import { GameOverScene }   from './scenes/GameOverScene.js'
import { VictoryScene }    from './scenes/VictoryScene.js'
import { SaveManager }     from './game/SaveManager.js'
import { CHAPTERS }        from './data/chapters.js'
import { getHero }         from './data/heroes.js'

const TOTAL_CHAPTERS = CHAPTERS.length   // 3

export class Game {
  constructor(canvas, ctx) {
    this.canvas  = canvas
    this.ctx     = ctx
    this.current = null
  }

  start() {
    this._registerServiceWorker()
    this.showTitle()
  }

  // ── 場景切換 ────────────────────────────────────────────

  showTitle() {
    this._switch(new TitleScene(
      this.canvas, this.ctx,
      () => this.showHeroSelect()
    ))
  }

  showHeroSelect() {
    this._switch(new HeroSelectScene(
      this.canvas, this.ctx,
      (heroId) => {
        const hero = getHero(heroId)
        const gameState = {
          chapterIdx: 0,
          waveIdx:    0,
          hero,
          score:      0,
          gold:       0,
        }
        this.startBattle(gameState)
      }
    ))
  }

  startBattle(gameState) {
    this._switch(new BattleScene(
      this.canvas, this.ctx, gameState,
      () => this._onBattleVictory(gameState),
      () => this.showGameOver(gameState)
    ))
  }

  startCupGame(gameState) {
    this._switch(new CupGameScene(
      this.canvas, this.ctx, gameState,
      (totalScore) => {
        gameState.score = (gameState.score || 0) + totalScore
        this.showUpgrade(gameState, totalScore)
      }
    ))
  }

  showUpgrade(gameState, totalScore) {
    this._switch(new UpgradeScene(
      this.canvas, this.ctx, gameState, totalScore,
      () => this._advanceWave(gameState)
    ))
  }

  showGameOver(gameState) {
    SaveManager.updateBestWave(
      gameState.chapterIdx * 4 + (gameState.waveIdx || 0)
    )
    this._switch(new GameOverScene(
      this.canvas, this.ctx, gameState,
      () => this.showTitle()
    ))
  }

  showVictory(gameState) {
    SaveManager.updateBestWave(TOTAL_CHAPTERS * 4)
    SaveManager.unlockHero('rogue')
    SaveManager.unlockHero('barbarian')
    SaveManager.unlockHero('druid')
    this._switch(new VictoryScene(
      this.canvas, this.ctx, gameState,
      () => this.showTitle()
    ))
  }

  // ── 內部邏輯 ────────────────────────────────────────────

  _onBattleVictory(gameState) {
    // 每場戰鬥結束後都進入球台，球台結束後再選卡
    this.startCupGame(gameState)
  }

  _advanceWave(gameState) {
    const chapter   = CHAPTERS[gameState.chapterIdx]
    const nextWave  = gameState.waveIdx + 1

    if (nextWave >= chapter.waves.length) {
      // 章節結束
      const nextChapter = gameState.chapterIdx + 1
      if (nextChapter >= TOTAL_CHAPTERS) {
        // 全部通關！
        this.showVictory(gameState)
      } else {
        // 進入下一章
        gameState.chapterIdx = nextChapter
        gameState.waveIdx    = 0
        // 解鎖英雄
        if (nextChapter === 1) SaveManager.unlockHero('rogue')
        if (nextChapter === 2) SaveManager.unlockHero('barbarian')
        if (nextChapter === 3) SaveManager.unlockHero('druid')
        this.startBattle(gameState)
      }
    } else {
      // 同章下一波
      gameState.waveIdx = nextWave
      this.startBattle(gameState)
    }
  }

  _switch(scene) {
    if (this.current?.stop)    this.current.stop()
    if (this.current?.destroy) this.current.destroy()
    this.current = scene
    this.current.start()
  }

  _registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/cup-heroes-pwa/service-worker.js')
          .then(() => console.log('[SW] 已註冊'))
          .catch((err) => console.warn('[SW] 註冊失敗:', err))
      })
    }
  }
}
