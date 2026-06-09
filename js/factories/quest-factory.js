const QuestFactory = (() => {

  // Weighted random pick from { key: weight } object
  function _weightedPick(weights) {
    const total = Object.values(weights).reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (const [key, w] of Object.entries(weights)) {
      r -= w; if (r <= 0) return key;
    }
    return Object.keys(weights).pop();
  }

  // Scale factor based on hero level — higher level → tougher objectives, bigger rewards
  function _scaleFactor(level) {
    return 1 + (level - 1) * 0.12;
  }

  // Pick a valid rarity given current guild rank (rank index)
  function _pickRarity(rankIdx, forcedRarity) {
    if (forcedRarity) return forcedRarity;
    // Filter rarities accessible at current rank
    const valid = {};
    for (const [r, w] of Object.entries(QuestConfig.rarityWeights)) {
      if (rankIdx >= QuestConfig.rarityMinRank[r]) valid[r] = w;
    }
    return _weightedPick(valid);
  }

  // Generate procedural title + description (2 sentences)
  function _buildContent(objective, rarity, monsterName) {
    const meta  = QuestConfig.rarityMeta[rarity];
    const rarLbl = meta.label;
    const prefixes = {
      common:    ['Задание:',    'Работа:',    'Поручение:'],
      uncommon:  ['Охота:',      'Задача:',    'Контракт:'],
      rare:      ['Контракт:',   'Охотник:',   'Миссия:'],
      epic:      ['Эпическое:',  'Срочно:',    'Элитное:'],
      legendary: ['Легендарное:','Великая охота:','Героическое:'],
    };
    const prefix = prefixes[rarity][Math.floor(Math.random() * prefixes[rarity].length)];

    const titleMap = {
      kill_type:    `${prefix} ${objective.count}× ${monsterName || 'существо'}`,
      kill_total:   `${prefix} Истребить ${objective.count} врагов`,
      collect_gold: `${prefix} Добыть ${objective.count} монет`,
      collect_part: `${prefix} Собрать ${objective.count}× ${monsterName || 'часть монстра'}`,
    };
    const descMap = {
      kill_type:    `Уничтожь ${objective.count} ${monsterName || 'монстров'} ради гильдии. ${rarLbl} поручение требует скорости.`,
      kill_total:   `Заключи контракт на ${objective.count} убийств в любой зоне. Срок — немедленно.`,
      collect_gold: `Добудь ${objective.count} золотых монет для казны гильдии. Любые источники засчитываются.`,
      collect_part: `Принеси ${objective.count}× «${monsterName || 'часть монстра'}» в гильдию. Нужно для особых нужд — ценится высоко.`,
    };
    return { title: titleMap[objective.type] || 'Задание', desc: descMap[objective.type] || '' };
  }

  // Build reward object
  function _buildReward(rarity, heroLevel) {
    const base  = QuestConfig.rewardBase[rarity];
    const scale = _scaleFactor(heroLevel);
    const [gMin, gMax] = base.gold;
    const gold  = Math.floor((gMin + Math.random() * (gMax - gMin)) * scale);
    const xp    = Math.floor(base.xp * scale);
    const gxp   = QuestConfig.rarityMeta[rarity].gxp;
    return { xp, gold, guildXp: gxp, itemChance: base.itemChance };
  }

  // Build objective from template
  function _buildObjective(tmpl, rarity, heroLevel, zone, monsters) {
    const scale = _scaleFactor(heroLevel);
    const rarMults = { common:1, uncommon:2, rare:4, epic:10, legendary:25 };
    const mult = rarMults[rarity] || 1;

    let count, target, monsterName;
    if (tmpl.type === 'kill_type') {
      // Берём монстров только по зоне, игнорируя текущий риск:
      // квест должен засчитываться при любом уровне сложности в этой зоне
      const pool = monsters.filter(m => m.zone === zone);
      const tmplMon = pool.length ? pool[Math.floor(Math.random() * pool.length)] : monsters[0];
      monsterName = tmplMon.name;
      target = monsterName;
      count = Math.max(1, Math.round(3 * mult * scale));
    } else if (tmpl.type === 'kill_total') {
      count = Math.max(1, Math.round(5 * mult * scale));
      target = null;
    } else if (tmpl.type === 'collect_gold') {
      count = Math.max(10, Math.round(50 * mult * scale));
      target = null;
    } else if (tmpl.type === 'collect_part') {
      // Pick a random monster_part with baseValue > 8
      const partPool = Object.values(ItemFactory.templates).filter(t => t.type === 'monster_part' && (t.baseValue || 0) > 8);
      const picked = partPool.length ? partPool[Math.floor(Math.random() * partPool.length)] : null;
      target = picked ? picked.id : null;
      monsterName = picked ? picked.name : 'часть монстра';
      count = Math.max(2, Math.round(2 * mult));
    }
    return { type: tmpl.type, icon: tmpl.icon, count, current: 0, target, monsterName };
  }

  // ── Public API ──
  function generate(rankIdx, heroLevel, zone, forcedRarity) {
    const rarity = _pickRarity(rankIdx, forcedRarity);
    const tmpl   = QuestConfig.objectiveTemplates[Math.floor(Math.random() * QuestConfig.objectiveTemplates.length)];
    const obj    = _buildObjective(tmpl, rarity, heroLevel, zone, GameConfig.monsters);
    const { title, desc } = _buildContent(obj, rarity, obj.monsterName);
    const reward = _buildReward(rarity, heroLevel);
    const rankLbl = QuestConfig.ranks[rankIdx]?.key || 'E';

    return {
      id:        `q_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      rarity,
      rankRequired: rankLbl,
      title,
      desc,
      objective: obj,
      reward,
      status: 'board',   // 'board' | 'active' | 'completed' | 'failed'
      createdAt: Date.now(),
    };
  }

  return { generate };
})();
