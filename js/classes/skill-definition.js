const SkillDefinition = (() => {
  // Стандартный объект результата (гарантирует все поля)
  function _result({ damage = 0, heal = 0, message = '', effects = [] } = {}) {
    return { damage, heal, message, effects };
  }

  // Реестр определений навыков
  const _defs = {
    // ── ВОИН: Щит.удар — усиленный удар + накопление ярости ──
    warrior: {
      id: 'shield_bash', name: 'Щит.удар',
      mpCost: GameConfig.classes.warrior.skillMp,
      cooldown: 0,
      targets: 'enemy',
      effects: ['def_buff', 'rage_gain'],
      execute(hero, _monster) {
        // Базовый урон усилен яростью
        const rageBonus = 1 + (ClassMechanicsState.warrior.rage / 100) * 0.5;
        const dmg = Math.floor(CombatSystem.calcDamage(hero.atk, 0) * 1.8 * rageBonus);
        // Щитовой удар добавляет DEF
        hero.defBuff = Math.min(24, (hero.defBuff || 0) + 5);
        // +10 ярости
        ClassMechanicsState.warrior.rage = Math.min(100, ClassMechanicsState.warrior.rage + 10);
        const rageStr = ClassMechanicsState.warrior.rage >= 50 ? ' 🔥ЯРОСТЬ!' : '';
        return _result({ damage: dmg, message: `🛡 Щит.удар: ${dmg} (+5 DEF)${rageStr}` });
      },
    },

    // ── МАГ: Огн.шар — элементальный взрыв + выбор стихии ──
    mage: {
      id: 'elemental_blast', name: 'Огн.шар',
      mpCost: GameConfig.classes.mage.skillMp,
      cooldown: 0,
      targets: 'enemy',
      effects: ['elemental'],
      execute(hero, _monster) {
        const el = ClassMechanicsState.mage.element;
        const elems = { fire: { mult:3.2, icon:'🔥', name:'Огн.шар', status:'burn' },
                        ice:  { mult:2.4, icon:'❄️', name:'Ледяной луч', status:'slow' },
                        lightning: { mult:2.8, icon:'⚡', name:'Молния', status:'stun' } };
        const cfg = elems[el] || elems.fire;
        const baseDmg = Math.floor(hero.atk * cfg.mult + Math.random() * 8);
        // Смена стихии каждый раз (цикл)
        const cycle = ['fire','ice','lightning'];
        const nextIdx = (cycle.indexOf(el) + 1) % 3;
        ClassMechanicsState.mage.element = cycle[nextIdx];
        // Наносим урон, статус — через эффекты
        return _result({ damage: baseDmg, message: `${cfg.icon} ${cfg.name}: ${baseDmg}`, effects: [cfg.status] });
      },
    },

    // ── АССАСИН: Удар из тени — взрывной урон при активной метке ──
    rogue: {
      id: 'shadow_strike', name: 'Из тени',
      mpCost: GameConfig.classes.rogue.skillMp,
      cooldown: 0,
      targets: 'enemy',
      effects: ['mark_consume'],
      execute(hero, monster) {
        const ms = ClassMechanicsState.rogue;
        const hasMark = ms.marked;
        // Базовый урон — двойной удар, при метке +80% бонус + гарант. крит
        const d1 = CombatSystem.calcDamage(hero.atk, monster.def);
        const d2 = CombatSystem.calcDamage(hero.atk, monster.def);
        let total = d1 + d2;
        let msg = `🗡 Двойной удар: ${d1}+${d2}`;
        if (hasMark) {
          total = Math.floor(total * 1.8);
          ms.marked = false;
          ms.comboCount = 0;
          msg = `💀 УДАР ИЗ ТЕНИ: ${total} (метка поглощена!)`;
        } else {
          // Без метки — накапливаем комбо
          ms.comboCount = (ms.comboCount || 0) + 1;
          msg = `🗡 2×Удар: ${d1}+${d2} (комбо ${ms.comboCount}/3)`;
        }
        return _result({ damage: total, message: msg });
      },
    },

    // ── СТРЕЛОК: Прицел — усиленный выстрел с эффектом прицеливания ──
    ranger: {
      id: 'aimed_shot', name: 'Прицел',
      mpCost: GameConfig.classes.ranger.skillMp,
      cooldown: 0,
      targets: 'enemy',
      effects: ['aimed'],
      execute(hero, _monster) {
        const rs = ClassMechanicsState.ranger;
        const isAimed = rs.aiming;
        // При прицеливании: x2.5 урон и игнор 50% DEF
        let dmg;
        let msg;
        if (isAimed) {
          dmg = Math.floor(hero.atk * 2.5 + Math.random() * 10);
          rs.aiming = false;
          rs.aimingTurns = 0;
          msg = `🎯 ПРИЦЕЛЬНЫЙ ВЫСТРЕЛ: ${dmg} (DEF игнорирован!)`;
        } else {
          // Начать прицеливание: следующий выстрел усилен
          rs.aiming = true;
          rs.aimingTurns = 2;
          dmg = Math.floor(hero.atk * 1.4 + Math.random() * 5);
          msg = `🏹 Прицел + выстрел: ${dmg} (следующий скилл — СНАЙПЕРСКИЙ)`;
        }
        return _result({ damage: dmg, message: msg });
      },
    },

    // ── ПАЛАДИН: Священный щит — лечение + щит + аура ──
    paladin: {
      id: 'divine_shield', name: 'Священ.щит',
      mpCost: GameConfig.classes.paladin.skillMp,
      cooldown: 0,
      targets: 'both',
      effects: ['holy_shield', 'heal'],
      execute(hero, _monster) {
        const ps = ClassMechanicsState.paladin;
        // Лечение = 22% от maxHp
        const heal = Math.floor(hero.maxHp * 0.22);
        // Щит на 2 хода поглощает урон
        ps.shieldActive = true;
        ps.shieldDuration = 2;
        ps.shieldAbsorb = Math.floor(hero.maxHp * 0.12);
        // Аура: DEF бафф
        hero.defBuff = Math.min(24, (hero.defBuff || 0) + 3);
        const msg = `⚜️ Священ.щит: +${heal} HP, щит ${ps.shieldAbsorb} ед. (2 хода), +3 DEF`;
        return _result({ heal, message: msg });
      },
    },
  };

  function get(classKey) { return _defs[classKey] || null; }

  // Создаёт useSkill-функцию совместимую с HeroClassFactory (возвращает { damage, heal, message, mpCost })
  function makeUseSkill(classKey) {
    const def = _defs[classKey];
    if (!def) return () => ({ damage: 0, heal: 0, message: '?', mpCost: 0, effects: [] });
    return (hero, monster) => ({ ...def.execute(hero, monster), mpCost: def.mpCost });
  }

  return { get, makeUseSkill };
})();
