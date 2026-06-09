const CleanupManager = (() => {
  const _intervals = new Set();
  const _timeouts  = new Set();
  const _domListeners = []; // { el, event, fn, options }

  function registerInterval(id) {
    _intervals.add(id);
    return id;
  }

  function registerTimeout(id) {
    _timeouts.add(id);
    return id;
  }

  function registerDomListener(el, event, fn, options) {
    el.addEventListener(event, fn, options);
    _domListeners.push({ el, event, fn, options });
  }

  function unregisterInterval(id) {
    clearInterval(id);
    _intervals.delete(id);
  }

  // Clear all tracked global intervals (not combat session ones — those are in CombatSessionManager)
  function clearAllIntervals() {
    _intervals.forEach(id => clearInterval(id));
    _intervals.clear();
  }

  function clearAllTimeouts() {
    _timeouts.forEach(id => clearTimeout(id));
    _timeouts.clear();
  }

  function clearAllDomListeners() {
    _domListeners.forEach(({ el, event, fn, options }) => {
      try { el.removeEventListener(event, fn, options); } catch (_) {}
    });
    _domListeners.length = 0;
  }

  // Called on session:ended to free resources
  EventBus.on('session:ended', () => {
    clearAllTimeouts();
    // Note: global intervals (banner etc.) are intentionally kept alive —
    // they are UI-level and survive session changes.
  });

  return { registerInterval, registerTimeout, registerDomListener, unregisterInterval, clearAllIntervals, clearAllTimeouts, clearAllDomListeners };
})();
const CombatSessionManager = (() => {
  // ── Счётчик сессий ──────────────────────────────────────────
  // Инкрементируется при каждом terminateCombat().
  // Колбэки захватывают _sessionId в момент создания и проверяют
  // его перед выполнением — «мёртвые» таймеры самоустраняются.
  let _sessionId = 0;

  // Все активные setTimeout-id текущей сессии
  const _pendingTimers = new Set();

  // Флаг защиты от re-entrant спавна
  let _spawnLock = false;

  // EventBus-подписки, управляемые менеджером (для будущей очистки)
  const _managedListeners = [];

  // ── currentSession ───────────────────────────────────────────
  function currentSession() { return _sessionId; }

  // ── safeTimeout ──────────────────────────────────────────────
  /**
   * setTimeout с привязкой к сессии.
   * Колбэк автоматически игнорируется, если сессия сменилась.
   */
  function safeTimeout(fn, delay) {
    const capturedSession = _sessionId;
    const tid = setTimeout(() => {
      _pendingTimers.delete(tid);
      if (_sessionId !== capturedSession) return; // сессия уже завершена
      fn();
    }, delay);
    _pendingTimers.add(tid);
    return tid;
  }

  // ── resetCombatState ─────────────────────────────────────────
  /**
   * Сбрасывает только боевые переменные (combatState, monster, active).
   * НЕ трогает hero, gold, inventory, zone — совместимо с сохранениями.
   * Вызывается как из terminateCombat(), так и напрямую (respawn).
   */
  function resetCombatState() {
    State.setActive(false);
    State.setMonster(null);
    State.resetCombatState();        // сбрасывает turn, statuses, counterReady
    _spawnLock = false;              // разблокировать возможный спавн
  }

  // ── terminateCombat ──────────────────────────────────────────
  /**
   * Единая точка выхода из боя. Прерывает бой в любой момент.
   *
   * Гарантии:
   *  ✓ все pending-таймеры текущего боя уничтожены
   *  ✓ stale-колбэки (_monsterTurn и пр.) не выполнятся
   *  ✓ State.active = false, State.monster = null
   *  ✓ combatState полностью сброшен
   *  ✓ кнопки задизейблены
   *  ✓ loot-overlay скрыт
   *  ✓ _spawnLock снят
   *  ✓ EventBus:'combat:terminated' эмитирован
   *  ✓ совместимо с сохранениями (hero/gold/inventory не тронуты)
   */
  function terminateCombat(reason = 'navigation') {
    // 1. Инвалидировать все колбэки текущей сессии одним инкрементом
    _sessionId++;

    // 2. Уничтожить все зарегистрированные таймеры
    _pendingTimers.forEach(tid => clearTimeout(tid));
    _pendingTimers.clear();

    // 3. Снять spawn-lock независимо от состояния
    _spawnLock = false;

    // 4. Если бой уже чист — просто выходим (идемпотентность)
    if (!State.active && !State.monster) return;

    // 5. Сбросить боевое состояние
    resetCombatState();

    // 6. Задизейблить кнопки (защита от ghost-clicks)
    ['b-atk', 'b-ctr', 'b-skl', 'b-itm', 'b-fle'].forEach(id => {
      const el = UISystem.$(id);
      if (el) el.disabled = true;
    });

    // 7. Скрыть loot overlay если открыт
    UISystem.addClass('loot-ov', 'hide');

    // 8. Уведомить подписчиков
    EventBus.emit('combat:terminated', { reason, sessionId: _sessionId });
  }

  // ── safeStartCombat ──────────────────────────────────────────
  /**
   * Безопасно начать новый бой.
   *
   * Гарантии:
   *  ✓ текущий бой завершён перед стартом нового (terminateCombat)
   *  ✓ re-entrant вызовы заблокированы (_spawnLock)
   *  ✓ не создаются дублирующиеся враги
   *  ✓ все таймеры предыдущей сессии мертвы до вызова spawnFn
   *
   * @param {Function} spawnFn — функция спавна (напр. WorldSystem.spawnMonster)
   * @param {string}   [reason] — причина для terminateCombat
   */
  function safeStartCombat(spawnFn, reason = 'new_fight') {
    if (_spawnLock) {
      console.warn('[CombatSessionManager] safeStartCombat: spawn already in progress, ignoring.');
      return;
    }

    // Завершить предыдущий бой (включая таймеры и сброс стейта)
    terminateCombat(reason);

    _spawnLock = true;
    try {
      spawnFn();
    } catch (e) {
      console.error('[CombatSessionManager] safeStartCombat: spawnFn threw', e);
    } finally {
      // Lock снимается внутри spawnFn когда State.active выставляется в true,
      // или здесь если spawnFn не вызвала спавн (нет монстров в зоне и т.п.)
      if (!State.active) _spawnLock = false;
      else _spawnLock = false; // всегда снимаем — guard был нужен только против re-entry
    }
  }

  // ── Публичный интерфейс ──────────────────────────────────────
  return {
    currentSession,
    safeTimeout,
    terminateCombat,
    safeStartCombat,
    resetCombatState,
    /** Только для диагностики/тестов: возвращает кол-во pending таймеров */
    get pendingTimerCount() { return _pendingTimers.size; },
    /** Только для диагностики: текущий spawn-lock */
    get spawnLocked() { return _spawnLock; },
  };
})();
