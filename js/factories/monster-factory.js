const MonsterFactory = (() => {
  function _rollRarity() {
    const entries = Object.entries(MonsterRarityConfig.rarities);
    const total   = entries.reduce((s, [, r]) => s + r.weight, 0);
    let rnd = Math.random() * total;
    for (const [key, r] of entries) {
      rnd -= r.weight;
      if (rnd <= 0) return key;
    }
    return 'common';
  }

  function _rollMutation() {
    if (Math.random() > MonsterRarityConfig.mutationChance) return null;
    const muts = MonsterRarityConfig.mutations;
    return muts[Math.floor(Math.random() * muts.length)];
  }

  // Scale a monster template to a given level + rarity + mutation
  function generate(tmpl, level, forcedRarity) {
    const rarity  = forcedRarity || _rollRarity();
    const rarCfg  = MonsterRarityConfig.rarities[rarity];
    const mut     = _rollMutation();
    const mutMult = mut ? mut.mult : 1.0;
    const levelScale = 1 + (level - 1) * 0.055; // ~5.5% per level

    const totalMult = rarCfg.statMult * mutMult * levelScale;

    return {
      ...tmpl,
      level,
      rarity,
      mutation: mut,
      rarityLabel: rarCfg.label,
      rarityColor: rarCfg.color,
      hp:    Math.floor(tmpl.hp  * totalMult),
      maxHp: Math.floor(tmpl.hp  * totalMult),
      atk:   Math.floor(tmpl.atk * totalMult),
      def:   Math.floor(tmpl.def * totalMult),
      _xpMult:   (tmpl._xpMult   || 1) * rarCfg.xpMult,
      _goldMult: (tmpl._goldMult || 1) * rarCfg.goldMult,
      _isPet:    false,
    };
  }

  return { generate, rollRarity: _rollRarity };
})();
const MonsterDatabase = (() => {
  // Фиксированная редкость каждого вида монстра (по имени)
  // common  → зоны 1-2 (Лес, Болото)
  // uncommon→ зоны 3-4 (Катакомбы, Кладбище)
  // rare    → зоны 5-6 (Пустыня, Забытый город)
  // epic    → зоны 7-10 (Ущелье, Вулкан, Тундра, Бездна)
  const _rarityMap = {
    // ── common (forest lv1-10) ──
    'Лесной волк':        'common',
    'Лесной паук':        'common',
    'Дикий кролик':       'common',
    'Гоблин-разведчик':   'common',
    'Дикий кабан':        'common',
    'Летучая мышь':       'common',
    'Медведь-шатун':      'common',
    'Гоблин-воин':        'common',
    'Лесной дух':         'common',
    // ── uncommon (swamp lv11-20 + catacombs lv21-30 + cemetery lv31-40) ──
    'Гоблин-охотник':     'uncommon',
    'Ядовитая жаба':      'uncommon',
    'Болотная пиявка':    'uncommon',
    'Болотный тролль':    'uncommon',
    'Пещерный медведь':   'uncommon',
    'Болотная гидра':     'uncommon',
    'Чумной оборотень':   'uncommon',
    'Болотный колдун':    'uncommon',
    'Костяной крокодил':  'uncommon',
    'Скелет':             'uncommon',
    'Пещерная мышь':      'uncommon',
    'Блуждающий призрак': 'uncommon',
    'Орк-воин':           'uncommon',
    'Скелет-рыцарь':      'uncommon',
    'Пещерный тролль':    'uncommon',
    'Некромант':          'uncommon',
    'Орк-берсерк':        'uncommon',
    'Скелет-маг':         'uncommon',
    'Зомби':              'uncommon',
    'Призрак':            'uncommon',
    'Костяной страж':     'uncommon',
    'Вампир':             'uncommon',
    'Проклятый паладин':  'uncommon',
    'Призрак-воин':       'uncommon',
    'Лорд вампиров':      'uncommon',
    'Повелитель зомби':   'uncommon',
    'Теневой лич':        'uncommon',
    // ── rare ──
    'Пустынный скорпион': 'rare',
    'Анкский стражник':   'rare',
    'Мумия':              'rare',
    'Песчаный джинн':     'rare',
    'Костяной дракон':    'rare',
    'Пустынная гарпия':   'rare',
    'Великий скорпион':   'rare',
    'Проклятый фараон':   'rare',
    'Повелитель джиннов': 'rare',
    'Городской страж':    'rare',
    'Механический голем': 'rare',
    'Магический конструкт':'rare',
    'Теневой рыцарь':     'rare',
    'Проклятый маг':      'rare',
    'Призрак воина':      'rare',
    'Хаосный оборотень':  'rare',
    'Архидемон':          'rare',
    'Тёмный властелин':   'rare',
    // ── epic ──
    'Теневой ассасин':    'epic',
    'Горный тролль':      'epic',
    'Каменный голем':     'epic',
    'Огненный элементаль':'epic',
    'Лавовый монстр':     'epic',
    'Пепельный дракон':   'epic',
    'Ледяной голем':      'epic',
    'Арктический вампир': 'epic',
    'Морозный дракон':    'epic',
    'Бездонный левиафан': 'epic',
    'Хаотический элем.':  'epic',
    'Демон бездны':       'epic',
    'Теневой демон':      'epic',
    'Страж бездны':       'epic',
    'Абиссальный ужас':   'epic',
    'Древний лич':        'epic',
    'Повелитель тьмы':    'epic',
    'Небесный дракон':    'epic',
    'Перворождённый хаос':'epic',
    'Бог уничтожения':    'epic',
    'Тёмная сингулярность':'epic',
  };

  function getRarity(monsterName) {
    return _rarityMap[monsterName] || null;
  }

  function setRarity(monsterName, rarity) {
    _rarityMap[monsterName] = rarity;
  }

  function getAll() { return { ..._rarityMap }; }

  return { getRarity, setRarity, getAll };
})();
const MonsterUpgradePatch = (() => {
  // Intercept monster:updated to upgrade freshly spawned monster with rarity/mutation
  // We wrap spawnMonster by hooking into the spawn pipeline
  const _originalSpawn = WorldSystem.spawnMonster.bind(WorldSystem);

  // Override spawnMonster: after base spawn, apply rarity+mutation
  function enhancedSpawn() {
    // Call original (sets State.monster)
    _originalSpawn();
    const m = State.monster;
    if (!m || m._rarityApplied) return;

    // Apply rarity + mutation on top of the existing scale
    const rarity  = MonsterFactory.rollRarity();
    const rarCfg  = MonsterRarityConfig.rarities[rarity];
    const muts    = MonsterRarityConfig.mutations;
    const hasMut  = Math.random() < MonsterRarityConfig.mutationChance;
    const mutation= hasMut ? muts[Math.floor(Math.random() * muts.length)] : null;
    const mult    = rarCfg.statMult * (mutation ? mutation.mult : 1.0);

    m.rarity       = rarity;
    m.rarityLabel  = rarCfg.label;
    m.rarityColor  = rarCfg.color;
    m.mutation     = mutation;
    m.hp           = Math.floor(m.hp  * mult);
    m.maxHp        = m.hp;
    m.atk          = Math.floor(m.atk * mult);
    m.def          = Math.floor(m.def * mult);
    m._xpMult      = (m._xpMult   || 1) * rarCfg.xpMult;
    m._goldMult    = (m._goldMult  || 1) * rarCfg.goldMult;
    m._rarityApplied = true;

    // Update log with rarity info
    const mutStr = mutation ? ` [${mutation.label}]` : '';
    const rarStr = rarity !== 'common' ? ` ✦${rarCfg.label}` : '';
    if (rarStr || mutStr) {
      UISystem.log(`  └ ${rarStr}${mutStr}`, 'li');
    }

    State.setMonster(m);
    EventBus.emit('monster:rarityApplied', { rarity, mutation });
  }

  // Replace spawnMonster on WorldSystem object
  // Since WorldSystem returns a frozen IIFE object, we use a wrapper event
  EventBus.on('monster:spawned', () => {
    const m = State.monster;
    if (!m || m._rarityApplied) return;
    // Apply rarity upgrades post-spawn
    const rarity  = MonsterFactory.rollRarity();
    const rarCfg  = MonsterRarityConfig.rarities[rarity];
    const hasMut  = Math.random() < MonsterRarityConfig.mutationChance;
    const muts    = MonsterRarityConfig.mutations;
    const mutation= hasMut ? muts[Math.floor(Math.random() * muts.length)] : null;
    const mult    = rarCfg.statMult * (mutation ? mutation.mult : 1.0);

    m.rarity       = rarity;
    m.rarityLabel  = rarCfg.label;
    m.rarityColor  = rarCfg.color;
    m.mutation     = mutation;
    m.hp           = Math.floor(m.hp  * mult);
    m.maxHp        = m.hp;
    m.atk          = Math.floor(m.atk * mult);
    m.def          = Math.floor(m.def * mult);
    m._xpMult      = (m._xpMult   || 1) * rarCfg.xpMult;
    m._goldMult    = (m._goldMult  || 1) * rarCfg.goldMult;
    m._rarityApplied = true;

    const mutStr = mutation ? ` [${mutation.label}]` : '';
    const rarStr = rarity !== 'common' ? ` ✦${rarCfg.label}` : '';
    if (rarStr || mutStr) UISystem.log(`  └${rarStr}${mutStr}`, 'li');

    // Re-render monster card with updated stats
    if (typeof RenderSystem !== 'undefined') RenderSystem.monster();
    EventBus.emit('monster:rarityApplied', { rarity, mutation });
  });

  return {};
})();
