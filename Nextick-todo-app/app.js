/* ══════════════════════════════════════════════════════
   NextTick v3 — app.js
   ══════════════════════════════════════════════════════ */

/* ── 1. Persistence ──────────────────────────────────── */
const LS = {
  get: (k, fb = null) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } },
  set: (k, v)         => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/* ── 2. Settings ─────────────────────────────────────── */
const ACCENT_COLORS = [
  { name: 'Purple', hex: '#7c3aed' }, { name: 'Blue',   hex: '#2563eb' },
  { name: 'Cyan',   hex: '#0891b2' }, { name: 'Green',  hex: '#16a34a' },
  { name: 'Rose',   hex: '#e11d48' }, { name: 'Orange', hex: '#ea580c' },
  { name: 'Pink',   hex: '#db2777' },
];
let settings = LS.get('nt_settings', {
  theme: 'dark', accent: '#7c3aed', fontSize: 'medium', defaultPriority: 'medium',
  pomWork: 25, pomShort: 5, pomLong: 15, pomSound: true, pomAutoStart: false,
});
function saveSettings() { LS.set('nt_settings', settings); }

function applyAccent(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  const root = document.documentElement;
  root.style.setProperty('--accent',       hex);
  root.style.setProperty('--accent-dim',   `rgba(${r},${g},${b},.14)`);
  root.style.setProperty('--accent-hover', `rgb(${Math.max(0,r-22)},${Math.max(0,g-22)},${Math.max(0,b-22)})`);
  root.style.setProperty('--accent-text',  hex);
  // Update orb color
  if (orbs.length) { orbs[0].r = r; orbs[0].g = g; orbs[0].b = b; }
}
function applyTheme(t) {
  const dark = t === 'system' ? window.matchMedia('(prefers-color-scheme: dark)').matches : t === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}
function applyFontSize(s) { document.documentElement.setAttribute('data-size', s); }
function applySettings() { applyTheme(settings.theme); applyAccent(settings.accent); applyFontSize(settings.fontSize); }

/* apply theme + fontSize immediately to avoid flash; accent applied after orbs exist */
applyTheme(settings.theme);
applyFontSize(settings.fontSize);

/* ── 3. Background canvas ────────────────────────────── */
const canvas = document.getElementById('bgCanvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const parseAccentRgb = hex => ({
  r: parseInt(hex.slice(1,3),16),
  g: parseInt(hex.slice(3,5),16),
  b: parseInt(hex.slice(5,7),16),
});
const ar = parseAccentRgb(settings.accent);

const orbs = [
  { x: window.innerWidth*.3, y: window.innerHeight*.3, vx:.25, vy:.18, rad:380, r:ar.r, g:ar.g, b:ar.b, a:.13 },
  { x: window.innerWidth*.75,y: window.innerHeight*.6, vx:-.18,vy:.22, rad:320, r:37,   g:99,   b:235,  a:.10 },
  { x: window.innerWidth*.5, y: window.innerHeight*.8, vx:.15, vy:-.2, rad:280, r:219,  g:39,   b:119,  a:.08 },
  { x: window.innerWidth*.1, y: window.innerHeight*.7, vx:-.22,vy:.15, rad:250, r:16,   g:185,  b:129,  a:.07 },
];

/* orbs now exist — safe to apply accent (updates orb[0] colour) */
applyAccent(settings.accent);

function drawBg() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  orbs.forEach(o => {
    o.x += o.vx; o.y += o.vy;
    if (o.x - o.rad < 0 || o.x + o.rad > canvas.width)  o.vx *= -1;
    if (o.y - o.rad < 0 || o.y + o.rad > canvas.height) o.vy *= -1;
    const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.rad);
    g.addColorStop(0, `rgba(${o.r},${o.g},${o.b},${o.a})`);
    g.addColorStop(1, `rgba(${o.r},${o.g},${o.b},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.rad, 0, Math.PI * 2);
    ctx.fill();
  });
  requestAnimationFrame(drawBg);
}
drawBg();

/* ── 4. Custom cursor ────────────────────────────────── */
const curRing = document.getElementById('curRing');
const curDot  = document.getElementById('curDot');
let mx = -100, my = -100, rx = -100, ry = -100;
let cursorActive = false;

if (window.matchMedia('(pointer: fine)').matches) {
  document.body.classList.add('has-cursor');
  cursorActive = true;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    curDot.style.transform  = `translate(${mx}px,${my}px)`;
  });

  document.addEventListener('mouseover', e => {
    const el = e.target;
    const editable = el.matches('input,textarea,select,[contenteditable]') || el.closest('[contenteditable]');
    const clickable = el.matches('button,a,label,[role="button"],[role="tab"]') || el.closest('button,a,label');
    curDot.style.opacity  = editable ? '0' : '1';
    curRing.style.opacity = editable ? '0' : '1';
    curRing.classList.toggle('hover', !editable && !!clickable);
    document.body.style.cursor = editable ? 'auto' : 'none';
  });

  document.addEventListener('mousedown', () => {
    curRing.classList.add('click');
    setTimeout(() => curRing.classList.remove('click'), 250);
  });

  (function animateCursor() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    curRing.style.transform = `translate(${rx}px,${ry}px)`;
    requestAnimationFrame(animateCursor);
  })();
}

/* ── 5. Live clock ───────────────────────────────────── */
const headerClock = document.getElementById('headerClock');
function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  headerClock.textContent = `${date} · ${time}`;
}
updateClock();
setInterval(updateClock, 30000);

/* ── 6. Tabs ─────────────────────────────────────────── */
let activeTab = LS.get('nt_tab', 'tasks');
const TABS = ['tasks','calendar','notes','pomodoro','settings'];

document.querySelectorAll('[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(name) {
  activeTab = name;
  LS.set('nt_tab', name);
  document.querySelectorAll('[data-tab]').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
  TABS.forEach(t => {
    const el = document.getElementById(`panel-${t}`);
    if (!el) return;
    el.hidden = t !== name;
    el.classList.toggle('active', t === name);
  });
  if (name === 'notes')    { renderNotesList(); initNotesMobileView(); }
  if (name === 'calendar') renderCalendar();
  if (name === 'tasks')    renderSidebarWidgets();
}

/* ══════════════════════════════════════════════════════
   7. TASKS
   ══════════════════════════════════════════════════════ */
let tasks  = LS.get('nt_tasks',  []);
let filter = LS.get('nt_filter', 'all');
let sortBy = LS.get('nt_sort',   'default');
let nextId = LS.get('nt_nextId', 1);
const expandedTasks = new Set();
const PRIORITY_ORDER  = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABELS = { high: 'High', medium: 'Med', low: 'Low' };
const PRIORITIES      = ['medium', 'high', 'low'];

/* DOM */
const todoForm    = document.getElementById('todoForm');
const todoInput   = document.getElementById('todoInput');
const priorityBtn = document.getElementById('priorityBtn');
const dateBtnTgl  = document.getElementById('dateBtnToggle');
const dateInput   = document.getElementById('dateInput');
const clearDateBtn = document.getElementById('clearDateBtn');
const taskMetaRow  = document.getElementById('taskMetaRow');
const tagPreview   = document.getElementById('tagPreview');
const taskList     = document.getElementById('taskList');
const emptyState   = document.getElementById('emptyState');
const emptyMsg     = document.getElementById('emptyMsg');
const taskCount    = document.getElementById('taskCount');
const completedCnt = document.getElementById('completedCount');
const footerBar    = document.getElementById('footerBar');
const clearBtn     = document.getElementById('clearBtn');
const filterBtns   = document.querySelectorAll('.filter-btn');
const taskSearch   = document.getElementById('taskSearch');
const taskSort     = document.getElementById('taskSort');
const sideTaskBadge = document.getElementById('sideTaskBadge');

/* Priority */
priorityBtn.dataset.priority = settings.defaultPriority;
priorityBtn.querySelector('.priority-label').textContent = PRIORITY_LABELS[settings.defaultPriority];
priorityBtn.addEventListener('click', () => {
  const i = PRIORITIES.indexOf(priorityBtn.dataset.priority);
  setPriority(PRIORITIES[(i + 1) % PRIORITIES.length]);
});
function setPriority(p) {
  priorityBtn.dataset.priority = p;
  priorityBtn.querySelector('.priority-label').textContent = PRIORITY_LABELS[p];
}

/* Date toggle */
let pendingDate = '';
dateBtnTgl.addEventListener('click', () => {
  const open = !taskMetaRow.hidden;
  taskMetaRow.hidden = open;
  dateBtnTgl.classList.toggle('active', !open);
  if (!open) dateInput.focus();
});
dateInput.addEventListener('change', () => { pendingDate = dateInput.value; clearDateBtn.hidden = !pendingDate; });
clearDateBtn.addEventListener('click', () => { pendingDate = ''; dateInput.value = ''; clearDateBtn.hidden = true; });

/* Tag preview */
todoInput.addEventListener('input', () => {
  const tags = extractTags(todoInput.value);
  tagPreview.innerHTML = tags.map(t => `<span class="tag-chip">#${t}</span>`).join('');
  if (tags.length && taskMetaRow.hidden) { taskMetaRow.hidden = false; dateBtnTgl.classList.add('active'); }
});

function extractTags(text) { return [...text.matchAll(/#(\w+)/g)].map(m => m[1].toLowerCase()); }
function stripTags(text)   { return text.replace(/#\w+/g, '').trim(); }

/* Add task */
todoForm.addEventListener('submit', e => {
  e.preventDefault();
  const raw = todoInput.value.trim();
  if (!raw) { todoInput.focus(); return; }
  tasks.push({
    id: nextId++, text: stripTags(raw) || raw,
    priority: priorityBtn.dataset.priority, dueDate: pendingDate || null,
    tags: extractTags(raw), completed: false, pinned: false, subtasks: [], createdAt: Date.now(),
  });
  todoInput.value = ''; tagPreview.innerHTML = ''; pendingDate = ''; dateInput.value = '';
  clearDateBtn.hidden = true; taskMetaRow.hidden = true; dateBtnTgl.classList.remove('active');
  setPriority(settings.defaultPriority);
  persistTasks(); renderTasks(); renderSidebarWidgets(); todoInput.focus();
});

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (t) { t.completed = !t.completed; if (t.completed) t.subtasks.forEach(s => s.done = true); }
  persistTasks(); renderTasks(); renderSidebarWidgets();
}
function deleteTask(id)  { tasks = tasks.filter(t => t.id !== id); expandedTasks.delete(id); persistTasks(); renderTasks(); renderSidebarWidgets(); }
function pinTask(id)     { const t = tasks.find(t => t.id === id); if (t) t.pinned = !t.pinned; persistTasks(); renderTasks(); }
function addSubtask(tid, text)       { const t = tasks.find(t => t.id === tid); if (t && text.trim()) { t.subtasks.push({ id: Date.now(), text: text.trim(), done: false }); } persistTasks(); renderTasks(); expandedTasks.add(tid); }
function toggleSubtask(tid, sid)     { const t = tasks.find(t => t.id === tid); if (!t) return; const s = t.subtasks.find(s => s.id === sid); if (s) s.done = !s.done; if (t.subtasks.length && t.subtasks.every(s => s.done)) t.completed = true; persistTasks(); renderTasks(); }
function deleteSubtask(tid, sid)     { const t = tasks.find(t => t.id === tid); if (t) t.subtasks = t.subtasks.filter(s => s.id !== sid); persistTasks(); renderTasks(); }

clearBtn.addEventListener('click', () => { tasks = tasks.filter(t => !t.completed); persistTasks(); renderTasks(); renderSidebarWidgets(); });
filterBtns.forEach(btn => btn.addEventListener('click', () => { filter = btn.dataset.filter; LS.set('nt_filter', filter); renderTasks(); }));
taskSort.value = sortBy;
taskSort.addEventListener('change', () => { sortBy = taskSort.value; LS.set('nt_sort', sortBy); renderTasks(); });
taskSearch.addEventListener('input', () => renderTasks());

function persistTasks() { LS.set('nt_tasks', tasks); LS.set('nt_nextId', nextId); }

/* Date helpers */
function todayStr()    { return new Date().toISOString().split('T')[0]; }
function tomorrowStr() { return new Date(Date.now() + 86400000).toISOString().split('T')[0]; }
function getDueStatus(d) { if (!d) return null; if (d < todayStr()) return 'overdue'; if (d === todayStr()) return 'today'; return 'soon'; }
function fmtDate(d) {
  if (!d) return '';
  if (d === todayStr())    return 'Today';
  if (d === tomorrowStr()) return 'Tomorrow';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* Drag & drop */
let dragSrc = null;
function setupDrag(li, id) {
  li.draggable = true;
  li.addEventListener('dragstart', e => { dragSrc = id; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
  li.addEventListener('dragend',   () => { li.classList.remove('dragging'); dragSrc = null; });
  li.addEventListener('dragover',  e => { e.preventDefault(); li.classList.add('drag-over'); });
  li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
  li.addEventListener('drop',      e => {
    e.preventDefault(); li.classList.remove('drag-over');
    if (dragSrc === null || dragSrc === id) return;
    const from = tasks.findIndex(t => t.id === dragSrc), to = tasks.findIndex(t => t.id === id);
    if (from < 0 || to < 0) return;
    const [m] = tasks.splice(from, 1); tasks.splice(to, 0, m);
    persistTasks(); renderTasks();
  });
}

/* Sort */
function sortedTasks(list) {
  const pinned   = list.filter(t => t.pinned);
  const unpinned = list.filter(t => !t.pinned).sort((a,b) => {
    if (sortBy === 'priority') return (PRIORITY_ORDER[a.priority]||1) - (PRIORITY_ORDER[b.priority]||1);
    if (sortBy === 'dueDate')  { if (!a.dueDate && !b.dueDate) return 0; if (!a.dueDate) return 1; if (!b.dueDate) return -1; return a.dueDate.localeCompare(b.dueDate); }
    if (sortBy === 'name')     return a.text.localeCompare(b.text);
    return 0;
  });
  return [...pinned, ...unpinned];
}

/* Render tasks */
function renderTasks() {
  const q = taskSearch.value.trim().toLowerCase();
  let visible = tasks.filter(t => {
    if (filter === 'active')    return !t.completed;
    if (filter === 'completed') return  t.completed;
    if (filter === 'today')     return t.dueDate === todayStr() && !t.completed;
    if (filter === 'overdue')   return t.dueDate && t.dueDate < todayStr() && !t.completed;
    return true;
  });
  if (q) visible = visible.filter(t => t.text.toLowerCase().includes(q) || t.tags.some(tg => tg.includes(q)) || t.subtasks.some(s => s.text.toLowerCase().includes(q)));
  visible = sortedTasks(visible);

  taskList.innerHTML = '';
  visible.forEach(t => {
    const expanded   = expandedTasks.has(t.id);
    const dueStatus  = getDueStatus(t.dueDate);
    const doneSubs   = t.subtasks.filter(s => s.done).length;

    const li = document.createElement('li');
    li.className = `task-item${t.completed?' completed':''}${expanded?' expanded':''}${t.pinned?' pinned':''}`;
    li.setAttribute('data-id', t.id);
    li.setAttribute('data-priority', t.priority);

    li.innerHTML = `
      <div class="drag-handle" title="Drag to reorder">⠿</div>
      <div class="checkbox" role="checkbox" aria-checked="${t.completed}" tabindex="0">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5 6 4.5 9 10.5 3"/></svg>
      </div>
      <div class="task-body">
        <div class="task-text">${escHtml(t.text)}</div>
        <div class="task-chips">
          ${t.dueDate ? `<span class="task-due ${dueStatus}">${fmtDate(t.dueDate)}</span>` : ''}
          ${t.tags.map(tg => `<span class="task-tag-chip">#${escHtml(tg)}</span>`).join('')}
          ${!t.completed ? `<span class="task-priority-badge ${t.priority}">${PRIORITY_LABELS[t.priority]}</span>` : ''}
        </div>
        <button class="subtask-toggle" type="button">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          ${t.subtasks.length > 0 ? `${doneSubs}/${t.subtasks.length} subtasks` : 'Add subtask'}
        </button>
        <div class="subtask-area" ${!expanded ? 'hidden' : ''}>
          <ul class="subtask-list">
            ${t.subtasks.map(s => `
              <li class="subtask-item${s.done?' done':''}" data-sub="${s.id}">
                <div class="subtask-cb" tabindex="0" role="checkbox" aria-checked="${s.done}">
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5 6 4.5 9 10.5 3"/></svg>
                </div>
                <span class="subtask-text">${escHtml(s.text)}</span>
                <button class="subtask-del" type="button" title="Delete">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </li>`).join('')}
          </ul>
          <form class="subtask-form" data-task="${t.id}">
            <input type="text" class="subtask-input" placeholder="Add subtask…" maxlength="120" autocomplete="off"/>
            <button type="submit" class="subtask-add-btn" title="Add">+</button>
          </form>
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn${t.pinned?' pinned':''}" data-action="pin" title="${t.pinned?'Unpin':'Pin'}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="${t.pinned?'currentColor':'none'}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </button>
        <button class="task-action-btn delete" data-action="delete" title="Delete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`;

    const cb = li.querySelector('.checkbox');
    cb.addEventListener('click', () => toggleTask(t.id));
    cb.addEventListener('keydown', e => { if (e.key===' '||e.key==='Enter'){e.preventDefault();toggleTask(t.id);} });
    li.querySelectorAll('.subtask-cb').forEach(scb => {
      const sid = +scb.closest('.subtask-item').dataset.sub;
      scb.addEventListener('click', () => toggleSubtask(t.id, sid));
      scb.addEventListener('keydown', e => { if(e.key===' '||e.key==='Enter'){e.preventDefault();toggleSubtask(t.id,sid);} });
    });
    li.querySelectorAll('.subtask-del').forEach(del => { const sid = +del.closest('.subtask-item').dataset.sub; del.addEventListener('click', () => deleteSubtask(t.id, sid)); });
    const sf = li.querySelector('.subtask-form');
    sf.addEventListener('submit', e => { e.preventDefault(); const inp = sf.querySelector('.subtask-input'); addSubtask(t.id, inp.value); inp.value = ''; inp.focus(); });
    li.querySelector('.subtask-toggle').addEventListener('click', () => { if(expandedTasks.has(t.id)) expandedTasks.delete(t.id); else expandedTasks.add(t.id); renderTasks(); });
    li.querySelector('[data-action="pin"]').addEventListener('click',    () => pinTask(t.id));
    li.querySelector('[data-action="delete"]').addEventListener('click', () => deleteTask(t.id));
    setupDrag(li, t.id);
    taskList.appendChild(li);
  });

  filterBtns.forEach(btn => { const on = btn.dataset.filter===filter; btn.classList.toggle('active',on); btn.setAttribute('aria-selected',on); });
  const isEmpty = visible.length === 0;
  emptyState.classList.toggle('visible', isEmpty);
  if (isEmpty) emptyMsg.innerHTML = { all: q?`No tasks match "<b>${escHtml(q)}</b>"`:'Nothing here yet.<br>Add your first task!', active:'No active tasks — enjoy!', completed:'No completed tasks yet.', today:'No tasks due today.', overdue:'No overdue tasks!' }[filter] || 'Nothing to show.';

  const active = tasks.filter(t => !t.completed).length, done = tasks.filter(t => t.completed).length;
  taskCount.textContent    = `${active} left`;
  completedCnt.textContent = `${done} done`;
  footerBar.hidden = tasks.length === 0;
  sideTaskBadge.textContent = active || '';
}

/* ══════════════════════════════════════════════════════
   8. SIDEBAR WIDGETS
   ══════════════════════════════════════════════════════ */
let miniCalYear  = new Date().getFullYear();
let miniCalMonth = new Date().getMonth();

function renderSidebarWidgets() {
  renderMiniStats();
  renderMiniCal();
  renderUpcoming();
}

function renderMiniStats() {
  const active  = tasks.filter(t => !t.completed).length;
  const done    = tasks.filter(t =>  t.completed).length;
  const overdue = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr()).length;
  document.getElementById('sw-active').textContent  = active;
  document.getElementById('sw-done').textContent    = done;
  document.getElementById('sw-overdue').textContent = overdue;
}

document.getElementById('mcalPrev').addEventListener('click', () => { miniCalMonth--; if(miniCalMonth<0){miniCalMonth=11;miniCalYear--;} renderMiniCal(); });
document.getElementById('mcalNext').addEventListener('click', () => { miniCalMonth++; if(miniCalMonth>11){miniCalMonth=0;miniCalYear++;} renderMiniCal(); });

function renderMiniCal() {
  const title = new Date(miniCalYear, miniCalMonth, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  document.getElementById('mcalTitle').textContent = title;

  const firstDay    = new Date(miniCalYear, miniCalMonth, 1).getDay();
  const daysInMonth = new Date(miniCalYear, miniCalMonth + 1, 0).getDate();
  const t           = todayStr();
  const taskDates   = new Set(tasks.filter(tk => tk.dueDate && !tk.completed).map(tk => tk.dueDate));

  const grid = document.getElementById('mcalGrid');
  grid.innerHTML = ['S','M','T','W','T','F','S'].map(d => `<span class="mcal-hdr">${d}</span>`).join('')
    + Array(firstDay).fill('<span class="mcal-day other-month"></span>').join('')
    + Array.from({ length: daysInMonth }, (_, i) => {
        const day  = i + 1;
        const date = `${miniCalYear}-${String(miniCalMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const cls  = [
          'mcal-day',
          date === t       ? 'today'    : '',
          taskDates.has(date) ? 'has-task' : '',
        ].filter(Boolean).join(' ');
        return `<span class="${cls}" data-date="${date}">${day}</span>`;
      }).join('');

  grid.querySelectorAll('.mcal-day:not(.other-month)').forEach(el => {
    el.addEventListener('click', () => {
      const date = el.dataset.date;
      switchTab('tasks');
      pendingDate = date;
      dateInput.value = date;
      clearDateBtn.hidden = false;
      taskMetaRow.hidden = false;
      dateBtnTgl.classList.add('active');
      todoInput.focus();
      grid.querySelectorAll('.mcal-day').forEach(d => d.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
}

function renderUpcoming() {
  const upcoming = tasks
    .filter(t => !t.completed && t.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6);
  const ul    = document.getElementById('upcomingList');
  const empty = document.getElementById('upcomingEmpty');
  ul.innerHTML = '';
  empty.hidden = upcoming.length > 0;
  upcoming.forEach(t => {
    const li = document.createElement('li');
    li.className = 'upcoming-item';
    li.innerHTML = `
      <span class="upcoming-dot ${t.priority}"></span>
      <span class="upcoming-text">${escHtml(t.text)}</span>
      <span class="upcoming-date">${fmtDate(t.dueDate)}</span>`;
    li.addEventListener('click', () => { switchTab('tasks'); taskSearch.value = t.text; renderTasks(); });
    ul.appendChild(li);
  });
}

/* ══════════════════════════════════════════════════════
   9. CALENDAR
   ══════════════════════════════════════════════════════ */
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();

document.getElementById('calPrev').addEventListener('click',  () => { calMonth--; if(calMonth<0){calMonth=11;calYear--;} renderCalendar(); });
document.getElementById('calNext').addEventListener('click',  () => { calMonth++; if(calMonth>11){calMonth=0;calYear++;} renderCalendar(); });
document.getElementById('calToday').addEventListener('click', () => { calYear = new Date().getFullYear(); calMonth = new Date().getMonth(); renderCalendar(); });

function renderCalendar() {
  const title = new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  document.getElementById('calTitle').textContent = title;

  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevDays    = new Date(calYear, calMonth, 0).getDate();
  const t           = todayStr();
  const grid        = document.getElementById('calGrid');
  grid.innerHTML    = '';

  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');

    let day, dateStr, isOther = false;
    if (i < firstDay) {
      day = prevDays - firstDay + 1 + i;
      const m = calMonth === 0 ? 12 : calMonth;
      const y = calMonth === 0 ? calYear - 1 : calYear;
      dateStr = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      isOther = true;
    } else if (i >= firstDay + daysInMonth) {
      day = i - firstDay - daysInMonth + 1;
      const m = calMonth === 11 ? 1 : calMonth + 2;
      const y = calMonth === 11 ? calYear + 1 : calYear;
      dateStr = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      isOther = true;
    } else {
      day = i - firstDay + 1;
      dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }

    const dayTasks = tasks.filter(tk => tk.dueDate === dateStr);
    const isToday  = dateStr === t;

    cell.className = ['cal-cell', isOther ? 'other-month' : '', isToday ? 'today' : '', dayTasks.length ? 'has-mobile-task' : ''].filter(Boolean).join(' ');
    cell.dataset.date = dateStr;

    const maxShow = 3;
    cell.innerHTML = `
      <div class="cal-date">${day}</div>
      ${dayTasks.slice(0, maxShow).map(tk => `
        <div class="cal-task-chip ${tk.priority}${tk.completed?' done':''}" data-task-id="${tk.id}" title="${escHtml(tk.text)}">
          ${escHtml(tk.text)}
        </div>`).join('')}
      ${dayTasks.length > maxShow ? `<div class="cal-more">+${dayTasks.length - maxShow} more</div>` : ''}
      ${!isOther ? `<button class="cal-add-btn" data-date="${dateStr}" title="Add task for this day">+</button>` : ''}`;

    /* Click task chip → toggle complete */
    cell.querySelectorAll('.cal-task-chip').forEach(chip => {
      chip.addEventListener('click', e => { e.stopPropagation(); toggleTask(+chip.dataset.taskId); renderCalendar(); });
    });

    /* Click add btn → switch to tasks, pre-fill date */
    const addBtn = cell.querySelector('.cal-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', e => {
        e.stopPropagation();
        pendingDate = dateStr;
        dateInput.value = dateStr;
        clearDateBtn.hidden = false;
        taskMetaRow.hidden = false;
        dateBtnTgl.classList.add('active');
        switchTab('tasks');
        todoInput.focus();
      });
    }

    /* Click day → filter tasks by date */
    cell.addEventListener('click', e => {
      if (e.target.classList.contains('cal-task-chip') || e.target.classList.contains('cal-add-btn')) return;
      if (isOther) return;
      switchTab('tasks');
      filter = 'all';
      taskSearch.value = '';
      pendingDate = dateStr;
      dateInput.value = dateStr;
      clearDateBtn.hidden = false;
      taskMetaRow.hidden = false;
      dateBtnTgl.classList.add('active');
      renderTasks();
      todoInput.focus();
    });

    grid.appendChild(cell);
  }
}

/* ══════════════════════════════════════════════════════
   10. NOTES
   ══════════════════════════════════════════════════════ */
let notesList    = LS.get('nt_notes_v2', []);
let activeNoteId = LS.get('nt_active_note', null);
let noteIdSeq    = LS.get('nt_note_seq', 1);

/* Migrate old single note */
(function() {
  const old = localStorage.getItem('nt_notes');
  if (old && notesList.length === 0) {
    notesList.push({ id: noteIdSeq++, title: 'My Notes', content: old, createdAt: Date.now(), updatedAt: Date.now() });
    LS.set('nt_notes_v2', notesList); LS.set('nt_note_seq', noteIdSeq);
    localStorage.removeItem('nt_notes');
  }
})();

const notesSidebar    = document.getElementById('notesSidebar');
const notesMain       = document.getElementById('notesMain');
const notesNoSel      = document.getElementById('notesNoSel');
const notesListEl     = document.getElementById('notesList');
const notesSidebarEmp = document.getElementById('notesSidebarEmpty');
const newNoteBtn      = document.getElementById('newNoteBtn');
const noteSearch      = document.getElementById('noteSearch');
const noteTitleInput  = document.getElementById('noteTitleInput');
const noteTimestamp   = document.getElementById('noteTimestamp');
const deleteNoteBtn   = document.getElementById('deleteNoteBtn');
const notepadEditor   = document.getElementById('notepadEditor');
const wordCount       = document.getElementById('wordCount');
const saveIndicator   = document.getElementById('saveIndicator');
const exportNoteBtn   = document.getElementById('exportNoteBtn');
const backBtn         = document.getElementById('backBtn');

function createNote() {
  const note = { id: noteIdSeq++, title: 'Untitled', content: '', createdAt: Date.now(), updatedAt: Date.now() };
  notesList.unshift(note);
  LS.set('nt_note_seq', noteIdSeq);
  persistNotes(); selectNote(note.id); renderNotesList();
  setTimeout(() => noteTitleInput.focus(), 50);
}
newNoteBtn.addEventListener('click', createNote);
document.getElementById('createFirstNoteBtn').addEventListener('click', createNote);
document.getElementById('createFirstNoteBtn2').addEventListener('click', createNote);

/* Import .txt */
document.getElementById('importTxtBtn').addEventListener('click', () => document.getElementById('importTxtInput').click());
document.getElementById('importTxtInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const title   = file.name.replace(/\.txt$/i, '') || 'Imported note';
    const content = ev.target.result;
    /* Convert plain text to HTML: preserve line breaks, escape special chars */
    const html = content
      .split('\n')
      .map(line => `<p>${line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') || '<br>'}</p>`)
      .join('');
    const note = { id: noteIdSeq++, title, content: html, createdAt: Date.now(), updatedAt: Date.now() };
    notesList.unshift(note);
    LS.set('nt_note_seq', noteIdSeq);
    persistNotes();
    renderNotesList();
    selectNote(note.id);
  };
  reader.readAsText(file);
  e.target.value = '';
});

deleteNoteBtn.addEventListener('click', () => {
  if (!activeNoteId || !confirm('Delete this note permanently?')) return;
  notesList = notesList.filter(n => n.id !== activeNoteId);
  persistNotes();
  activeNoteId = notesList[0]?.id || null;
  LS.set('nt_active_note', activeNoteId);
  renderNotesList();
  if (activeNoteId) selectNote(activeNoteId); else showNoSelection();
});

function selectNote(id) {
  activeNoteId = id; LS.set('nt_active_note', id);
  const note = notesList.find(n => n.id === id);
  if (!note) { showNoSelection(); return; }
  noteTitleInput.value    = note.title;
  notepadEditor.innerHTML = note.content;
  noteTimestamp.textContent = fmtNoteDate(note.updatedAt);
  updateWordCount(); updateToolbarState();
  notesNoSel.style.display = 'none';
  notesMain.style.display  = '';
  notesMain.hidden         = false;
  notesMain.classList.add('mobile-show');
  notesSidebar.classList.remove('mobile-show');
  renderNotesList();
}
function showNoSelection() { notesMain.style.display = 'none'; notesMain.hidden = true; notesNoSel.style.display = 'flex'; }

backBtn.addEventListener('click', () => { notesMain.classList.remove('mobile-show'); notesSidebar.classList.add('mobile-show'); });
function initNotesMobileView() { if (window.innerWidth <= 768) { notesSidebar.classList.add('mobile-show'); notesMain.classList.remove('mobile-show'); } }

function renderNotesList() {
  const q = noteSearch.value.trim().toLowerCase();
  const filtered = q ? notesList.filter(n => n.title.toLowerCase().includes(q) || stripHtml(n.content).toLowerCase().includes(q)) : notesList;
  notesListEl.innerHTML = '';
  notesSidebarEmp.hidden = filtered.length > 0;
  filtered.forEach(n => {
    const li = document.createElement('li');
    li.className = `note-item${n.id === activeNoteId ? ' active' : ''}`;
    li.dataset.noteId = n.id;
    li.innerHTML = `<div class="note-item-title">${escHtml(n.title || 'Untitled')}</div><div class="note-item-meta">${fmtNoteDate(n.updatedAt)} · ${(stripHtml(n.content).slice(0,35) || 'Empty note')}</div>`;
    li.addEventListener('click', () => selectNote(n.id));
    notesListEl.appendChild(li);
  });
  if (!activeNoteId || !notesList.find(n => n.id === activeNoteId)) showNoSelection();
}
noteSearch.addEventListener('input', renderNotesList);

noteTitleInput.addEventListener('input', () => {
  const note = notesList.find(n => n.id === activeNoteId); if (!note) return;
  note.title = noteTitleInput.value; note.updatedAt = Date.now();
  renderNotesList(); scheduleSave();
});

let noteSaveTimer;
notepadEditor.addEventListener('input', () => { updateWordCount(); updateToolbarState(); scheduleSave(); });
function scheduleSave() {
  clearTimeout(noteSaveTimer);
  noteSaveTimer = setTimeout(() => {
    const note = notesList.find(n => n.id === activeNoteId); if (!note) return;
    note.content = notepadEditor.innerHTML; note.updatedAt = Date.now();
    noteTimestamp.textContent = fmtNoteDate(note.updatedAt);
    persistNotes(); flashSaved();
  }, 700);
}
function persistNotes() { LS.set('nt_notes_v2', notesList); }
let flashTimer;
function flashSaved() { saveIndicator.classList.add('visible'); clearTimeout(flashTimer); flashTimer = setTimeout(() => saveIndicator.classList.remove('visible'), 1800); }

/* Toolbar */
const toolBtns    = document.querySelectorAll('[data-cmd]');
const highlightBtn = document.getElementById('highlightBtn');
toolBtns.forEach(btn => {
  btn.addEventListener('mousedown', e => {
    e.preventDefault();
    const cmd = btn.dataset.cmd, val = btn.dataset.val;
    if (cmd === 'formatBlock') { const cur = document.queryCommandValue('formatBlock').toLowerCase(); document.execCommand('formatBlock', false, cur === val ? 'p' : val); }
    else document.execCommand(cmd, false, val || null);
    notepadEditor.focus(); updateToolbarState(); scheduleSave();
  });
});
highlightBtn.addEventListener('mousedown', e => {
  e.preventDefault();
  const cur = document.queryCommandValue('hiliteColor');
  const isY = /254.*240.*138/.test(cur);
  document.execCommand('hiliteColor', false, isY ? 'transparent' : '#fef08a');
  notepadEditor.focus(); scheduleSave(); updateHighlightBtn();
});
notepadEditor.addEventListener('keyup',   updateToolbarState);
notepadEditor.addEventListener('mouseup', updateToolbarState);
document.addEventListener('selectionchange', () => { if (document.activeElement === notepadEditor) updateToolbarState(); });
function updateToolbarState() {
  try {
    toolBtns.forEach(btn => {
      const cmd = btn.dataset.cmd;
      if (cmd === 'formatBlock') btn.classList.toggle('active', document.queryCommandValue('formatBlock').toLowerCase() === btn.dataset.val);
      else if (['bold','italic','underline','strikeThrough','insertUnorderedList','insertOrderedList'].includes(cmd)) btn.classList.toggle('active', document.queryCommandState(cmd));
    });
    updateHighlightBtn();
  } catch {}
}
function updateHighlightBtn() { const c = document.queryCommandValue('hiliteColor'); highlightBtn.classList.toggle('active', c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent' && c !== ''); }
function updateWordCount() {
  const text = notepadEditor.innerText.trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  wordCount.textContent = `${words} word${words!==1?'s':''} · ${notepadEditor.innerText.replace(/\n/g,'').length} chars`;
}
exportNoteBtn.addEventListener('click', async () => {
  const note = notesList.find(n => n.id === activeNoteId); if (!note) return;
  const text     = (note.title ? note.title + '\n' + '─'.repeat(40) + '\n\n' : '') + notepadEditor.innerText;
  const fileName = (note.title.trim() || 'Untitled') + '.txt';
  const blob     = new Blob([text], { type: 'text/plain; charset=utf-8' });
  if ('showSaveFilePicker' in window) {
    try {
      const handle   = await window.showSaveFilePicker({ suggestedName: fileName, types: [{ description: 'Text file', accept: { 'text/plain': ['.txt'] } }] });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) { if (err.name === 'AbortError') return; }
  }
  downloadBlob(blob, fileName);
});

/* Init notes */
if (notesList.length > 0) {
  const id = activeNoteId && notesList.find(n => n.id === activeNoteId) ? activeNoteId : notesList[0].id;
  renderNotesList();
  if (activeTab === 'notes') selectNote(id);
  else { activeNoteId = id; renderNotesList(); }
} else { renderNotesList(); showNoSelection(); }

/* ══════════════════════════════════════════════════════
   11. POMODORO
   ══════════════════════════════════════════════════════ */
const POM_CIRC = 2 * Math.PI * 85;
let pomMode = 'work', pomTimeLeft = settings.pomWork * 60, pomTotal = settings.pomWork * 60;
let pomRunning = false, pomInterval = null;
let pomSessionsToday = LS.get('nt_pom_today', { date: '', count: 0, focus: 0, breaks: 0 });
if (pomSessionsToday.date !== todayStr()) pomSessionsToday = { date: todayStr(), count: 0, focus: 0, breaks: 0 };

const timerDisplay    = document.getElementById('timerDisplay');
const timerLabel      = document.getElementById('timerLabel');
const timerArc        = document.getElementById('timerArc');
const sessionDots     = document.getElementById('sessionDots');
const pomStartPause   = document.getElementById('pomStartPause');
const pomReset        = document.getElementById('pomReset');
const pomSkip         = document.getElementById('pomSkip');
const pomModeBtns     = document.querySelectorAll('.pom-mode-btn');

pomModeBtns.forEach(btn => btn.addEventListener('click', () => { stopPom(); switchPomMode(btn.dataset.mode); }));

function switchPomMode(mode) {
  pomMode = mode;
  const dur = mode === 'work' ? settings.pomWork : mode === 'short' ? settings.pomShort : settings.pomLong;
  pomTimeLeft = dur * 60; pomTotal = dur * 60;
  pomModeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  timerLabel.textContent = { work: 'Focus', short: 'Short Break', long: 'Long Break' }[mode];
  timerArc.style.stroke  = { work: 'var(--accent)', short: '#4ade80', long: '#60a5fa' }[mode];
  updateTimerDisplay(); updateSessionDots();
}

function updateTimerDisplay() {
  const m = Math.floor(pomTimeLeft/60).toString().padStart(2,'0');
  const s = (pomTimeLeft%60).toString().padStart(2,'0');
  timerDisplay.textContent = `${m}:${s}`;
  timerArc.style.strokeDashoffset = POM_CIRC * (1 - pomTimeLeft / pomTotal);
  document.title = pomRunning ? `${m}:${s} — NextTick` : 'NextTick';
}
function updateSessionDots() {
  sessionDots.innerHTML = '';
  const done = pomSessionsToday.count % 4;
  for (let i = 0; i < 4; i++) { const d = document.createElement('span'); d.className = `session-dot${i<done?' done':''}`; sessionDots.appendChild(d); }
}
function startPom() { pomRunning = true; pomStartPause.classList.add('running'); pomStartPause.querySelector('.pom-btn-label').textContent = 'Pause'; pomInterval = setInterval(() => { pomTimeLeft--; updateTimerDisplay(); if (pomTimeLeft <= 0) { clearInterval(pomInterval); onPomEnd(); } }, 1000); }
function stopPom()  { pomRunning = false; clearInterval(pomInterval); pomStartPause.classList.remove('running'); pomStartPause.querySelector('.pom-btn-label').textContent = 'Start'; document.title = 'NextTick'; }
function onPomEnd() {
  playBeep();
  if (pomMode === 'work') { pomSessionsToday.count++; pomSessionsToday.focus = (pomSessionsToday.focus||0) + settings.pomWork; }
  else { pomSessionsToday.breaks = (pomSessionsToday.breaks||0) + (pomMode==='short'?settings.pomShort:settings.pomLong); }
  LS.set('nt_pom_today', pomSessionsToday); updatePomStats();
  const next = pomMode === 'work' ? (pomSessionsToday.count % 4 === 0 ? 'long' : 'short') : 'work';
  if (settings.pomAutoStart) { switchPomMode(next); startPom(); } else switchPomMode(next);
}
function updatePomStats() {
  document.getElementById('pomSessionCount').textContent = pomSessionsToday.count;
  document.getElementById('pomFocusTime').textContent    = `${pomSessionsToday.focus||0}m`;
  document.getElementById('pomBreakTime').textContent    = `${pomSessionsToday.breaks||0}m`;
  updateSessionDots();
}
function playBeep() {
  if (!settings.pomSound) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[0,660],[.25,880],[.5,660]].forEach(([t,freq]) => {
      const osc=ctx.createOscillator(),gain=ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination);
      osc.type='sine'; osc.frequency.value=freq;
      gain.gain.setValueAtTime(.25,ctx.currentTime+t); gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+t+.35);
      osc.start(ctx.currentTime+t); osc.stop(ctx.currentTime+t+.35);
    });
  } catch {}
}
pomStartPause.addEventListener('click', () => { if (pomRunning) stopPom(); else startPom(); });
pomReset.addEventListener('click', () => { stopPom(); switchPomMode(pomMode); });
pomSkip.addEventListener('click',  () => { stopPom(); const next = pomMode === 'work' ? (pomSessionsToday.count%4===0?'long':'short') : 'work'; switchPomMode(next); });
timerArc.style.strokeDasharray = POM_CIRC;
switchPomMode('work'); updatePomStats();

/* ══════════════════════════════════════════════════════
   12. SETTINGS UI
   ══════════════════════════════════════════════════════ */
/* Theme group */
const themeGroup = document.getElementById('themeGroup');
themeGroup.querySelectorAll('.btn-opt').forEach(btn => {
  if (btn.dataset.val === settings.theme) btn.classList.add('active');
  btn.addEventListener('click', () => {
    settings.theme = btn.dataset.val; applyTheme(settings.theme); saveSettings();
    themeGroup.querySelectorAll('.btn-opt').forEach(b => b.classList.toggle('active', b===btn));
  });
});
document.getElementById('themeBtn').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  settings.theme = next; applyTheme(next); saveSettings();
  themeGroup.querySelectorAll('.btn-opt').forEach(b => b.classList.toggle('active', b.dataset.val===next));
});

/* Color swatches */
const colorSwatchesEl = document.getElementById('colorSwatches');
ACCENT_COLORS.forEach(c => {
  const sw = document.createElement('div');
  sw.className = `color-swatch${c.hex === settings.accent ? ' active' : ''}`;
  sw.style.background = c.hex; sw.title = c.name;
  sw.addEventListener('click', () => {
    settings.accent = c.hex; applyAccent(c.hex); saveSettings();
    colorSwatchesEl.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    sw.classList.add('active');
  });
  colorSwatchesEl.appendChild(sw);
});

/* Font size */
const fontSizeGroup = document.getElementById('fontSizeGroup');
fontSizeGroup.querySelectorAll('.btn-opt').forEach(btn => {
  if (btn.dataset.val === settings.fontSize) btn.classList.add('active');
  btn.addEventListener('click', () => { settings.fontSize = btn.dataset.val; applyFontSize(settings.fontSize); saveSettings(); fontSizeGroup.querySelectorAll('.btn-opt').forEach(b => b.classList.toggle('active', b===btn)); });
});

/* Default priority */
const defaultPriorityGroup = document.getElementById('defaultPriorityGroup');
defaultPriorityGroup.querySelectorAll('.btn-opt').forEach(btn => {
  if (btn.dataset.val === settings.defaultPriority) btn.classList.add('active');
  btn.addEventListener('click', () => { settings.defaultPriority = btn.dataset.val; setPriority(settings.defaultPriority); saveSettings(); defaultPriorityGroup.querySelectorAll('.btn-opt').forEach(b => b.classList.toggle('active', b===btn)); });
});

/* Pom settings */
function bindPomGroup(id, key) {
  const grp = document.getElementById(id);
  grp.querySelectorAll('.btn-opt').forEach(btn => {
    if (+btn.dataset.val === settings[key]) btn.classList.add('active');
    btn.addEventListener('click', () => { settings[key]=+btn.dataset.val; saveSettings(); grp.querySelectorAll('.btn-opt').forEach(b=>b.classList.toggle('active',b===btn)); stopPom(); switchPomMode(pomMode); });
  });
}
bindPomGroup('pomWorkGroup','pomWork'); bindPomGroup('pomShortGroup','pomShort'); bindPomGroup('pomLongGroup','pomLong');

const soundToggle = document.getElementById('soundToggle'), autoStartToggle = document.getElementById('autoStartToggle');
soundToggle.checked = settings.pomSound; autoStartToggle.checked = settings.pomAutoStart;
soundToggle.addEventListener('change', () => { settings.pomSound = soundToggle.checked; saveSettings(); });
autoStartToggle.addEventListener('change', () => { settings.pomAutoStart = autoStartToggle.checked; saveSettings(); });

/* Data */
document.getElementById('exportDataBtn').addEventListener('click', () => {
  downloadBlob(new Blob([JSON.stringify({ version:3, exported:new Date().toISOString(), tasks, notes:notesList, settings }, null, 2)], { type:'application/json' }), `nexttick-backup-${datestamp()}.json`);
});
document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFileInput').click());
document.getElementById('importFileInput').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);
      if (!d.version || !d.tasks) { alert('Invalid file.'); return; }
      if (!confirm('Import will replace all current data. Continue?')) return;
      tasks = d.tasks || []; notesList = d.notes || [];
      if (d.settings) { Object.assign(settings, d.settings); saveSettings(); applySettings(); }
      nextId = Math.max(0, ...tasks.map(t=>t.id)) + 1; noteIdSeq = Math.max(0, ...notesList.map(n=>n.id)) + 1;
      persistTasks(); persistNotes(); LS.set('nt_nextId', nextId); LS.set('nt_note_seq', noteIdSeq);
      renderTasks(); renderNotesList(); renderSidebarWidgets(); alert('Imported successfully!');
    } catch { alert('Could not parse file.'); }
  };
  reader.readAsText(file); e.target.value = '';
});
document.getElementById('clearAllBtn').addEventListener('click', () => { if (!confirm('Delete ALL data? This cannot be undone.')) return; localStorage.clear(); location.reload(); });

/* ── 13. Keyboard Shortcuts ──────────────────────────── */
document.addEventListener('keydown', e => {
  const tag = document.activeElement.tagName;
  const editing = tag==='INPUT'||tag==='TEXTAREA'||document.activeElement.contentEditable==='true';
  if (e.ctrlKey) {
    if (e.key==='1'){e.preventDefault();switchTab('tasks');    todoInput.focus();}
    if (e.key==='2'){e.preventDefault();switchTab('calendar');}
    if (e.key==='3'){e.preventDefault();switchTab('notes');}
    if (e.key==='4'){e.preventDefault();switchTab('pomodoro');}
    return;
  }
  if (e.key==='/'&&!editing){e.preventDefault();switchTab('tasks');todoInput.focus();}
  if (e.key===' '&&!editing&&activeTab==='pomodoro'){e.preventDefault();if(pomRunning)stopPom();else startPom();}
});

/* ── 14. Utilities ───────────────────────────────────── */
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function stripHtml(s) { const d = document.createElement('div'); d.innerHTML = s; return d.textContent || ''; }
function datestamp()  { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function slugify(s)   { return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'note'; }
function fmtNoteDate(ts) {
  const d=new Date(ts), now=new Date();
  if (d.toDateString()===now.toDateString()) return d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}
function downloadBlob(blob, name) { const url=URL.createObjectURL(blob),a=Object.assign(document.createElement('a'),{href:url,download:name}); document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }

/* ── 15. Init ────────────────────────────────────────── */
renderTasks();
renderSidebarWidgets();
switchTab(activeTab);
