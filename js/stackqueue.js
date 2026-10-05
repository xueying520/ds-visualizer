/* ============================================
   栈与队列模块：状态、操作、帧生成
   沿用全站帧动画架构：每次操作生成 2 帧
   （动作帧 + 完成帧），由 main.js 的主循环播放
   ============================================ */

/* ---------- 栈模块 ---------- */
const stackMod = {
  canvas: null, cap: 8, frames: null, idx: -1,
  playing: false, speed: 3, acc: 0,
  state: { items: [] },
  base() { return { items: this.state.items.slice(), highlight: null }; },
  current() { return this.frames ? this.frames[Math.max(0, this.idx)] : null; },
  render() { drawStack(this.canvas || (this.canvas = document.getElementById('stackCanvas')), this.current() || this.base()); }
};

/* ---------- 队列模块（顺序存储：slots + front/rear 下标） ---------- */
const queueMod = {
  canvas: null, cap: 8, frames: null, idx: -1,
  playing: false, speed: 3, acc: 0,
  state: { slots: new Array(8).fill(null), front: 0, rear: 0 },
  base() {
    const s = this.state;
    return { slots: s.slots.slice(), front: s.front, rear: s.rear, highlight: null };
  },
  current() { return this.frames ? this.frames[Math.max(0, this.idx)] : null; },
  render() { drawQueue(this.canvas || (this.canvas = document.getElementById('queueCanvas')), this.current() || this.base()); }
};

/* ---------- 通用 ---------- */
function playFrames(mod, frames) {
  mod.frames = frames;
  mod.idx = -1;
  mod.playing = true;
  mod.acc = 0;
  updateStatus();
}

/* 读取输入框的值，非法或留空则随机 */
function sqInputValue(inputId) {
  const el = document.getElementById(inputId);
  const v = parseInt(el.value, 10);
  if (isNaN(v)) return Math.floor(Math.random() * 99) + 1;
  el.value = '';
  return v;
}

/* ========== 栈操作 ========== */
function stackPush() {
  const s = stackMod.state;
  const v = sqInputValue('stackInput');
  if (s.items.length >= stackMod.cap) {
    playFrames(stackMod, [{
      items: s.items.slice(), highlight: null, error: true,
      note: `栈已满（容量 ${stackMod.cap}），再入栈就会「上溢」overflow`
    }]);
    return;
  }
  const rest = s.items.slice();
  playFrames(stackMod, [
    { items: rest.concat(v), highlight: { index: rest.length, type: 'in' }, note: `push(${v})：新元素压入栈顶` },
    { items: rest.concat(v), highlight: null, note: `入栈完成，栈大小 = ${rest.length + 1}` }
  ]);
  s.items.push(v);
}

function stackPop() {
  const s = stackMod.state;
  if (!s.items.length) {
    playFrames(stackMod, [{
      items: [], highlight: null, error: true,
      note: '栈为空，出栈会「下溢」underflow'
    }]);
    return;
  }
  const top = s.items[s.items.length - 1];
  const rest = s.items.slice(0, -1);
  playFrames(stackMod, [
    { items: s.items.slice(), highlight: { index: s.items.length - 1, type: 'out' }, note: `pop()：栈顶元素 ${top} 被弹出` },
    { items: rest, highlight: null, note: `出栈完成，返回 ${top}，栈大小 = ${rest.length}` }
  ]);
  s.items.pop();
}

function stackClear() {
  stackMod.state.items = [];
  stackMod.frames = null;
  stackMod.idx = -1;
  stackMod.playing = false;
  document.getElementById('stackNote').textContent = '已清空。';
  document.getElementById('stackStats').textContent = '';
  updateStatus();
}

/* ========== 队列操作 ========== */
function queueEnqueue() {
  const s = queueMod.state;
  const v = sqInputValue('queueInput');
  if (s.rear >= queueMod.cap) {
    playFrames(queueMod, [{
      slots: s.slots.slice(), front: s.front, rear: s.rear, highlight: null, error: true,
      note: 'rear 已到末尾，上溢——注意前面可能还有空位！这就是顺序队列的「假溢出」，循环队列可以解决'
    }]);
    return;
  }
  const slots = s.slots.slice();
  slots[s.rear] = v;
  playFrames(queueMod, [
    { slots, front: s.front, rear: s.rear + 1, highlight: { index: s.rear, type: 'in' }, note: `enqueue(${v})：新元素放到 rear 位置（下标 ${s.rear}）` },
    { slots, front: s.front, rear: s.rear + 1, highlight: null, note: `入队完成，rear 后移到 ${s.rear + 1}` }
  ]);
  s.slots = slots;
  s.rear++;
}

function queueDequeue() {
  const s = queueMod.state;
  if (s.front >= s.rear) {
    playFrames(queueMod, [{
      slots: s.slots.slice(), front: s.front, rear: s.rear, highlight: null, error: true,
      note: '队列为空，出队会「下溢」underflow'
    }]);
    return;
  }
  const v = s.slots[s.front];
  const slots = s.slots.slice();
  slots[s.front] = null;
  playFrames(queueMod, [
    { slots: s.slots.slice(), front: s.front, rear: s.rear, highlight: { index: s.front, type: 'out' }, note: `dequeue()：队头元素 ${v} 离开队列` },
    { slots, front: s.front + 1, rear: s.rear, highlight: null, note: `出队完成，front 后移到 ${s.front + 1}，返回 ${v}` }
  ]);
  s.slots = slots;
  s.front++;
}

function queueClear() {
  queueMod.state.slots = new Array(queueMod.cap).fill(null);
  queueMod.state.front = 0;
  queueMod.state.rear = 0;
  queueMod.frames = null;
  queueMod.idx = -1;
  queueMod.playing = false;
  document.getElementById('queueNote').textContent = '已清空。';
  document.getElementById('queueStats').textContent = '';
  updateStatus();
}

/* ========== 控件绑定 ========== */
document.getElementById('stackPush').addEventListener('click', stackPush);
document.getElementById('stackPop').addEventListener('click', stackPop);
document.getElementById('stackClear').addEventListener('click', stackClear);
document.getElementById('stackInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') stackPush();
});

document.getElementById('queueEnqueue').addEventListener('click', queueEnqueue);
document.getElementById('queueDequeue').addEventListener('click', queueDequeue);
document.getElementById('queueClear').addEventListener('click', queueClear);
document.getElementById('queueInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') queueEnqueue();
});

document.getElementById('sqSpeed').addEventListener('input', e => {
  stackMod.speed = +e.target.value;
  document.getElementById('sqSpeedVal').textContent = e.target.value + ' 步/秒';
});
document.getElementById('qSpeed').addEventListener('input', e => {
  queueMod.speed = +e.target.value;
  document.getElementById('qSpeedVal').textContent = e.target.value + ' 步/秒';
});

/* 初始提示 */
document.getElementById('stackNote').textContent = '栈（后进先出 LIFO）：只能在栈顶操作。试着入栈几个元素。';
document.getElementById('stackStats').textContent = '大小 0 / 8';
document.getElementById('queueNote').textContent = '队列（先进先出 FIFO）：从 rear 入队，从 front 出队。';
document.getElementById('queueStats').textContent = '元素 0 个 · front = 0 · rear = 0';
