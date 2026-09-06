(function () {
  const svg = document.querySelector('svg');
  const byId = (id) => svg.getElementById(id);
  const show = (el, on) => { if (el) el.style.display = on ? '' : 'none'; };

  // ---------- Routing: adventures list  <->  tiki trouble map screen ----------
  const adventuresPage = byId('adventures_index_page_main_page_at_launch_');
  const blankWorkspace = byId('workspace_map_container_blank_when_no_map_is_visible_');
  const tikiIndexPage = byId('tiki_trouble_index_page');
  const tikiWorkspace = byId('workspace_map_container_of_tiki_trouble');
  const zoomTools = byId('map_zoom_tools');

  function showAdventures() {
    show(adventuresPage, true);
    show(blankWorkspace, true);
    show(tikiIndexPage, false);
    show(tikiWorkspace, false);
    show(zoomTools, false);
  }
  function showTikiTrouble() {
    show(adventuresPage, false);
    show(blankWorkspace, false);
    show(tikiIndexPage, true);
    show(tikiWorkspace, true);
    show(zoomTools, true);
  }

  // Adventure card hover: now a real hover-state twin you drew
  // (adventure_map_selection_opens_tiki_trouble_hover), so this reuses the same
  // normal/hover swap pattern as everything else instead of the old sym10/goBtn
  // pill-only hack.
  wireButton(
    'adventure_map_selection_opens_tiki_trouble',
    'adventure_map_selection_opens_tiki_trouble_hover',
    showTikiTrouble
  );

  const backBtn = byId('Back_button_goes_back_to_adventures_index_page_');
  const backNormal = byId('back_button-2');
  const backHover = byId('back_button_hover');
  if (backBtn) {
    backBtn.style.cursor = 'pointer';
    show(backHover, false);
    backBtn.addEventListener('mouseenter', () => { show(backNormal, false); show(backHover, true); });
    backBtn.addEventListener('mouseleave', () => { show(backNormal, true); show(backHover, false); });
    backBtn.addEventListener('click', showAdventures);
  }

  showAdventures(); // initial state

  // ---------- Item checklist: 7 categories, each an on/off switch ----------
  const CATEGORIES = {
    coin:      { idx: '',   markerBase: 'coin',    variantBase: 'coin_version_2' },
    crystal:   { idx: '-2', markerBase: 'crystal', variantBase: 'crystal_version_2' },
    banana:    { idx: '-3', markerBase: 'Banana' },
    chest:     { idx: '-4', markerBase: 'chest' },
    pineapple: { idx: '-5', markerBase: 'Pineapple' },
    coconut:   { idx: '-6', markerBase: 'coconut' },
    fish:      { idx: '-7', markerBase: 'Fish' },
  };

  const chipState = {}; // key -> { active: bool, variant: 'A'|'B' }
  let sizeMultiplier = 1;

  function markerEls(base) {
    const out = [];
    for (const el of svg.querySelectorAll('[id]')) {
      if (el.id === base || el.id.startsWith(base + '-')) out.push(el);
    }
    return out;
  }

  function styleMarker(el, scale) {
    el.style.transformBox = 'fill-box';
    el.style.transformOrigin = 'center';
    el.style.transition = 'transform .12s ease';
    el.style.transform = `scale(${scale})`;
    // White outline around the marker's whole silhouette (a filter on the group,
    // not a stroke on individual paths) so it doesn't add stray outlines to every
    // internal detail path -- and since this only ever runs on the on-map marker
    // instances (never on the sidebar Item_icon_* art), the checklist icons stay
    // untouched.
    el.style.filter = 'url(#markerWhiteOutline)';
  }

  // A category's markers are only ever visible while its switch is ON --
  // being off now hides them completely rather than just shrinking them.
  function applyMarkerVisualState(key) {
    const cfg = CATEGORIES[key];
    const st = chipState[key];
    const scale = st.active ? sizeMultiplier : 1;

    if (cfg.variantBase) {
      markerEls(cfg.markerBase).forEach((el) => {
        show(el, st.active && st.variant === 'A');
        styleMarker(el, scale);
      });
      markerEls(cfg.variantBase).forEach((el) => {
        show(el, st.active && st.variant === 'B');
        styleMarker(el, scale);
      });
    } else {
      markerEls(cfg.markerBase).forEach((el) => {
        show(el, st.active);
        styleMarker(el, scale);
      });
    }
  }

  function wireOnOffSwitch(key) {
    const cfg = CATEGORIES[key];
    const switchGroup = byId('On_off_switch' + cfg.idx);
    if (!switchGroup) return;
    const offEl = byId('Off_switch' + cfg.idx);
    const offHover = byId('Off_switch_hover' + cfg.idx);
    const onEl = byId('On_indicator' + cfg.idx);
    const onHover = byId('On_indicator_hover' + cfg.idx);

    chipState[key] = { active: false, variant: 'A' };
    let hovering = false;

    function render() {
      const st = chipState[key];
      show(offEl, !st.active && !hovering);
      show(offHover, !st.active && hovering);
      show(onEl, st.active && !hovering);
      show(onHover, st.active && hovering);
    }
    render();

    switchGroup.style.cursor = 'pointer';
    switchGroup.addEventListener('mouseenter', () => { hovering = true; render(); });
    switchGroup.addEventListener('mouseleave', () => { hovering = false; render(); });
    switchGroup.addEventListener('click', () => {
      chipState[key].active = !chipState[key].active;
      render();
      applyMarkerVisualState(key);
    });
  }

  function wireAbSwitch(key) {
    const cfg = CATEGORIES[key];
    if (!cfg.variantBase) return;
    const abGroup = byId('A_and_B_Switch' + cfg.idx);
    if (!abGroup) return;
    const aEl = byId('Switch_option_A' + cfg.idx);
    const aHover = byId('Switch_option_A_hover' + cfg.idx);
    const bEl = byId('Switch_option_B' + cfg.idx);
    const bHover = byId('Switch_option_B_hover' + cfg.idx);
    let hovering = false;

    function render() {
      const v = chipState[key].variant;
      show(aEl, v === 'A' && !hovering);
      show(aHover, v === 'A' && hovering);
      show(bEl, v === 'B' && !hovering);
      show(bHover, v === 'B' && hovering);
    }
    render();

    abGroup.style.cursor = 'pointer';
    abGroup.addEventListener('mouseenter', () => { hovering = true; render(); });
    abGroup.addEventListener('mouseleave', () => { hovering = false; render(); });
    abGroup.addEventListener('click', (e) => {
      e.stopPropagation();
      chipState[key].variant = chipState[key].variant === 'A' ? 'B' : 'A';
      render();
      applyMarkerVisualState(key);
    });
  }

  for (const key of Object.keys(CATEGORIES)) {
    wireOnOffSwitch(key);
    wireAbSwitch(key);
    applyMarkerVisualState(key); // everything starts hidden until switched on
  }

  // ---------- Icon size slider (drag the thumb along her rail) ----------
  const rail = byId('icon_side_slider_rail');
  const thumb = byId('icon_size_thumb');
  const thumbHover = byId('icon_size_thumb_hover');
  if (rail && thumb) {
    const line = rail.querySelector('line');
    const railX1 = parseFloat(line.getAttribute('x1'));
    const railX2 = parseFloat(line.getAttribute('x2'));
    // The thumb's default (leftmost) position already has its LEFT edge flush
    // with railX1. If we slide it the full rail length, its RIGHT edge overshoots
    // railX2 by the thumb's own width. Traveling only (railLength - thumbWidth)
    // instead makes the right edge land exactly on railX2, matching the left side.
    const thumbWidth = thumb.getBBox().width;
    const travel = (railX2 - railX1) - thumbWidth;

    function svgPointForSlider(evt) {
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX; pt.y = evt.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }

    function setFromT(t) {
      t = Math.max(0, Math.min(1, t)); // clamped to the rail's own two ends
      sizeMultiplier = 1 + t * 2; // 1x .. 3x
      const dx = t * travel;
      thumb.setAttribute('transform', `translate(${dx}, 0)`);
      if (thumbHover) thumbHover.setAttribute('transform', `translate(${dx}, 0)`);
      for (const key of Object.keys(CATEGORIES)) {
        if (chipState[key] && chipState[key].active) applyMarkerVisualState(key);
      }
    }

    let dragging = false;
    show(thumbHover, false);
    thumb.style.cursor = 'grab';
    thumb.addEventListener('mouseenter', () => { if (!dragging) { show(thumb, false); show(thumbHover, true); } });
    thumb.addEventListener('mouseleave', () => { if (!dragging) { show(thumb, true); show(thumbHover, false); } });

    function startDrag(e) {
      dragging = true;
      show(thumb, false); show(thumbHover, true);
      e.preventDefault();
    }
    function moveDrag(e) {
      if (!dragging) return;
      const p = svgPointForSlider(e);
      setFromT((p.x - railX1) / (railX2 - railX1));
    }
    function endDrag() {
      dragging = false;
      show(thumb, true); show(thumbHover, false);
    }
    thumb.addEventListener('pointerdown', startDrag);
    if (thumbHover) thumbHover.addEventListener('pointerdown', startDrag);
    window.addEventListener('pointermove', moveDrag);
    window.addEventListener('pointerup', endDrag);
  }

  // ---------- Zoom + pan, clipped to Map_bounding_box ----------
  const box = { x: 1758.029062356120448, y: 685.652154867559148, w: 3407.039999999999964, h: 3081.119999999998981 };
  const boxCenter = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  const mapWithMarkers = byId('Map_with_markers'); // this keeps the clip-path and never gets a transform

  // Everything that used to move (the map image + every marker instance) gets
  // relocated into a fresh inner layer. Map_with_markers itself stays untransformed,
  // so its clip-path (built from her Map_bounding_box) stays put while zoomLayer moves
  // and scales inside it -- this is the piece that was missing before, which is why
  // zoomed content was spilling out past the blue box instead of being masked to it.
  const zoomLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  while (mapWithMarkers.firstChild) zoomLayer.appendChild(mapWithMarkers.firstChild);
  mapWithMarkers.appendChild(zoomLayer);

  let scale = 1, offX = 0, offY = 0;

  function clampPan() {
    offX = Math.min(box.x * (1 - scale), Math.max((box.x + box.w) * (1 - scale), offX));
    offY = Math.min(box.y * (1 - scale), Math.max((box.y + box.h) * (1 - scale), offY));
  }
  function applyMapTransform() {
    zoomLayer.setAttribute('transform', `translate(${offX}, ${offY}) scale(${scale})`);
  }
  // Zooms while keeping whatever content point is currently under `anchor`
  // (in root-SVG user units) visually fixed in place -- this is what makes it
  // zoom toward the cursor (or the box center, for the +/- buttons) instead of
  // always toward the top-left corner.
  function zoomAt(nextScaleRaw, anchor) {
    const nextScale = Math.max(1, nextScaleRaw);
    const ratio = nextScale / scale;
    offX = anchor.x - ratio * (anchor.x - offX);
    offY = anchor.y - ratio * (anchor.y - offY);
    scale = nextScale;
    clampPan();
    applyMapTransform();
  }

  function svgPointGlobal(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  // Bind hover + click straight to each button's own art (both the normal AND
  // hover element get the listeners) instead of their shared parent group.
  // Zoom_in_button / zoom_out_button / reset_zoom_button all live directly under
  // the same map_zoom_tools group with no individual wrapper each, so binding to
  // the parent meant every click fired all three handlers at once -- which is why
  // it only ever ended up back at reset.
  function wireButton(normalId, hoverId, onClick) {
    const normal = byId(normalId), hover = byId(hoverId);
    if (!normal) return;
    show(hover, false);
    [normal, hover].forEach((el) => {
      if (!el) return;
      el.style.cursor = 'pointer';
      el.addEventListener('mouseenter', () => { show(normal, false); show(hover, true); });
      el.addEventListener('mouseleave', () => { show(normal, true); show(hover, false); });
      if (onClick) el.addEventListener('click', onClick);
    });
  }
  wireButton('Zoom_in_button', 'zoom_in_button_hover', () => zoomAt(scale * 1.3, boxCenter));
  wireButton('zoom_out_button', 'zoom_out_button_hover', () => zoomAt(scale / 1.3, boxCenter));
  wireButton('reset_zoom_button', 'reset_zoom_button_hover', () => {
    scale = 1; offX = 0; offY = 0;
    applyMapTransform();
  });

  // drag-to-pan + wheel-to-zoom (anchored on the cursor) over the map area
  let dragging = false, lastPt = null;
  if (tikiWorkspace) {
    tikiWorkspace.style.cursor = 'grab';
    tikiWorkspace.addEventListener('pointerdown', (e) => {
      dragging = true;
      lastPt = svgPointGlobal(e);
      tikiWorkspace.setPointerCapture(e.pointerId);
    });
    tikiWorkspace.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const p = svgPointGlobal(e);
      offX += (p.x - lastPt.x);
      offY += (p.y - lastPt.y);
      lastPt = p;
      clampPan();
      applyMapTransform();
    });
    const stopDrag = () => { dragging = false; };
    tikiWorkspace.addEventListener('pointerup', stopDrag);
    tikiWorkspace.addEventListener('pointercancel', stopDrag);
    tikiWorkspace.addEventListener('wheel', (e) => {
      e.preventDefault();
      const anchor = svgPointGlobal(e);
      zoomAt(scale * (e.deltaY > 0 ? 1 / 1.15 : 1.15), anchor);
    }, { passive: false });
  }

  applyMapTransform();

  // ---------- Credits hover ----------
  wireButton('Credits_container', 'Credits_container_hover', () => {
    window.open('https://instagram.com/REPLACE_ME', '_blank'); // TODO: swap in Mimi's real handle
  });
})();
