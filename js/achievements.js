const AchievementSystem = (() => {
  let _unlocked = {}; // { achievementId: true }

  function _checkAll() {
    const h = State.hero; if (!h) return;
    AchievementConfig.medals.forEach(medal => {
      if (_unlocked[medal.id]) return;
      let met = false;
      if (medal.type === 'kill_total') {
        met = State.totalKills >= medal.threshold;
      } else if (medal.type === 'kill_type') {
        met = (State.kills[medal.monster] || 0) >= medal.threshold;
      } else if (medal.type === 'score') {
        met = State.score >= medal.threshold;
      }
      if (met) _unlock(medal);
    });
  }

  function _unlock(medal) {
    if (_unlocked[medal.id]) return;
    _unlocked[medal.id] = true;

    // Apply bonus
    const h = State.hero; if (!h) return;
    const b = medal.bonus;
    if (b.atk)  h.atk  = Math.max(0, h.atk  + b.atk);
    if (b.def)  h.def  = Math.max(0, h.def  + b.def);
    if (b.hp)   { h.maxHp += b.hp; h.hp = Math.min(h.hp + b.hp, h.maxHp); }
    if (b.mp)   { h.maxMp += b.mp; h.mp = Math.min(h.mp + b.mp, h.maxMp); }
    if (b.spd)  h.spd = Math.max(1, (h.spd||5) + b.spd);
    if (b.crit) h.crit = Math.min(0.95, (h.crit||0) + b.crit);

    UISystem.showToast(`🏅 Медаль: ${medal.ico} ${medal.name}!`);
    UISystem.log(`🏅 Достижение разблокировано: ${medal.ico} ${medal.name} — ${medal.desc}`, 'lc');
    EventBus.emit('achievement:unlocked', medal);
    EventBus.emit('hero:updated', h);
    SaveSystem.autosave();
  }

  function getUnlocked() { return { ..._unlocked }; }
  function getMedals()   { return AchievementConfig.medals.map(m => ({ ...m, unlocked: !!_unlocked[m.id] })); }

  function toSave()    { return { unlocked: _unlocked }; }
  function fromSave(d) { _unlocked = d?.unlocked || {}; }

  EventBus.on('kill:recorded',  () => _checkAll());
  EventBus.on('score:updated',  () => _checkAll());
  EventBus.on('game:newHero',   () => { _unlocked = {}; });

  return { getUnlocked, getMedals, toSave, fromSave };
})();
