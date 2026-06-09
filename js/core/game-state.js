class GameState {
  constructor() {
    this._slot = 0;
    this._hero = null;
    this._heroClass = null;
    this._heroClassKey = 'warrior';
    this._monster = null;
    this._zone = GameConfig.zones[0];
    this._gold = 0;
    this._bankGold = 0;
    this._inventory = [];
    this._equipment = { weapon: null, armor: null, ring: null, amulet: null, bracelet: null };
    this._kills = {};
    this._bossKills = {};
    this._totalKills = 0;
    this._score = 0;
    this._active = false;
    this._heroName = '';
    // Combat state
    this._combatState = {
      turn: 0,
      playerStatuses: {},   // { statusId: { stacks, duration } }
      monsterStatuses: {},
      counterReady: false,  // герой готов к контратаке
      counterTurnsLeft: 0,
    };
    // XP Boost buff (Зелье Познания) — хранит timestamp окончания буста (ms)
    this._xpBoostMult   = 0;   // суммарный мультипликатор (1.0 = +100%)
    this._xpBoostExpiry = 0;   // Date.now() когда буст истекает (0 = неактивен)
  }

  get slot()        { return this._slot; }
  get hero()        { return this._hero; }
  get heroClass()   { return this._heroClass; }
  get heroClassKey(){ return this._heroClassKey; }
  get monster()     { return this._monster; }
  get zone()        { return this._zone; }
  get gold()        { return this._gold; }
  get bankGold()    { return this._bankGold; }
  get inventory()   { return this._inventory; }
  get equipment()   { return this._equipment; }
  get kills()       { return this._kills; }
  get bossKills()   { return this._bossKills; }
  get totalKills()  { return this._totalKills; }
  get score()       { return this._score; }
  get active()      { return this._active; }
  get heroName()    { return this._heroName; }
  get combatState() { return this._combatState; }

  // Helper: sum effect field across all equipment
  _eqBonus(field) {
    return Object.values(this._equipment).reduce((sum, item) => {
      if (!item) return sum;
      return sum + (item.effect?.[field] || 0);
    }, 0);
  }

  // ── Кеш боевых статов (п.4 code review) ──────────────────────────────────
  // Пересчёт дорогой: _eqBonus (reduce) + PetProgressionSystem + SlaveSystem + MercSystem.
  // Инвалидируем кеш через EventBus-события; геттеры читают кеш.
  _statsDirty = true;
  _cachedStats = {};

  invalidateStatsCache() { this._statsDirty = true; }

  _recalcStats() {
    const h = this._hero;
    const sl = typeof SlaveSystem !== 'undefined' ? SlaveSystem : null;
    const mc = typeof MercSystem  !== 'undefined' ? MercSystem  : null;
    this._cachedStats = {
      totalAtk:   Math.max(0, (h?.atk   || 0) + this._eqBonus('atk')  + Math.round(PetProgressionSystem.getMod('bonus_atk'))  + (sl ? sl.getBonus('atk')            : 0) + (mc ? mc.getPartyBonus('atk')    : 0)),
      totalDef:   Math.max(0, (h?.def   || 0) + this._eqBonus('def')  + (h?.defBuff || 0) + Math.round(PetProgressionSystem.getMod('bonus_def'))  + (sl ? sl.getBonus('def')            : 0) + (mc ? mc.getPartyBonus('def')    : 0)),
      totalCrit:  Math.max(0, (h?.crit  || 0) + this._eqBonus('crit') + PetProgressionSystem.getMod('bonus_crit')              + (sl ? sl.getBonus('crit')           : 0) + (mc ? mc.getPartyBonus('crit')   : 0)),
      totalSpd:   Math.max(1, (h?.spd   || 5) + Math.round(PetProgressionSystem.getMod('bonus_spd'))                           + (sl ? Math.round(sl.getBonus('spd')) : 0) + (mc ? Math.round(mc.getPartyBonus('spd')) : 0)),
      totalMaxHp: (h?.maxHp || 0) + this._eqBonus('hp') + Math.round(PetProgressionSystem.getMod('bonus_hp'))                  + (sl ? sl.getBonus('maxHp')          : 0) + (mc ? mc.getPartyBonus('maxHp')  : 0),
      totalMaxMp: (h?.maxMp || 0) + this._eqBonus('mp') + Math.round(PetProgressionSystem.getMod('bonus_mp'))                  + (sl ? sl.getBonus('maxMp')          : 0) + (mc ? mc.getPartyBonus('maxMp')  : 0),
    };
    this._statsDirty = false;
  }

  _getStat(key) {
    if (this._statsDirty) this._recalcStats();
    return this._cachedStats[key];
  }

  get totalAtk()   { return this._getStat('totalAtk');   }
  get totalDef()   { return this._getStat('totalDef');   }
  get totalCrit()  { return this._getStat('totalCrit');  }
  get totalSpd()   { return this._getStat('totalSpd');   }
  get totalMaxHp() { return this._getStat('totalMaxHp'); }
  get totalMaxMp() { return this._getStat('totalMaxMp'); }
  get totalDodge()   { return PetProgressionSystem.getMod('bonus_dodge'); }
  get totalCritDmgMult() { return GameConfig.combat.critMultiplier + PetProgressionSystem.getMod('bonus_critdmg'); }
  get totalHealBonus()   { return 1 + PetProgressionSystem.getMod('bonus_heal'); }
  get totalGoldBonus()   { return 1 + PetProgressionSystem.getMod('bonus_gold'); }
  get totalXpBonus()     { return (1 + PetProgressionSystem.getMod('bonus_xp')) * (1 + this.xpBoostMult); }
  get totalDropBonus()   { return 1 + PetProgressionSystem.getMod('bonus_drop'); }
  get xpBoostExpiry()    { return this._xpBoostExpiry; }
  get xpBoostMult()      { return (this._xpBoostExpiry > Date.now()) ? this._xpBoostMult : 0; }
  get xpBoostSecsLeft()  { return Math.max(0, Math.ceil((this._xpBoostExpiry - Date.now()) / 1000)); }
  get xpBoostActive()    { return this._xpBoostExpiry > Date.now(); }

  // Применить зелье XP-буста: суммирует мульт, продлевает время
  applyXpBoost(mult, secs) {
    const remaining = Math.max(0, this._xpBoostExpiry - Date.now());
    this._xpBoostMult   = this.xpBoostActive ? this._xpBoostMult + mult : mult;
    this._xpBoostExpiry = Date.now() + remaining + secs * 1000;
  }

  // Вызвать для очистки истёкшего буста
  tickXpBoost() {
    if (this._xpBoostExpiry > 0 && !this.xpBoostActive) {
      this._xpBoostMult   = 0;
      this._xpBoostExpiry = 0;
    }
  }
  get totalRareDropBonus(){ return 1 + PetProgressionSystem.getMod('bonus_raredrop'); }
  get totalShopDiscount(){ return PetProgressionSystem.getMod('bonus_shopdisc'); }
  get totalQuestReward() { return 1 + PetProgressionSystem.getMod('bonus_questreward'); }
  get totalResistStun()  { return PetProgressionSystem.getMod('resist_stun'); }
  get totalResistPoison(){ return PetProgressionSystem.getMod('resist_poison'); }
  get totalResistFear()  { return PetProgressionSystem.getMod('resist_fear'); }
  get totalBossDmgBonus(){ return 1 + PetProgressionSystem.getMod('bonus_boss'); }
  get totalDmgReduction(){ return PetProgressionSystem.getMod('bonus_dmgreduction'); }

  setSlot(v)   { this._slot = v; }
  setActive(v) { this._active = v; }

  setHero(heroData) {
    this._hero = heroData;
    this._statsDirty = true;
    EventBus.emit('hero:updated', this._hero);
  }

  setHeroClass(classKey) {
    const cfg = GameConfig.classes[classKey];
    if (!cfg) return;
    this._heroClassKey = classKey;
    this._heroClass = HeroClassFactory.create(classKey, cfg);
    EventBus.emit('heroClass:updated', this._heroClass);
  }

  setMonster(m) {
    this._monster = m;
    EventBus.emit('monster:updated', this._monster);
  }

  // ── HP-мутаторы (п.5 code review) ────────────────────────────────────────
  // Централизованные методы вместо прямых State.hero.hp = ...
  // Мутируют HP, клампируют в [0, max] и эмитят событие.

  damageHero(amount) {
    if (!this._hero) return;
    this._hero.hp = Math.max(0, this._hero.hp - amount);
    EventBus.emit('hero:updated', this._hero);
  }

  healHero(amount) {
    if (!this._hero) return;
    this._hero.hp = Math.min(this.totalMaxHp, this._hero.hp + amount);
    EventBus.emit('hero:updated', this._hero);
  }

  setHeroHp(value) {
    if (!this._hero) return;
    this._hero.hp = Math.max(0, Math.min(this.totalMaxHp, value));
    EventBus.emit('hero:updated', this._hero);
  }

  damageMonster(amount) {
    if (!this._monster) return;
    this._monster.hp = Math.max(0, this._monster.hp - amount);
    EventBus.emit('monster:updated', this._monster);
  }

  setZone(z) {
    this._zone = z;
    EventBus.emit('zone:changed', z);
  }

  addGold(amount) {
    this._gold = Math.max(0, this._gold + amount);
    EventBus.emit('gold:changed', this._gold);
  }

  setGold(v) {
    this._gold = Math.max(0, v);
    EventBus.emit('gold:changed', this._gold);
  }

  /** Суммарный капитал: карман + банк */
  get totalWealth() {
    return this._gold + (this._bankGold || 0);
  }

  /** Положить amount из кармана в банк. Возвращает фактически переведённую сумму. */
  depositToBank(amount) {
    const amt = Math.min(Math.floor(amount), this._gold);
    if (amt <= 0) return 0;
    this._gold -= amt;
    this._bankGold = (this._bankGold || 0) + amt;
    EventBus.emit('gold:changed', this._gold);
    return amt;
  }

  /** Снять amount из банка в карман. Возвращает фактически переведённую сумму. */
  withdrawFromBank(amount) {
    const amt = Math.min(Math.floor(amount), this._bankGold || 0);
    if (amt <= 0) return 0;
    this._bankGold -= amt;
    this._gold += amt;
    EventBus.emit('gold:changed', this._gold);
    return amt;
  }

  /**
   * Списать amount золота: сначала из банка, остаток — из кармана.
   * Возвращает true если средств хватило, false — если нет.
   */
  spendGold(amount) {
    if (this.totalWealth < amount) return false;
    const fromBank = Math.min(this._bankGold || 0, amount);
    this._bankGold = (this._bankGold || 0) - fromBank;
    const fromPocket = amount - fromBank;
    this._gold = Math.max(0, this._gold - fromPocket);
    EventBus.emit('gold:changed', this._gold);
    return true;
  }

  addToInventory(item) {
    this._inventory.push(item);
    EventBus.emit('inventory:changed', this._inventory);
  }

  removeFromInventory(idx) {
    const [item] = this._inventory.splice(idx, 1);
    EventBus.emit('inventory:changed', this._inventory);
    return item;
  }

  setEquipment(slot, item) {
    this._equipment[slot] = item;
    EventBus.emit('equipment:changed', this._equipment);
  }

  recordKill(monsterName) {
    this._kills[monsterName] = (this._kills[monsterName] || 0) + 1;
    this._totalKills++;
    EventBus.emit('kill:recorded', { name: monsterName, total: this._totalKills });
  }

  addScore(v) {
    this._score += v;
    EventBus.emit('score:updated', this._score);
  }

  // ── Combat state mutations ──
  resetCombatState() {
    this._combatState = {
      turn: 0,
      playerStatuses: {},
      monsterStatuses: {},
      counterReady: false,
      counterTurnsLeft: 0,
    };
    EventBus.emit('combat:stateReset');
  }

  applyStatus(target, statusId, duration) {
    const cs = this._combatState;
    const map = target === 'player' ? cs.playerStatuses : cs.monsterStatuses;
    map[statusId] = { stacks: 1, duration: duration ?? GameConfig.statuses[statusId]?.duration ?? 2 };
    EventBus.emit('combat:statusApplied', { target, id: statusId });
  }

  removeStatus(target, statusId) {
    const map = target === 'player' ? this._combatState.playerStatuses : this._combatState.monsterStatuses;
    delete map[statusId];
    EventBus.emit('combat:statusRemoved', { target, id: statusId });
  }

  tickStatuses(target) {
    const map = target === 'player' ? this._combatState.playerStatuses : this._combatState.monsterStatuses;
    const expired = [];
    for (const [id, data] of Object.entries(map)) {
      data.duration--;
      if (data.duration <= 0) expired.push(id);
    }
    expired.forEach(id => delete map[id]);
    return expired;
  }

  clearAllStatuses(target) {
    const map = target === 'player' ? this._combatState.playerStatuses : this._combatState.monsterStatuses;
    Object.keys(map).forEach(id => delete map[id]);
    EventBus.emit('combat:stateReset');
  }

  setCounterReady(val) {
    this._combatState.counterReady = val;
    this._combatState.counterTurnsLeft = val ? GameConfig.combat.counterWindow : 0;
    EventBus.emit('combat:counterChanged', val);
  }

  incrementTurn() {
    this._combatState.turn++;
    if (this._combatState.counterTurnsLeft > 0) {
      this._combatState.counterTurnsLeft--;
      if (this._combatState.counterTurnsLeft <= 0) {
        this._combatState.counterReady = false;
        EventBus.emit('combat:counterChanged', false);
      }
    }
  }

  toSave() {
    return {
      heroName: this._heroName,
      heroClass: this._heroClassKey,
      hero: { ...this._hero },
      gold: this._gold,
      bankGold: this._bankGold,
      inventory: this._inventory,
      equipment: this._equipment,
      kills: this._kills,
      bossKills: this._bossKills,
      totalKills: this._totalKills,
      score: this._score,
      zoneId: this._zone?.id || 'forest',
      xpBoostMult:   this._xpBoostMult,
      xpBoostExpiry: this._xpBoostExpiry,
      questData:    typeof QuestSystem    !== 'undefined' ? QuestSystem.toSave()    : undefined,
      guildData:    typeof GuildSystem    !== 'undefined' ? GuildSystem.toSave()    : undefined,
      mercData:     typeof MercSystem     !== 'undefined' ? MercSystem.toSave()     : undefined,
      raidData:     typeof RaidSystem     !== 'undefined' ? RaidSystem.toSave()     : undefined,
      rankingData:  typeof RankingSystem  !== 'undefined' ? RankingSystem.toSave()  : undefined,
      gatheringData:   typeof GatheringSystem    !== 'undefined' ? GatheringSystem.toSave()    : undefined,
      worldEventData:  typeof WorldEventSystem   !== 'undefined' ? WorldEventSystem.toSave()   : undefined,
    };
  }

  fromSave(d) {
    this._heroName = d.heroName;
    this.setHeroClass(d.heroClass || 'warrior');
    this._hero = { ...d.hero, defBuff: 0 };
    this._gold = d.gold || 0;
    this._bankGold = d.bankGold || 0;
    this._inventory = d.inventory || [];
    this._equipment = d.equipment || { weapon: null, armor: null, ring: null, amulet: null, bracelet: null };
    this._kills = d.kills || {};
    this._bossKills = d.bossKills || {};
    this._totalKills = d.totalKills || 0;
    this._score = d.score || 0;
    this._xpBoostMult   = d.xpBoostMult   || 0;
    this._xpBoostExpiry = d.xpBoostExpiry || 0;
    const savedZone = GameConfig.zones.find(z => z.id === (d.zoneId || 'forest')) || GameConfig.zones[0];
    this._zone = savedZone;
    if (d.questData    && typeof QuestSystem    !== 'undefined') QuestSystem.fromSave(d.questData);
    if (d.guildData    && typeof GuildSystem    !== 'undefined') GuildSystem.fromSave(d.guildData);
    if (d.mercData     && typeof MercSystem     !== 'undefined') MercSystem.fromSave(d.mercData);
    if (d.raidData     && typeof RaidSystem     !== 'undefined') RaidSystem.fromSave(d.raidData);
    if (d.rankingData  && typeof RankingSystem  !== 'undefined') RankingSystem.fromSave(d.rankingData);
    if (d.gatheringData  && typeof GatheringSystem   !== 'undefined') GatheringSystem.fromSave(d.gatheringData);
    if (d.worldEventData && typeof WorldEventSystem  !== 'undefined') WorldEventSystem.fromSave(d.worldEventData);
  }
}

const State = new GameState();
const SaveRegistry = (() => {
  const _modules = [];

  function register(name, { toSave, fromSave }) {
    _modules.push({ name, toSave, fromSave });
  }

  function collectAll() {
    const out = {};
    _modules.forEach(m => { out[m.name] = m.toSave(); });
    return out;
  }

  function restoreAll(d) {
    if (!d) return;
    _modules.forEach(m => {
      if (d[m.name] !== undefined) m.fromSave(d[m.name]);
    });
  }

  return { register, collectAll, restoreAll };
})();
// Интегрируем SaveRegistry в State.toSave / fromSave ──────────────────────
// Все последующие monkey-патчи заменяются на SaveRegistry.register().
// Существующий State.toSave собирает «ядро»; SaveRegistry добавляет модули.
(() => {
  const _coreTo   = State.toSave.bind(State);
  const _coreFrom = State.fromSave.bind(State);

  State.toSave = function() {
    return { ..._coreTo(), ...SaveRegistry.collectAll() };
  };

  State.fromSave = function(d) {
    _coreFrom(d);
    SaveRegistry.restoreAll(d);
  };
})();
