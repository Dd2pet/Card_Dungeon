const GameConfig = Object.freeze({
  save: { version: 8, keyPrefix: 'cd2_slot_', maxSlots: 3 },
  combat: {
    dmgVariance: 7,
    dmgVarOffset: 3,
    defCoeff: 0.55,
    critMultiplier: 2.1,
    mpRegenPerTurn: 3,
    monsterTurnDelay: 700,
    fleeMinChance: 0.15,
    fleeMaxChance: 0.85,
    counterWindow: 1,
    counterMultiplier: 1.8,
    poisonDamageRatio: 0.06,
    statusApplyChance: 0.28,
  },
  progression: {
    xpNeededBase: 100,
    xpScaleFactor: 1.45,
    levelHpGain: 20,
    levelMpGain: 10,
    levelAtkGain: 3,
    levelDefGain: 2,
    levelSpdGain: 0,
    levelCritGain: 0.002,
    monsterScalePerLevel: 0.12,
    deathGoldPenalty: 0.7,
    respawnHpFraction: 0.5,
  },
  // ── делегация в суб-конфиги (обратная совместимость) ──
  zones:          ZoneConfig.zones,
  monsters:       ZoneConfig.monsters,
  zoneBosses:     ZoneConfig.zoneBosses,
  rarities:       ItemConfig.rarities,
  itemTemplates:  ItemConfig.itemTemplates,
  cursedItems:    ItemConfig.cursedItems,
  shopCatalog:    ItemConfig.shopCatalog,
  shopItems:      ItemConfig.shopItems,
  lootTable:      ItemConfig.lootTable,
  classes:        ClassConfig.classes,
  statuses:       ClassConfig.statuses,
});

// ════════════════════════════════════════════════════════════
// ITEM FACTORY — data-driven создание предметов с rarity
// ════════════════════════════════════════════════════════════
