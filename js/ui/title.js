const TitleSystem = (() => {
  function init() {
    _buildSlots();
    _buildClassPicker();
    _bindFormButtons();
    _bindFileButtons();
  }

  function _bindFileButtons() {
    const saveBtn = document.getElementById('sm-title-save');
    const loadBtn = document.getElementById('sm-title-load');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (!State.hero) {
          UISystem.showToast('⚠️ Нет активной игры. Сначала создайте или загрузите персонажа.');
          return;
        }
        SaveManager.saveToFile();
      });
    }

    if (loadBtn) {
      loadBtn.addEventListener('click', () => SaveManager.loadFromFile());
    }

    // Обновлять видимость кнопки сохранения при показе title screen
    _updateSaveBtnVisibility();
  }

  function _updateSaveBtnVisibility() {
    const saveBtn = document.getElementById('sm-title-save');
    if (saveBtn) {
      // Кнопка видна только если есть активный герой
      saveBtn.style.display = State.hero ? '' : 'none';
    }
  }

  function _buildSlots() {
    const CLASS_ICONS = { warrior:'🛡️', mage:'🔮', rogue:'🗡️', ranger:'🏹', paladin:'⚜️' };
    const slots = SaveService.list();
    const container = UISystem.$('slot-btns');
    container.innerHTML = slots.map((slot, i) => {
      if (slot.exists) {
        const clsKey  = slot.cls || 'warrior';
        const clsIco  = CLASS_ICONS[clsKey] || '⚔️';
        const clsName = GameConfig.classes[clsKey]?.name || clsKey;
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <button class="slot-btn has-save" data-slot="${i}">
            <span class="slot-icon hero-sprite">${clsIco}</span>
            <span class="slot-class-name">${clsName}</span>
            ${slot.name}
            <br><small style="font-size:10px;opacity:.7">Ур.${slot.level}</small>
          </button>
          <button class="slot-del-btn" data-slot="${i}" style="background:rgba(192,57,43,.15);border:1px solid rgba(192,57,43,.4);color:var(--red-lt);font-size:10px;font-family:inherit;border-radius:6px;padding:5px 10px;cursor:pointer;min-height:30px;letter-spacing:.3px;width:100%;">🗑 Удалить</button>
        </div>`;
      }
      return `<button class="slot-btn" data-slot="${i}">
        <span class="slot-icon">➕</span>
        Слот ${i + 1}
      </button>`;
    }).join('');

    // Кнопки выбора слота
    container.querySelectorAll('.slot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.slot);
        State.setSlot(idx);
        slots[idx].exists ? _loadGame(idx) : _showNewHeroForm();
      });
    });

    // Кнопки удаления персонажа
    container.querySelectorAll('.slot-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.slot);
        SessionManager.deleteCharacter(idx);
      });
    });
  }

  let _selectedClass = 'warrior';

  function _buildClassPicker() {
    const clsRow = UISystem.$('cls-row');
    clsRow.innerHTML = Object.entries(GameConfig.classes).map(([key, cls]) =>
      `<button class="cls-btn" data-class="${key}"><span class="cls-ic">${cls.ico}</span>${cls.name}</button>`
    ).join('');
    clsRow.querySelectorAll('.cls-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        clsRow.querySelectorAll('.cls-btn').forEach(b => b.classList.remove('sel'));
        btn.classList.add('sel');
        _selectedClass = btn.dataset.class;
      });
    });
    clsRow.querySelector('.cls-btn')?.classList.add('sel');
  }

  function _bindFormButtons() {
    UISystem.$('create-hero-btn').addEventListener('click', () => {
      const name = (UISystem.$('hero-name-inp').value.trim() || 'Герой').slice(0, 14);
      const classCfg = GameConfig.classes[_selectedClass];
      const stats = { ...classCfg.stats };

      State.setHeroClass(_selectedClass);
      State.setHero({
        name, level: 1, xp: 0, xpNeeded: PlayerSystem.xpForLevel(1),
        hp: stats.hp, maxHp: stats.hp,
        mp: stats.mp, maxMp: stats.mp,
        atk: stats.atk, def: stats.def, spd: stats.spd, crit: stats.crit,
        defBuff: 0,
      });
      State._heroName = name; // keep heroName alias
      State._gold = 0;
      State._inventory = [];
      State._equipment = { weapon: null, armor: null, ring: null, amulet: null, bracelet: null };
      State._kills = {};
      State._bossKills = {};
      State._totalKills = 0;
      State._score = 0;
      State._zone = GameConfig.zones[0];

      _startGame();
      EventBus.emit('game:newHero', { name, classKey: _selectedClass });
    });

    UISystem.$('cancel-new-hero').addEventListener('click', () => {
      UISystem.$('new-hero-form').style.display = 'none';
      UISystem.$('slot-btns').style.display = 'flex';
    });
  }

  function _showNewHeroForm() {
    UISystem.$('slot-btns').style.display = 'none';
    UISystem.$('new-hero-form').style.display = 'flex';
    UISystem.$('hero-name-inp').value = '';
    setTimeout(() => UISystem.$('hero-name-inp').focus(), 100);
  }

  function _loadGame(slot) {
    const data = SaveService.load(slot); if (!data) return;
    State.setSlot(slot);
    State.fromSave(data);
    _startGame();
    EventBus.emit('game:loaded', slot);
  }

  function _startGame() {
    // Сбросить возможный бой от предыдущей сессии + guard от двойного спавна
    NavSystem.build();
    NavSystem.switchTab('hunt');
    UISystem.setHTML('log', '');
    CombatSessionManager.safeStartCombat(() => WorldSystem.spawnMonster(), 'new_game');
    EventBus.emit('game:started', { heroName: State.heroName });
  }

  // Публичный метод: показать экран выбора персонажа
  function showTitle() {
    UISystem.$('new-hero-form').style.display = 'none';
    UISystem.$('slot-btns').style.display = 'flex';
    _buildSlots();
    _updateSaveBtnVisibility();
    UISystem.setScreen('title');
  }

  // Публичный метод: обновить список слотов без смены экрана
  function refreshSlots() {
    _buildSlots();
  }

  return { init, showTitle, refreshSlots, updateSaveBtnVisibility: _updateSaveBtnVisibility };
})();
