/* ============================================
   主逻辑：标签页、动画播放器、控件绑定
   ============================================ */

const $ = id => document.getElementById(id);

/* ---------- 主题切换（与博客相同） ---------- */
const SUN_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';

function renderThemeBtn() {
  $('themeToggle').innerHTML =
    document.documentElement.dataset.theme === 'dark' ? SUN_SVG : MOON_SVG;
}
$('themeToggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
  renderThemeBtn();
});
renderThemeBtn();

/* ---------- 标签页切换 ---------- */
let activeTab = 'sort';
$('tabs').addEventListener('click', e => {
  const t = e.target.closest('.tab');
  if (!t) return;
  activeTab = t.dataset.tab;
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + activeTab));
  updateStatus();
});

/* ---------- 播放器：两个模块共用一套状态结构 ---------- */
const sortMod = {
  canvas: $('sortCanvas'), data: [], frames: null, idx: -1,
  playing: false, speed: 24, acc: 0, pauseBtn: 'sortPause',
  current() { return this.frames ? this.frames[Math.max(0, this.idx)] : null; },
  render() { drawBars(this.canvas, this.current()); }
};

const treeMod = {
  canvas: $('treeCanvas'), tree: null, frames: null, idx: -1,
  playing: false, speed: 2, acc: 0, pauseBtn: 'treePause',
  current() { return this.frames ? this.frames[Math.max(0, this.idx)] : null; },
  render() { drawTree(this.canvas, this.tree, this.current()); }
};

function mod() {
  return { sort: sortMod, tree: treeMod, stack: stackMod, queue: queueMod, huffman: huffmanMod }[activeTab];
}

/* ---------- 状态栏与访问序列 ---------- */
function updateStatus() {
  if (activeTab === 'sort') {
    const f = sortMod.current();
    if (!f) return;
    $('sortNote').textContent = f.note;
    $('sortStats').textContent = `比较 ${f.comparisons} 次 · 写操作 ${f.writes} 次`;
  } else if (activeTab === 'tree') {
    const f = treeMod.current();
    if (!f) return;
    $('treeNote').textContent = f.note;
    const total = treeMod.tree ? treeMod.tree.nodes.length : 0;
    $('treeStats').textContent = `已访问 ${f.visited.length} / ${total} 个节点`;

    const cur = f.current;
    const chips = f.visited
      .map(n => `<span class="visit-chip ${n === cur && !f.done ? 'current' : 'visited'}">${n.value}</span>`)
      .join('');
    const moving = cur && !f.visited.includes(cur)
      ? `<span class="visit-chip current">${cur.value}</span>` : '';
    $('visitStrip').innerHTML = chips + moving;
  } else if (activeTab === 'stack') {
    const f = stackMod.current() || stackMod.base();
    $('stackNote').textContent = f.note || '栈（后进先出 LIFO）：只能在栈顶操作。试着入栈几个元素。';
    $('stackNote').style.color = f.error ? '#ef4444' : '';
    $('stackStats').textContent = `大小 ${f.items.length} / ${stackMod.cap}`;
  } else if (activeTab === 'queue') {
    const f = queueMod.current() || queueMod.base();
    $('queueNote').textContent = f.note || '队列（先进先出 FIFO）：从 rear 入队，从 front 出队。';
    $('queueNote').style.color = f.error ? '#ef4444' : '';
    $('queueStats').textContent = `元素 ${f.rear - f.front} 个 · front = ${f.front} · rear = ${f.rear}`;
  } else if (activeTab === 'huffman') {
    const f = huffmanMod.current();
    $('huffmanNote').textContent = f
      ? f.note
      : '哈夫曼树：每次取出权重最小的两棵树合并，直到只剩一棵。点击「构建」观看全过程。';
    $('huffmanStats').textContent = f && f.wpl != null ? `WPL = ${f.wpl}` : '';
    $('huffmanCodes').innerHTML = f && f.codes
      ? Object.entries(f.codes).map(([c, code]) => `<span class="visit-chip visited">${c} → ${code}</span>`).join('')
      : '';
  }
}

/* ---------- 排序模块 ---------- */
function resetSort() {
  sortMod.frames = [...SORTS[$('algoSelect').value].gen(sortMod.data)];
  sortMod.idx = -1;
  sortMod.playing = false;
  sortMod.acc = 0;
  $('sortPause').textContent = '暂停';
  updateStatus();
}

function newSortData(n) {
  sortMod.data = Array.from({ length: n }, () => 8 + Math.floor(Math.random() * 93));
  resetSort();
}

$('sortStart').addEventListener('click', () => {
  resetSort();
  sortMod.playing = true;
});

$('sortPause').addEventListener('click', () => {
  if (!sortMod.frames) return;
  sortMod.playing = !sortMod.playing;
  $('sortPause').textContent = sortMod.playing ? '继续' : '暂停';
});

$('sortStep').addEventListener('click', () => {
  if (!sortMod.frames || sortMod.idx >= sortMod.frames.length - 1) return;
  sortMod.playing = false;
  $('sortPause').textContent = '继续';
  sortMod.idx++;
  updateStatus();
});

$('sortReset').addEventListener('click', resetSort);
$('sortNewData').addEventListener('click', () => newSortData(sortMod.data.length));

$('algoSelect').addEventListener('change', resetSort);

$('sizeRange').addEventListener('input', e => { $('sizeVal').textContent = e.target.value; });
$('sizeRange').addEventListener('change', e => newSortData(+e.target.value));

$('sortSpeed').addEventListener('input', e => {
  sortMod.speed = +e.target.value;
  $('sortSpeedVal').textContent = e.target.value + ' 步/秒';
});

/* ---------- 二叉树模块 ---------- */
function buildTreeFromInput(str) {
  const seen = new Set();
  const vals = [];
  str.split(/[^0-9]+/).filter(Boolean).forEach(s => {
    const v = parseInt(s, 10);
    if (!seen.has(v) && vals.length < 15) {
      seen.add(v);
      vals.push(v);
    }
  });
  if (!vals.length) {
    $('treeNote').textContent = '请输入数字序列，例如 50,30,70,20,40,60,80';
    return;
  }
  treeMod.tree = buildBST(vals);
  treeMod.frames = null;
  treeMod.idx = -1;
  treeMod.playing = false;
  treeMod.acc = 0;
  $('treeNote').textContent = `构建完成：共 ${vals.length} 个节点。点击上方遍历按钮观看演示。`;
  $('treeStats').textContent = '';
  $('visitStrip').innerHTML = '';
}

$('treeBuild').addEventListener('click', () => buildTreeFromInput($('treeInput').value));

$('treeRandom').addEventListener('click', () => {
  // 洗牌后取 7~9 个不重复的数
  const pool = Array.from({ length: 99 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const count = 7 + Math.floor(Math.random() * 3);
  $('treeInput').value = pool.slice(0, count).join(',');
  buildTreeFromInput($('treeInput').value);
});

document.querySelectorAll('[data-trav]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!treeMod.tree) {
      $('treeNote').textContent = '请先构建二叉树';
      return;
    }
    treeMod.frames = [...TRAVERSALS[btn.dataset.trav].gen(treeMod.tree.root)];
    treeMod.idx = -1;
    treeMod.playing = true;
    treeMod.acc = 0;
    $('treePause').textContent = '暂停';
  });
});

$('treePause').addEventListener('click', () => {
  if (!treeMod.frames) return;
  treeMod.playing = !treeMod.playing;
  $('treePause').textContent = treeMod.playing ? '继续' : '暂停';
});

$('treeStep').addEventListener('click', () => {
  if (!treeMod.frames || treeMod.idx >= treeMod.frames.length - 1) return;
  treeMod.playing = false;
  $('treePause').textContent = '继续';
  treeMod.idx++;
  updateStatus();
});

$('treeReset').addEventListener('click', () => {
  treeMod.frames = null;
  treeMod.idx = -1;
  treeMod.playing = false;
  $('treePause').textContent = '暂停';
  $('treeNote').textContent = '已清除遍历进度，可重新选择遍历方式。';
  $('treeStats').textContent = '';
  $('visitStrip').innerHTML = '';
});

$('treeSpeed').addEventListener('input', e => {
  treeMod.speed = +e.target.value;
  $('treeSpeedVal').textContent = e.target.value + ' 步/秒';
});

/* ---------- 动画主循环 ---------- */
let lastT = performance.now();

function loop(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;

  const m = mod();
  const end = m.frames ? m.frames.length - 1 : -1;

  if (m.playing && m.idx < end) {
    m.acc += m.speed * dt;
    while (m.acc >= 1 && m.idx < end) {
      m.idx++;
      m.acc--;
    }
    updateStatus();
    if (m.idx >= end) {
      m.playing = false;
      if (m.pauseBtn) $(m.pauseBtn).textContent = '继续';
    }
  }

  m.render();
  requestAnimationFrame(loop);
}

/* ---------- 初始化 ---------- */
newSortData(30);
buildTreeFromInput($('treeInput').value);
requestAnimationFrame(loop);
