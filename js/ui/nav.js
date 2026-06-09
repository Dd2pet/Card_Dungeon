const NavSystem = (() => {
  const NAV_ITEMS = [
    { id: 'hunt',     label: 'Бой',     icon: '⚔️' },
    { id: 'hero',     label: 'Герой',   icon: '🧙' },
    { id: 'inv',      label: 'Инвент',  icon: '🎒' },
    { id: 'gather',   label: 'Добыча',  icon: '⛏️' },
    { id: 'cards',    label: 'Карты',   icon: '🃏' },
    { id: 'guild',    label: 'Гильдия', icon: '⚔️' },
    { id: 'shop',     label: 'Магазин', icon: '🏪' },
    { id: 'stats',    label: 'Стат',    icon: '📊' },
  ];
  const SCREEN_MAP = {
    hunt:   'game',
    hero:   'hero-tab',
    inv:    'inv-tab',
    cards:  'cards-tab',
    guild:  'guild-tab',
    shop:   'shop-tab',
    stats:  'stats-tab',
    gather: 'gather-tab',
  };
  const ALL_NAV_IDS = ['nav-game','nav-hero','nav-inv','nav-stats','nav-guild','nav-shop','nav-cards','nav-gather'];
  let _current = 'hunt';

  function build() {
    ALL_NAV_IDS.forEach(navId => {
      const nav = document.getElementById(navId); if (!nav) return;
      nav.innerHTML = NAV_ITEMS.map(item =>
        `<button class="nb ${item.id === _current ? 'on' : ''}" data-nav="${item.id}">
          <span class="ni">${item.icon}</span>${item.label}
        </button>`
      ).join('');
      nav.querySelectorAll('.nb').forEach(btn =>
        btn.addEventListener('click', () => switchTab(btn.dataset.nav))
      );
    });
  }

  function switchTab(id) {
    _current = id;
    // Cards tab: screen injected dynamically
    if (id === 'cards') {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      const cardScreen = document.getElementById('cards-tab');
      if (cardScreen) cardScreen.classList.add('active');
    } else {
      UISystem.setScreen(SCREEN_MAP[id] || 'game');
    }
    build();
    if (id === 'hero')   RenderSystem.heroTab();
    if (id === 'inv')    RenderSystem.invTab();
    if (id === 'shop')   RenderSystem.shopTab();
    if (id === 'stats')  RenderSystem.statsTab();
    if (id === 'guild')  GuildRenderSystem.render();
    if (id === 'gather') GatheringSystem.renderTab();
    if (id === 'cards') {
      const goldEl = document.getElementById('cards-gold');
      if (goldEl) goldEl.textContent = State.gold;
      if (typeof CardSystem !== 'undefined') CardSystem.renderCardTab();
    }
    EventBus.emit('nav:tabChanged', id);
  }

  return { build, switchTab, get current() { return _current; } };
})();
const SessionManager = (() => {

  // Показать диалог подтверждения (простой overlay)
  function _confirm(message, onYes) {
    // Удалить старый диалог если есть
    let old = document.getElementById('sm-confirm-ov');
    if (old) old.remove();

    const ov = document.createElement('div');
    ov.id = 'sm-confirm-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:20px;';
    ov.innerHTML = `
      <div style="background:var(--card);border:2px solid var(--gold);border-radius:12px;padding:24px 20px;max-width:320px;width:100%;text-align:center;box-shadow:0 0 40px rgba(201,146,42,.25);">
        <div style="font-size:32px;margin-bottom:10px;">⚠️</div>
        <div style="font-size:14px;color:var(--text);line-height:1.5;margin-bottom:20px;">${message}</div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button id="sm-yes" style="background:linear-gradient(135deg,#7b0000,var(--red-lt));color:#fff;border:none;border-radius:8px;padding:12px 24px;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;">✅ Да</button>
          <button id="sm-no" style="background:var(--surf);color:var(--muted);border:1px solid var(--bord);border-radius:8px;padding:12px 24px;font-size:14px;font-family:inherit;cursor:pointer;min-height:44px;">❌ Отмена</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    document.getElementById('sm-yes').addEventListener('click', () => { ov.remove(); onYes(); });
    document.getElementById('sm-no').addEventListener('click', () => ov.remove());
  }

  // Полная очистка игровой сессии без перезагрузки страницы
  function _cleanupSession() {
    // 1. Завершить бой и все таймеры
    CombatSessionManager.terminateCombat('return_to_menu');

    // 2. Закрыть все overlay/modal элементы
    document.querySelectorAll('.overlay, .pet-overlay, .card-detail-ov').forEach(el => {
      el.classList.add('hide');
    });
    const smOv = document.getElementById('sm-confirm-ov');
    if (smOv) smOv.remove();

    // 3. Очистить лог боя
    UISystem.setHTML('log', '');

    // 4. Сбросить боевое состояние UI
    ['b-atk','b-ctr','b-skl','b-itm','b-fle'].forEach(id => {
      const el = UISystem.$(id); if (el) el.disabled = true;
    });

    // 5. Эмитить событие завершения сессии
    EventBus.emit('session:ended', { slot: State.slot });
  }

  // Публичный метод: возврат в главное меню
  function returnToMainMenu() {
    _confirm(
      'Выйти в главное меню?<br><small style="color:var(--muted);">Прогресс будет сохранён.</small>',
      () => {
        // Сохранить прогресс
        SaveSystem.autosave();
        // Очистить сессию
        _cleanupSession();
        // Перейти на экран выбора персонажа
        TitleSystem.showTitle();
      }
    );
  }

  // Публичный метод: удалить персонажа из слота
  function deleteCharacter(slotIdx) {
    const slots = SaveService.list();
    const slot = slots[slotIdx];
    if (!slot || !slot.exists) return;

    const isActive = (State.hero !== null && State.slot === slotIdx);
    const charName = slot.name || `Слот ${slotIdx + 1}`;

    _confirm(
      `Удалить персонажа <b>${charName}</b>?<br><small style="color:var(--red-lt);">Это действие необратимо. Все данные будут уничтожены.</small>`,
      () => {
        if (isActive) {
          // Сначала завершить сессию, затем удалить
          _cleanupSession();
          SaveService.remove(slotIdx);
          TitleSystem.showTitle();
        } else {
          SaveService.remove(slotIdx);
          TitleSystem.refreshSlots();
        }
        EventBus.emit('character:deleted', { slot: slotIdx, name: charName });
      }
    );
  }

  return { returnToMainMenu, deleteCharacter };
})();
