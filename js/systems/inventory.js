const InventorySystem = (() => {
  // ── Use item from inventory tab ──
  function useItem(idx) {
    const item = State.inventory[idx]; if (!item) return;

    // Cursed items: can't be used normally (non-equipment), warn player
    if (item.cursed && (item.type === 'material' || item.type === 'monster_part')) {
      UISystem.showToast(`💀 Проклятый предмет! Используй зелье очищения.`);
      return;
    }

    // Throwing weapons: raid-only, cannot be used in normal combat
    if (item.type === 'throwing') {
      UISystem.showToast(`🎯 ${item.name} — только для рейдов!`);
      return;
    }

    if (item.type === 'potion') {
      _applyPotion(item);
      if (item.stackable && (item.count || 1) > 1) {
        item.count--;
        if (item.type === 'material') item.desc = `×${item.count} · Стоимость: ${item.price * item.count}💰`;
        EventBus.emit('inventory:changed', State.inventory);
      } else {
        State.removeFromInventory(idx);
      }
      // Зелья в бою не вызывают ответную атаку монстра
      EventBus.emit('hero:updated', State.hero);
      EventBus.emit('combat:stateReset');
      SaveSystem.autosave();
      return;
    } else if (item.type === 'purify') {
      _openPurifyUI();
      State.removeFromInventory(idx);
      UISystem.showToast('✨ Выбери проклятый предмет для очищения!');
      return; // don't trigger monster turn — it's a shop item used outside combat
    } else if (item.type === 'material' || item.type === 'monster_part') {
      UISystem.showToast(`🪨 ${item.name} — материал, нельзя использовать.`);
      return;
    } else {
      // Weapon / armor / accessory
      _equipItem(item, idx);
    }

    EventBus.emit('hero:updated', State.hero);
    EventBus.emit('combat:stateReset'); // triggers buttons() via CombatRenderer
    SaveSystem.autosave();
    if (State.active) {
      CombatSessionManager.safeTimeout(() => CombatController._monsterTurn(), GameConfig.combat.monsterTurnDelay);
    }
  }

  function _applyPotion(item) {
    if (item.effect.hp) {
      const healAmt = Math.floor(item.effect.hp * State.totalHealBonus);
      State.healHero(healAmt);
      UISystem.showToast(`🧪 +${healAmt} HP`);
      UISystem.flashGreen('card-p');
      UISystem.floatText(`+${healAmt}`, 'f-heal', UISystem.$('card-p'));
    }
    if (item.effect.mp) {
      State.hero.mp = Math.min(State.totalMaxMp, State.hero.mp + item.effect.mp);
      UISystem.showToast(`💧 +${item.effect.mp} MP`);
      UISystem.flashBlue('card-p');
    }
    if (item.effect.cure) {
      State.removeStatus('player', item.effect.cure);
      UISystem.showToast(`✨ Снят статус: ${item.effect.cure}`);
    }
    if (item.effect.xpBoost) {
      const mult = item.effect.xpBoost;
      const secs = item.effect.xpBoostSecs || 300;
      State.applyXpBoost(mult, secs);
      const mins = Math.ceil(State.xpBoostSecsLeft / 60);
      UISystem.showToast(`📖 +${Math.round(mult * 100)}% XP · ${mins} мин!`);
      UISystem.floatText(`+${Math.round(mult * 100)}% XP`, 'f-gold', UISystem.$('card-p'));
    }
  }

  function _equipItem(item, idx) {
    const slot = item.slot; if (!slot) return;
    if (item.cursed) {
      UISystem.showToast(`⚠️ Надет ПРОКЛЯТЫЙ ${item.name}! Ищи зелье очищения.`);
      UISystem.log(`💀 Проклятый предмет надет: ${item.name}`, 'lm');
      EventBus.emit('item:cursedEquipped', item);
    } else {
      UISystem.showToast(`⚙️ Надет: ${item.name}`);
    }
    // Remove new item first (fixes index shift when swapping: old item pushed to end)
    const oldEquip = State.equipment[slot];
    State.removeFromInventory(idx);          // remove equipped item at known idx
    if (oldEquip) State.addToInventory(oldEquip); // push old equip to end safely
    State.setEquipment(slot, item);
  }

  // ── Use item in combat (only potions) ──
  function useItemInCombat() {
    const potions = State.inventory
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.type === 'potion' || item.type === 'purify');
    if (!potions.length) { UISystem.showToast('🎒 Нет зелий!'); return; }

    // Build picker list
    const list = document.getElementById('potion-picker-list');
    if (!list) return;
    list.innerHTML = potions.map(({ item, idx }) => {
      const count = item.count > 1 ? ` ×${item.count}` : '';
      return `<div data-picker-idx="${idx}" style="display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.35);border:1px solid var(--bord);border-radius:8px;padding:9px 12px;cursor:pointer;transition:background .12s;" onmouseover="this.style.background='rgba(39,174,96,.15)'" onmouseout="this.style.background='rgba(0,0,0,.35)'">
        <div style="font-size:26px;flex-shrink:0;">${item.ico || '🧪'}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;color:var(--text);">${item.name}${count}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:1px;">${item.desc || ''}</div>
        </div>
        <div style="font-size:18px;color:#4ade80;">▶</div>
      </div>`;
    }).join('');

    // Close button
    const closeBtn = document.getElementById('potion-picker-close');
    const ov = document.getElementById('potion-picker-ov');
    if (closeBtn) {
      closeBtn.onclick = () => { ov.classList.add('hide'); };
    }
    ov.onclick = (e) => { if (e.target === ov) ov.classList.add('hide'); };

    // Item click
    list.querySelectorAll('[data-picker-idx]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.pickerIdx);
        ov.classList.add('hide');
        const item = State.inventory[idx];
        if (!item) return;
        EventBus.emit('player:action', { type: 'item' });
        UISystem.log(`🎒 Использован: ${item.name}`, 'li');
        useItem(idx);
      });
    });

    ov.classList.remove('hide');
  }

  function unequip(slot) {
    const item = State.equipment[slot]; if (!item) return;
    State.addToInventory(item);
    State.setEquipment(slot, null);
    // Clamp HP/MP in case equipment had bonuses
    State.setHeroHp(State.hero.hp); // clamp after unequip
    State.hero.mp = Math.min(State.hero.mp, State.totalMaxMp);
    UISystem.showToast(`🗃 Снято: ${item.name}`);
    EventBus.emit('hero:updated', State.hero);
    SaveSystem.autosave();
  }

  // ── Purify system ──
  function _openPurifyUI() {
    // Collect all cursed items (inventory + equipped slots)
    const targets = [];
    State.inventory.forEach((item, idx) => {
      if (item.cursed) targets.push({ source:'inventory', idx, item });
    });
    Object.entries(State.equipment).forEach(([slot, item]) => {
      if (item?.cursed) targets.push({ source:'equipment', slot, item });
    });

    const list = UISystem.$('purify-list');
    if (!list) return;

    if (!targets.length) {
      list.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:12px;text-align:center;">Нет проклятых предметов</div>';
    } else {
      list.innerHTML = targets.map((t, i) =>
        `<div class="purify-row" data-pidx="${i}">
          <div class="purify-ico">${t.item.ico}</div>
          <div class="purify-info">
            <div class="purify-name">${t.item.name}</div>
            <div class="purify-hint">${t.item.cursedEffect || 'Проклятый предмет'}</div>
          </div>
          <span style="font-size:20px;">✨</span>
        </div>`
      ).join('');
      list.querySelectorAll('.purify-row').forEach(row => {
        row.addEventListener('click', () => {
          const t = targets[parseInt(row.dataset.pidx)];
          _purifyItem(t);
          UISystem.addClass('purify-ov', 'hide');
          UISystem.removeClass('purify-ov', 'show');
        });
      });
    }

    UISystem.removeClass('purify-ov', 'hide');
    UISystem.addClass('purify-ov', 'show');
  }

  function _purifyItem(target) {
    target.item.cursed = false;
    delete target.item.curseLabel;
    delete target.item.cursedEffect;

    // Restore positive effects (invert all negative curse effects)
    if (target.item.effect) {
      const e = target.item.effect;
      ['atk','def','crit','hp','mp'].forEach(k => {
        if (e[k] !== undefined && e[k] < 0) e[k] = Math.abs(e[k]);
      });
    }

    // Update desc
    const parts = [];
    const e = target.item.effect;
    if (e?.atk)  parts.push(`+${e.atk} ATK`);
    if (e?.def)  parts.push(`+${e.def} DEF`);
    if (e?.crit) parts.push(`+${Math.round(e.crit*100)}% КРИТ`);
    if (e?.hp)   parts.push(`+${e.hp} HP`);
    if (e?.mp)   parts.push(`+${e.mp} MP`);
    if (parts.length) target.item.desc = `[Очищен] ${parts.join(' · ')}`;

    UISystem.showToast(`✨ ${target.item.name} очищен от проклятия!`);
    UISystem.log(`✨ Проклятие снято с: ${target.item.name}`, 'ls');
    EventBus.emit('item:purified', target.item);
    EventBus.emit('hero:updated', State.hero);
    EventBus.emit('equipment:changed', State.equipment);
    SaveSystem.autosave();
  }

  // ── Add item with stacking support ──
  function addLootToInventory(item) {
    if (item.stackable) {
      ItemFactory.stackOrAdd(item);
    } else {
      State.addToInventory(item);
    }
  }
  return { useItem, unequip, useItemInCombat, addLootToInventory, _openPurifyUI };
})();
const ProgressionSystem = (() => {
  // Порядок редкостей для сортировки
  const _RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

  // Stackable-типы, которым редкость монстра не нужна (нет стат-масштаба)
  const _STACKABLE_TYPES = new Set(['monster_part', 'material', 'gathering_ore', 'gathering_herb']);

  // ID частей монстров и материалов — исключаем из общей таблицы
  const _MONSTER_PART_IDS = new Set([
    'goblin_ear','wolf_fang','bone_shard','slime_jelly',
    'spider_silk','troll_hide','iron_ore','magic_dust','dragon_scale',
    'toad_tongue','toad_skin','bear_hide','bear_claw',
    'spider_poison','boar_tusk','boar_hide','bat_wing','bat_fang',
    // unique per-monster parts
    'rabbit_foot','spirit_essence','leech_saliva','hydra_venom',
    'plague_fur','witch_grimoire','croc_tooth','ectoplasm','orc_blood',
    'necrotic_dust','zombie_flesh','vampire_fang','ancient_bone',
    'mummy_wrappings','ankh_shard','scorpion_stinger','sand_essence',
    'fossil_scale','harpy_feather','pharaoh_seal','rune_fragment',
    'shadow_essence','cursed_token','gear_fragment','lich_crystal',
    'nightmare_shard','shadow_scale','giant_stone','phoenix_ash',
    'lava_core','volcanic_shell','fire_feather','magma_heart',
    'frost_fang','yeti_fur','frozen_tear','permafrost_shard',
    'ice_heart','arctic_scale','demon_horn','abyssal_scale',
    'chaos_fragment','soul_crystal','dark_essence','celestial_scale',
    'primordial_shard','destruction_core','void_fragment',
    'storm_essence','divine_ice',
  ]);

  // Определить forcedRarity для templateId с учётом редкости монстра
  function _itemRarity(templateId, monsterRarity) {
    const tmpl = GameConfig.itemTemplates[templateId];
    if (!tmpl) return monsterRarity;
    // Stackable/material/monster_part — редкость не влияет на стату, оставляем 'common'
    if (tmpl.stackable || _STACKABLE_TYPES.has(tmpl.type)) return 'common';
    // Снаряжение берёт редкость монстра напрямую
    return monsterRarity;
  }

  function rollLoot(monster, dropMult = 1.0) {
    const drops = [];

    // Редкость монстра определяет редкость выпавших предметов снаряжения.
    // Если у монстра нет rarity (старый спавн без MonsterFactory), считаем common.
    const monsterRarity = (monster && monster.rarity) ? monster.rarity : 'common';

    // ── Гуманоид: только такие монстры могут носить украшения ──
    const mName = ((monster && monster.name) || '').toLowerCase();
    const _HUMANOID_KEYWORDS = ['гоблин','орк','тролль','скелет','зомби','призрак','вампир',
      'некромант','лич','паладин','рыцар','убийца','маг','колдун','фараон','джинн','оборотень'];
    const isHumanoid = _HUMANOID_KEYWORDS.some(k => mName.includes(k));

    // ── 1. Monster-specific parts (from monster.drops) ──
    const monsterDrops = (monster && monster.drops) ? monster.drops : [];
    monsterDrops.forEach(entry => {
      if (Math.random() >= entry.chance * dropMult) return;
      if (entry.templateId) {
        const item = ItemFactory.fromTemplate(entry.templateId, _itemRarity(entry.templateId, monsterRarity));
        if (item) drops.push(item);
      }
    });

    // ── 2. Shared table — only potions, gear, cursed (NO monster parts) ──
    const sharedTable = GameConfig.lootTable.filter(e =>
      !e.templateId || !_MONSTER_PART_IDS.has(e.templateId)
    );
    sharedTable.forEach(entry => {
      if (Math.random() >= entry.chance * dropMult) return;
      if (entry.templateId) {
        // Украшения — только с гуманоидов
        const tpl = GameConfig.materialTemplates?.[entry.templateId];
        if (tpl && tpl.type === 'accessory' && !isHumanoid) return;
        // Проверяем через accessory slot ключей
        const accessoryIds = new Set(['iron_ring','war_ring','blood_ring','jade_amulet',
          'soul_amulet','void_amulet','copper_bracelet','silver_bracelet','guardian_bracelet']);
        if (accessoryIds.has(entry.templateId) && !isHumanoid) return;
        // Проклятые украшения — тоже только с гуманоидов
        // Предметы экипировки из общей таблицы наследуют редкость монстра
        const item = ItemFactory.fromTemplate(entry.templateId, _itemRarity(entry.templateId, monsterRarity));
        if (item) drops.push(item);
      } else if (entry.cursedId) {
        // Проклятые украшения — только с гуманоидов
        if (!isHumanoid) return;
        const item = ItemFactory.fromCursed(entry.cursedId);
        if (item) drops.push(item);
      } else {
        // inline potion (no templateId)
        const tplId = 'potion_' + entry.name.replace(/\s/g,'_').toLowerCase();
        const p = { ...entry, id: tplId, templateId: tplId, stackable: true, maxStack: 20, count: 1, price: entry.basePrice || 20 };
        drops.push(p);
      }
    });

    return drops;
  }

  return { rollLoot, RARITY_ORDER: _RARITY_ORDER };
})();
