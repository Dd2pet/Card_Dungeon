// ────────────────────────────────────────────────
// boot.js — глобальные подписки и инициализация
// Исполняется после загрузки всех модулей
// ────────────────────────────────────────────────

// Инвалидация кеша статов
EventBus.on('equipment:changed', () => State.invalidateStatsCache());
EventBus.on('pet:equipped',      () => State.invalidateStatsCache());
EventBus.on('slave:bought',      () => State.invalidateStatsCache());
EventBus.on('merc:hired',        () => State.invalidateStatsCache());
EventBus.on('merc:fired',        () => State.invalidateStatsCache());
EventBus.on('hero:updated',      () => State.invalidateStatsCache());

const _xpBoostIntervalId = setInterval(() => {
  if (!State.xpBoostExpiry) return;
  const wasActive = State.xpBoostActive;
  State.tickXpBoost();  // очищает если истёк
  if (wasActive && !State.xpBoostActive) {
    if (typeof UISystem !== 'undefined') UISystem.showToast('📖 Зелье Познания закончилось!');
  }
  // Перерисовать статусы на карточке героя (только если UI готов)
  if (typeof RenderSystem !== 'undefined' && typeof State.hero !== 'undefined' && State.hero) {
    RenderSystem.statuses?.();
  }
}, 1000);

CleanupManager.registerInterval(_xpBoostIntervalId);


// Monkey-patch SaveService.list (показывает подкласс в слоте)
const _origSaveList = SaveService.list.bind(SaveService);
SaveService.list = function() {
  return Array.from({ length: GameConfig.save.maxSlots }, (_, i) => {
    const d = this.load(i);
    if (!d) return { exists: false };
    const sub = d.subclassData?.subclass;
    return {
      exists: true, name: d.heroName, level: d.hero?.level,
      cls: d.heroClass, subName: sub ? sub.cfg?.name : null,
    };
  });
};


// ════════════════════════════════════════════════════════════
// BOOT
// ════════════════════════════════════════════════════════════
try {
  TitleSystem.init();
} catch(e) {
  const msg = (e.stack || e.message || String(e)).slice(0, 600);
  console.error('[CardDungeon BOOT ERROR]', msg);
  alert('[CardDungeon BOOT ERROR]\n' + msg);
}
