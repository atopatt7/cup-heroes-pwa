// Game.js — 場景協調器（章節系統版本）
import { HomeScene }       from './scenes/HomeScene.js'
import { HeroSelectScene } from './scenes/HeroSelectScene.js'
import { BattleScene }     from './scenes/BattleScene.js'
import { CupGameScene }    from './scenes/CupGameScene.js'
import { UpgradeScene }    from './scenes/UpgradeScene.js'
import { GameOverScene }   from './scenes/GameOverScene.js'
import { VictoryScene }    from './scenes/VictoryScene.js'
import { SaveManager }     from './game/SaveManager.js'
import { SpriteManager }   from './game/SpriteManager.js'
import { CHAPTERS }        from './data/chapters.js'
import { getHero }         from './data/heroes.js'

const TOTAL_CHAPTERS = CHAPTERS.length

export class Game {
  constructor(canvas, ctx) {
    this.canvas  = canvas
    this.ctx     = ctx
    this.current = null
  }

  start() {
    this._registerServiceWorker()
    SpriteManager.preloadAll()
    this.showHome()
  }

  showHome() {
    this._switch(new HomeScene(
      this.canvas, this.ctx,
      {
        onStartBattle: (chapterIdx, waveIdx, heroId) => {
          const hero = getHero(heroId)
          const gameState = { chapterIdx, waveIdx, hero, score: 0, gold: 0 }
          this.startBattle(gameState)
        },
        onHeroSelect: () => {
          this.showHeroSelect((heroId) => {
            SaveManager.setSelectedHero(heroId)
            this.showHome()
          })
        },
      }
    ))
  }

  showHeroSelect(onDone) {
    const callback = onDone || ((heroId) => {
      const hero = getHero(heroId)
      const gameState = { chapterIdx: 0, waveIdx: 0, hero, score: 0, gold: 0 }
      this.startBattle(gameState)
    })
    this._switch(new HeroSelectScene(this.canvas, this.ctx, callback))
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
    SaveManager.updateBestWave(gameState.chapterIdx * 15 + (gameState.waveIdx || 0))
    this._switch(new GameOverScene(
      this.canvas, this.ctx, gameState,
      () => this.showHome()
    ))
  }

  showVictory(gameState) {
    SaveManager.updateBestWave(TOTAL_CHAPTERS * 4)
    SaveManager.unlockHero('rogue')
    SaveManager.unlockHero('barbarian')
    SaveManager.unlockHero('druid')
    this._switch(new VictoryScene(
      this.canvas, this.ctx, gameState,
      () => this.showHome()
    ))
  }

  _onBattleVictory(gameState) {
    // 每場戰鬥後進入球台
    this.startCupGame(gameState)
  }

  _advanceWave(gameState) {
    const chapter  = CHAPTERS[gameState.chapterIdx]
    const nextWave = gameState.waveIdx + 1

    if (nextWave >= chapter.waves.length) {
      // ── 章節通關 ───────────────────────────────────────────
      const clearedChapter = gameState.chapterIdx
      const nextChapter    = clearedChapter + 1

      // 解鎖英雄（依章節）
      if (clearedChapter === 0) SaveManager.unlockHero('rogue')
      if (clearedChapter === 1) SaveManager.unlockHero('barbarian')
      if (clearedChapter === 2) SaveManager.unlockHero('druid')

      if (nextChapter >= TOTAL_CHAPTERS) {
        // 全部 3 章全通關 → 勝利畫面
        SaveManager.updateBestWave(TOTAL_CHAPTERS * 15)
        this.showVictory(gameState)
      } else {
        // 解鎖下一章，回到首頁讓玩家選章節
        SaveManager.unlockChapter(nextChapter)
        this.showHome()
      }
    } else {
      // ── 同章下一波 ─────────────────────────────────────────
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
          .then(() => console.log('[SW] registered'))
          .catch((err) => console.warn('[SW] registration failed:', err))
      })
    }
  }
}
