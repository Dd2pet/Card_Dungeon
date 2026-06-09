const RaritySystem = (() => {
  const LADDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const LABELS  = { common:'Обычный', uncommon:'Необычный', rare:'Редкий', epic:'Эпический', legendary:'Легендарный' };
  const COLORS  = { common:'#a0a0a0', uncommon:'#6db86d', rare:'#4fa3e0', epic:'#b44fe0', legendary:'#e0a030' };

  function indexOf(rarity) { return LADDER.indexOf(rarity); }
  function isValid(rarity)  { return LADDER.includes(rarity); }
  function oneLevelAbove(rarity) {
    const idx = indexOf(rarity);
    if (idx < 0) return 'uncommon';
    return LADDER[Math.min(idx + 1, LADDER.length - 1)];
  }
  function label(rarity) { return LABELS[rarity] || rarity; }
  function color(rarity) { return COLORS[rarity] || '#888'; }

  return { LADDER, indexOf, isValid, oneLevelAbove, label, color };
})();
