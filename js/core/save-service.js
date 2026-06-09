const SaveService = (() => {
  const { keyPrefix, version } = GameConfig.save;
  const key = slot => `${keyPrefix}${slot}`;
  return {
    save(slot, data) {
      try { localStorage.setItem(key(slot), JSON.stringify({ _v: version, ...data })); return true; }
      catch { return false; }
    },
    load(slot) {
      try {
        const raw = localStorage.getItem(key(slot));
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (data._v !== version) return this._migrate(data);
        return data;
      } catch { return null; }
    },
    remove(slot) {
      try { localStorage.removeItem(key(slot)); return true; }
      catch { return false; }
    },
    list() {
      return Array.from({ length: GameConfig.save.maxSlots }, (_, i) => {
        const d = this.load(i);
        return d ? { exists: true, name: d.heroName, level: d.hero?.level, cls: d.heroClass } : { exists: false };
      });
    },
    _migrate(data) {
      // ── v7 → v8: zone level ranges changed (1-50 → 1-100), add raidData/rankingData ──
      if (data._v <= 7) {
        // Hero level clamp: old max was ~50, remap proportionally to new 1-100 range
        if (data.hero?.level) {
          const oldLv = data.hero.level;
          // Scale: old lv 1-50 maps to 1-50 (bottom half), no reduction needed,
          // but reset zone to forest if it no longer fits the hero's level
          const validZones = ['forest','swamp','catacombs','cemetery','desert',
                              'lostcity','ravine','volcano','tundra','abyss'];
          const zoneLvRanges = {
            forest:[1,10], swamp:[11,20], catacombs:[21,30], cemetery:[31,40],
            desert:[41,50], lostcity:[51,60], ravine:[61,70], volcano:[71,80],
            tundra:[81,90], abyss:[91,100],
          };
          if (data.zoneId && zoneLvRanges[data.zoneId]) {
            const [minLv] = zoneLvRanges[data.zoneId];
            if (oldLv < minLv) data.zoneId = 'forest';
          }
        }
        // Ensure new save fields exist
        if (!data.raidData)    data.raidData    = null;
        if (!data.rankingData) data.rankingData = null;
      }
      // Common field guards (applied to all old versions)
      if (data.hero) {
        data.hero.defBuff    = data.hero.defBuff    ?? 0;
        data.hero.crit       = data.hero.crit       ?? 0.10;
        data.hero.spd        = data.hero.spd        ?? 5;
        data.hero.xp         = data.hero.xp         ?? 0;
        data.hero.xpNeeded   = data.hero.xpNeeded   ?? 100;
        data.hero.mp         = data.hero.mp         ?? (data.hero.maxMp ?? 30);
        data.hero.maxMp      = data.hero.maxMp      ?? 30;
        data.hero.hp         = data.hero.hp         ?? (data.hero.maxHp ?? 100);
        data.hero.maxHp      = data.hero.maxHp      ?? 100;
        data.hero.atk        = data.hero.atk        ?? 10;
        data.hero.def        = data.hero.def        ?? 5;
        data.hero.level      = data.hero.level      ?? 1;
      }
      if (!data.equipment || typeof data.equipment !== 'object') {
        data.equipment = { weapon: null, armor: null, ring: null, amulet: null, bracelet: null };
      } else {
        data.equipment.ring     = data.equipment.ring     ?? null;
        data.equipment.amulet   = data.equipment.amulet   ?? null;
        data.equipment.bracelet = data.equipment.bracelet ?? null;
      }
      if (!data.questData) data.questData = { board: [], active: [], history: [], blp: {} };
      if (!data.guildData) data.guildData = { guildXp: 0, rankIdx: 0 };
      data.gold       = data.gold       ?? 0;
      data.inventory  = Array.isArray(data.inventory) ? data.inventory : [];
      data.kills      = (data.kills && typeof data.kills === 'object') ? data.kills : {};
      data.totalKills = data.totalKills ?? 0;
      data.score      = data.score      ?? 0;
      data.zoneId     = data.zoneId     ?? 'forest';
      data.heroClass  = data.heroClass  ?? 'warrior';
      data._v         = version;
      return data;
    }
  };
})();
const SaveSystem = (() => {
  function autosave() {
    SaveService.save(State.slot, State.toSave());
    EventBus.emit('game:saved', State.slot);
  }
  return { autosave };
})();
const SaveManager = (() => {
  const SAVE_VERSION   = GameConfig.save.version;
  const SAVE_SIGNATURE = 'CARD_DUNGEON_SAVE';

  // ── Сериализация полного GameState в объект ──
  function _serialize() {
    const base = State.toSave();
    // Убедимся что constraints включены (через пропатченный toSave)
    return {
      _sig:        SAVE_SIGNATURE,
      _v:          SAVE_VERSION,
      _ts:         Date.now(),
      _slot:       State.slot,
      _heroName:   State.heroName,
      _heroLevel:  State.hero?.level ?? 0,
      _heroClass:  State.heroClassKey,
      _saveDate:   new Date().toLocaleString('ru-RU'),
      petData:     typeof PetProgressionSystem !== 'undefined' ? PetProgressionSystem.toSave?.() : undefined,
      ...base,
    };
  }

  // ── Валидация структуры файла сохранения ──
  function validateSave(data) {
    if (!data || typeof data !== 'object')              return { ok: false, reason: 'Файл не является объектом JSON.' };
    if (data._sig !== SAVE_SIGNATURE)                   return { ok: false, reason: 'Неверная подпись файла. Это не сохранение Card Dungeon.' };
    if (typeof data._v !== 'number')                    return { ok: false, reason: 'Отсутствует версия сохранения.' };
    if (!data.hero || typeof data.hero !== 'object')    return { ok: false, reason: 'Отсутствуют данные персонажа.' };
    if (typeof data.heroName !== 'string')              return { ok: false, reason: 'Имя персонажа не найдено.' };
    if (!Array.isArray(data.inventory))                 return { ok: false, reason: 'Инвентарь повреждён.' };
    if (typeof data.gold !== 'number')                  return { ok: false, reason: 'Данные о золоте повреждены.' };
    // Предупреждение о версии (не блокируем — миграция справится)
    if (data._v > SAVE_VERSION)                         return { ok: false, reason: `Версия сохранения (${data._v}) новее текущей игры (${SAVE_VERSION}). Обновите страницу.` };
    return { ok: true };
  }

  // ── Сохранить игру в файл ──
  // Chrome/Edge десктоп: File System Access API → системный диалог «Сохранить как»
  // Все остальные браузеры: кастомный диалог с полем имени → download
  function saveToFile() {
    if (!State.hero) { UISystem.showToast('⚠️ Нет активной игры для сохранения.'); return; }

    const payload  = _serialize();
    const json     = JSON.stringify(payload, null, 2);
    const ts       = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const defName  = `card_dungeon_${(State.heroName || 'hero').replace(/\s+/g, '_')}_lv${State.hero.level}_${ts}`;

    // Chrome/Edge desktop — системный диалог «Сохранить как»
    if (typeof window.showSaveFilePicker === 'function') {
      _saveWithPicker(json, defName + '.json');
    } else {
      // Все остальные — сначала показываем кастомный диалог с именем файла
      _showSaveDialog(json, defName);
    }
  }

  // File System Access API (Save As системный диалог)
  async function _saveWithPicker(json, suggestedName) {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName,
        types: [{
          description: 'Card Dungeon Save (.json)',
          accept: { 'application/json': ['.json'] },
        }],
        excludeAcceptAllOption: false,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(json);
      await writable.close();
      UISystem.showToast('💾 Игра сохранена!');
      EventBus.emit('save:exported', { heroName: State.heroName, level: State.hero?.level });
    } catch (err) {
      if (err.name === 'AbortError') return; // пользователь закрыл диалог
      console.warn('[SaveManager] showSaveFilePicker failed, fallback:', err);
      _showSaveDialog(json, State.heroName);
    }
  }

  // Кастомный диалог с полем имени файла (работает везде)
  function _showSaveDialog(json, defaultName) {
    // Убираем старый диалог если есть
    document.getElementById('save-dialog-ov')?.remove();

    const ov = document.createElement('div');
    ov.id = 'save-dialog-ov';
    ov.style.cssText = [
      'position:fixed','inset:0','z-index:9999',
      'background:rgba(0,0,0,.88)',
      'display:flex','align-items:center','justify-content:center',
      'padding:20px',
      '-webkit-backdrop-filter:blur(4px)','backdrop-filter:blur(4px)',
    ].join(';');

    const hero  = State.hero;
    const cls   = GameConfig.classes[State.heroClassKey];
    const bytes = Math.round(json.length / 1024 * 10) / 10;

    ov.innerHTML = `
      <div style="
        background:#1a1612;border:2px solid #c9922a;border-radius:14px;
        padding:22px 20px;max-width:360px;width:100%;
        box-shadow:0 0 60px rgba(201,146,42,.25);
        font-family:'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif;
        color:#e8dcc8;
      ">
        <div style="font-size:18px;font-weight:900;color:#f0c050;letter-spacing:1px;margin-bottom:4px;">
          💾 Сохранить игру
        </div>
        <div style="font-size:11px;color:#7a6a55;margin-bottom:14px;line-height:1.5;">
          Файл будет скачан в папку <b style="color:#e8dcc8;">Загрузки</b> на вашем устройстве.<br>
          Расширение <b style="color:#f0c050;">.json</b> добавится автоматически.
        </div>

        <div style="
          display:flex;align-items:center;gap:10px;
          background:rgba(0,0,0,.4);border:1px solid #3a2e22;
          border-radius:8px;padding:10px 12px;margin-bottom:14px;
        ">
          <div style="font-size:32px;line-height:1;">${cls?.ico ?? '⚔️'}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:700;color:#f0c050;">${hero.name}</div>
            <div style="font-size:10px;color:#7a6a55;margin-top:2px;">
              Ур. ${hero.level} · ${cls?.name ?? ''} · ${hero.hp}/${hero.maxHp} HP · ${State.gold}💰
            </div>
          </div>
          <div style="font-size:10px;color:#7a6a55;text-align:right;flex-shrink:0;">
            ${bytes} KB
          </div>
        </div>

        <div style="font-size:11px;color:#7a6a55;margin-bottom:5px;letter-spacing:.3px;">
          ИМЯ ФАЙЛА
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:16px;">
          <input id="save-fname-inp"
            value="${defaultName}"
            style="
              flex:1;background:#100e0c;border:2px solid #3a2e22;color:#f0c050;
              font-size:13px;font-family:inherit;padding:10px 12px;
              border-radius:8px;outline:none;-webkit-appearance:none;
              min-width:0;
            "
            spellcheck="false" autocorrect="off" autocapitalize="off"
          >
          <span style="font-size:12px;color:#7a6a55;flex-shrink:0;">.json</span>
        </div>

        <div style="display:flex;gap:8px;">
          <button id="save-dialog-cancel" style="
            flex:1;font-family:inherit;font-size:13px;font-weight:700;
            background:#1a1612;color:#7a6a55;border:1px solid #3a2e22;
            padding:12px;border-radius:8px;cursor:pointer;letter-spacing:.5px;min-height:44px;
          ">Отмена</button>
          <button id="save-dialog-ok" style="
            flex:2;font-family:inherit;font-size:14px;font-weight:700;
            background:linear-gradient(135deg,#8a6010,#f0c050);color:#000;
            border:none;padding:12px;border-radius:8px;cursor:pointer;
            letter-spacing:1px;min-height:44px;
            box-shadow:0 4px 16px rgba(201,146,42,.3);
          ">💾 Скачать файл</button>
        </div>
      </div>`;

    document.body.appendChild(ov);

    const inp    = ov.querySelector('#save-fname-inp');
    const okBtn  = ov.querySelector('#save-dialog-ok');
    const canBtn = ov.querySelector('#save-dialog-cancel');

    // Фокус и выделение имени
    setTimeout(() => { inp.focus(); inp.select(); }, 80);

    // Подсветить input при фокусе
    inp.addEventListener('focus', () => { inp.style.borderColor = '#c9922a'; });
    inp.addEventListener('blur',  () => { inp.style.borderColor = '#3a2e22'; });

    // Enter → сохранить
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); okBtn.click(); }
      if (e.key === 'Escape') canBtn.click();
    });

    okBtn.addEventListener('click', () => {
      const rawName = inp.value.trim() || defaultName;
      // Убрать .json если пользователь вписал сам
      const cleanName = rawName.replace(/\.json$/i, '');
      const fname = cleanName + '.json';
      ov.remove();
      _saveWithBlob(json, fname);
    });

    canBtn.addEventListener('click', () => ov.remove());

    // Клик вне диалога — закрыть
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
  }

  // Blob download (не показывает диалог — вызывается из _showSaveDialog)
  function _saveWithBlob(json, fname) {
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      UISystem.showToast(`💾 Файл «${fname}» скачан!`);
      EventBus.emit('save:exported', { heroName: State.heroName, level: State.hero?.level });
    } catch (e) {
      console.error('[SaveManager] _saveWithBlob error:', e);
      UISystem.showToast('❌ Ошибка при сохранении файла.');
    }
  }

  // ── Восстановить GameState из десериализованных данных ──
  function _restoreState(data) {
    // Мигрировать старые данные через SaveService._migrate если нужно
    const migratedData = data._v !== SAVE_VERSION
      ? SaveService._migrate({ ...data })
      : data;

    // Определить слот: взять из файла или дефолтный 0
    const targetSlot = (typeof migratedData._slot === 'number') ? migratedData._slot : 0;
    State.setSlot(targetSlot);

    // Восстановить основной State через fromSave
    // Внутри уже вызывается патч GameState.prototype.fromSave, который корректно
    // восстанавливает PetSystem (petData) и PetProgressionSystem (petProgData)
    State.fromSave(migratedData);

    return targetSlot;
  }

  // ── Загрузить игру из файла (FileReader API) ──
  function loadFromFile() {
    // Создать временный file input
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', () => {
      const file = input.files[0];
      document.body.removeChild(input);
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        let data;
        try {
          data = JSON.parse(e.target.result);
        } catch (parseErr) {
          UISystem.showToast('❌ Файл повреждён: не удалось разобрать JSON.');
          console.error('[SaveManager] JSON parse error:', parseErr);
          return;
        }

        const validation = validateSave(data);
        if (!validation.ok) {
          UISystem.showToast(`❌ ${validation.reason}`);
          console.error('[SaveManager] Validation failed:', validation.reason);
          return;
        }

        // Показать предупреждение если идёт активная игра
        const hasActiveHero = !!State.hero;
        const heroInfo = data._heroName
          ? `${data._heroName} Ур.${data._heroLevel ?? '?'} (${data._saveDate ?? ''})`
          : `${data.heroName} Ур.${data.hero?.level ?? '?'}`;

        const proceed = !hasActiveHero || window.confirm(
          `Загрузить сохранение?\n\n${heroInfo}\n\nТекущий прогресс будет ЗАМЕНЁН загруженным файлом.`
        );
        if (!proceed) return;

        try {
          // Завершить текущий бой и сессию перед загрузкой (через safeStartCombat позже)
          CombatSessionManager.terminateCombat('save_load');

          // Закрыть все overlay
          document.querySelectorAll('.overlay, .pet-overlay, .card-detail-ov').forEach(el => el.classList.add('hide'));

          // Восстановить состояние
          const slot = _restoreState(data);

          // Запустить игровой экран — safeStartCombat гарантирует отсутствие дублей
          NavSystem.build();
          NavSystem.switchTab('hunt');
          UISystem.setHTML('log', '');
          CombatSessionManager.safeStartCombat(() => WorldSystem.spawnMonster(), 'save_load');

          EventBus.emit('game:loaded', slot);
          EventBus.emit('game:started', { heroName: State.heroName });

          UISystem.showToast(`✅ Загружено: ${State.heroName} Ур.${State.hero?.level}`);

          // Autosave to localStorage slot чтобы прогресс не пропал при закрытии вкладки
          SaveSystem.autosave();
        } catch (restoreErr) {
          console.error('[SaveManager] Restore error:', restoreErr);
          UISystem.showToast('❌ Ошибка восстановления игры из файла.');
        }
      };

      reader.onerror = () => {
        UISystem.showToast('❌ Ошибка чтения файла.');
      };

      reader.readAsText(file);
    });

    input.click();
  }

  return { saveToFile, loadFromFile, validateSave };
})();
