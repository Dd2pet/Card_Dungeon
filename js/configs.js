// ═══════════════════════════════════════════════════════════════
// CARD DUNGEON — CONFIGS (восстановленный файл)
// Загружается ПЕРВЫМ, до config.js
// ═══════════════════════════════════════════════════════════════

const ZoneConfig = Object.freeze({
  zones: [
    { id:'forest',    label:'🌲 Лес',          emoji:'🌲', minLv:1,  maxLv:10,  minRank:'E' },
    { id:'swamp',     label:'🌿 Болото',        emoji:'🌿', minLv:11, maxLv:20,  minRank:'E' },
    { id:'catacombs', label:'💀 Катакомбы',     emoji:'💀', minLv:21, maxLv:30,  minRank:'D' },
    { id:'cemetery',  label:'⚰️ Кладбище',      emoji:'⚰️', minLv:31, maxLv:40,  minRank:'D' },
    { id:'desert',    label:'🏜️ Пустыня',       emoji:'🏜️', minLv:41, maxLv:50,  minRank:'C' },
    { id:'lostcity',  label:'🏛️ Забытый город', emoji:'🏛️', minLv:51, maxLv:60,  minRank:'C' },
    { id:'ravine',    label:'⛰️ Ущелье',         emoji:'⛰️', minLv:61, maxLv:70,  minRank:'B' },
    { id:'volcano',   label:'🌋 Вулкан',         emoji:'🌋', minLv:71, maxLv:80,  minRank:'B' },
    { id:'tundra',    label:'❄️ Тундра',         emoji:'❄️', minLv:81, maxLv:90,  minRank:'A' },
    { id:'abyss',     label:'🕳️ Бездна',         emoji:'🕳️', minLv:91, maxLv:100, minRank:'S' },
  ],

  monsters: [
    // ── Лес (lv 1-10) ──
    { name:'Лесной волк',        av:'🐺', zone:'forest',    risk:'easy',   hp:30,  atk:6,  def:2,  spd:5, xp:12,  gold:8,   _xpMult:1, _goldMult:1 },
    { name:'Лесной паук',        av:'🕷️', zone:'forest',    risk:'easy',   hp:25,  atk:7,  def:1,  spd:6, xp:10,  gold:7,   _xpMult:1, _goldMult:1 },
    { name:'Дикий кролик',       av:'🐇', zone:'forest',    risk:'easy',   hp:20,  atk:4,  def:1,  spd:7, xp:8,   gold:5,   _xpMult:1, _goldMult:1 },
    { name:'Гоблин-разведчик',   av:'👺', zone:'forest',    risk:'normal', hp:40,  atk:8,  def:3,  spd:4, xp:15,  gold:12,  _xpMult:1, _goldMult:1 },
    { name:'Дикий кабан',        av:'🐗', zone:'forest',    risk:'normal', hp:50,  atk:9,  def:4,  spd:3, xp:18,  gold:10,  _xpMult:1, _goldMult:1 },
    { name:'Летучая мышь',       av:'🦇', zone:'forest',    risk:'normal', hp:28,  atk:7,  def:2,  spd:8, xp:12,  gold:9,   _xpMult:1, _goldMult:1 },
    { name:'Медведь-шатун',      av:'🐻', zone:'forest',    risk:'hard',   hp:70,  atk:12, def:5,  spd:3, xp:25,  gold:18,  _xpMult:1, _goldMult:1 },
    { name:'Гоблин-воин',        av:'⚔️', zone:'forest',    risk:'hard',   hp:55,  atk:11, def:4,  spd:5, xp:22,  gold:16,  _xpMult:1, _goldMult:1 },
    { name:'Лесной дух',         av:'🌿', zone:'forest',    risk:'hard',   hp:45,  atk:10, def:6,  spd:6, xp:28,  gold:20,  _xpMult:1, _goldMult:1 },
    // ── Болото (lv 11-20) ──
    { name:'Гоблин-охотник',     av:'🏹', zone:'swamp',     risk:'normal', hp:80,  atk:15, def:6,  spd:5, xp:35,  gold:28,  _xpMult:1, _goldMult:1 },
    { name:'Ядовитая жаба',      av:'🐸', zone:'swamp',     risk:'normal', hp:70,  atk:13, def:5,  spd:4, xp:32,  gold:22,  _xpMult:1, _goldMult:1 },
    { name:'Болотная пиявка',    av:'🐛', zone:'swamp',     risk:'normal', hp:65,  atk:14, def:4,  spd:6, xp:30,  gold:20,  _xpMult:1, _goldMult:1 },
    { name:'Болотный тролль',    av:'👹', zone:'swamp',     risk:'hard',   hp:110, atk:18, def:8,  spd:3, xp:45,  gold:35,  _xpMult:1, _goldMult:1 },
    { name:'Пещерный медведь',   av:'🐻', zone:'swamp',     risk:'hard',   hp:120, atk:20, def:9,  spd:3, xp:48,  gold:38,  _xpMult:1, _goldMult:1 },
    { name:'Болотная гидра',     av:'🐉', zone:'swamp',     risk:'death',  hp:150, atk:24, def:10, spd:4, xp:60,  gold:50,  _xpMult:1, _goldMult:1 },
    { name:'Болотный колдун',    av:'🧙', zone:'swamp',     risk:'death',  hp:130, atk:26, def:8,  spd:5, xp:65,  gold:55,  _xpMult:1, _goldMult:1 },
    { name:'Чумной оборотень',   av:'🐺', zone:'swamp',     risk:'death',  hp:140, atk:22, def:9,  spd:6, xp:58,  gold:48,  _xpMult:1, _goldMult:1 },
    { name:'Костяной крокодил',  av:'🐊', zone:'swamp',     risk:'hard',   hp:125, atk:19, def:11, spd:3, xp:50,  gold:40,  _xpMult:1, _goldMult:1 },
    // ── Катакомбы (lv 21-30) ──
    { name:'Скелет',             av:'💀', zone:'catacombs', risk:'normal', hp:140, atk:25, def:12, spd:5, xp:70,  gold:55,  _xpMult:1, _goldMult:1 },
    { name:'Блуждающий призрак', av:'👻', zone:'catacombs', risk:'normal', hp:120, atk:28, def:10, spd:7, xp:75,  gold:60,  _xpMult:1, _goldMult:1 },
    { name:'Орк-воин',           av:'🗡️', zone:'catacombs', risk:'normal', hp:160, atk:27, def:13, spd:4, xp:72,  gold:58,  _xpMult:1, _goldMult:1 },
    { name:'Пещерная мышь',      av:'🐭', zone:'catacombs', risk:'easy',   hp:100, atk:20, def:8,  spd:8, xp:55,  gold:42,  _xpMult:1, _goldMult:1 },
    { name:'Скелет-рыцарь',      av:'🛡️', zone:'catacombs', risk:'hard',   hp:200, atk:32, def:16, spd:4, xp:90,  gold:72,  _xpMult:1, _goldMult:1 },
    { name:'Некромант',          av:'🔮', zone:'catacombs', risk:'hard',   hp:175, atk:35, def:12, spd:5, xp:95,  gold:78,  _xpMult:1, _goldMult:1 },
    { name:'Орк-берсерк',        av:'💢', zone:'catacombs', risk:'hard',   hp:190, atk:38, def:10, spd:5, xp:92,  gold:74,  _xpMult:1, _goldMult:1 },
    { name:'Скелет-маг',         av:'🦴', zone:'catacombs', risk:'death',  hp:160, atk:40, def:10, spd:6, xp:100, gold:82,  _xpMult:1, _goldMult:1 },
    { name:'Пещерный тролль',    av:'👹', zone:'catacombs', risk:'death',  hp:240, atk:40, def:18, spd:3, xp:110, gold:90,  _xpMult:1, _goldMult:1 },
    // ── Кладбище (lv 31-40) ──
    { name:'Зомби',              av:'🧟', zone:'cemetery',  risk:'normal', hp:220, atk:38, def:15, spd:3, xp:100, gold:80,  _xpMult:1, _goldMult:1 },
    { name:'Призрак',            av:'👻', zone:'cemetery',  risk:'normal', hp:190, atk:42, def:12, spd:7, xp:108, gold:88,  _xpMult:1, _goldMult:1 },
    { name:'Костяной страж',     av:'💀', zone:'cemetery',  risk:'normal', hp:240, atk:40, def:18, spd:4, xp:105, gold:85,  _xpMult:1, _goldMult:1 },
    { name:'Вампир',             av:'🧛', zone:'cemetery',  risk:'hard',   hp:280, atk:48, def:16, spd:6, xp:130, gold:105, _xpMult:1, _goldMult:1 },
    { name:'Проклятый паладин',  av:'⚜️', zone:'cemetery',  risk:'hard',   hp:300, atk:45, def:20, spd:4, xp:135, gold:110, _xpMult:1, _goldMult:1 },
    { name:'Призрак-воин',       av:'🌫️', zone:'cemetery',  risk:'hard',   hp:260, atk:50, def:14, spd:7, xp:125, gold:100, _xpMult:1, _goldMult:1 },
    { name:'Лорд вампиров',      av:'🦇', zone:'cemetery',  risk:'death',  hp:360, atk:55, def:22, spd:5, xp:160, gold:135, _xpMult:1, _goldMult:1 },
    { name:'Повелитель зомби',   av:'🧟', zone:'cemetery',  risk:'death',  hp:350, atk:52, def:20, spd:4, xp:155, gold:128, _xpMult:1, _goldMult:1 },
    { name:'Теневой лич',        av:'💀', zone:'cemetery',  risk:'death',  hp:330, atk:58, def:18, spd:5, xp:165, gold:138, _xpMult:1, _goldMult:1 },
    // ── Пустыня (lv 41-50) ──
    { name:'Пустынный скорпион', av:'🦂', zone:'desert',    risk:'normal', hp:340, atk:55, def:22, spd:5, xp:155, gold:128, _xpMult:1, _goldMult:1 },
    { name:'Анкский стражник',   av:'⚡', zone:'desert',    risk:'normal', hp:320, atk:52, def:24, spd:4, xp:150, gold:122, _xpMult:1, _goldMult:1 },
    { name:'Мумия',              av:'🧟', zone:'desert',    risk:'normal', hp:360, atk:52, def:24, spd:3, xp:160, gold:132, _xpMult:1, _goldMult:1 },
    { name:'Пустынная гарпия',   av:'🦅', zone:'desert',    risk:'hard',   hp:320, atk:58, def:18, spd:8, xp:165, gold:136, _xpMult:1, _goldMult:1 },
    { name:'Песчаный джинн',     av:'🌪️', zone:'desert',    risk:'hard',   hp:400, atk:70, def:22, spd:7, xp:200, gold:168, _xpMult:1, _goldMult:1 },
    { name:'Великий скорпион',   av:'🦂', zone:'desert',    risk:'hard',   hp:420, atk:65, def:28, spd:5, xp:195, gold:160, _xpMult:1, _goldMult:1 },
    { name:'Проклятый фараон',   av:'👑', zone:'desert',    risk:'death',  hp:500, atk:80, def:30, spd:4, xp:240, gold:200, _xpMult:1, _goldMult:1 },
    { name:'Повелитель джиннов', av:'🌪️', zone:'desert',    risk:'death',  hp:480, atk:78, def:28, spd:6, xp:230, gold:192, _xpMult:1, _goldMult:1 },
    // ── Забытый город (lv 51-60) ──
    { name:'Городской страж',    av:'⚔️', zone:'lostcity',  risk:'normal', hp:480, atk:75, def:30, spd:5, xp:230, gold:192, _xpMult:1, _goldMult:1 },
    { name:'Механический голем', av:'🤖', zone:'lostcity',  risk:'normal', hp:520, atk:72, def:35, spd:3, xp:240, gold:200, _xpMult:1, _goldMult:1 },
    { name:'Магический конструкт',av:'🔮',zone:'lostcity',  risk:'normal', hp:500, atk:74, def:32, spd:4, xp:235, gold:196, _xpMult:1, _goldMult:1 },
    { name:'Теневой рыцарь',     av:'🌑', zone:'lostcity',  risk:'hard',   hp:580, atk:85, def:32, spd:6, xp:270, gold:225, _xpMult:1, _goldMult:1 },
    { name:'Проклятый маг',      av:'🔮', zone:'lostcity',  risk:'hard',   hp:550, atk:90, def:28, spd:5, xp:280, gold:235, _xpMult:1, _goldMult:1 },
    { name:'Призрак воина',      av:'👻', zone:'lostcity',  risk:'hard',   hp:540, atk:88, def:30, spd:6, xp:275, gold:230, _xpMult:1, _goldMult:1 },
    { name:'Хаосный оборотень',  av:'🐺', zone:'lostcity',  risk:'death',  hp:660, atk:98, def:34, spd:7, xp:315, gold:265, _xpMult:1, _goldMult:1 },
    { name:'Архидемон',          av:'👿', zone:'lostcity',  risk:'death',  hp:670, atk:102,def:36, spd:5, xp:320, gold:270, _xpMult:1, _goldMult:1 },
    { name:'Тёмный властелин',   av:'🌑', zone:'lostcity',  risk:'death',  hp:680, atk:100,def:35, spd:5, xp:320, gold:270, _xpMult:1, _goldMult:1 },
    // ── Ущелье (lv 61-70) ──
    { name:'Теневой ассасин',    av:'🗡️', zone:'ravine',    risk:'hard',   hp:650, atk:105,def:35, spd:8, xp:340, gold:285, _xpMult:1, _goldMult:1 },
    { name:'Горный тролль',      av:'🏔️', zone:'ravine',    risk:'hard',   hp:750, atk:100,def:42, spd:3, xp:355, gold:298, _xpMult:1, _goldMult:1 },
    { name:'Каменный голем',     av:'🪨', zone:'ravine',    risk:'death',  hp:880, atk:115,def:50, spd:2, xp:410, gold:345, _xpMult:1, _goldMult:1 },
    { name:'Огненный элементаль',av:'🔥', zone:'ravine',    risk:'death',  hp:860, atk:118,def:44, spd:5, xp:405, gold:340, _xpMult:1, _goldMult:1 },
    { name:'Хаотический элем.',  av:'🌀', zone:'ravine',    risk:'extreme',hp:1000,atk:130,def:45, spd:6, xp:480, gold:405, _xpMult:1, _goldMult:1 },
    // ── Вулкан (lv 71-80) ──
    { name:'Лавовый монстр',     av:'🌋', zone:'volcano',   risk:'hard',   hp:950, atk:118,def:48, spd:4, xp:440, gold:370, _xpMult:1, _goldMult:1 },
    { name:'Пепельный дракон',   av:'🐲', zone:'volcano',   risk:'death',  hp:1100,atk:135,def:52, spd:5, xp:510, gold:430, _xpMult:1, _goldMult:1 },
    { name:'Демон бездны',       av:'👿', zone:'volcano',   risk:'extreme',hp:1300,atk:155,def:55, spd:6, xp:600, gold:508, _xpMult:1, _goldMult:1 },
    // ── Тундра (lv 81-90) ──
    { name:'Ледяной голем',      av:'🧊', zone:'tundra',    risk:'hard',   hp:1200,atk:140,def:60, spd:3, xp:560, gold:472, _xpMult:1, _goldMult:1 },
    { name:'Арктический вампир', av:'🧛', zone:'tundra',    risk:'hard',   hp:1150,atk:145,def:55, spd:6, xp:570, gold:482, _xpMult:1, _goldMult:1 },
    { name:'Морозный дракон',    av:'❄️', zone:'tundra',    risk:'death',  hp:1400,atk:160,def:65, spd:5, xp:650, gold:550, _xpMult:1, _goldMult:1 },
    { name:'Древний лич',        av:'💀', zone:'tundra',    risk:'extreme',hp:1600,atk:180,def:60, spd:5, xp:740, gold:628, _xpMult:1, _goldMult:1 },
    { name:'Небесный дракон',    av:'🐉', zone:'tundra',    risk:'extreme',hp:1700,atk:185,def:62, spd:5, xp:780, gold:662, _xpMult:1, _goldMult:1 },
    { name:'Перворождённый хаос',av:'🌀', zone:'tundra',    risk:'extreme',hp:1750,atk:190,def:65, spd:5, xp:800, gold:682, _xpMult:1, _goldMult:1 },
    // ── Бездна (lv 91-100) ──
    { name:'Бездонный левиафан', av:'🌊', zone:'abyss',     risk:'hard',   hp:1800,atk:185,def:75, spd:4, xp:840, gold:712, _xpMult:1, _goldMult:1 },
    { name:'Теневой демон',      av:'👹', zone:'abyss',     risk:'death',  hp:2000,atk:200,def:80, spd:6, xp:940, gold:800, _xpMult:1, _goldMult:1 },
    { name:'Страж бездны',       av:'⚫', zone:'abyss',     risk:'death',  hp:2100,atk:195,def:85, spd:5, xp:960, gold:818, _xpMult:1, _goldMult:1 },
    { name:'Абиссальный ужас',   av:'🕳️', zone:'abyss',     risk:'extreme',hp:2500,atk:220,def:90, spd:5, xp:1100,gold:940, _xpMult:1, _goldMult:1 },
    { name:'Бог уничтожения',    av:'☠️', zone:'abyss',     risk:'extreme',hp:2700,atk:235,def:92, spd:5, xp:1200,gold:1020,_xpMult:1, _goldMult:1 },
    { name:'Тёмная сингулярность',av:'🌑',zone:'abyss',     risk:'extreme',hp:2800,atk:240,def:95, spd:5, xp:1250,gold:1068,_xpMult:1, _goldMult:1 },
    { name:'Повелитель тьмы',    av:'👑', zone:'abyss',     risk:'extreme',hp:3000,atk:250,def:100,spd:5, xp:1350,gold:1150,_xpMult:1, _goldMult:1 },
  ],

  zoneBosses: {
    forest:    [{ name:'Король гоблинов',  av:'👑', hp:200,  atk:18,  def:8,   spd:4, xp:80,   gold:60,   isBoss:true, _xpMult:2, _goldMult:2 }],
    swamp:     [{ name:'Болотный король',  av:'🐊', hp:400,  atk:32,  def:14,  spd:4, xp:160,  gold:130,  isBoss:true, _xpMult:2, _goldMult:2 }],
    catacombs: [{ name:'Лич-архимаг',     av:'💀', hp:700,  atk:48,  def:20,  spd:5, xp:280,  gold:230,  isBoss:true, _xpMult:2, _goldMult:2 }],
    cemetery:  [{ name:'Граф Дракула',    av:'🧛', hp:1000, atk:62,  def:26,  spd:6, xp:400,  gold:330,  isBoss:true, _xpMult:2, _goldMult:2 }],
    desert:    [{ name:'Фараон',          av:'👑', hp:1400, atk:78,  def:34,  spd:4, xp:560,  gold:465,  isBoss:true, _xpMult:2, _goldMult:2 }],
    lostcity:  [{ name:'Голем-хранитель', av:'🤖', hp:1900, atk:95,  def:44,  spd:3, xp:760,  gold:635,  isBoss:true, _xpMult:2, _goldMult:2 }],
    ravine:    [{ name:'Теневой дракон',  av:'🐉', hp:2500, atk:120, def:55,  spd:5, xp:1000, gold:840,  isBoss:true, _xpMult:2, _goldMult:2 }],
    volcano:   [{ name:'Огненный бог',    av:'🔥', hp:3200, atk:145, def:65,  spd:5, xp:1280, gold:1080, isBoss:true, _xpMult:2, _goldMult:2 }],
    tundra:    [{ name:'Ледяной титан',   av:'🧊', hp:4000, atk:170, def:80,  spd:4, xp:1600, gold:1360, isBoss:true, _xpMult:2, _goldMult:2 }],
    abyss:     [{ name:'Владыка Бездны',  av:'🌑', hp:5000, atk:220, def:100, spd:5, xp:2000, gold:1720, isBoss:true, _xpMult:2, _goldMult:2 }],
  },
});

// ── MONSTER RARITY CONFIG ────────────────────────────────────────
const MonsterRarityConfig = Object.freeze({
  rarities: {
    common:    { label:'Обычный',     color:'#a0a0a0', weight:55, statMult:1.0,  xpMult:1.0,  goldMult:1.0,  petChance:0.04 },
    uncommon:  { label:'Необычный',   color:'#6db86d', weight:25, statMult:1.25, xpMult:1.3,  goldMult:1.25, petChance:0.07 },
    rare:      { label:'Редкий',      color:'#4fa3e0', weight:12, statMult:1.6,  xpMult:1.7,  goldMult:1.6,  petChance:0.12 },
    epic:      { label:'Эпический',   color:'#b44fe0', weight:5,  statMult:2.2,  xpMult:2.4,  goldMult:2.2,  petChance:0.18 },
    legendary: { label:'Легендарный', color:'#e0a030', weight:2,  statMult:3.2,  xpMult:3.5,  goldMult:3.2,  petChance:0.28 },
    mythic:    { label:'Мифический',  color:'#ff4040', weight:1,  statMult:5.0,  xpMult:5.5,  goldMult:5.0,  petChance:0.40 },
  },
  mutationChance: 0.12,
  mutations: [
    { label:'Берсерк',  mult:1.30, effect:'atk'    },
    { label:'Бронь',    mult:1.20, effect:'def'    },
    { label:'Быстрый',  mult:1.10, effect:'spd'    },
    { label:'Живучий',  mult:1.25, effect:'hp'     },
    { label:'Ядовитый', mult:1.15, effect:'poison' },
    { label:'Горящий',  mult:1.20, effect:'burn'   },
    { label:'Ледяной',  mult:1.15, effect:'freeze' },
  ],
});

// ── ITEM CONFIG ──────────────────────────────────────────────────
const ItemConfig = Object.freeze({
  rarities: {
    common:    { label:'Обычный',    color:'#a0a0a0', weight:50, statMult:1.0,  priceMult:1.0  },
    uncommon:  { label:'Необычный',  color:'#6db86d', weight:25, statMult:1.4,  priceMult:1.5  },
    rare:      { label:'Редкий',     color:'#4fa3e0', weight:13, statMult:2.0,  priceMult:2.5  },
    epic:      { label:'Эпический',  color:'#b44fe0', weight:7,  statMult:3.0,  priceMult:4.5  },
    legendary: { label:'Легендарный',color:'#e0a030', weight:4,  statMult:4.5,  priceMult:8.0  },
    mythic:    { label:'Мифический', color:'#ff4040', weight:1,  statMult:7.0,  priceMult:15.0 },
  },

  itemTemplates: {
    short_sword:    { name:'Короткий меч',      ico:'🗡️',  type:'weapon',       slot:'weapon',   baseAtk:8,  baseDef:0,  baseCrit:0.02,                baseValue:50  },
    long_sword:     { name:'Длинный меч',        ico:'⚔️',  type:'weapon',       slot:'weapon',   baseAtk:14, baseDef:0,  baseCrit:0.01,                baseValue:90  },
    great_sword:    { name:'Двуручный меч',      ico:'🔱',  type:'weapon',       slot:'weapon',   baseAtk:22, baseDef:0,  baseCrit:0.00,                baseValue:140 },
    dagger:         { name:'Кинжал',             ico:'🔪',  type:'weapon',       slot:'weapon',   baseAtk:6,  baseDef:0,  baseCrit:0.06,                baseValue:40  },
    mace:           { name:'Булава',             ico:'🔨',  type:'weapon',       slot:'weapon',   baseAtk:12, baseDef:2,  baseCrit:0.00,                baseValue:80  },
    staff:          { name:'Посох',              ico:'🪄',  type:'weapon',       slot:'weapon',   baseAtk:10, baseDef:0,  baseCrit:0.04,                baseValue:75  },
    bow:            { name:'Лук',                ico:'🏹',  type:'weapon',       slot:'weapon',   baseAtk:11, baseDef:0,  baseCrit:0.05,                baseValue:85  },
    axe:            { name:'Топор',              ico:'🪓',  type:'weapon',       slot:'weapon',   baseAtk:16, baseDef:0,  baseCrit:0.02,                baseValue:110 },
    spear:          { name:'Копьё',              ico:'🗡️',  type:'weapon',       slot:'weapon',   baseAtk:13, baseDef:1,  baseCrit:0.03,                baseValue:95  },
    wand:           { name:'Жезл',               ico:'✨',  type:'weapon',       slot:'weapon',   baseAtk:9,  baseDef:0,  baseCrit:0.08,                baseValue:70  },
    leather_armor:  { name:'Кожаная броня',       ico:'🥋',  type:'armor',        slot:'armor',    baseAtk:0,  baseDef:8,  baseHp:20,                    baseValue:55  },
    chain_mail:     { name:'Кольчуга',            ico:'🛡️',  type:'armor',        slot:'armor',    baseAtk:0,  baseDef:14, baseHp:10,                    baseValue:100 },
    plate_armor:    { name:'Латы',                ico:'🛡️',  type:'armor',        slot:'armor',    baseAtk:0,  baseDef:22, baseHp:0,                     baseValue:160 },
    robe:           { name:'Мантия',              ico:'👘',  type:'armor',        slot:'armor',    baseAtk:2,  baseDef:5,  baseMp:20,                    baseValue:60  },
    iron_ring:      { name:'Железное кольцо',     ico:'💍',  type:'accessory',    slot:'ring',     baseAtk:3,  baseDef:2,  baseCrit:0.01,                baseValue:40  },
    ruby_ring:      { name:'Рубиновое кольцо',    ico:'💍',  type:'accessory',    slot:'ring',     baseAtk:5,  baseDef:0,  baseCrit:0.04,                baseValue:80  },
    sapphire_ring:  { name:'Сапфировое кольцо',   ico:'💍',  type:'accessory',    slot:'ring',     baseAtk:0,  baseDef:3,  baseMp:15,                    baseValue:75  },
    bone_amulet:    { name:'Костяной амулет',      ico:'📿',  type:'accessory',    slot:'amulet',   baseAtk:2,  baseDef:2,  baseCrit:0.02,                baseValue:45  },
    gold_amulet:    { name:'Золотой амулет',       ico:'📿',  type:'accessory',    slot:'amulet',   baseAtk:4,  baseDef:4,  baseCrit:0.02,                baseValue:95  },
    iron_bracelet:  { name:'Железный браслет',     ico:'⛓️',  type:'accessory',    slot:'bracelet', baseAtk:2,  baseDef:3,  baseHp:10,                    baseValue:38  },
    health_potion:  { name:'Зелье здоровья',       ico:'🧪',  type:'potion',       slot:null,       stackable:true,  maxStack:10, baseValue:15  },
    mana_potion:    { name:'Зелье маны',           ico:'💧',  type:'potion',       slot:null,       stackable:true,  maxStack:10, baseValue:12  },
    elixir:         { name:'Эликсир жизни',        ico:'⚗️',  type:'potion',       slot:null,       stackable:true,  maxStack:5,  baseValue:50  },
    antidote:       { name:'Противоядие',          ico:'🍶',  type:'potion',       slot:null,       stackable:true,  maxStack:10, baseValue:18  },
    xp_potion:      { name:'Зелье познания',       ico:'✨',  type:'potion',       slot:null,       stackable:true,  maxStack:5,  baseValue:80  },
    iron_ore:       { name:'Железная руда',         ico:'⛏️',  type:'material',     slot:null,       stackable:true,  maxStack:99, baseValue:5   },
    crystal:        { name:'Кристалл',             ico:'💎',  type:'material',     slot:null,       stackable:true,  maxStack:99, baseValue:12  },
    dragon_scale:   { name:'Чешуя дракона',         ico:'🐉',  type:'material',     slot:null,       stackable:true,  maxStack:50, baseValue:30  },
    shadow_dust:    { name:'Теневая пыль',          ico:'🌑',  type:'material',     slot:null,       stackable:true,  maxStack:99, baseValue:8   },
    wolf_fang:      { name:'Клык волка',            ico:'🐺',  type:'monster_part', slot:null,       stackable:true,  maxStack:99, baseValue:6   },
    goblin_ear:     { name:'Ухо гоблина',           ico:'👺',  type:'monster_part', slot:null,       stackable:true,  maxStack:99, baseValue:5   },
    spider_silk:    { name:'Паучий шёлк',           ico:'🕷️',  type:'monster_part', slot:null,       stackable:true,  maxStack:99, baseValue:9   },
    bat_wing:       { name:'Крыло летучей мыши',    ico:'🦇',  type:'monster_part', slot:null,       stackable:true,  maxStack:99, baseValue:7   },
    bone:           { name:'Кость',                 ico:'🦴',  type:'monster_part', slot:null,       stackable:true,  maxStack:99, baseValue:4   },
    dragon_heart:   { name:'Сердце дракона',         ico:'❤️',  type:'monster_part', slot:null,       stackable:true,  maxStack:20, baseValue:45  },
    herb_mint:      { name:'Мята',                  ico:'🌿',  type:'herb',         slot:null,       stackable:true,  maxStack:99, baseValue:4   },
    herb_root:      { name:'Корень',                ico:'🌱',  type:'herb',         slot:null,       stackable:true,  maxStack:99, baseValue:6   },
    herb_mushroom:  { name:'Гриб',                  ico:'🍄',  type:'herb',         slot:null,       stackable:true,  maxStack:99, baseValue:8   },
    herb_flower:    { name:'Цветок',                ico:'🌸',  type:'herb',         slot:null,       stackable:true,  maxStack:99, baseValue:10  },
  },

  cursedItems: [
    { id:'cursed_sword',  name:'Проклятый меч',   ico:'⚔️', type:'weapon',    slot:'weapon',   effect:{atk:25},        curseLabel:'Жажда крови', cursedEffect:'hp_drain',  desc:'Сильное оружие, но пьёт твою кровь.' },
    { id:'cursed_armor',  name:'Проклятые латы',  ico:'🛡️', type:'armor',     slot:'armor',    effect:{def:20},        curseLabel:'Проклятие',   cursedEffect:'no_heal',   desc:'Защищает, но нельзя лечиться.' },
    { id:'cursed_ring',   name:'Кольцо жертвы',   ico:'💍', type:'accessory', slot:'ring',     effect:{atk:15,crit:0.08},curseLabel:'Жертва',    cursedEffect:'hp_cost',   desc:'Каждый удар стоит HP.' },
    { id:'cursed_amulet', name:'Амулет безумия',  ico:'📿', type:'accessory', slot:'amulet',   effect:{atk:20,def:10}, curseLabel:'Безумие',     cursedEffect:'random',    desc:'Непредсказуемые эффекты.' },
  ],

  shopCatalog: ['short_sword','long_sword','dagger','staff','bow','leather_armor','chain_mail','robe','iron_ring','bone_amulet','iron_bracelet'],

  shopItems: [
    { templateId:'health_potion', price:20,  stock:10 },
    { templateId:'mana_potion',   price:18,  stock:10 },
    { templateId:'elixir',        price:75,  stock:5  },
    { templateId:'antidote',      price:25,  stock:8  },
    { templateId:'xp_potion',     price:120, stock:3  },
    { templateId:'iron_ore',      price:8,   stock:20 },
    { templateId:'crystal',       price:20,  stock:10 },
  ],

  lootTable: {
    forest:    ['wolf_fang','goblin_ear','spider_silk','bat_wing','herb_mint','herb_root'],
    swamp:     ['goblin_ear','spider_silk','bone','herb_mushroom','herb_root','crystal'],
    catacombs: ['bone','iron_ore','crystal','shadow_dust'],
    cemetery:  ['bone','shadow_dust','crystal','dragon_scale'],
    desert:    ['crystal','iron_ore','dragon_scale','dragon_heart'],
    lostcity:  ['crystal','dragon_scale','shadow_dust','dragon_heart'],
    ravine:    ['dragon_scale','dragon_heart','shadow_dust','crystal'],
    volcano:   ['dragon_heart','dragon_scale','shadow_dust'],
    tundra:    ['dragon_heart','crystal','dragon_scale'],
    abyss:     ['dragon_heart','shadow_dust','dragon_scale'],
  },
});

// ── CLASS CONFIG ─────────────────────────────────────────────────
const ClassConfig = Object.freeze({
  classes: {
    warrior: { label:'Воин',    ico:'⚔️', desc:'Высокий урон, накапливает ярость',   hp:120, mp:40,  atk:15, def:8,  spd:4, crit:0.05, skillMp:15, skillLabel:'Щит.удар'       },
    mage:    { label:'Маг',     ico:'🔮', desc:'Магические атаки, смена стихий',    hp:80,  mp:100, atk:12, def:4,  spd:5, crit:0.08, skillMp:20, skillLabel:'Огн.шар'         },
    rogue:   { label:'Ассасин', ico:'🗡️', desc:'Высокий крит, метка и двойной удар',hp:90,  mp:60,  atk:13, def:5,  spd:8, crit:0.15, skillMp:18, skillLabel:'Из тени'         },
    paladin: { label:'Паладин', ico:'⚜️', desc:'Исцеление, обет и защита',          hp:110, mp:80,  atk:11, def:10, spd:4, crit:0.04, skillMp:22, skillLabel:'Священный удар'  },
    ranger:  { label:'Стрелок', ico:'🏹', desc:'Дальний бой, дистанция и прицел',   hp:95,  mp:55,  atk:14, def:5,  spd:7, crit:0.12, skillMp:16, skillLabel:'Прицел'          },
    shaman:  { label:'Шаман',   ico:'🌿', desc:'Яды, исцеление, тотемы',            hp:85,  mp:90,  atk:10, def:6,  spd:5, crit:0.07, skillMp:20, skillLabel:'Тотем'           },
  },

  statuses: {
    burn:    { label:'🔥 Горение',     duration:3, icon:'🔥', color:'#e74c3c', damagePerTurn:true  },
    poison:  { label:'☠️ Яд',          duration:4, icon:'☠️', color:'#2ecc71', damagePerTurn:true  },
    bleed:   { label:'🩸 Кровотечение', duration:3, icon:'🩸', color:'#c0392b', damagePerTurn:true  },
    stun:    { label:'⚡ Оглушение',   duration:1, icon:'⚡', color:'#f1c40f', skipTurn:true       },
    slow:    { label:'❄️ Замедление',  duration:2, icon:'❄️', color:'#3498db', spdPenalty:true     },
    freeze:  { label:'🧊 Заморозка',   duration:2, icon:'🧊', color:'#85c1e9', skipTurn:true       },
    fear:    { label:'💜 Страх',       duration:2, icon:'💜', color:'#9b59b6', atkPenalty:true     },
    regen:   { label:'💚 Регенерация', duration:3, icon:'💚', color:'#27ae60', healPerTurn:true    },
    shield:  { label:'🛡️ Щит',         duration:2, icon:'🛡️', color:'#5d6d7e', defBonus:true       },
  },
});

// ── PET CONFIG ───────────────────────────────────────────────────
const PetConfig = Object.freeze({
  maxPets:          6,
  captureAttempts:  3,
  escapeChance:     0.25,
  satBonus:         0.4,

  foods: [
    { id:'wolf_fang',    name:'Клык волка',       ico:'🐺', saturation:15, compatZones:['forest','swamp']      },
    { id:'goblin_ear',   name:'Ухо гоблина',      ico:'👺', saturation:12, compatZones:['forest','catacombs']  },
    { id:'spider_silk',  name:'Паучий шёлк',      ico:'🕷️', saturation:18, compatZones:['forest','catacombs']  },
    { id:'bat_wing',     name:'Крыло мыши',       ico:'🦇', saturation:14, compatZones:['cemetery','catacombs']},
    { id:'bone',         name:'Кость',            ico:'🦴', saturation:10, compatZones:null                    },
    { id:'dragon_scale', name:'Чешуя дракона',    ico:'🐉', saturation:40, compatZones:['volcano','ravine']    },
    { id:'dragon_heart', name:'Сердце дракона',   ico:'❤️', saturation:60, compatZones:null                    },
    { id:'herb_mint',    name:'Мята',             ico:'🌿', saturation:8,  compatZones:null                    },
    { id:'herb_mushroom',name:'Гриб',             ico:'🍄', saturation:12, compatZones:['swamp','catacombs']   },
    { id:'crystal',      name:'Кристалл',         ico:'💎', saturation:25, compatZones:null                    },
  ],

  petBonuses: ['bonus_atk','bonus_def','bonus_hp','bonus_crit','bonus_gold','bonus_xp','bonus_drop','resist_poison','resist_stun'],
});

// ── QUEST CONFIG ─────────────────────────────────────────────────
const QuestConfig = Object.freeze({
  boardMax:    10,
  activeMax:   3,
  spawnChance: 0.15,

  rarityWeights: { common:50, uncommon:28, rare:14, epic:6, legendary:2 },

  rarityMinRank: { common:0, uncommon:0, rare:1, epic:2, legendary:3 },

  blpThresholds: { common:20, uncommon:35, rare:60, epic:100, legendary:160 },

  ranks: [
    { key:'E', label:'Ранг E', color:'#a0a0a0', gxpNeeded:0     },
    { key:'D', label:'Ранг D', color:'#6db86d', gxpNeeded:500   },
    { key:'C', label:'Ранг C', color:'#4fa3e0', gxpNeeded:2000  },
    { key:'B', label:'Ранг B', color:'#b44fe0', gxpNeeded:6000  },
    { key:'A', label:'Ранг A', color:'#e0a030', gxpNeeded:15000 },
    { key:'S', label:'Ранг S', color:'#ff4444', gxpNeeded:40000 },
  ],

  rarityMeta: {
    common:    { label:'Обычное',     color:'#a0a0a0', gxp:10  },
    uncommon:  { label:'Необычное',   color:'#6db86d', gxp:25  },
    rare:      { label:'Редкое',      color:'#4fa3e0', gxp:60  },
    epic:      { label:'Эпическое',   color:'#b44fe0', gxp:150 },
    legendary: { label:'Легендарное', color:'#e0a030', gxp:400 },
  },

  rewardBase: {
    common:    { gold:[20,50],    xp:40,   itemChance:0.10 },
    uncommon:  { gold:[60,130],   xp:100,  itemChance:0.20 },
    rare:      { gold:[150,300],  xp:240,  itemChance:0.35 },
    epic:      { gold:[350,700],  xp:560,  itemChance:0.55 },
    legendary: { gold:[800,1600], xp:1300, itemChance:0.80 },
  },

  objectiveTemplates: [
    { type:'kill_total',   icon:'⚔️' },
    { type:'kill_type',    icon:'🎯' },
    { type:'collect_gold', icon:'💰' },
    { type:'collect_part', icon:'📦' },
  ],
});

// ── SUBCLASS CONFIG ──────────────────────────────────────────────
const SubclassConfig = Object.freeze({
  warrior: [
    { id:'berserker', ico:'🔥', name:'Берсерк',    desc:'Удваивает ярость, +30% урон при HP < 50%', bonus:{atk:8} },
    { id:'guardian',  ico:'🛡️', name:'Страж',       desc:'+25% DEF, контратака каждые 2 хода',       bonus:{def:12} },
    { id:'warlord',   ico:'⚔️', name:'Военачальник',desc:'Аура +ATK для всей группы, AoE удары',     bonus:{atk:5, def:5} },
  ],
  mage: [
    { id:'pyromancer',  ico:'🔥', name:'Пиромант',   desc:'Все атаки наносят горение, +40% огн.урон', bonus:{atk:10} },
    { id:'cryomancer',  ico:'❄️', name:'Криомант',    desc:'Заморозка на 2 хода, -30% урон врагам',   bonus:{def:8} },
    { id:'archmage',    ico:'🌌', name:'Архимаг',     desc:'Тройная смена стихий, перегрузка = бонус', bonus:{atk:8, mp:30} },
  ],
  rogue: [
    { id:'assassin',  ico:'🗡️', name:'Убийца',    desc:'Гарант.крит при метке, яд после удара',  bonus:{crit:0.05} },
    { id:'shadowdancer',ico:'🌑',name:'Теневой',   desc:'Невидимость 1 ход, уклонение +20%',     bonus:{spd:2} },
    { id:'trickster', ico:'🃏', name:'Трикстер',   desc:'Двойной дроп предметов, обкрадывает',   bonus:{atk:5, spd:1} },
  ],
  paladin: [
    { id:'crusader',  ico:'✝️', name:'Крестоносец', desc:'+50% урон нежити, урон→лечение',        bonus:{atk:8} },
    { id:'healer',    ico:'💚', name:'Целитель',    desc:'Лечение +60%, щит в начале боя',         bonus:{hp:30} },
    { id:'templar',   ico:'⚜️', name:'Тамплиер',   desc:'Обет восстанавливается быстрее, +DEF',  bonus:{def:10} },
  ],
  ranger: [
    { id:'sniper',    ico:'🎯', name:'Снайпер',   desc:'Прицел даёт +100% урон, игнор.50% DEF', bonus:{crit:0.04} },
    { id:'trapper',   ico:'🪤', name:'Охотник',   desc:'Ловушки замедляют врагов, +дроп частей', bonus:{atk:6} },
    { id:'beastmaster',ico:'🐺',name:'Зверолов',  desc:'+30% урон зверям, питомцы атакуют',     bonus:{atk:4, spd:1} },
  ],
  shaman: [
    { id:'witch_doctor',ico:'☠️',name:'Знахарь',   desc:'Яды накапливаются до 3 стаков, +30%',  bonus:{atk:7} },
    { id:'spiritcaller',ico:'👻',name:'Духовник',  desc:'Призывает духов-помощников на 3 хода',  bonus:{hp:20, mp:20} },
    { id:'elementalist',ico:'🌊',name:'Элементал.',desc:'Тотемы всех стихий, AoE эффекты',      bonus:{atk:5, def:5} },
  ],
});

// ── SPECIALIZATION CONFIG ────────────────────────────────────────
const SpecializationConfig = Object.freeze({
  // Warrior subclasses
  berserker: [
    { id:'bloodlust',  ico:'🩸', name:'Жажда крови', desc:'Убийство восстанавливает 20% HP',         bonus:{atk:12, hp:20} },
    { id:'rampage',    ico:'💢', name:'Бешенство',   desc:'Каждый 3-й удар — двойной урон',           bonus:{atk:15} },
  ],
  guardian: [
    { id:'fortress',   ico:'🏰', name:'Крепость',    desc:'Непробиваемый щит раз в 5 ходов',          bonus:{def:18, hp:40} },
    { id:'protector',  ico:'🛡️', name:'Защитник',    desc:'Принимает 30% урона на себя от союзников', bonus:{def:15, hp:30} },
  ],
  warlord: [
    { id:'conqueror',  ico:'👑', name:'Завоеватель', desc:'+5% ATK за каждое убийство (до 50%)',      bonus:{atk:10} },
    { id:'commander',  ico:'🎖️', name:'Командир',    desc:'Наёмники получают +25% к ATK и DEF',       bonus:{atk:8, def:8} },
  ],
  // Mage subclasses
  pyromancer: [
    { id:'inferno',    ico:'🌋', name:'Инферно',     desc:'Горение наносит 3× урон и распространяется',bonus:{atk:14} },
    { id:'phoenix',    ico:'🦅', name:'Феникс',      desc:'Возрождение с 30% HP раз в бой',            bonus:{hp:50, atk:8} },
  ],
  cryomancer: [
    { id:'absolute_zero',ico:'🧊',name:'Абс.ноль',  desc:'Заморозка даёт 100% крит по цели',          bonus:{crit:0.06, atk:8} },
    { id:'blizzard',   ico:'❄️', name:'Метель',      desc:'Все враги замедлены с 1-го хода',           bonus:{atk:10, def:6} },
  ],
  archmage: [
    { id:'arcane_surge',ico:'⚡',name:'Аркан.всплеск',desc:'MP → ATK конвертация при перегрузке',     bonus:{atk:12, mp:40} },
    { id:'spellweaver', ico:'🌌',name:'Чаровник',    desc:'Навык не тратит MP при 3+ стаках',          bonus:{mp:50, atk:6} },
  ],
  // Rogue subclasses
  assassin: [
    { id:'deathmark',  ico:'💀', name:'Метка смерти',desc:'Метка = мгновенное убийство при HP < 20%', bonus:{crit:0.08, atk:10} },
    { id:'poisonmaster',ico:'☠️',name:'Мастер ядов', desc:'Яд стакается до 5 раз, каждый стак +5%',   bonus:{atk:8} },
  ],
  shadowdancer: [
    { id:'phase_shift',ico:'🌑', name:'Фазовый сдвиг',desc:'20% шанс полного уклонения от удара',    bonus:{spd:3, crit:0.04} },
    { id:'shadowstep', ico:'👣', name:'Теневой шаг',  desc:'Телепортация за врага, гарант.удар',      bonus:{spd:2, atk:8} },
  ],
  trickster: [
    { id:'pickpocket', ico:'💰', name:'Карманник',   desc:'+50% золото с каждого врага',              bonus:{atk:6, spd:2} },
    { id:'mimic',      ico:'🎭', name:'Мимик',        desc:'Копирует последнее умение врага',          bonus:{atk:8, crit:0.03} },
  ],
  // Paladin subclasses
  crusader: [
    { id:'holy_wrath', ico:'☀️', name:'Святой гнев', desc:'Урон нежити ×3, исцеление при убийстве',  bonus:{atk:12} },
    { id:'inquisitor', ico:'🔥', name:'Инквизитор',  desc:'Горение от святых атак, +25% урон боссам', bonus:{atk:10, crit:0.03} },
  ],
  healer: [
    { id:'divine_shield',ico:'💛',name:'Дивный щит', desc:'Щит на 40% maxHP раз в 4 хода',           bonus:{hp:50, def:10} },
    { id:'rejuvenation', ico:'🌿',name:'Обновление', desc:'Регенерация 5% HP каждый ход',             bonus:{hp:40, mp:20} },
  ],
  templar: [
    { id:'zealot',     ico:'⚡', name:'Фанатик',     desc:'Обет не расходуется при атаке, +ATK',      bonus:{atk:10, def:8} },
    { id:'paladin_lord',ico:'👑',name:'Лорд-паладин',desc:'Все союзники восстанавливают HP после боя', bonus:{def:12, hp:30} },
  ],
  // Ranger subclasses
  sniper: [
    { id:'headshot',   ico:'🎯', name:'В голову',    desc:'10% шанс нокаута с одного выстрела',       bonus:{crit:0.06, atk:10} },
    { id:'eagle_eye',  ico:'🦅', name:'Орлиный глаз',desc:'Прицел накапливается пассивно каждый ход', bonus:{crit:0.05, atk:8} },
  ],
  trapper: [
    { id:'net_trap',   ico:'🕸️', name:'Сеть',         desc:'Ловушка замедляет на 3 хода, AoE',       bonus:{atk:8, def:6} },
    { id:'poisoned_trap',ico:'☠️',name:'Яд.ловушка',  desc:'Ловушки наносят яд + замедление',         bonus:{atk:10} },
  ],
  beastmaster: [
    { id:'alpha',      ico:'🐺', name:'Альфа',        desc:'Питомцы атакуют каждый ход, +50% урон',  bonus:{atk:8, spd:1} },
    { id:'pack_leader',ico:'🦁', name:'Вожак стаи',   desc:'До 2 питомцев атакуют одновременно',     bonus:{atk:6, hp:30} },
  ],
  // Shaman subclasses
  witch_doctor: [
    { id:'plague',     ico:'🦠', name:'Чума',         desc:'Яд распространяется на соседних врагов',  bonus:{atk:10} },
    { id:'voodoo',     ico:'🪆', name:'Вуду',          desc:'25% шанс отразить урон на атакующего',   bonus:{def:8, atk:8} },
  ],
  spiritcaller: [
    { id:'ancestor',   ico:'👴', name:'Предок',        desc:'Дух-предок лечит 10% HP каждые 2 хода', bonus:{hp:40, mp:20} },
    { id:'specter',    ico:'👻', name:'Призрак',       desc:'Дух атакует вместе с тобой каждый ход',  bonus:{atk:10} },
  ],
  elementalist: [
    { id:'storm',      ico:'⛈️', name:'Буря',           desc:'Все тотемы активны одновременно, AoE',  bonus:{atk:10, mp:30} },
    { id:'earth_shaker',ico:'🌍',name:'Землетряс.',    desc:'Каждый 4-й ход — AoE удар по всем',      bonus:{atk:8, def:8} },
  ],
});
