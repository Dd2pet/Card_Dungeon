const GatheringConfig = Object.freeze({
  locations: [
    // ── ORE LOCATIONS ──
    {
      id:        'copper_mine',
      type:      'ore',
      name:      'Медная шахта',
      icon:      '⛏️',
      bg:        '#2a1a0a',
      desc:      'Небольшая шахта в предгорьях. Медь легко добыть, но требует точных ударов.',
      minLevel:  1,
      cooldown:  60,
      miniGame:  'reaction_tap',
      resources: [
        { id:'copper_ore',  rarity:'common',   baseChance:0.70, maxCount:4 },
        { id:'silver_ore',  rarity:'uncommon', baseChance:0.30, maxCount:2 },
        { id:'gold_ore',    rarity:'rare',     baseChance:0.08, maxCount:1 },
        { id:'iron_ore',    rarity:'common',   baseChance:0.40, maxCount:3 },
      ],
    },
    {
      id:        'crystal_cavern',
      type:      'ore',
      name:      'Кристальная пещера',
      icon:      '💎',
      bg:        '#0a0a2a',
      desc:      'Глубокая пещера с редкими кристаллами. Нужно поймать правильный момент.',
      minLevel:  10,
      cooldown:  120,
      miniGame:  'moving_zone',
      resources: [
        { id:'silver_ore',  rarity:'uncommon', baseChance:0.60, maxCount:3 },
        { id:'gold_ore',    rarity:'rare',     baseChance:0.35, maxCount:2 },
        { id:'mithril_ore', rarity:'epic',     baseChance:0.12, maxCount:1 },
        { id:'magic_dust',  rarity:'rare',     baseChance:0.20, maxCount:2 },
      ],
    },
    {
      id:        'void_rift',
      type:      'ore',
      name:      'Разлом пустоты',
      icon:      '🌑',
      bg:        '#0d0010',
      desc:      'Опасный разлом в пространстве. Удержи стабильность добычи.',
      minLevel:  25,
      cooldown:  180,
      miniGame:  'stabilize',
      resources: [
        { id:'mithril_ore',  rarity:'epic',     baseChance:0.50, maxCount:2 },
        { id:'adamant_ore',  rarity:'legendary',baseChance:0.18, maxCount:1 },
        { id:'void_ore',     rarity:'mythic',   baseChance:0.04, maxCount:1 },
        { id:'dragon_scale', rarity:'rare',     baseChance:0.25, maxCount:1 },
      ],
    },
    // ── HERB LOCATIONS ──
    {
      id:        'forest_glade',
      type:      'herb',
      name:      'Лесная поляна',
      icon:      '🌿',
      bg:        '#0a1a0a',
      desc:      'Спокойная поляна в лесу. Собирай травы нажимая в правильных точках.',
      minLevel:  1,
      cooldown:  60,
      miniGame:  'find_spot',
      resources: [
        { id:'common_herb', rarity:'common',   baseChance:0.75, maxCount:5 },
        { id:'moonflower',  rarity:'uncommon', baseChance:0.35, maxCount:3 },
        { id:'bloodroot',   rarity:'rare',     baseChance:0.10, maxCount:1 },
      ],
    },
    {
      id:        'moonlit_marsh',
      type:      'herb',
      name:      'Лунное болото',
      icon:      '🌙',
      bg:        '#0a1020',
      desc:      'Мистическое болото под лунным светом. Запомни последовательность.',
      minLevel:  10,
      cooldown:  120,
      miniGame:  'sequence',
      resources: [
        { id:'moonflower',  rarity:'uncommon', baseChance:0.60, maxCount:4 },
        { id:'bloodroot',   rarity:'rare',     baseChance:0.35, maxCount:2 },
        { id:'shadowleaf',  rarity:'epic',     baseChance:0.12, maxCount:1 },
      ],
    },
    {
      id:        'dragon_garden',
      type:      'herb',
      name:      'Сад Дракона',
      icon:      '🌺',
      bg:        '#1a0510',
      desc:      'Легендарный сад у логова дракона. Удержи баланс сбора.',
      minLevel:  25,
      cooldown:  180,
      miniGame:  'balance',
      resources: [
        { id:'shadowleaf',   rarity:'epic',     baseChance:0.45, maxCount:2 },
        { id:'dragonbloom',  rarity:'legendary',baseChance:0.20, maxCount:1 },
        { id:'ethereal_moss',rarity:'mythic',   baseChance:0.04, maxCount:1 },
        { id:'common_herb',  rarity:'common',   baseChance:0.50, maxCount:3 },
      ],
    },
  ],
});

// ── Mini-game engine — 6 unique mechanics ──
const GatheringMiniGames = (() => {

  // ── 1. REACTION TAP — press button exactly when timer hits green zone ──
  function reactionTap(onComplete) {
    let timer = 0, interval = null, dir = 1, speed = 2.2, phase = 'waiting';
    const greenStart = 38, greenEnd = 62;

    function buildUI(box) {
      box.innerHTML = `
        <div style="font-size:22px;margin-bottom:6px;">⛏️ Удар в нужный момент!</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:14px;">Нажми УДАР когда указатель в зелёной зоне</div>
        <div style="position:relative;height:32px;background:rgba(0,0,0,.6);border-radius:16px;overflow:hidden;border:1px solid var(--bord);margin-bottom:16px;" id="rtap-track">
          <div style="position:absolute;left:${greenStart}%;width:${greenEnd-greenStart}%;top:0;bottom:0;background:rgba(39,174,96,.35);"></div>
          <div id="rtap-ind" style="position:absolute;top:4px;bottom:4px;width:16px;background:var(--gold-lt);border-radius:8px;transition:none;left:0%;"></div>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:10px;" id="rtap-hint">Готовься...</div>
        <button id="rtap-btn" style="width:100%;background:linear-gradient(135deg,var(--gold-dk),var(--gold-lt));color:#000;font-weight:700;font-size:16px;border:none;border-radius:10px;padding:14px;cursor:pointer;font-family:inherit;min-height:48px;">⛏️ УДАР!</button>
      `;
      const ind = box.querySelector('#rtap-ind');
      const hint = box.querySelector('#rtap-hint');
      const btn = box.querySelector('#rtap-btn');

      setTimeout(() => {
        phase = 'running';
        hint.textContent = 'Бей!';
        interval = setInterval(() => {
          timer += dir * speed;
          if (timer >= 100) { timer = 100; dir = -1; }
          if (timer <= 0)   { timer = 0;   dir = 1;  }
          ind.style.left = `calc(${timer}% - 8px)`;
        }, 16);
      }, 800);

      btn.addEventListener('click', () => {
        if (phase !== 'running') return;
        clearInterval(interval);
        const inGreen = timer >= greenStart && timer <= greenEnd;
        const perfect = timer >= 46 && timer <= 54;
        const quality = perfect ? 1.0 : inGreen ? 0.65 : 0.2;
        const msg = perfect ? '💥 ИДЕАЛЬНО!' : inGreen ? '✅ Хороший удар!' : '❌ Мимо!';
        hint.textContent = msg;
        hint.style.color = perfect ? 'var(--gold-lt)' : inGreen ? '#4ade80' : 'var(--red-lt)';
        btn.disabled = true;
        setTimeout(() => onComplete(quality), 900);
      });
    }
    return { buildUI };
  }

  // ── 2. MOVING ZONE — tap the button only when moving target is inside the window ──
  function movingZone(onComplete) {
    let pos = 0, velocity = 3.5, phase = 'ready';
    let intervalId = null, attempts = 3, hits = 0;

    function buildUI(box) {
      box.innerHTML = `
        <div style="font-size:22px;margin-bottom:6px;">💎 Выбей кристалл!</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:14px;">Нажми когда шар в синей зоне (3 попытки)</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:8px;">
          <span style="font-size:11px;color:var(--muted)">Попыток:</span>
          <span id="mz-att" style="color:var(--gold-lt);font-weight:700;font-size:13px;">${attempts}</span>
          <span style="font-size:11px;color:var(--muted)">| Попаданий:</span>
          <span id="mz-hits" style="color:#4ade80;font-weight:700;font-size:13px;">${hits}</span>
        </div>
        <div style="position:relative;height:60px;background:rgba(0,0,0,.6);border-radius:10px;overflow:hidden;border:1px solid var(--bord);margin-bottom:14px;">
          <div style="position:absolute;left:40%;width:20%;top:0;bottom:0;background:rgba(79,163,224,.3);"></div>
          <div id="mz-ball" style="position:absolute;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:50%;background:var(--blue);box-shadow:0 0 12px var(--blue);left:0%;transition:none;"></div>
        </div>
        <button id="mz-btn" style="width:100%;background:linear-gradient(135deg,#003070,var(--blue));color:#fff;font-weight:700;font-size:15px;border:none;border-radius:10px;padding:13px;cursor:pointer;font-family:inherit;min-height:48px;">💎 Удар!</button>
        <div id="mz-msg" style="margin-top:10px;font-size:12px;min-height:18px;"></div>
      `;
      const ball = box.querySelector('#mz-ball');
      const btn  = box.querySelector('#mz-btn');
      const attEl= box.querySelector('#mz-att');
      const hitsEl=box.querySelector('#mz-hits');
      const msg  = box.querySelector('#mz-msg');

      intervalId = setInterval(() => {
        pos += velocity;
        if (pos >= 100 - 4) { pos = 100 - 4; velocity = -Math.abs(velocity) * (0.9 + Math.random() * 0.25); }
        if (pos <= 0)        { pos = 0;        velocity =  Math.abs(velocity) * (0.9 + Math.random() * 0.25); }
        ball.style.left = `calc(${pos}% - 14px)`;
      }, 16);

      btn.addEventListener('click', () => {
        if (attempts <= 0) return;
        attempts--;
        attEl.textContent = attempts;
        const inZone = pos >= 40 && pos <= 60;
        if (inZone) {
          hits++;
          hitsEl.textContent = hits;
          msg.textContent = '✅ Попал!';
          msg.style.color = '#4ade80';
        } else {
          msg.textContent = '❌ Мимо!';
          msg.style.color = 'var(--red-lt)';
        }
        if (attempts <= 0) {
          clearInterval(intervalId);
          btn.disabled = true;
          const quality = hits >= 3 ? 1.0 : hits === 2 ? 0.75 : hits === 1 ? 0.45 : 0.1;
          setTimeout(() => onComplete(quality), 800);
        }
      });
    }
    return { buildUI };
  }

  // ── 3. STABILIZE — hold indicator in safe zone using tap-to-adjust ──
  function stabilize(onComplete) {
    let pos = 50, drift = 0, elapsed = 0, totalTime = 4000;
    let stableTime = 0, rafId = null, done = false;
    let last = null;

    function buildUI(box) {
      box.innerHTML = `
        <div style="font-size:22px;margin-bottom:6px;">🌑 Стабилизируй разлом!</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:14px;">Нажимай ◀ ▶ чтобы удержать указатель в зелёной зоне</div>
        <div style="position:relative;height:36px;background:rgba(0,0,0,.6);border-radius:18px;overflow:hidden;border:1px solid var(--bord);margin-bottom:10px;">
          <div style="position:absolute;left:38%;width:24%;top:0;bottom:0;background:rgba(39,174,96,.3);"></div>
          <div id="stab-ind" style="position:absolute;top:4px;bottom:4px;width:18px;background:#c84bff;border-radius:9px;left:50%;box-shadow:0 0 10px #c84bff;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <span id="stab-stable" style="font-size:11px;color:#4ade80;">Стабильно: 0%</span>
          <div id="stab-time-bar" style="flex:1;height:6px;background:rgba(0,0,0,.5);border-radius:3px;overflow:hidden;margin:0 10px;">
            <div id="stab-time-fill" style="height:100%;background:var(--gold-lt);width:100%;transition:width .1s linear;"></div>
          </div>
        </div>
        <div style="display:flex;gap:10px;">
          <button id="stab-left" style="flex:1;background:linear-gradient(135deg,#003070,var(--blue));color:#fff;font-size:22px;border:none;border-radius:10px;padding:14px;cursor:pointer;min-height:52px;">◀</button>
          <button id="stab-right" style="flex:1;background:linear-gradient(135deg,var(--gold-dk),var(--gold-lt));color:#000;font-size:22px;border:none;border-radius:10px;padding:14px;cursor:pointer;min-height:52px;">▶</button>
        </div>
      `;
      const ind  = box.querySelector('#stab-ind');
      const stEl = box.querySelector('#stab-stable');
      const tfill= box.querySelector('#stab-time-fill');
      const lBtn = box.querySelector('#stab-left');
      const rBtn = box.querySelector('#stab-right');

      lBtn.addEventListener('click', () => { if (!done) pos -= 7; });
      rBtn.addEventListener('click', () => { if (!done) pos += 7; });

      function tick(ts) {
        if (!last) last = ts;
        const dt = ts - last; last = ts;
        elapsed += dt;
        drift += (Math.random() - 0.48) * 0.8;
        drift = Math.max(-4, Math.min(4, drift));
        pos += drift * (dt / 100);
        pos = Math.max(0, Math.min(96, pos));
        ind.style.left = `calc(${pos}% - 9px)`;
        const inZone = pos >= 38 && pos <= 62;
        if (inZone) stableTime += dt;
        const stPct = Math.min(100, Math.round(stableTime / (totalTime * 0.6) * 100));
        stEl.textContent = `Стабильно: ${stPct}%`;
        tfill.style.width = `${Math.max(0, 100 - (elapsed/totalTime*100))}%`;
        if (elapsed >= totalTime || done) {
          done = true;
          const quality = Math.min(1.0, stableTime / (totalTime * 0.6));
          setTimeout(() => onComplete(quality), 400);
          return;
        }
        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);
    }
    return { buildUI };
  }

  // ── 4. FIND SPOT — tap the hidden herb before it moves ──
  function findSpot(onComplete) {
    let found = 0, misses = 0, round = 0, maxRounds = 5, done = false;
    let moveTimer = null;

    function buildUI(box) {
      box.innerHTML = `
        <div style="font-size:22px;margin-bottom:6px;">🌿 Найди траву!</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:10px;">Нажми на светящуюся точку до того как она исчезнет</div>
        <div style="display:flex;gap:12px;justify-content:center;margin-bottom:10px;">
          <span style="font-size:11px;color:#4ade80;">✅ <span id="fs-found">0</span></span>
          <span style="font-size:11px;color:var(--red-lt);">❌ <span id="fs-miss">0</span></span>
          <span style="font-size:11px;color:var(--muted);">Раунд: <span id="fs-round">0</span>/${maxRounds}</span>
        </div>
        <div id="fs-arena" style="position:relative;width:100%;height:180px;background:rgba(10,26,10,.9);border:2px solid rgba(39,174,96,.3);border-radius:12px;overflow:hidden;touch-action:none;"></div>
        <div id="fs-msg" style="margin-top:10px;font-size:12px;min-height:16px;text-align:center;color:var(--muted);"></div>
      `;
      const arena   = box.querySelector('#fs-arena');
      const foundEl = box.querySelector('#fs-found');
      const missEl  = box.querySelector('#fs-miss');
      const roundEl = box.querySelector('#fs-round');
      const msgEl   = box.querySelector('#fs-msg');

      function spawnHerb() {
        if (done) return;
        round++;
        roundEl.textContent = round;
        if (round > maxRounds) {
          done = true;
          const quality = found >= 4 ? 1.0 : found === 3 ? 0.75 : found === 2 ? 0.5 : found === 1 ? 0.25 : 0.05;
          setTimeout(() => onComplete(quality), 600);
          return;
        }
        const aW = arena.offsetWidth || 280;
        const aH = arena.offsetHeight || 180;
        const x = 15 + Math.random() * (aW - 60);
        const y = 15 + Math.random() * (aH - 50);
        const dot = document.createElement('button');
        dot.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:40px;height:40px;border-radius:50%;background:radial-gradient(circle,#4ade80,#27ae60);border:2px solid #4ade80;cursor:pointer;animation:pulse-glow 0.6s ease-in-out infinite;font-size:18px;display:flex;align-items:center;justify-content:center;z-index:5;`;
        dot.textContent = '🌿';
        arena.appendChild(dot);
        let clicked = false;
        dot.addEventListener('click', () => {
          if (clicked) return;
          clicked = true; clearTimeout(moveTimer);
          found++; foundEl.textContent = found;
          msgEl.textContent = '✅ Нашёл!'; msgEl.style.color = '#4ade80';
          dot.style.background = 'radial-gradient(circle,#FFD700,#DAA520)';
          setTimeout(() => { dot.remove(); spawnHerb(); }, 400);
        });
        moveTimer = setTimeout(() => {
          if (clicked) return; clicked = true;
          dot.remove(); misses++; missEl.textContent = misses;
          msgEl.textContent = '⌛ Не успел!'; msgEl.style.color = 'var(--red-lt)';
          setTimeout(() => spawnHerb(), 300);
        }, 1200 - round * 80);
      }
      setTimeout(() => spawnHerb(), 600);
    }
    return { buildUI };
  }

  // ── 5. SEQUENCE — memorize and repeat symbol sequence ──
  function sequence(onComplete) {
    const SYMBOLS = ['🌙','💧','🌿','🌸','⭐'];
    let seq = [], playerSeq = [], phase = 'watch', step = 0;
    const seqLen = 4;

    function buildUI(box) {
      box.innerHTML = `
        <div style="font-size:22px;margin-bottom:6px;">🌙 Запомни порядок!</div>
        <div id="seq-info" style="font-size:12px;color:var(--muted);margin-bottom:12px;">Смотри внимательно...</div>
        <div id="seq-display" style="font-size:32px;min-height:48px;margin-bottom:14px;letter-spacing:6px;"></div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px;" id="seq-btns"></div>
        <div id="seq-progress" style="display:flex;gap:4px;justify-content:center;margin-top:6px;"></div>
      `;
      const info    = box.querySelector('#seq-info');
      const display = box.querySelector('#seq-display');
      const btnsEl  = box.querySelector('#seq-btns');
      const progEl  = box.querySelector('#seq-progress');

      // Build sequence
      seq = Array.from({ length: seqLen }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);

      function updateProgress() {
        progEl.innerHTML = seq.map((s,i) => {
          const done  = i < playerSeq.length;
          const cur   = i === playerSeq.length;
          return `<div style="width:24px;height:24px;border-radius:4px;background:${done?'rgba(39,174,96,.5)':cur?'rgba(201,146,42,.3)':'rgba(0,0,0,.4)'};border:1px solid ${done?'#4ade80':cur?'var(--gold)':'var(--bord)'};"></div>`;
        }).join('');
      }

      function buildBtns(enabled) {
        btnsEl.innerHTML = SYMBOLS.map(s =>
          `<button data-sym="${s}" style="font-size:24px;background:rgba(0,0,0,.4);border:2px solid var(--bord);border-radius:8px;padding:10px 4px;cursor:pointer;min-height:50px;${!enabled?'opacity:.4;pointer-events:none':''}">${s}</button>`
        ).join('');
        if (enabled) {
          btnsEl.querySelectorAll('[data-sym]').forEach(btn => {
            btn.addEventListener('click', () => {
              const sym = btn.dataset.sym;
              playerSeq.push(sym);
              updateProgress();
              const idx = playerSeq.length - 1;
              if (sym !== seq[idx]) {
                info.textContent = '❌ Неверно!'; info.style.color = 'var(--red-lt)';
                buildBtns(false);
                setTimeout(() => onComplete(0.15), 800);
                return;
              }
              if (playerSeq.length === seqLen) {
                info.textContent = '✅ Отлично!'; info.style.color = '#4ade80';
                buildBtns(false);
                setTimeout(() => onComplete(1.0), 700);
              }
            });
          });
        }
      }

      // Show sequence
      updateProgress();
      buildBtns(false);
      let i = 0;
      function showNext() {
        if (i >= seqLen) {
          display.textContent = '❓'.repeat(seqLen);
          info.textContent = 'Теперь повтори!';
          info.style.color = 'var(--gold-lt)';
          buildBtns(true);
          return;
        }
        display.textContent = seq.slice(0, i+1).join(' ');
        i++;
        setTimeout(showNext, 700);
      }
      setTimeout(showNext, 500);
    }
    return { buildUI };
  }

  // ── 6. BALANCE — keep two bars equal by tapping left/right ──
  function balance(onComplete) {
    let left = 50, right = 50;
    let elapsed = 0, totalTime = 5000, driftL = 0, driftR = 0;
    let last = null, done = false, inBalanceTime = 0;

    function buildUI(box) {
      box.innerHTML = `
        <div style="font-size:22px;margin-bottom:6px;">🌺 Баланс сбора!</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:12px;">Удерживай оба индикатора в золотой зоне (40-60%)</div>
        <div style="display:flex;gap:12px;margin-bottom:12px;">
          <div style="flex:1;text-align:center;">
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Левый</div>
            <div style="position:relative;height:100px;background:rgba(0,0,0,.5);border-radius:8px;overflow:hidden;border:1px solid var(--bord);">
              <div style="position:absolute;bottom:40%;top:40%;left:0;right:0;background:rgba(201,146,42,.25);"></div>
              <div id="bal-lbar" style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(0deg,var(--red-lt),var(--gold-lt));border-radius:8px 8px 0 0;height:50%;transition:height .1s;"></div>
            </div>
            <button id="bal-lbtn" style="width:100%;margin-top:6px;background:rgba(192,57,43,.7);border:none;border-radius:8px;color:#fff;font-size:18px;padding:10px;cursor:pointer;min-height:44px;">◀</button>
          </div>
          <div style="flex:1;text-align:center;">
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Правый</div>
            <div style="position:relative;height:100px;background:rgba(0,0,0,.5);border-radius:8px;overflow:hidden;border:1px solid var(--bord);">
              <div style="position:absolute;bottom:40%;top:40%;left:0;right:0;background:rgba(201,146,42,.25);"></div>
              <div id="bal-rbar" style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(0deg,var(--blue),#4ade80);border-radius:8px 8px 0 0;height:50%;transition:height .1s;"></div>
            </div>
            <button id="bal-rbtn" style="width:100%;margin-top:6px;background:rgba(41,128,185,.7);border:none;border-radius:8px;color:#fff;font-size:18px;padding:10px;cursor:pointer;min-height:44px;">▶</button>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span id="bal-qual" style="font-size:11px;color:#4ade80;">Баланс: 0%</span>
          <div style="flex:1;height:6px;background:rgba(0,0,0,.5);border-radius:3px;overflow:hidden;margin:0 10px;">
            <div id="bal-timef" style="height:100%;background:var(--gold-lt);width:100%;"></div>
          </div>
        </div>
      `;
      const lBar  = box.querySelector('#bal-lbar');
      const rBar  = box.querySelector('#bal-rbar');
      const lBtn  = box.querySelector('#bal-lbtn');
      const rBtn  = box.querySelector('#bal-rbtn');
      const qualEl= box.querySelector('#bal-qual');
      const timeF = box.querySelector('#bal-timef');

      lBtn.addEventListener('click', () => { if (!done) left = Math.max(0, Math.min(100, left + 12)); });
      rBtn.addEventListener('click', () => { if (!done) right = Math.max(0, Math.min(100, right + 12)); });

      function tick(ts) {
        if (!last) last = ts;
        const dt = ts - last; last = ts;
        elapsed += dt;
        driftL += (Math.random() - 0.55) * 1.2; driftL = Math.max(-5, Math.min(5, driftL));
        driftR += (Math.random() - 0.45) * 1.2; driftR = Math.max(-5, Math.min(5, driftR));
        left  += driftL * (dt / 200); left  = Math.max(0, Math.min(100, left  - 0.8));
        right += driftR * (dt / 200); right = Math.max(0, Math.min(100, right - 0.8));
        lBar.style.height = `${left}%`;
        rBar.style.height = `${right}%`;
        const lOk = left  >= 40 && left  <= 60;
        const rOk = right >= 40 && right <= 60;
        if (lOk && rOk) inBalanceTime += dt;
        const pct = Math.min(100, Math.round(inBalanceTime / (totalTime * 0.55) * 100));
        qualEl.textContent = `Баланс: ${pct}%`;
        timeF.style.width  = `${Math.max(0, 100 - (elapsed / totalTime * 100))}%`;
        if (elapsed >= totalTime || done) {
          done = true;
          const quality = Math.min(1.0, inBalanceTime / (totalTime * 0.55));
          setTimeout(() => onComplete(quality), 400);
          return;
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
    return { buildUI };
  }

  const _games = { reaction_tap: reactionTap, moving_zone: movingZone, stabilize, find_spot: findSpot, sequence, balance };

  function create(type, onComplete) {
    const factory = _games[type];
    if (!factory) return null;
    return factory(onComplete);
  }

  return { create };
})();
const GatheringEngine = (() => {
  function rollResources(locationCfg, quality) {
    const results = [];
    for (const res of locationCfg.resources) {
      const tmpl = GameConfig.itemTemplates[res.id];
      if (!tmpl) continue;
      const rarCfg = GatheringRarityConfig[res.rarity] || GatheringRarityConfig.common;
      // chance scales with quality
      const chance = res.baseChance * (0.4 + quality * 0.6);
      if (Math.random() > chance) continue;
      // count scales with quality
      const maxCnt = Math.max(1, Math.round(res.maxCount * (0.3 + quality * 0.7)));
      const count  = 1 + Math.floor(Math.random() * maxCnt);
      results.push({
        id:        `${res.id}_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
        templateId: res.id,
        name:       tmpl.name,
        ico:        tmpl.ico,
        type:       tmpl.type,
        rarity:     res.rarity,
        stackable:  true,
        maxStack:   tmpl.maxStack || 99,
        count,
        baseValue:  tmpl.baseValue || 5,
        price:      Math.floor((tmpl.baseValue || 5) * (rarCfg.priceMult || 1.0)),
        desc:       `×${count} · ${rarCfg.label} · ${Math.floor((tmpl.baseValue||5) * (rarCfg.priceMult||1.0) * count)}💰`,
        cursed:     false,
        slot:       null,
        effect:     {},
      });
    }
    return results;
  }

  return { rollResources };
})();
const GatheringSystem = (() => {
  // { locationId → { lastGathered: timestamp } }
  let _cooldowns = {};
  let _currentLoc = null;

  function _getRemainingCooldown(loc) {
    const last = _cooldowns[loc.id]?.lastGathered || 0;
    const elapsed = (Date.now() - last) / 1000;
    return Math.max(0, loc.cooldown - elapsed);
  }

  function _rarityColorFor(rarity) {
    return (GatheringRarityConfig[rarity] || GatheringRarityConfig.common).color;
  }

  function renderTab() {
    const goldEl = document.getElementById('gt-gold');
    if (goldEl) goldEl.textContent = State.gold;
    const navEl = document.getElementById('nav-gather');
    if (navEl) NavSystem.build();
    const content = document.getElementById('gather-content');
    if (!content) return;

    const heroLevel = State.hero?.level || 1;
    const oreLocations  = GatheringConfig.locations.filter(l => l.type === 'ore');
    const herbLocations = GatheringConfig.locations.filter(l => l.type === 'herb');

    function sectionHTML(locs, icon, label) {
      return `
        <div class="sec-title" style="margin:10px 0 6px;">${icon} ${label}</div>
        ${locs.map(loc => {
          const locked  = heroLevel < loc.minLevel;
          const cd      = _getRemainingCooldown(loc);
          const onCd    = cd > 0;
          const cdStr   = onCd ? `⏳ ${Math.ceil(cd)}с` : '';
          const btnDisabled = locked || onCd;
          const lockedStr = locked ? `🔒 Ур.${loc.minLevel}` : '';
          // preview resources
          const resPreview = loc.resources.map(r => {
            const rcfg = GatheringRarityConfig[r.rarity] || GatheringRarityConfig.common;
            const tmpl = GameConfig.itemTemplates[r.id];
            return `<span style="font-size:10px;color:${rcfg.color};margin-right:6px;">${tmpl?.ico||'?'} ${tmpl?.name||r.id}</span>`;
          }).join('');
          return `
            <div class="gather-loc-card ${locked ? 'gather-locked' : ''}" style="background:${loc.bg};border:2px solid ${locked?'var(--bord)':'var(--gold-dk)'};border-radius:10px;padding:12px 14px;margin-bottom:8px;opacity:${locked?0.5:1};">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                <span style="font-size:30px;">${loc.icon}</span>
                <div style="flex:1;">
                  <div style="font-size:14px;font-weight:700;color:var(--gold-lt);">${loc.name}</div>
                  <div style="font-size:10px;color:var(--muted);">${loc.desc}</div>
                </div>
              </div>
              <div style="margin-bottom:8px;line-height:1.8;">${resPreview}</div>
              <button data-locid="${loc.id}" class="gather-btn" style="width:100%;background:${btnDisabled?'rgba(0,0,0,.4)':'linear-gradient(135deg,var(--gold-dk),var(--gold-lt))'};color:${btnDisabled?'var(--muted)':'#000'};font-weight:700;font-size:13px;border:none;border-radius:8px;padding:11px;cursor:${btnDisabled?'not-allowed':'pointer'};font-family:inherit;min-height:44px;" ${btnDisabled?'disabled':''}>
                ${lockedStr || cdStr || '⛏️ Добывать'}
              </button>
            </div>
          `;
        }).join('')}
      `;
    }

    content.innerHTML = sectionHTML(oreLocations, '⛏️', 'Добыча руды') + sectionHTML(herbLocations, '🌿', 'Сбор трав');

    content.querySelectorAll('.gather-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => _startGathering(btn.dataset.locid));
    });
  }

  function _startGathering(locId) {
    const loc = GatheringConfig.locations.find(l => l.id === locId);
    if (!loc) return;
    _currentLoc = loc;

    const ov  = document.getElementById('gather-ov');
    const box = document.getElementById('gather-mg-box');
    if (!ov || !box) return;

    box.innerHTML = '';
    ov.classList.remove('hide');

    const game = GatheringMiniGames.create(loc.miniGame, (quality) => {
      _finishGathering(loc, quality);
    });

    if (game) {
      game.buildUI(box);
    } else {
      _finishGathering(loc, 0.5);
    }
  }

  function _finishGathering(loc, quality) {
    const ov  = document.getElementById('gather-ov');
    const box = document.getElementById('gather-mg-box');
    if (!box) return;

    _cooldowns[loc.id] = { lastGathered: Date.now() };

    const items = GatheringEngine.rollResources(loc, quality);
    // Add to inventory
    items.forEach(item => ItemFactory.stackOrAdd(item));

    // Schedule cooldown re-render
    setTimeout(() => renderTab(), loc.cooldown * 1000 + 200);

    // Build result screen
    const qPct  = Math.round(quality * 100);
    const qColor= quality >= 0.8 ? '#FFD700' : quality >= 0.5 ? '#4ade80' : quality >= 0.25 ? 'var(--gold)' : 'var(--red-lt)';
    const qLabel= quality >= 0.8 ? '🌟 Отлично!' : quality >= 0.5 ? '✅ Хорошо' : quality >= 0.25 ? '⚠️ Слабо' : '❌ Провал';

    const itemsHTML = items.length
      ? items.map(it => {
          const rarCfg = GatheringRarityConfig[it.rarity] || GatheringRarityConfig.common;
          return `<div style="display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.35);border:1px solid ${rarCfg.color}44;border-radius:6px;padding:7px 10px;margin-bottom:5px;">
            <span style="font-size:22px;">${it.ico}</span>
            <div style="flex:1;">
              <div style="font-size:12px;font-weight:600;color:${rarCfg.color};">${it.name} ×${it.count}</div>
              <div style="font-size:10px;color:var(--muted);">${rarCfg.label} · ${it.price * it.count}💰</div>
            </div>
          </div>`;
        }).join('')
      : `<div style="font-size:12px;color:var(--muted);padding:10px;">Ничего не найдено...</div>`;

    box.innerHTML = `
      <div style="font-size:20px;margin-bottom:4px;">${loc.icon} ${loc.name}</div>
      <div style="font-size:28px;font-weight:900;color:${qColor};margin-bottom:4px;">${qLabel}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:14px;">Качество: ${qPct}%</div>
      <div style="max-height:220px;overflow-y:auto;">${itemsHTML}</div>
      <div style="font-size:11px;color:var(--muted);margin:10px 0 6px;">Перезарядка: ${loc.cooldown}с</div>
      <button id="gather-close-btn" style="width:100%;background:linear-gradient(135deg,var(--gold-dk),var(--gold-lt));color:#000;font-weight:700;font-size:14px;border:none;border-radius:8px;padding:13px;cursor:pointer;font-family:inherit;min-height:48px;margin-top:4px;">✅ Готово</button>
    `;
    document.getElementById('gather-close-btn')?.addEventListener('click', () => {
      ov.classList.add('hide');
      renderTab();
      SaveSystem.autosave();
    });

    if (items.length > 0) {
      UISystem.showToast(`⛏️ Добыто ${items.length} ресурс(ов)!`);
    }
    EventBus.emit('gathering:complete', { loc, quality, items });
  }

  function toSave()    { return { cooldowns: _cooldowns }; }
  function fromSave(d) { if (d) _cooldowns = d.cooldowns || {}; }

  EventBus.on('game:newHero', () => { _cooldowns = {}; });
  EventBus.on('gold:changed', () => {
    const el = document.getElementById('gt-gold');
    if (el) el.textContent = State.gold;
  });

  return { renderTab, toSave, fromSave };
})();
