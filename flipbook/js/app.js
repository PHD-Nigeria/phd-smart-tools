(function(){
  "use strict";

  const DATA   = PHD_BOOK;
  const TOTAL  = DATA.totalPages;
  const imgSrc = (n, thumb) => `assets/${thumb ? "thumbs" : "pages"}/page-${String(n).padStart(2,"0")}.webp`;

  const $ = (sel, ctx) => (ctx||document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx||document).querySelectorAll(sel));

  // Some hosting contexts (sandboxed preview iframes, privacy modes, file://
  // in a few browsers) throw the moment localStorage is touched. None of
  // this app's storage use is essential to core reading/flipping, so every
  // access degrades to a no-op instead of taking the whole script down.
  const safeStorage = {
    get(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } },
    set(key, val){ try{ localStorage.setItem(key, val); }catch(e){ /* ignore */ } },
  };

  const els = {
    loader: $("#loader"),
    book: $("#book"),
    leaf: $("#leaf"),
    frontImg: $("#frontImg"),
    backImg: $("#backImg"),
    leftImg: $("#leftImg"),
    zonePrev: $("#zonePrev"),
    zoneNext: $("#zoneNext"),
    rightSlot: $("#rightSlot"),
    leftSlot: $("#leftSlot"),
    cornerHintRight: $("#cornerHintRight"),
    cornerHintLeft: $("#cornerHintLeft"),
    fill: $("#fillBar"),
    pageCount: $("#pageCount"),
    sectionChip: $("#sectionChip"),
    filmstrip: $("#filmstrip"),
    btnPrev: $("#btnPrev"),
    btnNext: $("#btnNext"),
    btnToc: $("#btnToc"),
    btnSearch: $("#btnSearchToggle"),
    btnSound: $("#btnSound"),
    btnAuto: $("#btnAuto"),
    btnFullscreen: $("#btnFullscreen"),
    btnSettings: $("#btnSettings"),
    btnShare: $("#btnShare"),
    settingsPop: $("#settingsPop"),
    themeSelect: $("#themeSelect"),
    motionSwitch: $("#motionSwitch"),
    autoSpeed: $("#autoSpeed"),
    searchWrap: $("#searchWrap"),
    searchInput: $("#searchInput"),
    searchResults: $("#searchResults"),
    drawer: $("#drawer"),
    drawerBackdrop: $("#drawerBackdrop"),
    drawerBody: $("#drawerBody"),
    btnDrawerClose: $("#btnDrawerClose"),
    toast: $("#toast"),
    toastMsg: $("#toastMsg"),
  };

  const state = {
    index: 0,            // 0-based index of the page currently on the RIGHT / active leaf front
    isSingle: window.matchMedia("(max-width:900px)").matches,
    dragging: false,
    dragDir: null,
    soundOn: JSON.parse(safeStorage.get("sb-sound") ?? "true"),
    autoplay: false,
    autoTimer: null,
    autoInterval: parseInt(safeStorage.get("sb-autospeed") || "5000", 10),
    reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    hasInteracted: false,
  };

  /* ---------------------------------------------------------------------
     Rendering
  --------------------------------------------------------------------- */
  function setLeafInstant(frontN, backN, rotY){
    els.leaf.style.transition = "none";
    els.frontImg.src = frontN ? imgSrc(frontN) : "";
    els.backImg.src  = backN  ? imgSrc(backN)  : "";
    els.leaf.style.transform = `rotateY(${rotY}deg)`;
    // force reflow so the next transitioned change animates
    void els.leaf.offsetHeight;
    els.leaf.style.transition = "";
  }

  function render(jump){
    const n = state.index + 1; // 1-based current page
    const nextN = n + 1 <= TOTAL ? n + 1 : null;
    const prevN = n - 1 >= 1 ? n - 1 : null;

    if (jump){
      setLeafInstant(n, nextN, 0);
    }
    els.leftImg.src = prevN ? imgSrc(prevN) : "";
    els.leftImg.style.visibility = prevN ? "visible" : "hidden";

    const meta = DATA.pages[state.index];
    els.pageCount.innerHTML = `<span class="cur">${n}</span><span class="sep">/</span>${TOTAL}`;
    els.sectionChip.textContent = meta.section;
    els.fill.style.width = `${(n / TOTAL) * 100}%`;

    updateFilmstripActive();
    updateTocActive();
    try{ history.replaceState(null, "", `#p=${n}`); }catch(e){ /* opaque-origin / sandboxed contexts disallow this — non-critical */ }
    safeStorage.set("sb-last-page", String(n));
  }

  function buildFilmstrip(){
    els.filmstrip.innerHTML = "";
    DATA.pages.forEach(p => {
      const d = document.createElement("div");
      d.className = "film-thumb";
      d.dataset.page = p.n;
      d.title = `${p.n}. ${p.title}`;
      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = imgSrc(p.n, true);
      img.alt = p.title;
      d.appendChild(img);
      d.addEventListener("click", () => jumpTo(p.n));
      els.filmstrip.appendChild(d);
    });
  }
  function updateFilmstripActive(){
    const n = state.index + 1;
    $$(".film-thumb", els.filmstrip).forEach(t => {
      const active = parseInt(t.dataset.page,10) === n;
      t.classList.toggle("active", active);
      if (active && typeof t.scrollIntoView === "function") t.scrollIntoView({ behavior:"smooth", inline:"center", block:"nearest" });
    });
  }

  function buildToc(){
    els.drawerBody.innerHTML = "";
    let lastSection = null;
    DATA.pages.forEach(p => {
      if (p.section !== lastSection){
        const label = document.createElement("div");
        label.className = "toc-section-label";
        label.textContent = p.section;
        els.drawerBody.appendChild(label);
        lastSection = p.section;
      }
      const item = document.createElement("div");
      item.className = "toc-item";
      item.dataset.page = p.n;
      item.innerHTML = `<img loading="lazy" src="${imgSrc(p.n,true)}" alt=""><div><div class="t">${p.title}</div><div class="p">Page ${p.n}</div></div>`;
      item.addEventListener("click", () => { jumpTo(p.n); closeDrawer(); });
      els.drawerBody.appendChild(item);
    });
  }
  function updateTocActive(){
    const n = state.index + 1;
    $$(".toc-item", els.drawerBody).forEach(it => it.classList.toggle("active", parseInt(it.dataset.page,10) === n));
  }

  /* ---------------------------------------------------------------------
     Flip mechanics
  --------------------------------------------------------------------- */
  function playFlipSound(){
    if (!state.soundOn) return;
    try{
      const ctx = playFlipSound._ctx || (playFlipSound._ctx = new (window.AudioContext||window.webkitAudioContext)());
      const dur = 0.28;
      const bufferSize = ctx.sampleRate * dur;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i=0;i<bufferSize;i++){
        data[i] = (Math.random()*2-1) * (1 - i/bufferSize);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1800, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      noise.start(); noise.stop(ctx.currentTime + dur);
    }catch(e){ /* audio not available, fail silent */ }
  }

  let animating = false;

  function flipNext(){
    if (animating) return;
    if (state.index + 1 >= TOTAL){ bounceLimit(); return; }
    state.hasInteracted = true;
    animating = true;
    const n = state.index + 1;
    setLeafInstant(n, n+1 <= TOTAL ? n+1 : null, 0);
    els.leaf.classList.add("turning");
    requestAnimationFrame(() => {
      els.leaf.style.transform = "rotateY(-180deg)";
    });
    playFlipSound();
    const onEnd = () => {
      els.leaf.removeEventListener("transitionend", onEnd);
      els.leaf.classList.remove("turning");
      state.index++;
      render(true);
      animating = false;
    };
    els.leaf.addEventListener("transitionend", onEnd);
  }

  function flipPrev(){
    if (animating) return;
    if (state.index <= 0){ bounceLimit(); return; }
    state.hasInteracted = true;
    animating = true;
    const n = state.index + 1; // currently showing
    const prevN = n - 1;
    // pre-load: front=prev page, back=current page, start rotated -180 (showing back = current, i.e. no visual jump)
    setLeafInstant(prevN, n, -180);
    els.leaf.classList.add("turning");
    requestAnimationFrame(() => {
      els.leaf.style.transform = "rotateY(0deg)";
    });
    playFlipSound();
    const onEnd = () => {
      els.leaf.removeEventListener("transitionend", onEnd);
      els.leaf.classList.remove("turning");
      state.index--;
      render(true);
      animating = false;
    };
    els.leaf.addEventListener("transitionend", onEnd);
  }

  function bounceLimit(){
    els.book.classList.add("limit");
    setTimeout(() => els.book.classList.remove("limit"), 320);
  }

  function jumpTo(pageNum, silent){
    const idx = Math.max(0, Math.min(TOTAL-1, pageNum - 1));
    if (idx === state.index) return;
    state.hasInteracted = true;
    state.index = idx;
    render(true);
    if (!silent) showToast(`Jumped to page ${pageNum}`);
  }

  /* ---------------------------------------------------------------------
     Drag-to-peek (pointer events unify mouse / touch / pen)
  --------------------------------------------------------------------- */
  function setupDrag(){
    let startX = 0, dir = null, width = 1;

    function begin(e, forward){
      if (animating) return;
      if (forward && state.index + 1 >= TOTAL) return;
      if (!forward && state.index <= 0) return;
      state.hasInteracted = true;
      dir = forward ? "next" : "prev";
      startX = e.clientX;
      width = els.rightSlot.getBoundingClientRect().width;
      state.dragging = true;
      els.leaf.classList.add("dragging","turning");

      const n = state.index + 1;
      if (dir === "next"){
        setLeafInstant(n, n+1 <= TOTAL ? n+1 : null, 0);
      } else {
        setLeafInstant(n-1, n, -180);
      }
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end, { once:true });
    }

    function move(e){
      if (!state.dragging) return;
      const dx = e.clientX - startX;
      let rot;
      if (dir === "next"){
        rot = Math.max(-180, Math.min(0, (dx / width) * -180 * 1.4));
      } else {
        rot = Math.max(-180, Math.min(0, -180 + (dx / width) * 180 * 1.4));
      }
      els.leaf.style.transform = `rotateY(${rot}deg)`;
    }

    function end(e){
      window.removeEventListener("pointermove", move);
      state.dragging = false;
      els.leaf.classList.remove("dragging");
      const dx = e.clientX - startX;
      const committed = dir === "next" ? dx < -width*0.28 : dx > width*0.28;
      const goingForward = dir === "next";

      if (committed){
        playFlipSound();
        els.leaf.style.transform = goingForward ? "rotateY(-180deg)" : "rotateY(0deg)";
        const onEnd = () => {
          els.leaf.removeEventListener("transitionend", onEnd);
          els.leaf.classList.remove("turning");
          state.index += goingForward ? 1 : -1;
          render(true);
        };
        els.leaf.addEventListener("transitionend", onEnd);
      } else {
        els.leaf.style.transform = goingForward ? "rotateY(0deg)" : "rotateY(-180deg)";
        const onEnd = () => {
          els.leaf.removeEventListener("transitionend", onEnd);
          els.leaf.classList.remove("turning");
          render(true); // restores correct front/back for resting state
        };
        els.leaf.addEventListener("transitionend", onEnd);
      }
    }

    els.rightSlot.addEventListener("pointerdown", (e) => {
      const r = els.rightSlot.getBoundingClientRect();
      const nearRightEdge = (e.clientX - r.left) > r.width * 0.55;
      if (nearRightEdge) begin(e, true);
    });
    els.leftSlot.addEventListener("pointerdown", (e) => begin(e, false));
  }

  /* ---------------------------------------------------------------------
     Autoplay
  --------------------------------------------------------------------- */
  function setAutoplay(on){
    state.autoplay = on;
    els.btnAuto.classList.toggle("active", on);
    clearInterval(state.autoTimer);
    if (on){
      state.autoTimer = setInterval(() => {
        if (state.index + 1 >= TOTAL){ setAutoplay(false); return; }
        flipNext();
      }, state.autoInterval);
      showToast("Autoplay on — turning pages for you");
    }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.autoplay) clearInterval(state.autoTimer);
    else if (!document.hidden && state.autoplay) setAutoplay(true);
  });

  /* ---------------------------------------------------------------------
     "Tip trying to flip" — the page corner peels as the pointer approaches,
     inviting the reader to turn it. Also a one-time onboarding pulse for
     touch devices (no hover) so everyone discovers the interaction.
  --------------------------------------------------------------------- */
  const PEEK_MAX_DEG = 20;
  const PEEK_ZONE_RATIO = 0.35;

  function initPeek(){
    const canHover = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
    if (!canHover || state.reduceMotion) return;

    let rightPeeking = false;

    function setRightPeek(p){
      if (!rightPeeking){
        els.leaf.style.transition = "transform .15s ease-out";
        els.leaf.classList.add("hinting");
        rightPeeking = true;
      }
      els.leaf.style.transform = `rotateY(${-PEEK_MAX_DEG * p}deg)`;
      els.cornerHintRight.style.opacity = String(Math.min(.7, p + .15));
      els.cornerHintRight.style.transform = `translate(${-p*4}px, ${-p*4}px)`;
    }
    function clearRightPeek(){
      if (!rightPeeking) return;
      rightPeeking = false;
      els.leaf.classList.remove("hinting");
      els.leaf.style.transition = "transform .4s var(--ease-out)";
      els.leaf.style.transform = "rotateY(0deg)";
      els.cornerHintRight.style.opacity = "0";
      els.cornerHintRight.style.transform = "translate(0,0)";
      setTimeout(() => { if (!animating && !state.dragging) els.leaf.style.transition = ""; }, 420);
    }
    function setLeftHint(p){
      els.cornerHintLeft.style.opacity = String(Math.min(.7, p + .15));
      els.cornerHintLeft.style.transform = `translate(${p*4}px, ${-p*4}px)`;
    }
    function clearLeftHint(){
      els.cornerHintLeft.style.opacity = "0";
      els.cornerHintLeft.style.transform = "translate(0,0)";
    }

    let ticking = false;
    els.book.addEventListener("pointermove", (e) => {
      if (ticking) return;
      ticking = true;
      const clientX = e.clientX, clientY = e.clientY;
      requestAnimationFrame(() => {
        ticking = false;
        if (animating || state.dragging) return;

        if (state.index + 1 < TOTAL){
          const r = els.rightSlot.getBoundingClientRect();
          const inside = clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
          if (inside){
            const distFromEdge = r.right - clientX;
            const zone = r.width * PEEK_ZONE_RATIO;
            if (distFromEdge <= zone){ setRightPeek(1 - distFromEdge / zone); }
            else clearRightPeek();
          } else clearRightPeek();
        }

        if (!state.isSingle && state.index > 0){
          const lr = els.leftSlot.getBoundingClientRect();
          const insideLeft = clientX >= lr.left && clientX <= lr.right && clientY >= lr.top && clientY <= lr.bottom;
          if (insideLeft){
            const distFromEdge = clientX - lr.left;
            const zone = lr.width * PEEK_ZONE_RATIO;
            if (distFromEdge <= zone){ setLeftHint(1 - distFromEdge / zone); }
            else clearLeftHint();
          } else clearLeftHint();
        }
      });
    });

    els.book.addEventListener("pointerleave", () => { clearRightPeek(); clearLeftHint(); });
  }

  let inviteCount = 0;
  function scheduleInvite(){
    if (state.reduceMotion) return;
    setTimeout(function pulse(){
      if (state.hasInteracted || inviteCount >= 3 || animating || state.dragging || document.hidden){
        if (!state.hasInteracted && inviteCount < 3 && !document.hidden){
          setTimeout(pulse, 9000); // try again shortly if the page was hidden/mid-flip
        }
        return;
      }
      inviteCount++;
      els.cornerHintRight.classList.add("pulse");
      els.leaf.style.transition = "transform .55s var(--ease-spring)";
      els.leaf.classList.add("hinting");
      els.leaf.style.transform = "rotateY(-16deg)";
      setTimeout(() => {
        els.leaf.style.transform = "rotateY(0deg)";
        setTimeout(() => {
          els.leaf.classList.remove("hinting");
          els.cornerHintRight.classList.remove("pulse");
          els.leaf.style.transition = "";
          if (!state.hasInteracted && inviteCount < 3) setTimeout(pulse, 9000);
        }, 600);
      }, 600);
    }, 1800);
  }

  /* ---------------------------------------------------------------------
     Search
  --------------------------------------------------------------------- */
  function runSearch(q){
    q = q.trim().toLowerCase();
    if (!q){ els.searchResults.classList.remove("show"); return; }
    const hits = DATA.pages.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.section.toLowerCase().includes(q) ||
      p.snippet.toLowerCase().includes(q)
    );
    els.searchResults.innerHTML = "";
    if (!hits.length){
      els.searchResults.innerHTML = `<div class="search-empty">No pages match "${escapeHtml(q)}"</div>`;
    } else {
      hits.forEach(p => {
        const row = document.createElement("div");
        row.className = "search-item";
        row.innerHTML = `<div class="num">${p.n}</div><div class="meta"><b>${p.title}</b><span>${p.section} — ${p.snippet}</span></div>`;
        row.addEventListener("click", () => {
          jumpTo(p.n);
          els.searchResults.classList.remove("show");
          els.searchInput.value = "";
        });
        els.searchResults.appendChild(row);
      });
    }
    els.searchResults.classList.add("show");
  }
  function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  /* ---------------------------------------------------------------------
     Drawer / TOC
  --------------------------------------------------------------------- */
  function openDrawer(){ els.drawer.classList.add("show"); els.drawerBackdrop.classList.add("show"); }
  function closeDrawer(){ els.drawer.classList.remove("show"); els.drawerBackdrop.classList.remove("show"); }

  /* ---------------------------------------------------------------------
     Toast
  --------------------------------------------------------------------- */
  let toastTimer;
  function showToast(msg){
    els.toastMsg.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2600);
  }

  /* ---------------------------------------------------------------------
     Settings: sound / theme / motion / autoplay speed
  --------------------------------------------------------------------- */
  function initSettings(){
    els.btnSound.classList.toggle("active", state.soundOn);
    const savedTheme = safeStorage.get("sb-theme") ||
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    applyTheme(savedTheme);
    els.themeSelect.value = savedTheme;

    document.body.classList.toggle("motion-off", state.reduceMotion);
    els.motionSwitch.checked = state.reduceMotion;
    els.autoSpeed.value = String(state.autoInterval);
  }
  function applyTheme(t){
    document.body.classList.toggle("theme-light", t === "light");
    safeStorage.set("sb-theme", t);
  }

  /* ---------------------------------------------------------------------
     Keyboard
  --------------------------------------------------------------------- */
  function initKeyboard(){
    window.addEventListener("keydown", (e) => {
      if (["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) {
        if (e.key === "Escape") document.activeElement.blur();
        return;
      }
      switch(e.key){
        case "ArrowRight": case " ": e.preventDefault(); flipNext(); break;
        case "ArrowLeft": flipPrev(); break;
        case "Home": jumpTo(1); break;
        case "End": jumpTo(TOTAL); break;
        case "f": case "F": toggleFullscreen(); break;
        case "t": case "T": openDrawer(); break;
        case "m": case "M": toggleSound(); break;
        case "/": e.preventDefault(); els.searchInput.focus(); break;
        case "Escape": closeDrawer(); els.settingsPop.classList.remove("show"); break;
      }
    });
  }

  function toggleSound(){
    state.soundOn = !state.soundOn;
    safeStorage.set("sb-sound", JSON.stringify(state.soundOn));
    els.btnSound.classList.toggle("active", state.soundOn);
    showToast(state.soundOn ? "Sound on" : "Sound off");
  }

  function toggleFullscreen(){
    if (!document.fullscreenElement){ document.documentElement.requestFullscreen?.(); }
    else { document.exitFullscreen?.(); }
  }

  /* ---------------------------------------------------------------------
     Share
  --------------------------------------------------------------------- */
  async function shareCurrent(){
    const n = state.index + 1;
    const url = `${location.origin}${location.pathname}#p=${n}`;
    const title = `${DATA.title} — ${DATA.pages[state.index].title}`;
    if (navigator.share){
      try{ await navigator.share({ title, url }); return; }catch(e){ /* user cancelled */ return; }
    }
    try{
      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard");
    }catch(e){
      showToast(url);
    }
  }

  /* ---------------------------------------------------------------------
     Wire up UI
  --------------------------------------------------------------------- */
  function initUI(){
    els.btnNext.addEventListener("click", flipNext);
    els.btnPrev.addEventListener("click", flipPrev);
    els.zoneNext.addEventListener("click", flipNext);
    els.zonePrev.addEventListener("click", flipPrev);

    els.btnToc.addEventListener("click", openDrawer);
    els.btnDrawerClose.addEventListener("click", closeDrawer);
    els.drawerBackdrop.addEventListener("click", closeDrawer);

    els.btnSearchToggle?.addEventListener("click", () => els.searchInput.focus());
    els.searchInput.addEventListener("input", (e) => runSearch(e.target.value));
    els.searchInput.addEventListener("focus", (e) => { if (e.target.value) runSearch(e.target.value); });
    document.addEventListener("click", (e) => {
      if (!els.searchWrap.contains(e.target)) els.searchResults.classList.remove("show");
      if (!els.btnSettings.contains(e.target) && !els.settingsPop.contains(e.target)) els.settingsPop.classList.remove("show");
    });

    els.btnSound.addEventListener("click", toggleSound);
    els.btnAuto.addEventListener("click", () => setAutoplay(!state.autoplay));
    els.btnFullscreen.addEventListener("click", toggleFullscreen);
    els.btnShare.addEventListener("click", shareCurrent);

    els.btnSettings.addEventListener("click", () => els.settingsPop.classList.toggle("show"));
    els.themeSelect.addEventListener("change", (e) => applyTheme(e.target.value));
    els.motionSwitch.addEventListener("change", (e) => {
      state.reduceMotion = e.target.checked;
      document.body.classList.toggle("motion-off", state.reduceMotion);
    });
    els.autoSpeed.addEventListener("change", (e) => {
      state.autoInterval = parseInt(e.target.value, 10);
      safeStorage.set("sb-autospeed", String(state.autoInterval));
      if (state.autoplay) setAutoplay(true);
    });

    window.addEventListener("resize", () => {
      state.isSingle = window.matchMedia("(max-width:900px)").matches;
      els.book.classList.toggle("single", state.isSingle);
    });
    els.book.classList.toggle("single", state.isSingle);
  }

  /* ---------------------------------------------------------------------
     PWA — offline caching so a colleague can reopen the issue without data
  --------------------------------------------------------------------- */
  function initPWA(){
    if ("serviceWorker" in navigator){
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  /* ---------------------------------------------------------------------
     Boot
  --------------------------------------------------------------------- */
  function boot(){
    buildFilmstrip();
    buildToc();
    initUI();
    initKeyboard();
    setupDrag();
    initPeek();
    initSettings();
    initPWA();

    const hashMatch = location.hash.match(/p=(\d+)/);
    const savedPage = parseInt(safeStorage.get("sb-last-page") || "1", 10);
    let startPage = 1;
    if (hashMatch) startPage = parseInt(hashMatch[1], 10);
    else if (savedPage > 1) startPage = savedPage;

    state.index = Math.max(0, Math.min(TOTAL-1, startPage - 1));
    render(true);

    if (!hashMatch && savedPage > 1){
      setTimeout(() => showToast(`Resumed from page ${savedPage}`), 900);
    }

    setTimeout(() => els.loader.classList.add("hidden"), 550);
    scheduleInvite();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
