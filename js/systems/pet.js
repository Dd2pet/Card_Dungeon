const PetBonusRegistry = (() => {
  // Each bonus definition:
  // { id, category, label, icon, stat?, statType:'flat'|'pct'|'resist',
  //   baseByRarity: { common, uncommon, rare, epic, legendary, mythic },
  //   gainPerLevel: number|fn(rarity, level) }

  const _RARITY_BASE_MULT = { common: 1, uncommon: 1.5, rare: 2.5, epic: 4, legendary: 6.5, mythic: 10 };

  // Helper: get scaled bonus value
  function _scale(base, level, mult) {
    return base + Math.floor((level - 1) * mult);
  }

  const _defs = {
    // ── Defensive ──
    resist_stun:    { id:'resist_stun',    cat:'resist', label:'Сопр.оглушению', icon:'⚡', stat:'resistStun',   statType:'resist',
                      base:{ common:.08, uncommon:.12, rare:.18, epic:.28, legendary:.42, mythic:.60 }, gain:.008 },
    resist_poison:  { id:'resist_poison',  cat:'resist', label:'Сопр.яду',       icon:'☠️', stat:'resistPoison',  statType:'resist',
                      base:{ common:.08, uncommon:.12, rare:.18, epic:.28, legendary:.42, mythic:.60 }, gain:.008 },
    resist_bleed:   { id:'resist_bleed',   cat:'resist', label:'Сопр.кровот.',   icon:'🩸', stat:'resistBleed',   statType:'resist',
                      base:{ common:.06, uncommon:.10, rare:.16, epic:.24, legendary:.38, mythic:.55 }, gain:.007 },
    resist_freeze:  { id:'resist_freeze',  cat:'resist', label:'Сопр.заморозке', icon:'❄️', stat:'resistFreeze',  statType:'resist',
                      base:{ common:.06, uncommon:.10, rare:.16, epic:.24, legendary:.38, mythic:.55 }, gain:.007 },
    resist_fear:    { id:'resist_fear',    cat:'resist', label:'Сопр.страху',    icon:'💜', stat:'resistFear',    statType:'resist',
                      base:{ common:.08, uncommon:.12, rare:.18, epic:.28, legendary:.42, mythic:.60 }, gain:.008 },

    // ── Combat flat ──
    bonus_atk:      { id:'bonus_atk',      cat:'combat', label:'+ATK',           icon:'⚔️', stat:'atk',          statType:'flat',
                      base:{ common:2, uncommon:4, rare:7, epic:12, legendary:20, mythic:32 }, gain:0.4 },
    bonus_def:      { id:'bonus_def',      cat:'combat', label:'+DEF',           icon:'🛡️', stat:'def',          statType:'flat',
                      base:{ common:2, uncommon:3, rare:6, epic:10, legendary:17, mythic:28 }, gain:0.3 },
    bonus_hp:       { id:'bonus_hp',       cat:'combat', label:'+MAX HP',        icon:'❤️', stat:'hp',           statType:'flat',
                      base:{ common:10, uncommon:18, rare:32, epic:55, legendary:90, mythic:150 }, gain:2 },
    bonus_mp:       { id:'bonus_mp',       cat:'combat', label:'+MAX MP',        icon:'💧', stat:'mp',           statType:'flat',
                      base:{ common:5,  uncommon:10, rare:18, epic:30, legendary:50, mythic:80 },  gain:1 },
    bonus_crit:     { id:'bonus_crit',     cat:'combat', label:'+КРИТ',          icon:'🎯', stat:'crit',         statType:'pct',
                      base:{ common:.02, uncommon:.03, rare:.05, epic:.08, legendary:.13, mythic:.20 }, gain:.001 },
    bonus_critdmg:  { id:'bonus_critdmg',  cat:'combat', label:'+Крит.урон',     icon:'💥', stat:'critDmgMult',  statType:'pct',
                      base:{ common:.05, uncommon:.08, rare:.13, epic:.20, legendary:.32, mythic:.50 }, gain:.002 },
    bonus_dodge:    { id:'bonus_dodge',    cat:'combat', label:'+Уклонение',     icon:'💨', stat:'dodge',        statType:'pct',
                      base:{ common:.03, uncommon:.05, rare:.08, epic:.13, legendary:.20, mythic:.30 }, gain:.001 },
    bonus_acc:      { id:'bonus_acc',      cat:'combat', label:'+Меткость',      icon:'🏹', stat:'accuracy',     statType:'pct',
                      base:{ common:.03, uncommon:.05, rare:.08, epic:.13, legendary:.20, mythic:.30 }, gain:.001 },
    bonus_spd:      { id:'bonus_spd',      cat:'combat', label:'+SPD',           icon:'⚡', stat:'spd',          statType:'flat',
                      base:{ common:1,  uncommon:1,  rare:2,  epic:3,  legendary:5,  mythic:8 },  gain:0.1 },

    // ── Economic ──
    bonus_gold:     { id:'bonus_gold',     cat:'economy', label:'+Золото/бой',   icon:'💰', stat:'goldBonus',    statType:'pct',
                      base:{ common:.05, uncommon:.10, rare:.18, epic:.30, legendary:.50, mythic:.80 }, gain:.004 },
    bonus_xp:       { id:'bonus_xp',       cat:'economy', label:'+Опыт/бой',    icon:'✨', stat:'xpBonus',      statType:'pct',
                      base:{ common:.05, uncommon:.10, rare:.18, epic:.30, legendary:.50, mythic:.80 }, gain:.004 },
    bonus_drop:     { id:'bonus_drop',     cat:'economy', label:'+Шанс дропа',  icon:'📦', stat:'dropBonus',    statType:'pct',
                      base:{ common:.05, uncommon:.08, rare:.14, epic:.22, legendary:.35, mythic:.55 }, gain:.003 },
    bonus_raredrop: { id:'bonus_raredrop', cat:'economy', label:'+Редк.дроп',   icon:'💎', stat:'rareDropBonus',statType:'pct',
                      base:{ common:.03, uncommon:.06, rare:.10, epic:.18, legendary:.30, mythic:.50 }, gain:.003 },
    bonus_shopdisc: { id:'bonus_shopdisc', cat:'economy', label:'−Цена магазина',icon:'🏪', stat:'shopDiscount', statType:'pct',
                      base:{ common:.04, uncommon:.07, rare:.12, epic:.20, legendary:.32, mythic:.50 }, gain:.003 },
    bonus_questreward:{ id:'bonus_questreward',cat:'economy',label:'+Награда квеста',icon:'📜',stat:'questRewardBonus',statType:'pct',
                      base:{ common:.05, uncommon:.10, rare:.18, epic:.30, legendary:.50, mythic:.80 }, gain:.004 },

    // ── Specialized ──
    bonus_heal:     { id:'bonus_heal',     cat:'special', label:'+Лечение',      icon:'💊', stat:'healBonus',    statType:'pct',
                      base:{ common:.08, uncommon:.12, rare:.20, epic:.32, legendary:.50, mythic:.80 }, gain:.005 },
    bonus_boss:     { id:'bonus_boss',     cat:'special', label:'+Урон боссам',  icon:'👑', stat:'bossDmgBonus', statType:'pct',
                      base:{ common:.05, uncommon:.10, rare:.16, epic:.26, legendary:.40, mythic:.65 }, gain:.004 },
    bonus_undead:   { id:'bonus_undead',   cat:'special', label:'+Урон нежити',  icon:'💀', stat:'typeDmgUndead',statType:'pct',
                      base:{ common:.08, uncommon:.12, rare:.20, epic:.32, legendary:.50, mythic:.80 }, gain:.005 },
    bonus_beast:    { id:'bonus_beast',    cat:'special', label:'+Урон зверям',  icon:'🐺', stat:'typeDmgBeast', statType:'pct',
                      base:{ common:.08, uncommon:.12, rare:.20, epic:.32, legendary:.50, mythic:.80 }, gain:.005 },
    bonus_dmgreduction:{ id:'bonus_dmgreduction',cat:'special',label:'−Урон от монстров',icon:'🛡',stat:'dmgReduction',statType:'pct',
                      base:{ common:.03, uncommon:.05, rare:.09, epic:.14, legendary:.22, mythic:.35 }, gain:.002 },

    // ── Mythic combo bonuses ──
    mythic_combo_1: { id:'mythic_combo_1', cat:'special', label:'Воля воина',   icon:'⚔️', stat:'mythic_combo_1',statType:'mythic',
                      base:{ mythic:1 }, gain:0 },
    mythic_combo_2: { id:'mythic_combo_2', cat:'special', label:'Мудрость мага',icon:'🔮', stat:'mythic_combo_2',statType:'mythic',
                      base:{ mythic:1 }, gain:0 },
  };

  function get(id) { return _defs[id] || null; }

  function getValue(id, rarity, level) {
    const def = _defs[id]; if (!def) return 0;
    const base = def.base[rarity] ?? def.base.common ?? 0;
    return base + (level - 1) * def.gain;
  }

  function getNextValue(id, rarity, level) {
    return getValue(id, rarity, level + 1);
  }

  function formatValue(id, val) {
    const def = _defs[id]; if (!def) return String(val);
    if (def.statType === 'flat') return `+${Math.round(val)}`;
    if (def.statType === 'pct')  return `+${(val * 100).toFixed(1)}%`;
    if (def.statType === 'resist') return `${(val * 100).toFixed(0)}% сопр.`;
    if (def.statType === 'mythic') return 'Активен';
    return String(val);
  }

  function formatLabel(id) {
    const def = _defs[id]; if (!def) return id;
    return `${def.icon} ${def.label}`;
  }

  // Build a random bonus array for a given rarity (1 bonus, or 2 for legendary/mythic)
  function rollBonusIds(rarity) {
    const pool = Object.keys(_defs);
    // Mythic gets 3 bonuses
    const count = rarity === 'mythic' ? 3 : rarity === 'legendary' ? 2 : 1;
    const picked = [];
    const shuffled = [...pool].sort(() => Math.random() - .5);
    // Filter by rarity availability
    for (const id of shuffled) {
      const def = _defs[id];
      if (def.base[rarity] === undefined && rarity !== 'mythic') continue;
      // mythic_combo only for mythic
      if (def.statType === 'mythic' && rarity !== 'mythic') continue;
      picked.push(id);
      if (picked.length >= count) break;
    }
    return picked.length ? picked : [Object.keys(_defs)[0]];
  }

  // Get category CSS class
  function getCatClass(id) {
    const def = _defs[id]; if (!def) return '';
    return { combat:'pet-bonus-combat', resist:'pet-bonus-resist', economy:'pet-bonus-economy', special:'pet-bonus-special' }[def.cat] || '';
  }

  return { get, getValue, getNextValue, formatValue, formatLabel, rollBonusIds, getCatClass, defs: _defs };
})();
const PetProgressionSystem = (() => {
  const MAX_LEVEL = 50;
  const XP_BASE   = 30;    // XP needed for level 2
  const XP_FACTOR = 1.18;  // exponential growth

  let _equippedPetId = null;  // id of currently equipped pet (or null)

  // ── XP curve ──
  function xpForLevel(lv) {
    return Math.round(XP_BASE * Math.pow(XP_FACTOR, lv - 1));
  }

  function xpToNext(pet) {
    if (pet.petLevel >= MAX_LEVEL) return 0;
    return xpForLevel(pet.petLevel);
  }

  // ── Ensure pet has progression fields ──
  function _ensureFields(pet) {
    if (pet.petLevel  === undefined) pet.petLevel  = 1;
    if (pet.petXp     === undefined) pet.petXp     = 0;
    if (!pet.bonusIds || !Array.isArray(pet.bonusIds)) {
      pet.bonusIds = PetBonusRegistry.rollBonusIds(pet.rarity || 'common');
    }
  }

  // ── Equip / unequip ──
  function equipPet(petId) {
    _equippedPetId = petId;
    EventBus.emit('pet:equipped', petId);
    EventBus.emit('hero:updated', State.hero);
  }

  function unequipPet() {
    _equippedPetId = null;
    EventBus.emit('pet:unequipped');
    EventBus.emit('hero:updated', State.hero);
  }

  function getEquippedPetId() { return _equippedPetId; }

  function getEquippedPet() {
    if (!_equippedPetId) return null;
    const pets = typeof PetSystem !== 'undefined' ? PetSystem.getPets() : [];
    return pets.find(p => p.id === _equippedPetId) || null;
  }

  // ── Compute all active pet modifier values ──
  function getModifiers() {
    const pet = getEquippedPet();
    if (!pet) return {};
    _ensureFields(pet);
    const mods = {};
    for (const bonusId of pet.bonusIds) {
      const val = PetBonusRegistry.getValue(bonusId, pet.rarity || 'common', pet.petLevel);
      mods[bonusId] = val;
    }
    return mods;
  }

  // ── Get a specific modifier value (0 if not active / not equipped) ──
  function getMod(bonusId) {
    return getModifiers()[bonusId] || 0;
  }

  // ── Award XP to active pet after combat ──
  function awardCombatXp(monsterLevel, monsterRarity) {
    const pet = getEquippedPet();
    if (!pet) return;
    _ensureFields(pet);
    if (pet.petLevel >= MAX_LEVEL) return;

    const rarityMult = { common:1, uncommon:1.3, rare:1.6, epic:2, legendary:2.5, mythic:3 }[monsterRarity] || 1;
    const xpGain = Math.round((5 + monsterLevel * 0.8) * rarityMult);
    pet.petXp += xpGain;

    let leveled = false;
    while (pet.petLevel < MAX_LEVEL && pet.petXp >= xpForLevel(pet.petLevel)) {
      pet.petXp -= xpForLevel(pet.petLevel);
      pet.petLevel++;
      leveled = true;
    }
    if (pet.petLevel >= MAX_LEVEL) pet.petXp = 0;

    if (leveled) {
      _showPetLevelUpToast(pet);
      EventBus.emit('pet:levelUp', { pet, newLevel: pet.petLevel });
    }
    EventBus.emit('pet:xpGained', { pet, xpGain });
  }

  function _showPetLevelUpToast(pet) {
    document.querySelectorAll('.pet-levelup-toast').forEach(t => t.remove());
    const el = document.createElement('div');
    el.className = 'pet-levelup-toast';
    el.textContent = `🐾 ${pet.name} → Ур.${pet.petLevel}!`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  // ── Serialization ──
  function toSave()    { return { equippedPetId: _equippedPetId }; }
  function fromSave(d) { if (d) { _equippedPetId = d.equippedPetId || null; } }

  // ── Hook: award pet XP on combat:victory ──
  EventBus.on('combat:victory', ({ monster }) => {
    if (monster) awardCombatXp(monster.level || 1, monster.rarity || 'common');
  });

  return { xpForLevel, xpToNext, equipPet, unequipPet, getEquippedPetId, getEquippedPet,
           getModifiers, getMod, awardCombatXp, toSave, fromSave, MAX_LEVEL };
})();
const PetSystem = (() => {
  let _pets         = [];        // captured pets (max 6)
  let _activePetIdx = 0;        // index of pet providing bonus
  let _encounter    = null;      // current wild encounter state
  let _saturation   = 0;        // 0-100
  let _attemptsLeft = PetConfig.captureAttempts;

  // ── Magical creature pool — never overlaps with combat monsters ──
  const _MAGICAL_CREATURES = [
    { name:'Лесная фея',      av:'🧚', zone:'forest',    baseRarity:'common'   },
    { name:'Светлячок',       av:'✨', zone:'forest',    baseRarity:'common'   },
    { name:'Единорог',        av:'🦄', zone:'forest',    baseRarity:'rare'     },
    { name:'Древесный дух',   av:'🌳', zone:'forest',    baseRarity:'uncommon' },
    { name:'Болотный огонёк', av:'🔮', zone:'swamp',     baseRarity:'common'   },
    { name:'Водяная нимфа',   av:'💧', zone:'swamp',     baseRarity:'uncommon' },
    { name:'Болотный дракон', av:'🐉', zone:'swamp',     baseRarity:'rare'     },
    { name:'Призрачный мотылёк',av:'🦋',zone:'catacombs',baseRarity:'uncommon' },
    { name:'Теневой лис',     av:'🦊', zone:'catacombs', baseRarity:'rare'     },
    { name:'Каменный дух',    av:'🪨', zone:'catacombs', baseRarity:'common'   },
    { name:'Блуждающий огонь',av:'🕯️',zone:'cemetery',  baseRarity:'uncommon' },
    { name:'Лунный кролик',   av:'🐇', zone:'cemetery',  baseRarity:'common'   },
    { name:'Призрачный волк', av:'🌫️',zone:'cemetery',  baseRarity:'rare'     },
    { name:'Песчаная фея',    av:'⭐', zone:'desert',    baseRarity:'uncommon' },
    { name:'Золотой жук',     av:'🪲', zone:'desert',    baseRarity:'rare'     },
    { name:'Пустынный дух',   av:'🌪️',zone:'desert',    baseRarity:'epic'     },
    { name:'Звёздный элементаль',av:'💫',zone:'lostcity',baseRarity:'rare'     },
    { name:'Кристальный голем',av:'💎',zone:'lostcity',  baseRarity:'epic'     },
    { name:'Древний страж',   av:'🗝️',zone:'lostcity',  baseRarity:'legendary'},
    { name:'Теневая рысь',    av:'🐆', zone:'ravine',    baseRarity:'rare'     },
    { name:'Горная сирена',   av:'🎵', zone:'ravine',    baseRarity:'epic'     },
    { name:'Небесный грифон', av:'🦅', zone:'ravine',    baseRarity:'legendary'},
    { name:'Огненный саламандр',av:'🔥',zone:'volcano',  baseRarity:'rare'     },
    { name:'Лавовый дух',     av:'🌋', zone:'volcano',   baseRarity:'epic'     },
    { name:'Солнечный феникс',av:'☀️',zone:'volcano',   baseRarity:'legendary'},
    { name:'Ледяная лисица',  av:'❄️',zone:'tundra',    baseRarity:'rare'     },
    { name:'Снежный дух',     av:'🌨️',zone:'tundra',    baseRarity:'epic'     },
    { name:'Полярная звезда', av:'⭐', zone:'abyss',     baseRarity:'legendary'},
    { name:'Бездонный левиафан',av:'🌊',zone:'abyss',   baseRarity:'legendary'},
  ];

  // ── Encounter spawn: triggered randomly after combat victory ──
  function trySpawnEncounter(monster) {
    if (_encounter) return;
    if (!monster)   return;

    const rarCfg = MonsterRarityConfig.rarities[monster.rarity] || MonsterRarityConfig.rarities.common;
    // _petChanceOverride устанавливается патчем WorldEventSystem (pet_chance множитель)
    const effectivePetChance = monster._petChanceOverride ?? rarCfg.petChance;
    if (Math.random() > effectivePetChance) return;

    // Pick a magical creature matching the current zone (or any if none)
    const zone = State.zone?.id || 'forest';
    const pool = _MAGICAL_CREATURES.filter(c => c.zone === zone);
    const candidates = pool.length ? pool : _MAGICAL_CREATURES;
    const template = candidates[Math.floor(Math.random() * candidates.length)];

    // Scale level to current monster level ±2
    const level = Math.max(1, monster.level + Math.floor(Math.random() * 5) - 2);

    // Roll rarity (bias toward template's baseRarity)
    const rarityPool = ['common','common','uncommon','uncommon','rare','epic','legendary'];
    const baseIdx    = rarityPool.indexOf(template.baseRarity);
    const roll       = Math.max(0, Math.min(rarityPool.length - 1, baseIdx + Math.floor(Math.random() * 3) - 1));
    const rarity     = rarityPool[roll] || template.baseRarity;
    const petRarCfg  = MonsterRarityConfig.rarities[rarity] || MonsterRarityConfig.rarities.common;
    const mult       = petRarCfg.statMult || 1;

    const petMonster = {
      name:   template.name,
      av:     template.av,
      level,
      rarity,
      rarityLabel: petRarCfg.label,
      rarityColor: petRarCfg.color,
      mutation: null,
      atk:  Math.round(monster.atk  * 0.7 * mult),
      def:  Math.round(monster.def  * 0.7 * mult),
      hp:   Math.round(monster.maxHp * 0.6 * mult),
      maxHp:Math.round(monster.maxHp * 0.6 * mult),
    };

    _encounter = {
      monster:      petMonster,
      saturation:   0,
      attemptsLeft: PetConfig.captureAttempts,
    };
    _saturation   = 0;
    _attemptsLeft = PetConfig.captureAttempts;
    EventBus.emit('pet:encounterStart', _encounter);
    _renderEncounterUI();
    UISystem.removeClass('pet-ov', 'hide');
  }

  function _renderEncounterUI() {
    if (!_encounter) return;
    const m = _encounter.monster;
    const rarCfg = MonsterRarityConfig.rarities[m.rarity] || MonsterRarityConfig.rarities.common;

    UISystem.setText('pet-av',       m.av || '❓');
    UISystem.setText('pet-enc-name', (m.mutation ? m.mutation.label + ' ' : '') + m.name);
    UISystem.setText('pet-enc-type', `Ур.${m.level} · ${rarCfg.label}`);

    // Rarity ring color
    const ring = document.getElementById('pet-rarity-ring');
    if (ring) ring.style.borderColor = rarCfg.color;

    _updateSatUI();
    _updateAttemptsUI();
    _renderFoodGrid();
    _clearResult();
  }

  function _updateSatUI() {
    const pct = Math.round(_saturation);
    UISystem.setText('pet-sat-val', pct + '%');
    const fill = document.getElementById('pet-sat-fill');
    if (fill) fill.style.width = pct + '%';
  }

  function _updateAttemptsUI() {
    UISystem.setText('pet-attempts', `Попыток поимки: ${_attemptsLeft}/${PetConfig.captureAttempts}`);
    const btn = document.getElementById('pet-catch-btn');
    if (btn) btn.disabled = _attemptsLeft <= 0;
  }

  function _clearResult() {
    const el = document.getElementById('pet-result-msg');
    if (el) el.innerHTML = '';
  }

  function _showResult(text, type) {
    const el = document.getElementById('pet-result-msg');
    if (el) el.innerHTML = `<div class="pet-result ${type}">${text}</div>`;
  }

  function _renderFoodGrid() {
    const grid = document.getElementById('pet-food-grid');
    if (!grid) return;
    const inv = State.inventory.filter(i => i.type === 'pet_food' || i.type === 'herb');
    const foodDefs = PetConfig.foods;

    let html = '';
    foodDefs.forEach(food => {
      const inInv = inv.find(i => i.id && i.id.startsWith(food.id));
      const count = inInv ? (inInv.count || 1) : 0;
      html += `<button class="pet-food-btn" data-pfood="${food.id}" ${count === 0 ? 'disabled' : ''}>
        <div class="pet-food-ico">${food.ico}</div>
        <div class="pet-food-name">${food.name}</div>
        <div class="pet-food-sat">+${food.sat}%</div>
        <div style="font-size:8px;color:var(--muted)">×${count}</div>
      </button>`;
    });
    if (!html) html = `<div style="font-size:11px;color:var(--muted);grid-column:1/-1;text-align:center;padding:8px;">Нет еды — шанс поимки ниже.<br><span style="color:var(--gold-lt)">Купи угощение в магазине!</span></div>`;
    grid.innerHTML = html;

    grid.querySelectorAll('[data-pfood]').forEach(btn => {
      btn.addEventListener('click', () => feedPet(btn.dataset.pfood));
    });
  }

  // ── Feed pet to raise saturation ──
  function feedPet(foodId) {
    if (!_encounter) return;
    const food = PetConfig.foods.find(f => f.id === foodId);
    if (!food) return;

    // Find and consume from inventory
    const invIdx = State.inventory.findIndex(i => i.id && i.id.startsWith(food.id) && (i.count || 1) > 0);
    if (invIdx === -1) { UISystem.showToast('❌ Нет такой еды!'); return; }

    const item = State.inventory[invIdx];
    if (item.count > 1) { item.count--; EventBus.emit('inventory:changed', State.inventory); }
    else State.removeFromInventory(invIdx);

    _saturation = Math.min(100, _saturation + food.sat);
    _encounter.saturation = _saturation;
    _updateSatUI();
    _renderFoodGrid();
    UISystem.floatText(`+${food.sat}%`, 'f-heal', document.getElementById('pet-av'));
    EventBus.emit('pet:fed', { food, saturation: _saturation });
  }

  // ── Attempt capture ──
  function attemptCapture() {
    if (!_encounter || _attemptsLeft <= 0) return;
    _attemptsLeft--;
    _encounter.attemptsLeft = _attemptsLeft;

    const m       = _encounter.monster;
    const rarCfg  = MonsterRarityConfig.rarities[m.rarity] || MonsterRarityConfig.rarities.common;
    // Base chance scales with rarity: common easiest, mythic hardest (min 5%)
    const baseCh  = Math.max(0.05, rarCfg.petChance * 4);
    const satBonus= (_saturation / 100) * PetConfig.satBonus;
    const chance  = Math.min(0.95, baseCh + satBonus);

    _updateAttemptsUI();

    if (Math.random() < chance) {
      // SUCCESS — закрываем оверлей немедленно, питомец пойман
      EventBus.emit('pet:captured', m);
      _addPet(m);
      closeEncounter();
    } else if (_attemptsLeft === 0) {
      // ESCAPE — no more attempts
      _showResult('💨 Существо сбежало!', 'escape');
      EventBus.emit('pet:escaped', m);
      setTimeout(closeEncounter, 1400);
    } else {
      // FAIL but tries remain
      _showResult(`❌ Не удалось! (осталось ${_attemptsLeft})`, 'fail');
      // Chance monster flees early
      if (Math.random() < PetConfig.escapeChance) {
        setTimeout(() => {
          _showResult('💨 Существо сбежало!', 'escape');
          EventBus.emit('pet:escaped', m);
          setTimeout(closeEncounter, 1200);
        }, 800);
      }
    }
  }

  function _addPet(monster) {
    if (_pets.length >= PetConfig.maxPets) {
      UISystem.showToast('⚠️ Максимум питомцев! Освободи место.');
      return;
    }
    const pet = {
      id:         `pet_${Date.now()}`,
      name:       (monster.mutation ? monster.mutation.label + ' ' : '') + monster.name,
      baseName:   monster.name,
      av:         monster.av || '❓',
      level:      monster.level,
      rarity:     monster.rarity,
      mutation:   monster.mutation || null,
      capturedAt: Date.now(),
      bonus:      _getPetBonus(monster),
      atk:        monster.atk,
      def:        monster.def,
      hp:         monster.hp,
      maxHp:      monster.maxHp,
      // ── Pet Progression fields ──
      petLevel:   1,
      petXp:      0,
      bonusIds:   PetBonusRegistry.rollBonusIds(monster.rarity || 'common'),
    };
    _pets.push(pet);
    UISystem.showToast(`🐾 ${pet.name} стал твоим питомцем!`);
    UISystem.log(`🐾 Поймал питомца: ${pet.name} [${MonsterRarityConfig.rarities[pet.rarity]?.label}]`, 'ls');
    EventBus.emit('pet:rosterChanged', _pets);
    SaveSystem.autosave();
  }

  function _getPetBonus(monster) {
    // Match by base name keyword
    const name = (monster.name || '').toLowerCase();
    const bonuses = PetConfig.petBonuses;
    for (const [key, b] of Object.entries(bonuses)) {
      if (name.includes(key)) return { ...b };
    }
    return { ...bonuses.default };
  }

  function closeEncounter() {
    _encounter   = null;
    _saturation  = 0;
    _attemptsLeft = PetConfig.captureAttempts;
    UISystem.addClass('pet-ov', 'hide');
    EventBus.emit('pet:encounterEnd');
  }

  // ── Active pet bonus applied to State ──
  function getActivePet() {
    return _pets[_activePetIdx] || null;
  }

  function setActivePet(idx) {
    if (idx >= 0 && idx < _pets.length) {
      _activePetIdx = idx;
      EventBus.emit('pet:activeChanged', _pets[idx]);
    }
  }

  function releasePet(idx) {
    if (idx < 0 || idx >= _pets.length) return;
    const pet = _pets.splice(idx, 1)[0];
    if (_activePetIdx >= _pets.length) _activePetIdx = Math.max(0, _pets.length - 1);
    UISystem.showToast(`🌿 ${pet.name} отпущен на волю.`);
    EventBus.emit('pet:rosterChanged', _pets);
    SaveSystem.autosave();
  }

  function releasePetById(petId) {
    const idx = _pets.findIndex(p => p.id === petId);
    if (idx === -1) return;
    releasePet(idx);
  }

  function getPets()    { return [..._pets]; }
  function getPetCount(){ return _pets.length; }

  function toSave()    { return { pets: _pets, activePetIdx: _activePetIdx }; }
  function fromSave(d) {
    if (!d) return;
    _pets        = d.pets        || [];
    _activePetIdx = d.activePetIdx || 0;
  }

  // Hook: try spawn encounter after victory
  EventBus.on('combat:victory', ({ monster }) => {
    setTimeout(() => trySpawnEncounter(monster), 200);
  });

  // Bind UI buttons after DOM is ready — idempotent via AbortController cleanup
  let _petBtnAbort = null;
  function _bindPetButtons() {
    if (_petBtnAbort) _petBtnAbort.abort();
    _petBtnAbort = new AbortController();
    const signal = _petBtnAbort.signal;
    const catchBtn = document.getElementById('pet-catch-btn');
    const fleeBtn  = document.getElementById('pet-flee-btn');
    if (catchBtn) catchBtn.addEventListener('click', attemptCapture, { signal });
    if (fleeBtn)  fleeBtn.addEventListener('click',  closeEncounter, { signal });
  }
  EventBus.on('game:started', _bindPetButtons);
  EventBus.on('game:loaded',  _bindPetButtons);

  // Hook: add pet foods to loot table dynamically
  EventBus.on('game:started', _registerPetFoodLoot);
  EventBus.on('game:loaded',  _registerPetFoodLoot);

  function _registerPetFoodLoot() {
    // Add pet food items to shop catalog dynamically
    PetConfig.foods.forEach(f => {
      if (!GameConfig.shopCatalog.find(s => s.id === 'petfood_' + f.id)) {
        // We can't mutate frozen config, so we handle this in ShopSystem extension
      }
    });
  }

  return { trySpawnEncounter, feedPet, attemptCapture, closeEncounter, getActivePet, setActivePet, releasePet, releasePetById, getPets, getPetCount, toSave, fromSave };
})();
