/* ============================================
   排序算法：全部写成生成器（generator）
   每 yield 一步，动画播放器只负责逐帧展示
   ============================================ */

function makeStats() {
  return { comparisons: 0, writes: 0 };
}

/* 组装一帧：完整数组快照 + 高亮信息 + 统计 */
function frame(arr, sorted, stats, extra = {}) {
  return Object.assign(
    {
      array: arr.slice(),
      sorted: sorted.slice(),
      comparisons: stats.comparisons,
      writes: stats.writes,
      compare: null,   // [i, j] 正在比较的两个下标
      swap: null,      // [i, j] 正在交换的两个下标
      pivot: -1,       // 基准 / 关键位置
      overwrite: -1,   // 正在被写回的下标
      range: null,     // [lo, hi] 正在处理的区间（归并 / 快排）
      note: ''
    },
    extra
  );
}

/* ---------- 冒泡排序 ---------- */
function* bubbleSort(input) {
  const arr = input.slice();
  const stats = makeStats();
  const sorted = [];
  yield frame(arr, sorted, stats, { note: '冒泡排序开始：每一轮把最大值「冒泡」到末尾' });

  for (let i = 0; i < arr.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < arr.length - 1 - i; j++) {
      stats.comparisons++;
      yield frame(arr, sorted, stats, { compare: [j, j + 1], note: `比较 ${arr[j]} 和 ${arr[j + 1]}` });
      if (arr[j] > arr[j + 1]) {
        const a = arr[j], b = arr[j + 1];
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        stats.writes += 2;
        swapped = true;
        yield frame(arr, sorted, stats, { swap: [j, j + 1], note: `${a} > ${b}，交换` });
      }
    }
    sorted.push(arr.length - 1 - i);
    yield frame(arr, sorted, stats, { note: `第 ${i + 1} 轮结束，${arr[arr.length - 1 - i]} 就位` });
    if (!swapped) {
      for (let k = 0; k < arr.length - 1 - i; k++) sorted.push(k);
      yield frame(arr, sorted, stats, { note: '本轮没有任何交换，数组已经有序，提前结束' });
      return;
    }
  }
  sorted.push(0);
  yield frame(arr, sorted, stats, { note: '排序完成' });
}

/* ---------- 选择排序 ---------- */
function* selectionSort(input) {
  const arr = input.slice();
  const stats = makeStats();
  const sorted = [];
  yield frame(arr, sorted, stats, { note: '选择排序开始：每一轮从未排序区选出最小值，放到最前面' });

  for (let i = 0; i < arr.length - 1; i++) {
    let min = i;
    yield frame(arr, sorted, stats, { pivot: min, note: `假设 ${arr[min]} 是本轮最小值` });
    for (let j = i + 1; j < arr.length; j++) {
      stats.comparisons++;
      yield frame(arr, sorted, stats, { compare: [j, min], pivot: min, note: `比较 ${arr[j]} 和当前最小 ${arr[min]}` });
      if (arr[j] < arr[min]) {
        min = j;
        yield frame(arr, sorted, stats, { pivot: min, note: `发现更小的值 ${arr[min]}` });
      }
    }
    if (min !== i) {
      [arr[i], arr[min]] = [arr[min], arr[i]];
      stats.writes += 2;
      yield frame(arr, sorted, stats, { swap: [i, min], note: `把最小值 ${arr[i]} 换到位置 ${i}` });
    }
    sorted.push(i);
  }
  sorted.push(arr.length - 1);
  yield frame(arr, sorted, stats, { note: '排序完成' });
}

/* ---------- 插入排序（相邻交换实现，动画更直观） ---------- */
function* insertionSort(input) {
  const arr = input.slice();
  const stats = makeStats();
  const sorted = [0];
  yield frame(arr, sorted, stats, { note: '插入排序开始：左边看成已排序区，逐个把新元素向前换到合适位置' });

  for (let i = 1; i < arr.length; i++) {
    let j = i;
    yield frame(arr, sorted, stats, { pivot: i, note: `把 ${arr[i]} 插入前面的已排序区` });
    while (j > 0) {
      stats.comparisons++;
      yield frame(arr, sorted, stats, { compare: [j - 1, j], pivot: i, note: `比较 ${arr[j - 1]} 和 ${arr[j]}` });
      if (arr[j - 1] > arr[j]) {
        [arr[j - 1], arr[j]] = [arr[j], arr[j - 1]];
        stats.writes += 2;
        yield frame(arr, sorted, stats, { swap: [j - 1, j], note: `逆序，交换，继续向前` });
        j--;
      } else {
        break;
      }
    }
    sorted.push(i);
    yield frame(arr, sorted, stats, { note: `${arr[j]} 已插入位置 ${j}` });
  }
  yield frame(arr, sorted, stats, { note: '排序完成' });
}

/* ---------- 快速排序（Lomuto 分区） ---------- */
function* quickSort(input) {
  const arr = input.slice();
  const stats = makeStats();
  const sorted = [];
  yield frame(arr, sorted, stats, { note: '快速排序开始：选基准，比它小的放左边，大的放右边，再递归两侧' });

  yield* qs(0, arr.length - 1);

  for (let k = 0; k < arr.length; k++) sorted.push(k);
  yield frame(arr, sorted, stats, { note: '排序完成' });

  function* qs(lo, hi) {
    if (lo > hi) return;
    if (lo === hi) {
      sorted.push(lo);
      yield frame(arr, sorted, stats, { note: `区间只剩一个元素，${arr[lo]} 自动就位` });
      return;
    }
    const pivot = arr[hi];
    let i = lo;
    yield frame(arr, sorted, stats, { pivot: hi, range: [lo, hi], note: `区间 [${lo}, ${hi}] 选最后一个元素 ${pivot} 作基准` });

    for (let j = lo; j < hi; j++) {
      stats.comparisons++;
      yield frame(arr, sorted, stats, { compare: [j, hi], pivot: hi, range: [lo, hi], note: `比较 ${arr[j]} 和基准 ${pivot}` });
      if (arr[j] < pivot) {
        if (i !== j) {
          [arr[i], arr[j]] = [arr[j], arr[i]];
          stats.writes += 2;
          yield frame(arr, sorted, stats, { swap: [i, j], pivot: hi, range: [lo, hi], note: `${arr[i]} 比基准小，交换到左侧` });
        }
        i++;
      }
    }
    if (i !== hi) {
      [arr[i], arr[hi]] = [arr[hi], arr[i]];
      stats.writes += 2;
    }
    yield frame(arr, sorted, stats, { swap: i !== hi ? [i, hi] : null, pivot: i, range: [lo, hi], note: `基准 ${pivot} 归位到位置 ${i}` });
    sorted.push(i);

    yield* qs(lo, i - 1);
    yield* qs(i + 1, hi);
  }
}

/* ---------- 归并排序 ---------- */
function* mergeSort(input) {
  const arr = input.slice();
  const stats = makeStats();
  const sorted = [];
  yield frame(arr, sorted, stats, { note: '归并排序开始：不断二分，再把两个有序段合并成一个' });

  yield* ms(0, arr.length - 1);

  for (let k = 0; k < arr.length; k++) sorted.push(k);
  yield frame(arr, sorted, stats, { note: '排序完成' });

  function* ms(lo, hi) {
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;
    yield frame(arr, sorted, stats, { range: [lo, hi], note: `拆分 [${lo}, ${hi}] → [${lo}, ${mid}] + [${mid + 1}, ${hi}]` });
    yield* ms(lo, mid);
    yield* ms(mid + 1, hi);

    // 合并两个有序段
    const tmp = [];
    let i = lo, j = mid + 1;
    while (i <= mid && j <= hi) {
      stats.comparisons++;
      yield frame(arr, sorted, stats, { compare: [i, j], range: [lo, hi], note: `合并：比较左段 ${arr[i]} 和右段 ${arr[j]}` });
      tmp.push(arr[i] <= arr[j] ? arr[i++] : arr[j++]);
    }
    while (i <= mid) tmp.push(arr[i++]);
    while (j <= hi) tmp.push(arr[j++]);

    for (let k = 0; k < tmp.length; k++) {
      arr[lo + k] = tmp[k];
      stats.writes++;
      yield frame(arr, sorted, stats, { overwrite: lo + k, range: [lo, hi], note: `写回 ${tmp[k]} 到位置 ${lo + k}` });
    }
  }
}

/* ---------- 注册表：下拉框的 value 对应这里的 key ---------- */
const SORTS = {
  bubble: { name: '冒泡排序', gen: bubbleSort },
  selection: { name: '选择排序', gen: selectionSort },
  insertion: { name: '插入排序', gen: insertionSort },
  quick: { name: '快速排序', gen: quickSort },
  merge: { name: '归并排序', gen: mergeSort }
};
