const RankingSystem = (() => {
  const _rankColors = { E:'#a0a0a0',D:'#6db86d',C:'#4fa3e0',B:'#b44fe0',A:'#e0a030',S:'#ff4444' };

  let _sortBy = 'score';  // 'score' | 'gold' | 'kills'
  let _playerRaidWins = 0;

  function recordRaidVictory() {
    _playerRaidWins++;
  }

  // Собираем текущую запись игрока
  function _playerEntry() {
    return {
      id:        'player',
      name:      State.hero?.name || 'Герой',
      cls:       GameConfig.classes[State.heroClassKey]
                   ? `${GameConfig.classes[State.heroClassKey].ico} ${GameConfig.classes[State.heroClassKey].label}`
                   : '⚔️ Воин',
      guildRank: GuildSystem.getRank()?.key || 'E',
      score:     State.score      || 0,
      gold:      (State.gold || 0) + (State.bankGold || 0),   // карман + хранилище
      kills:     State.totalKills || 0,
      raids:     _playerRaidWins,
      isPlayer:  true,
    };
  }

  // Сортировка и нормализация — берём живых наёмников из MercSystem
  function getLeaderboard() {
    const player = _playerEntry();
    const mercs  = MercSystem.getMercs().map(m => ({
      id:        `merc_${m.id}`,
      name:      m.name,
      cls:       m.cls,
      guildRank: m.rank,
      score:     m.score  || 0,
      gold:      m.gold   || 0,
      kills:     m.kills  || 0,
      raids:     m.raids  || 0,
    }));
    const all = [ ...mercs, player ];

    all.forEach(p => {
      p._sortScore = _sortBy === 'score' ? p.score
                   : _sortBy === 'gold'  ? p.gold
                   : p.kills;
    });

    all.sort((a, b) => b._sortScore - a._sortScore);
    return all;
  }

  function setSortBy(key) {
    if (['score','gold','kills'].includes(key)) _sortBy = key;
  }

  function getSortBy() { return _sortBy; }
  function getRankColors() { return _rankColors; }

  function toSave()    { return { raidWins: _playerRaidWins, sortBy: _sortBy }; }
  function fromSave(d) {
    if (!d) return;
    _playerRaidWins = d.raidWins || 0;
    _sortBy         = d.sortBy   || 'score';
  }

  EventBus.on('game:newHero', () => { _playerRaidWins = 0; });

  return { getLeaderboard, setSortBy, getSortBy, getRankColors, recordRaidVictory, toSave, fromSave };
})();
