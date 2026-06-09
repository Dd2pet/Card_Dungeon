const EnchantEngine = (() => {

  // Получить уровень заточки предмета (0 если не точён)
  function getLevel(item) {
    return item?.enchantLevel || 0;
  }

  // Можно ли точить предмет (оружие или броня, не аксессуар)
  function canEnchant(item) {
    if (!item) return false;
    return item.type === 'weapon' || item.type === 'armor';
  }

  // Количество конкретного материала в инвентаре
  function _countMat(matId) {
    return State.inventory.reduce((s, i) => {
      if ((i.templateId === matId || i.id === matId) && i.stackable) return s + (i.count || 1);
      return s;
    }, 0);
  }

  // Списать материал (count штук)
  function _consumeMat(matId, count) {
    let left = count;
    for (let i = State.inventory.length - 1; i >= 0 && left > 0; i--) {
      const item = State.inventory[i];
      if ((item.templateId === matId || item.id === matId) && item.stackable) {
        const take = Math.min(item.count || 1, left);
        item.count -= take;
        left -= take;
        if (item.count <= 0) State.removeFromInventory(i);
        else {
          if (item.type === 'material' || item.type === 'monster_part' || item.type === 'gathering_ore') {
            item.desc = `×${item.count} · Стоимость: ${(item.price || item.baseValue || 0) * item.count}💰`;
          }
          EventBus.emit('inventory:changed', State.inventory);
        }
      }
    }
  }

  // Получить информацию о следующем уровне заточки
  function getNextEnchantInfo(item) {
    const cur = getLevel(item);
    if (cur >= EnchantConfig.MAX_LEVEL) return null;
    const nextLv = cur + 1;
    const mat = EnchantConfig.materialPerLevel[nextLv];
    const cnt = EnchantConfig.materialCount[nextLv];
    const chance = EnchantConfig.successChance[nextLv];
    const have = _countMat(mat.id);
    return { nextLv, mat, cnt, chance, have, canAfford: have >= cnt };
  }

  // Вычислить суммарный бонус заточки для предмета
  function getEnchantBonus(item) {
    const lv = getLevel(item);
    if (lv <= 0) return {};
    const table = item.type === 'weapon'
      ? EnchantConfig.statBonusPerLevel.weapon
      : EnchantConfig.statBonusPerLevel.armor;
    const bonus = {};
    for (const [stat, perLv] of Object.entries(table)) {
      bonus[stat] = perLv * lv;
    }
    return bonus;
  }

  // Применить заточку к предмету: перестроить effect и desc
  function _applyBonusToItem(item) {
    const lv = getLevel(item);
    if (lv <= 0) return;
    const bonus = getEnchantBonus(item);
    // effect уже содержит базовые + накопленные бонусы заточки;
    // Храним базовые значения отдельно при первом улучшении
    if (!item._baseEffect) {
      item._baseEffect = { ...item.effect };
    }
    // Пересчитать effect от нуля каждый раз
    item.effect = { ...item._baseEffect };
    for (const [stat, val] of Object.entries(bonus)) {
      item.effect[stat] = (item.effect[stat] || 0) + val;
    }
    // Обновить desc
    const parts = [];
    if (item.effect.atk)  parts.push(`+${item.effect.atk} ATK`);
    if (item.effect.def)  parts.push(`+${item.effect.def} DEF`);
    if (item.effect.crit) parts.push(`+${Math.round(item.effect.crit * 100)}% КРИТ`);
    if (item.effect.hp)   parts.push(`+${item.effect.hp} HP`);
    if (item.effect.mp)   parts.push(`+${item.effect.mp} MP`);
    const rarCfg = GameConfig.rarities[item.rarity];
    const rarLabel = rarCfg?.label || item.rarity;
    item.desc = `[${rarLabel}] ${parts.join(' · ')} ✦+${lv}`;
  }

  // Основной метод заточки
  // Возвращает { success, newLevel, message }
  function enchant(item) {
    if (!canEnchant(item)) return { success: false, message: 'Этот предмет нельзя точить' };
    const cur = getLevel(item);
    if (cur >= EnchantConfig.MAX_LEVEL) return { success: false, message: 'Максимальный уровень заточки достигнут!' };

    const info = getNextEnchantInfo(item);
    if (!info) return { success: false, message: 'Ошибка конфигурации заточки' };
    if (!info.canAfford) return { success: false, message: `Недостаточно ${info.mat.label}!` };

    // Списать материалы (всегда, при любом исходе)
    _consumeMat(info.mat.id, info.cnt);

    // Бросок удачи
    const roll = Math.random();
    const success = roll < info.chance;

    if (success) {
      item.enchantLevel = info.nextLv;
      _applyBonusToItem(item);
      // Пересчитать суммарные статы героя без ре-рендера всей вкладки.
      // EventBus.emit('equipment:changed') и 'hero:updated' намеренно НЕ вызываются здесь:
      // они разрушают craft-section-container пока обработчик клика ещё не завершён.
      // EnchantRenderer сам обновит свою секцию после возврата из enchant().
      if (typeof PlayerSystem !== 'undefined') PlayerSystem.recalcStats?.();
      SaveSystem.autosave();
      return { success: true, newLevel: info.nextLv, message: `✦ Заточка успешна! Теперь +${info.nextLv}` };
    } else {
      SaveSystem.autosave();
      return { success: false, newLevel: cur, message: `✦ Заточка провалилась. Уровень ${cur > 0 ? '+'+cur : '0'} сохранён` };
    }
  }

  return { canEnchant, getLevel, getNextEnchantInfo, getEnchantBonus, enchant };
})();
const EnchantRenderer = (() => {

  const RARITY_COLOR = {
    common:'var(--text)', uncommon:'#6db86d', rare:'#4fa3e0',
    epic:'#b44fe0', legendary:'#e0a030', mythic:'#ff3232',
  };
  function _rc(r) { return RARITY_COLOR[r] || 'var(--text)'; }

  // Перечень предметов пригодных для заточки из инвентаря + экипировки
  function _getEnchantableItems() {
    const items = [];
    // Из инвентаря (weapon / armor)
    State.inventory.forEach((item, idx) => {
      if (EnchantEngine.canEnchant(item)) {
        items.push({ item, source: 'inventory', idx });
      }
    });
    // Из слотов экипировки (weapon / armor)
    ['weapon', 'armor'].forEach(slot => {
      const item = State.equipment[slot];
      if (item && EnchantEngine.canEnchant(item)) {
        items.push({ item, source: 'equipment', slot });
      }
    });
    return items;
  }

  // Построить карточку одного предмета для заточки
  function _itemCard(entry) {
    const { item, source, idx, slot } = entry;
    const lv = EnchantEngine.getLevel(item);
    const maxed = lv >= EnchantConfig.MAX_LEVEL;
    const info = !maxed ? EnchantEngine.getNextEnchantInfo(item) : null;
    const rarColor = _rc(item.rarity);
    const sourceLabel = source === 'equipment' ? '⚙️ Надето' : '📦 Инвентарь';
    const enchLvLabel = lv > 0 ? `<span class="ench-lv-badge">✦+${lv}</span>` : '';

    // Текущие бонусы заточки
    const bonus = EnchantEngine.getEnchantBonus(item);
    const bonusParts = [];
    if (bonus.atk) bonusParts.push(`+${bonus.atk} ATK`);
    if (bonus.def) bonusParts.push(`+${bonus.def} DEF`);
    if (bonus.hp)  bonusParts.push(`+${bonus.hp} HP`);
    const bonusStr = bonusParts.length ? bonusParts.join(' · ') : '—';

    // Звёздочки уровня
    const stars = Array.from({ length: EnchantConfig.MAX_LEVEL }, (_, i) =>
      `<span class="ench-star ${i < lv ? 'ench-star-on' : ''}">${i < lv ? '★' : '☆'}</span>`
    ).join('');

    let actionHTML = '';
    if (maxed) {
      actionHTML = `<div class="ench-maxed">🏆 Максимальная заточка достигнута!</div>`;
    } else if (info) {
      const matColor = _rc(info.mat.rarity);
      const pct = Math.round(info.chance * 100);
      const cantAfford = !info.canAfford;
      const btnCls = cantAfford ? 'ench-btn ench-btn-dis' : 'ench-btn ench-btn-ok';
      const dataKey = source === 'equipment' ? `data-ench-slot="${slot}"` : `data-ench-idx="${idx}"`;
      actionHTML = `
        <div class="ench-mat-row">
          <span class="ench-mat-ico">${info.mat.ico}</span>
          <span class="ench-mat-name" style="color:${matColor}">${info.mat.label}</span>
          <span class="ench-mat-cnt ${cantAfford ? 'ench-mat-miss' : ''}">${info.have}/${info.cnt}</span>
        </div>
        <div class="ench-action-row">
          <button class="${btnCls}" ${cantAfford ? 'disabled' : ''} ${dataKey}>
            ⚒️ Заточить до +${info.nextLv}
          </button>
          <div class="ench-chance ${pct <= 30 ? 'ench-chance-danger' : pct <= 60 ? 'ench-chance-warn' : 'ench-chance-safe'}">
            ${pct}%
          </div>
        </div>`;
    }

    return `
      <div class="ench-card">
        <div class="ench-card-head">
          <span class="ench-ico">${item.ico}</span>
          <div class="ench-meta">
            <div class="ench-name" style="color:${rarColor}">${item.name}${enchLvLabel}</div>
            <div class="ench-source">${sourceLabel} · ${item.type === 'weapon' ? '⚔️ Оружие' : '🛡️ Броня'}</div>
            <div class="ench-cur-bonus">Бонус заточки: <span style="color:var(--gold-lt)">${bonusStr}</span></div>
          </div>
        </div>
        <div class="ench-stars">${stars}</div>
        ${actionHTML}
      </div>`;
  }

  function render(containerEl) {
    if (!containerEl) return;
    const entries = _getEnchantableItems();

    const cardsHTML = entries.length
      ? entries.map(e => _itemCard(e)).join('')
      : `<div class="empty-st">Нет предметов для заточки.<br><span style="font-size:11px;color:var(--muted)">Добудь оружие или броню в бою или купи в магазине</span></div>`;

    const wrapper = document.createElement('div');
    wrapper.className = 'ench-section-root';
    wrapper.innerHTML = `
      <div class="sec-title" style="margin-top:14px;">⚒️ Заточка снаряжения</div>
      <div style="font-size:10px;color:var(--muted);margin-bottom:10px;padding:0 2px;">
        Улучшай оружие и броню. При неудаче материалы теряются, уровень сохраняется.
      </div>
      <div class="ench-list">${cardsHTML}</div>`;

    // Привязка кнопок заточки
    wrapper.querySelectorAll('[data-ench-idx], [data-ench-slot]').forEach(btn => {
      btn.addEventListener('click', () => {
        let item = null;
        if (btn.dataset.enchSlot) {
          item = State.equipment[btn.dataset.enchSlot];
        } else {
          const idx = parseInt(btn.dataset.enchIdx);
          item = State.inventory[idx];
        }
        if (!item) return;

        const result = EnchantEngine.enchant(item);

        // Toast с результатом
        const toastEl = document.createElement('div');
        toastEl.className = 'toast-el';
        toastEl.style.borderColor = result.success ? 'var(--green)' : 'var(--red-lt)';
        toastEl.style.color = result.success ? '#4ade80' : 'var(--red-lt)';
        toastEl.textContent = result.message;
        document.body.appendChild(toastEl);
        setTimeout(() => toastEl.remove(), 2200);

        // Анимация на карточке
        const card = btn.closest('.ench-card');
        if (card) {
          card.style.animation = 'none';
          card.offsetHeight; // reflow
          card.style.animation = result.success ? 'ench-success-flash .5s ease' : 'ench-fail-flash .5s ease';
        }

        // Обновить вкладку заточки — заменяем корень без пересоздания контейнера
        const cont = document.getElementById('enchant-section-container') || containerEl;
        const sec = cont.querySelector('.ench-section-root');
        if (sec) sec.remove();
        EnchantRenderer.render(cont);
        SaveSystem.autosave();

        // Обновляем статы героя отложенно — после завершения текущего обработчика,
        // чтобы heroTab() не разрушил enchant-section-container во время рендера.
        if (result.success) {
          setTimeout(() => {
            EventBus.emit('equipment:changed', State.equipment);
            EventBus.emit('hero:updated', State.hero);
          }, 0);
        }
      });
    });

    containerEl.appendChild(wrapper);
  }

  // Реагировать на изменения инвентаря/экипировки
  EventBus.on('inventory:changed', () => {
    if (typeof NavSystem !== 'undefined' && NavSystem.current === 'hero') {
      const cont = document.getElementById('enchant-section-container');
      if (cont) {
        const sec = cont.querySelector('.ench-section-root');
        if (sec) sec.remove();
        render(cont);
      }
    }
  });
  EventBus.on('equipment:changed', () => {
    if (typeof NavSystem !== 'undefined' && NavSystem.current === 'hero') {
      const cont = document.getElementById('enchant-section-container');
      if (cont) {
        const sec = cont.querySelector('.ench-section-root');
        if (sec) sec.remove();
        render(cont);
      }
    }
  });

  return { render };
})();
