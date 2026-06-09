const EconomySystem = (() => {
  // ── Dynamic price multipliers per zone (x2.5–x5 range) ──
  const _zoneMultipliers = {
    forest:    { buy: 1.0,  sell: 0.12 },
    swamp:     { buy: 1.2,  sell: 0.12 },
    catacombs: { buy: 1.5,  sell: 0.12 },
    cemetery:  { buy: 1.7,  sell: 0.12 },
    desert:    { buy: 2.0,  sell: 0.12 },
    lostcity:  { buy: 2.4,  sell: 0.12 },
    ravine:    { buy: 2.8,  sell: 0.12 },
    volcano:   { buy: 3.2,  sell: 0.12 },
    tundra:    { buy: 3.8,  sell: 0.12 },
    abyss:     { buy: 4.5,  sell: 0.12 },
  };

  // Random daily market fluctuation (±20%)
  let _marketMod = 1.0;

  function _rerollMarket() {
    _marketMod = 0.8 + Math.random() * 0.4; // 0.80 – 1.20
    EventBus.emit('economy:marketChanged', _marketMod);
  }
  // Initial roll: just set value without emitting (no listeners exist yet)
  _marketMod = 0.8 + Math.random() * 0.4;
  // Reroll market every 10 kills
  EventBus.on('kill:recorded', ({ total }) => {
    if (total % 10 === 0) _rerollMarket();
  });

  // Zone changes affect multiplier
  EventBus.on('zone:changed', (zone) => {
    EventBus.emit('economy:priceUpdated', getBuyMultiplier(zone.id));
  });

  function getBuyMultiplier(zoneId) {
    return (_zoneMultipliers[zoneId] || _zoneMultipliers.forest).buy * _marketMod;
  }

  function getSellMultiplier(zoneId) {
    const zone = zoneId || State.zone?.id || 'forest';
    return (_zoneMultipliers[zone] || _zoneMultipliers.forest).sell;
  }

  // Calculate buy price for shop items
  function calcBuyPrice(basePrice) {
    const zone = State.zone;
    const mult = getBuyMultiplier(zone?.id || 'forest');
    const discount = State.totalShopDiscount || 0;
    return Math.max(1, Math.floor(basePrice * mult * (1 - discount)));
  }

  // Calculate sell price for an inventory item
  // Math.max(1,...) применяется к цене ОДНОГО предмета, затем умножается на количество.
  // Без этого стак из N дешёвых предметов мог давать ту же цену что и 1 предмет
  // из-за floor(base * mult * N) == floor(base * mult * 1) при малых base*mult.
  function calcSellPrice(item, qty) {
    const base  = item.price || item.baseValue || 10;
    const count = qty !== undefined ? qty : (item.stackable ? (item.count || 1) : 1);
    const pricePerUnit = Math.max(1, Math.floor(base * getSellMultiplier(State.zone?.id)));
    return pricePerUnit * count;
  }

  // Tier unlock check: level AND rank (kill-based)
  function isTierUnlocked(tier) {
    if (!tier) return true;
    const hero = State.hero;
    const lvReq = tier.levelReq || 1;
    const killReq = tier.killReq || 0;
    return (hero?.level || 1) >= lvReq && (State.totalKills || 0) >= killReq;
  }

  function getMarketMod() { return _marketMod; }

  return { calcBuyPrice, calcSellPrice, isTierUnlocked, getBuyMultiplier, getMarketMod, getSellMultiplier };
})();
const ShopSystem = (() => {
  let _sellPendingIdx = null;

  function getCatalog() { return GameConfig.shopCatalog.concat(typeof _dynShopCatalog !== 'undefined' ? _dynShopCatalog : []); }

  function buyItem(shopItemCfg) {
    const price = EconomySystem.calcBuyPrice(shopItemCfg.basePrice);
    if (State.totalWealth < price) {
      UISystem.showToast('💰 Недостаточно золота!');
      return;
    }
    if (!EconomySystem.isTierUnlocked(shopItemCfg.tier)) {
      UISystem.showToast(`🔒 Требуется Ур.${shopItemCfg.tier.levelReq}`);
      return;
    }
    State.spendGold(price);

    let item;
    if (shopItemCfg.type === 'purify') {
      item = {
        id: `purify_${Date.now()}`,
        name: shopItemCfg.name, ico: shopItemCfg.ico, type: 'purify',
        rarity: shopItemCfg.rarity || 'rare', cursed: false, stackable: false,
        effect: { purify: true }, desc: shopItemCfg.desc, price: shopItemCfg.basePrice, slot: null,
      };
    } else if (shopItemCfg.type === 'throwing') {
      item = {
        id: `throwing_${shopItemCfg.id}_${Date.now()}`,
        templateId: shopItemCfg.id,
        name: shopItemCfg.name, ico: shopItemCfg.ico, type: 'throwing',
        rarity: shopItemCfg.rarity || 'common', cursed: false, stackable: true, maxStack: 99, count: 1,
        raidDmg: shopItemCfg.raidDmg,
        desc: shopItemCfg.desc, price: shopItemCfg.basePrice, slot: null,
      };
    } else if (shopItemCfg.type === 'potion') {
      item = {
        id: `potion_${shopItemCfg.id}`,
        templateId: `potion_${shopItemCfg.id}`,
        name: shopItemCfg.name, ico: shopItemCfg.ico, type: 'potion',
        rarity: shopItemCfg.rarity || 'common', cursed: false, stackable: true, maxStack: 20, count: 1,
        effect: { ...shopItemCfg.effect }, desc: shopItemCfg.desc, slot: null,
        price: shopItemCfg.basePrice,
      };
    } else if (shopItemCfg.templateId) {
      // Buy weapon/armor/accessory: create via ItemFactory with 'common' rarity for shop items
      item = ItemFactory.fromTemplate(shopItemCfg.templateId, 'common');
      if (!item) { UISystem.showToast('❌ Ошибка создания предмета'); return; }
      item.price = shopItemCfg.basePrice; // override price with shop base price
    }

    if (!item) return;
    ItemFactory.stackOrAdd(item);

    UISystem.showToast(`🛒 Куплено: ${item.name} за ${price}💰`);
    EventBus.emit('shop:purchase', { item: shopItemCfg, price });
    SaveSystem.autosave();
  }

  // ── Sell system ──

  // Продать ровно 1 единицу предмета — мгновенно, без диалога.
  // Вызывается правой (основной) кнопкой 💸.
  function openSell(itemIdx) {
    const item = State.inventory[itemIdx];
    if (!item) return;
    if (item.cursed) { UISystem.showToast('💀 Проклятый — продать нельзя!'); return; }

    const sellVal = EconomySystem.calcSellPrice(item, 1);
    if (item.stackable && (item.count || 1) > 1) {
      item.count--;
      // обновляем desc для материалов/частей монстров
      if (item.type === 'material' || item.type === 'monster_part') {
        item.desc = `×${item.count} · Стоимость: ${(item.price || item.baseValue || 0) * item.count}💰`;
      }
      EventBus.emit('inventory:changed', State.inventory);
    } else {
      State.removeFromInventory(itemIdx);
    }
    State.addGold(sellVal);
    UISystem.showToast(`💸 Продано: ${item.name} ×1 за ${sellVal}💰`);
    UISystem.log(`💸 Продан: ${item.name} ×1 (+${sellVal}💰)`, 'li');
    EventBus.emit('shop:sell', { item, price: sellVal });
    SaveSystem.autosave();
  }

  // Открыть диалог подтверждения продажи ВСЕГО стака.
  // Вызывается левой (маленькой) кнопкой 🗑️.
  function sellAllStack(itemIdx) {
    const item = State.inventory[itemIdx];
    if (!item) return;
    if (item.cursed) { UISystem.showToast('💀 Проклятый — продать нельзя!'); return; }

    const stackCount = item.stackable ? (item.count || 1) : 1;
    const sellVal = EconomySystem.calcSellPrice(item, stackCount);

    _sellPendingIdx = itemIdx;
    const rarCls = item.rarity ? `rarity-${item.rarity}` : '';
    UISystem.setHTML('sell-preview',
      `<div style="font-size:28px">${item.ico}</div>
       <div style="flex:1">
         <div class="icard-name ${rarCls}">${item.name} ×${stackCount}</div>
         <div class="icard-desc">${item.desc}</div>
       </div>`
    );
    UISystem.setHTML('sell-price-line',
      `Продать весь стак? <span style="color:var(--gold-lt);font-weight:700">${sellVal} 💰</span>` +
      `<span style="color:var(--muted);font-size:11px"> (×${stackCount} шт.)</span>`
    );
    UISystem.removeClass('sell-ov', 'hide');
    UISystem.addClass('sell-ov', 'show');
  }

  function confirmSell() {
    const idx = _sellPendingIdx;
    if (idx === null || idx === undefined) return;
    const item = State.inventory[idx];
    if (!item) { _cancelSell(); return; }

    const stackCount = item.stackable ? (item.count || 1) : 1;
    const sellVal = EconomySystem.calcSellPrice(item, stackCount);
    State.removeFromInventory(idx);
    State.addGold(sellVal);
    _sellPendingIdx = null;

    const label = stackCount > 1 ? `${item.name} ×${stackCount}` : item.name;
    UISystem.showToast(`💸 Продано: ${label} за ${sellVal}💰`);
    UISystem.log(`💸 Продан: ${label} (+${sellVal}💰)`, 'li');
    EventBus.emit('shop:sell', { item, price: sellVal });
    _cancelSell();
    SaveSystem.autosave();
  }

  function _cancelSell() {
    _sellPendingIdx = null;
    UISystem.addClass('sell-ov', 'hide');
    UISystem.removeClass('sell-ov', 'show');
  }

  // Bind sell overlay buttons
  const confirmBtn = document.getElementById('sell-confirm-btn');
  const cancelBtn  = document.getElementById('sell-cancel-btn');
  if (confirmBtn) confirmBtn.addEventListener('click', confirmSell);
  if (cancelBtn)  cancelBtn.addEventListener('click', _cancelSell);

  return { buyItem, openSell, confirmSell, sellAllStack, getCatalog };
})();
