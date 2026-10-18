(function () {
  'use strict';

  // TODO: swap in the real link the credits badge should open
  const CREDITS_URL = 'https://instagram.com/maddkadd';

  const svg = document.querySelector('svg');
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const byId = (id) => svg.getElementById(id);
  const show = (el, on) => { if (el) el.style.display = on ? '' : 'none'; };
  const make = (tag, attrs, kids) => {
    const n = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    (kids || []).forEach((c) => n.appendChild(c));
    return n;
  };

  let defs = svg.querySelector('defs');
  if (!defs) { defs = make('defs', {}); svg.insertBefore(defs, svg.firstChild); }

  // ---------------------------------------------------------------------------
  // Adding a new adventure = one more entry here (ids come from your SVG layer
  // names) -- the engine below doesn't change.
  //   idx          the suffix your layers use for that checklist row
  //   markers      base name of the marker layers on the map (Passage, Passage-2...)
  //   variantMarkers (optional) base name of the "version 2" set, for A/B rows
  //   outlineRadius  thickness of the white marker outline, in map units
  // ---------------------------------------------------------------------------
  const MAPS = {
    'tiki-trouble': {
      card: 'adventure_map_selection_opens_tiki_trouble',
      cardHover: 'adventure_map_selection_opens_tiki_trouble_hover',
      indexPage: 'tiki_trouble_index_page',
      workspace: 'workspace_map_container_of_tiki_trouble',
      mapLayer: 'Map_with_markers',
      back: 'Back_button_goes_back_to_adventures_index_page_',
      backNormal: 'back_button-2',
      backHover: 'back_button_hover',
      slider: { rail: 'icon_side_slider_rail', thumb: 'icon_size_thumb', thumbHover: 'icon_size_thumb_hover' },
      outlineRadius: 1.1,
      categories: {
        coin:      { idx: '',   markers: 'coin',    variantMarkers: 'coin_version_2' },
        crystal:   { idx: '-2', markers: 'crystal', variantMarkers: 'crystal_version_2' },
        banana:    { idx: '-3', markers: 'Banana' },
        chest:     { idx: '-4', markers: 'chest' },
        pineapple: { idx: '-5', markers: 'Pineapple' },
        coconut:   { idx: '-6', markers: 'coconut' },
        fish:      { idx: '-7', markers: 'Fish' },
      },
    },
    'bitter-sweets': {
      card: 'adventure_map_selection_opens_bitter_sweets',
      cardHover: 'adventure_map_selection_opens_bitter_sweets_hover',
      indexPage: 'bitter_sweets_index_page',
      workspace: 'workspace_map_container_of_bitter_sweets',
      mapLayer: 'Map_with_markers-2',
      back: 'Back_button_goes_back_to_adventures_index_page_-2',
      backNormal: 'back_button-3',
      backHover: 'back_button_hover-2',
      slider: { rail: 'icon_side_slider_rail-2', thumb: 'icon_size_thumb-2', thumbHover: 'icon_size_thumb_hover-2' },
      outlineRadius: 3, // these markers are ~6x bigger than Tiki Trouble's, so a thicker outline
      categories: {
        passage:      { idx: '-8', markers: 'Passage' },
        group_reward: { idx: '-9', markers: 'Group_reward' },
      },
    },
  };

  // ---------- hover-swap helper (normal art <-> hover art) ----------
  const hoverResets = [];
  function wireButton(normalId, hoverId, onClick) {
    const normal = byId(normalId), hover = byId(hoverId);
    if (!normal) return;
    const reset = () => { show(normal, true); show(hover, false); };
    reset();
    hoverResets.push(reset);
    [normal, hover].forEach((el) => {
      if (!el) return;
      el.style.cursor = 'pointer';
      el.addEventListener('mouseenter', () => { show(normal, false); show(hover, true); });
      el.addEventListener('mouseleave', reset);
      if (onClick) el.addEventListener('click', onClick);
    });
  }

  function svgPoint(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  // ---------------------------------------------------------------------------
  // One map's worth of behaviour
  // ---------------------------------------------------------------------------
  let active = null; // the map currently open (null = adventures list)

  function setupMap(key, cfg) {
    const indexPage = byId(cfg.indexPage);
    const workspace = byId(cfg.workspace);
    const layer = byId(cfg.mapLayer);

    // The bounding box is read straight from your labeled rect, then hidden.
    const boxRect = workspace.querySelector(':scope > rect');
    const box = {
      x: parseFloat(boxRect.getAttribute('x')), y: parseFloat(boxRect.getAttribute('y')),
      w: parseFloat(boxRect.getAttribute('width')), h: parseFloat(boxRect.getAttribute('height')),
    };
    boxRect.style.display = 'none';
    const boxCenter = { x: box.x + box.w / 2, y: box.y + box.h / 2 };

    // Mask: the clip lives on the untransformed layer, so it stays put while the
    // content inside it zooms and pans.
    const clipId = 'mapClip-' + key;
    defs.appendChild(make('clipPath', { id: clipId }, [
      make('rect', { x: box.x, y: box.y, width: box.w, height: box.h }),
    ]));
    layer.setAttribute('clip-path', `url(#${clipId})`);

    // Map picture always goes underneath its markers (in the Bitter Sweets
    // layer order it was drawn last, which would have covered every marker).
    const mapImage = layer.querySelector(':scope > image');
    if (mapImage) layer.insertBefore(mapImage, layer.firstChild);

    const zoomLayer = make('g', {});
    while (layer.firstChild) zoomLayer.appendChild(layer.firstChild);
    layer.appendChild(zoomLayer);

    // White outline around each marker's whole silhouette (a filter on the group,
    // not a stroke on every inner path). Map markers only -- never the checklist icons.
    const outlineId = 'markerOutline-' + key;
    defs.appendChild(make('filter', { id: outlineId, x: '-60%', y: '-60%', width: '220%', height: '220%' }, [
      make('feMorphology', { in: 'SourceAlpha', operator: 'dilate', radius: cfg.outlineRadius, result: 'dilated' }),
      make('feFlood', { 'flood-color': '#ffffff', result: 'white' }),
      make('feComposite', { in: 'white', in2: 'dilated', operator: 'in', result: 'outline' }),
      make('feMerge', {}, [make('feMergeNode', { in: 'outline' }), make('feMergeNode', { in: 'SourceGraphic' })]),
    ]));

    const state = { sizeMultiplier: 1, scale: 1, offX: 0, offY: 0 };
    const chips = {};

    // ----- checklist rows -----
    const markersOf = (base) => Array.from(zoomLayer.querySelectorAll('[id]'))
      .filter((el) => el.id === base || el.id.startsWith(base + '-'));

    function styleMarker(el, scale) {
      el.style.transformBox = 'fill-box';
      el.style.transformOrigin = 'center';
      el.style.transition = 'transform .12s ease';
      el.style.transform = `scale(${scale})`;
      el.style.filter = `url(#${outlineId})`;
    }

    // Markers are only visible while their switch is ON (and, for A/B rows,
    // only the chosen set).
    function applyMarkers(catKey) {
      const cat = chips[catKey];
      const scale = cat.active ? state.sizeMultiplier : 1;
      cat.aEls.forEach((el) => { show(el, cat.active && (!cat.bEls.length || cat.variant === 'A')); styleMarker(el, scale); });
      cat.bEls.forEach((el) => { show(el, cat.active && cat.variant === 'B'); styleMarker(el, scale); });
    }

    function wireOnOff(catKey, c) {
      const group = byId('On_off_switch' + c.idx);
      if (!group) return;
      const offEl = byId('Off_switch' + c.idx), offHover = byId('Off_switch_hover' + c.idx);
      const onEl = byId('On_indicator' + c.idx), onHover = byId('On_indicator_hover' + c.idx);
      let hovering = false;
      const render = () => {
        const a = chips[catKey].active;
        show(offEl, !a && !hovering); show(offHover, !a && hovering);
        show(onEl, a && !hovering); show(onHover, a && hovering);
      };
      render();
      group.style.cursor = 'pointer';
      group.addEventListener('mouseenter', () => { hovering = true; render(); });
      group.addEventListener('mouseleave', () => { hovering = false; render(); });
      group.addEventListener('click', () => {
        chips[catKey].active = !chips[catKey].active;
        render();
        applyMarkers(catKey);
      });
    }

    function wireAB(catKey, c) {
      if (!c.variantMarkers) return;
      const group = byId('A_and_B_Switch' + c.idx);
      if (!group) return;
      const aEl = byId('Switch_option_A' + c.idx), aHover = byId('Switch_option_A_hover' + c.idx);
      const bEl = byId('Switch_option_B' + c.idx), bHover = byId('Switch_option_B_hover' + c.idx);
      let hovering = false;
      const render = () => {
        const v = chips[catKey].variant;
        show(aEl, v === 'A' && !hovering); show(aHover, v === 'A' && hovering);
        show(bEl, v === 'B' && !hovering); show(bHover, v === 'B' && hovering);
      };
      render();
      group.style.cursor = 'pointer';
      group.addEventListener('mouseenter', () => { hovering = true; render(); });
      group.addEventListener('mouseleave', () => { hovering = false; render(); });
      group.addEventListener('click', (e) => {
        e.stopPropagation();
        chips[catKey].variant = chips[catKey].variant === 'A' ? 'B' : 'A';
        render();
        applyMarkers(catKey);
      });
    }

    for (const [catKey, c] of Object.entries(cfg.categories)) {
      chips[catKey] = {
        active: false, variant: 'A',
        aEls: markersOf(c.markers),
        bEls: c.variantMarkers ? markersOf(c.variantMarkers) : [],
      };
      wireOnOff(catKey, c);
      wireAB(catKey, c);
      applyMarkers(catKey); // everything starts hidden until switched on
    }

    // ----- icon size slider (thumb rides her rail) -----
    const rail = byId(cfg.slider.rail), thumb = byId(cfg.slider.thumb), thumbHover = byId(cfg.slider.thumbHover);
    if (rail && thumb) {
      const line = rail.querySelector('line');
      const x1 = parseFloat(line.getAttribute('x1')), x2 = parseFloat(line.getAttribute('x2'));
      // Measured while the page is still visible (see the last line of this file);
      // travel = rail length minus thumb width, so the thumb's right edge lands
      // exactly on the rail's end, mirroring how its left edge starts.
      const travel = (x2 - x1) - thumb.getBBox().width;
      let dragging = false;

      const setFromT = (t) => {
        t = Math.max(0, Math.min(1, t));
        state.sizeMultiplier = 1 + t * 2; // 1x .. 3x
        const tr = `translate(${t * travel}, 0)`;
        thumb.setAttribute('transform', tr);
        if (thumbHover) thumbHover.setAttribute('transform', tr);
        for (const k of Object.keys(chips)) if (chips[k].active) applyMarkers(k);
      };
      show(thumbHover, false);
      thumb.style.cursor = 'grab';
      thumb.addEventListener('mouseenter', () => { if (!dragging) { show(thumb, false); show(thumbHover, true); } });
      thumb.addEventListener('mouseleave', () => { if (!dragging) { show(thumb, true); show(thumbHover, false); } });
      const start = (e) => { dragging = true; show(thumb, false); show(thumbHover, true); e.preventDefault(); };
      thumb.addEventListener('pointerdown', start);
      if (thumbHover) thumbHover.addEventListener('pointerdown', start);
      window.addEventListener('pointermove', (e) => { if (dragging) setFromT((svgPoint(e).x - x1) / (x2 - x1)); });
      window.addEventListener('pointerup', () => { if (dragging) { dragging = false; show(thumb, true); show(thumbHover, false); } });
    }

    // ----- zoom + pan -----
    function clampPan() {
      state.offX = Math.min(box.x * (1 - state.scale), Math.max((box.x + box.w) * (1 - state.scale), state.offX));
      state.offY = Math.min(box.y * (1 - state.scale), Math.max((box.y + box.h) * (1 - state.scale), state.offY));
    }
    function applyTransform() {
      zoomLayer.setAttribute('transform', `translate(${state.offX}, ${state.offY}) scale(${state.scale})`);
    }
    // keeps the content point under `anchor` visually fixed while scaling
    function zoomAt(nextScaleRaw, anchor) {
      const next = Math.max(1, nextScaleRaw);
      const ratio = next / state.scale;
      state.offX = anchor.x - ratio * (anchor.x - state.offX);
      state.offY = anchor.y - ratio * (anchor.y - state.offY);
      state.scale = next;
      clampPan();
      applyTransform();
    }

    workspace.style.cursor = 'grab';
    let panning = false, last = null;
    workspace.addEventListener('pointerdown', (e) => { panning = true; last = svgPoint(e); workspace.setPointerCapture(e.pointerId); });
    workspace.addEventListener('pointermove', (e) => {
      if (!panning) return;
      const p = svgPoint(e);
      state.offX += p.x - last.x; state.offY += p.y - last.y;
      last = p;
      clampPan(); applyTransform();
    });
    const stopPan = () => { panning = false; };
    workspace.addEventListener('pointerup', stopPan);
    workspace.addEventListener('pointercancel', stopPan);
    workspace.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoomAt(state.scale * (e.deltaY > 0 ? 1 / 1.15 : 1.15), svgPoint(e)); // toward the cursor
    }, { passive: false });

    applyTransform();

    // shared +/- buttons zoom toward the middle of the map box
    return {
      indexPage, workspace,
      zoomBy: (factor) => zoomAt(state.scale * factor, boxCenter),
      reset: () => { state.scale = 1; state.offX = 0; state.offY = 0; applyTransform(); },
    };
  }

  const maps = {};
  for (const [key, cfg] of Object.entries(MAPS)) maps[key] = setupMap(key, cfg);

  // ---------- routing: adventures list <-> one open map ----------
  const adventuresPage = byId('adventures_index_page_main_page_at_launch_');
  const blankWorkspace = byId('workspace_map_container_blank_when_no_map_is_visible_');
  const zoomTools = byId('map_zoom_tools');

  function showAdventures() {
    active = null;
    show(adventuresPage, true); show(blankWorkspace, true);
    for (const m of Object.values(maps)) { show(m.indexPage, false); show(m.workspace, false); }
    show(zoomTools, false);
    hoverResets.forEach((r) => r()); // no button left stuck in its hover look
  }
  function openMap(key) {
    active = maps[key];
    show(adventuresPage, false); show(blankWorkspace, false);
    for (const [k, m] of Object.entries(maps)) { show(m.indexPage, k === key); show(m.workspace, k === key); }
    show(zoomTools, true);
    hoverResets.forEach((r) => r());
  }

  for (const [key, cfg] of Object.entries(MAPS)) {
    wireButton(cfg.card, cfg.cardHover, () => openMap(key));
  }
  // back buttons: the wrapper group is the click target; normal/hover art swap inside it
  for (const cfg of Object.values(MAPS)) {
    const back = byId(cfg.back), n = byId(cfg.backNormal), h = byId(cfg.backHover);
    if (!back) continue;
    const reset = () => { show(n, true); show(h, false); };
    reset(); hoverResets.push(reset);
    back.style.cursor = 'pointer';
    back.addEventListener('mouseenter', () => { show(n, false); show(h, true); });
    back.addEventListener('mouseleave', reset);
    back.addEventListener('click', showAdventures);
  }

  wireButton('Zoom_in_button', 'zoom_in_button_hover', () => active && active.zoomBy(1.3));
  wireButton('zoom_out_button', 'zoom_out_button_hover', () => active && active.zoomBy(1 / 1.3));
  wireButton('reset_zoom_button', 'reset_zoom_button_hover', () => active && active.reset());
  wireButton('Credits_container', 'Credits_container_hover', () => window.open(CREDITS_URL, '_blank'));

  showAdventures(); // last on purpose: everything above gets measured while still visible
})();
