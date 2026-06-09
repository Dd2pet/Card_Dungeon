const SlaveSystem = (() => {
  // Расы полулюдей
  const RACES = [
    { id:'catfolk',   label:'Кошколюди',   av:'🐱', color:'#e0a060', desc:'Полукошки' },
    { id:'lizardfolk',label:'Ящеролюди',   av:'🦎', color:'#60c060', desc:'Полуящеры' },
    { id:'bearfolk',  label:'Медведелюди', av:'🐻', color:'#c08040', desc:'Полумедведи' },
    { id:'wolffolk',  label:'Волколюди',   av:'🐺', color:'#8090b0', desc:'Полуволки' },
    { id:'boarfolk',  label:'Кабанолюди',  av:'🐗', color:'#a06040', desc:'Полукабаны' },
    { id:'foxfolk',   label:'Лисолюди',    av:'🦊', color:'#e06820', desc:'Полулисы' },
    { id:'rabbitfolk',label:'Кроликолюди', av:'🐰', color:'#e0c0c0', desc:'Полукролики' },
    { id:'dragonfolk',label:'Драконолюди', av:'🐲', color:'#c040a0', desc:'Полудраконы' },
    { id:'fishfolk',  label:'Рыболюди',    av:'🐟', color:'#40a0c0', desc:'Полурыбы' },
    { id:'owlfolk',   label:'Совалюди',    av:'🦉', color:'#a080c0', desc:'Полусовы' },
  ];

  const MALE_NAMES = ['Арон','Борис','Витас','Гор','Дан','Ерик','Зарк','Итан','Корн','Лан',
    'Март','Нар','Орен','Пей','Рикс','Стас','Торн','Укас','Фар','Харт',
    'Цель','Шон','Эрик','Юар','Яков','Ален','Бас','Верн','Гас','Дорн'];
  const FEMALE_NAMES = ['Ара','Бела','Вира','Гала','Дана','Ева','Зора','Ира','Кира','Лара',
    'Мира','Нора','Ора','Пала','Рена','Сара','Тина','Ула','Фая','Хара',
    'Цена','Шара','Эла','Юна','Яна','Алис','Бира','Вена','Гала','Дина'];

  // Базовые статы раба ур.1 — заметно слабее героя, но сильнее питомца
  function _baseStats(level) {
    const l = Math.max(1, level);
    return {
      atk:   Math.floor(6 + l * 1.8),
      def:   Math.floor(3 + l * 1.2),
      spd:   Math.max(1, 3 + Math.floor(l * 0.4)),
      maxHp: Math.floor(60 + l * 18),
      maxMp: Math.floor(20 + l * 6),
      crit:  Math.min(0.35, 0.04 + l * 0.003),
    };
  }

  function _genSlave(id) {
    const race   = RACES[Math.floor(Math.random() * RACES.length)];
    const gender = Math.random() < 0.5 ? 'male' : 'female';
    const names  = gender === 'male' ? MALE_NAMES : FEMALE_NAMES;
    const name   = names[Math.floor(Math.random() * names.length)];
    const stats  = _baseStats(1);
    // Price: expensive, 2000-6000 gold
    const price  = 2000 + Math.floor(Math.random() * 4000);
    return {
      id,
      name,
      race:       race.id,
      raceLabel:  race.label,
      av:         race.av,
      gender,
      genderLabel: gender === 'male' ? '♂ Муж.' : '♀ Жен.',
      level: 1,
      price,
      equipment: { weapon: null, armor: null, ring: null, amulet: null, bracelet: null, extra: null },
      ...stats,
    };
  }

  let _slaves    = [];   // available in shop (regenerated rarely)
  let _ownedSlave = null; // the one slave owned by player
  let _killCount = 0;    // kills since last spawn check
  // Slave spawn rate: petChance for common is 0.008, slave is 10x rarer = 0.0008
  const SLAVE_SPAWN_CHANCE = 0.0008;
  const MAX_SHOP_SLAVES    = 2;

  function getSlaves()     { return _slaves; }
  function getOwnedSlave() { return _ownedSlave; }

  function getSlaveRaceColor(raceId) {
    return RACES.find(r => r.id === raceId)?.color || '#a0a0a0';
  }

  function getLevelUpCost(slave) {
    if (!slave) return 0;
    return Math.floor(300 * Math.pow(1.25, slave.level - 1));
  }

  // Try to spawn a new slave in the shop after a kill
  function trySpawnSlave() {
    if (_slaves.length >= MAX_SHOP_SLAVES) return;
    const heroLv = State.hero?.level || 1;
    if (heroLv < 25) return;
    if (Math.random() < SLAVE_SPAWN_CHANCE) {
      const id = `slave_${Date.now()}_${Math.floor(Math.random()*9999)}`;
      _slaves.push(_genSlave(id));
      UISystem.showToast('⛓️ В подвале магазина появился новый раб!');
      EventBus.emit('slave:spawned');
    }
  }

  function buySlave(slaveId) {
    if (_ownedSlave) return { ok: false, msg: 'У вас уже есть раб. Сначала отпустите его.' };
    const idx = _slaves.findIndex(s => s.id === slaveId);
    if (idx === -1) return { ok: false, msg: 'Раб не найден.' };
    const s = _slaves[idx];
    if (State.totalWealth < s.price) return { ok: false, msg: `Недостаточно золота. Нужно ${s.price}💰` };
    State.spendGold(s.price);
    _ownedSlave = { ...s };
    _slaves.splice(idx, 1);
    SaveSystem.autosave();
    EventBus.emit('slave:bought');
    return { ok: true, name: s.name };
  }

  function releaseSlave() {
    _ownedSlave = null;
    SaveSystem.autosave();
    EventBus.emit('slave:released');
  }

  function levelUpSlave() {
    if (!_ownedSlave) return { ok: false, msg: 'Нет раба.' };
    if (_ownedSlave.level >= 100) return { ok: false, msg: 'Раб достиг максимального уровня (100)!' };
    const cost = getLevelUpCost(_ownedSlave);
    if (State.totalWealth < cost) return { ok: false, msg: `Нужно ${cost}💰 для тренировки.` };
    State.spendGold(cost);
    _ownedSlave.level++;
    const ns = _baseStats(_ownedSlave.level);
    Object.assign(_ownedSlave, ns);
    SaveSystem.autosave();
    return { ok: true, msg: `📈 ${_ownedSlave.name} достиг ${_ownedSlave.level} уровня!` };
  }

  // Open equip dialog for a slave slot — shows matching inv items
  function openEquipDialog(slot, onDone) {
    if (!_ownedSlave) return;
    const typeMap = { weapon:'weapon', armor:'armor', ring:'accessory', amulet:'accessory', bracelet:'accessory', extra:null };
    const needType = typeMap[slot];
    const items = State.inventory.filter(it => {
      if (!needType) return ['weapon','armor','accessory','potion'].includes(it.type);
      return it.type === needType;
    });

    // Build a simple overlay
    let ov = document.getElementById('slave-equip-ov');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'slave-equip-ov';
      ov.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:16px;';
      document.body.appendChild(ov);
    }

    const curItem = _ownedSlave.equipment?.[slot];
    let html = `<div style="background:#1a1612;border:2px solid #c9922a;border-radius:12px;padding:16px;max-width:360px;width:100%;max-height:80vh;overflow-y:auto;">
      <div style="font-size:14px;font-weight:700;color:#f0c050;margin-bottom:12px;">⛓️ Снаряжение раба · ${slot}</div>`;
    if (curItem) {
      html += `<div style="background:rgba(201,146,42,.1);border:1px solid #c9922a44;border-radius:8px;padding:8px 10px;margin-bottom:10px;display:flex;align-items:center;gap:8px;">
        <div style="font-size:22px;">${curItem.ico}</div>
        <div style="flex:1;"><div style="font-size:12px;color:#e8dcc8;">${curItem.name}</div><div style="font-size:10px;color:#7a6a55;">Сейчас надето</div></div>
        <button data-slave-unequip="${slot}" style="background:#1a0a0a;color:#c0392b;border:1px solid #c0392b44;border-radius:6px;font-family:inherit;font-size:10px;padding:5px 8px;cursor:pointer;">Снять</button>
      </div>`;
    }
    if (!items.length) {
      html += `<div style="color:#7a6a55;font-size:12px;text-align:center;padding:16px;">Нет подходящих предметов в инвентаре</div>`;
    } else {
      items.forEach((it, i) => {
        html += `<div data-slave-equip-item="${i}" style="background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:8px 10px;margin-bottom:6px;display:flex;align-items:center;gap:8px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='rgba(201,146,42,.1)'" onmouseout="this.style.background='rgba(0,0,0,.3)'">
          <div style="font-size:22px;">${it.ico||'📦'}</div>
          <div style="flex:1;"><div style="font-size:12px;color:#e8dcc8;">${it.name}</div><div style="font-size:10px;color:#7a6a55;">${it.desc||''}</div></div>
          <div style="font-size:11px;color:#f0c050;font-weight:700;">Надеть</div>
        </div>`;
      });
    }
    html += `<button id="slave-equip-close" style="width:100%;margin-top:10px;background:#1a1612;color:#7a6a55;border:1px solid #3a2e22;border-radius:8px;font-family:inherit;font-size:13px;padding:12px;cursor:pointer;min-height:44px;">Закрыть</button>
    </div>`;
    ov.innerHTML = html;

    ov.querySelector('#slave-equip-close').addEventListener('click', () => { ov.remove(); });
    const unequipBtn = ov.querySelector('[data-slave-unequip]');
    if (unequipBtn) {
      unequipBtn.addEventListener('click', () => {
        if (_ownedSlave.equipment?.[slot]) {
          State._inventory.push(_ownedSlave.equipment[slot]);
          _ownedSlave.equipment[slot] = null;
          SaveSystem.autosave();
          EventBus.emit('inventory:changed');
        }
        ov.remove();
        if (onDone) onDone();
      });
    }
    ov.querySelectorAll('[data-slave-equip-item]').forEach((el, idx) => {
      el.addEventListener('click', () => {
        const item = items[idx];
        // Unequip old → back to inventory
        if (_ownedSlave.equipment?.[slot]) {
          State._inventory.push(_ownedSlave.equipment[slot]);
        }
        // Remove from inventory
        const invIdx = State._inventory.findIndex(i => i === item);
        if (invIdx !== -1) State._inventory.splice(invIdx, 1);
        _ownedSlave.equipment[slot] = item;
        SaveSystem.autosave();
        EventBus.emit('inventory:changed');
        ov.remove();
        if (onDone) onDone();
      });
    });
    ov.addEventListener('click', (e) => { if (e.target === ov) { ov.remove(); } });
  }

  // Provide slave stat bonuses to State.totalAtk etc
  function getBonus(field) {
    if (!_ownedSlave) return 0;
    const eq = _ownedSlave.equipment || {};
    let bonus = 0;
    Object.values(eq).forEach(it => {
      if (it?.effect?.[field]) bonus += it.effect[field];
    });
    return (_ownedSlave[field] || 0) + bonus;
  }

  function toSave() { return { slaves: _slaves, ownedSlave: _ownedSlave }; }
  function fromSave(d) {
    if (!d) return;
    _slaves     = d.slaves     || [];
    _ownedSlave = d.ownedSlave || null;
  }

  // Spawn check on kills
  EventBus.on('kill:recorded', () => {
    _killCount++;
    trySpawnSlave();
  });

  // Update locked style on levelup
  EventBus.on('levelup', _checkBasementTab);

  // Also check on game load/start — update locked style
  function _checkBasementTab() {
    const heroLv = State.hero?.level || 1;
    const btn = document.getElementById('shop-tab-basement');
    if (btn) {
      btn.style.opacity = heroLv >= 25 ? '' : '0.4';
      btn.style.filter  = heroLv >= 25 ? '' : 'grayscale(1)';
    }
  }
  EventBus.on('game:started', _checkBasementTab);
  EventBus.on('game:loaded',  _checkBasementTab);
  EventBus.on('hero:updated', _checkBasementTab);

  return { getSlaves, getOwnedSlave, getSlaveRaceColor, getLevelUpCost,
           buySlave, releaseSlave, levelUpSlave, openEquipDialog,
           getBonus, toSave, fromSave };
})();
