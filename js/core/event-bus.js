'use strict';

// ── Глобальный перехват ошибок для диагностики ──
// window.onerror не видит детали из iframe (cross-origin), поэтому
// используем try/catch прямо вокруг boot-кода внизу файла.
// Этот обработчик ловит только async-ошибки (Promise rejections).
window.addEventListener('unhandledrejection', function(e) {
  const msg = String(e.reason?.stack || e.reason || 'unknown promise rejection');
  console.error('[CardDungeon PROMISE]', msg);
  alert('[CardDungeon] Async error:\n' + msg.slice(0, 400));
});

// ════════════════════════════════════════════════════════════
// DYNAMIC VIEWPORT HEIGHT
// ════════════════════════════════════════════════════════════
function setVH() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
setVH();
window.addEventListener('resize', setVH);
window.addEventListener('orientationchange', () => setTimeout(setVH, 200));

// ════════════════════════════════════════════════════════════
// EVENT BUS — центральная шина событий
// ════════════════════════════════════════════════════════════
const EventBus = (() => {
  const _listeners = new Map();
  // Track which (event, handler) pairs are currently subscribed to prevent duplicate registrations
  const _handlerSets = new Map();
  // For once(): Map<event, Map<originalHandler, wrapper>> — prevents double-registration
  const _onceWrappers = new Map();

  return {
    on(event, handler) {
      if (!_listeners.has(event)) {
        _listeners.set(event, []);
        _handlerSets.set(event, new Set());
      }
      // Prevent duplicate subscriptions of the exact same handler reference
      if (_handlerSets.get(event).has(handler)) {
        return () => this.off(event, handler);
      }
      _listeners.get(event).push(handler);
      _handlerSets.get(event).add(handler);
      return () => this.off(event, handler);
    },
    off(event, handler) {
      const list = _listeners.get(event);
      if (list) _listeners.set(event, list.filter(h => h !== handler));
      const hset = _handlerSets.get(event);
      if (hset) hset.delete(handler);
      // Если снимают оригинальный once-хэндлер — чистим запись о wrapper
      const onceMap = _onceWrappers.get(event);
      if (onceMap) onceMap.delete(handler);
    },
    emit(event, payload) {
      // Iterate a snapshot to prevent race conditions if a handler calls on/off/once
      const handlers = (_listeners.get(event) || []).slice();
      handlers.forEach(h => {
        try { h(payload); }
        catch (e) { console.error(`[EventBus] Error in "${event}" handler:`, e); }
      });
    },
    once(event, handler) {
      // Дедупликация: если этот же handler уже зарегистрирован через once — игнорируем
      if (!_onceWrappers.has(event)) _onceWrappers.set(event, new Map());
      const onceMap = _onceWrappers.get(event);
      if (onceMap.has(handler)) return;

      const wrapper = (payload) => {
        this.off(event, wrapper);
        onceMap.delete(handler);
        handler(payload);
      };
      onceMap.set(handler, wrapper);
      this.on(event, wrapper);
    },
    // Remove all listeners for a specific event (used by CleanupManager)
    clearEvent(event) {
      _listeners.delete(event);
      _handlerSets.delete(event);
      _onceWrappers.delete(event);
    }
  };
})();

