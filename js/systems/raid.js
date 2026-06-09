const RaidSystem = (() => {
  // ── Boss templates ──
  const _bossTemplates = [
    { id:'goblin_king',   name:'Король гоблинов',  av:'👑',  zone:'forest',    minRank:'E', xp:300,  gold:[80,160],   hp:800,   atk:45,  def:12 },
    { id:'swamp_lord',    name:'Владыка болот',     av:'🧌',  zone:'swamp',     minRank:'E', xp:600,  gold:[160,320],  hp:1800,  atk:85,  def:25 },
    { id:'crypt_tyrant',  name:'Тиран катакомб',   av:'💀',  zone:'catacombs', minRank:'D', xp:1200, gold:[320,640],  hp:3500,  atk:160, def:45 },
    { id:'grave_warden',  name:'Страж некрополя',  av:'⚰️', zone:'cemetery',  minRank:'D', xp:2000, gold:[500,1000], hp:6000,  atk:250, def:70 },
    { id:'sand_pharaoh',  name:'Фараон пустыни',   av:'🏺',  zone:'desert',    minRank:'C', xp:3500, gold:[900,1800], hp:10000, atk:380, def:100 },
    { id:'city_overlord', name:'Повелитель руин',  av:'🗿',  zone:'lostcity',  minRank:'C', xp:5500, gold:[1400,2800],hp:16000, atk:550, def:140 },
    { id:'shadow_titan',  name:'Теневой титан',    av:'🌑',  zone:'ravine',    minRank:'B', xp:8000, gold:[2200,4400],hp:25000, atk:800, def:200 },
    { id:'volcano_demon', name:'Вулканический дем.',av:'🌋', zone:'volcano',   minRank:'B', xp:12000,gold:[3500,7000],hp:40000, atk:1100,def:280 },
    { id:'frost_colossus',name:'Морозный колосс',  av:'❄️', zone:'tundra',    minRank:'A', xp:18000,gold:[5500,11000],hp:65000,atk:1600,def:400 },
    { id:'abyss_sovereign',name:'Суверен Бездны',  av:'👿', zone:'abyss',     minRank:'S', xp:30000,gold:[9000,18000],hp:120000,atk:2500,def:600},
  ];

  const _npcNames = ['Аркан','Брод','Гарт','Дейн','Зорн','Корд','Марк','Торн','Эйра','Кира','Мира','Вика'];
  const _npcClasses = ['⚔️','🗡️','🏹','🔮','🛡️','⚜️'];

  // ── State ──
  let _raids        = [];   // активные рейды
  let _cooldown     = 0;
  let _killCount    = 0;
  let _spawnTimeout = null; // таймер отложенного спауна босса

  // ── RaidStateGuard: защита от двойного завершения ──
  // Используем raid._resolving + raid._cleanupTimeout

  // ── RaidSessionManager: игрок в одном рейде одновременно ──
  function _playerActiveRaid() {
    return _raids.find(r => r.playerJoined && r.status !== 'victory' && r.status !== 'defeat') || null;
  }

  // ── RaidCleanupManager: корректная очистка ──
  function _cleanupRaid(raid) {
    if (raid.simInterval)    { clearInterval(raid.simInterval);    raid.simInterval = null; }
    if (raid._cleanupTimeout){ clearTimeout(raid._cleanupTimeout); raid._cleanupTimeout = null; }
  }

  function _removeFromActive(raid) {
    // Удаляем рейд из массива (boss исчезает из мира)
    const idx = _raids.indexOf(raid);
    if (idx !== -1) _raids.splice(idx, 1);
    EventBus.emit('raid:removed', raid);
    EventBus.emit('raid:updated', raid);
  }

  // ── Spawn logic ──
  // Задержка появления босса зависит от его силы:
  //   слабые боссы (hp < 5000)  → 5–15 минут
  //   средние (hp < 20000)      → 15–60 минут
  //   сильные (hp < 60000)      → 1–3 часа
  //   легендарные (hp ≥ 60000)  → 2–6 часов
  function _calcSpawnDelay(tmpl) {
    const hp = tmpl.hp;
    let minMs, maxMs;
    if      (hp < 5000)  { minMs = 5  * 60000; maxMs = 15  * 60000; }
    else if (hp < 20000) { minMs = 15 * 60000; maxMs = 60  * 60000; }
    else if (hp < 60000) { minMs = 60 * 60000; maxMs = 180 * 60000; }
    else                 { minMs = 120* 60000; maxMs = 360 * 60000; }
    return minMs + Math.random() * (maxMs - minMs);
  }

  // Фактический спаун — принимает уже выбранный шаблон
  // (объявлен раньше _scheduleRaidSpawn выше, здесь тело)
  function _spawnRaidWithTemplate(tmpl) {
    const scaleLv = State.hero?.level || 1;
    const scaleMult = 1 + scaleLv * 0.08;

    const partySize = 3 + Math.floor(Math.random() * 4);
    const party = Array.from({ length: partySize }, (_, i) => ({
      id:    `npc_${Date.now()}_${i}`,
      name:  _npcNames[Math.floor(Math.random() * _npcNames.length)],
      cls:   _npcClasses[Math.floor(Math.random() * _npcClasses.length)],
      rank:  ['E','D','C'][Math.floor(Math.random() * 3)],
      hp:    100 + Math.floor(Math.random() * 200),
      maxHp: 100 + Math.floor(Math.random() * 200),
      atk:   10  + Math.floor(Math.random() * 30),
      alive: true,
    }));

    const bossHp = Math.floor(tmpl.hp * scaleMult);
    const raid = {
      id:        `raid_${Date.now()}`,
      bossId:    tmpl.id,
      bossName:  tmpl.name,
      bossAv:    tmpl.av,
      bossHp,
      bossMaxHp: bossHp,
      bossAtk:   Math.floor(tmpl.atk * scaleMult),
      bossDef:   Math.floor(tmpl.def * scaleMult),
      party,
      playerJoined:      false,
      playerContrib:     0,
      playerAttackUsed:  false,   // FIX: флаг разовой атаки
      totalDmgDealt:     0,
      status:   'open',
      log:      [],
      reward:   {
        xp:   Math.floor(tmpl.xp * scaleMult),
        gold: [Math.floor(tmpl.gold[0] * scaleMult), Math.floor(tmpl.gold[1] * scaleMult)],
        gxp:  Math.floor(tmpl.xp * 0.15),
      },
      createdAt:      Date.now(),
      simInterval:    null,
      _resolving:     false,
      _cleanupTimeout: null,
    };

    _raids.push(raid);
    if (_raids.length > 5) _raids.shift();
    _log(raid, `🔥 Рейд начат: ${tmpl.name} обнаружен!`, 'rl-d');
    UISystem.showToast(`⚔️ Рейд! ${tmpl.name} атакует!`);
    EventBus.emit('raid:spawned', raid);
    _startSimulation(raid);
  }

  // ── NPC autonomous simulation ──
  function _startSimulation(raid) {
    if (raid.simInterval) clearInterval(raid.simInterval);
    raid.simInterval = setInterval(() => _simTick(raid), 4000);
  }

  function _simTick(raid) {
    // FIX: двойная проверка — статус + флаг _resolving
    if (raid.status === 'victory' || raid.status === 'defeat' || raid._resolving) {
      clearInterval(raid.simInterval);
      raid.simInterval = null;
      return;
    }
    if (raid.status === 'open') raid.status = 'active';

    const aliveNpcs = raid.party.filter(n => n.alive);
    const anyAlive  = aliveNpcs.length > 0 || raid.playerJoined;

    // FIX: если все мертвы И игрока нет (или игрок уже покинул) — вайп
    if (!anyAlive) {
      _defeatRaid(raid); return;
    }

    // NPC атакуют босса (только живые)
    if (aliveNpcs.length > 0) {
      let totalNpcDmg = 0;
      aliveNpcs.forEach(npc => {
        const dmg = Math.max(1, npc.atk - Math.floor(raid.bossDef * 0.3) + Math.floor(Math.random() * 10));
        totalNpcDmg += dmg;
      });
      raid.bossHp = Math.max(0, raid.bossHp - totalNpcDmg);
      raid.totalDmgDealt += totalNpcDmg;
      _log(raid, `⚔️ NPC наносят ${totalNpcDmg} урона (HP босса: ${raid.bossHp})`, 'rl-p');

      if (raid.bossHp <= 0) { _victoryRaid(raid); return; }

      // FIX: босс бьёт только если есть живые NPC (избегаем target=undefined)
      const target = aliveNpcs[Math.floor(Math.random() * aliveNpcs.length)];
      if (target) {
        const bossDmg = Math.max(1, Math.floor(raid.bossAtk * (0.6 + Math.random() * 0.4)));
        target.hp = Math.max(0, target.hp - bossDmg);
        if (target.hp <= 0) {
          target.alive = false;
          _log(raid, `💀 ${target.name} пал!`, 'rl-d');
        }
      }
    } else if (raid.playerJoined) {
      // Только игрок остался — босс атакует игрока
      const bossDmgToPlayer = Math.max(1, Math.floor(raid.bossAtk * 0.2));
      if (State.hero) {
        State.setHeroHp(Math.max(1, State.hero.hp - bossDmgToPlayer)); // рейд-босс не убивает
        _log(raid, `🔥 Босс атакует вас: ${bossDmgToPlayer} урона!`, 'rl-d');
      }
    }

    EventBus.emit('raid:updated', raid);
  }

  function _victoryRaid(raid) {
    if (raid._resolving) return;
    raid._resolving = true;
    _cleanupRaid(raid);
    raid.status = 'victory';
    _log(raid, `🏆 Босс повержен!`, 'rl-v');

    if (raid.playerJoined) {
      const contrib = raid.totalDmgDealt > 0
        ? Math.min(1, raid.playerContrib / raid.totalDmgDealt)
        : 0.1;
      const xpEarned   = Math.max(1, Math.floor(raid.reward.xp   * contrib));
      const [gMin, gMax] = raid.reward.gold;
      const goldEarned  = Math.max(1, Math.floor((gMin + Math.random() * (gMax - gMin)) * contrib));
      const gxpEarned   = Math.max(1, Math.floor(raid.reward.gxp * contrib));

      PlayerSystem.gainXp(xpEarned);
      State.addGold(goldEarned);
      GuildSystem.addGuildXp(gxpEarned);

      const pct = Math.round(contrib * 100);
      UISystem.showToast(`🏆 Рейд! Вклад ${pct}% → +${xpEarned}XP +${goldEarned}💰`);
      UISystem.log(`🏆 Рейд завершён (вклад ${pct}%): +${xpEarned}XP +${goldEarned}💰`, 'ls');
      _log(raid, `💰 Ваш вклад: ${pct}% → +${xpEarned}XP +${goldEarned}💰`, 'rl-v');
    }

    RankingSystem.recordRaidVictory();
    if (raid.bossName) {
      State._bossKills[raid.bossName] = (State._bossKills[raid.bossName] || 0) + 1;
    }

    // Автовыход игрока из завершённого рейда
    raid.playerJoined = false;

    EventBus.emit('raid:victory', raid);
    EventBus.emit('raid:updated', raid);
    SaveSystem.autosave();

    // Через 5 минут удалить завершённый рейд
    raid._cleanupTimeout = setTimeout(() => _removeFromActive(raid), 5 * 60 * 1000);
  }

  function _defeatRaid(raid) {
    // FIX: единственная точка вызова — guard _resolving
    if (raid._resolving) return;
    raid._resolving = true;
    _cleanupRaid(raid);
    raid.status = 'defeat';
    _log(raid, `☠️ Рейд провалился — все пали!`, 'rl-d');
    UISystem.showToast('☠️ Рейд провалился. Босс остался жив.');
    // Никаких наград, никаких достижений
    EventBus.emit('raid:defeat', raid);
    EventBus.emit('raid:updated', raid);
    SaveSystem.autosave();

    // FIX: 5-минутный таймер — потом босс исчезает
    raid._cleanupTimeout = setTimeout(() => _removeFromActive(raid), 5 * 60 * 1000);
  }

  function _log(raid, msg, cls = '') {
    raid.log.unshift({ msg, cls, t: Date.now() });
    if (raid.log.length > 12) raid.log.pop();
  }

  // ── Public: игрок присоединяется ──
  function joinRaid(raidId) {
    const raid = _raids.find(r => r.id === raidId);
    if (!raid || raid.playerJoined) return false;
    if (raid.status === 'victory' || raid.status === 'defeat') {
      UISystem.showToast('⚠️ Рейд уже завершён!'); return false;
    }

    // FIX: RaidSessionManager — один рейд одновременно
    const existingRaid = _playerActiveRaid();
    if (existingRaid && existingRaid.id !== raidId) {
      UISystem.showToast('⚠️ Вы уже участвуете в другом рейде! Сначала покиньте его.');
      return false;
    }

    const rankOrder = ['E','D','C','B','A','S'];
    const boss = _bossTemplates.find(b => b.id === raid.bossId);
    const reqRankIdx = boss ? rankOrder.indexOf(boss.minRank) : 0;
    if (GuildSystem.getRankIdx() < reqRankIdx) {
      UISystem.showToast(`⚠️ Требуется ранг ${boss.minRank}!`); return false;
    }

    raid.playerJoined     = true;
    raid.playerAttackUsed = false;
    if (raid.status === 'open') raid.status = 'active';
    _log(raid, `🦸 ${State.hero?.name || 'Герой'} присоединился к рейду!`, 'rl-v');
    UISystem.showToast('⚔️ Вы в рейде!');
    EventBus.emit('raid:joined', raid);
    EventBus.emit('raid:updated', raid);
    return true;
  }

  // ── Public: игрок атакует босса (один раз за рейд) ──
  function attackBoss(raidId) {
    const raid = _raids.find(r => r.id === raidId);
    if (!raid || !raid.playerJoined || raid.status !== 'active') return false;
    if (raid.bossHp <= 0 || raid._resolving) return false;

    // FIX: разовая атака
    if (raid.playerAttackUsed) {
      UISystem.showToast('⚠️ Обычная атака уже использована! Используйте метательное оружие.');
      return false;
    }
    raid.playerAttackUsed = true;

    const dmg = Math.max(1, CombatSystem.calcDamage(State.totalAtk, raid.bossDef));
    const crit = CombatSystem.isCrit(State.totalCrit);
    const finalDmg = crit ? Math.floor(dmg * GameConfig.combat.critMultiplier) : dmg;

    raid.bossHp = Math.max(0, raid.bossHp - finalDmg);
    raid.playerContrib += finalDmg;
    raid.totalDmgDealt += finalDmg;

    const msg = crit ? `💥 КРИТ! ${State.hero?.name}: ${finalDmg}` : `⚔️ ${State.hero?.name}: ${finalDmg}`;
    _log(raid, msg, 'rl-p');
    UISystem.showToast(`⚔️ Атака использована! Урон: ${finalDmg}. Теперь только метательное оружие.`);

    const bossDmgToPlayer = Math.max(1, Math.floor(raid.bossAtk * 0.15));
    if (State.hero) {
      State.setHeroHp(Math.max(1, State.hero.hp - bossDmgToPlayer)); // рейд-босс не убивает
    }

    if (raid.bossHp <= 0) { _victoryRaid(raid); }
    else EventBus.emit('raid:updated', raid);
    return true;
  }

  // ── Public: покинуть рейд в любой момент ──
  function leaveRaid(raidId) {
    const raid = _raids.find(r => r.id === raidId);
    if (!raid || !raid.playerJoined) return false;

    raid.playerJoined     = false;
    raid.playerContrib    = 0;
    raid.playerAttackUsed = false;
    _log(raid, `🚶 ${State.hero?.name || 'Герой'} покинул рейд`, '');
    UISystem.showToast('Вы покинули рейд');

    // Если все NPC мертвы и игрок ушёл — рейд провален
    const aliveNpcs = raid.party.filter(n => n.alive);
    if (!aliveNpcs.length && !raid._resolving) {
      _defeatRaid(raid);
    } else {
      EventBus.emit('raid:updated', raid);
    }
    return true;
  }

  function getRaids()   { return _raids; }
  function getActive()  { return _raids.filter(r => r.status === 'open' || r.status === 'active'); }

  // ── Public: бросить метательное оружие ──
  function throwWeapon(raidId, itemIdx) {
    const raid = _raids.find(r => r.id === raidId);
    if (!raid || !raid.playerJoined || raid.status !== 'active') return false;
    if (raid.bossHp <= 0 || raid._resolving) return false;

    const item = State.inventory[itemIdx];
    if (!item || item.type !== 'throwing') {
      UISystem.showToast('🎯 Нет метательного оружия!');
      return false;
    }

    const dmg = item.raidDmg || 0;
    raid.bossHp = Math.max(0, raid.bossHp - dmg);
    raid.playerContrib += dmg;
    raid.totalDmgDealt += dmg;

    if (item.stackable && (item.count || 1) > 1) {
      item.count--;
    } else {
      State.removeFromInventory(itemIdx);
    }

    _log(raid, `${item.ico} ${State.hero?.name}: ${item.name} — ${dmg} урона!`, 'rl-p');
    UISystem.showToast(`${item.ico} ${item.name}: ${dmg} урона!`);

    if (raid.bossHp <= 0) { _victoryRaid(raid); }
    else EventBus.emit('raid:updated', raid);
    SaveSystem.autosave();
    return true;
  }

  // ── Kill → spawn trigger ──
  EventBus.on('kill:recorded', ({ total }) => {
    _killCount++;
    if (_killCount >= _cooldown) {
      _cooldown = 15 + Math.floor(Math.random() * 20);
      _killCount = 0;
      if (Math.random() < 0.65) _scheduleRaidSpawn();
    }
  });

  // Планирует появление случайного босса с задержкой, зависящей от силы босса
  function _scheduleRaidSpawn() {
    if (_spawnTimeout) return; // уже запланирован спаун — не дублируем

    const zone    = State.zone?.id || 'forest';
    const rankIdx = GuildSystem.getRankIdx();
    const rankOrder = ['E','D','C','B','A','S'];
    const available = _bossTemplates.filter(b => {
      const bRankIdx = rankOrder.indexOf(b.minRank);
      return bRankIdx <= rankIdx && (b.zone === zone || Math.random() < 0.3);
    });
    if (!available.length) return;

    const tmpl  = available[Math.floor(Math.random() * available.length)];
    const delay = _calcSpawnDelay(tmpl);
    const mins  = Math.round(delay / 60000);
    const label = mins >= 60 ? `${(mins/60).toFixed(1)}ч` : `${mins}мин`;
    UISystem.showToast(`⚠️ ${tmpl.name} приближается… (~${label})`);

    _spawnTimeout = setTimeout(() => {
      _spawnTimeout = null;
      _spawnRaidWithTemplate(tmpl);
    }, delay);
  }

  EventBus.on('game:newHero', () => {
    _raids.forEach(r => _cleanupRaid(r));
    _raids = []; _killCount = 0; _cooldown = 10;
    if (_spawnTimeout) { clearTimeout(_spawnTimeout); _spawnTimeout = null; }
  });

  EventBus.on('raid:updated', () => {
    if (typeof NavSystem !== 'undefined' && NavSystem.current === 'guild') {
      EventBus.emit('guild:updated');
    }
  });

  function toSave() {
    return {
      raids: _raids.slice(-3).map(r => ({ ...r, simInterval: null, _cleanupTimeout: null })),
      cooldown: _cooldown,
      killCount: _killCount,
    };
  }

  function fromSave(d) {
    if (!d) return;
    _raids.forEach(r => _cleanupRaid(r));
    _raids     = (d.raids || []).map(r => ({ ...r, simInterval: null, _cleanupTimeout: null, _resolving: r._resolving || false }));
    _cooldown  = d.cooldown  || 10;
    _killCount = d.killCount || 0;
    // Перезапуск симуляции только для незавершённых рейдов
    _raids.filter(r => (r.status === 'active' || r.status === 'open') && !r._resolving).forEach(r => _startSimulation(r));
    // FIX: для завершённых рейдов запустить 5-мин таймер (если он был)
    _raids.filter(r => r.status === 'victory' || r.status === 'defeat').forEach(r => {
      const age = Date.now() - (r.createdAt || 0);
      const remaining = 5 * 60 * 1000 - age;
      if (remaining > 0) {
        r._cleanupTimeout = setTimeout(() => _removeFromActive(r), remaining);
      } else {
        // Уже истёк — удалить сразу
        setTimeout(() => _removeFromActive(r), 0);
      }
    });
  }

  return { joinRaid, attackBoss, throwWeapon, leaveRaid, getRaids, getActive, toSave, fromSave };
})();
