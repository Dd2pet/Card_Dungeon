const ClassMechanicsSystem = (() => {

  // ══════════════════════════════════════
  // ВОИН — ярость + стойка
  // ══════════════════════════════════════

  // Пассив атаки воина: +ярость, ярость → бонус урона
  function warriorOnAttack(baseDmg) {
    const ws = ClassMechanicsState.warrior;
    // Накапливаем ярость (+8 за удар)
    ws.rage = Math.min(100, ws.rage + 8);
    // Бонус урона = до +35% при 100 ярости
    const rageMult = 1 + (ws.rage / 100) * 0.35;
    return Math.floor(baseDmg * rageMult);
  }

  // Пассив получения урона воином: +ярость, ярость → снижение входящего урона
  function warriorOnTakeDamage(incomingDmg) {
    const ws = ClassMechanicsState.warrior;
    ws.rage = Math.min(100, ws.rage + 5);
    // При ярости ≥ 50: -15% входящего урона (закалка)
    if (ws.rage >= 50) {
      incomingDmg = Math.floor(incomingDmg * 0.85);
    }
    // Боевая стойка: дополнительно -20% урона
    if (ws.stanceActive) {
      incomingDmg = Math.floor(incomingDmg * 0.80);
    }
    return incomingDmg;
  }

  // Стойка = контратака воина превращается в «Боевую стойку»
  function warriorCounter() {
    const ws = ClassMechanicsState.warrior;
    ws.stanceActive = true;
    ws.stanceTurns = 3;
    ws.rage = Math.min(100, ws.rage + 15);
    UISystem.log(`⚔️ Боевая стойка! DEF +20%, Ярость ${ws.rage}/100`, 'lp');
    UISystem.showToast('⚔️ Боевая стойка! 3 хода защиты');
  }

  // Тик стойки воина
  function warriorOnTurnEnd() {
    const ws = ClassMechanicsState.warrior;
    if (ws.stanceActive) {
      ws.stanceTurns--;
      if (ws.stanceTurns <= 0) {
        ws.stanceActive = false;
        UISystem.log('⚔️ Боевая стойка спала.', 'li');
      }
    }
    // Ярость медленно убывает вне боя (не убывает — это накопительный ресурс боя)
    _updateClassUI();
  }

  // ══════════════════════════════════════
  // ВОЛШЕБНИК — элементы + контроль
  // ══════════════════════════════════════

  function mageOnAttack(baseDmg) {
    const ms = ClassMechanicsState.mage;
    // Пассив: если горение активно — +15% урон
    if (ms.burnStacks > 0) baseDmg = Math.floor(baseDmg * 1.15);
    // Накапливаем маны от ударов (маг слабый физически, но эффективный)
    if (State.hero) {
      State.hero.mp = Math.min(State.hero.maxMp, (State.hero.mp || 0) + 2);
    }
    return baseDmg;
  }

  function mageOnTakeDamage(incomingDmg) {
    // Маг получает больше урона, но у него эффекты контроля
    // Если контроль активен — маг под защитой на этот ход (-10%)
    if (ClassMechanicsState.mage.controlTurns > 0) {
      incomingDmg = Math.floor(incomingDmg * 0.90);
    }
    return incomingDmg;
  }

  // Контратака мага = «Ледяной барьер» — замедление врага
  function mageCounter() {
    ClassMechanicsState.mage.controlTurns = 2;
    // Применяем slow через State напрямую (нет в StatusRegistry._defs, но State его поддержит)
    if (State.monster) {
      State.applyStatus('monster', 'slow', 2);
    }
    UISystem.log('❄️ Ледяной барьер! Враг замедлён -25% урона 2 хода.', 'lp');
    UISystem.showToast('❄️ Ледяной барьер активен!');
  }

  function mageOnTurnEnd() {
    const ms = ClassMechanicsState.mage;
    if (ms.burnStacks > 0) {
      // Горение наносит урон монстру каждый ход
      const burnDmg = Math.floor((State.totalAtk || 10) * 0.08 * ms.burnStacks);
      if (State.monster && burnDmg > 0) {
        State.damageMonster(burnDmg);
        UISystem.floatText(`🔥${burnDmg}`, 'f-pm', UISystem.$('card-m'));
        UISystem.log(`🔥 Горение: ${burnDmg} урона (${ms.burnStacks} стак)`, 'li');
        if (State.monster.hp <= 0) EventBus.emit('combat:forceVictory');
        else EventBus.emit('monster:updated', State.monster);
      }
    }
    if (ms.controlTurns > 0) ms.controlTurns--;
    _updateClassUI();
  }

  // ══════════════════════════════════════
  // АССАСИН — стелс + метка
  // ══════════════════════════════════════

  function rogueOnAttack(baseDmg) {
    const rs = ClassMechanicsState.rogue;
    // Первый удар из невидимости: +60% урона
    if (rs.inStealth) {
      baseDmg = Math.floor(baseDmg * 1.6);
      rs.inStealth = false;
      rs.stealthBonus = 0;
      UISystem.floatText('👁️ТЕНЬ!', 'f-cr', UISystem.$('card-m'));
      UISystem.log('🌑 Удар из тени! +60% урона', 'lp');
    }
    // Накапливаем комбо
    rs.comboCount = (rs.comboCount || 0) + 1;
    // При 3 ударах подряд — авто-метка цели
    if (rs.comboCount >= 3 && !rs.marked) {
      rs.marked = true;
      rs.comboCount = 0;
      UISystem.floatText('🎯МЕТКА', 'f-status', UISystem.$('card-m'));
      UISystem.log('🎯 Метка цели! Следующий скилл — смертельный удар!', 'ls');
    }
    return baseDmg;
  }

  function rogueOnTakeDamage(incomingDmg) {
    // Ассасин с меткой частично уклоняется (фокус на цели)
    if (ClassMechanicsState.rogue.marked) {
      incomingDmg = Math.floor(incomingDmg * 0.85);
    }
    return incomingDmg;
  }

  // Контратака ассасина = «Дымовая бомба» — метка + уклон
  function rogueCounter() {
    const rs = ClassMechanicsState.rogue;
    rs.marked = true;
    rs.inStealth = true; // восстанавливаем невидимость на один удар
    UISystem.log('💨 Дымовая бомба! Метка + невидимость восстановлена!', 'lp');
    UISystem.showToast('💨 Дымовая бомба! Следующий удар — из тени!');
  }

  function rogueOnTurnEnd() {
    // Без действий — невидимость не накапливается
    _updateClassUI();
  }

  // ══════════════════════════════════════
  // СТРЕЛОК — серии + прицел + дистанция
  // ══════════════════════════════════════

  function rangerOnAttack(baseDmg) {
    const rs = ClassMechanicsState.ranger;
    // Бонус серии: +5% за каждый удар подряд (макс +25%)
    rs.streakCount = (rs.streakCount || 0) + 1;
    const streakMult = 1 + Math.min(rs.streakCount - 1, 5) * 0.05;
    baseDmg = Math.floor(baseDmg * streakMult * rs.distanceBonus);
    if (rs.streakCount >= 3) {
      UISystem.floatText(`🏹×${rs.streakCount}`, 'f-status', UISystem.$('card-m'));
    }
    // Прицеливание спадает после первого обычного удара (прицел только для скилла)
    if (rs.aimingTurns > 0) {
      rs.aimingTurns--;
      if (rs.aimingTurns <= 0) rs.aiming = false;
    }
    return baseDmg;
  }

  function rangerOnTakeDamage(incomingDmg) {
    const rs = ClassMechanicsState.ranger;
    // Получение урона сбрасывает серию
    if (rs.streakCount > 0) {
      rs.streakCount = 0;
      UISystem.log('💢 Серия прервана!', 'li');
    }
    return incomingDmg;
  }

  // Контратака стрелка = «Кувырок» — уклон + восстановление прицела
  function rangerCounter() {
    const rs = ClassMechanicsState.ranger;
    rs.aiming = true;
    rs.aimingTurns = 2;
    rs.distanceBonus = 1.25; // временный бонус дистанции
    UISystem.log('💨 Кувырок! Прицел активен, +25% дальний бонус!', 'lp');
    UISystem.showToast('💨 Кувырок! Следующий скилл — снайперский!');
  }

  function rangerOnTurnEnd() {
    const rs = ClassMechanicsState.ranger;
    // Дальний бонус возвращается к норме со временем
    if (rs.distanceBonus > 1.1) {
      rs.distanceBonus = Math.max(1.1, rs.distanceBonus - 0.05);
    }
    _updateClassUI();
  }

  // ══════════════════════════════════════
  // ПАЛАДИН — щит + лечение + святой заряд
  // ══════════════════════════════════════

  function paladinOnAttack(baseDmg) {
    const ps = ClassMechanicsState.paladin;
    // Накапливаем святой заряд (+6 за атаку)
    ps.holyCharge = Math.min(100, ps.holyCharge + 6);
    // При максимальном заряде — атака священная (+25% урона)
    if (ps.holyCharge >= 80) {
      baseDmg = Math.floor(baseDmg * 1.25);
      UISystem.floatText('✨СВЯТ!', 'f-heal', UISystem.$('card-m'));
    }
    // Наказание — если враг атаковал в прошлом ходу
    if (ps.retributionReady) {
      baseDmg = Math.floor(baseDmg * 1.3);
      ps.retributionReady = false;
      UISystem.floatText('⚔️КАРА!', 'f-cr', UISystem.$('card-m'));
      UISystem.log('⚔️ Кара Паладина! +30% урона за агрессию врага!', 'lp');
    }
    return baseDmg;
  }

  function paladinOnTakeDamage(incomingDmg) {
    const ps = ClassMechanicsState.paladin;
    // Щит поглощает урон
    if (ps.shieldActive && ps.shieldAbsorb > 0) {
      const absorbed = Math.min(ps.shieldAbsorb, incomingDmg);
      ps.shieldAbsorb -= absorbed;
      incomingDmg -= absorbed;
      if (absorbed > 0) {
        UISystem.floatText(`🛡${absorbed}`, 'f-heal', UISystem.$('card-p'));
        UISystem.log(`🛡 Щит поглотил ${absorbed} урона`, 'li');
      }
      if (ps.shieldAbsorb <= 0) {
        ps.shieldActive = false;
        ps.shieldDuration = 0;
        UISystem.log('🛡 Щит разрушен!', 'li');
      }
    }
    // Нас атаковали — готовим наказание
    ps.retributionReady = true;
    // Святой заряд накапливается при получении урона (+3)
    ps.holyCharge = Math.min(100, ps.holyCharge + 3);
    return incomingDmg;
  }

  // Контратака паладина = «Кара небес» — урон + исцеление
  function paladinCounter() {
    const ps = ClassMechanicsState.paladin;
    // Тратим святой заряд на мощную контратаку + лечение
    const chargeBonus = ps.holyCharge >= 80 ? 1.5 : 1.0;
    const healAmt = Math.floor((State.hero?.maxHp || 100) * 0.12 * chargeBonus);
    if (State.hero) {
      State.healHero(healAmt);
      UISystem.floatText(`+${healAmt}`, 'f-heal', UISystem.$('card-p'));
      UISystem.flashGreen('card-p');
      EventBus.emit('hero:updated', State.hero);
    }
    ps.holyCharge = Math.max(0, ps.holyCharge - 40);
    ps.retributionReady = true; // двойное наказание
    UISystem.log(`✨ Кара небес! +${healAmt} HP, наказание готово!`, 'lp');
    UISystem.showToast(`✨ Кара небес! +${healAmt} HP`);
  }

  function paladinOnTurnEnd() {
    const ps = ClassMechanicsState.paladin;
    if (ps.shieldActive) {
      ps.shieldDuration--;
      if (ps.shieldDuration <= 0) {
        ps.shieldActive = false;
        ps.shieldAbsorb = 0;
        UISystem.log('🛡 Щит истёк.', 'li');
      }
    }
    // Пассивное накопление заряда (+2/ход)
    ps.holyCharge = Math.min(100, ps.holyCharge + 2);
    _updateClassUI();
  }

  // ══════════════════════════════════════
  // ДИСПЕТЧЕР по текущему классу
  // ══════════════════════════════════════

  function onAttack(baseDmg) {
    const cls = State.heroClassKey;
    if (cls === 'warrior') return warriorOnAttack(baseDmg);
    if (cls === 'mage')    return mageOnAttack(baseDmg);
    if (cls === 'rogue')   return rogueOnAttack(baseDmg);
    if (cls === 'ranger')  return rangerOnAttack(baseDmg);
    if (cls === 'paladin') return paladinOnAttack(baseDmg);
    return baseDmg;
  }

  function onTakeDamage(incomingDmg) {
    const cls = State.heroClassKey;
    if (cls === 'warrior') return warriorOnTakeDamage(incomingDmg);
    if (cls === 'mage')    return mageOnTakeDamage(incomingDmg);
    if (cls === 'rogue')   return rogueOnTakeDamage(incomingDmg);
    if (cls === 'ranger')  return rangerOnTakeDamage(incomingDmg);
    if (cls === 'paladin') return paladinOnTakeDamage(incomingDmg);
    return incomingDmg;
  }

  function onCounter() {
    const cls = State.heroClassKey;
    if (cls === 'warrior') warriorCounter();
    else if (cls === 'mage')    mageCounter();
    else if (cls === 'rogue')   rogueCounter();
    else if (cls === 'ranger')  rangerCounter();
    else if (cls === 'paladin') paladinCounter();
    _updateClassUI();
  }

  function onTurnEnd() {
    const cls = State.heroClassKey;
    if (cls === 'warrior') warriorOnTurnEnd();
    else if (cls === 'mage')    mageOnTurnEnd();
    else if (cls === 'rogue')   rogueOnTurnEnd();
    else if (cls === 'ranger')  rangerOnTurnEnd();
    else if (cls === 'paladin') paladinOnTurnEnd();
  }

  // Обработка эффектов навыков (effects[] из useSkill)
  function applySkillEffects(effects, monster) {
    if (!effects || !effects.length) return;
    const ms = ClassMechanicsState.mage;
    effects.forEach(eff => {
      if (eff === 'burn' && monster) {
        ms.burnStacks = Math.min(3, (ms.burnStacks || 0) + 1);
        UISystem.log(`🔥 Горение (${ms.burnStacks} стак)!`, 'lc');
      }
      if (eff === 'slow' && State.monster) State.applyStatus('monster', 'slow', 2);
      if (eff === 'stun' && State.monster) StatusRegistry.apply('monster', 'stun');
    });
    _updateClassUI();
  }

  // ══════════════════════════════════════
  // UI — мини-бар механики класса
  // ══════════════════════════════════════
  function _updateClassUI() {
    const bar = document.getElementById('class-mechanic-bar');
    if (!bar) return;
    const cls = State.heroClassKey;
    if (cls === 'warrior') {
      const ws = ClassMechanicsState.warrior;
      const ragePct = ws.rage;
      const stanceStr = ws.stanceActive ? ` ⚔️Стойка(${ws.stanceTurns})` : '';
      bar.innerHTML = `<div class="cmb-row"><span class="cmb-lbl">🔥 Ярость</span><div class="cmb-track"><div class="cmb-fill cmb-warrior" style="width:${ragePct}%"></div></div><span class="cmb-val">${ws.rage}/100${stanceStr}</span></div>`;
    } else if (cls === 'mage') {
      const ms = ClassMechanicsState.mage;
      const elIco = { fire:'🔥', ice:'❄️', lightning:'⚡' }[ms.element] || '🔮';
      const burnStr = ms.burnStacks > 0 ? ` 🔥×${ms.burnStacks}` : '';
      const ctrlStr = ms.controlTurns > 0 ? ` 🧊×${ms.controlTurns}` : '';
      bar.innerHTML = `<div class="cmb-row"><span class="cmb-lbl">${elIco} Стихия</span><span class="cmb-val">${ms.element === 'fire' ? 'Огонь' : ms.element === 'ice' ? 'Лёд' : 'Молния'}${burnStr}${ctrlStr}</span></div>`;
    } else if (cls === 'rogue') {
      const rs = ClassMechanicsState.rogue;
      const markStr = rs.marked ? ' 🎯МЕТКА' : '';
      const stealthStr = rs.inStealth ? ' 🌑ТЕНЬ' : '';
      const comboPct = Math.min(100, rs.comboCount * 33);
      bar.innerHTML = `<div class="cmb-row"><span class="cmb-lbl">💀 Комбо</span><div class="cmb-track"><div class="cmb-fill cmb-rogue" style="width:${comboPct}%"></div></div><span class="cmb-val">${rs.comboCount}/3${markStr}${stealthStr}</span></div>`;
    } else if (cls === 'ranger') {
      const rs = ClassMechanicsState.ranger;
      const aimStr = rs.aiming ? ' 🎯ПРИЦЕЛ' : '';
      const streakPct = Math.min(100, rs.streakCount * 20);
      bar.innerHTML = `<div class="cmb-row"><span class="cmb-lbl">🏹 Серия</span><div class="cmb-track"><div class="cmb-fill cmb-ranger" style="width:${streakPct}%"></div></div><span class="cmb-val">×${rs.streakCount}${aimStr}</span></div>`;
    } else if (cls === 'paladin') {
      const ps = ClassMechanicsState.paladin;
      const shieldStr = ps.shieldActive ? ` 🛡${ps.shieldAbsorb}` : '';
      const retStr = ps.retributionReady ? ' ⚔️КАРА!' : '';
      bar.innerHTML = `<div class="cmb-row"><span class="cmb-lbl">✨ Заряд</span><div class="cmb-track"><div class="cmb-fill cmb-paladin" style="width:${ps.holyCharge}%"></div></div><span class="cmb-val">${ps.holyCharge}/100${shieldStr}${retStr}</span></div>`;
    } else {
      bar.innerHTML = '';
    }
  }

  function initUI() {
    _updateClassUI();
  }

  // ══════════════════════════════════════
  // EventBus интеграция
  // ══════════════════════════════════════
  EventBus.on('game:started',   () => { ClassMechanicsState.reset(); initUI(); });
  EventBus.on('game:newHero',   () => { ClassMechanicsState.reset(); initUI(); });
  EventBus.on('game:loaded',    () => { initUI(); });
  EventBus.on('heroClass:updated', () => { ClassMechanicsState.reset(State.heroClassKey); initUI(); });
  EventBus.on('combat:stateReset', () => {
    // Сброс некоторых механик при начале нового боя
    const cls = State.heroClassKey;
    if (cls === 'rogue') {
      ClassMechanicsState.rogue.inStealth = true; // невидимость восстанавливается
      ClassMechanicsState.rogue.comboCount = 0;
    }
    if (cls === 'ranger') {
      ClassMechanicsState.ranger.streakCount = 0;
      ClassMechanicsState.ranger.distanceBonus = 1.1;
    }
    if (cls === 'mage') {
      ClassMechanicsState.mage.burnStacks = 0;
      ClassMechanicsState.mage.controlTurns = 0;
    }
    initUI();
  });

  return { onAttack, onTakeDamage, onCounter, onTurnEnd, applySkillEffects, initUI };
})();
