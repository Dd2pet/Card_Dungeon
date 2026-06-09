const EventModifierLayer = (() => {
  // Хранит активные модификаторы: { id, type, value, expiresAt, zoneId? }
  // type: 'gold_mult' | 'xp_mult' | 'drop_mult' | 'pet_chance' | 'encounter_mult'
  //       | 'monster_migration' | 'monster_elite' | 'ambush_chance' | 'rare_chance'
  let _mods = [];

  // Добавить модификатор с TTL в секундах (0 = бессрочно до ручного удаления)
  function add(mod) {
    // mod: { id, type, value, ttlMs, zoneId? }
    const now = Date.now();
    _mods.push({
      ...mod,
      addedAt:   now,
      expiresAt: mod.ttlMs > 0 ? now + mod.ttlMs : Infinity,
    });
  }

  // Удалить по id
  function remove(id) {
    _mods = _mods.filter(m => m.id !== id);
  }

  // Очистить просроченные
  function _prune() {
    const now = Date.now();
    const before = _mods.length;
    _mods = _mods.filter(m => m.expiresAt > now);
    return _mods.length < before;
  }

  // Получить суммарное значение модификаторов нужного типа для текущей зоны
  // Для мультипликаторов: возвращает результирующий множитель
  // Для boolean-флагов: возвращает true если хотя бы один активен
  function getMultiplier(type, zoneId) {
    _prune();
    let result = 1.0;
    _mods.forEach(m => {
      if (m.type !== type) return;
      if (m.zoneId && m.zoneId !== zoneId) return;
      result *= m.value;
    });
    return result;
  }

  function hasFlag(type, zoneId) {
    _prune();
    return _mods.some(m => {
      if (m.type !== type) return false;
      if (m.zoneId && m.zoneId !== zoneId) return false;
      return true;
    });
  }

  // Список активных модов (для UI)
  function getActive() {
    _prune();
    return [..._mods];
  }

  // Получить конкретный мод по id
  function getById(id) {
    _prune();
    return _mods.find(m => m.id === id) || null;
  }

  // Сериализация для сохранения — сохраняем только ещё активные
  function toSave() {
    _prune();
    return _mods.filter(m => m.expiresAt < Infinity).map(m => ({
      id:        m.id,
      type:      m.type,
      value:     m.value,
      expiresAt: m.expiresAt,
      zoneId:    m.zoneId || null,
      label:     m.label || '',
      icon:      m.icon  || '🌐',
    }));
  }

  function fromSave(arr) {
    if (!Array.isArray(arr)) return;
    const now = Date.now();
    _mods = arr
      .filter(m => m.expiresAt > now)
      .map(m => ({ ...m, addedAt: now }));
  }

  function clear() { _mods = []; }

  return { add, remove, getMultiplier, hasFlag, getActive, getById, toSave, fromSave, clear };
})();
const EventScheduler = (() => {
  let _timers = [];

  // Зарегистрировать повторяющееся событие
  // { id, minIntervalMs, maxIntervalMs, handler }
  function schedule(cfg) {
    _cancel(cfg.id);
    const delay = cfg.minIntervalMs + Math.random() * (cfg.maxIntervalMs - cfg.minIntervalMs);
    const tid = setTimeout(() => {
      _timers = _timers.filter(t => t.id !== cfg.id);
      try { cfg.handler(); } catch(e) { console.error('[EventScheduler]', cfg.id, e); }
      schedule(cfg); // reschedule
    }, delay);
    _timers.push({ id: cfg.id, tid, cfg });
  }

  function _cancel(id) {
    const found = _timers.find(t => t.id === id);
    if (found) { clearTimeout(found.tid); _timers = _timers.filter(t => t.id !== id); }
  }

  function cancelAll() {
    _timers.forEach(t => clearTimeout(t.tid));
    _timers = [];
  }

  function rescheduleAll() {
    const cfgs = _timers.map(t => t.cfg);
    cancelAll();
    cfgs.forEach(cfg => schedule(cfg));
  }

  return { schedule, cancel: _cancel, cancelAll, rescheduleAll };
})();
const WorldEventSystem = (() => {

  // ── Конфигурация событий ──
  const _EVENT_DEFS = [

    // ══════════════════════════════════════════
    // 1. ЭКОНОМИЧЕСКИЕ И XP-ИВЕНТЫ (средние)
    // ══════════════════════════════════════════
    {
      id: 'favorable_hunt',
      category: 'economic',
      label: 'Благоприятная охота',
      icon: '🍀',
      color: '#f0c050',
      rarity: 'common',
      weight: 35,
      globalOnly: true,
      maxActive: 1,
      ttlMs: 5 * 60 * 1000,            // 5 минут
      triggerChance: 0.22,
      modifiers: [{ type: 'gold_mult', value: 1.25, label: '+25% 💰' }],
      announce: '🍀 Благоприятная охота! +25% золото на 5 мин.',
    },
    {
      id: 'experience_wind',
      category: 'economic',
      label: 'Прилив вдохновения',
      icon: '🌬️',
      color: '#9b59b6',
      rarity: 'common',
      weight: 35,
      globalOnly: true,
      maxActive: 1,
      ttlMs: 5 * 60 * 1000,
      triggerChance: 0.22,
      modifiers: [{ type: 'xp_mult', value: 1.20, label: '+20% XP' }],
      announce: '🌬️ Прилив вдохновения! +20% XP на 5 мин.',
    },
    {
      id: 'generous_earth',
      category: 'economic',
      label: 'Щедрая земля',
      icon: '🌾',
      color: '#27ae60',
      rarity: 'uncommon',
      weight: 20,
      globalOnly: true,
      maxActive: 1,
      ttlMs: 4 * 60 * 1000,
      triggerChance: 0.15,
      modifiers: [{ type: 'drop_mult', value: 1.40, label: '+40% дроп' }],
      announce: '🌾 Щедрая земля! +40% дроп на 4 мин.',
    },

    // ══════════════════════════════════════════
    // 2. СОБЫТИЯ ПИТОМЦЕВ (редкие)
    // ══════════════════════════════════════════
    {
      id: 'rare_beast_tracks',
      category: 'pet',
      label: 'Следы редкого зверя',
      icon: '🐾',
      color: '#e67e22',
      rarity: 'uncommon',
      weight: 12,
      globalOnly: false,
      maxActive: 1,
      ttlMs: 6 * 60 * 1000,
      triggerChance: 0.10,
      modifiers: [{ type: 'pet_chance', value: 2.5, label: '×2.5 шанс питомца' }],
      announce: '🐾 Следы редкого зверя! Повышен шанс встречи питомца.',
    },
    {
      id: 'forest_spirit_watches',
      category: 'pet',
      label: 'Дух природы наблюдает',
      icon: '🌿',
      color: '#16a085',
      rarity: 'rare',
      weight: 7,
      globalOnly: true,
      maxActive: 1,
      ttlMs: 8 * 60 * 1000,
      triggerChance: 0.07,
      modifiers: [
        { type: 'pet_chance',  value: 3.0,  label: '×3 питомец' },
        { type: 'rare_chance', value: 1.5,  label: '×1.5 редких' },
      ],
      announce: '🌿 Дух природы наблюдает! Редкие существа появляются чаще.',
    },

    // ══════════════════════════════════════════
    // 3. УСИЛЕННЫЕ ВСТРЕЧИ (combat modifiers)
    // ══════════════════════════════════════════
    {
      id: 'wolf_pack_active',
      category: 'combat',
      label: 'Хищники сбились в стаи',
      icon: '🐺',
      color: '#c0392b',
      rarity: 'common',
      weight: 18,
      zones: ['forest', 'tundra'],
      globalOnly: false,
      maxActive: 2,
      ttlMs: 4 * 60 * 1000,
      triggerChance: 0.18,
      modifiers: [{ type: 'encounter_mult', value: 1.3, label: '↑ встречи' }],
      // Без межбиомной миграции: волки активны в своём биоме
      announce: '🐺 Хищники сбились в стаи! Встреч с врагами стало больше.',
    },
    {
      id: 'goblin_ambush',
      category: 'combat',
      label: 'Засада врагов',
      icon: '👺',
      color: '#e74c3c',
      rarity: 'common',
      weight: 18,
      zones: ['forest', 'swamp', 'catacombs'],
      globalOnly: false,
      maxActive: 2,
      ttlMs: 4 * 60 * 1000,
      triggerChance: 0.18,
      modifiers: [
        { type: 'ambush_chance', value: 0.15, label: '+15% засада' },
        { type: 'encounter_mult', value: 1.2,  label: '↑ встречи' },
      ],
      announce: '👺 Враги устроили засаду! Бдительность!',
    },
    {
      id: 'alpha_bear',
      category: 'combat',
      label: 'Вожак-альфа появился',
      icon: '🐻',
      color: '#8e44ad',
      rarity: 'uncommon',
      weight: 10,
      zones: ['forest', 'swamp'],
      globalOnly: false,
      maxActive: 1,
      ttlMs: 5 * 60 * 1000,
      triggerChance: 0.12,
      modifiers: [{ type: 'monster_elite', value: 1.25, label: '↑ элитные' }],
      announce: '🐻 Вожак-альфа усиливает соседей! Враги сильнее.',
    },

    // ══════════════════════════════════════════
    // 4. АТМОСФЕРНЫЕ СОБЫТИЯ (non-combat)
    // ══════════════════════════════════════════
    {
      id: 'forest_fog',
      category: 'atmospheric',
      label: 'Густой туман',
      icon: '🌫️',
      color: '#7f8c8d',
      rarity: 'common',
      weight: 22,
      zones: ['forest', 'swamp', 'cemetery'],
      globalOnly: false,
      maxActive: 1,
      ttlMs: 5 * 60 * 1000,
      triggerChance: 0.20,
      modifiers: [
        { type: 'ambush_chance', value: 0.20, label: '+20% засада' },
        { type: 'gold_mult',     value: 0.95, label: '−5% 💰'      },
      ],
      announce: '🌫️ Густой туман! Повышен шанс засады.',
    },
    {
      id: 'sunny_dawn',
      category: 'atmospheric',
      label: 'Солнечный рассвет',
      icon: '🌅',
      color: '#f39c12',
      rarity: 'common',
      weight: 22,
      globalOnly: true,
      maxActive: 1,
      ttlMs: 6 * 60 * 1000,
      triggerChance: 0.20,
      modifiers: [
        { type: 'xp_mult',  value: 1.10, label: '+10% XP' },
        { type: 'gold_mult', value: 1.05, label: '+5% 💰'  },
      ],
      announce: '🌅 Солнечный рассвет! Небольшой бонус к XP и золоту.',
    },
    {
      id: 'uneasy_silence',
      category: 'atmospheric',
      label: 'Тревожная тишина',
      icon: '😶',
      color: '#2c3e50',
      rarity: 'uncommon',
      weight: 12,
      globalOnly: true,
      maxActive: 1,
      ttlMs: 5 * 60 * 1000,
      triggerChance: 0.10,
      modifiers: [
        { type: 'encounter_mult', value: 0.80, label: '−20% встречи' },
        { type: 'rare_chance',    value: 2.0,  label: '×2 редкие'   },
      ],
      announce: '😶 Тревожная тишина... Меньше встреч, но больше редкостей.',
    },

    // ══════════════════════════════════════════
    // 5. МИГРАЦИЯ МОНСТРОВ (редкие)
    // ПРАВИЛО: миграция разрешена ТОЛЬКО внутри одной биомной цепочки
    // Биомные цепочки: ['forest'] | ['swamp'] | ['catacombs','cemetery'] | ...
    // Лес — единственный биом с тремя тирами, внутри которого допустима миграция
    // (forest easy → forest normal → forest hard — одна локация с разными рисками,
    //  поэтому «миграция» здесь означает перетекание монстров между тирами одной зоны)
    // ══════════════════════════════════════════
    {
      id: 'deep_forest_migration',
      category: 'migration',
      label: 'Хищники перемещаются',
      icon: '🌲',
      color: '#1abc9c',
      rarity: 'rare',
      weight: 8,
      zones: ['forest'],
      globalOnly: false,
      maxActive: 1,
      ttlMs: 7 * 60 * 1000,
      triggerChance: 0.08,
      // fromZone и toZone — оба 'forest': монстры перетекают между тирами одной зоны
      migration: { fromZone: 'forest', toZone: 'forest', monsterKeyword: null, power: 1.10 },
      modifiers: [{ type: 'migration_active', value: 1.0, label: 'Миграция' }],
      announce: '🌲 Хищники перемещаются по территории!',
    },
    {
      id: 'goblin_expansion',
      category: 'migration',
      label: 'Враги расширяют территорию',
      icon: '👺',
      color: '#e74c3c',
      rarity: 'rare',
      weight: 8,
      zones: ['forest'],
      globalOnly: false,
      maxActive: 1,
      ttlMs: 6 * 60 * 1000,
      triggerChance: 0.08,
      // Гоблины перемещаются внутри леса (тиры easy → normal → hard)
      migration: { fromZone: 'forest', toZone: 'forest', monsterKeyword: 'гоблин', power: 1.20 },
      modifiers: [{ type: 'migration_active', value: 1.0, label: 'Миграция врагов' }],
      announce: '👺 Враги расширяют свою территорию!',
    },
  ];

  // ── Активное глобальное событие ──
  let _globalEvent = null;    // { defId, startedAt, endsAt }
  // ── Локальные события по зонам ──
  let _localEvents = {};      // zoneId → [ { defId, modIds[], startedAt, endsAt } ]
  // ── Слои миграции (временные override спавна) ──
  let _migrationLayers = [];  // [{ fromZone, toZone, keyword, power, endsAt }]

  // ── Вспомогательные ──
  function _def(id) { return _EVENT_DEFS.find(d => d.id === id) || null; }

  function _isActive(defId) {
    if (_globalEvent?.defId === defId) return true;
    return Object.values(_localEvents).some(arr => arr.some(e => e.defId === defId));
  }

  // Guard против реентрантного вызова:
  // _expireEvent -> emit('worldEvent:expired') -> _renderEventBanner -> getActiveEvents -> _pruneExpired -> рекурсия
  let _pruning = false;

  function _pruneExpired() {
    if (_pruning) return;
    _pruning = true;
    try {
      const now = Date.now();
      // Global
      if (_globalEvent && _globalEvent.endsAt < now) {
        const def = _def(_globalEvent.defId);
        if (def) _expireEvent(def, 'global', null);
      }
      // Local
      Object.keys(_localEvents).forEach(zoneId => {
        _localEvents[zoneId] = (_localEvents[zoneId] || []).filter(ev => {
          if (ev.endsAt >= now) return true;
          const def = _def(ev.defId);
          if (def) _expireEventLocal(def, ev, zoneId);
          return false;
        });
      });
      // Migration layers
      _migrationLayers = _migrationLayers.filter(l => l.endsAt >= now);
    } finally {
      _pruning = false;
    }
  }

  function _expireEvent(def, scope, zoneId) {
    if (!def) return;
    // Remove modifiers
    def.modifiers.forEach(mod => {
      const modId = `wev_${def.id}_${mod.type}`;
      EventModifierLayer.remove(modId);
    });
    // Remove migration
    if (def.migration) {
      _migrationLayers = _migrationLayers.filter(l => l._defId !== def.id);
    }
    if (scope === 'global') _globalEvent = null;
    EventBus.emit('worldEvent:expired', { defId: def.id, label: def.label });
    UISystem.showToast(`${def.icon} ${def.label} — завершено`);
  }

  function _expireEventLocal(def, ev, zoneId) {
    if (!def) return;
    ev.modIds.forEach(mid => EventModifierLayer.remove(mid));
    if (def.migration) {
      _migrationLayers = _migrationLayers.filter(l => l._defId !== def.id);
    }
    EventBus.emit('worldEvent:expired', { defId: def.id, label: def.label });
  }

  // ── Запустить событие ──
  function _activateEvent(def) {
    if (!def) return;
    const now = Date.now();
    const endsAt = now + def.ttlMs;
    const zoneId = State.zone?.id || 'forest';

    // Только одно мировое событие одновременно (глобальное или локальное)
    if (_globalEvent) return; // уже есть активное событие
    const _anyLocalActive = Object.values(_localEvents).some(arr => arr.length > 0);
    if (_anyLocalActive) return; // уже есть локальное событие

    if (_isActive(def.id)) return; // уже активно

    // Добавить модификаторы
    const modIds = [];
    def.modifiers.forEach(mod => {
      const modId = `wev_${def.id}_${mod.type}`;
      EventModifierLayer.add({
        id:    modId,
        type:  mod.type,
        value: mod.value,
        label: mod.label,
        icon:  def.icon,
        ttlMs: def.ttlMs,
        zoneId: def.globalOnly ? null : zoneId,
      });
      modIds.push(modId);
    });

    // Добавить миграцию
    if (def.migration) {
      _migrationLayers.push({
        _defId:  def.id,
        fromZone: def.migration.fromZone,
        toZone:   def.migration.toZone,
        keyword:  def.migration.monsterKeyword,
        power:    def.migration.power,
        endsAt,
      });
    }

    const record = { defId: def.id, startedAt: now, endsAt, modIds };

    if (def.globalOnly) {
      _globalEvent = record;
    } else {
      if (!_localEvents[zoneId]) _localEvents[zoneId] = [];
      _localEvents[zoneId].push(record);
    }

    EventBus.emit('worldEvent:activated', { defId: def.id, label: def.label, icon: def.icon, endsAt });
    UISystem.showToast(`${def.icon} ${def.label}`);
    UISystem.log(`🌍 Событие мира: ${def.label}`, 'lt');
  }

  // ── Взвешенный выбор события ──
  // triggerChance используется как общий шанс тика (один бросок на весь вызов),
  // а не как фильтр каждого кандидата — иначе события почти никогда не запускаются.
  function _rollEvent() {
    _pruneExpired();
    const zoneId = State.zone?.id || 'forest';

    // Собрать кандидатов (только фильтры совместимости — без rng)
    const candidates = _EVENT_DEFS.filter(def => {
      if (_isActive(def.id)) return false;
      if (def.zones && !def.zones.includes(zoneId)) return false;
      if (def.globalOnly && _globalEvent) return false;
      return true;
    });

    if (!candidates.length) return;

    // Один общий бросок: берём лучший triggerChance из кандидатов
    const bestChance = Math.max(...candidates.map(d => d.triggerChance));
    if (Math.random() > bestChance) return;

    // Взвешенный случайный выбор среди кандидатов
    const totalW = candidates.reduce((s, d) => s + d.weight, 0);
    let r = Math.random() * totalW;
    for (const def of candidates) {
      r -= def.weight;
      if (r <= 0) { _activateEvent(def); return; }
    }
    // fallback
    _activateEvent(candidates[candidates.length - 1]);
  }

  // ── Публичные геттеры модификаторов для интеграции ──
  function getGoldMult()     { _pruneExpired(); return EventModifierLayer.getMultiplier('gold_mult', State.zone?.id); }
  function getXpMult()       { _pruneExpired(); return EventModifierLayer.getMultiplier('xp_mult',  State.zone?.id); }
  function getDropMult()     { _pruneExpired(); return EventModifierLayer.getMultiplier('drop_mult', State.zone?.id); }
  function getPetChanceMult(){ _pruneExpired(); return EventModifierLayer.getMultiplier('pet_chance', State.zone?.id); }
  function getAmbushChance() { _pruneExpired(); return EventModifierLayer.getMultiplier('ambush_chance', State.zone?.id) - 1; }
  function getRareChanceMult(){ _pruneExpired(); return EventModifierLayer.getMultiplier('rare_chance', State.zone?.id); }
  function getElitePower()   { _pruneExpired(); return EventModifierLayer.getMultiplier('monster_elite', State.zone?.id); }

  // ── Биомные цепочки — миграция разрешена ТОЛЬКО внутри одной группы ──
  // forest-тиры образуют единственную внутреннюю цепочку лес1→лес2→лес3
  // Все остальные биомы изолированы: монстры болота не покидают болото и т.д.
  const _BIOME_CHAINS = [
    ['forest'],                    // Лесная цепочка (все тиры одной зоны)
    ['swamp'],                     // Болото — изолировано
    ['catacombs'],                 // Катакомбы — изолированы
    ['cemetery'],                  // Кладбище — изолировано
    ['desert'],                    // Пустыня — изолирована
    ['lostcity'],                  // Забытый город — изолирован
    ['ravine'],                    // Ущелье — изолировано
    ['volcano'],                   // Вулкан — изолирован
    ['tundra'],                    // Тундра — изолирована
    ['abyss'],                     // Бездна — изолирована
  ];

  // Возвращает true, если fromZone и toZone принадлежат одной биомной цепочке
  function _sameBiome(fromZone, toZone) {
    if (fromZone === toZone) return true;
    return _BIOME_CHAINS.some(chain => chain.includes(fromZone) && chain.includes(toZone));
  }

  // Получить миграционный overlay для текущей зоны (если есть)
  // ОГРАНИЧЕНИЕ: возвращает только слои, принадлежащие тому же биому
  function getMigrationForZone(zoneId) {
    _pruneExpired();
    return _migrationLayers.filter(l => {
      const involves = l.toZone === zoneId || l.fromZone === zoneId;
      if (!involves) return false;
      // Проверка биомной изоляции: обе зоны должны быть в одной цепочке
      if (!_sameBiome(l.fromZone, l.toZone)) return false;
      return true;
    });
  }

  // ── UI: список активных событий ──
  function getActiveEvents() {
    _pruneExpired();
    const result = [];
    if (_globalEvent) {
      const def = _def(_globalEvent.defId);
      if (def) result.push({ def, record: _globalEvent, scope: 'global' });
    }
    const zoneId = State.zone?.id || 'forest';
    (_localEvents[zoneId] || []).forEach(ev => {
      const def = _def(ev.defId);
      if (def) result.push({ def, record: ev, scope: 'local' });
    });
    return result;
  }

  // ── Сохранение/загрузка ──
  function toSave() {
    _pruneExpired();
    return {
      globalEvent:   _globalEvent,
      localEvents:   _localEvents,
      migrationLayers: _migrationLayers,
      modifiers:     EventModifierLayer.toSave(),
    };
  }

  function fromSave(d) {
    if (!d) return;
    const now = Date.now();
    // Восстанавливаем только не истёкшие записи
    _globalEvent = (d.globalEvent && d.globalEvent.endsAt > now) ? d.globalEvent : null;
    _localEvents = {};
    if (d.localEvents && typeof d.localEvents === 'object') {
      Object.entries(d.localEvents).forEach(([zId, arr]) => {
        _localEvents[zId] = (arr || []).filter(ev => ev.endsAt > now);
      });
    }
    _migrationLayers = Array.isArray(d.migrationLayers)
      ? d.migrationLayers.filter(l => l.endsAt > now)
      : [];
    EventModifierLayer.fromSave(d.modifiers || []);
  }

  // ── Инициализация планировщика ──
  function _startScheduler() {
    // Основной тик: каждые 30–60 сек пробуем запустить экономическое/боевое/атмо событие
    EventScheduler.schedule({
      id: 'worldEvent_global_tick',
      minIntervalMs: 30_000,
      maxIntervalMs: 60_000,
      handler: _rollEvent,
    });
    // Атмосферные события: каждые 45–90 сек
    EventScheduler.schedule({
      id: 'worldEvent_atmo_tick',
      minIntervalMs: 45_000,
      maxIntervalMs: 90_000,
      handler: () => {
        _pruneExpired();
        const atmo = _EVENT_DEFS.filter(d => d.category === 'atmospheric' && !_isActive(d.id));
        if (!atmo.length) return;
        // Взвешенный выбор среди атмосферных
        const totalW = atmo.reduce((s, d) => s + d.weight, 0);
        let r = Math.random() * totalW;
        for (const def of atmo) {
          r -= def.weight;
          if (r <= 0) { _activateEvent(def); return; }
        }
      },
    });
    // Тик миграции: каждые 90–180 сек (раньше было 3–6 мин)
    EventScheduler.schedule({
      id: 'worldEvent_migration_tick',
      minIntervalMs: 90_000,
      maxIntervalMs: 180_000,
      handler: () => {
        _pruneExpired();
        const migDefs = _EVENT_DEFS.filter(d => d.category === 'migration' && !_isActive(d.id));
        if (!migDefs.length) return;
        // Взвешенный выбор среди миграционных событий (без двойного triggerChance)
        const totalW = migDefs.reduce((s, d) => s + d.weight, 0);
        let r = Math.random() * totalW;
        for (const def of migDefs) {
          r -= def.weight;
          if (r <= 0) { _activateEvent(def); return; }
        }
        _activateEvent(migDefs[migDefs.length - 1]);
      },
    });
  }

  // Стартуем планировщик при начале игры
  EventBus.on('game:started', () => { EventScheduler.cancelAll(); _startScheduler(); });
  EventBus.on('game:loaded',  () => { EventScheduler.cancelAll(); _startScheduler(); });

  // Обновляем UI при смене зоны
  EventBus.on('zone:changed', () => {
    _pruneExpired();
    _renderEventBanner();
  });

  // ── Интеграция с боевыми наградами ──
  EventBus.on('combat:victory', ({ xp, gold, monster }) => {
    // Применяем множители от активных событий
    const xpMult  = getXpMult();
    const goldMult = getGoldMult();
    if (xpMult > 1.0 || goldMult > 1.0) {
      // Бонус уже отображается через интеграцию в _handleVictory ниже
    }
  });

  // ── Интеграция: баннер активных событий ──
  function _renderEventBanner() {
    const events = getActiveEvents();
    let el = document.getElementById('world-events-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'world-events-banner';
      el.style.cssText = [
        'position:relative','z-index:10','margin:0','padding:0',
        'overflow:hidden','flex-shrink:0',
      ].join(';');
      // Вставить под zone-strip
      const strip = document.getElementById('zone-strip');
      if (strip && strip.parentNode) strip.parentNode.insertBefore(el, strip.nextSibling);
    }

    if (!events.length) {
      el.innerHTML = '';
      return;
    }

    // FIX: строим DOM только если состав событий изменился (нет мерцания)
    const currentIds = events.map(e => e.record.defId).join(',');
    if (el.dataset.eventIds !== currentIds) {
      el.dataset.eventIds = currentIds;
      el.innerHTML = events.map(({ def, record }) => {
        return `<div style="
          display:flex;align-items:center;gap:8px;
          padding:5px 14px;
          background:linear-gradient(90deg,${def.color}22,transparent);
          border-bottom:1px solid ${def.color}33;
          font-size:11px;
          ">
          <span style="font-size:16px;line-height:1;">${def.icon}</span>
          <span style="color:${def.color};font-weight:700;flex:1;">${def.label}</span>
          <span style="color:var(--muted);font-size:10px;">${def.modifiers.map(m=>m.label).join(' · ')}</span>
          <span class="wev-timer" data-ends-at="${record.endsAt}" style="color:var(--muted);font-size:10px;min-width:36px;text-align:right;"></span>
        </div>`;
      }).join('');
    }
    // FIX: обновляем только таймеры, без перемонтирования DOM
    const now = Date.now();
    el.querySelectorAll('.wev-timer').forEach(span => {
      const endsAt = +span.dataset.endsAt;
      const remaining = Math.max(0, endsAt - now);
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      span.textContent = '⏱' + (mins > 0 ? `${mins}м ${secs}с` : `${secs}с`);
    });
  }

  // FIX: обновлять таймер каждую 1 секунду (было 5 сек)
  const _bannerInterval = setInterval(() => {
    _pruneExpired();
    _renderEventBanner();
  }, 1000);
  // Register with CleanupManager if available
  if (typeof CleanupManager !== 'undefined') CleanupManager.registerInterval(_bannerInterval);

  // Обновлять при активации/истечении событий
  EventBus.on('worldEvent:activated', () => _renderEventBanner());
  EventBus.on('worldEvent:expired',   () => _renderEventBanner());

  // ── Конец миграции: монстры возвращаются в родные локации ──
  EventBus.on('worldEvent:expired', ({ defId } = {}) => {
    // Проверяем, было ли это миграционным событием
    const wasMigration = (typeof WorldEventSystem !== 'undefined') &&
      WorldEventSystem.getMigrationForZone(State.zone?.id || '').length === 0 &&
      defId;
    if (!wasMigration) return;
    // Если сейчас нет активного боя и текущий монстр — мигрант, сбрасываем его
    if (!State.active && State.monster && State.monster._isMigrant) {
      State.setMonster(null);
      UISystem.showToast('🏡 Пришелец вернулся в свои земли!');
      CombatSessionManager.safeStartCombat(() => WorldSystem.spawnMonster(), 'migration_end');
    }
  });

  return {
    toSave, fromSave,
    getGoldMult, getXpMult, getDropMult, getPetChanceMult,
    getAmbushChance, getRareChanceMult, getElitePower,
    getMigrationForZone, getActiveEvents,
    rollEvent: _rollEvent,
  };
})();
