/* ============================================
   二叉搜索树：构建、布局、四种遍历生成器
   ============================================ */

/* ---------- BST 构建（重复值忽略） ---------- */
function buildBST(values) {
  const root = { value: null, left: null, right: null };
  let real = null;
  const nodes = [];

  function insert(v) {
    const node = { value: v, left: null, right: null };
    nodes.push(node);
    if (!real) {
      real = node;
      return;
    }
    let cur = real;
    while (true) {
      if (v === cur.value) return; // 重复值忽略
      if (v < cur.value) {
        if (!cur.left) { cur.left = node; return; }
        cur = cur.left;
      } else {
        if (!cur.right) { cur.right = node; return; }
        cur = cur.right;
      }
    }
  }

  values.forEach(insert);
  root.value = real ? real.value : null;
  return { root: real, nodes };
}

/* ---------- 布局：中序位置决定 x，深度决定 y ---------- */
function layoutTree(tree, W, H) {
  if (!tree.root) return;

  const order = [];
  (function inorder(n) {
    if (!n) return;
    inorder(n.left);
    order.push(n);
    inorder(n.right);
  })(tree.root);

  let maxDepth = 0;
  (function walkDepth(n, d) {
    if (!n) return;
    maxDepth = Math.max(maxDepth, d);
    walkDepth(n.left, d + 1);
    walkDepth(n.right, d + 1);
  })(tree.root, 0);

  const m = 46; // 左右边距
  const slot = order.length > 1 ? (W - m * 2) / (order.length - 1) : 0;
  order.forEach((n, i) => { n._x = m + i * slot; });

  const top = 52;
  const levelH = maxDepth ? Math.min(72, (H - top - 46) / maxDepth) : 0;
  (function assignY(n, d) {
    if (!n) return;
    n._y = top + d * levelH;
    assignY(n.left, d + 1);
    assignY(n.right, d + 1);
  })(tree.root, 0);
}

/* ---------- 前序遍历（根-左-右） ---------- */
function* preorder(root) {
  const visited = [];
  yield* rec(root, null, '');
  yield { current: null, visited: visited.slice(), note: '前序遍历完成（根-左-右）', done: true };

  function* rec(n, parent, dir) {
    if (!n) return;
    if (parent) yield { current: n, visited: visited.slice(), note: `从 ${parent.value} 进入${dir}子树` };
    visited.push(n);
    yield { current: n, visited: visited.slice(), note: `访问 ${n.value}` };
    yield* rec(n.left, n, '左');
    yield* rec(n.right, n, '右');
  }
}

/* ---------- 中序遍历（左-根-右） ---------- */
function* inorder(root) {
  const visited = [];
  yield* rec(root, null, '');
  yield { current: null, visited: visited.slice(), note: '中序遍历完成（左-根-右）——注意结果是有序的', done: true };

  function* rec(n, parent, dir) {
    if (!n) return;
    if (parent) yield { current: n, visited: visited.slice(), note: `从 ${parent.value} 进入${dir}子树` };
    yield* rec(n.left, n, '左');
    visited.push(n);
    yield { current: n, visited: visited.slice(), note: `左子树完成，访问 ${n.value}` };
    yield* rec(n.right, n, '右');
  }
}

/* ---------- 后序遍历（左-右-根） ---------- */
function* postorder(root) {
  const visited = [];
  yield* rec(root, null, '');
  yield { current: null, visited: visited.slice(), note: '后序遍历完成（左-右-根）', done: true };

  function* rec(n, parent, dir) {
    if (!n) return;
    if (parent) yield { current: n, visited: visited.slice(), note: `从 ${parent.value} 进入${dir}子树` };
    yield* rec(n.left, n, '左');
    yield* rec(n.right, n, '右');
    visited.push(n);
    yield { current: n, visited: visited.slice(), note: `左右子树都完成，访问 ${n.value}` };
  }
}

/* ---------- 层序遍历（BFS，用队列） ---------- */
function* levelOrder(root) {
  if (!root) return;
  const visited = [];
  const queue = [root];
  yield { current: null, visited: [], note: '根节点入队，开始 BFS' };

  while (queue.length) {
    const n = queue.shift();
    visited.push(n);
    const q = queue.map(x => x.value).join(', ');
    yield { current: n, visited: visited.slice(), note: `出队访问 ${n.value}；队列：[${q}]` };
    if (n.left) {
      queue.push(n.left);
      yield { current: n, visited: visited.slice(), note: `${n.value} 的左孩子 ${n.left.value} 入队；队列：[${queue.map(x => x.value).join(', ')}]` };
    }
    if (n.right) {
      queue.push(n.right);
      yield { current: n, visited: visited.slice(), note: `${n.value} 的右孩子 ${n.right.value} 入队；队列：[${queue.map(x => x.value).join(', ')}]` };
    }
  }
  yield { current: null, visited: visited.slice(), note: '层序遍历完成（广度优先 BFS）', done: true };
}

/* ---------- 注册表 ---------- */
const TRAVERSALS = {
  pre: { name: '前序遍历', gen: preorder },
  in: { name: '中序遍历', gen: inorder },
  post: { name: '后序遍历', gen: postorder },
  level: { name: '层序遍历', gen: levelOrder }
};
