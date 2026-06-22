// ════════════════════════════════════════════════════════════
// ClassMechanicsState — изменяемое состояние особых механик
// каждого класса (ярость воина, стихия мага, метка ассасина,
// прицел стрелка, святой заряд паладина и т.д.)
//
// Используется в class-mechanics.js и skill-definition.js.
// reset(classKey) сбрасывает состояние при старте новой игры /
// смене класса; classKey пока не используется для выборочного
// сброса, но принимается для совместимости с вызовами вида
// ClassMechanicsState.reset(State.heroClassKey).
// ════════════════════════════════════════════════════════════
const ClassMechanicsState = {
  warrior: { rage: 0, stanceActive: false, stanceTurns: 0 },
  mage:    { element: 'fire', burnStacks: 0, controlTurns: 0 },
  rogue:   { inStealth: true, marked: false, comboCount: 0 },
  ranger:  { aiming: false, aimingTurns: 0, streakCount: 0, distanceBonus: 1.1 },
  paladin: { holyCharge: 0, shieldActive: false, shieldDuration: 0, shieldAbsorb: 0, retributionReady: false },

  reset(_classKey) {
    this.warrior = { rage: 0, stanceActive: false, stanceTurns: 0 };
    this.mage    = { element: 'fire', burnStacks: 0, controlTurns: 0 };
    this.rogue   = { inStealth: true, marked: false, comboCount: 0 };
    this.ranger  = { aiming: false, aimingTurns: 0, streakCount: 0, distanceBonus: 1.1 };
    this.paladin = { holyCharge: 0, shieldActive: false, shieldDuration: 0, shieldAbsorb: 0, retributionReady: false };
  },
};

// ════════════════════════════════════════════════════════════
// HeroClassFactory — создаёт объект героического класса,
// который кладётся в State.heroClass / State._heroClass.
//
// Форма результата (используется по всему проекту):
//   { key, name, ico, desc, skillLabel, skillMp, useSkill(hero, monster) }
//
// useSkill(hero, monster) -> { damage, heal, message, mpCost, effects }
// (см. SkillDefinition.makeUseSkill и вызов в systems/combat.js:playerSkill)
// ════════════════════════════════════════════════════════════
const HeroClassFactory = (() => {
  function create(classKey, cfg) {
    return {
      key:        classKey,
      name:       cfg.label,
      ico:        cfg.ico,
      desc:       cfg.desc,
      skillLabel: cfg.skillLabel,
      skillMp:    cfg.skillMp,
      useSkill:   SkillDefinition.makeUseSkill(classKey),
    };
  }

  return { create };
})();
