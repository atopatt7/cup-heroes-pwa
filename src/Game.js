// Game.js — 場景協調器（章節系統版本）
import { HomeScene }       from './scenes/HomeScene.js'
import { HeroSelectScene } from './scenes/HeroSelectScene.js'
import { BattleScene }     from './scenes/BattleScene.js'
import { CupGameScene }    from './scenes/CupGameScene.js'
import { UpgradeScene }    from './scenes/UpgradeScene.js'
import { GameOverScene }   from './scenes/GameOverScene.js'
import { VictoryScene }    from './scenes/VictoryScene.js'
import { EquipmentScene }  from './scenes/EquipmentScene.js'
import { SaveManager }     from './game/SaveManager.js'
import { SpriteManager }   from './game/SpriteManager.js'
import { CHAPTERS, getChapterReward } from './data/chapters.js'
import { getHero }                    from './data/heroes.js'
import { defaultEquipmentSave, getEquipmentStats, getActiveSetBonuses } from './game/EquipmentManager.js'

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
          const hero      = getHero(heroId)
          const cardStars = {}
          for (const id of (hero.startingCards || [])) cardStars[id] = 1

          // 讀取裝備存檔，計算屬性加成與套裝技能
          const save         = SaveManager.load()
          const equipSave    = save.equipment || defaultEquipmentSave()
          const equipStats   = getEquipmentStats(equipSave)
          const activeBonuses = getActiveSetBonuses(equipSave)

          const gameState = { chapterIdx, waveIdx, hero, score: 0, gold: 0, balls: 0, cardPurchases: {}, cardStars, equipStats, activeBonuses }
          this.startBattle(gameState)
        },
        onHeroSelect: () => {
          this.showHeroSelect((heroId) => {
            SaveManager.setSelectedHero(heroId)
            this.showHome()
          })
        },
        onEquipment: () => {
          this.showEquipment()
        },
      }
    ))
  }

  showHeroSelect(onDone) {
    const callback = onDone || ((heroId) => {
      const hero = getHero(heroId)
      const cardStars = {}
      for (const id of (hero.startingCards || [])) cardStars[id] = 1
      const gameState = { chapterIdx: 0, waveIdx: 0, hero, score: 0, gold: 0, balls: 0, cardPurchases: {}, cardStars }
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
        gameState.balls = (gameState.balls || 0) + totalScore  // 累積球數當作購牌預算
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

  showEquipment() {
    // 取目前選定的英雄作為展示用
    const save   = SaveManager.load()
    const heroId = save.selectedHeroId || 'knight'
    const hero   = getHero(heroId)
    const gameState = { hero }
    this._switch(new EquipmentScene(
      this.canvas, this.ctx, gameState,
      () => this.showHome()
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
    SaveManager.updateBestWave(TOTAL_CHAPTERS * 15)
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

      // 套用章節通關獎勵（從章節資料讀取，不寫死在這裡）
      this._applyChapterReward(clearedChapter, gameState)

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

  // 讀章節 clearReward，自動套用所有獎勵
  _applyChapterReward(chapterIdx, gameState) {
    const reward = getChapterReward(chapterIdx)
    if (!reward) return

    // 解鎖英雄
    if (reward.unlockHero) SaveManager.unlockHero(reward.unlockHero)

    // 金幣
    if (reward.gold) {
      gameState.gold = (gameState.gold || 0) + reward.gold
      SaveManager.addGold(reward.gold)
    }

    // 解鎖獎勵卡牌（加入本局牌池，讓 UpgradeScene 可以抽到）
    if (reward.cards && reward.cards.length > 0) {
      gameState.rewardCards = (gameState.rewardCards || []).concat(reward.cards)
    }

    // 成就稱號（存檔）
    if (reward.title) SaveManager.unlockTitle(reward.title)
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
