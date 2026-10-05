/* ============================================
   哈夫曼树模块：森林合并过程动画
   帧 = 森林的抽象布局（中序槽位 + 深度），
   具体坐标换算由 render.js 的 drawHuffman 完成
   ============================================ */

const huffmanMod = {
  canvas: null, frames: null, idx: -1, playing: false, speed: 2, acc: 0,
  current() { return this.frames ? this.frames[Math.max(0, this.idx)] : null; },
  render() {
    drawHuffman(this.canvas || (this.canvas = document.getElementById('huffmanCanvas')), this.current());
  }
};

function huffmanPlay(frames) {
  huffmanMod.frames = frames;
  huffmanMod.idx = -1;
  huffmanMod.playing = true;
  huffmanMod.acc = 0;
  updateStatus();
}

/* ---------- 解析输入：A:5,B:2,C:1,D:4 或 5,2,1,4 ---------- */
function parseHuffmanInput(str) {
  const seen = new Set();
  const entries = [];
  str.split(/[,，、]+/).forEach(part => {
    if (!part.trim() || entries.length >= 9) return;
    const m = part.trim().match(/^(?:([A-Za-z])\s*[:：]\s*)?(\d{1,4})$/);
    if (!m) return;
    const w = parseInt(m[2], 10);
    if (!w) return; // 权重必须为正
    const key = (m[1] || String.fromCharCode(78 + entries.length)).toUpperCase(); // 无字符时默认 N,O,P...
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ char: key, weight: w });
  });
  return entries;
}

/* ---------- 构建动画 ---------- */
function buildHuffman(str) {
  const entries = parseHuffmanInput(str);
  if (entries.length < 2) {
    huffmanMod.frames = null;
    huffmanMod.playing = false;
    document.getElementById('huffmanNote').textContent = '请至少输入 2 个权重，例如 A:5,B:2,C:1,D:4';
    document.getElementById('huffmanStats').textContent = '';
    document.getElementById('huffmanCodes').innerHTML = '';
    updateStatus();
    return;
  }

  let idc = 0;
  let trees = entries.map(e => ({
    root: { id: idc++, kind: 'leaf', char: e.char, weight: e.weight, left: null, right: null },
    leaves: 1
  }));

  const frames = [];
  function snap(hlSel, hlNew, note, extra) {
    const f = layoutForest(trees, hlSel, hlNew, note);
    Object.assign(f, extra || {});
    frames.push(f);
  }

  snap(null, null, `初始森林：${trees.length} 个节点，权重 ${entries.map(e => e.weight).join('、')}。每次取最小的两棵合并`);

  let step = 0;
  while (trees.length > 1) {
    // 找权重最小的两棵（并列时取先出现的）
    let i1 = 0;
    for (let i = 1; i < trees.length; i++) {
      if (trees[i].root.weight < trees[i1].root.weight) i1 = i;
    }
    let i2 = -1;
    for (let i = 0; i < trees.length; i++) {
      if (i !== i1 && (i2 < 0 || trees[i].root.weight < trees[i2].root.weight)) i2 = i;
    }
    const t1 = trees[i1], t2 = trees[i2];

    step++;
    const node = { id: idc++, kind: 'inner', weight: t1.root.weight + t2.root.weight, left: t1.root, right: t2.root };

    // 新树放在 t1 原来的位置，减少画面跳动
    const arr = trees.map(t => (t === t1 || t === t2) ? null : t);
    arr[arr.indexOf(null)] = { root: node, leaves: t1.leaves + t2.leaves };
    trees = arr.filter(Boolean);

    snap([t1.root.id, t2.root.id], node.id,
      `第 ${step} 步：选中最小的 ${t1.root.weight} 和 ${t2.root.weight}，合并为新节点 ${node.weight}`,
      { merged: { w1: t1.root.weight, w2: t2.root.weight, w: node.weight } });
  }

  const root = trees[0].root;

  // WPL = Σ 叶子权重 × 深度
  let wpl = 0;
  (function walk(n, d) {
    if (!n) return;
    if (!n.left && !n.right) wpl += n.weight * d;
    walk(n.left, d + 1);
    walk(n.right, d + 1);
  })(root, 0);

  snap(null, null, `构建完成！带权路径长度 WPL = ${wpl}（叶子权重 × 到根距离之和）`, { wpl });

  // 哈夫曼编码：左 0 右 1
  const codes = {};
  (function encode(n, path) {
    if (!n) return;
    if (!n.left && !n.right) codes[n.char] = path || '0';
    encode(n.left, path + '0');
    encode(n.right, path + '1');
  })(root, '');

  snap(null, null, `哈夫曼编码：左分支为 0，右分支为 1。权重越大的字符编码越短`, { wpl, codes });

  huffmanPlay(frames);
}

/* ---------- 森林布局：全森林统一中序槽位分配 x，深度分配 y ---------- */
function layoutForest(trees, hlSel, hlNew, note) {
  const nodes = [];
  const edges = [];
  let maxDepth = 0;
  let cursor = 0;

  trees.forEach((t, i) => {
    if (i > 0) cursor += 0.7; // 树与树之间留一点空隙
    (function rec(n, d) {
      if (!n) return;
      maxDepth = Math.max(maxDepth, d);
      rec(n.left, d + 1);
      let hl = null;
      if (hlSel && hlSel.includes(n.id)) hl = 'sel';
      if (hlNew === n.id) hl = 'new';
      nodes.push({ id: n.id, kind: n.kind, char: n.char, weight: n.weight, slot: cursor, depth: d, hl });
      if (n.left) edges.push([n.id, n.left.id]);
      if (n.right) edges.push([n.id, n.right.id]);
      cursor++;
      rec(n.right, d + 1);
    })(t.root, 0);
  });

  return { slots: cursor, maxDepth, nodes, edges, note, wpl: null, codes: null };
}

/* ---------- 控件绑定 ---------- */
document.getElementById('huffmanBuild').addEventListener('click', () => {
  buildHuffman(document.getElementById('huffmanInput').value);
});
document.getElementById('huffmanInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') buildHuffman(e.target.value);
});
document.getElementById('huffmanRandom').addEventListener('click', () => {
  const pool = 'ABCDEFGH'.split('');
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const n = 5 + Math.floor(Math.random() * 3);
  document.getElementById('huffmanInput').value =
    pool.slice(0, n).map(l => `${l}:${1 + Math.floor(Math.random() * 20)}`).join(',');
  buildHuffman(document.getElementById('huffmanInput').value);
});
document.getElementById('hSpeed').addEventListener('input', e => {
  huffmanMod.speed = +e.target.value;
  document.getElementById('hSpeedVal').textContent = e.target.value + ' 步/秒';
});

/* 初始提示 */
document.getElementById('huffmanNote').textContent = '哈夫曼树：每次取出权重最小的两棵树合并，直到只剩一棵。点击「构建」观看全过程。';
