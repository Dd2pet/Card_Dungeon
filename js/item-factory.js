const ItemFactory = (() => {
  // Выбор редкости через weighted random
  function rollRarity() {
    const entries = Object.entries(GameConfig.rarities);
    const total = entries.reduce((s, [, r]) => s + r.weight, 0);
    let rnd = Math.random() * total;
    for (const [key, r] of entries) {
      rnd -= r.weight;
      if (rnd <= 0) return key;
    }
    return 'common';
  }

  // Создать предмет по templateId + rarity
  function fromTemplate(templateId, forcedRarity) {
    const tmpl = GameConfig.itemTemplates[templateId];
    if (!tmpl) return null;
    const rarity = forcedRarity || rollRarity();
    const rarCfg = GameConfig.rarities[rarity];
    const mult = rarCfg.statMult;

    const item = {
      id: `${templateId}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      templateId,
      name: tmpl.name,
      ico:  tmpl.ico,
      type: tmpl.type,
      rarity,
      cursed: false,
    };

    const _isStackableType = t => t === 'material' || t === 'monster_part';
    if (_isStackableType(tmpl.type)) {
      item.stackable = true;
      item.maxStack  = tmpl.maxStack;
      item.count     = 1;
      item.baseValue = tmpl.baseValue;
      item.price     = Math.floor(tmpl.baseValue * rarCfg.priceMult);
      item.desc      = `×1 · Стоимость: ${item.price}💰`;
      item.slot      = null;
      item.effect    = {};
    } else {
      item.stackable = false;
      item.slot      = tmpl.slot;
      const atk  = tmpl.baseAtk  ? Math.round(tmpl.baseAtk  * mult) : 0;
      const def  = tmpl.baseDef  ? Math.round(tmpl.baseDef  * mult) : 0;
      const crit = tmpl.baseCrit ? parseFloat((tmpl.baseCrit * mult).toFixed(3)) : 0;
      const hp   = tmpl.baseHp   ? Math.round(tmpl.baseHp   * mult) : 0;
      const mp   = tmpl.baseMp   ? Math.round(tmpl.baseMp   * mult) : 0;
      item.effect = {};
      if (atk)  item.effect.atk  = atk;
      if (def)  item.effect.def  = def;
      if (crit) item.effect.crit = crit;
      if (hp)   item.effect.hp   = hp;
      if (mp)   item.effect.mp   = mp;

      const parts = [];
      if (atk)  parts.push(`+${atk} ATK`);
      if (def)  parts.push(`+${def} DEF`);
      if (crit) parts.push(`+${Math.round(crit*100)}% КРИТ`);
      if (hp)   parts.push(`+${hp} HP`);
      if (mp)   parts.push(`+${mp} MP`);
      item.desc  = `[${rarCfg.label}] ${parts.join(' · ')}`;
      item.price = Math.floor((atk * 12 + def * 10 + crit * 500 + hp * 3 + mp * 2) * rarCfg.priceMult);
    }

    return item;
  }

  // Создать проклятый предмет
  function fromCursed(cursedId) {
    const cfg = GameConfig.cursedItems.find(c => c.id === cursedId);
    if (!cfg) return null;
    return {
      id: `${cursedId}_${Date.now()}`,
      templateId: cursedId,
      name: cfg.name,
      ico:  cfg.ico,
      type: cfg.type,
      rarity: 'epic',
      cursed: true,
      curseLabel: cfg.curseLabel,
      cursedEffect: cfg.cursedEffect,
      slot: cfg.slot || null,
      stackable: cfg.stackable || false,
      maxStack: cfg.maxStack || 1,
      count: 1,
      effect: { ...cfg.effect },
      desc: cfg.desc,
      price: 0,
    };
  }

  // Стакнуть material/potion в инвентаре или добавить новым
  function stackOrAdd(item) {
    if (!item.stackable) { State.addToInventory(item); return; }
    const existing = State.inventory.find(i =>
      i.stackable && i.templateId === item.templateId && !i.cursed && i.count < i.maxStack
    );
    if (existing) {
      existing.count = Math.min(existing.maxStack, existing.count + (item.count || 1));
      if (existing.type === 'material' || existing.type === 'monster_part') existing.desc = `×${existing.count} · Стоимость: ${existing.price * existing.count}💰`;
      EventBus.emit('inventory:changed', State.inventory);
    } else {
      State.addToInventory(item);
    }
  }

  return { fromTemplate, fromCursed, rollRarity, stackOrAdd, templates: GameConfig.itemTemplates };
})();
