const ClassConstraintsSystem = (() => {

  // ── Диспетчеры событий ──
  function onPlayerAttack() {
    const cls = State.heroClassKey;
    if (cls === 'warrior') WarriorFatigueModule.onAttack();
    if (cls === 'rogue')   RogueVisibilityModule.onAttack();
    _updateConstraintsUI();
  }

  function onPlayerSkill() {
    const cls = State.heroClassKey;
    if (cls === 'warrior') WarriorFatigueModule.onSkill();
    if (cls === 'paladin') PaladinOathModule.onSkill();
    if (cls === 'mage')    MageOverloadModule.onSkill();
    _updateConstraintsUI();
  }

  function onPlayerFlee() {
    const cls = State.heroClassKey;
    if (cls === 'paladin') PaladinOathModule.onFlee();
    _updateConstraintsUI();
  }

  function onMonsterAttack() {
    const cls = State.heroClassKey;
    if (cls === 'ranger') RangerDistanceModule.onHit();
    if (cls === 'rogue')  RogueVisibilityModule.getIncomingDmgMult(); // passive
    _updateConstraintsUI();
  }

  function onTurnEnd() {
    const cls = State.heroClassKey;
    if (cls === 'warrior') WarriorFatigueModule.onTurnEnd();
    if (cls === 'paladin') PaladinOathModule.onTurnEnd();
    if (cls === 'ranger')  RangerDistanceModule.onTurnEnd();
    if (cls === 'rogue')   RogueVisibilityModule.onTurnEnd();
    if (cls === 'mage')    MageOverloadModule.onTurnEnd();
    _updateConstraintsUI();
  }

  function onVictory() {
    const cls = State.heroClassKey;
    if (cls === 'paladin') PaladinOathModule.onVictory();
    resetCombat();
  }

  // ── Сброс при новом бое / смене локации ──
  function resetCombat() {
    const cls = State.heroClassKey;
    if (cls === 'warrior') WarriorFatigueModule.reset();
    if (cls === 'ranger')  RangerDistanceModule.reset();
    if (cls === 'rogue')   RogueVisibilityModule.reset();
    // paladin oath и mage overload сохраняются между боями (накопительные)
    _updateConstraintsUI();
  }

  function resetAll() {
    WarriorFatigueModule.reset();
    PaladinOathModule.reset();
    RangerDistanceModule.reset();
    RogueVisibilityModule.reset();
    MageOverloadModule.reset();
    _updateConstraintsUI();
  }

  // ── Геттеры модификаторов для боевых расчётов ──
  function getWarriorDamageMult()  { return State.heroClassKey === 'warrior' ? WarriorFatigueModule.getDamageMult()      : 1.0; }
  function getPaladinHealMult()    { return State.heroClassKey === 'paladin' ? PaladinOathModule.getHealMult()            : 1.0; }
  function getRangerDistanceMult() { return State.heroClassKey === 'ranger'  ? RangerDistanceModule.getDistanceMult()     : 1.0; }
  function getRogueIncomingMult()  { return State.heroClassKey === 'rogue'   ? RogueVisibilityModule.getIncomingDmgMult() : 1.0; }
  function getMageExtraMpPct()     { return State.heroClassKey === 'mage'    ? MageOverloadModule.getMpCostExtra()        : 0;   }

  // ════════════════════════════════════════
  // UI — мини-бар ограничений класса
  // ════════════════════════════════════════
  function _updateConstraintsUI() {
    const bar = document.getElementById('class-constraint-bar');
    if (!bar) return;
    const cls = State.heroClassKey;

    if (cls === 'warrior') {
      const s = State.getConstraints().warrior;
      const pct = s.fatigue;
      const penalty = s.fatigue >= 50 ? ` −${Math.round((1 - WarriorFatigueModule.getDamageMult()) * 100)}%` : '';
      const color = s.fatigue >= 75 ? '#ff4444' : s.fatigue >= 50 ? '#ff9900' : '#7ecf2e';
      bar.innerHTML = `<div class="ccb-row"><span class="ccb-lbl">😓 Усталость</span><div class="ccb-track"><div class="ccb-fill" style="width:${pct}%;background:${color};"></div></div><span class="ccb-val">${s.fatigue}/${s.fatigueMax}${penalty}</span></div>`;

    } else if (cls === 'paladin') {
      const s = State.getConstraints().paladin;
      const pct = s.oath;
      const healMult = Math.round(PaladinOathModule.getHealMult() * 100);
      const color = s.oath >= 60 ? '#f0c050' : s.oath >= 30 ? '#ff9900' : '#ff4444';
      bar.innerHTML = `<div class="ccb-row"><span class="ccb-lbl">⚜️ Обет</span><div class="ccb-track"><div class="ccb-fill" style="width:${pct}%;background:${color};"></div></div><span class="ccb-val">${s.oath}/${s.oathMax} · Лечение ${healMult}%</span></div>`;

    } else if (cls === 'ranger') {
      const s = State.getConstraints().ranger;
      const pct = s.distance;
      const mult = Math.round(RangerDistanceModule.getDistanceMult() * 100);
      const color = s.distance >= 70 ? '#4ade80' : s.distance >= 40 ? '#ff9900' : '#ff4444';
      bar.innerHTML = `<div class="ccb-row"><span class="ccb-lbl">📏 Дистанция</span><div class="ccb-track"><div class="ccb-fill" style="width:${pct}%;background:${color};"></div></div><span class="ccb-val">${s.distance}/${s.distMax} · Урон ×${(mult/100).toFixed(2)}</span></div>`;

    } else if (cls === 'rogue') {
      const s = State.getConstraints().rogue;
      const pct = s.visibility;
      const dmgPenalty = s.visibility >= s.visThreshold ? ` +${Math.round((RogueVisibilityModule.getIncomingDmgMult() - 1) * 100)}% вх.` : '';
      const color = s.visibility >= s.visThreshold ? '#ff4444' : s.visibility >= 40 ? '#ff9900' : '#7ecf2e';
      bar.innerHTML = `<div class="ccb-row"><span class="ccb-lbl">👁️ Заметность</span><div class="ccb-track"><div class="ccb-fill" style="width:${pct}%;background:${color};"></div></div><span class="ccb-val">${s.visibility}/${s.visMax}${dmgPenalty}</span></div>`;

    } else if (cls === 'mage') {
      const s = State.getConstraints().mage;
      const pct = s.overload;
      const extra = MageOverloadModule.getMpCostExtra();
      const extraStr = extra > 0 ? ` +${extra}% MP` : '';
      const color = s.overload >= s.overThreshold ? '#ff4444' : s.overload >= 50 ? '#ff9900' : '#4fa3e0';
      bar.innerHTML = `<div class="ccb-row"><span class="ccb-lbl">⚡ Перегрузка</span><div class="ccb-track"><div class="ccb-fill" style="width:${pct}%;background:${color};"></div></div><span class="ccb-val">${s.overload}/${s.overMax}${extraStr}</span></div>`;

    } else {
      bar.innerHTML = '';
    }
  }

  // ════════════════════════════════════════
  // EventBus интеграция
  // ════════════════════════════════════════
  EventBus.on('combat:playerAttack',  () => { onPlayerAttack(); });
  EventBus.on('combat:playerSkill',   () => { onPlayerSkill(); });
  EventBus.on('player:action',        ({ type }) => { if (type === 'flee') onPlayerFlee(); });
  EventBus.on('combat:monsterAttack', () => { onMonsterAttack(); });
  EventBus.on('combat:stateReset',    () => { resetCombat(); });
  EventBus.on('zone:changed',         () => { resetAll(); });
  EventBus.on('combat:victory',       () => { onVictory(); });
  EventBus.on('hero:respawn',         () => { resetAll(); });
  EventBus.on('game:started',         () => { resetAll(); });
  EventBus.on('game:loaded',          () => { resetAll(); });
  EventBus.on('heroClass:updated',    () => { resetAll(); });
  EventBus.on('game:newHero',         () => { resetAll(); });

  return {
    onPlayerAttack, onPlayerSkill, onMonsterAttack, onTurnEnd, onVictory,
    resetCombat, resetAll,
    getWarriorDamageMult, getPaladinHealMult, getRangerDistanceMult,
    getRogueIncomingMult, getMageExtraMpPct,
    updateUI: _updateConstraintsUI,
  };
})();
