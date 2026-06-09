const SubclassSystem = (() => {
  let _subclass    = null;  // { classKey, subId, cfg }
  let _spec        = null;  // { specId, cfg }
  let _passiveBonuses = {}; // accumulated permanent bonuses from subclass/spec
  let _killStacks  = 0;     // for kill_stack_atk spec
  let _critStacks  = 0;     // for soul_harvest

  // ── Apply permanent bonus to hero stats ──
  function _applyBonus(bonus) {
    const h = State.hero; if (!h) return;
    if (bonus.atk)  h.atk  = Math.max(0, h.atk  + bonus.atk);
    if (bonus.def)  h.def  = Math.max(0, h.def  + bonus.def);
    if (bonus.hp)   { h.maxHp += bonus.hp; h.hp = Math.min(h.hp + bonus.hp, h.maxHp); }
    if (bonus.mp)   { h.maxMp += bonus.mp; h.mp = Math.min(h.mp + bonus.mp, h.maxMp); }
    if (bonus.spd)  h.spd  = Math.max(1, (h.spd || 5) + bonus.spd);
    if (bonus.crit) h.crit = Math.min(0.95, (h.crit || 0) + bonus.crit);
    EventBus.emit('hero:updated', h);
  }

  // ── Choose subclass (level 100, one-time) ──
  function chooseSubclass(classKey, subId) {
    if (_subclass) { UISystem.showToast('⚠️ Подкласс уже выбран!'); return false; }
    const options = SubclassConfig[classKey];
    if (!options) return false;
    const cfg = options.find(s => s.id === subId);
    if (!cfg) return false;

    _subclass = { classKey, subId, cfg };
    UISystem.showToast(`✨ Подкласс: ${cfg.ico} ${cfg.name}!`);
    UISystem.log(`🎭 Подкласс выбран: ${cfg.ico} ${cfg.name} — ${cfg.desc}`, 'lc');
    EventBus.emit('subclass:chosen', _subclass);
    SaveSystem.autosave();
    return true;
  }

  // ── Choose specialization (level 200, one-time) ──
  function chooseSpec(specId) {
    if (_spec) { UISystem.showToast('⚠️ Специализация уже выбрана!'); return false; }
    if (!_subclass) { UISystem.showToast('⚠️ Сначала выбери подкласс!'); return false; }
    const options = SpecializationConfig[_subclass.subId];
    if (!options) return false;
    const cfg = options.find(s => s.id === specId);
    if (!cfg) return false;

    _spec = { specId, cfg };
    // Apply permanent stat bonuses from spec
    _applyBonus(cfg.bonus);
    UISystem.showToast(`⚡ Специализация: ${cfg.ico} ${cfg.name}!`);
    UISystem.log(`⚡ Специализация: ${cfg.ico} ${cfg.name} — ${cfg.desc}`, 'lc');
    EventBus.emit('spec:chosen', _spec);
    SaveSystem.autosave();
    return true;
  }

  // ── Passive hooks called by CombatController ──
  function onAttack(dmg) {
    if (!_subclass) return dmg;
    const sub = _subclass.cfg;
    const h   = State.hero;

    // Assassin: first crit
    if (sub.passive === 'first_crit' && !_firstCritUsed) {
      _firstCritUsed = true; return dmg; // handled separately in combat
    }
    // Berserker: rage at low HP
    if (sub.passive === 'rage_atk' && h.hp / h.maxHp < 0.5) {
      dmg = Math.floor(dmg * 1.35);
    }
    // Beastmaster
    if (sub.passive === 'beast_power') {
      dmg = Math.floor(dmg * 1.30);
    }
    // Trickster: 30% double
    if (sub.passive === 'double_dmg' && Math.random() < 0.30) {
      dmg *= 2;
      UISystem.log('🎭 Трикстер: двойной урон!', 'lc');
    }
    // Shadowblade: +50% dmg vs poisoned
    if (sub.passive === 'poison_amp' && StatusRegistry.has('monster', 'poison')) {
      dmg = Math.floor(dmg * 1.50);
    }
    // Spec: venom_blade → always poison
    if (_spec?.cfg?.bonus?.always_poison) {
      StatusRegistry.apply('monster', 'poison');
    }
    // Spec: dark_echo → +100% vs poisoned
    if (_spec?.cfg?.bonus?.poison_amp_pct && StatusRegistry.has('monster', 'poison')) {
      dmg = Math.floor(dmg * (1 + _spec.cfg.bonus.poison_amp_pct));
    }
    return dmg;
  }

  let _firstCritUsed = false;
  let _combatHitCount = 0;

  function onCombatStart() {
    _firstCritUsed = false;
    _combatHitCount = 0;
  }

  function isFirstCrit() {
    if (_subclass?.cfg?.passive !== 'first_crit') return false;
    if (!_firstCritUsed) { _firstCritUsed = true; return true; }
    return false;
  }

  function onHit() {
    _combatHitCount++;
    // Spec: stun_every
    if (_spec?.cfg?.bonus?.stun_every && _combatHitCount % _spec.cfg.bonus.stun_every === 0) {
      StatusRegistry.apply('monster', 'stun');
      UISystem.log('😵 Специализация: враг оглушён!', 'lc');
    }
    // Spec: auto_fireball_every
    if (_spec?.cfg?.bonus?.auto_fireball_every && State.hero && _combatHitCount % _spec.cfg.bonus.auto_fireball_every === 0) {
      const dmg = Math.floor(State.hero.atk * 2.8);
      if (State.monster) {
        State.damageMonster(dmg);
        UISystem.log(`🔥 Автовыстрел: ${dmg} урона!`, 'lc');
      }
    }
  }

  function onVictory(monster) {
    const h = State.hero; if (!h) return;
    // Necromancer lifesteal
    if (_subclass?.cfg?.passive === 'lifesteal') {
      const heal = Math.floor(h.maxHp * 0.10);
      h.hp = Math.min(h.maxHp, h.hp + heal);
      UISystem.log(`💀 Некромант: +${heal} HP`, 'ls');
      EventBus.emit('hero:updated', h);
    }
    // Spec: kill_stack_atk
    if (_spec?.cfg?.bonus?.kill_stack_atk) {
      _killStacks++;
      const maxS = _spec.cfg.bonus.max_stacks || 50;
      if (_killStacks <= maxS) {
        h.atk += _spec.cfg.bonus.kill_stack_atk;
        if (_killStacks % 10 === 0) UISystem.showToast(`🩸 Ярость: +ATK (×${_killStacks})`);
        EventBus.emit('hero:updated', h);
      }
    }
    // Spec: soul_harvest
    if (_spec?.cfg?.bonus?.kill_crit_stack) {
      _killStacks++;
      const per = _spec.cfg.bonus.kill_stack_per || 10;
      if (_killStacks % per === 0) {
        h.crit = Math.min(0.95, h.crit + _spec.cfg.bonus.kill_crit_stack);
        UISystem.showToast(`👻 Жатва душ: КРИТ +1%`);
        EventBus.emit('hero:updated', h);
      }
    }
    // Spec: pack_hunt free turn every N kills
    if (_spec?.cfg?.bonus?.free_turn_per_kills) {
      _killStacks++;
      if (_killStacks % _spec.cfg.bonus.free_turn_per_kills === 0) {
        UISystem.showToast('🐾 Стайная охота: бесплатный ход!');
        // Спавн следующего монстра уже обрабатывается close-loot через safeStartCombat
      }
    }
  }

  function onTakeDamage(dmg) {
    // Guardian: block 20%
    if (_subclass?.cfg?.passive === 'block') {
      dmg = Math.floor(dmg * 0.80);
    }
    // Spec: iron_wall block 35%
    if (_spec?.cfg?.bonus?.block_pct) {
      dmg = Math.floor(dmg * (1 - _spec.cfg.bonus.block_pct));
    }
    // Spec: absorb_chance
    if (_spec?.cfg?.bonus?.absorb_chance && Math.random() < _spec.cfg.bonus.absorb_chance) {
      UISystem.log('🌟 Эгида: урон поглощён!', 'lc');
      dmg = 0;
    }
    // Spec: enemy_dmg_reduce
    if (_spec?.cfg?.bonus?.enemy_dmg_reduce) {
      dmg = Math.floor(dmg * (1 - _spec.cfg.bonus.enemy_dmg_reduce));
    }
    return dmg;
  }

  function onSkillUse(res) {
    // Warlord: +25% crit damage
    if (_subclass?.cfg?.passive === 'crit_lord') {
      res.damage = Math.floor((res.damage || 0) * 1.25);
    }
    // Spec: mana_surge: 25% free MP
    if (_spec?.cfg?.bonus?.free_skill_chance && Math.random() < _spec.cfg.bonus.free_skill_chance) {
      res.mpCost = 0;
      UISystem.log('💠 Взрыв маны: навык бесплатен!', 'lc');
    }
    // Sniper: ignore def
    if (_subclass?.cfg?.passive === 'ignore_def') {
      res._ignoresDef = true;
    }
    // Spec: skill_triple (paladin crusader)
    if (_spec?.cfg?.bonus?.skill_triple) {
      const h = State.hero;
      if (!res.heal) res.heal = 0;
      res.heal += Math.floor(h.maxHp * 0.10);
      h.defBuff = Math.min(20, (h.defBuff||0) + 5);
      UISystem.log('✝️ Святой поход: +HP +DEF!', 'lc');
    }
    return res;
  }

  // Auto-heal for templar spec
  let _turnCount = 0;
  function onTurnEnd() {
    _turnCount++;
    if (_spec?.cfg?.bonus?.auto_heal_every && _turnCount % _spec.cfg.bonus.auto_heal_every === 0) {
      const h = State.hero; if (!h) return;
      const heal = Math.floor(h.maxHp * (_spec.cfg.bonus.auto_heal_pct || 0.10));
      h.hp = Math.min(h.maxHp, h.hp + heal);
      UISystem.log(`⭐ Освящение: +${heal} HP`, 'ls');
      UISystem.flashGreen('card-p');
      EventBus.emit('hero:updated', h);
    }
  }

  function onCombatStartFull() {
    _turnCount = 0;
    onCombatStart();
  }

  // ── Serialization ──
  function toSave() {
    return { subclass: _subclass, spec: _spec, killStacks: _killStacks, critStacks: _critStacks };
  }
  function fromSave(d) {
    if (!d) return;
    _subclass   = d.subclass   || null;
    _spec       = d.spec       || null;
    _killStacks = d.killStacks || 0;
    _critStacks = d.critStacks || 0;
  }

  // Getters
  function getSubclass()  { return _subclass; }
  function getSpec()      { return _spec; }
  function hasSubclass()  { return !!_subclass; }
  function hasSpec()      { return !!_spec; }

  // EventBus hooks
  EventBus.on('monster:spawned', () => onCombatStartFull());
  EventBus.on('combat:victory',  ({ monster }) => onVictory(monster));
  EventBus.on('game:newHero',    () => { _subclass = null; _spec = null; _killStacks = 0; _critStacks = 0; });

  return { chooseSubclass, chooseSpec, getSubclass, getSpec, hasSubclass, hasSpec,
           onAttack, onTakeDamage, onSkillUse, onHit, onTurnEnd, isFirstCrit, toSave, fromSave };
})();
