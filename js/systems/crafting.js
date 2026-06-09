const CraftingEngine = (() => {

  // Подсчитать количество конкретного материала в инвентаре
  function _countMaterial(itemId) {
    return State.inventory.reduce((total, item) => {
      if (item.templateId === itemId || item.id === itemId) {
        return total + (item.count || 1);
      }
      return total;
    }, 0);
  }

  // Проверить, можно ли создать рецепт N раз
  function canCraft(recipe, times = 1) {
    if (!State.hero) return false;
    if ((State.hero.level || 1) < (recipe.levelReq || 1)) return false;
    return recipe.ingredients.every(ing => _countMaterial(ing.id) >= ing.count * times);
  }

  // Максимальное количество для крафта
  function maxCraftable(recipe) {
    if (!canCraft(recipe, 1)) return 0;
    const limits = recipe.ingredients.map(ing => {
      const have = _countMaterial(ing.id);
      return Math.floor(have / ing.count);
    });
    return Math.max(0, Math.min(...limits));
  }

  // Списать ингредиенты из инвентаря (times раз)
  function _consumeIngredients(recipe, times) {
    recipe.ingredients.forEach(ing => {
      let toConsume = ing.count * times;
      // Проходим по инвентарю и списываем
      for (let i = State.inventory.length - 1; i >= 0 && toConsume > 0; i--) {
        const item = State.inventory[i];
        if (item.templateId === ing.id || item.id === ing.id) {
          const take = Math.min(item.count || 1, toConsume);
          if (item.stackable) {
            item.count -= take;
            toConsume -= take;
            if (item.count <= 0) State.removeFromInventory(i);
            else {
              // Обновить desc для материалов
              if (item.type === 'material' || item.type === 'monster_part') {
                item.desc = `×${item.count} · Стоимость: ${(item.price || item.baseValue || 0) * item.count}💰`;
              }
              EventBus.emit('inventory:changed', State.inventory);
            }
          } else {
            State.removeFromInventory(i);
            toConsume -= 1;
          }
        }
      }
    });
  }

  // Создать предмет по рецепту
  function _buildResult(recipe, times) {
    const res = recipe.result;
    const results = [];

    for (let t = 0; t < times; t++) {
      const totalCount = res.count || 1;

      if (res.templateId) {
        // Создать через ItemFactory
        const item = ItemFactory.fromTemplate(res.templateId, res.rarity || null);
        if (item) results.push(item);
      } else if (res.item) {
        // Кастомный предмет
        const item = {
          ...res.item,
          id: `${res.item.templateId}_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
          count: totalCount,
        };
        results.push(item);
      }
    }
    return results;
  }

  // Основной метод крафта
  function craft(recipeId, times = 1) {
    const recipe = CraftingConfig.recipes.find(r => r.id === recipeId);
    if (!recipe) { UISystem.showToast('❌ Рецепт не найден'); return false; }
    if (!canCraft(recipe, times)) { UISystem.showToast('❌ Недостаточно материалов!'); return false; }

    _consumeIngredients(recipe, times);

    const items = _buildResult(recipe, times);
    items.forEach(item => ItemFactory.stackOrAdd(item));

    const totalCount = (recipe.result.count || 1) * times;
    UISystem.showToast(`🔨 Создано: ${recipe.ico} ${recipe.name} ×${totalCount}`);
    UISystem.log(`🔨 Скрафчено: ${recipe.name} ×${totalCount}`, 'ls');
    EventBus.emit('craft:complete', { recipe, times, items });
    SaveSystem.autosave();
    return true;
  }

  // Получить материал по id (шорткат)
  function getMaterialCount(id) { return _countMaterial(id); }

  return { canCraft, maxCraftable, craft, getMaterialCount };
})();
const CraftingRenderer = (() => {
  let _currentCat = 'weapon';
  let _craftQty   = {};   // recipeId → количество для крафта

  const _RARITY_COLOR = {
    common:'var(--text)', uncommon:'#6db86d',
    rare:'var(--rarity-rare,#4fa3e0)', epic:'var(--rarity-epic,#b44fe0)', legendary:'var(--rarity-legendary,#e0a030)',
  };

  function _rc(r) { return _RARITY_COLOR[r] || 'var(--text)'; }

  // Получить локализованное название редкости
  function _rarLabel(r) {
    const map = { common:'Обычный', uncommon:'Необычный', rare:'Редкий', epic:'Эпический', legendary:'Легендарный' };
    return map[r] || r;
  }

  function _getResultRarity(recipe) {
    if (recipe.result.rarity) return recipe.result.rarity;
    if (recipe.result.item?.rarity) return recipe.result.item.rarity;
    return 'common';
  }

  function _getResultDesc(recipe) {
    if (recipe.result.item?.desc) return recipe.result.item.desc;
    if (recipe.result.templateId) {
      const tmpl = GameConfig.itemTemplates[recipe.result.templateId];
      if (tmpl) return tmpl.name;
    }
    return '';
  }

  // Построить HTML одной рецептурной карточки
  function _recipeCard(recipe) {
    const can     = CraftingEngine.canCraft(recipe, 1);
    const maxQ    = CraftingEngine.maxCraftable(recipe);
    const qty     = _craftQty[recipe.id] || 1;
    const canMult = CraftingEngine.canCraft(recipe, qty);
    const lvlOk   = (State.hero?.level || 1) >= (recipe.levelReq || 1);
    const rarity  = _getResultRarity(recipe);
    const rc      = _rc(rarity);
    const rarLbl  = _rarLabel(rarity);
    const descStr = _getResultDesc(recipe);
    const resCount= (recipe.result.count || 1) * qty;

    // Ингредиенты
    const ingHTML = recipe.ingredients.map(ing => {
      const have = CraftingEngine.getMaterialCount(ing.id);
      const need = ing.count * qty;
      const ok   = have >= need;
      return `<div class="craft-ing${ok ? '' : ' craft-ing-miss'}">
        <span class="craft-ing-ico">${_getIngIco(ing.id)}</span>
        <span class="craft-ing-name">${ing.label}</span>
        <span class="craft-ing-cnt">${have}/${need}</span>
      </div>`;
    }).join('');

    const notEnoughLvl = !lvlOk
      ? `<div class="craft-lock">🔒 Требуется Ур.${recipe.levelReq}</div>` : '';

    const qtyControls = maxQ > 1 ? `
      <div class="craft-qty-row">
        <span class="craft-qty-lbl">Кол-во:</span>
        <button class="craft-qty-btn" data-recipe="${recipe.id}" data-delta="-1">−</button>
        <span class="craft-qty-val" id="cqv_${recipe.id}">${qty}</span>
        <button class="craft-qty-btn" data-recipe="${recipe.id}" data-delta="1">+</button>
        <button class="craft-qty-btn craft-qty-max" data-recipe="${recipe.id}" data-setmax="1">Макс</button>
      </div>` : '';

    const btnDis = (!canMult || !lvlOk) ? 'disabled' : '';
    const btnCls = canMult && lvlOk ? 'craft-btn craft-btn-ok' : 'craft-btn craft-btn-dis';

    return `<div class="craft-card${can && lvlOk ? '' : ' craft-card-dim'}">
      <div class="craft-card-head">
        <span class="craft-ico">${recipe.ico}</span>
        <div class="craft-meta">
          <div class="craft-name" style="color:${rc}">${recipe.name}
            <span class="craft-rarity-badge" style="color:${rc};border-color:${rc}55;background:${rc}10">${rarLbl}</span>
          </div>
          <div class="craft-desc">${recipe.desc}</div>
          ${descStr ? `<div class="craft-result-desc">${descStr}</div>` : ''}
          ${notEnoughLvl}
        </div>
        <div class="craft-yield">
          <div class="craft-yield-ico">${recipe.ico}</div>
          <div class="craft-yield-cnt">×${resCount}</div>
        </div>
      </div>
      <div class="craft-ings">${ingHTML}</div>
      ${qtyControls}
      <button class="${btnCls}" data-recipe-craft="${recipe.id}" ${btnDis}>
        🔨 Создать${qty > 1 ? ` ×${qty}` : ''}
      </button>
    </div>`;
  }

  // Иконка ингредиента по id
  function _getIngIco(id) {
    const tmpl = GameConfig.itemTemplates[id];
    if (tmpl) return tmpl.ico;
    const map = {
      iron_ore:'⛏️', magic_dust:'✨', goblin_ear:'👂', wolf_fang:'🦷',
      bone_shard:'🦴', slime_jelly:'🟢', spider_silk:'🕸️', troll_hide:'🟤',
      dragon_scale:'🐉', copper_ore:'🟤', silver_ore:'⚪', gold_ore:'🟡',
      mithril_ore:'🔵', common_herb:'🌿', moonflower:'🌸', bloodroot:'🌹',
      shadowleaf:'🍃', dragonbloom:'🌺',
    };
    return map[id] || '❓';
  }

  // Рендер всей вкладки
  function render(containerEl) {
    if (!containerEl) return;

    const cats = CraftingConfig.categories;
    const heroClass = State.heroClassKey || 'warrior';
    const recipes = CraftingConfig.recipes.filter(r => {
      // Только купленные рецепты (или все, если RecipeShopSystem недоступен)
      if (typeof RecipeShopSystem !== 'undefined' && !RecipeShopSystem.hasPurchased(r.id)) return false;
      // Фильтр по категории
      if (r.category !== _currentCat) return false;
      // Фильтр по классу — используем ту же логику что и магазин
      if (!r.classGroup || r.classGroup === 'any') return true;
      return r.classGroup === heroClass;
    });

    const tabsHTML = cats.map(c =>
      `<button class="inv-tab craft-cat-btn${_currentCat === c.id ? ' on' : ''}" data-ccat="${c.id}">
        <span class="it-ico">${c.ico}</span>${c.label}
      </button>`
    ).join('');

    const cardsHTML = recipes.length
      ? recipes.map(r => _recipeCard(r)).join('')
      : `<div class="empty-st">📖 Нет рецептов.<br><span style="font-size:10px;color:var(--muted);">Купи рецепты у торговца в Гильдии → вкладка «Рецепты»</span></div>`;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="sec-title" style="margin-top:14px;">🔨 Крафт</div>
      <div style="font-size:10px;color:var(--muted);margin-bottom:6px;padding:0 2px;">
        Создавай предметы из ресурсов добытых в подземелье
      </div>
      <div class="inv-tabs craft-cat-tabs" style="margin-bottom:8px;">${tabsHTML}</div>
      <div class="craft-list">${cardsHTML}</div>`;

    // Привязка вкладок категорий
    wrapper.querySelectorAll('[data-ccat]').forEach(btn => {
      btn.addEventListener('click', () => {
        _currentCat = btn.dataset.ccat;
        // Перерисовать в контейнере
        const sec = containerEl.querySelector('.craft-section-root');
        if (sec) sec.remove();
        const inner = document.createElement('div');
        inner.className = 'craft-section-root';
        render(inner);
        containerEl.appendChild(inner);
      });
    });

    // Привязка кнопок крафта
    wrapper.querySelectorAll('[data-recipe-craft]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id  = btn.dataset.recipeCraft;
        const qty = _craftQty[id] || 1;
        const ok  = CraftingEngine.craft(id, qty);
        if (ok) {
          _craftQty[id] = 1;
          // Перерисовать секцию
          const sec = containerEl.querySelector('.craft-section-root');
          if (sec) sec.remove();
          const inner = document.createElement('div');
          inner.className = 'craft-section-root';
          render(inner);
          containerEl.appendChild(inner);
        }
      });
    });

    // Кнопки qty
    wrapper.querySelectorAll('.craft-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id  = btn.dataset.recipe;
        const rec = CraftingConfig.recipes.find(r => r.id === id);
        if (!rec) return;
        const maxQ = CraftingEngine.maxCraftable(rec);
        if (btn.dataset.setmax) {
          _craftQty[id] = Math.max(1, maxQ);
        } else {
          const delta = parseInt(btn.dataset.delta || '0');
          _craftQty[id] = Math.max(1, Math.min(maxQ, (_craftQty[id] || 1) + delta));
        }
        // Обновить только кол-во и кнопки в карточке без полного ре-рендера
        const valEl = wrapper.querySelector(`#cqv_${id}`);
        if (valEl) valEl.textContent = _craftQty[id];
        // Пересчитать ингредиенты — только ресурсы
        const sec = containerEl.querySelector('.craft-section-root');
        if (sec) sec.remove();
        const inner = document.createElement('div');
        inner.className = 'craft-section-root';
        render(inner);
        containerEl.appendChild(inner);
      });
    });

    wrapper.className = 'craft-section-root';
    containerEl.appendChild(wrapper);
  }

  // Подписка: обновлять при смене таба на hero и при изменении инвентаря
  EventBus.on('inventory:changed', () => {
    if (typeof NavSystem !== 'undefined' && NavSystem.current === 'hero') {
      const cont = document.getElementById('craft-inner-container');
      if (cont) {
        const sec = cont.querySelector('.craft-section-root');
        if (sec) sec.remove();
        render(cont);
      }
    }
  });

  return { render };
})();
