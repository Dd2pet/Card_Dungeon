const QuestSystem = (() => {
  // ── Internal state ──
  let _board    = [];   // up to 10 quests available
  let _active   = [];   // up to 3 accepted quests
  let _history  = [];   // completed / failed (last 20)
  let _blpCounters = {}; // { rarity: killsSinceLastQuestOfThatRarity }

  // Init BLP counters
  Object.keys(QuestConfig.rarityWeights).forEach(r => { _blpCounters[r] = 0; });

  // ── Helpers ──
  function _getRankIdx() {
    return GuildSystem.getRankIdx();
  }

  function _heroLevel() {
    return State.hero?.level || 1;
  }

  function _currentZone() {
    return State.zone?.id || 'forest';
  }

  // Check which rarities are BLP-triggered
  function _blpRarities() {
    const triggered = [];
    for (const [rarity, threshold] of Object.entries(QuestConfig.blpThresholds)) {
      if (_blpCounters[rarity] >= threshold) triggered.push(rarity);
    }
    return triggered;
  }

  // Tick BLP counters after a kill
  function _tickBlp(questRarityGenerated) {
    for (const r of Object.keys(_blpCounters)) {
      _blpCounters[r]++;
    }
    if (questRarityGenerated) {
      _blpCounters[questRarityGenerated] = 0;
    }
  }

  // Prune board to max
  function _pruneBoard() {
    if (_board.length > QuestConfig.boardMax) {
      _board = _board.slice(-QuestConfig.boardMax);
    }
  }

  // ── Try to generate a quest on kill ──
  function _trySpawn() {
    if (_board.length >= QuestConfig.boardMax) return;

    // BLP check — force-generate guaranteed rarities
    const blp = _blpRarities();
    let generated = false;
    for (const rarity of blp) {
      if (_board.length < QuestConfig.boardMax) {
        const q = QuestFactory.generate(_getRankIdx(), _heroLevel(), _currentZone(), rarity);
        _board.push(q);
        _blpCounters[rarity] = 0;
        EventBus.emit('quest:appeared', { quest: q, source: 'blp' });
        UISystem.showToast(`🎲 [BLP] Квест: ${q.title}`);
        generated = true;
      }
    }

    // Normal 15% roll
    if (Math.random() < QuestConfig.spawnChance && _board.length < QuestConfig.boardMax) {
      const q = QuestFactory.generate(_getRankIdx(), _heroLevel(), _currentZone());
      _board.push(q);
      _tickBlp(q.rarity);
      EventBus.emit('quest:appeared', { quest: q, source: 'normal' });
      generated = true;
    } else if (!generated) {
      _tickBlp(null);
    }

    _pruneBoard();
    _refreshUI();
  }

  // ── Update objective progress ──
  function _updateObjectives(payload) {
    let changed = false;
    _active.forEach(q => {
      if (q.status !== 'active') return;
      const obj = q.objective;
      const isKillType  = obj.type === 'kill_type'  && payload.monsterName === obj.target;
      const isKillTotal = obj.type === 'kill_total';
      if (isKillType || isKillTotal) {
        obj.current = Math.min(obj.count, obj.current + 1);
        changed = true;
        EventBus.emit('quest:progress', { quest: q, current: obj.current, total: obj.count });
        if (obj.current >= obj.count) _completeQuest(q.id);
      }
    });
    if (changed) _refreshUI();
  }

  function _updateGoldObjectives(goldAmount) {
    let changed = false;
    _active.forEach(q => {
      if (q.status !== 'active' || q.objective.type !== 'collect_gold') return;
      q.objective.current = Math.min(q.objective.count, q.objective.current + goldAmount);
      changed = true;
      EventBus.emit('quest:progress', { quest: q, current: q.objective.current, total: q.objective.count });
      if (q.objective.current >= q.objective.count) _completeQuest(q.id);
    });
    if (changed) _refreshUI();
  }

  // ── Complete quest (mark ready to claim) ──
  function _completeQuest(id) {
    const q = _active.find(q => q.id === id);
    if (!q) return;
    q.status = 'completed';
    UISystem.showToast(`✅ Квест выполнен: ${q.title}!`);
    UISystem.log(`✅ Квест завершён: ${q.title}`, 'ls');
    EventBus.emit('quest:completed', q);
    _refreshUI();
  }

  // ── Public: accept quest from board ──
  function acceptQuest(id) {
    if (_active.length >= QuestConfig.activeMax) {
      UISystem.showToast(`⚠️ Максимум ${QuestConfig.activeMax} активных квеста!`);
      return false;
    }
    const idx = _board.findIndex(q => q.id === id);
    if (idx === -1) return false;
    const q = _board.splice(idx, 1)[0];
    q.status = 'active';
    q.acceptedAt = Date.now();
    _active.push(q);
    UISystem.showToast(`📜 Принят: ${q.title}`);
    UISystem.log(`📜 Квест принят: ${q.title}`, 'lp');
    EventBus.emit('quest:accepted', q);
    _refreshUI();
    return true;
  }

  // ── Public: claim completed quest reward ──
  function claimQuest(id) {
    const q = _active.find(q => q.id === id && q.status === 'completed');
    if (!q) return false;

    // Grant rewards with pet bonuses
    const questRewardMult = State.totalQuestReward;
    const xpReward   = Math.floor(q.reward.xp   * questRewardMult);
    const goldReward = Math.floor(q.reward.gold  * questRewardMult);
    PlayerSystem.gainXp(xpReward);
    State.addGold(goldReward);
    const gxpMult = NpcSystem.getBuff('gxp_boost')?.mult || 1.0;
    GuildSystem.addGuildXp(Math.floor(q.reward.guildXp * gxpMult));

    UISystem.showToast(`🎁 Награда: +${xpReward}XP +${goldReward}💰`);
    UISystem.log(`🎁 Квест сдан: ${q.title} (+${xpReward}XP +${goldReward}💰)`, 'ls');
    EventBus.emit('quest:claimed', q);

    // Move to history
    q.status = 'claimed';
    q.claimedAt = Date.now();
    _active = _active.filter(qq => qq.id !== id);
    _history.unshift(q);
    if (_history.length > 20) _history = _history.slice(0, 20);

    SaveSystem.autosave();
    _refreshUI();
    return true;
  }

  // ── Public: abandon active quest ──
  function abandonQuest(id) {
    const idx = _active.findIndex(q => q.id === id);
    if (idx === -1) return false;
    const q = _active.splice(idx, 1)[0];
    q.status = 'failed';
    _history.unshift(q);
    if (_history.length > 20) _history = _history.slice(0, 20);
    UISystem.showToast(`❌ Квест брошен: ${q.title}`);
    EventBus.emit('quest:abandoned', q);
    _refreshUI();
    return true;
  }

  function _refreshUI() {
    EventBus.emit('guild:updated');
  }

  // ── Serialization ──
  function toSave() {
    return { board: _board, active: _active, history: _history, blp: _blpCounters };
  }
  function fromSave(d) {
    if (!d) return;
    _board   = d.board   || [];
    _active  = d.active  || [];
    _history = d.history || [];
    _blpCounters = d.blp || {};
    Object.keys(QuestConfig.rarityWeights).forEach(r => {
      if (!(_blpCounters[r] >= 0)) _blpCounters[r] = 0;
    });
  }

  // ── EventBus subscriptions ──
  EventBus.on('kill:recorded', ({ name: monsterName, total }) => {
    _updateObjectives({ monsterName });
    _trySpawn();
  });

  EventBus.on('gold:changed', (newGold) => {
    // gold:changed fires with new total; we need the delta
    // We track via combat:victory which has goldGain
  });
  EventBus.on('combat:victory', ({ gold }) => {
    if (gold > 0) _updateGoldObjectives(gold);
  });
  EventBus.on('combat:victory', ({ drops }) => {
    if (!drops || !drops.length) return;
    let changed = false;
    _active.forEach(q => {
      if (q.status !== 'active' || q.objective.type !== 'collect_part') return;
      const obj = q.objective;
      const matching = drops.filter(d => d.templateId === obj.target || d.id === obj.target);
      if (!matching.length) return;
      const gained = matching.reduce((sum, d) => sum + (d.count || 1), 0);
      obj.current = Math.min(obj.count, obj.current + gained);
      changed = true;
      EventBus.emit('quest:progress', { quest: q, current: obj.current, total: obj.count });
      if (obj.current >= obj.count) _completeQuest(q.id);
    });
    if (changed) _refreshUI();
  });

  EventBus.on('game:newHero', () => {
    _board = []; _active = []; _history = [];
    Object.keys(_blpCounters).forEach(r => { _blpCounters[r] = 0; });
  });

  return {
    getBoard:   () => [..._board],
    getActive:  () => [..._active],
    getHistory: () => [..._history],
    getBlp:     () => ({ ..._blpCounters }),
    acceptQuest, claimQuest, abandonQuest,
    toSave, fromSave,
  };
})();
