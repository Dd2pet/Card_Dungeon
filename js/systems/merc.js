const MercSystem = (() => {
  const _firstNames = [
    'Аркан','Брод','Велар','Гарт','Дейн','Ерик','Зорн','Иван','Корд','Лекс',
    'Марк','Норт','Олег','Петр','Рин','Стас','Торн','Утар','Фрид','Харк',
    'Цезарь','Чаро','Шон','Элин','Юн','Яков','Агнар','Борис','Веста','Дора',
    'Эйра','Фара','Гюда','Хель','Инга','Йорн','Кира','Лира','Мира','Нора',
    'Ора','Рива','Сага','Тера','Ула','Вика','Зара','Бела','Ада','Рута',
  ];
  const _lastNames = [
    // Славянские
    'Волков','Медведев','Громов','Зорин','Ветров','Буров','Каменев','Лесков',
    'Дымов','Соколов','Тёмников','Злобин','Крутов','Дичков','Борисов',
    'Яров','Ладов','Мороз','Вранов','Кречет',
    // Скандинавские / германские
    'Хальвсон','Эйнарссон','Торвальд','Бьёрнсен','Гуннарссон','Ульфссон',
    'Хагенсон','Бранд','Фалькнер','Дракенберг','Штерн','Хартманн',
    'Эрикссон','Свенссон','Карлссон',
    // Кельтские / нейтральные фэнтези
    'Мак-Тавиш','О\'Доннел','Данхилл','Трейн','Корвин','Ардент',
    'Моррис','Флинн','Холт','Крейн',
  ];
  const _classes = ['⚔️ Воин','🗡️ Ассасин','🏹 Стрелок','🔮 Волшебник','⚜️ Паладин','🛡️ Страж','🌿 Следопыт','💣 Подрывник'];
  const _statuses = ['🍺 В таверне','😴 Отдыхает','⚔️ На задании','🧹 Дежурит','🎲 Играет в кости','📖 Читает','🏋️ Тренируется','🍖 Ест'];
  const _rankColors = { E:'#a0a0a0',D:'#6db86d',C:'#4fa3e0',B:'#b44fe0',A:'#e0a030',S:'#ff4444' };

  let _mercs = null;
  let _mercSeed = 0; // Сохраняемый seed для детерминированной генерации

  // Простой ГПСЧ xorshift32 на основе seed — детерминированный, без Math.imul
  function _makeRng(seed) {
    let s = (seed >>> 0) || 1; // 0 не допускается в xorshift
    return function() {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      s = s >>> 0; // приводим к uint32
      return s / 4294967296;
    };
  }

  // Базовые статы по рангу
  const _rankBase = { E:[50,200], D:[500,2000], C:[3000,12000], B:[15000,45000], A:[50000,120000], S:[150000,400000] };

  function _generateStats(rank, lvl, rng) {
    const [min, max] = _rankBase[rank] || _rankBase['E'];
    const base = min + Math.floor(rng() * (max - min));
    const mult = 0.7 + (lvl / 20) * 0.6;
    const score = Math.floor(base * mult);
    const kills = Math.floor(score / 20 + rng() * score / 10);
    const gold  = Math.floor(score * (1.5 + rng() * 2));
    const raids = Math.floor(kills / 120 + rng() * 5);
    return { score, kills, gold, raids };
  }

  function _generate(seed) {
    // Если seed не передан — генерируем новый и сохраняем
    if (seed == null) seed = (Date.now() ^ (Math.random() * 0xFFFFFFFF)) >>> 0;
    _mercSeed = seed;
    const rng = _makeRng(seed);
    const count = 18 + Math.floor(rng() * 13); // 18-30
    const used = new Set();
    const list = [];
    for (let i = 0; i < count; i++) {
      let name;
      do {
        const fn = _firstNames[Math.floor(rng() * _firstNames.length)];
        const ln = _lastNames[Math.floor(rng() * _lastNames.length)];
        name = `${fn} ${ln}`;
      } while (used.has(name));
      used.add(name);

      const cls    = _classes[Math.floor(rng() * _classes.length)];
      const rank   = ['E','E','E','D','D','C','C','B','A','S'][Math.floor(rng() * 10)];
      const lvl    = 1 + Math.floor(rng() * 20);
      const status = _statuses[Math.floor(rng() * _statuses.length)];
      const stats  = _generateStats(rank, lvl, rng);
      list.push({ id: i, name, cls, rank, lvl, status, color: _rankColors[rank], ...stats });
    }
    return list;
  }

  function getMercs() {
    if (!_mercs) _mercs = _generate();
    return _mercs;
  }

  // ── HIRE SYSTEM ──────────────────────────────────────────────
  // Ранговая иерархия найма:
  // B → может нанимать любых (E/D/C/B не включительно — только ниже себя)
  // A → может нанимать до B включительно
  // S → может нанимать до A включительно
  // Нельзя нанимать равного или выше себя по рангу
  const _rankOrder = { E:0, D:1, C:2, B:3, A:4, S:5 };
  const _minPlayerRankToHire = 3; // B = rankOrder 3

  // Вычисляет шанс согласия наёмника в зависимости от его уровня и ранга
  function _agreeChance(merc) {
    const base = 0.70;
    const lvlPenalty = merc.lvl * 0.012; // высокоуровневые сложнее
    const rankPenalty = _rankOrder[merc.rank] * 0.06;
    return Math.max(0.10, base - lvlPenalty - rankPenalty);
  }

  // Можно ли игроку (с текущим рангом гильдии) нанять данного наёмника
  function canHire(mercId) {
    const mercs = getMercs();
    const merc  = mercs.find(m => m.id === mercId);
    if (!merc) return { ok: false, reason: 'not_found' };
    if (merc.hired)   return { ok: false, reason: 'already_hired' };
    if (merc.refused) return { ok: false, reason: 'refused' };

    const playerRankIdx = typeof GuildSystem !== 'undefined' ? GuildSystem.getRankIdx() : 0;
    const playerRankKey = QuestConfig.ranks[playerRankIdx]?.key || 'E';
    const playerRO      = _rankOrder[playerRankKey] ?? 0;
    const mercRO        = _rankOrder[merc.rank] ?? 0;

    if (playerRO < _minPlayerRankToHire) {
      return { ok: false, reason: 'rank_too_low', needRank: 'B' };
    }
    // Нельзя нанимать равного или выше (по рангу гильдии)
    if (mercRO >= playerRO) {
      return { ok: false, reason: 'merc_rank_too_high' };
    }
    return { ok: true, agreeChance: _agreeChance(merc) };
  }

  // Попытка нанять наёмника. Возвращает { success, msg }
  function hireMerc(mercId) {
    const check = canHire(mercId);
    if (!check.ok) {
      const reasons = {
        already_hired:    'Этот наёмник уже нанят.',
        refused:          'Этот наёмник отказался работать с вами.',
        not_found:        'Наёмник не найден.',
        rank_too_low:     `Нужен ранг гильдии B или выше для найма.`,
        merc_rank_too_high: 'Нельзя нанимать наёмников равного или более высокого ранга.',
      };
      return { success: false, msg: reasons[check.reason] || 'Найм невозможен.' };
    }

    const mercs = getMercs();
    const merc  = mercs.find(m => m.id === mercId);
    const roll  = Math.random();

    if (roll <= check.agreeChance) {
      merc.hired = true;
      merc.hiredAt = Date.now();
      // При ранге A/S — у наёмника могут быть свои подчинённые (только ниже рангом)
      if ((_rankOrder[merc.rank] ?? 0) >= _rankOrder['B']) {
        merc.subordinates = _buildSubordinates(merc);
      }
      EventBus.emit('guild:updated');
      return { success: true, msg: `${merc.name} согласился и вступил в отряд!` };
    } else {
      merc.refused = true; // permanent block
      EventBus.emit('guild:updated');
      return { success: false, msg: `${merc.name} отказался. Он больше не доступен для найма.` };
    }
  }

  // Создаём подчинённых для нанятого наёмника ранга B+
  function _buildSubordinates(merc) {
    const mercRO = _rankOrder[merc.rank] ?? 0;
    if (mercRO < _rankOrder['B']) return [];
    // Подчинённые: 1-3 NPC рангом ниже
    const count = 1 + Math.floor(Math.random() * 3);
    const subordinateRanks = Object.keys(_rankOrder).filter(r => (_rankOrder[r] ?? 0) < mercRO);
    const subs = [];
    for (let i = 0; i < count; i++) {
      const sRank = subordinateRanks[Math.floor(Math.random() * subordinateRanks.length)];
      const fn    = _firstNames[Math.floor(Math.random() * _firstNames.length)];
      const ln    = _lastNames[Math.floor(Math.random() * _lastNames.length)];
      const cls   = _classes[Math.floor(Math.random() * _classes.length)];
      const lvl   = 1 + Math.floor(Math.random() * 10);
      subs.push({
        id:   `sub_${merc.id}_${i}`,
        name: `${fn} ${ln}`,
        rank: sRank,
        cls,
        lvl,
        color: _rankColors[sRank],
        // Подчинённые подчинённого (только для ранга A+)
        subordinates: (_rankOrder[sRank] ?? 0) >= _rankOrder['B']
          ? _buildSubordinates({ id: `sub_${merc.id}_${i}`, rank: sRank })
          : [],
      });
    }
    return subs;
  }

  function getHiredMercs() {
    return getMercs().filter(m => m.hired);
  }

  // ── PARTY BONUS SYSTEM ───────────────────────────────────────
  // Конвертирует накопленные наёмником "живые" статы (score/kills/raids)
  // в боевые характеристики, добавляемые к игроку.
  // Коэффициенты подобраны так, чтобы вклад был значимым, но не ломал баланс.
  const _COMBAT_SCALE = {
    // score → atk/def/hp (ранг влияет через score)
    atkPerScore:  0.0003,
    defPerScore:  0.0002,
    hpPerScore:   0.004,
    mpPerScore:   0.001,
    // kills → crit (небольшой бонус за опыт убийств)
    critPerKill:  0.000005,
    // raids → spd (ветеран рейдов чуть быстрее)
    spdPerRaid:   0.02,
  };

  /**
   * Переводит "живые" статы одного юнита (наёмника или подчинённого)
   * в боевые характеристики игрока.
   * @param {{ score:number, kills:number, raids:number }} unit
   * @returns {{ atk:number, def:number, spd:number, crit:number, maxHp:number, maxMp:number }}
   */
  function _mercToCombatStats(unit) {
    const s = unit.score  || 0;
    const k = unit.kills  || 0;
    const r = unit.raids  || 0;
    return {
      atk:   Math.floor(s * _COMBAT_SCALE.atkPerScore),
      def:   Math.floor(s * _COMBAT_SCALE.defPerScore),
      maxHp: Math.floor(s * _COMBAT_SCALE.hpPerScore),
      maxMp: Math.floor(s * _COMBAT_SCALE.mpPerScore),
      crit:  parseFloat((k * _COMBAT_SCALE.critPerKill).toFixed(6)),
      spd:   parseFloat((r * _COMBAT_SCALE.spdPerRaid).toFixed(4)),
    };
  }

  /**
   * Рекурсивно собирает боевые характеристики всего дерева подчинённых.
   * @param {Array} subs  - массив subordinates
   * @param {Object} acc  - аккумулятор { atk, def, spd, crit, maxHp, maxMp }
   */
  function _collectTree(subs, acc) {
    if (!Array.isArray(subs)) return;
    for (const sub of subs) {
      const cs = _mercToCombatStats(sub);
      acc.atk   += cs.atk;
      acc.def   += cs.def;
      acc.maxHp += cs.maxHp;
      acc.maxMp += cs.maxMp;
      acc.crit  += cs.crit;
      acc.spd   += cs.spd;
      // Рекурсия: подчинённые подчинённых (ранг A/S наёмников)
      _collectTree(sub.subordinates, acc);
    }
  }

  /**
   * Возвращает суммарный боевой бонус от всех нанятых наёмников
   * и их подчинённых (рекурсивно по всему дереву).
   *
   * Логика:
   *  - Ранг B игрока → нанимает наёмников, их статы суммируются.
   *  - Ранг A/S → нанятые наёмники ранга B/A сами имеют подчинённых;
   *    статы всего дерева складываются с характеристиками героя.
   *
   * @param {string} field - 'atk'|'def'|'spd'|'crit'|'maxHp'|'maxMp'
   * @returns {number}
   */
  function getPartyBonus(field) {
    const hired = getHiredMercs();
    if (!hired.length) return 0;

    const acc = { atk: 0, def: 0, spd: 0, crit: 0, maxHp: 0, maxMp: 0 };

    for (const merc of hired) {
      // Вклад самого наёмника
      const cs = _mercToCombatStats(merc);
      acc.atk   += cs.atk;
      acc.def   += cs.def;
      acc.maxHp += cs.maxHp;
      acc.maxMp += cs.maxMp;
      acc.crit  += cs.crit;
      acc.spd   += cs.spd;
      // Вклад всех подчинённых рекурсивно (ранг A/S имеют subordinates)
      _collectTree(merc.subordinates, acc);
    }

    // crit и spd возвращаем как float, остальное как int
    if (field === 'crit' || field === 'spd') return acc[field] || 0;
    return Math.floor(acc[field] || 0);
  }

  function toSave() { return { mercs: _mercs, mercSeed: _mercSeed }; }

  // Старые прозвища из предыдущей версии — при загрузке заменяем
  const _oldLastNames = new Set([
    'Камень','Тень','Клинок','Буря','Огонь','Лёд','Ветер','Скала','Волк','Орёл',
    'Гром','Свет','Тьма','Кровь','Сталь','Зола','Дым','Пламя','Мрак','Звезда',
    'Дракон','Лис','Медведь','Ворон','Змея','Лев','Сокол','Тигр','Призрак','Шторм',
    'Железный','Северный','Быстрый','Грозовой','Беспощадный','Неустрашимый',
    'Непоколебимый','Стойкий','Бесстрашный','Верный','Угрюмый','Хладнокровный',
    'Закалённый','Суровый','Дерзкий','Непреклонный','Молчаливый',
    'Чёрный Волк','Серебряный Лист','Лесной Странник','Каменный Кулак',
    'Лунная Тень','Железная Рука','Северный Ветер','Острый Клинок',
    'Тёмный Путь','Огненный Взгляд','Стальная Воля','Золотой Клык',
    'Дикий Ворон','Седой Медведь','Кровавый Рассвет','Тихий Охотник',
    'Вечный Страж','Ледяной Кулак','Туманный Берег','Морской Волк',
    'Старый Дуб','Серый Сокол','Скальный Страж','Синий Огонь',
    'Острый Глаз','Твёрдая Рука','Ночной Скиталец',
    'Речной Бродяга','Горный Зверь','Вольный Ветер',
  ]);

  function _fixOldName(name) {
    const parts = name.split(' ');
    const lastName = parts.slice(1).join(' ');
    if (!lastName || _oldLastNames.has(lastName)) {
      const fn = parts[0];
      const ln = _lastNames[Math.floor(Math.random() * _lastNames.length)];
      return `${fn} ${ln}`;
    }
    return name;
  }

  function fromSave(d) {
    if (d?.mercs?.length) {
      if (d.mercSeed) _mercSeed = d.mercSeed; // восстанавливаем seed
      _mercs = d.mercs.map(m => {
        const fixed = { ...m, name: _fixOldName(m.name) };
        // Если у старого наёмника нет живых статов — генерируем
        if (fixed.score == null) {
          const s = _generateStats(fixed.rank || 'E', fixed.lvl || 1, Math.random.bind(Math));
          Object.assign(fixed, s);
        }
        return fixed;
      });
    } else {
      _mercs = _generate();
    }
  }

  // Живое накопление статов наёмниками при каждом убийстве игрока
  function tick() {
    if (!_mercs) return;
    _mercs.forEach(m => {
      // Каждый наёмник зарабатывает немного, пропорционально рангу
      const rankMult = { E:1, D:4, C:15, B:50, A:150, S:400 }[m.rank] || 1;
      if (Math.random() < 0.25) { // активны ~25% наёмников на каждый тик
        const earnedScore = Math.floor((1 + Math.random() * 3) * rankMult);
        const earnedGold  = Math.floor(earnedScore * (1 + Math.random() * 1.5));
        const earnKill    = Math.random() < 0.15 ? 1 : 0;
        m.score  = (m.score  || 0) + earnedScore;
        m.gold   = (m.gold   || 0) + earnedGold;
        m.kills  = (m.kills  || 0) + earnKill;
        // Редко сходить в рейд
        if (Math.random() < 0.002) m.raids = (m.raids || 0) + 1;
        // Обновить статус
        if (Math.random() < 0.05) m.status = _statuses[Math.floor(Math.random() * _statuses.length)];
      }
    });
  }

  // New hero → fresh roster; loaded game → restored via State.fromSave → MercSystem.fromSave
  EventBus.on('game:newHero', () => { _mercs = _generate(); });
  EventBus.on('kill:recorded', () => { tick(); });

  return { getMercs, getHiredMercs, hireMerc, canHire, tick, toSave, fromSave, getPartyBonus };
})();
