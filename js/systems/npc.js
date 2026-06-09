const NpcSystem = (() => {
  // ── Active buffs: { buffId: { turnsLeft } } ──
  const _buffs = {};

  function getAvailableNpcs() {
    const heroLv = State.hero?.level || 1;
    return NpcConfig.npcs.filter(n => heroLv >= n.unlockLv);
  }

  function _getGreetingKey() {
    const lv = State.hero?.level || 1;
    if (lv < 3)  return 'newbie';
    if (lv < 7)  return 'weak';
    if (lv < 14) return 'mid';
    return 'strong';
  }

  function getGreeting(npcId) {
    const npc = NpcConfig.npcs.find(n => n.id === npcId);
    if (!npc) return '...';
    const key = _getGreetingKey();
    const lines = npc.greetings[key] || npc.greetings.newbie;
    return lines[Math.floor(Math.random() * lines.length)];
  }

  // ── Service execution (returns { ok, msg }) ──
  function executeService(npcId, serviceId) {
    const npc = NpcConfig.npcs.find(n => n.id === npcId);
    if (!npc) return { ok: false, msg: 'НПС не найден' };
    const svc = npc.services.find(s => s.id === serviceId);
    if (!svc) return { ok: false, msg: 'Услуга не найдена' };

    if (svc.cost > 0 && State.totalWealth < svc.cost) {
      return { ok: false, msg: `❌ Недостаточно золота! Нужно ${svc.cost}💰` };
    }

    switch (serviceId) {
      case 'advice_zone': {
        const z = State.zone;
        const heroLv = State.hero?.level || 1;
        const risk = WorldSystem.getCurrentRisk();
        const nextZone = GameConfig.zones.find(zn => zn.minLv > heroLv);
        const nextZoneStr = nextZone ? ` Следующая зона разблокируется на уровне ${nextZone.minLv}.` : ' Ты уже в самой опасной зоне!';
        return { ok: true, msg: `Сейчас ты в "${z.label}" (${risk.label}). Чем выше риск — тем больше золота и опыта.${nextZoneStr}` };
      }
      case 'buff_gxp': {
        State.spendGold(svc.cost);
        _buffs.gxp_boost = { turnsLeft: 5, mult: 1.5 };
        EventBus.emit('npc:buffApplied', { id: 'gxp_boost', turnsLeft: 5 });
        return { ok: true, msg: `✨ Благословение гильдии активно! Следующие 5 боёв: +50% GXP.` };
      }
      case 'rank_info': {
        const rank = GuildSystem.getRank();
        const gxp  = GuildSystem.getGuildXp();
        const next  = GuildSystem.getXpToNext();
        const rankList = QuestConfig.ranks.map(r => `${r.key}(${r.xpNeeded})`).join(' → ');
        return { ok: true, msg: `Текущий ранг: ${rank.key} (${gxp} GXP). ${next ? `До следующего: ${next - gxp} GXP.` : 'Максимальный ранг!'}\nРанги: ${rankList}` };
      }
      case 'heal_full': {
        State.spendGold(svc.cost);
        State.setHeroHp(State.totalMaxHp);
        return { ok: true, msg: `❤️ Здоровье полностью восстановлено! HP: ${State.hero.hp}/${State.totalMaxHp}` };
      }
      case 'heal_mp': {
        State.spendGold(svc.cost);
        State.hero.mp = State.totalMaxMp;
        EventBus.emit('hero:updated', State.hero);
        return { ok: true, msg: `💙 Мана полностью восстановлена! MP: ${State.hero.mp}/${State.totalMaxMp}` };
      }
      case 'cure_all': {
        State.spendGold(svc.cost);
        State.clearAllStatuses('player');
        EventBus.emit('hero:updated', State.hero);
        return { ok: true, msg: `✨ Все негативные статусы сняты!` };
      }
      case 'resurrect': {
        State.spendGold(svc.cost);
        State.hero.maxHp = (State.hero.maxHp || 100) + 20;
        State.healHero(20);
        return { ok: true, msg: `🌟 Максимальное HP увеличено на 20! Новый MAX HP: ${State.hero.maxHp}` };
      }
      case 'train_atk': {
        State.spendGold(svc.cost);
        State.hero.atk = (State.hero.atk || 10) + 2;
        EventBus.emit('hero:updated', State.hero);
        return { ok: true, msg: `⚔️ ATK увеличен на 2! Новый ATK: ${State.hero.atk} (без снаряжения: ${State.hero.atk}, итого: ${State.totalAtk})` };
      }
      case 'train_def': {
        State.spendGold(svc.cost);
        State.hero.def = (State.hero.def || 5) + 2;
        EventBus.emit('hero:updated', State.hero);
        return { ok: true, msg: `🛡️ DEF увеличен на 2! Новый DEF: ${State.hero.def}` };
      }
      case 'train_spd': {
        State.spendGold(svc.cost);
        State.hero.spd = (State.hero.spd || 5) + 1;
        EventBus.emit('hero:updated', State.hero);
        return { ok: true, msg: `💨 SPD увеличен на 1! Новый SPD: ${State.hero.spd}` };
      }
      case 'train_crit': {
        State.spendGold(svc.cost);
        State.hero.crit = parseFloat(((State.hero.crit || 0.1) + 0.03).toFixed(3));
        EventBus.emit('hero:updated', State.hero);
        return { ok: true, msg: `🎯 Крит.шанс увеличен на 3%! Новый КРИТ: ${Math.round(State.totalCrit * 100)}%` };
      }
      case 'reveal_zone': {
        const zone = State.zone;
        const risk = WorldSystem.getCurrentRisk();
        const pool = GameConfig.monsters.filter(m => m.zone === zone.id && m.risk === risk.id);
        const names = pool.map(m => `${m.av} ${m.name}`).join(', ');
        return { ok: true, msg: `В ${zone.label} обитают: ${names}. Уровни ${zone.minLv}–${zone.maxLv}. Риск: ${risk.label}. Множитель монстров: ×${risk.monsterMult}.` };
      }
      case 'buff_xp': {
        State.spendGold(svc.cost);
        _buffs.xp_boost = { turnsLeft: 5, mult: 1.5 };
        EventBus.emit('npc:buffApplied', { id: 'xp_boost', turnsLeft: 5 });
        return { ok: true, msg: `✨ Эликсир знаний выпит! Следующие 5 побед: +50% XP.` };
      }
      case 'buff_drop': {
        State.spendGold(svc.cost);
        _buffs.drop_boost = { turnsLeft: 5, mult: 1.5 };
        EventBus.emit('npc:buffApplied', { id: 'drop_boost', turnsLeft: 5 });
        return { ok: true, msg: `🍀 Удача добычи активна! Следующие 5 побед: лучший дроп.` };
      }
      case 'enemy_lore': {
        const zone = State.zone;
        const pool = GameConfig.monsters.filter(m => m.zone === zone.id && m.risk === risk.id);
        const info = pool.map(m => `${m.av} ${m.name}: ATK ${m.atk}, DEF ${m.def}, HP ${m.hp}, AI: ${m.ai}`).join('\n');
        return { ok: true, msg: `📖 Бестиарий (${zone.label}):\n${info}` };
      }
      case 'fence_eval': {
        // Evaluate all monster_part items in inventory at 2× baseValue
        const parts = State.inventory.filter(it => it.type === 'monster_part' && (it.baseValue || 0) > 10);
        if (!parts.length) return { ok: true, msg: '🔍 У тебя нет редких частей монстров. Охоться больше!' };
        const totalVal = parts.reduce((sum, it) => sum + (it.baseValue || 0) * 2 * (it.count || 1), 0);
        const lines = parts.map(it => `${it.ico} ${it.name} ×${it.count || 1} → ${(it.baseValue||0)*2*(it.count||1)}💰`).join('\n');
        return { ok: true, msg: `🔍 Оценка редких частей (×2 цена):\n${lines}\n\n💰 Итого: ${totalVal} золота` };
      }
      case 'fence_buy_parts': {
        // Sell all monster_part with baseValue > 10 at 2× price
        const partsToSell = State.inventory.filter(it => it.type === 'monster_part' && (it.baseValue || 0) > 10);
        if (!partsToSell.length) return { ok: false, msg: '❌ Нет редких частей для продажи. Принеси добычу!' };
        let totalGold = 0;
        let soldNames = [];
        // Remove from inventory and accumulate gold
        partsToSell.forEach(it => {
          const qty = it.count || 1;
          const gold = (it.baseValue || 0) * 2 * qty;
          totalGold += gold;
          soldNames.push(`${it.ico} ${it.name} ×${qty}`);
        });
        // Remove sold items from inventory (reverse to avoid index shifts)
        for (let i = State.inventory.length - 1; i >= 0; i--) {
          const it = State.inventory[i];
          if (it.type === 'monster_part' && (it.baseValue || 0) > 10) {
            State.removeFromInventory(i);
          }
        }
        State.addGold(totalGold);
        EventBus.emit('inventory:changed', State.inventory);
        return { ok: true, msg: `💰 Барыга купил:\n${soldNames.join('\n')}\n\n+${totalGold} золота! Хорошая сделка!` };
      }
      default:
        return { ok: false, msg: 'Неизвестная услуга' };
    }
  }

  // ── Buff accessors ──
  function getBuff(id) { return _buffs[id] || null; }

  function tickBuff(id) {
    if (!_buffs[id]) return;
    _buffs[id].turnsLeft--;
    if (_buffs[id].turnsLeft <= 0) {
      delete _buffs[id];
      EventBus.emit('npc:buffExpired', { id });
    }
  }

  // ── Hook into victory to tick buffs ──
  EventBus.on('combat:victory', ({ xp }) => {
    // tick buff durations
    ['xp_boost', 'gxp_boost', 'drop_boost'].forEach(tickBuff);
  });

  return { getAvailableNpcs, getGreeting, executeService, getBuff };
})();
const DialogueSystem = (() => {
  let _currentNpc = null;
  let _pendingServiceResult = null;

  function open(npcId) {
    const npc = NpcConfig.npcs.find(n => n.id === npcId);
    if (!npc) return;
    _currentNpc = npc;
    _renderGreeting(npc);
    UISystem.removeClass('dialogue-ov', 'hide');
    UISystem.addClass('dialogue-ov', 'show');
  }

  function close() {
    UISystem.addClass('dialogue-ov', 'hide');
    UISystem.removeClass('dialogue-ov', 'show');
    _currentNpc = null;
  }

  function _renderGreeting(npc) {
    const greeting = NpcSystem.getGreeting(npc.id);
    UISystem.setText('dlg-av', npc.av);
    UISystem.setText('dlg-name', npc.name);
    UISystem.setText('dlg-title', npc.title);
    UISystem.setText('dlg-text', greeting);

    const choices = document.getElementById('dlg-choices');
    if (!choices) return;

    const svcHtml = npc.services.map(svc => {
      const canAfford = svc.cost === 0 || State.totalWealth >= svc.cost;
      const costBadge = svc.cost > 0 ? `<span class="dlg-cost-badge">${svc.cost}💰</span>` : '';
      return `<button class="dlg-choice ${svc.cost > 0 ? 'dlg-cost' : ''}" 
        data-svc="${svc.id}" ${canAfford ? '' : 'style="opacity:.45"'}>
        ${svc.label}${costBadge}
      </button>`;
    }).join('');

    choices.innerHTML = svcHtml + `<button class="dlg-choice dlg-close" data-action="close">👋 Уйти</button>`;

    choices.querySelectorAll('[data-svc]').forEach(btn => {
      btn.addEventListener('click', () => _handleService(btn.dataset.svc));
    });
    choices.querySelectorAll('[data-action="close"]').forEach(btn => {
      btn.addEventListener('click', close);
    });
  }

  function _handleService(serviceId) {
    if (!_currentNpc) return;
    const result = NpcSystem.executeService(_currentNpc.id, serviceId);

    // Update text area with result
    const textEl = document.getElementById('dlg-text');
    if (textEl) textEl.textContent = result.msg;

    const choices = document.getElementById('dlg-choices');
    if (!choices) return;

    // After result: show "Понятно" + "Другое" choices
    choices.innerHTML = `
      <button class="dlg-choice" data-action="back">🔙 Другое</button>
      <button class="dlg-choice dlg-close" data-action="close">👋 Уйти</button>
    `;
    choices.querySelector('[data-action="back"]').addEventListener('click', () => _renderGreeting(_currentNpc));
    choices.querySelector('[data-action="close"]').addEventListener('click', close);

    if (result.ok) {
      SaveSystem.autosave();
      NpcRenderSystem.render();
      EventBus.emit('gold:changed', State.gold);
    }
  }

  // close on overlay background tap
  document.getElementById('dialogue-ov')?.addEventListener('click', (e) => {
    if (e.target.id === 'dialogue-ov') close();
  });

  return { open, close };
})();
