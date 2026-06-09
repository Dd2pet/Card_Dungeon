const GuildRenderSystem = (() => {
  let _currentTab = 'board';
  const _boundEls = new WeakSet();

  const _rarityIcons = {
    common:'🗒️', uncommon:'📗', rare:'📘', epic:'📙', legendary:'📕',
  };

  const _rankIcons = { E:'🔰',D:'🥉',C:'🥈',B:'🥇',A:'💎',S:'👑' };

  function _bindTabs() {
    const tabs = document.getElementById('guild-tabs');
    if (!tabs || _boundEls.has(tabs)) return;
    _boundEls.add(tabs);
    tabs.querySelectorAll('[data-gtab]').forEach(btn => {
      btn.addEventListener('click', () => {
        _currentTab = btn.dataset.gtab;
        tabs.querySelectorAll('[data-gtab]').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        render();
      });
    });
  }

  function _renderRankBar() {
    const bar   = document.getElementById('guild-rank-bar');
    if (!bar) return;
    const rank  = GuildSystem.getRank();
    const gxp   = GuildSystem.getGuildXp();
    const next  = GuildSystem.getXpToNext();
    const pct   = next ? Math.min(100, Math.round(((gxp - rank.xpNeeded) / (next - rank.xpNeeded)) * 100)) : 100;
    const icon  = _rankIcons[rank.key] || '🔰';
    bar.innerHTML = `
      <div class="guild-rank-bar">
        <div class="guild-rank-badge" style="color:${rank.color}">${icon} ${rank.key}</div>
        <div class="guild-rank-info">
          <div class="guild-rank-name" style="color:${rank.color}">Ранг ${rank.key}</div>
          <div class="guild-rank-xp">${gxp} GXP${next ? ` · след. ранг: ${next}` : ' · Макс. ранг'}</div>
          <div class="guild-rank-track"><div class="guild-rank-fill" style="width:${pct}%"></div></div>
        </div>
      </div>`;

    // Gold display
    const goldEl = document.getElementById('guild-gold');
    if (goldEl) goldEl.textContent = State.gold;

    // BLP hint
    const blpEl = document.getElementById('guild-blp-hint');
    if (blpEl) {
      const blp = QuestSystem.getBlp();
      const parts = Object.entries(blp)
        .filter(([, v]) => v > 0)
        .map(([r, v]) => `${r[0].toUpperCase()}:${v}`)
        .join(' ');
      blpEl.textContent = parts ? `удача: ${parts}` : '';
    }
  }

  function _questCard(q, context) {
    const meta   = QuestConfig.rarityMeta[q.rarity];
    const obj    = q.objective;
    const pct    = obj.count > 0 ? Math.min(100, Math.round((obj.current / obj.count) * 100)) : 0;
    const ico    = _rarityIcons[q.rarity] || '📋';
    const rankIcon = _rankIcons[q.rankRequired] || '🔰';
    const rank   = QuestConfig.ranks.find(r => r.key === q.rankRequired) || QuestConfig.ranks[0];
    const isComplete = q.status === 'completed';
    const isActive   = q.status === 'active';

    // Reward display
    const rewHtml = `
      <div class="qreward">
        <div class="qrew-item qrew-xp">✨ ${q.reward.xp} XP</div>
        <div class="qrew-item qrew-gold">💰 ${q.reward.gold}</div>
        <div class="qrew-item" style="color:${rank.color}">${rankIcon} ${q.reward.guildXp} GXP</div>
      </div>`;

    // Progress bar (only for active)
    const progHtml = isActive || isComplete ? `
      <div class="qprog">
        <div class="qprog-row"><span>${obj.icon} ${obj.current}/${obj.count}</span><span>${pct}%</span></div>
        <div class="qprog-track"><div class="qprog-fill" style="width:${pct}%"></div></div>
      </div>` : '';

    // Buttons
    let btns = '';
    if (context === 'board') {
      const canAccept = QuestSystem.getActive().length < QuestConfig.activeMax;
      btns = `<div class="qbtn-row">
        <button class="qbtn qbtn-accept" data-action="accept" data-id="${q.id}" ${canAccept ? '' : 'disabled'}>
          ${canAccept ? '📜 Принять' : `⚠️ Лимит (${QuestConfig.activeMax})`}
        </button>
      </div>`;
    } else if (context === 'active') {
      btns = `<div class="qbtn-row">
        ${isComplete ? `<button class="qbtn qbtn-claim" data-action="claim" data-id="${q.id}">🎁 Получить награду</button>` : ''}
        <button class="qbtn qbtn-abandon" data-action="abandon" data-id="${q.id}">✖ Бросить</button>
      </div>`;
    }

    return `
      <div class="qcard ${meta.cls} ${isActive ? 'active-q' : ''}">
        <div class="qcard-head">
          <div class="qcard-ico">${ico}</div>
          <div class="qcard-meta">
            <div class="qcard-title">${q.title}</div>
            <div class="qcard-desc">${q.desc}</div>
            <div class="qcard-tags">
              <span class="qtag qtag-rarity" style="color:${meta.color};border-color:${meta.color}44;background:${meta.color}11">${meta.label}</span>
              <span class="qtag qtag-rank" style="color:${rank.color};border-color:${rank.color}44">${rankIcon} Ранг ${q.rankRequired}</span>
              <span class="qtag qtag-type">${obj.icon} ${obj.type === 'kill_type' ? obj.target || 'монстр' : obj.type === 'kill_total' ? 'Убийства' : obj.type === 'collect_part' ? obj.monsterName || 'Добыча' : 'Золото'}</span>
            </div>
          </div>
        </div>
        ${progHtml}
        ${rewHtml}
        ${btns}
      </div>`;
  }

  function _renderBoard(el) {
    const board = QuestSystem.getBoard();
    if (!board.length) {
      el.innerHTML = `<div class="quest-empty"><div class="quest-empty-ico">📋</div>Доска пуста.<br>Убивай монстров — появятся новые контракты.</div>`;
      return;
    }
    const count = `<div class="inv-count-hdr">Контракты на доске · ${board.length}/${QuestConfig.boardMax}</div>`;
    el.innerHTML = count + board.map(q => _questCard(q, 'board')).join('');
  }

  function _renderActive(el) {
    const active = QuestSystem.getActive();
    if (!active.length) {
      el.innerHTML = `<div class="quest-empty"><div class="quest-empty-ico">⚡</div>Нет активных квестов.<br>Возьми контракт с доски.</div>`;
      return;
    }
    const count = `<div class="inv-count-hdr">Активные · ${active.length}/${QuestConfig.activeMax}</div>`;
    el.innerHTML = count + active.map(q => _questCard(q, 'active')).join('');
  }

  // ── Состояние вкладок раздела Рецепты ──────────────────────────────────
  let _recipeShopTab = 'weapon'; // 'weapon' | 'armor' | 'accessory'

  /** Рендерит карточку одного рецепта гильдейского магазина */
  function _renderGuildRecipeCard(item, gold) {
    const { recipe, rarity, price, purchased, rankUnlocked, guildRankReq } = item;
    const rl       = RecipeShopSystem._rarityLabel;
    const meta     = rl[rarity] || rl.common;
    const canAfford = gold >= price;

    let btnLabel, btnStyle, btnDis = '';
    if (purchased) {
      btnLabel = '✅ Изучен';
      btnStyle = 'background:rgba(30,80,30,.4);color:#6db86d;border:1px solid #6db86d44;cursor:default;';
      btnDis = 'disabled';
    } else if (!rankUnlocked) {
      btnLabel = `🔒 Ранг ${guildRankReq}`;
      btnStyle = 'background:rgba(40,30,20,.4);color:var(--muted);border:1px solid var(--bord);cursor:not-allowed;';
      btnDis = 'disabled';
    } else if (!canAfford) {
      btnLabel = '💰 Мало золота';
      btnStyle = 'background:rgba(80,20,20,.4);color:#c0392b;border:1px solid #c0392b44;cursor:not-allowed;';
      btnDis = 'disabled';
    } else {
      btnLabel = '📖 Купить';
      const gc = rarity === 'legendary' ? '160,100,10' : rarity === 'epic' ? '100,50,160' : '50,80,160';
      btnStyle = `background:linear-gradient(135deg,rgba(${gc},.5),rgba(${gc},.3));color:${meta.color};border:1px solid ${meta.color}55;cursor:pointer;`;
    }

    const ings = recipe.ingredients
      .filter(ing => ing.count > 0)
      .map(ing => `<span style="font-size:9px;color:var(--muted);background:rgba(0,0,0,.25);border-radius:4px;padding:1px 5px;">${ing.label} ×${ing.count}</span>`)
      .join(' ');

    const rankMeta = { E:'#a0a0a0', D:'#6db86d', C:'#4fa3e0', B:'#b44fe0', A:'#e0a030', S:'#ff3232' };
    const rankColor = rankMeta[guildRankReq] || '#aaa';

    return `
      <div class="shop-item rarity-${rarity}" style="margin:4px 0;padding:10px;border-radius:8px;display:flex;gap:10px;align-items:flex-start;opacity:${rankUnlocked?1:.5};">
        <div style="font-size:26px;line-height:1;flex-shrink:0;">${recipe.ico}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
            <span style="font-size:12px;font-weight:700;color:${meta.color};">${recipe.name}</span>
            <span style="font-size:9px;padding:1px 5px;border-radius:3px;border:1px solid ${rankColor}44;color:${rankColor};background:${rankColor}11;">Ранг ${guildRankReq}</span>
          </div>
          <div style="font-size:10px;color:var(--muted);margin-top:1px;">${recipe.desc || ''}</div>
          <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:5px;">${ings}</div>
          <div style="font-size:10px;color:var(--gold-lt);margin-top:4px;">💰 ${price.toLocaleString()}</div>
        </div>
        <div style="flex-shrink:0;">
          <button data-recipe-buy="${recipe.id}" ${btnDis}
            style="font-family:inherit;font-size:10px;font-weight:700;padding:7px 10px;border-radius:7px;min-height:36px;min-width:80px;transition:opacity .15s;${btnStyle}">
            ${btnLabel}
          </button>
        </div>
      </div>`;
  }

  /**
   * Главный рендер раздела «Рецепты» гильдии.
   * Показывает вкладки: Оружие | Броня | Украшения
   * В каждой — рецепты текущего класса героя, сгруппированные по рангу гильдии.
   */
  function _renderRecipeShop(el) {
    const rankIdx   = typeof GuildSystem !== 'undefined' ? GuildSystem.getRankIdx() : 0;
    const rankKey   = QuestConfig.ranks[rankIdx]?.key || 'E';
    const rankColor = QuestConfig.ranks[rankIdx]?.color || '#aaa';
    const gold      = State.totalWealth;
    const heroClass = State.heroClass;
    const classIco  = heroClass?.ico || '🧙';
    const className = heroClass?.name || 'Герой';

    const { byCategory } = RecipeShopSystem.getGuildShopRecipes();
    const rankOrder = RecipeShopSystem._rankOrder;

    // Метаданные вкладок
    const tabs = [
      { id:'weapon',    label:'Оружие',    ico:'⚔️' },
      { id:'armor',     label:'Броня',     ico:'🛡️' },
      { id:'accessory', label:'Украшения', ico:'💍' },
    ];

    // Строим HTML вкладок-переключателей
    const tabsHtml = tabs.map(t => {
      const active = _recipeShopTab === t.id;
      const cnt = byCategory[t.id]?.length || 0;
      return `<button data-rshop-tab="${t.id}" style="
        flex:1;background:${active?'rgba(201,146,42,.18)':'none'};border:none;
        border-bottom:2px solid ${active?'var(--gold)':'transparent'};
        color:${active?'var(--gold-lt)':'var(--muted)'};
        font-family:inherit;font-size:9px;padding:6px 2px;cursor:pointer;
        display:flex;flex-direction:column;align-items:center;gap:1px;min-height:38px;
        transition:all .15s;letter-spacing:.2px;">
        <span style="font-size:14px;">${t.ico}</span>${t.label}
      </button>`;
    }).join('');

    // Рецепты активной вкладки, сгруппированные по рангу
    const items = byCategory[_recipeShopTab] || [];
    const byRank = {};
    rankOrder.forEach(rk => { byRank[rk] = []; });
    items.forEach(item => { if (byRank[item.guildRankReq]) byRank[item.guildRankReq].push(item); });

    const rankMeta = {
      E:{ label:'Ранг E · Рядовой', color:'#a0a0a0', rarity:'Обычный' },
      D:{ label:'Ранг D · Новобранец', color:'#6db86d', rarity:'Необычный' },
      C:{ label:'Ранг C · Следопыт', color:'#4fa3e0', rarity:'Редкий' },
      B:{ label:'Ранг B · Ветеран', color:'#b44fe0', rarity:'Эпический' },
      A:{ label:'Ранг A · Мастер', color:'#e0a030', rarity:'Легендарный' },
      S:{ label:'Ранг S · Легенда', color:'#ff6666', rarity:'Легендарный' },
    };

    let cardsHtml = '';
    rankOrder.forEach(rk => {
      const rItems = byRank[rk];
      if (!rItems.length) return;
      const rm = rankMeta[rk] || { label:`Ранг ${rk}`, color:'#aaa' };
      const isCurrentRank = rk === rankKey;
      const isLocked = rankOrder.indexOf(rk) > rankOrder.indexOf(rankKey);

      cardsHtml += `
        <div style="padding:8px 14px 2px;display:flex;align-items:center;gap:6px;">
          <div style="font-size:10px;font-weight:700;color:${rm.color};letter-spacing:.8px;text-transform:uppercase;${isLocked?'opacity:.4':''}">
            ${isLocked?'🔒 ':''}${rm.label}
          </div>
          ${isCurrentRank?`<span style="font-size:9px;color:var(--gold);background:rgba(201,146,42,.12);border:1px solid rgba(201,146,42,.3);border-radius:3px;padding:1px 5px;">◀ Текущий</span>`:''}
        </div>
        <div style="padding:0 14px;">
          ${rItems.map(item => _renderGuildRecipeCard(item, gold)).join('')}
        </div>`;
    });

    if (!cardsHtml) {
      cardsHtml = `<div style="padding:24px 14px;text-align:center;color:var(--muted);font-size:12px;">
        Нет рецептов для этой категории
      </div>`;
    }

    const html = `
      <div class="inv-count-hdr" style="display:flex;align-items:center;gap:6px;">
        📖 Рецепты Гильдии
        <span style="margin-left:auto;font-size:10px;color:${rankColor};">Ранг ${rankKey}</span>
        <span style="font-size:10px;color:var(--gold-lt);">💰 ${gold.toLocaleString()}</span>
      </div>
      <div style="padding:4px 14px 6px;font-size:10px;color:var(--muted);line-height:1.4;">
        ${classIco} <b style="color:var(--text);">${className}</b> — эксклюзивные рецепты гильдии. Открываются с ростом ранга.
      </div>
      <div style="display:flex;border:1px solid var(--bord);border-radius:8px;overflow:hidden;margin:0 14px 8px;">
        ${tabsHtml}
      </div>
      ${cardsHtml}`;

    el.innerHTML = html;

    // Bind tab switches — innerHTML resets DOM, so direct binding is safe
    el.querySelectorAll('[data-rshop-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        _recipeShopTab = btn.dataset.rshopTab;
        _renderRecipeShop(el);
      });
    });

    // Bind buy buttons
    el.querySelectorAll('[data-recipe-buy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const recipeId = btn.dataset.recipeBuy;
        const result   = RecipeShopSystem.buyRecipe(recipeId);
        UISystem.showToast(result.ok ? `✅ ${result.msg}` : `❌ ${result.msg}`);
        if (result.ok) _renderRecipeShop(el);
      });
    });
  }

  function _renderNpc(el) {
    const available = NpcSystem.getAvailableNpcs();
    const heroLv = State.hero?.level || 1;
    const allNpcs = NpcConfig.npcs;

    let html = `<div class="inv-count-hdr">НПС Гильдии · ${available.length} доступно</div><div class="npc-grid">`;

    allNpcs.forEach(npc => {
      const unlocked = heroLv >= npc.unlockLv;
      if (!unlocked) {
        html += `<div class="npc-card" style="opacity:.4">
          <div class="npc-head">
            <div class="npc-av">🔒</div>
            <div class="npc-meta">
              <div class="npc-name" style="color:var(--muted)">${npc.name}</div>
              <div class="npc-role">Разблокируется на уровне ${npc.unlockLv}</div>
            </div>
          </div>
        </div>`;
        return;
      }
      const greeting = NpcSystem.getGreeting(npc.id);
      html += `<div class="npc-card ${npc.cssClass}">
        <div class="npc-head">
          <div class="npc-av">${npc.av}</div>
          <div class="npc-meta">
            <div class="npc-name">${npc.name}</div>
            <div class="npc-role">${npc.title}</div>
          </div>
          <div class="npc-status" style="color:${npc.statusColor};border-color:${npc.statusColor}44;background:${npc.statusColor}11">${npc.statusLabel}</div>
        </div>
        <div class="npc-quote">"${greeting}"</div>
        <div class="npc-actions">
          <button class="npc-act-btn btn-npc-talk" data-npc="${npc.id}">💬 Говорить</button>
        </div>
      </div>`;
    });

    html += '</div>';
    el.innerHTML = html;
    el.querySelectorAll('[data-npc]').forEach(btn => {
      btn.addEventListener('click', () => DialogueSystem.open(btn.dataset.npc));
    });
  }

  function _renderMercs(el) {
    const mercs     = MercSystem.getMercs();
    const rankIcons = { E:'🔰', D:'🥉', C:'🥈', B:'🥇', A:'💎', S:'👑' };
    const playerRankIdx = typeof GuildSystem !== 'undefined' ? GuildSystem.getRankIdx() : 0;
    const playerRankKey = QuestConfig.ranks[playerRankIdx]?.key || 'E';

    const hired   = mercs.filter(m => m.hired);
    const refused = mercs.filter(m => m.refused);
    const avail   = mercs.filter(m => !m.hired && !m.refused);

    // ── Рекурсивная отрисовка подчинённых ──
    function renderSubList(subs, depth) {
      if (!subs || !subs.length) return '';
      const indent = depth * 12;
      return subs.map(s => {
        const sIcon = rankIcons[s.rank] || '🔰';
        const subTree = renderSubList(s.subordinates, depth + 1);
        return `<div style="margin-left:${indent}px;padding:4px 8px;background:rgba(0,0,0,.25);border-left:2px solid ${s.color || '#555'}44;border-radius:0 4px 4px 0;margin-bottom:3px;font-size:11px;">
          <span style="color:${s.color || '#a0a0a0'}">${sIcon} ${s.rank}</span>
          <span style="color:var(--text);margin-left:6px;">${s.name}</span>
          <span style="color:var(--muted);margin-left:4px;font-size:10px;">${s.cls} · Ур.${s.lvl}</span>
        </div>${subTree}`;
      }).join('');
    }

    let html = `<div class="inv-count-hdr">Наёмники гильдии · ${mercs.length} чел. · Ваш ранг: <span style="color:${QuestConfig.ranks[playerRankIdx]?.color || '#aaa'}">${playerRankKey}</span></div>`;

    // ── Раздел: Нанятые ──
    if (hired.length) {
      html += `<div style="margin:10px 0 6px;font-size:11px;color:var(--gold-lt);letter-spacing:.5px;">⚔️ Нанятые (${hired.length})</div>
        <div class="npc-grid">`;
      hired.forEach(m => {
        const icon = rankIcons[m.rank] || '🔰';
        const subCount = m.subordinates?.length || 0;
        html += `<div class="npc-card" style="border-color:${m.color}66;">
          <div class="npc-head">
            <div class="npc-av" style="font-size:22px;">${icon}</div>
            <div class="npc-meta">
              <div class="npc-name">${m.name}</div>
              <div class="npc-role">${m.cls} · Ур. ${m.lvl}</div>
            </div>
            <div class="npc-status" style="color:${m.color};border-color:${m.color}44;background:${m.color}11">${m.rank}</div>
          </div>
          <div class="npc-quote" style="color:var(--green);font-size:10px;">✅ В отряде</div>
          ${subCount > 0 ? `<div style="margin-top:6px;font-size:10px;color:var(--muted);">Подчинённые (${subCount}):</div>${renderSubList(m.subordinates, 1)}` : ''}
        </div>`;
      });
      html += '</div>';
    }

    // ── Раздел: Доступные для найма ──
    html += `<div style="margin:10px 0 6px;font-size:11px;color:var(--gold-lt);letter-spacing:.5px;">🏘️ Доступны для найма (${avail.length})</div>
      <div class="npc-grid">`;

    avail.forEach(m => {
      const icon  = rankIcons[m.rank] || '🔰';
      const check = MercSystem.canHire(m.id);
      let btnHtml = '';
      if (!check.ok) {
        let hintTxt = '';
        if (check.reason === 'rank_too_low')       hintTxt = `🔒 Нужен ранг B`;
        else if (check.reason === 'merc_rank_too_high') hintTxt = `🔒 Ранг слишком высок`;
        btnHtml = `<button disabled style="margin-top:6px;width:100%;background:rgba(0,0,0,.3);border:1px solid #333;border-radius:6px;padding:6px;color:var(--muted);font-size:11px;font-family:inherit;min-height:36px;">${hintTxt}</button>`;
      } else {
        const pct = Math.round(check.agreeChance * 100);
        btnHtml = `<button class="merc-hire-btn" data-merc-id="${m.id}" style="margin-top:6px;width:100%;background:linear-gradient(135deg,var(--gold-dk),var(--gold));border:none;border-radius:6px;padding:6px;color:#000;font-size:11px;font-weight:700;font-family:inherit;cursor:pointer;min-height:36px;">⚔️ Нанять (${pct}% согласия)</button>`;
      }
      html += `<div class="npc-card" style="border-color:${m.color}44;">
        <div class="npc-head">
          <div class="npc-av" style="font-size:22px;">${icon}</div>
          <div class="npc-meta">
            <div class="npc-name">${m.name}</div>
            <div class="npc-role">${m.cls} · Ур. ${m.lvl}</div>
          </div>
          <div class="npc-status" style="color:${m.color};border-color:${m.color}44;background:${m.color}11">${m.rank}</div>
        </div>
        <div class="npc-quote" style="font-size:10px;">${m.status}</div>
        ${btnHtml}
      </div>`;
    });
    html += '</div>';

    // ── Раздел: Отказавшиеся (collapsed) ──
    if (refused.length) {
      html += `<div style="margin:10px 0 4px;font-size:11px;color:var(--muted);letter-spacing:.5px;">🚫 Отказались · недоступны (${refused.length})</div>
        <div class="npc-grid">`;
      refused.forEach(m => {
        const icon = rankIcons[m.rank] || '🔰';
        html += `<div class="npc-card" style="border-color:#44444488;opacity:.5;">
          <div class="npc-head">
            <div class="npc-av" style="font-size:22px;filter:grayscale(1);">${icon}</div>
            <div class="npc-meta">
              <div class="npc-name" style="color:var(--muted);">${m.name}</div>
              <div class="npc-role">${m.cls} · Ур. ${m.lvl}</div>
            </div>
            <div class="npc-status" style="color:#555;border-color:#44444444;background:#11111111;">${m.rank}</div>
          </div>
          <div class="npc-quote" style="color:var(--red-lt);font-size:10px;">🚫 Отказался навсегда</div>
        </div>`;
      });
      html += '</div>';
    }

    el.innerHTML = html;

    // Привязка кнопок найма
    el.querySelectorAll('.merc-hire-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mercId = parseInt(btn.dataset.mercId);
        const result = MercSystem.hireMerc(mercId);
        UISystem.showToast(result.msg);
        _renderMercs(el); // перерисовываем только секцию наёмников
      });
    });
  }

  function _renderRaids(el) {
    const raids = RaidSystem.getRaids();
    if (!raids.length) {
      el.innerHTML = `<div class="quest-empty"><div class="quest-empty-ico">🔥</div>Нет рейдов.<br>Убивай монстров — боссы появятся сами.</div>`;
      return;
    }

    // Показываем сначала активные, потом завершённые
    const sorted = [...raids].sort((a, b) => {
      const ord = { open:0, active:1, victory:2, defeat:3 };
      return (ord[a.status] || 0) - (ord[b.status] || 0);
    });

    let html = `<div class="inv-count-hdr">Рейды · ${raids.filter(r=>r.status==='open'||r.status==='active').length} активных</div>`;

    sorted.forEach(raid => {
      const isDone      = raid.status === 'victory' || raid.status === 'defeat';
      const isVictory   = raid.status === 'victory';
      const bossHpPct   = Math.max(0, Math.round(raid.bossHp / raid.bossMaxHp * 100));
      const playerIn    = raid.playerJoined;
      const canJoin     = !isDone && !playerIn;
      // FIX: атака доступна независимо от State.active (не требует конкретного состояния UI)
      const canActInRaid = !isDone && playerIn && raid.bossHp > 0 && !raid._resolving;
      const attackUsed  = raid.playerAttackUsed || false;

      const statusLabel = { open:'Открыт', active:'В бою', victory:'Победа', defeat:'Поражение' }[raid.status] || '?';
      const statusCls   = { open:'raid-badge-open', active:'raid-badge-active', victory:'raid-badge-done', defeat:'raid-badge-done' }[raid.status];
      const cardCls     = playerIn && !isDone ? 'raid-active-player' : isDone ? 'raid-done' : 'raid-open';

      // Участники
      const partyHtml = raid.party.map(m => {
        const dead = !m.alive;
        return `<span class="raid-member is-npc ${dead?'is-dead':''}">${m.cls} ${m.name}</span>`;
      }).join('') + (playerIn ? `<span class="raid-member is-player">🦸 ${State.hero?.name||'Вы'}</span>` : '');

      // Последние 3 строки лога
      const logHtml = raid.log.slice(0, 3).map(l =>
        `<div class="raid-log-item ${l.cls}">${l.msg}</div>`).join('');

      // Кнопки
      let btns = '';
      if (canJoin) {
        btns += `<button class="raid-btn raid-btn-join" data-raid-action="join" data-raid-id="${raid.id}">⚔️ Присоединиться</button>`;
      }
      if (canActInRaid) {
        // FIX: кнопка разовой атаки — disabled после использования
        if (!attackUsed) {
          btns += `<button class="raid-btn raid-btn-attack" data-raid-action="attack" data-raid-id="${raid.id}">💥 Атаковать босса</button>`;
        } else {
          btns += `<button class="raid-btn raid-btn-attack" disabled title="Обычная атака уже использована">✅ Атака использована</button>`;
        }
        // Метательное оружие — всегда доступно (независимо от разовой атаки)
        const throwItems = State.inventory
          .map((it, idx) => ({ it, idx }))
          .filter(({ it }) => it.type === 'throwing' && (it.count || 1) > 0);
        throwItems.forEach(({ it, idx }) => {
          const cnt = it.stackable ? ` ×${it.count || 1}` : '';
          btns += `<button class="raid-btn raid-btn-throw" data-raid-action="throw" data-raid-id="${raid.id}" data-throw-idx="${idx}">${it.ico} ${it.name}${cnt} (${it.raidDmg} урона)</button>`;
        });
      }
      // FIX: кнопка выхода доступна всегда (независимо от статуса рейда)
      if (playerIn) btns += `<button class="raid-btn raid-btn-leave" data-raid-action="leave" data-raid-id="${raid.id}">🚪 Покинуть рейд</button>`;

      const contribPct = raid.totalDmgDealt > 0
        ? Math.round(raid.playerContrib / raid.totalDmgDealt * 100) : 0;

      html += `<div class="raid-card ${cardCls}">
        <div class="raid-head">
          <div class="raid-ico">${raid.bossAv}</div>
          <div class="raid-meta">
            <div class="raid-name">${raid.bossName}</div>
            <div class="raid-sub">${raid.party.length} участников · ${raid.party.filter(p=>p.alive).length} живы${playerIn?` · Ваш вклад: ${contribPct}%`:''}</div>
          </div>
          <div class="raid-badge ${statusCls}">${statusLabel}</div>
        </div>
        <div class="raid-boss-row">
          <div class="raid-boss-av">${raid.bossAv}</div>
          <div class="raid-boss-info">
            <div class="raid-boss-name">${raid.bossName}</div>
            <div class="raid-boss-hp-track"><div class="raid-boss-hp-fill" style="width:${bossHpPct}%"></div></div>
          </div>
          <div style="font-size:10px;color:var(--red-lt);margin-left:6px;flex-shrink:0;">${raid.bossHp}/${raid.bossMaxHp}</div>
        </div>
        <div class="raid-reward-preview">
          <span>Награда:</span>
          <span class="raid-rew-item">✨ до ${raid.reward.xp} XP</span>
          <span class="raid-rew-item">💰 ${raid.reward.gold[0]}–${raid.reward.gold[1]}</span>
          <span class="raid-rew-item" style="color:var(--teal)">GXP ${raid.reward.gxp}</span>
        </div>
        <div class="raid-party">${partyHtml}</div>
        ${logHtml ? `<div style="margin-bottom:8px;">${logHtml}</div>` : ''}
        ${btns ? `<div class="raid-btns">${btns}</div>` : ''}
      </div>`;
    });

    el.innerHTML = html;

    // Привязка кнопок
    el.querySelectorAll('[data-raid-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.raidAction;
        const id     = btn.dataset.raidId;
        if (action === 'join')   RaidSystem.joinRaid(id);
        if (action === 'attack') { RaidSystem.attackBoss(id); }
        if (action === 'throw') {
          const throwIdx = parseInt(btn.dataset.throwIdx);
          RaidSystem.throwWeapon(id, throwIdx);
        }
        if (action === 'leave')  RaidSystem.leaveRaid(id);
        render();
      });
    });
  }

  function _renderRanking(el) {
    const board   = RankingSystem.getLeaderboard();
    const sortBy  = RankingSystem.getSortBy();
    const colors  = RankingSystem.getRankColors();
    const rankIcons = { E:'🔰',D:'🥉',C:'🥈',B:'🥇',A:'💎',S:'👑' };

    const sortLabel = { score:'Очки', gold:'Золото', kills:'Убийства' };
    const topNums   = ['🥇','🥈','🥉'];

    const sortBtns = ['score','gold','kills'].map(k =>
      `<button class="rank-sort-btn ${sortBy===k?'on':''}" data-rsort="${k}">${sortLabel[k]}</button>`
    ).join('');

    let rows = board.map((p, i) => {
      const numDisp   = i < 3 ? topNums[i] : `#${i+1}`;
      const numCls    = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
      const rankColor = colors[p.guildRank] || '#a0a0a0';
      const rankIcon  = rankIcons[p.guildRank] || '🔰';
      const isPlayer  = p.isPlayer;
      const trCls     = isPlayer ? 'rank-player-row' : '';
      const nameCls   = isPlayer ? 'rank-entry-name is-player' : 'rank-entry-name';

      const scoreVal  = sortBy === 'score' ? p.score.toLocaleString()
                      : sortBy === 'gold'  ? `${p.gold.toLocaleString()} 💰`
                      : `${p.kills} ⚔️`;
      const scoreSubArr = [];
      if (sortBy !== 'score')  scoreSubArr.push(`${p.score.toLocaleString()} очков`);
      if (sortBy !== 'kills')  scoreSubArr.push(`${p.kills} убийств`);
      if (p.raids)             scoreSubArr.push(`${p.raids} рейдов`);
      const scoreSub = scoreSubArr.slice(0,2).join(' · ');

      return `<tr class="${trCls}">
        <td><span class="rank-num ${numCls}">${numDisp}</span></td>
        <td>
          <div class="${nameCls}">${isPlayer ? '🦸 ' : ''}${p.name}</div>
          <div class="rank-entry-sub">${p.cls}</div>
        </td>
        <td class="rank-badge-cell"><span style="font-size:12px;color:${rankColor}">${rankIcon} ${p.guildRank}</span></td>
        <td class="rank-score-cell">
          ${scoreVal}<br>
          <span class="rank-score-sub">${scoreSub}</span>
        </td>
      </tr>`;
    }).join('');

    el.innerHTML = `
      <div class="rank-header-row">
        <div style="font-size:11px;color:var(--muted);">Гильдия · ${board.length} участников · живые данные</div>
        <div class="rank-sort-btns">${sortBtns}</div>
      </div>
      <table class="rank-table">
        <thead><tr>
          <th>#</th><th>Игрок</th><th>Ранг</th><th style="text-align:right">${sortLabel[sortBy]}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    el.querySelectorAll('[data-rsort]').forEach(btn => {
      btn.addEventListener('click', () => {
        RankingSystem.setSortBy(btn.dataset.rsort);
        render();
      });
    });
  }

  function _bindActions(el) {
    el.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const id     = btn.dataset.id;
        if (action === 'accept')  QuestSystem.acceptQuest(id);
        if (action === 'claim')   QuestSystem.claimQuest(id);
        if (action === 'abandon') QuestSystem.abandonQuest(id);
      });
    });
  }

  function _renderRankUp(el) {
    if (!el) return;
    const curRank = GuildSystem.getRank();
    const rankIcon = _rankIcons[curRank.key] || '🔰';

    // Full rank overview table
    const ranksHtml = QuestConfig.ranks.map((r, i) => {
      const req  = GuildRankUpSystem.RANK_REQUIREMENTS[r.key];
      const done = GuildSystem.getRankIdx() >= i;
      const cur  = GuildSystem.getRankIdx() === i;
      const ri   = _rankIcons[r.key] || '🔰';
      const partsPreview = req
        ? req.parts.map(p => `${p.ico}×${p.count}`).join(' ')
        : '—';
      return `
        <div style="display:flex;align-items:flex-start;gap:8px;padding:8px;border-radius:8px;margin-bottom:4px;
          background:${cur ? 'rgba(201,146,42,.12)' : 'rgba(0,0,0,.2)'};
          border:1px solid ${cur ? 'rgba(201,146,42,.4)' : 'rgba(255,255,255,.04)'};">
          <span style="font-size:18px;min-width:22px;">${done ? '✅' : ri}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:700;color:${r.color};">${ri} Ранг ${r.key} ${cur ? '← текущий' : ''}</div>
            <div style="font-size:10px;color:var(--muted);">GXP: ${r.xpNeeded}${req ? ` · ${req.bossHint}` : ''}</div>
            ${req ? `<div style="font-size:10px;color:var(--text);margin-top:2px;">${partsPreview}</div>` : ''}
          </div>
        </div>`;
    }).join('');

    el.innerHTML = `
      <div style="padding:4px 0 12px;">
        <div style="font-size:13px;font-weight:700;color:var(--gold-lt);margin-bottom:10px;">
          ${rankIcon} Текущий ранг: <span style="color:${curRank.color}">${curRank.key}</span>
        </div>
        ${GuildRankUpSystem.renderRankUpPanel()}
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;margin-top:4px;">Все ранги</div>
        ${ranksHtml}
      </div>`;

    // Bind button after inject
    GuildRankUpSystem.bindRankUpBtn();
  }

  function render() {
    _bindTabs();
    _renderRankBar();
    const el = document.getElementById('guild-scroll');
    if (!el) return;

    if      (_currentTab === 'board')   { _renderBoard(el);   _bindActions(el); }
    else if (_currentTab === 'active')  { _renderActive(el);  _bindActions(el); }
    else if (_currentTab === 'recipes')  { _renderRecipeShop(el); }
    else if (_currentTab === 'rankup')  { _renderRankUp(el); }
    else if (_currentTab === 'npc')     { _renderNpc(el); }
    else if (_currentTab === 'mercs')   { _renderMercs(el); }
    else if (_currentTab === 'raids')   { _renderRaids(el); }
    else if (_currentTab === 'ranking') { _renderRanking(el); }
  }

  // Подписки
  EventBus.on('guild:updated', () => {
    if (typeof NavSystem !== 'undefined' && NavSystem.current === 'guild') render();
  });
  EventBus.on('gold:changed', () => {
    const goldEl = document.getElementById('guild-gold');
    if (goldEl) goldEl.textContent = State.gold;
  });

  return { render };
})();
