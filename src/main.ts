import Phaser from 'phaser';
import './style.css';
import { AtlasScene } from './cog/AtlasScene.ts';
import { Expedition, loadGame, saveGame } from './cog/expedition.ts';
import { LOADOUTS, SITE_LABEL, TERRAIN, type LoadoutId } from './cog/data.ts';
import { passable, siteAt, tileAt } from './cog/world.ts';
import { distance, findPath, same, type Point } from './game/grid.ts';

const paths: Record<string, string> = {
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  food: '<path d="M6 21 18 3M8 17c-7-1-5-6-5-6 5-1 7 2 5 6Zm4-6c-7-1-5-6-5-6 5-1 7 2 5 6Zm-3 4c0-6 6-6 6-6 2 5-2 7-6 6Zm5-7c0-6 6-6 6-6 2 5-2 7-6 6Z"/>',
  heart: '<path d="M20.8 4.6c-2.4-2.1-5.9-1.5-8.8 1.6C9.1 3.1 5.6 2.5 3.2 4.6.5 7 .8 11 4 14l8 7 8-7c3.2-3 3.5-7 .8-9.4Z"/>',
  people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4m2-17a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5v2"/>',
  coin: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 8v8m-2-6h3m-3 4h3"/>',
  book: '<path d="M12 5c-3-3-7-3-10-2v16c3-1 7-1 10 2 3-3 7-3 10-2V3c-3-1-7-1-10 2Zm0 0v16"/>',
  flag: '<path d="M5 22V3m0 0c5-5 9 5 15 0v11c-6 5-10-5-15 0"/>',
  tool: '<path d="m4 21 10-10M14 3a6 6 0 0 0-5 9l4 4a6 6 0 0 0 8-6l-5 2-4-4 2-5Z"/>',
  cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m8 12 3 3 5-6"/>',
  arrow: '<path d="M3 12h17m-6-6 6 6-6 6"/>',
  anchor: '<path d="M12 7v15M5 12H2c0 6 5 10 10 10s10-4 10-10h-3M7 10h10"/><circle cx="12" cy="4" r="3"/>',
  mountain: '<path d="m1 21 8-16 6 11 3-6 5 11Zm5-10 3 2 3-2"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  close: '<path d="m5 5 14 14M19 5 5 19"/>',
};
const icon = (name: string, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.compass}</svg>`;
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const app = $('#app');

app.innerHTML = `
  <header class="masthead">
    <a class="brand" href="#" aria-label="Cities of Gold — center atlas"><span class="brand-mark">${icon('sun')}</span><span>COG<small>CITIES OF GOLD</small></span></a>
    <nav aria-label="Main navigation"><button class="nav-link active" id="atlas-tab">THE EXPEDITION</button><button class="nav-link" id="guide">FIELD GUIDE ${icon('book')}</button></nav>
    <div class="header-right"><span class="save-status" id="save-status">LOCAL EXPEDITION</span><button class="icon-button" id="audio" aria-label="Enable ambient sound" title="Enable ambient sound">${icon('sound')}</button><button class="new-voyage" id="new-voyage">New voyage ${icon('arrow')}</button></div>
  </header>
  <main class="workspace">
    <aside class="expedition-panel">
      <div class="eyebrow">ROYAL CARTOGRAPHIC SOCIETY</div>
      <div class="expedition-emblem">${icon('compass')}<span>EST. 1538</span></div>
      <h1>The Sunward<br>Expedition</h1><p class="muted expedition-subtitle">An atlas of the unknown.</p>
      <div class="fine-rule"></div>
      <div class="section-label">THE COMPANY <span id="level">RANK I</span></div>
      <div id="company"></div>
      <div class="fine-rule"></div>
      <div class="section-label">THE SUN SEALS <span id="seal-count">0 / 3</span></div>
      <div id="seals"></div>
      <div class="objective" id="objective"></div>
      <div class="sidebar-bottom"><span class="eyebrow">YOUR CHARTER</span><p>Leave with curiosity.<br>Return with a story.</p><div>${icon('anchor')} <span>THE MARIGOLD · 12 HANDS</span></div></div>
    </aside>
    <section class="atlas-panel" aria-label="Expedition map and actions">
      <div class="atlas-heading"><div><div class="eyebrow">TERRA INCOGNITA <span class="tiny-diamond">◆</span> THE NEW WORLD</div><h2>The Verdant Coast</h2></div><div class="day-stamp"><span>EXPEDITION DAY</span><strong id="day">01</strong></div></div>
      <div class="resource-bar" id="resources"></div>
      <div class="map-frame">
        <div id="map" tabindex="0" role="application" aria-label="Expedition atlas. Arrow keys or WASD to move. Click a tile to inspect it. Drag to pan. Scroll to zoom."></div>
        <div class="map-topline"><span>${icon('compass')} EXPLORATION CHART <b id="map-seed"></b></span><span id="charted">0% CHARTED</span></div>
        <div class="compass-rose" aria-hidden="true"><span>N</span><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="26"/><circle cx="40" cy="40" r="22"/><path d="m40 5 7 28 28 7-28 7-7 28-7-28L5 40l28-7Z"/><path d="m40 5 0 35 7-7ZM5 40h35l-7 7Zm35 0v35l7-28Zm0 0h35l-28-7Z" class="filled"/></svg></div>
        <div class="map-controls"><button id="zoom-in" aria-label="Zoom in">+</button><button id="zoom-out" aria-label="Zoom out">−</button><button id="recenter" aria-label="Center on expedition" title="Center on expedition">${icon('compass')}</button></div>
        <div class="map-caption"><span class="live-dot"></span> <span id="map-caption">YOUR NEXT CHAPTER IS OUT THERE</span></div>
      </div>
      <div class="action-deck" id="actions"></div>
      <div class="keyboard-hint"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows to move</span><span>Click to inspect <i>·</i> Drag to pan <i>·</i> <kbd>?</kbd> field guide</span></div>
    </section>
    <aside class="journal-panel">
      <div class="journal-heading"><div class="eyebrow">FROM THE FIELD</div><h2>Captain’s journal ${icon('book')}</h2></div>
      <div class="location-card" id="location"></div>
      <div class="journal-label">THE STORY SO FAR <span class="live-dot"></span></div>
      <div id="journal" class="journal-entries" aria-live="polite" aria-relevant="additions"></div>
      <div class="mini-heading"><span>THE KNOWN WORLD</span><span id="coordinates">08° E · 16° S</span></div><canvas id="minimap" width="210" height="150" aria-label="Map of explored territory"></canvas>
      <div class="journal-footnote">“Not all treasure glitters.”</div>
    </aside>
  </main>
  <footer><span>COG <span class="tiny-diamond">◆</span> CITIES OF GOLD</span><span>A journey measured in discoveries.</span><span id="footer-status">ONE STEP. ONE TURN. A WORLD TO FIND.</span></footer>
  <div id="modal-root"></div><div id="toast" role="status"></div>`;

let expedition = new Expedition(undefined, loadGame());
let selection: Point | null = null;
let selectedLoadout: LoadoutId = 'balanced';
let selectedCargo: 'food' | 'tools' | 'medicine' = 'food';
let pendingOutfit = expedition.state.phase === 'outfitting';
let modalKind = '';
let toastTimer: ReturnType<typeof setTimeout>;
let voyageTimer: ReturnType<typeof setTimeout> | undefined;
let sound = false;
let audio: AudioContext | undefined;
let previousFocus: HTMLElement | null = null;
const scene = new AtlasScene(expedition, selectTile);
const game = new Phaser.Game({ type: Phaser.AUTO, parent: 'map', backgroundColor: '#304d4d', antialias: true, scale: { mode: Phaser.Scale.RESIZE, width: $('#map').clientWidth, height: $('#map').clientHeight }, scene: [scene], input: { mouse: { preventDefaultWheel: true } }, render: { roundPixels: true } });
const observer = new ResizeObserver(() => { const box = $('#map'); game.scale.resize(box.clientWidth, box.clientHeight); });
observer.observe($('#map'));

function tone(): void {
  if (!sound) return;
  try {
    audio ??= new AudioContext(); void audio.resume();
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = 240 + expedition.state.seals * 80;
    gain.gain.setValueAtTime(.035, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .25);
    oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + .25);
  } catch { sound = false; }
}
function toast(message: string): void { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3600); }
function bindModel(): void {
  expedition.onChange = () => {
    const saved = saveGame(expedition.state);
    $('#save-status').textContent = saved ? 'SAVED ON THIS DEVICE' : 'SAVE UNAVAILABLE';
    if (!saved) toast('Device storage is unavailable. This expedition will last for this session.');
    render(); tone();
  };
}
bindModel();

function render(): void {
  const s = expedition.state;
  $('#day').textContent = String(s.day + 1).padStart(2, '0');
  $('#level').textContent = `RANK ${expedition.level}`;
  $('#seal-count').textContent = `${s.seals} / 3`;
  $('#map-seed').textContent = `NO. ${String(s.world.seed).padStart(6, '0')}`;
  $('#charted').textContent = `${expedition.explored}% CHARTED`;
  $('#coordinates').textContent = `${String(s.player.x).padStart(2, '0')}° E · ${String(s.player.y).padStart(2, '0')}° S`;
  $('#company').innerHTML = `<div class="captain"><span class="captain-avatar">${icon('people')}</span><div><strong>Captain, the course is yours.</strong><small>${escape(LOADOUTS.find(l => l.id === s.loadout)!.name)} · ${s.crew} crew</small></div></div>
    <div class="meter-label"><span>Company health</span><b class="${s.health < 30 ? 'danger' : ''}">${s.health}%</b></div><div class="meter"><span style="width:${s.health}%"></span></div>
    <div class="meter-label"><span>Morale</span><b>${s.morale}%</b></div><div class="meter gold"><span style="width:${s.morale}%"></span></div>
    <div class="company-stats"><span>${icon('shield')} ${expedition.strength} strength</span><span>${icon('eye')} ${expedition.radius} sight</span></div>
    <div class="xp-label"><span>EXPERIENCE</span><span>${s.xp % 80} / 80</span></div><div class="meter xp"><span style="width:${s.xp % 80 / 80 * 100}%"></span></div>`;
  $('#seals').innerHTML = s.world.sites.filter(site => site.kind === 'city').map((site, i) => `<div class="seal-row ${site.resolved ? 'complete' : ''}"><span class="seal-icon">${icon('sun')}</span><div><strong>${site.resolved || tileAt(s.world, site)?.seen ? escape(site.name.split(' · ')[0]) : ['The first light', 'The river’s song', 'The sun’s heart'][i]}</strong><small>${site.resolved ? 'SUN SEAL RECOVERED' : tileAt(s.world, site)?.seen ? 'MARKED ON YOUR ATLAS' : 'WAITING TO BE DISCOVERED'}</small></div><span>${site.resolved ? '✓' : '·'}</span></div>`).join('');
  $('#objective').innerHTML = `${icon(s.seals === 3 ? 'anchor' : 'flag')}<div><strong>${s.seals === 3 ? 'Bring the story home' : 'Follow the old sun roads'}</strong><p>${s.seals === 3 ? 'Return to the Marigold on the western coast and set sail.' : 'Find three golden cities. Study ruins for clues. Earn trust in settlements.'}</p></div>`;
  const resource = (name: string, label: string, value: number, detail: string, low = false) => `<div class="resource ${low ? 'low' : ''}" title="${detail}">${icon(name)}<div><span>${label}</span><strong>${value}<small>${detail}</small></strong></div></div>`;
  $('#resources').innerHTML = resource('food', 'PROVISIONS', s.supplies, '1–2 / turn', s.supplies < 20) + resource('tool', 'TOOLS', s.tools, 'in the hold') + resource('cross', 'MEDICINE', s.medicine, 'doses') + resource('coin', 'GOLD', s.gold, `+${s.banked} secured`);
  renderLocation(); renderActions(); renderJournal(); drawMinimap(); scene.refresh();
  $('#map-caption').textContent = s.seals === 3 ? 'THREE SEALS FOUND · SET A COURSE FOR HOME' : s.supplies < 20 ? 'PROVISIONS LOW · FORAGE OR FIND A SETTLEMENT' : 'THE VERDANT COAST · UNCHARTED INTERIOR';
  if (pendingOutfit && modalKind !== 'outfit') showOutfit();
  else if (s.phase === 'voyage' && modalKind !== 'voyage') showVoyage();
  else if (['won', 'lost'].includes(s.phase) && modalKind !== 'ending') showEnding();
}

function selectTile(p: Point): void {
  if (modalKind) return;
  if (same(p, expedition.state.player)) { selection = null; renderLocation(); renderActions(); return; }
  if (distance(p, expedition.state.player) === 1 && passable(expedition.state.world, p)) {
    selection = null; expedition.move(p); return;
  }
  selection = p; renderLocation(); renderActions();
}
function renderLocation(): void {
  const s = expedition.state, p = selection ?? s.player, tile = tileAt(s.world, p)!;
  const known = tile.seen, site = known ? siteAt(s.world, p) : undefined;
  const enemy = s.world.enemies.find(e => e.alive && same(e, p) && expedition.visible(e));
  const heading = known ? site?.name ?? TERRAIN[tile.terrain].name : 'Beyond the chart';
  const description = known ? site?.description ?? TERRAIN[tile.terrain].description : 'The atlas ends here. Travel into the unknown to discover what lies ahead.';
  $('#location').innerHTML = `<div class="location-symbol">${icon(enemy ? 'shield' : site?.kind === 'ship' ? 'anchor' : site?.kind === 'city' ? 'sun' : site ? 'flag' : 'mountain')}</div><div class="eyebrow">${selection ? 'ON YOUR CHART' : 'YOUR LOCATION'} ${site ? `· ${SITE_LABEL[site.kind].toUpperCase()}` : ''}</div><h3>${escape(heading)}</h3><p>${escape(description)}</p>${enemy ? `<div class="danger">${escape(enemy.name)} · strength ${enemy.strength}</div>` : ''}${selection ? '<button class="text-button" id="clear-selection">Back to your expedition ↗</button>' : ''}`;
  document.querySelector('#clear-selection')?.addEventListener('click', () => { selection = null; renderLocation(); renderActions(); });
}
function renderActions(): void {
  const s = expedition.state;
  if (s.phase === 'won' || s.phase === 'lost') {
    $('#actions').innerHTML = `<div class="action-title"><span class="eyebrow">THE EXPEDITION CHRONICLE</span><strong>A chapter complete</strong><small>Your final chart is yours to explore.</small></div><button class="action primary" id="report">${icon('book')}<span>Read your expedition report<small>${expedition.score.toLocaleString()} legacy · ${s.seals} sun seals</small></span>${icon('arrow')}</button>`;
    $('#report').onclick = showEnding; return;
  }
  if (selection && tileAt(s.world, selection)?.seen && passable(s.world, selection)) {
    const target = { ...selection };
    const path = findPath(s.player, target, p => passable(s.world, p) && !!tileAt(s.world, p)?.seen);
    $('#actions').innerHTML = `<div class="action-title"><span class="eyebrow">PLOT YOUR COURSE</span><strong>${path ? `${path.length} turns away` : 'No charted route'}</strong><small>Travel advances one turn at a time.</small></div><button class="action primary" id="step-toward" ${path?.length ? '' : 'disabled'}>${icon('compass')}<span>Take the next step<small>Follow the shortest charted route</small></span>${icon('arrow')}</button>`;
    $('#step-toward').addEventListener('click', () => { expedition.stepToward(target); if (same(expedition.state.player, target)) selection = null; renderLocation(); renderActions(); });
    return;
  }
  const actions = expedition.actions();
  const site = expedition.currentSite;
  const featured = site ? actions.find(a => !['forage', 'camp', 'medicine', 'wait'].includes(a.id) && a.enabled) : actions.find(a => a.id === 'forage' && a.enabled) ?? actions.find(a => a.id === 'camp' && a.enabled);
  const primary = featured ?? actions[actions.length - 1];
  $('#actions').innerHTML = `<div class="action-title"><span class="eyebrow">${site ? SITE_LABEL[site.kind].toUpperCase() : 'EXPEDITION ORDERS'}</span><strong>${site ? escape(site.name.split(' · ')[0]) : 'A moment to prepare'}</strong><small>Each order takes one turn.</small></div><div class="action-options"><button class="action primary" data-action="${primary.id}" ${primary.enabled ? '' : 'disabled'}>${icon(primary.id === 'seal' ? 'sun' : primary.id === 'forage' ? 'food' : site?.kind === 'ship' ? 'anchor' : 'flag')}<span>${primary.label}<small>${primary.detail}</small></span>${icon('arrow')}</button><button class="action secondary" id="all-orders">All orders <span>${actions.filter(a => a.enabled).length}</span></button></div>`;
  document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b => b.addEventListener('click', () => perform(b.dataset.action!)));
  $('#all-orders').addEventListener('click', showOrders);
}
function perform(id: string): void {
  if (id === 'finish' && expedition.state.seals < 3) {
    openModal('confirm', `<div class="small-modal"><span class="eyebrow">A COURSE FOR HOME</span><h2>Every journey has its own ending.</h2><p>You have recovered ${expedition.state.seals} of 3 sun seals. You can finish now and record your discoveries, or keep exploring.</p><button class="button gold-button" id="confirm-finish">Return home ${icon('anchor')}</button><button class="button subtle" data-close>Keep exploring</button></div>`);
    $('#confirm-finish').onclick = () => { closeModal(); expedition.act('finish'); }; return;
  }
  closeModal(); if (!expedition.act(id)) toast('That order is not available right now.');
}
function renderJournal(): void {
  const logs = expedition.state.logs.slice(0, 12);
  $('#journal').innerHTML = logs.length ? logs.map((log, i) => `<article class="journal-entry ${log.kind} ${i === 0 ? 'latest' : ''}"><span class="journal-dot"></span><div class="entry-day">DAY ${String(log.day).padStart(2, '0')}${log.kind === 'discovery' ? ' · DISCOVERY' : log.kind === 'danger' ? ' · ENCOUNTER' : ''}</div><p>${escape(log.text)}</p></article>`).join('') : '<article class="journal-entry"><span class="journal-dot"></span><div class="entry-day">THE PROLOGUE</div><p>A blank chart. A willing crew. A world waiting to be known.</p></article>';
}
function drawMinimap(): void {
  const canvas = $<HTMLCanvasElement>('#minimap'), ctx = canvas.getContext('2d')!, s = expedition.state;
  ctx.fillStyle = '#d9d4b7'; ctx.fillRect(0, 0, 210, 150);
  s.world.tiles.forEach((tile, i) => {
    if (!tile.seen) return;
    ctx.fillStyle = `#${TERRAIN[tile.terrain].color.toString(16).padStart(6, '0')}`;
    ctx.fillRect(i % s.world.width * 5, Math.floor(i / s.world.width) * 5, 5, 5);
  });
  for (const site of s.world.sites) if (tileAt(s.world, site)?.seen) { ctx.fillStyle = site.kind === 'city' ? '#b27a28' : '#f7efcf'; ctx.fillRect(site.x * 5 + 1, site.y * 5 + 1, 3, 3); }
  ctx.strokeStyle = '#ba633e'; ctx.lineWidth = 1.5; ctx.strokeRect(s.player.x * 5 - 2, s.player.y * 5 - 2, 9, 9);
  ctx.fillStyle = '#ba633e'; ctx.fillRect(s.player.x * 5 + 1, s.player.y * 5 + 1, 3, 3);
}

function openModal(kind: string, html: string, dismissible = true): void {
  if (!modalKind) previousFocus = document.activeElement as HTMLElement;
  modalKind = kind;
  $('#modal-root').innerHTML = `<div class="modal-backdrop"><section class="modal ${kind}-modal" role="dialog" aria-modal="true" aria-label="${kind === 'outfit' ? 'Outfit your expedition' : kind === 'guide' ? 'Field guide' : kind === 'orders' ? 'Expedition orders' : kind === 'ending' ? 'Expedition report' : kind === 'voyage' ? 'Crossing the ocean' : 'Confirm return home'}" tabindex="-1">${dismissible ? `<button class="modal-close icon-button" data-close aria-label="Close dialog">${icon('close')}</button>` : ''}${html}</section></div>`;
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
  $('.modal').focus();
}
function closeModal(): void {
  if (['voyage', 'ending'].includes(modalKind) || modalKind === 'outfit' && expedition.state.phase === 'outfitting') return;
  if (modalKind === 'outfit') pendingOutfit = false;
  modalKind = ''; $('#modal-root').innerHTML = ''; previousFocus?.focus();
}
const shipArt = `<svg class="ship-art" viewBox="0 0 400 350" fill="none" aria-hidden="true"><circle cx="205" cy="125" r="86" fill="#d6b976" opacity=".15"/><circle cx="205" cy="125" r="68" stroke="#c9ac6c" opacity=".35"/><path d="M205 38v20m0 134v20m-87-87h20m134 0h20M143 63l14 14m96 96 14 14m-124 0 14-14m96-96 14-14" stroke="#c9ac6c" opacity=".3"/><path d="M45 259c30-12 45 12 75 0s45 12 75 0 45 12 75 0 45 12 75 0M25 281c30-12 45 12 75 0s45 12 75 0 45 12 75 0 45 12 75 0M65 303c30-12 45 12 75 0s45 12 75 0 45 12 75 0" stroke="#b6c1aa" opacity=".35"/><g class="illustrated-ship"><path d="m100 228 197-6-35 36H140Z" fill="#a6794c"/><path d="m105 229 186-4-12 13-159 4Z" fill="#d4b378"/><path d="M200 72v160m57-107v101m-108-90v95" stroke="#d1bc8e" stroke-width="3"/><path d="M194 91c-46 27-60 58-64 99l64-8Z" fill="#ebdbad"/><path d="M207 92c31 22 37 48 34 83l-34 7Z" fill="#d9c38e"/><path d="M252 139c-19 17-29 34-29 61l29-6Z" fill="#ece1bd"/><path d="m200 70 32 9-32 10Z" fill="#bc754b"/><path d="M145 148c-16 15-23 33-22 48l22-3Z" fill="#ccbb8b"/><path d="M164 247h69" stroke="#795d3e"/><circle cx="149" cy="243" r="2" fill="#544d36"/><circle cx="249" cy="239" r="2" fill="#544d36"/></g><path d="m58 133 8-3 8 3m222-23 8-3 8 3m-14 52 8-3 8 3" stroke="#b6c1aa" opacity=".5"/></svg>`;

function showOutfit(): void {
  pendingOutfit = true;
  const resumable = expedition.state.phase !== 'outfitting';
  openModal('outfit', `<div class="outfit-story"><div class="eyebrow">SEVILLE, 1538 · A NEW CHAPTER</div><span class="outfit-sun">${icon('sun')}</span><h2>Somewhere,<br>the sun turns<br>everything to gold.</h2><p>Three cities. One uncharted continent.<br>And a little ship called the Marigold.</p>${shipArt}<div class="outfit-quote">“The finest thing we bring home<br>may be the story.”</div></div><div class="outfit-controls"><span class="eyebrow">YOUR EXPEDITION STARTS HERE</span><h2>Make ready for<br>the unknown.</h2><p class="outfit-intro">Choose your company. Pack with care.<br>The next horizon belongs to you.</p><div class="section-label">01 <span>CHOOSE YOUR COMPANY</span></div><div class="loadout-cards">${LOADOUTS.map(l => `<button class="loadout-card ${selectedLoadout === l.id ? 'selected' : ''}" data-loadout="${l.id}" aria-pressed="${selectedLoadout === l.id}">${icon(l.icon)}<span><strong>${l.name}</strong><small>${l.supplies} provisions · ${l.soldiers} guards · ${l.scouts} scouts</small></span><span class="radio-dot"></span></button>`).join('')}</div><div class="section-label cargo-label">02 <span>ONE EXTRA CRATE</span></div><div class="cargo-options">${[{ id: 'food', icon: 'food', title: 'Provisions', amount: '+20 food' }, { id: 'tools', icon: 'tool', title: 'Tools', amount: '+4 tools' }, { id: 'medicine', icon: 'cross', title: 'Medicine', amount: '+2 doses' }].map(c => `<button class="cargo ${selectedCargo === c.id ? 'selected' : ''}" data-cargo="${c.id}" aria-pressed="${selectedCargo === c.id}">${icon(c.icon)}<strong>${c.title}</strong><small>${c.amount}</small></button>`).join('')}</div><div class="seed-row"><label for="seed-input">CHART NUMBER</label><input id="seed-input" type="number" min="1" max="999999" value="${resumable ? Math.floor(Math.random() * 999999) + 1 : expedition.state.world.seed}" aria-label="World seed, from 1 to 999999"/><span>Same chart, same world.</span></div><button class="button gold-button embark" id="embark">Set sail for the New World ${icon('arrow')}</button><p class="save-note">${icon('shield')} Progress saves automatically on this device.</p></div>`, resumable);
  document.querySelectorAll<HTMLButtonElement>('[data-loadout]').forEach(b => b.onclick = () => { selectedLoadout = b.dataset.loadout as LoadoutId; document.querySelectorAll('[data-loadout]').forEach(el => { const selected = (el as HTMLElement).dataset.loadout === selectedLoadout; el.classList.toggle('selected', selected); el.setAttribute('aria-pressed', String(selected)); }); });
  document.querySelectorAll<HTMLButtonElement>('[data-cargo]').forEach(b => b.onclick = () => { selectedCargo = b.dataset.cargo as typeof selectedCargo; document.querySelectorAll('[data-cargo]').forEach(el => { const selected = (el as HTMLElement).dataset.cargo === selectedCargo; el.classList.toggle('selected', selected); el.setAttribute('aria-pressed', String(selected)); }); });
  $('#embark').onclick = () => {
    const input = $<HTMLInputElement>('#seed-input');
    if (!input.checkValidity() || !input.value) { input.reportValidity(); return; }
    expedition = new Expedition(Number(input.value)); selection = null; pendingOutfit = false; bindModel(); scene.setExpedition(expedition);
    modalKind = ''; expedition.outfit(selectedLoadout, selectedCargo);
  };
}
function showVoyage(): void {
  openModal('voyage', `<div class="voyage-content"><span class="eyebrow">THE ATLANTIC CROSSING</span><h2>Beyond the familiar shore.</h2>${shipArt}<div class="voyage-track"><span></span></div><p id="voyage-story">The harbor falls away. A fair wind fills the sails.</p><button class="button gold-button" id="land">Make landfall ${icon('anchor')}</button><small>A new world waits on the other side.</small></div>`, false);
  $('#land').onclick = () => { clearTimeout(voyageTimer); modalKind = ''; $('#modal-root').innerHTML = ''; expedition.land(); $('#map').focus(); };
  clearTimeout(voyageTimer);
  voyageTimer = setTimeout(() => { if (modalKind === 'voyage') $('#voyage-story').textContent = 'Green birds circle the mast. The Verdant Coast rises from the sea.'; }, 3500);
}
function showOrders(): void {
  if (expedition.state.phase !== 'exploring') return;
  openModal('orders', `<div class="small-modal"><span class="eyebrow">AT YOUR COMMAND · DAY ${expedition.state.day + 1}</span><h2>${escape(expedition.currentSite?.name ?? 'Expedition orders')}</h2><p>A moment of preparation can change the whole journey. Every order advances one turn.</p><div class="order-list">${expedition.actions().map(a => `<button data-order="${a.id}" ${a.enabled ? '' : 'disabled'}><span><strong>${a.label}</strong><small>${a.detail}</small></span>${icon('arrow')}</button>`).join('')}</div></div>`);
  document.querySelectorAll<HTMLButtonElement>('[data-order]').forEach(b => b.onclick = () => perform(b.dataset.order!));
}
function showGuide(): void {
  if (modalKind) return;
  openModal('guide', `<div class="small-modal guide-content"><span class="eyebrow">A COMPANION FOR THE CURIOUS</span><h2>The expedition field guide.</h2><p>Recover the sun seals of <b>Ixim, Tayrona, and Manoa</b>, then return to your ship on the western coast. You may return early with a smaller legacy.</p><div class="guide-grid"><article>${icon('compass')}<h3>One step, one turn.</h3><p>Move with arrows or WASD, or click an adjacent cell. Select a distant charted cell to plan a route. Drag the map to pan; scroll to zoom.</p></article><article>${icon('food')}<h3>Live off the land.</h3><p>Every turn uses provisions. Jungle, hills, and rivers can cost two. Forage on fresh ground, trade at settlements, and camp to heal.</p></article><article>${icon('people')}<h3>Arrive with respect.</h3><p>Exchange stories in two settlements to earn trust. Trust lets you recover sun seals without spending tools. Help harvests to earn food and gold.</p></article><article>${icon('shield')}<h3>Watch the tree line.</h3><p>Wildlife and rivals pursue nearby travelers. Walk into a threat to confront it. Guards and rank reduce wounds. Landmarks are safe from pursuit.</p></article><article>${icon('sun')}<h3>Follow the old atlas.</h3><p>Study ruins using one tool to reveal a city. Each sun seal costs two tools unless you have two trust. Ruins and cities reward gold and experience.</p></article><article>${icon('anchor')}<h3>Bring your story home.</h3><p>Bank treasure at the Marigold and sail home from its orders. Your legacy reflects seals, gold, trust, surviving crew, and charted land.</p></article></div><div class="guide-keys"><kbd>C</kbd> Camp <kbd>F</kbd> Forage <kbd>E</kbd> Orders <kbd>Space</kbd> Wait <kbd>R</kbd> Recenter <kbd>?</kbd> Guide</div><p class="small-print">Saves stay in this browser. Start another voyage with the same chart number to revisit its geography. Sound is optional.</p><button class="button gold-button" data-close>Back to the atlas ${icon('arrow')}</button></div>`);
}
function showEnding(): void {
  const s = expedition.state;
  openModal('ending', `<div class="small-modal ending-content"><span class="ending-sun">${icon(s.phase === 'lost' ? 'compass' : 'sun')}</span><span class="eyebrow">THE EXPEDITION CHRONICLE · CHART ${s.world.seed}</span><h2>${s.phase === 'lost' ? 'A story left unfinished.' : s.seals === 3 ? 'You brought the sun home.' : 'The horizon will remember.'}</h2><p>${escape(s.ending)}</p><div class="ending-score"><span>YOUR LEGACY</span><strong>${expedition.score.toLocaleString()}</strong><small>${s.seals === 3 ? 'KEEPER OF THE SUN ATLAS' : s.phase === 'lost' ? 'A BRAVE FIRST CHAPTER' : 'EXPLORER OF THE VERDANT COAST'}</small></div><div class="ending-stats"><span><b>${s.seals}/3</b>Sun seals</span><span><b>${s.day}</b>Turns</span><span><b>${expedition.explored}%</b>Charted</span><span><b>${s.banked + s.gold}</b>Gold</span></div><button class="button gold-button" id="another">Write another chapter ${icon('arrow')}</button><button class="button subtle" id="view-chart">View your final chart</button></div>`, false);
  $('#another').onclick = () => { modalKind = ''; pendingOutfit = true; showOutfit(); };
  $('#view-chart').onclick = () => { modalKind = ''; $('#modal-root').innerHTML = ''; $('#map').focus(); toast('Your final chart. Start a new voyage whenever you’re ready.'); };
}

$('#guide').onclick = showGuide;
$('#atlas-tab').onclick = () => { scene.center(); $('#map').focus(); };
$('.brand').onclick = e => { e.preventDefault(); scene.center(); };
$('#new-voyage').onclick = () => { if (!modalKind) showOutfit(); };
$('#recenter').onclick = () => scene.center();
$('#zoom-in').onclick = () => scene.zoom(.15);
$('#zoom-out').onclick = () => scene.zoom(-.15);
$('#audio').onclick = () => { sound = !sound; $('#audio').classList.toggle('enabled', sound); $('#audio').setAttribute('aria-label', sound ? 'Disable expedition sounds' : 'Enable expedition sounds'); $('#audio').title = sound ? 'Disable expedition sounds' : 'Enable expedition sounds'; tone(); toast(sound ? 'Expedition sounds on.' : 'Expedition sounds off.'); };

window.addEventListener('keydown', event => {
  if (modalKind) {
    if (event.key === 'Escape') closeModal();
    if (event.key === 'Tab') {
      const items = [...document.querySelectorAll<HTMLElement>('.modal button:not(:disabled), .modal input')];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === $('.modal'))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === $('.modal'))) { event.preventDefault(); first.focus(); }
    }
    return;
  }
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === '?' || event.key.toLowerCase() === 'h') { showGuide(); return; }
  if (expedition.state.phase !== 'exploring' || event.repeat) return;
  const moves: Record<string, Point> = { ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 } };
  const d = moves[event.key] ?? moves[event.key.toLowerCase()];
  if (d) { event.preventDefault(); selection = null; const p = expedition.state.player; if (!expedition.move({ x: p.x + d.x, y: p.y + d.y })) toast('That way is impassable. Look for another route.'); return; }
  switch (event.key.toLowerCase()) {
    case ' ': if (event.target instanceof HTMLButtonElement) return; event.preventDefault(); perform('wait'); break;
    case 'c': perform('camp'); break;
    case 'f': perform('forage'); break;
    case 'e': showOrders(); break;
    case 'r': scene.center(); break;
    case 'escape': selection = null; renderLocation(); renderActions(); break;
  }
});
render();
