const WarriorFatigueModule = (() => {
  function getState() { return State.getConstraints().warrior; }

  function onAttack() {
    const s = getState();
    s.fatigue = Math.min(s.fatigueMax, s.fatigue + s.fatiguePerAttack);
    EventBus.emit('constraints:warriorFatigue', s.fatigue);
  }

  function onSkill() {
    const s = getState();
    s.fatigue = Math.min(s.fatigueMax, s.fatigue + s.fatiguePerSkill);
    EventBus.emit('constraints:warriorFatigue', s.fatigue);
  }

  // Возвращает множитель урона (0.75–1.0 при усталости)
  function getDamageMult() {
    const s = getState();
    if (s.fatigue < 50) return 1.0;
    // Плавный штраф: от 50 до 100 усталости → от 0 до -25% урона
    return Math.max(0.75, 1.0 - ((s.fatigue - 50) / 50) * 0.25);
  }

  function onTurnEnd() {
    const s = getState();
    s.fatigue = Math.max(0, s.fatigue - s.fatigueDecayPerTurn);
    EventBus.emit('constraints:warriorFatigue', s.fatigue);
  }

  function reset() {
    const s = getState();
    s.fatigue = 0;
    EventBus.emit('constraints:warriorFatigue', 0);
  }

  return { onAttack, onSkill, getDamageMult, onTurnEnd, reset };
})();
const PaladinOathModule = (() => {
  function getState() { return State.getConstraints().paladin; }

  function onSkill() {
    const s = getState();
    s.oath = Math.max(0, s.oath - s.oathCostSkill);
    EventBus.emit('constraints:paladinOath', s.oath);
  }

  function onFlee() {
    const s = getState();
    s.oath = Math.max(0, s.oath - s.oathCostFlee);
    if (s.oath < 30) UISystem.log('⚜️ Обет нарушен: паладин избегает боя!', 'lt');
    EventBus.emit('constraints:paladinOath', s.oath);
  }

  // Коэффициент эффективности лечения (0.6–1.0)
  function getHealMult() {
    const s = getState();
    return Math.max(0.6, s.oath / 100);
  }

  function onTurnEnd() {
    const s = getState();
    s.oath = Math.min(s.oathMax, s.oath + s.oathRegen);
    EventBus.emit('constraints:paladinOath', s.oath);
  }

  function onVictory() {
    const s = getState();
    s.oath = Math.min(s.oathMax, s.oath + 15);
    EventBus.emit('constraints:paladinOath', s.oath);
  }

  function reset() {
    const s = getState();
    s.oath = 100;
    EventBus.emit('constraints:paladinOath', 100);
  }

  return { onSkill, onFlee, getHealMult, onTurnEnd, onVictory, reset };
})();
const RangerDistanceModule = (() => {
  function getState() { return State.getConstraints().ranger; }

  function onHit() {
    const s = getState();
    s.distance = Math.max(20, s.distance - s.distDecayOnHit);
    EventBus.emit('constraints:rangerDistance', s.distance);
  }

  function onTurnEnd() {
    const s = getState();
    s.distance = Math.min(s.distMax, s.distance + s.distRegenPerTurn);
    EventBus.emit('constraints:rangerDistance', s.distance);
  }

  // Множитель урона (0.85–1.15 в зависимости от дистанции)
  function getDistanceMult() {
    const s = getState();
    // 100 → 1.15, 50 → 1.0, 20 → 0.85
    return 0.85 + (s.distance / 100) * 0.30;
  }

  function reset() {
    const s = getState();
    s.distance = 100;
    EventBus.emit('constraints:rangerDistance', 100);
  }

  return { onHit, onTurnEnd, getDistanceMult, reset };
})();
const RogueVisibilityModule = (() => {
  function getState() { return State.getConstraints().rogue; }

  function onAttack() {
    const s = getState();
    s.visibility = Math.min(s.visMax, s.visibility + s.visPerAttack);
    if (s.visibility >= s.visThreshold && s.visibility - s.visPerAttack < s.visThreshold) {
      UISystem.log('👁️ Ассасин замечен! Враги начеку.', 'lt');
    }
    EventBus.emit('constraints:rogueVisibility', s.visibility);
  }

  function onTurnEnd() {
    const s = getState();
    s.visibility = Math.max(0, s.visibility - s.visDecayPerTurn);
    EventBus.emit('constraints:rogueVisibility', s.visibility);
  }

  // Множитель входящего урона (1.0–1.20 при высокой заметности)
  function getIncomingDmgMult() {
    const s = getState();
    if (s.visibility < s.visThreshold) return 1.0;
    return 1.0 + ((s.visibility - s.visThreshold) / (s.visMax - s.visThreshold)) * 0.20;
  }

  function reset() {
    const s = getState();
    s.visibility = 0;
    EventBus.emit('constraints:rogueVisibility', 0);
  }

  return { onAttack, onTurnEnd, getIncomingDmgMult, reset };
})();
const MageOverloadModule = (() => {
  function getState() { return State.getConstraints().mage; }

  function onSkill() {
    const s = getState();
    s.overload = Math.min(s.overMax, s.overload + s.overPerSkill);
    if (s.overload >= s.overThreshold && s.overload - s.overPerSkill < s.overThreshold) {
      UISystem.log('⚡ Перегрузка! Заклинания обходятся дороже.', 'lt');
    }
    EventBus.emit('constraints:mageOverload', s.overload);
  }

  function onTurnEnd() {
    const s = getState();
    s.overload = Math.max(0, s.overload - s.overDecayPerTurn);
    EventBus.emit('constraints:mageOverload', s.overload);
  }

  // Дополнительная стоимость MP в % (0–30% при перегрузке)
  function getMpCostExtra() {
    const s = getState();
    if (s.overload < s.overThreshold) return 0;
    return Math.floor(((s.overload - s.overThreshold) / (s.overMax - s.overThreshold)) * 30);
  }

  function reset() {
    const s = getState();
    s.overload = 0;
    EventBus.emit('constraints:mageOverload', 0);
  }

  return { onSkill, onTurnEnd, getMpCostExtra, reset };
})();
