const ShopRenderer = (() => {
  let _shopMode   = 'buy';
  let _shopBuyCat = 'potion';
  let _shopSellCat = 'potion';
  const _boundEls = new WeakSet();

  const SHOP_BUY_CATS = [
    { cat:'potion',    label:'Зелья',     ico:'🧪', types:['potion','purify'] },
    { cat:'weapon',    label:'Оружие',    ico:'⚔️', types:['weapon'] },
    { cat:'armor',     label:'Броня',     ico:'🛡️', types:['armor'] },
    { cat:'accessory', label:'Укр',       ico:'💍', types:['accessory'] },
    { cat:'throwing',  label:'Рейд',      ico:'🎯', types:['throwing'] },
    { cat:'pet_food',  label:'Прикормка', ico:'🐾', types:['pet_food'] },
  ];

  // Категории для вкладки «Продать» — те же что у «Купить», минус «Рейд», плюс «Все» и «Материалы»
  const SHOP_SELL_CATS = [
    { cat:'potion',       label:'Зелья',     ico:'🧪', types:['potion','purify'] },
    { cat:'weapon',       label:'Оружие',    ico:'⚔️', types:['weapon'] },
    { cat:'armor',        label:'Броня',     ico:'🛡️', types:['armor'] },
    { cat:'accessory',    label:'Укр',       ico:'💍', types:['accessory'] },
    { cat:'material',     label:'Материалы', ico:'🪨', types:['material','monster_part'] },
  ];

  const _RARITY_COLOR = {
    common:'var(--text)', uncommon:'#6db86d',
    rare:'var(--rarity-rare)', epic:'var(--rarity-epic)', legendary:'var(--rarity-legendary)'
  };
  const _RARITY_RANK = { common:0, uncommon:1, rare:2, epic:3, legendary:4 };
  function _rc(r) { return _RARITY_COLOR[r] || 'var(--text)'; }

  function shopTab() {
    const el = UISystem.$('shop-scroll'); if (!el) return;

    // Basement tab: always visible, locked appearance if hero < level 25
    const basementBtn = document.getElementById('shop-tab-basement');
    if (basementBtn) {
      const heroLv = State.hero?.level || 1;
      if (heroLv < 25) {
        basementBtn.style.opacity = '0.4';
        basementBtn.style.filter  = 'grayscale(1)';
        basementBtn.title = 'Откроется на 25 уровне';
      } else {
        basementBtn.style.opacity = '';
        basementBtn.style.filter  = '';
        basementBtn.title = '';
      }
    }

    // eco bar
    const ecoEl = document.getElementById('shop-eco-bar');
    if (ecoEl) {
      const zone = State.zone;
      const buyMult = EconomySystem.getBuyMultiplier(zone?.id || 'forest');
      const marketMod = EconomySystem.getMarketMod();
      const marketLabel = marketMod > 1.08 ? '📈 Цены выросли' : marketMod < 0.92 ? '📉 Цены снизились' : '📊 Рынок';
      const marketCls = marketMod > 1.08 ? 'price-up' : marketMod < 0.92 ? 'price-down' : 'eco-val';
      ecoEl.innerHTML = `
        <div class="eco-item">Зона: <span class="eco-val">${zone?.label || '?'}</span></div>
        <div class="eco-sep">·</div>
        <div class="eco-item">Наценка: <span class="eco-val">${(buyMult * 100).toFixed(0)}%</span></div>
        <div class="eco-sep">·</div>
        <div class="eco-item"><span class="${marketCls}">${marketLabel}</span></div>
        <div class="eco-sep">·</div>
        <div class="eco-item">Выкуп: <span class="eco-val">${Math.round(EconomySystem.getSellMultiplier() * 100)}%</span></div>`;
    }

    // mode tabs
    const shopTabsEl = document.getElementById('shop-tabs');
    if (shopTabsEl && !_boundEls.has(shopTabsEl)) {
      _boundEls.add(shopTabsEl);
      shopTabsEl.querySelectorAll('[data-shcat]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.dataset.shcat === 'basement' && (State.hero?.level || 1) < 25) {
            UISystem.showToast('🔒 Подвал откроется на 25 уровне');
            return;
          }
          _shopMode = btn.dataset.shcat;
          shopTabsEl.querySelectorAll('[data-shcat]').forEach(b => b.classList.remove('on'));
          btn.classList.add('on');
          shopTab();
        });
      });
    }

    if      (_shopMode === 'buy')      _renderShopBuy(el);
    else if (_shopMode === 'sell')     _renderShopSell(el);
    else if (_shopMode === 'bank')     _renderBank(el);
    else if (_shopMode === 'basement') _renderBasement(el);

    CombatRenderer.gold();
  }

  function _renderShopBuy(el) {
    // category filter tabs
    let html = `<div style="padding:6px 14px 2px;"><div class="inv-tabs" id="shop-buy-cats">`;
    SHOP_BUY_CATS.forEach(c => {
      html += `<button class="inv-tab${_shopBuyCat === c.cat ? ' on' : ''}" data-buycat="${c.cat}"><span class="it-ico">${c.ico}</span>${c.label}</button>`;
    });
    html += `</div></div>`;

    const catCfg   = SHOP_BUY_CATS.find(c => c.cat === _shopBuyCat);
    const catalog  = GameConfig.shopCatalog.concat(typeof _dynShopCatalog !== 'undefined' ? _dynShopCatalog : []);
    const heroClass = State.heroClassKey || 'warrior';
    const filtered = catalog
      .filter(cfg => !catCfg?.types || catCfg.types.includes(cfg.type))
      .filter(cfg => {
        if (!cfg.classGroup || cfg.classGroup === 'any') return true;
        return cfg.classGroup === heroClass;
      })
      .sort((a, b) => {
        const rd = (_RARITY_RANK[a.rarity] ?? 0) - (_RARITY_RANK[b.rarity] ?? 0);
        if (rd !== 0) return rd;
        return (a.name || '').localeCompare(b.name || '');
      });

    html += `<div class="inv-count-hdr">${catCfg?.label||'Все'} · ${filtered.length} тов.</div>`;

    if (!filtered.length) {
      html += `<div class="empty-st">Нет товаров</div>`;
    } else {
      html += filtered.map(cfg => {
        const price    = EconomySystem.calcBuyPrice(cfg.basePrice);
        const unlocked = EconomySystem.isTierUnlocked(cfg.tier);
        const canAfford = State.totalWealth >= price;
        const canBuy   = canAfford && unlocked;
        const rar      = cfg.rarity || 'common';
        const rc       = _rc(rar);
        const rarBadge = rar !== 'common'
          ? `<span class="ir-badge" style="color:${rc};border-color:${rc}55;background:${rc}18">${GameConfig.rarities[rar]?.label||rar}</span>` : '';
        const lockNote = !unlocked
          ? `<div style="font-size:10px;color:var(--muted);margin-top:2px;">🔒 Ур.${cfg.tier?.levelReq} · ${cfg.tier?.killReq} убийств</div>` : '';
        const priceOrig = Math.abs(price - cfg.basePrice) > 1
          ? `<span style="text-decoration:line-through;color:var(--muted);font-size:9px;margin-left:3px;">${cfg.basePrice}</span>` : '';

        let btnCls = 'ir-btn ir-btn-buy';
        let btnDis = '';
        let btnContent = `💰${price} Купить`;
        if (!unlocked) {
          btnCls = 'ir-btn ir-btn-locked'; btnDis = 'disabled';
          btnContent = `🔒 Купить`;
        } else if (!canAfford) {
          btnCls = 'ir-btn ir-btn-buy ir-btn-no-gold'; btnDis = 'disabled';
          btnContent = `💰${price} Купить`;
        }

        const rowCls = ['item-row', rar !== 'common' ? `ir-${rar}` : ''].filter(Boolean).join(' ');
        return `<div class="${rowCls}">
          <div class="ir-ico">${cfg.ico}</div>
          <div class="ir-meta">
            <div class="ir-name" style="color:${rc}">${cfg.name}${rarBadge}</div>
            <div class="ir-desc">${cfg.desc}${lockNote}</div>
          </div>
          <div class="ir-actions">
            <button class="${btnCls}" data-shbuy="${cfg.id}" ${btnDis}>${btnContent}${priceOrig}</button>
          </div>
        </div>`;
      }).join('');
    }

    el.innerHTML = html;

    el.querySelectorAll('[data-buycat]').forEach(btn => {
      btn.addEventListener('click', () => { _shopBuyCat = btn.dataset.buycat; shopTab(); });
    });
    el.querySelectorAll('[data-shbuy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cfg = GameConfig.shopCatalog.concat(typeof _dynShopCatalog !== 'undefined' ? _dynShopCatalog : []).find(i => i.id === btn.dataset.shbuy);
        if (cfg) { ShopSystem.buyItem(cfg); shopTab(); }
      });
    });
  }

  function _renderShopSell(el) {
    // ── Категорийные табы (зеркало «Купить», без «Рейд») ──
    let html = `<div style="padding:6px 14px 2px;"><div class="inv-tabs" id="shop-sell-cats">`;
    SHOP_SELL_CATS.forEach(c => {
      html += `<button class="inv-tab${_shopSellCat === c.cat ? ' on' : ''}" data-sellcat="${c.cat}"><span class="it-ico">${c.ico}</span>${c.label}</button>`;
    });
    html += `</div></div>`;

    const sellCatCfg = SHOP_SELL_CATS.find(c => c.cat === _shopSellCat);

    const inv = State.inventory
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        if (!sellCatCfg?.types) return true; // 'all'
        return sellCatCfg.types.includes(item.type);
      })
      .sort((a, b) => {
        const rd = (_RARITY_RANK[a.item.rarity] ?? 0) - (_RARITY_RANK[b.item.rarity] ?? 0);
        if (rd !== 0) return rd;
        return (a.item.name || '').localeCompare(b.item.name || '');
      });
    const sellable = inv.filter(({ item }) => !item.cursed);

    html += `<div class="inv-count-hdr">${sellCatCfg?.label || 'Все'} · ${sellable.length} пред.</div>`;

    if (!inv.length) {
      html += `<div class="empty-st">Инвентарь пуст</div>`;
    } else if (!sellable.length) {
      html += `<div class="empty-st">Нечего продавать</div>`;
    } else {
      html += inv.map(({ item, idx }) => {
        const rar = item.rarity || 'common';
        const rc  = _rc(rar);
        const rarBadge = rar !== 'common'
          ? `<span class="ir-badge" style="color:${rc};border-color:${rc}55;background:${rc}18">${GameConfig.rarities[rar]?.label||rar}</span>` : '';
        const stackBadge = item.stackable && (item.count||1) > 1
          ? `<span class="ir-stack">×${item.count}</span>` : '';
        const cursedIco = item.cursed ? ' 💀' : '';
        const rowCls = ['item-row',
          rar !== 'common' ? `ir-${rar}` : '',
          item.cursed ? 'ir-cursed ir-dimmed' : ''
        ].filter(Boolean).join(' ');

        // Левая кнопка — продать весь стак (с диалогом подтверждения), только если count > 1
        const isStack = item.stackable && (item.count || 1) > 1;
        const sellAllVal = isStack ? EconomySystem.calcSellPrice(item, item.count || 1) : 0;
        const sellAllBtn = isStack
          ? `<button class="ir-btn ir-btn-sell-all" data-shsellall="${idx}" title="Продать весь стак (с подтверждением)">🗑️ ×${item.count}<br>${sellAllVal}💰</button>`
          : '';
        // Правая кнопка — продать 1 штуку сразу, без диалога
        const sellOneVal = EconomySystem.calcSellPrice(item, 1);

        return `<div class="${rowCls}">
          <div class="ir-ico">${item.ico}</div>
          <div class="ir-meta">
            <div class="ir-name" style="color:${rc}">${item.name}${cursedIco}${stackBadge}${rarBadge}</div>
            <div class="ir-desc">${item.desc}</div>
          </div>
          <div class="ir-actions">
            ${sellAllBtn}<button class="ir-btn ir-btn-sell" data-shsell="${idx}" ${item.cursed ? 'disabled' : ''}>💸 ${sellOneVal}💰</button>
          </div>
        </div>`;
      }).join('');
    }

    el.innerHTML = html;

    el.querySelectorAll('[data-sellcat]').forEach(btn => {
      btn.addEventListener('click', () => { _shopSellCat = btn.dataset.sellcat; shopTab(); });
    });
    el.querySelectorAll('[data-shsell]').forEach(btn => {
      btn.addEventListener('click', () => { ShopSystem.openSell(parseInt(btn.dataset.shsell)); });
    });
    el.querySelectorAll('[data-shsellall]').forEach(btn => {
      btn.addEventListener('click', () => { ShopSystem.sellAllStack(parseInt(btn.dataset.shsellall)); });
    });
  }


  // ── Bank renderer ──
  function _renderBank(el) {
    const gold     = State.gold;
    const bankGold = State.bankGold;

    el.innerHTML = `
      <div style="padding:14px 16px;display:flex;flex-direction:column;gap:14px;">

        <div style="background:var(--card);border:1px solid var(--bord);border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:11px;color:var(--muted);letter-spacing:.5px;">НА РУКАХ</div>
            <div style="font-size:22px;font-weight:700;color:var(--gold-lt);">${gold} 💰</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;color:var(--muted);letter-spacing:.5px;">В БАНКЕ</div>
            <div style="font-size:22px;font-weight:700;color:var(--green);">${bankGold} 💰</div>
          </div>
        </div>

        <div style="background:var(--card);border:1px solid var(--bord);border-radius:10px;padding:14px 16px;">
          <div style="font-size:12px;color:var(--muted);margin-bottom:10px;">Положить в банк</div>
          <div style="display:flex;gap:8px;margin-bottom:10px;">
            <input id="bank-deposit-inp" type="number" min="1" max="${gold}" placeholder="Сумма"
              style="flex:1;background:rgba(0,0,0,.4);border:1px solid var(--bord);color:var(--text);font-size:15px;font-family:inherit;padding:9px 12px;border-radius:7px;outline:none;-webkit-appearance:none;"/>
            <button id="bank-deposit-btn" style="background:linear-gradient(135deg,var(--gold-dk),var(--gold-lt));color:#000;font-weight:700;font-family:inherit;font-size:13px;border:none;padding:9px 16px;border-radius:7px;cursor:pointer;white-space:nowrap;min-height:44px;">Положить</button>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${[100,500,1000].map(v=>`<button class="bank-quick-dep" data-v="${v}" style="flex:1;min-width:60px;background:rgba(201,146,42,.12);border:1px solid rgba(201,146,42,.3);color:var(--gold-lt);font-family:inherit;font-size:11px;padding:6px 4px;border-radius:6px;cursor:pointer;min-height:36px;">+${v}</button>`).join('')}
            <button class="bank-quick-dep" data-v="all" style="flex:1;min-width:60px;background:rgba(201,146,42,.12);border:1px solid rgba(201,146,42,.3);color:var(--gold-lt);font-family:inherit;font-size:11px;padding:6px 4px;border-radius:6px;cursor:pointer;min-height:36px;">Всё</button>
          </div>
        </div>

        <div style="background:var(--card);border:1px solid var(--bord);border-radius:10px;padding:14px 16px;">
          <div style="font-size:12px;color:var(--muted);margin-bottom:10px;">Снять из банка</div>
          <div style="display:flex;gap:8px;margin-bottom:10px;">
            <input id="bank-withdraw-inp" type="number" min="1" max="${bankGold}" placeholder="Сумма"
              style="flex:1;background:rgba(0,0,0,.4);border:1px solid var(--bord);color:var(--text);font-size:15px;font-family:inherit;padding:9px 12px;border-radius:7px;outline:none;-webkit-appearance:none;"/>
            <button id="bank-withdraw-btn" style="background:linear-gradient(135deg,#1a5c2a,var(--green));color:#fff;font-weight:700;font-family:inherit;font-size:13px;border:none;padding:9px 16px;border-radius:7px;cursor:pointer;white-space:nowrap;min-height:44px;">Снять</button>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${[100,500,1000].map(v=>`<button class="bank-quick-wd" data-v="${v}" style="flex:1;min-width:60px;background:rgba(39,174,96,.12);border:1px solid rgba(39,174,96,.3);color:var(--green);font-family:inherit;font-size:11px;padding:6px 4px;border-radius:6px;cursor:pointer;min-height:36px;">−${v}</button>`).join('')}
            <button class="bank-quick-wd" data-v="all" style="flex:1;min-width:60px;background:rgba(39,174,96,.12);border:1px solid rgba(39,174,96,.3);color:var(--green);font-family:inherit;font-size:11px;padding:6px 4px;border-radius:6px;cursor:pointer;min-height:36px;">Всё</button>
          </div>
        </div>

        <div style="font-size:10px;color:var(--muted);text-align:center;line-height:1.5;">
          🔒 Деньги в банке в безопасности.<br>Снять можно в любой момент.
        </div>
      </div>`;

    // Deposit
    el.querySelector('#bank-deposit-btn').addEventListener('click', () => {
      const inp = el.querySelector('#bank-deposit-inp');
      const requested = Math.floor(+inp.value || 0);
      if (requested <= 0) { UISystem.showToast('⚠️ Укажите сумму'); return; }
      const amt = State.depositToBank(requested);
      if (amt <= 0) { UISystem.showToast('⚠️ Недостаточно золота'); return; }
      SaveSystem.autosave();
      UISystem.showToast(`🏦 Положено в банк: ${amt}💰`);
      _renderBank(el);
    });

    // Withdraw
    el.querySelector('#bank-withdraw-btn').addEventListener('click', () => {
      const inp = el.querySelector('#bank-withdraw-inp');
      const requested = Math.floor(+inp.value || 0);
      if (requested <= 0) { UISystem.showToast('⚠️ Укажите сумму'); return; }
      const amt = State.withdrawFromBank(requested);
      if (amt <= 0) { UISystem.showToast('⚠️ В банке нет средств'); return; }
      SaveSystem.autosave();
      UISystem.showToast(`💰 Снято из банка: ${amt}💰`);
      _renderBank(el);
    });

    // Quick deposit buttons
    el.querySelectorAll('.bank-quick-dep').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.dataset.v;
        const requested = v === 'all' ? State.gold : +v;
        const amt = State.depositToBank(requested);
        if (amt <= 0) return;
        SaveSystem.autosave();
        UISystem.showToast(`🏦 Положено в банк: ${amt}💰`);
        _renderBank(el);
      });
    });

    // Quick withdraw buttons
    el.querySelectorAll('.bank-quick-wd').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.dataset.v;
        const requested = v === 'all' ? State.bankGold : +v;
        const amt = State.withdrawFromBank(requested);
        if (amt <= 0) return;
        SaveSystem.autosave();
        UISystem.showToast(`💰 Снято из банка: ${amt}💰`);
        _renderBank(el);
      });
    });
  }

  // ── Basement (Slave) renderer ──
  function _renderBasement(el) {
    const heroLv = State.hero?.level || 1;
    if (heroLv < 25) {
      el.innerHTML = `<div class="empty-st" style="margin-top:40px;">
        <div style="font-size:40px;margin-bottom:12px;">⛓️</div>
        <div style="font-size:14px;color:var(--gold-lt);margin-bottom:6px;">Подвал заперт</div>
        <div style="font-size:12px;color:var(--muted);">Откроется на 25 уровне персонажа</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px;">(ваш уровень: ${heroLv})</div>
      </div>`;
      return;
    }
    const slaves = SlaveSystem.getSlaves();
    const owned  = SlaveSystem.getOwnedSlave();
    let html = `<div style="padding:8px 14px 4px;">
      <div style="background:rgba(0,0,0,.5);border:1px solid #5a3a2a;border-radius:8px;padding:8px 12px;margin-bottom:10px;">
        <div style="font-size:10px;color:#c07040;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">⚠ Подвал торговца</div>
        <div style="font-size:11px;color:var(--muted);line-height:1.5;">Здесь продаются рабы — существа смешанной расы (полулюди). При взятии в группу их характеристики добавляются к вашим. Они не занимают слот группы.</div>
      </div>`;
    if (owned) {
      const sc = SlaveSystem.getSlaveRaceColor(owned.race);
      html += `<div style="background:rgba(80,40,10,.2);border:2px solid ${sc}55;border-radius:10px;padding:12px 14px;margin-bottom:12px;">
        <div style="font-size:10px;color:${sc};letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">⛓ Ваш раб</div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="font-size:40px;">${owned.av}</div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:700;color:var(--text);">${owned.name}</div>
            <div style="font-size:10px;color:var(--muted);">Ур. ${owned.level} · ${owned.genderLabel} · ${owned.raceLabel}</div>
            <div style="font-size:9px;color:${sc};margin-top:2px;">${owned.race}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:9px;color:var(--muted);">В группе</div>
            <div style="font-size:11px;font-weight:700;color:#4ade80;">✓ Активен</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:8px;">
          ${['atk','def','spd','maxHp','maxMp','crit'].map(s => `<div style="background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.06);border-radius:5px;padding:4px;text-align:center;">
            <div style="font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;">${s==='maxHp'?'HP':s==='maxMp'?'MP':s==='crit'?'КР':s.toUpperCase()}</div>
            <div style="font-size:11px;font-weight:700;color:var(--text);">${s==='crit'?Math.round(owned[s]*100)+'%':owned[s]}</div>
          </div>`).join('')}
        </div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:6px;">Снаряжение (нажмите для надевания из инвентаря):</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:10px;">
          ${['weapon','armor','ring','amulet','bracelet','extra'].map(slot => {
            const it = owned.equipment?.[slot];
            return `<div data-slave-equip-slot="${slot}" style="background:rgba(0,0,0,.35);border:1px solid ${it?'#c9922a55':'rgba(255,255,255,.06)'};border-radius:6px;padding:6px 4px;text-align:center;cursor:pointer;min-height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;">
              <div style="font-size:20px;">${it ? it.ico : (slot==='weapon'?'⚔️':slot==='armor'?'🛡️':slot==='ring'?'💍':slot==='amulet'?'📿':slot==='bracelet'?'🪬':'➕')}</div>
              <div style="font-size:8px;color:${it?'var(--gold-lt)':'var(--muted)'};">${it ? it.name.slice(0,8) : 'пусто'}</div>
            </div>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:6px;">
          <button id="slave-levelup-btn" style="flex:1;background:linear-gradient(135deg,#003070,#2980b9);color:#fff;border:none;border-radius:7px;font-family:inherit;font-size:11px;font-weight:700;padding:9px;cursor:pointer;min-height:38px;">
            📈 Тренировать (${SlaveSystem.getLevelUpCost(owned)}💰)
          </button>
          <button id="slave-release-btn" style="flex:0 0 auto;background:#1a0a0a;color:#c0392b;border:1px solid #c0392b44;border-radius:7px;font-family:inherit;font-size:11px;padding:9px 12px;cursor:pointer;min-height:38px;">
            🔓 Отпустить
          </button>
        </div>
      </div>`;
    }
    html += `<div style="font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">В продаже · ${slaves.length} особей</div>`;
    if (!slaves.length) {
      html += `<div class="empty-st">Подвал пуст. Новые поступления появляются крайне редко.</div>`;
    } else {
      slaves.forEach(s => {
        const rc = SlaveSystem.getSlaveRaceColor(s.race);
        const canBuy = !owned && State.totalWealth >= s.price;
        const btnDis = (!canBuy) ? 'disabled' : '';
        const btnReason = owned ? 'Уже есть раб' : State.totalWealth < s.price ? `Нужно ${s.price}💰` : '';
        html += `<div style="background:var(--card);border:1px solid ${rc}44;border-radius:10px;padding:12px 14px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="font-size:38px;">${s.av}</div>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:700;color:var(--text);">${s.name}</div>
              <div style="font-size:10px;color:var(--muted);">${s.genderLabel} · ${s.raceLabel}</div>
              <div style="font-size:9px;color:${rc};margin-top:1px;">${s.race}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:14px;font-weight:700;color:var(--gold-lt);">${s.price}💰</div>
              <div style="font-size:9px;color:var(--muted);">Ур. 1</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:8px;">
            ${['atk','def','spd','maxHp','maxMp','crit'].map(st => `<div style="background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.06);border-radius:5px;padding:3px;text-align:center;">
              <div style="font-size:8px;color:var(--muted);text-transform:uppercase;">${st==='maxHp'?'HP':st==='maxMp'?'MP':st==='crit'?'КР':st.toUpperCase()}</div>
              <div style="font-size:10px;font-weight:700;color:var(--text);">${st==='crit'?Math.round(s[st]*100)+'%':s[st]}</div>
            </div>`).join('')}
          </div>
          <button data-slave-buy="${s.id}" ${btnDis} style="width:100%;background:${canBuy?'linear-gradient(135deg,#5a2000,#c0392b)':'rgba(100,50,30,.3)'};color:${canBuy?'#fff':'var(--muted)'};border:1px solid ${canBuy?'#c0392b55':'rgba(100,100,100,.2)'};border-radius:7px;font-family:inherit;font-size:12px;font-weight:700;padding:10px;cursor:${canBuy?'pointer':'not-allowed'};min-height:40px;">
            ${canBuy ? `⛓️ Купить за ${s.price}💰` : (btnReason || `⛓️ Купить`)}
          </button>
        </div>`;
      });
    }
    html += `</div>`;
    el.innerHTML = html;

    // events
    el.querySelectorAll('[data-slave-buy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const result = SlaveSystem.buySlave(btn.dataset.slaveBuy);
        if (result.ok) {
          UISystem.showToast(`⛓️ ${result.name} теперь в вашей группе!`);
          _renderBasement(el);
          CombatRenderer.gold();
        } else {
          UISystem.showToast(result.msg);
        }
      });
    });
    const lvBtn = el.querySelector('#slave-levelup-btn');
    if (lvBtn) {
      lvBtn.addEventListener('click', () => {
        const r = SlaveSystem.levelUpSlave();
        UISystem.showToast(r.msg);
        _renderBasement(el);
        CombatRenderer.gold();
      });
    }
    const relBtn = el.querySelector('#slave-release-btn');
    if (relBtn) {
      relBtn.addEventListener('click', () => {
        SlaveSystem.releaseSlave();
        UISystem.showToast('🔓 Раб отпущен на свободу.');
        _renderBasement(el);
      });
    }
    // equip slots
    el.querySelectorAll('[data-slave-equip-slot]').forEach(slotEl => {
      slotEl.addEventListener('click', () => {
        const slot = slotEl.dataset.slaveEquipSlot;
        SlaveSystem.openEquipDialog(slot, () => _renderBasement(el));
      });
    });
  }

  // Подписки на события магазина
  EventBus.on('shop:purchase',         () => { if (typeof NavSystem !== 'undefined' && NavSystem.current === 'shop') shopTab(); });
  EventBus.on('gold:changed',          () => { CombatRenderer.gold(); if (typeof NavSystem !== 'undefined' && NavSystem.current === 'shop') shopTab(); });
  EventBus.on('zone:changed',          (z) => { UISystem.setText('g-zone', z.label); if (typeof NavSystem !== 'undefined' && NavSystem.current === 'shop') shopTab(); });
  EventBus.on('economy:marketChanged', () => { if (typeof NavSystem !== 'undefined' && NavSystem.current === 'shop') shopTab(); });
  EventBus.on('shop:sell',             () => { if (typeof NavSystem !== 'undefined' && NavSystem.current === 'shop') shopTab(); });
  EventBus.on('inventory:changed',     () => { if (typeof NavSystem !== 'undefined' && NavSystem.current === 'shop') shopTab(); });

  return { shopTab };
})();
