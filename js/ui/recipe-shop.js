const RecipeShopSystem = (() => {

  // Маппинг: ранг гильдии → допустимые редкости рецептов
  // E/D → common, C → +uncommon, B → +rare, A → +epic, S → +legendary
  const _rankUnlocks = Object.freeze({
    E: ['common'],
    D: ['common', 'uncommon'],
    C: ['common', 'uncommon', 'rare'],
    B: ['common', 'uncommon', 'rare', 'epic'],
    A: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    S: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
  });

  // Цена покупки рецепта (разовая — открывает рецепт навсегда)
  // Дорогие — как и просили
  const _rarityPrice = Object.freeze({
    common:    1500,
    uncommon:  4000,
    rare:      12000,
    epic:      35000,
    legendary: 120000,
  });

  const _rarityLabel = Object.freeze({
    common:    { label:'Обычный',    color:'#a0a0a0', ico:'⚪' },
    uncommon:  { label:'Необычный',  color:'#6db86d', ico:'🟢' },
    rare:      { label:'Редкий',     color:'#4fa3e0', ico:'🔵' },
    epic:      { label:'Эпический',  color:'#b44fe0', ico:'🟣' },
    legendary: { label:'Легендарный',color:'#e0a030', ico:'🟡' },
  });

  // Купленные рецепты: Set of recipeId
  let _purchased = new Set();

  /** Определяет редкость рецепта по его результату */
  function _getRecipeRarity(recipe) {
    if (recipe.result?.rarity) return recipe.result.rarity;
    if (recipe.result?.item?.rarity) return recipe.result.item.rarity;
    return 'common';
  }

  // Порядок рангов для сравнения
  const _rankOrder = ['E','D','C','B','A','S'];

  /** Маппинг ранга гильдии → rarity для shopOnly рецептов */
  const _rankToRarity = Object.freeze({
    E: 'common', D: 'uncommon', C: 'rare', B: 'epic', A: 'legendary', S: 'legendary',
  });

  /** Все рецепты для основной мастерской (НЕ shopOnly), с ценами */
  function getShopRecipes() {
    const rankKey = (() => {
      const idx = typeof GuildSystem !== 'undefined' ? GuildSystem.getRankIdx() : 0;
      return QuestConfig.ranks[idx]?.key || 'E';
    })();
    const allowed   = _rankUnlocks[rankKey] || ['common'];
    const heroClass = (typeof State !== 'undefined' ? State.heroClassKey : null) || 'warrior';

    return CraftingConfig.recipes
      .filter(r => {
        if (r.shopOnly) return false; // Эксклюзивы гильдии — отдельный метод
        if (r.classGroup && r.classGroup !== 'any' && r.classGroup !== heroClass) return false;
        return true;
      })
      .map(r => ({
        recipe:    r,
        rarity:    _getRecipeRarity(r),
        price:     _rarityPrice[_getRecipeRarity(r)] || _rarityPrice.common,
        purchased: _purchased.has(r.id),
        unlocked:  allowed.includes(_getRecipeRarity(r)),
      }))
      .sort((a, b) => {
        const order = ['common','uncommon','rare','epic','legendary'];
        return order.indexOf(a.rarity) - order.indexOf(b.rarity);
      });
  }

  /**
   * Эксклюзивные рецепты гильдейского магазина (shopOnly: true).
   * Фильтрует по классу героя и текущему рангу гильдии.
   * Возвращает { byCategory: { weapon:[], armor:[], accessory:[] }, rankKey, rankIdx }
   */
  function getGuildShopRecipes() {
    const rankIdx  = typeof GuildSystem !== 'undefined' ? GuildSystem.getRankIdx() : 0;
    const rankKey  = QuestConfig.ranks[rankIdx]?.key || 'E';
    const heroClass = (typeof State !== 'undefined' ? State.heroClassKey : null) || 'warrior';

    // Все доступные ранги (от E до текущего включительно)
    const unlockedRanks = _rankOrder.slice(0, _rankOrder.indexOf(rankKey) + 1);

    const byCategory = { weapon: [], armor: [], accessory: [] };

    CraftingConfig.recipes.forEach(r => {
      if (!r.shopOnly) return;
      if (r.classGroup && r.classGroup !== 'any' && r.classGroup !== heroClass) return;
      if (!r.guildRankReq) return;

      const cat = r.category; // 'weapon' | 'armor' | 'accessory'
      if (!byCategory[cat]) return;

      const rarity      = _getRecipeRarity(r);
      const rankUnlocked = unlockedRanks.includes(r.guildRankReq);

      byCategory[cat].push({
        recipe:       r,
        rarity,
        price:        _rarityPrice[rarity] || _rarityPrice.common,
        purchased:    _purchased.has(r.id),
        rankUnlocked, // открыт ли по рангу гильдии
        guildRankReq: r.guildRankReq,
      });
    });

    // Сортируем каждую категорию по порядку рангов
    const sortFn = (a, b) => _rankOrder.indexOf(a.guildRankReq) - _rankOrder.indexOf(b.guildRankReq);
    Object.keys(byCategory).forEach(k => byCategory[k].sort(sortFn));

    return { byCategory, rankKey, rankIdx };
  }

  /** Покупка рецепта. Возвращает { ok, msg } */
  function buyRecipe(recipeId) {
    if (_purchased.has(recipeId)) {
      return { ok: false, msg: 'Рецепт уже куплен.' };
    }
    const recipe = CraftingConfig.recipes.find(r => r.id === recipeId);
    if (!recipe) return { ok: false, msg: 'Рецепт не найден.' };

    const rarity = _getRecipeRarity(recipe);
    const rankKey = (() => {
      const idx = typeof GuildSystem !== 'undefined' ? GuildSystem.getRankIdx() : 0;
      return QuestConfig.ranks[idx]?.key || 'E';
    })();
    const allowed = _rankUnlocks[rankKey] || ['common'];
    if (!allowed.includes(rarity)) {
      return { ok: false, msg: 'Недостаточный ранг гильдии.' };
    }

    const price = _rarityPrice[rarity] || _rarityPrice.common;
    if (State.totalWealth < price) {
      return { ok: false, msg: `Недостаточно золота. Нужно: ${price.toLocaleString()} 💰` };
    }

    State.spendGold(price);
    _purchased.add(recipeId);
    EventBus.emit('hero:updated');
    return { ok: true, msg: `📖 Рецепт «${recipe.name}» изучен!` };
  }

  /** Проверить, куплен ли рецепт */
  function hasPurchased(recipeId) {
    return _purchased.has(recipeId);
  }

  function toSave() {
    return { purchased: [..._purchased] };
  }

  function fromSave(d) {
    if (d?.purchased) _purchased = new Set(d.purchased);
    else _purchased = new Set();
  }

  EventBus.on('game:newHero', () => { _purchased = new Set(); });

  return { getShopRecipes, getGuildShopRecipes, buyRecipe, hasPurchased, toSave, fromSave,
           _rarityLabel, _rarityPrice, _rankOrder, _rankToRarity };
})();
