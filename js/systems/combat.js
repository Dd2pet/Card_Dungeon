const PlayerSystem = (() => {
  const prog = GameConfig.progression;

  // Экспоненциальная кривая XP
  function xpForLevel(level) {
    return Math.round(GameConfig.progression.xpNeededBase * Math.pow(prog.xpScaleFactor, level - 1));
  }

  function gainXp(amount) {
    const h = State.hero; if (!h) return;
    const prevLevel = h.level;
    h.xp += amount;
    EventBus.emit('player:xpGained', { amount, totalXp: h.xp, level: h.level });

    let leveled = false;
    while (h.xp >= h.xpNeeded) {
      h.xp -= h.xpNeeded;
      h.level++;
      h.xpNeeded = xpForLevel(h.level);

      // Прирост статов при левел-апе
      h.maxHp   += prog.levelHpGain;
      h.maxMp   += prog.levelMpGain;
      h.atk     += prog.levelAtkGain;
      h.def     += prog.levelDefGain;
      h.crit    = Math.min(0.95, (h.crit || 0) + prog.levelCritGain);
      h.hp = h.maxHp;
      h.mp = h.maxMp;
      leveled = true;
    }

    if (leveled) {
      EventBus.emit('player:levelUp', { level: h.level, stats: { hp: h.maxHp, mp: h.maxMp, atk: h.atk, def: h.def } });
      EventBus.emit('hero:levelUp', h.level); // совместимость с QuestSystem
    }
    EventBus.emit('hero:updated', h);
    return leveled;
  }

  function applyStatChange(statKey, delta) {
    const h = State.hero; if (!h || !(statKey in h)) return;
    h[statKey] += delta;
    EventBus.emit('player:statChange', { stat: statKey, delta, newVal: h[statKey] });
    EventBus.emit('hero:updated', h);
  }

  // Подписки PlayerSystem на внешние события
  EventBus.on('player:levelUp', ({ level }) => {
    UISystem.showLevelUpBanner(level);
    UISystem.flashGreen('card-p');
  });

  return { gainXp, xpForLevel, applyStatChange };
})();
const StatusRegistry = (() => {
  // ── Определения статусов ──
  const _defs = {
    poison: {
      id: 'poison',
      onApply(target, entity) {
        UISystem.log(`☠ ${target === 'player' ? 'Герой' : entity.name} отравлен!`, 'ls');
        UISystem.floatText('ЯД!', 'f-status', UISystem.$(target === 'player' ? 'card-p' : 'card-m'));
      },
      onTick(target, entity) {
        const dmg = Math.max(1, Math.floor(entity.maxHp * GameConfig.combat.poisonDamageRatio));
        entity.hp = Math.max(0, entity.hp - dmg);
        UISystem.floatText(`☠${dmg}`, 'f-pm', UISystem.$(target === 'player' ? 'card-p' : 'card-m'));
        UISystem.log(`☠ Яд: ${target === 'player' ? 'Герой' : entity.name} −${dmg}`, 'ls');
        EventBus.emit('combat:poisonTick', { target, damage: dmg });
      },
      onExpire(target, entity) {
        UISystem.log(`✨ Яд на ${target === 'player' ? 'герое' : entity.name} снят.`, 'li');
      },
    },
    stun: {
      id: 'stun',
      onApply(target, entity) {
        UISystem.log(`⚡ ${target === 'player' ? 'Герой' : entity.name} оглушён!`, 'lt');
        UISystem.floatText('СТАН!', 'f-status', UISystem.$(target === 'player' ? 'card-p' : 'card-m'));
      },
      onTick(target, entity) { /* стан только пропускает ход — обработка в _monsterTurn */ },
      onExpire(target, entity) {
        UISystem.log(`✨ Стан на ${target === 'player' ? 'герое' : entity.name} снят.`, 'li');
      },
    },
    rage: {
      id: 'rage',
      onApply(target, entity) {
        UISystem.log(`🔴 ${entity.name} впадает в ЯРОСТЬ!`, 'lm');
        UISystem.floatText('ЯРОСТЬ!', 'f-status', UISystem.$('card-m'));
      },
      onTick(target, entity) { /* rage-бонус применяется при расчёте урона */ },
      onExpire(target, entity) {
        UISystem.log(`✨ Ярость ${entity.name} угасла.`, 'li');
      },
    },
    fear: {
      id: 'fear',
      onApply(target, entity) {
        UISystem.log(`💜 Герой охвачен СТРАХОМ!`, 'lm');
        UISystem.floatText('СТРАХ!', 'f-status', UISystem.$('card-p'));
        UISystem.shake('card-p');
      },
      onTick(target, entity) { /* штраф к урону — применяется при playerAttack */ },
      onExpire(target, entity) {
        UISystem.log(`✨ Страх на герое рассеян.`, 'li');
      },
    },
  };

  // Применить статус: вызвать onApply + State.applyStatus
  function apply(target, statusId, duration) {
    const def = _defs[statusId];
    if (!def) return;
    const entity = target === 'player' ? State.hero : State.monster;
    State.applyStatus(target, statusId, duration);
    def.onApply(target, entity);
  }

  // Тикнуть все активные статусы для цели: onTick → State.tickStatuses → onExpire
  function tick(target) {
    const cs = State.combatState;
    const statuses = target === 'player' ? cs.playerStatuses : cs.monsterStatuses;
    const entity   = target === 'player' ? State.hero : State.monster;
    for (const [id] of Object.entries(statuses)) {
      _defs[id]?.onTick(target, entity);
    }
    const expired = State.tickStatuses(target);
    expired.forEach(id => _defs[id]?.onExpire(target, entity));
  }

  // Проверить, активен ли статус
  function has(target, statusId) {
    const cs = State.combatState;
    return !!(target === 'player' ? cs.playerStatuses : cs.monsterStatuses)[statusId];
  }

  // Получить определение (для чтения cooldown/effects в будущем)
  function get(statusId) { return _defs[statusId] || null; }

  return { apply, tick, has, get };
})();
const CombatSystem = (() => {
  const cfg = GameConfig.combat;

  function calcDamage(atk, def) {
    return Math.max(1, atk - Math.floor(def * cfg.defCoeff) + Math.floor(Math.random() * cfg.dmgVariance) - cfg.dmgVarOffset);
  }

  function isCrit(rate) { return Math.random() < rate; }

  function fleeChance(pSpd, mSpd) {
    return Math.min(cfg.fleeMaxChance, Math.max(cfg.fleeMinChance, pSpd / (pSpd + mSpd)));
  }

  // ── Логика статусов ──
  function calcPoisonDamage(maxHp) {
    return Math.max(1, Math.floor(maxHp * cfg.poisonDamageRatio));
  }

  // Попытка наложить случайный статус (для монстра-атакующего)
  function tryApplyStatus(target, sourceAtk, currentStatuses) {
    if (Math.random() > cfg.statusApplyChance) return null;
    const available = target === 'monster'
      ? ['poison', 'fear', 'stun']
      : ['poison', 'stun'];
    const id = available[Math.floor(Math.random() * available.length)];
    // Не накладывать уже активный статус
    if (currentStatuses && currentStatuses[id]) return null;
    return id;
  }

  // ── Монстерный AI ──
  const _aiStrategies = {
    // Обычный — атакует всегда
    balanced(monster, hero, heroCs) {
      return { type: 'attack' };
    },
    // Агрессивный — атакует с яростью при низком HP
    aggressive(monster, hero, heroCs) {
      if (monster.hp / monster.maxHp < 0.4 && !StatusRegistry.has('monster', 'rage')) {
        return { type: 'rage' };
      }
      return { type: 'attack' };
    },
    // Берсеркер — rage при возможности, сильный урон
    berserker(monster, hero, heroCs) {
      if (monster.hp / monster.maxHp < 0.6 && !StatusRegistry.has('monster', 'rage')) {
        return { type: 'rage' };
      }
      return { type: 'attack', multiplier: 1.2 };
    },
    // Защитный — пытается наложить страх при высоком HP героя
    defensive(monster, hero, heroCs) {
      if (hero.hp / hero.maxHp > 0.7 && !StatusRegistry.has('player', 'fear')) {
        return { type: 'fear' };
      }
      return { type: 'attack' };
    },
  };

  function getMonsterAction(monster, hero) {
    const strategy = _aiStrategies[monster.ai] || _aiStrategies.balanced;
    return strategy(monster, hero, State.combatState);
  }

  // ── Counter / атака ответа ──
  function calcCounterDamage(atk, def) {
    return Math.floor(calcDamage(atk, def) * cfg.counterMultiplier);
  }

  return { calcDamage, isCrit, fleeChance, calcPoisonDamage, tryApplyStatus, getMonsterAction, calcCounterDamage };
})();
const CombatController = (() => {
  const cfg = GameConfig.combat;

  // ── Утилиты ──
  function _setButtonsEnabled(enabled) {
    ['b-atk', 'b-ctr', 'b-skl', 'b-itm', 'b-fle'].forEach(id => {
      const el = UISystem.$(id);
      if (el) el.disabled = !enabled;
    });
  }

  // ── Обработка статусов в начале хода цели — делегирует в StatusRegistry ──
  function _processStatusEffects(target) {
    StatusRegistry.tick(target);
  }

  // ── Ход монстра ──
  function _monsterTurn() {
    if (!State.active || !State.monster) return;
    _setButtonsEnabled(false);

    _processStatusEffects('monster');
    if (!State.active || !State.monster || State.monster.hp <= 0) return;

    // Стан пропускает ход
    if (StatusRegistry.has('monster', 'stun')) {
      UISystem.log(`⚡ ${State.monster.name} оглушён — пропускает ход.`, 'lt');
      _processStatusEffects('player'); // XP-тик яда и пр.
      State.incrementTurn();
      _setButtonsEnabled(true);
      RenderSystem.buttons();
      return;
    }

    // Получаем действие AI
    const action = CombatSystem.getMonsterAction(State.monster, State.hero);

    if (action.type === 'rage') {
      StatusRegistry.apply('monster', 'rage');
      // После rage — тоже атакует
    }

    if (action.type === 'fear') {
      StatusRegistry.apply('player', 'fear');
      // Страх: следующий ход игрока наносит меньше урона (обработка при атаке)
    }

    // Атака монстра
    const rageBonus = StatusRegistry.has('monster', 'rage') ? 1.35 : 1.0;
    const multBonus = action.multiplier || 1.0;
    let dmg = Math.max(1, Math.floor(CombatSystem.calcDamage(State.monster.atk, State.totalDef) * rageBonus * multBonus));

    // Pet: dodge check
    const dodgeChance = State.totalDodge;
    if (dodgeChance > 0 && Math.random() < dodgeChance) {
      UISystem.floatText('УКЛОН!', 'f-heal', UISystem.$('card-p'));
      UISystem.log('💨 Уклонение от атаки!', 'ls');
      // still do status processing and turn inc
      _processStatusEffects('player');
      State.incrementTurn();
      EventBus.emit('hero:updated', State.hero);
      _setButtonsEnabled(true);
      RenderSystem.buttons();
      return;
    }

    // Pet: damage reduction
    const dmgReduction = State.totalDmgReduction;
    if (dmgReduction > 0) dmg = Math.max(1, Math.floor(dmg * (1 - dmgReduction)));

    // Pet: status resistances (chance to negate incoming status)
    // stored on action for later status application

    // Проверяем контратаку героя
    if (State.combatState.counterReady) {
      const counterDmg = CombatSystem.calcCounterDamage(State.totalAtk, State.monster.def);
      State.damageMonster(counterDmg);
      UISystem.floatText(`↩${counterDmg}`, 'f-cr', UISystem.$('card-m'));
      UISystem.log(`↩ Контратака: ${counterDmg} урона!`, 'lc');
      State.setCounterReady(false);
      RenderSystem.monster();
      EventBus.emit('combat:counter', { damage: counterDmg });
      if (State.monster.hp <= 0) {
        _handleVictory();
        return;
      }
    }

    // Страх снижает урон игрока, но не монстра — монстр всё равно бьёт
    State.damageHero(dmg);
    UISystem.floatText(`-${dmg}`, 'f-mm', UISystem.$('card-p'));
    UISystem.shake('card-p');
    UISystem.log(`${State.monster.name}: −${dmg} HP`, 'lm');

    // Попытка наложить статус на игрока
    const poisonId = CombatSystem.tryApplyStatus('player', null, State.combatState.playerStatuses);
    if (poisonId) {
      // Pet resistance check
      const resistKey = 'resist_' + (poisonId === 'stun' ? 'stun' : poisonId === 'poison' ? 'poison' : poisonId === 'fear' ? 'fear' : '');
      const resistVal = PetProgressionSystem.getMod(resistKey);
      if (resistVal > 0 && Math.random() < resistVal) {
        UISystem.floatText('СОПР.!', 'f-heal', UISystem.$('card-p'));
        UISystem.log(`🛡 Питомец: сопротивление ${poisonId}!`, 'ls');
      } else {
        StatusRegistry.apply('player', poisonId);
      }
    }

    EventBus.emit('hero:updated', State.hero);
    EventBus.emit('combat:monsterAttack', { damage: dmg });

    if (State.hero.hp <= 0) { _handleDeath(); return; }

    // MP реген
    State.hero.mp = Math.min(State.hero.maxMp, State.hero.mp + cfg.mpRegenPerTurn);
    _processStatusEffects('player');
    State.incrementTurn();
    EventBus.emit('hero:updated', State.hero);
    _setButtonsEnabled(true);
    RenderSystem.buttons();
  }

  // ── Победа ──
  function _handleVictory() {
    // Guard: если бой уже завершён (например, игрок сменил зону) — не обрабатывать
    if (!State.active && !State.monster) return;
    // Снимаем снапшот монстра ДО сброса состояния
    const m = State.monster;
    if (!m) return;
    State.setActive(false);
    _setButtonsEnabled(false);
    const xpRaw = Math.floor((m.xp + Math.floor(m.level * 5)) * (m._xpMult || 1) * (NpcSystem.getBuff('xp_boost')?.mult || 1));
    const xpGain = Math.floor(xpRaw * State.totalXpBonus);
    PlayerSystem.gainXp(xpGain);
    // Очистить истёкший XP-буст
    State.tickXpBoost();

    const [gMin, gMax] = m.gold;
    const goldRaw = Math.floor((gMin + Math.floor(Math.random() * (gMax - gMin + 1))) * (m._goldMult || 1));
    const goldGain = Math.floor(goldRaw * State.totalGoldBonus);
    State.addGold(goldGain);
    State.recordKill(m.name);
    State.addScore(xpGain + goldGain);

    // Pet XP bonus boss damage
    const isBoss = !!m._isBoss;
    const dropMult = (NpcSystem.getBuff('drop_boost') ? 1.5 : 1.0) * State.totalDropBonus;
    const drops = ProgressionSystem.rollLoot(m, dropMult);
    drops.forEach(item => InventorySystem.addLootToInventory(item));

    // Show pet bonus indicators in loot overlay
    const petBonusTxt = (() => {
      const parts = [];
      const pet = PetProgressionSystem.getEquippedPet();
      if (!pet) return '';
      if (State.totalGoldBonus > 1) parts.push(`🐾 +${Math.round((State.totalGoldBonus-1)*100)}% 💰`);
      if (State.totalXpBonus > 1)   parts.push(`🐾 +${Math.round((State.totalXpBonus-1)*100)}% XP`);
      return parts.join(' · ');
    })();

    UISystem.setText('l-mon',  `${m.av} ${m.name} повержен!`);
    UISystem.setText('l-xp',   `+${xpGain} XP${petBonusTxt ? '' : ''}`);
    UISystem.setText('l-gold', `+${goldGain} 💰`);
    if (petBonusTxt) {
      const petLine = document.getElementById('l-pet-bonus');
      if (petLine) petLine.textContent = petBonusTxt;
    }
    UISystem.setHTML('l-items', drops.length
      ? drops.map(d => {
          const rarCls = d.rarity ? `rarity-${d.rarity}` : '';
          const cursedTag = d.cursed ? `<span class="cursed-badge">💀 ПРОКЛЯТ</span>` : '';
          const stackInfo = d.stackable && d.count > 1 ? `<span class="stack-badge">×${d.count}</span>` : '';
          return `<div class="lrow"><div class="lico">${d.ico}</div><div class="linfo"><div class="lname ${rarCls}">${d.name}${stackInfo}${cursedTag}</div><div class="ldesc">${d.desc}</div></div></div>`;
        }).join('')
      : `<div class="lrow"><div class="lico">📭</div><div class="linfo"><div class="lname" style="color:var(--muted)">Предметов нет</div></div></div>`
    );
    UISystem.removeClass('loot-ov', 'hide');
    RenderSystem.buttons();
    SaveSystem.autosave();
    EventBus.emit('combat:victory', { monster: m, xp: xpGain, gold: goldGain, drops });
  }

  // ── Смерть ──
  function _handleDeath() {
    if (!State.active && !State.monster) return; // сессия уже завершена
    State.setActive(false);
    RenderSystem.buttons();
    UISystem.addClass('death-ov', 'show');
    EventBus.emit('combat:death', State.hero);
  }

  // ════════════════════════════════════════
  // Публичные действия игрока — эмитят события, не вызывают UI напрямую
  // ════════════════════════════════════════

  function playerAttack() {
    if (!State.active || !State.monster) return;
    EventBus.emit('player:action', { type: 'attack' });

    const fearPenalty = StatusRegistry.has('player', 'fear') ? 0.7 : 1.0;
    const crit = CombatSystem.isCrit(State.totalCrit);
    let dmg = Math.floor(CombatSystem.calcDamage(State.totalAtk, State.monster.def) * fearPenalty);
    // Pet: crit damage multiplier
    if (crit) dmg = Math.round(dmg * State.totalCritDmgMult);
    // Pet: boss damage bonus
    if (State.monster._isBoss) dmg = Math.round(dmg * State.totalBossDmgBonus);
    // Pet: type damage bonuses
    const mName = (State.monster.name || '').toLowerCase();
    const isUndead = ['скелет','зомби','призрак','вампир','некромант','лич','костяной'].some(k => mName.includes(k));
    const isBeast  = ['волк','медведь','кабан','тролль','гидра','дракон','скорпион','йети','феникс'].some(k => mName.includes(k));
    if (isUndead) dmg = Math.round(dmg * (1 + PetProgressionSystem.getMod('bonus_undead')));
    if (isBeast)  dmg = Math.round(dmg * (1 + PetProgressionSystem.getMod('bonus_beast')));

    State.damageMonster(dmg);
    RenderSystem.monster();
    UISystem.floatText(crit ? `💥${dmg}` : `-${dmg}`, crit ? 'f-cr' : 'f-pm', UISystem.$('card-m'));
    UISystem.shake('card-m');
    UISystem.log(crit ? `💥 КРИТ! Урон: ${dmg}` : `⚔ Удар: ${dmg}`, crit ? 'lc' : 'lp');

    // Попытка наложить статус на монстра
    const statusId = CombatSystem.tryApplyStatus('monster', null, State.combatState.monsterStatuses);
    if (statusId) {
      StatusRegistry.apply('monster', statusId);
    }

    if (State.monster.hp <= 0) { _handleVictory(); return; }
    RenderSystem.buttons();
    CombatSessionManager.safeTimeout(() => _monsterTurn(), cfg.monsterTurnDelay);
    EventBus.emit('combat:playerAttack', { damage: dmg, crit });
  }

  function playerCounter() {
    if (!State.active || !State.monster) return;
    EventBus.emit('player:action', { type: 'counter' });

    // Устанавливаем флаг готовности контратаки
    State.setCounterReady(true);
    UISystem.flashBlue('card-p');
    UISystem.log('🛡 Стойка контратаки!', 'lp');

    // Ход монстра сразу
    CombatSessionManager.safeTimeout(() => _monsterTurn(), cfg.monsterTurnDelay);
    EventBus.emit('combat:playerCounter', { ready: true });
  }

  function playerSkill() {
    if (!State.active || !State.monster) return;
    EventBus.emit('player:action', { type: 'skill' });

    const res = State.heroClass.useSkill(State.hero, State.monster);
    if (State.hero.mp < res.mpCost) { UISystem.showToast('⚡ Недостаточно MP!'); return; }
    State.hero.mp = Math.max(0, State.hero.mp - res.mpCost);

    if (res.damage > 0) {
      State.damageMonster(res.damage);
      RenderSystem.monster();
      UISystem.floatText(`✨${res.damage}`, 'f-cr', UISystem.$('card-m'));
      UISystem.shake('card-m');
    }
    if (res.heal > 0) {
      State.healHero(res.heal);
      UISystem.flashGreen('card-p');
      UISystem.floatText(`+${res.heal}`, 'f-heal', UISystem.$('card-p'));
    }
    UISystem.log(res.message, 'lc');
    EventBus.emit('hero:updated', State.hero);
    RenderSystem.buttons();
    if (State.monster.hp <= 0) { _handleVictory(); return; }
    CombatSessionManager.safeTimeout(() => _monsterTurn(), cfg.monsterTurnDelay);
    EventBus.emit('combat:playerSkill', res);
  }

  function playerUseItem() {
    if (!State.active || !State.monster) return;
    // Open picker — action event is emitted inside useItemInCombat after selection
    InventorySystem.useItemInCombat();
  }

  function playerFlee() {
    if (!State.active || !State.monster) return;
    EventBus.emit('player:action', { type: 'flee' });

    if (Math.random() < CombatSystem.fleeChance(State.totalSpd, State.monster.spd)) {
      State.setActive(false);
      UISystem.log('🚪 Побег удался!', 'li');
      UISystem.showToast('🚪 Сбежал!');
      RenderSystem.buttons();
      CombatSessionManager.safeTimeout(() => WorldSystem.spawnMonster(), 1400);
      EventBus.emit('combat:flee', { success: true });
    } else {
      UISystem.log('❌ Побег не удался!', 'li');
      CombatSessionManager.safeTimeout(() => _monsterTurn(), 400);
      EventBus.emit('combat:flee', { success: false });
    }
  }

  function respawn() {
    const prog = GameConfig.progression;
    // safeStartCombat: завершает предыдущий бой + guard от двойного спавна
    State.setHeroHp(Math.floor(State.totalMaxHp * prog.respawnHpFraction));
    State.hero.mp = State.totalMaxMp;
    State.hero.defBuff = 0;
    State.setGold(Math.floor(State.gold * prog.deathGoldPenalty));
    // Сбрасываем все боевые статусы (яд, страх и т.д.) — после смерти они должны сниматься
    State.clearAllStatuses('player');
    UISystem.removeClass('death-ov', 'show');
    UISystem.setHTML('log', '');
    UISystem.log('🔄 Возрождение (−30% кармана)', 'li');
    CombatSessionManager.safeStartCombat(() => WorldSystem.spawnMonster(), 'respawn');
    SaveSystem.autosave();
    EventBus.emit('hero:respawn', State.hero);
  }

  // Экспортируем _monsterTurn для InventorySystem (использование зелья в бою)
  return { playerAttack, playerCounter, playerSkill, playerUseItem, playerFlee, respawn, _monsterTurn, _handleVictory, _handleDeath };
})();
