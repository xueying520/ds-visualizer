/* ============================================
   Canvas 绘制：柱状图（排序） + 树（二叉树）
   ============================================ */

/* 读取当前主题的 CSS 变量，深浅色自动适配 */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* 按设备像素比设置画布，保证高清屏不模糊
   注意：尺寸一律从 CSS 布局值（clientWidth/clientHeight）读取，
   不能读 height 属性——canvas.height 赋值会改写该属性，造成尺寸爆炸 */
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth;
  const H = canvas.clientHeight || 420;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W, H };
}

/* 圆角矩形（旧浏览器回退为普通矩形） */
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

const BAR_COLORS = {
  base: '#6366f1',      // 未排序
  compare: '#f59e0b',   // 比较
  swap: '#ef4444',      // 交换
  overwrite: '#06b6d4', // 写回
  pivot: '#a855f7',     // 基准
  sorted: '#22c55e'     // 已就位
};

/* ---------- 排序柱状图 ---------- */
function drawBars(canvas, f) {
  const { ctx, W, H } = setupCanvas(canvas);
  if (!W || !H) return;
  ctx.fillStyle = cssVar('--bg-card'); // 跟随主题的画布底色
  ctx.fillRect(0, 0, W, H);
  if (!f) return;

  const arr = f.array;
  const n = arr.length;
  const pad = 10;
  const gap = Math.min(4, Math.max(1, (W / n) * 0.15));
  const bw = (W - pad * 2 - gap * (n - 1)) / n;
  const max = Math.max(...arr);
  const baseY = H - 24;

  // 正在处理的区间画一条淡色背景带（归并 / 快排）
  if (f.range) {
    ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
    const bx = pad + f.range[0] * (bw + gap);
    const bwd = (f.range[1] - f.range[0] + 1) * (bw + gap) - gap;
    roundRectPath(ctx, bx, 8, bwd, baseY - 8, 8);
    ctx.fill();
  }

  const sortedSet = new Set(f.sorted);

  arr.forEach((v, i) => {
    const x = pad + i * (bw + gap);
    const h = (v / max) * (baseY - 20);

    // 高亮优先级：交换 > 比较 > 写回 > 基准 > 已就位
    let color = BAR_COLORS.base;
    if (sortedSet.has(i)) color = BAR_COLORS.sorted;
    if (f.pivot === i) color = BAR_COLORS.pivot;
    if (f.overwrite === i) color = BAR_COLORS.overwrite;
    if (f.compare && (f.compare[0] === i || f.compare[1] === i)) color = BAR_COLORS.compare;
    if (f.swap && (f.swap[0] === i || f.swap[1] === i)) color = BAR_COLORS.swap;

    ctx.fillStyle = color;
    roundRectPath(ctx, x, baseY - h, bw, h, Math.min(4, bw / 2));
    ctx.fill();

    // 空间足够时显示数值
    if (bw >= 16) {
      ctx.fillStyle = cssVar('--text-2');
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(v, x + bw / 2, baseY - h - 6);
    }
  });

  // 下标刻度
  ctx.fillStyle = cssVar('--text-2');
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('0', pad + bw / 2, H - 6);
  ctx.fillText(String(n - 1), pad + (n - 1) * (bw + gap) + bw / 2, H - 6);
}

/* ---------- 二叉树 ---------- */
function drawTree(canvas, tree, f) {
  const { ctx, W, H } = setupCanvas(canvas);
  if (!W || !H) return;
  ctx.fillStyle = cssVar('--bg-card'); // 跟随主题的画布底色
  ctx.fillRect(0, 0, W, H);
  if (!tree || !tree.root) return;

  layoutTree(tree, W, H);
  const R = 20;

  const current = f ? f.current : null;
  const visitedSet = f ? new Set(f.visited) : new Set();

  // 先画边
  (function edges(n) {
    if (!n) return;
    [n.left, n.right].forEach(c => {
      if (c) {
        ctx.strokeStyle = cssVar('--border');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(n._x, n._y + R * 0.7);
        ctx.lineTo(c._x, c._y - R * 0.7);
        ctx.stroke();
        edges(c);
      }
    });
  })(tree.root);

  // 再画节点
  (function nodes(n) {
    if (!n) return;
    const isCurrent = n === current;
    const isVisited = visitedSet.has(n);

    let fill = cssVar('--bg-card');
    let stroke = cssVar('--accent');
    let text = cssVar('--text');
    if (isVisited) {
      fill = '#22c55e';
      stroke = '#22c55e';
      text = '#ffffff';
    }
    if (isCurrent) {
      fill = '#f59e0b';
      stroke = '#f59e0b';
      text = '#ffffff';
    }

    ctx.beginPath();
    ctx.arc(n._x, n._y, R, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = stroke;
    ctx.stroke();

    ctx.fillStyle = text;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.value, n._x, n._y + 1);

    nodes(n.left);
    nodes(n.right);
  })(tree.root);
}

/* ============================================
   栈与队列
   ============================================ */
const SQ_COLORS = {
  item: '#6366f1',  // 元素
  in: '#f59e0b',    // 正在进入
  out: '#ef4444',   // 正在离开
  front: '#06b6d4', // 队头指针
  rear: '#a855f7'   // 队尾指针
};

/* ---------- 栈：垂直格子，栈顶朝上，右侧 top 指针 ---------- */
function drawStack(canvas, f) {
  const { ctx, W, H } = setupCanvas(canvas);
  if (!W || !H) return;
  ctx.fillStyle = cssVar('--bg-card');
  ctx.fillRect(0, 0, W, H);

  const cap = 8, cellH = 40, gap = 5, cw = 170;
  const totalH = cap * (cellH + gap) - gap;
  const x0 = Math.max(20, W / 2 - cw / 2 - 50);
  const y0 = (H - totalH) / 2 - 6;
  const items = f ? f.items : [];

  for (let i = 0; i < cap; i++) {
    const y = y0 + totalH - (i + 1) * (cellH + gap) + gap;
    const occupied = i < items.length;
    let fill = cssVar('--bg-card');
    let stroke = cssVar('--border');
    let text = cssVar('--text-2');
    if (occupied) { fill = SQ_COLORS.item; stroke = fill; text = '#fff'; }
    if (f && f.highlight && f.highlight.index === i) {
      fill = f.highlight.type === 'in' ? SQ_COLORS.in : SQ_COLORS.out;
      stroke = fill; text = '#fff';
    }
    ctx.setLineDash(occupied ? [] : [5, 4]);
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    roundRectPath(ctx, x0, y, cw, cellH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    if (occupied) {
      ctx.fillStyle = text;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(items[i], x0 + cw / 2, y + cellH / 2);
    }
  }

  // 栈底标签
  ctx.fillStyle = cssVar('--text-2');
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('栈底', x0 + cw / 2, y0 + totalH + 16);

  // top 指针（栈空时停在栈底上方）
  const topIdx = items.length - 1;
  const py = topIdx >= 0
    ? y0 + totalH - (topIdx + 1) * (cellH + gap) + gap + cellH / 2
    : y0 + totalH + 16;
  const px = x0 + cw + 20;
  ctx.strokeStyle = SQ_COLORS.in;
  ctx.fillStyle = SQ_COLORS.in;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + 18, py);
  ctx.lineTo(px + 4, py);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + 8, py - 4);
  ctx.lineTo(px + 8, py + 4);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(topIdx >= 0 ? 'top 栈顶' : 'top（栈空）', px + 24, py);
}

/* ---------- 队列：水平格子，左出右进，上方 front/rear 指针 ---------- */
function drawQueue(canvas, f) {
  const { ctx, W, H } = setupCanvas(canvas);
  if (!W || !H) return;
  ctx.fillStyle = cssVar('--bg-card');
  ctx.fillRect(0, 0, W, H);

  const cap = 8, cw = 62, ch = 56, gap = 8;
  const totalW = cap * (cw + gap) - gap;
  const x0 = (W - totalW) / 2;
  const y0 = H / 2 - 20;
  const slots = f ? f.slots : new Array(cap).fill(null);
  const front = f ? f.front : 0;
  const rear = f ? f.rear : 0;

  for (let i = 0; i < cap; i++) {
    const x = x0 + i * (cw + gap);
    const occupied = slots[i] !== null;
    let fill = cssVar('--bg-card');
    let stroke = cssVar('--border');
    let text = cssVar('--text-2');
    if (occupied) { fill = SQ_COLORS.item; stroke = fill; text = '#fff'; }
    if (f && f.highlight && f.highlight.index === i) {
      fill = f.highlight.type === 'in' ? SQ_COLORS.in : SQ_COLORS.out;
      stroke = fill; text = '#fff';
    }
    ctx.setLineDash(occupied ? [] : [5, 4]);
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    roundRectPath(ctx, x, y0, cw, ch, 10);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    if (occupied) {
      ctx.fillStyle = text;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(slots[i], x + cw / 2, y0 + ch / 2);
    }
    // 下标
    ctx.fillStyle = cssVar('--text-2');
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(i, x + cw / 2, y0 + ch + 18);
  }

  // front / rear 指针（rear 可以指到末尾外一格）
  const fx = x0 + front * (cw + gap) + cw / 2;
  const rx = rear >= cap ? x0 + totalW + 12 : x0 + rear * (cw + gap) + cw / 2;
  const same = Math.abs(fx - rx) < 1;
  drawPointer(ctx, fx, y0, SQ_COLORS.front, 'front 出队', y0 - 28);
  drawPointer(ctx, rx, y0, SQ_COLORS.rear, 'rear 入队', same ? y0 - 50 : y0 - 28);
}

/* 竖直向下的小箭头 + 标签 */
function drawPointer(ctx, x, yTip, color, label, labelY) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, yTip - 20);
  ctx.lineTo(x, yTip - 7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, yTip);
  ctx.lineTo(x - 4, yTip - 7);
  ctx.lineTo(x + 4, yTip - 7);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, x, labelY);
}

/* ---------- 哈夫曼树（森林布局 → 合并 → 编码） ---------- */
function drawHuffman(canvas, f) {
  const { ctx, W, H } = setupCanvas(canvas);
  if (!W || !H) return;
  ctx.fillStyle = cssVar('--bg-card');
  ctx.fillRect(0, 0, W, H);

  if (!f || !f.nodes || !f.nodes.length) {
    ctx.fillStyle = cssVar('--text-2');
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('输入「字符:权重」序列并点击构建', W / 2, H / 2);
    return;
  }

  // 抽象槽位 → 实际坐标
  const m = 40, top = 46;
  const slotW = f.slots > 1 ? (W - m * 2) / (f.slots - 1) : 0;
  const levelH = f.maxDepth ? Math.min(64, (H - top - 40) / f.maxDepth) : 0;
  const pos = new Map();
  f.nodes.forEach(n => {
    pos.set(n.id, {
      x: f.slots > 1 ? m + n.slot * slotW : W / 2,
      y: top + n.depth * levelH
    });
  });

  // 边
  ctx.strokeStyle = cssVar('--border');
  ctx.lineWidth = 2;
  f.edges.forEach(([p, c]) => {
    const a = pos.get(p), b = pos.get(c);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });

  // 节点：叶子大圆（字符+权重），内部节点小圆（权重）
  f.nodes.forEach(n => {
    const { x, y } = pos.get(n.id);
    const isLeaf = n.kind === 'leaf';
    const r = isLeaf ? 21 : 15;
    let fill = isLeaf ? SQ_COLORS.item : cssVar('--bg-card');
    let stroke = isLeaf ? fill : cssVar('--accent');
    let text = isLeaf ? '#fff' : cssVar('--text');
    if (n.hl === 'sel') { fill = SQ_COLORS.in; stroke = fill; text = '#fff'; }
    if (n.hl === 'new') { fill = BAR_COLORS.sorted; stroke = fill; text = '#fff'; }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = stroke;
    ctx.stroke();

    ctx.fillStyle = text;
    ctx.textAlign = 'center';
    if (isLeaf) {
      ctx.font = 'bold 12px sans-serif';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(n.char, x, y - 3);
      ctx.font = '10px sans-serif';
      ctx.fillText(n.weight, x, y + 11);
    } else {
      ctx.font = 'bold 11px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.weight, x, y + 1);
    }
  });
}
