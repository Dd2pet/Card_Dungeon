const InventoryRenderer = (() => {
  let _invCategory = 'weapon';
  const _boundEls = new WeakSet();

  const INV_CATEGORIES = {
    weapon:    { label:'Оружие',     ico:'⚔️', types:['weapon'] },
    armor:     { label:'Броня',      ico:'🛡️', types:['armor'] },
    accessory: { label:'Украшения',  ico:'💍', types:['accessory'] },
    potion:    { label:'Зелья',      ico:'🧪', types:['potion','purify'] },
    material:  { label:'Материалы',  ico:'⛏️', types:['material'] },
    herb:      { label:'Травы',      ico:'🌿', types:['herb'] },
  };

  const _RARITY_ORDER = { common:0, uncommon:1, rare:2, epic:3, legendary:4 };

  const _RARITY_COLOR = {
    common:'var(--text)', uncommon:'#6db86d',
    rare:'var(--rarity-rare)', epic:'var(--rarity-epic)', legendary:'var(--rarity-legendary)'
  };

  function _rarityColor(r) { return _RARITY_COLOR[r] || 'var(--text)'; }

  function _itemMatchesCat(item, cat) {
    const c = INV_CATEGORIES[cat];
    if (!c?.types) return true;
    return c.types.includes(item.type) || (cat === 'material' && item.type === 'monster_part');
  }

  function _sortItems(a, b) {
    const ra = _RARITY_ORDER[a.item.rarity] ?? 0;
    const rb = _RARITY_ORDER[b.item.rarity] ?? 0;
    if (ra !== rb) return ra - rb;
    return (a.item.name || '').localeCompare(b.item.name || '');
  }

  // double-tap state
  const _tap = { idx: null, time: 0 };
  const TAP_MS = 300;

  function _buildRow(item, idx) {
    const rc = _rarityColor(item.rarity);
    const rar = item.rarity || 'common';
    const isEquip = ['weapon','armor','accessory'].includes(item.type);
    const isUse   = item.type === 'potion' || item.type === 'purify';
    const isMat   = item.type === 'material' || item.type === 'monster_part' || item.type === 'herb';

    // rarity badge
    const rarBadge = rar !== 'common'
      ? `<span class="ir-badge" style="color:${rc};border-color:${rc}55;background:${rc}18">${GameConfig.rarities[rar]?.label||rar}</span>` : '';
    // stack badge
    const stackBadge = item.stackable && (item.count||1) > 1
      ? `<span class="ir-stack">×${item.count}</span>` : '';
    // cursed icon in name
    const cursedIco = item.cursed ? ' 💀' : '';

    // action buttons
    let btns = '';
    if (item.cursed && isEquip) {
      btns = `<button class="ir-btn ir-btn-curse" data-inv-use="${idx}" title="Надеть (проклято)">⚠️</button>`;
    } else if (isEquip) {
      btns = `<button class="ir-btn ir-btn-equip" data-inv-use="${idx}" title="Надеть">⚙️</button>`
           + `<button class="ir-btn ir-btn-sell" data-inv-sell="${idx}" title="Продать">💸</button>`;
    } else if (isUse) {
      btns = `<button class="ir-btn ir-btn-use" data-inv-use="${idx}" title="Использовать">🧪</button>`
           + `<button class="ir-btn ir-btn-sell" data-inv-sell="${idx}" title="Продать">💸</button>`;
    } else if (isMat) {
      btns = `<button class="ir-btn ir-btn-sell" data-inv-sell="${idx}" title="Продать">💸</button>`;
    }

    const rowCls = ['item-row',
      rar !== 'common' ? `ir-${rar}` : '',
      item.cursed ? 'ir-cursed' : ''
    ].filter(Boolean).join(' ');

    return `<div class="${rowCls}" data-inv-row="${idx}">
      <div class="ir-ico">${item.ico}</div>
      <div class="ir-meta">
        <div class="ir-name" style="color:${rc}">${item.name}${cursedIco}${stackBadge}${rarBadge}</div>
        <div class="ir-desc">${item.desc}</div>
      </div>
      <div class="ir-actions">${btns}</div>
    </div>`;
  }

  function invTab() {
    const el = UISystem.$('inv-scroll'); if (!el) return;

    // bind category tabs once
    const tabsEl = document.getElementById('inv-tabs');
    if (tabsEl && !_boundEls.has(tabsEl)) {
      _boundEls.add(tabsEl);
      tabsEl.querySelectorAll('.inv-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          _invCategory = btn.dataset.cat;
          tabsEl.querySelectorAll('.inv-tab').forEach(b => b.classList.remove('on'));
          btn.classList.add('on');
          invTab();
        });
      });
    }

    const inv = State.inventory;
    const filtered = inv
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => _itemMatchesCat(item, _invCategory))
      .sort(_sortItems);

    const countLabel = `<div class="inv-count-hdr">${INV_CATEGORIES[_invCategory]?.label||'Все'} · ${filtered.length} пред.</div>`;

    let listHtml = '';
    if (!filtered.length) {
      listHtml = `<div class="empty-st">${!inv.length ? 'Инвентарь пуст' : 'Ничего в этой категории'}</div>`;
    } else {
      listHtml = filtered.map(({ item, idx }) => _buildRow(item, idx)).join('');
    }

    el.innerHTML = countLabel + listHtml;

    // use / equip buttons
    el.querySelectorAll('[data-inv-use]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        InventorySystem.useItem(parseInt(btn.dataset.invUse));
      });
    });

    // sell buttons
    el.querySelectorAll('[data-inv-sell]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        ShopSystem.openSell(parseInt(btn.dataset.invSell));
      });
    });

    // double-tap on row = quick action
    el.querySelectorAll('[data-inv-row]').forEach(row => {
      const idx = parseInt(row.dataset.invRow);
      const item = inv[idx];
      if (!item) return;
      const isEquip = ['weapon','armor','accessory'].includes(item.type);
      const isUse   = item.type === 'potion' || item.type === 'purify';

      function _quickAction() {
        if (isEquip || isUse) InventorySystem.useItem(idx);
      }
      row.addEventListener('dblclick', e => { e.stopPropagation(); _quickAction(); });
      row.addEventListener('click', e => {
        // only fire if not clicking a button
        if (e.target.closest('.ir-btn')) return;
        const now = Date.now();
        if (_tap.idx === idx && now - _tap.time < TAP_MS) {
          _quickAction();
          _tap.idx = null; _tap.time = 0;
        } else {
          _tap.idx = idx; _tap.time = now;
        }
      });
    });

    CombatRenderer.gold();
  }

  EventBus.on('inventory:changed', () => {
    if (typeof NavSystem !== 'undefined' && NavSystem.current === 'inv') invTab();
  });

  return { invTab };
})();
const StatsRenderer = (() => {
  function statsTab() {
    const el = UISystem.$('stats-scroll'); if (!el) return;
    const zone = State.zone;
    const buyMult = EconomySystem.getBuyMultiplier(zone?.id || 'forest');
    const rows = [
      ['Убийств', State.totalKills],
      ['Очки', State.score],
      ['Золото', State.gold + ' 💰'],
      ['Зона', zone?.label || '—'],
      ['Наценка магазина', `${(buyMult * 100).toFixed(0)}%`],
      ['Выкуп предметов', `${Math.round(EconomySystem.getSellMultiplier() * 100)}%`],
      ...Object.entries(State.kills).map(([n, c]) => [n, c])
    ];
    el.innerHTML = '<div class="sec-title">Статистика</div>' +
      rows.map(([l, v]) => `<div class="stat-row"><span class="stat-lbl">${l}</span><span class="stat-val">${v}</span></div>`).join('');
    CombatRenderer.gold();
  }

  return { statsTab };
})();
