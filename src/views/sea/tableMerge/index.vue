<template>
  <div style="padding: 12px">
    <div style="display: flex; gap: 8px; margin-bottom: 8px">
      <el-button type="primary" @click="moveUp">上移</el-button>
      <el-button type="primary" @click="moveDown">下移</el-button>
    </div>
    <vxe-grid
      ref="gridRef"
      border
      height="770"
      :row-config="{ isHover: true, keyField: 'tdxh' }"
      :column-config="{ resizable: true }"
      :scroll-y="{ enabled: true }"
      :merge-cells="mergeCells"
      :columns="columns"
      :data="data"
    />
  </div>
</template>
<script lang="ts" setup>
import { nextTick, ref } from 'vue';
import { VxeGridInstance, VxeGridPropTypes } from 'vxe-table';
import { ElMessage } from 'element-plus';
interface RowVO {
  tdxh?: number;
  tdmc: string;
  name: string;
  xqId: string;
}
const gridRef = ref<VxeGridInstance<RowVO>>();
function getCheckedRows(): RowVO[] {
  const $grid = gridRef.value;
  if (!$grid) return [];
  return ($grid.getCheckboxRecords?.() as RowVO[]) ?? [];
}
async function moveUp() {
  await move('up');
}
async function moveDown() {
  await move('down');
}
function renumberTdmcOnly() {
  // ✅ 按当前 data 顺序，把梯队块重新编号为 第1梯队、第2梯队...
  let tierNo = 0;
  let last = '';
  for (const r of data.value) {
    if (r.tdmc !== last) {
      tierNo += 1;
      last = r.tdmc;
    }
    r.tdmc = `第${tierNo}梯队`;
  }
}
function getTierBlockRangeByTdmc(tdmc: string) {
  const rows = data.value;
  const idxs: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].tdmc === tdmc) idxs.push(i);
  }
  if (!idxs.length) return null;
  // 要求连续块
  const start = idxs[0];
  const end = idxs[idxs.length - 1];
  for (let i = start; i <= end; i++) {
    if (rows[i].tdmc !== tdmc) {
      return null; // 不连续：不支持整梯队移动（也不建议出现）
    }
  }
  return { start, end, count: end - start + 1 };
}
function getCheckedIds(): number[] {
  return getCheckedRows()
    .map(r => r.tdxh)
    .filter((v): v is number => typeof v === 'number');
}
function restoreCheckedByIds(ids: number[]) {
  const $grid = gridRef.value;
  if (!$grid) return;
  $grid.clearCheckboxRow?.();
  const set = new Set(ids);
  const rowsToCheck = data.value.filter(r => r.tdxh != null && set.has(r.tdxh));
  if (rowsToCheck.length) {
    $grid.setCheckboxRow?.(rowsToCheck, true);
  }
}
function moveWholeTierOneStep(tierTdmc: string, direction: 'up' | 'down') {
  const rows = data.value;
  const cur = getTierBlockRangeByTdmc(tierTdmc);
  if (!cur) return;
  if (direction === 'up') {
    if (cur.start === 0) return;
    // 找到上一个梯队块（紧挨着 cur.start-1 的那个 tdmc）
    const prevTdmc = rows[cur.start - 1].tdmc;
    const prev = getTierBlockRangeByTdmc(prevTdmc);
    if (!prev) return;
    const prevBlock = rows.slice(prev.start, prev.end + 1);
    const curBlock = rows.slice(cur.start, cur.end + 1);
    rows.splice(prev.start, prev.count + cur.count, ...curBlock, ...prevBlock);
  } else {
    if (cur.end === rows.length - 1) return;
    // 找到下一个梯队块（紧挨着 cur.end+1 的那个 tdmc）
    const nextTdmc = rows[cur.end + 1].tdmc;
    const next = getTierBlockRangeByTdmc(nextTdmc);
    if (!next) return;
    const curBlock = rows.slice(cur.start, cur.end + 1);
    const nextBlock = rows.slice(next.start, next.end + 1);
    rows.splice(cur.start, cur.count + next.count, ...nextBlock, ...curBlock);
  }
  data.value = rows;
}
function moveRowsWithinTierOneStep(
  tierTdmc: string,
  selectedRefs: RowVO[],
  direction: 'up' | 'down'
) {
  const rows = data.value;
  const selSet = new Set(selectedRefs);
  // 只允许在 tierTdmc 范围内移动
  const range = getTierBlockRangeByTdmc(tierTdmc);
  if (!range) return;
  const { start, end } = range;
  // 选中行在 data 中的索引（只取该梯队内）
  const selectedIdx: number[] = [];
  for (let i = start; i <= end; i++) {
    if (selSet.has(rows[i])) selectedIdx.push(i);
  }
  if (!selectedIdx.length) return;
  if (direction === 'up') {
    // 从上往下遍历
    for (const i of selectedIdx) {
      const prev = i - 1;
      if (prev < start) continue; // ✅ 不允许跨梯队
      if (selSet.has(rows[prev])) continue; // 保持块移动效果
      [rows[prev], rows[i]] = [rows[i], rows[prev]];
    }
  } else {
    // 从下往上遍历
    for (let t = selectedIdx.length - 1; t >= 0; t--) {
      const i = selectedIdx[t];
      const next = i + 1;
      if (next > end) continue; // ✅ 不允许跨梯队
      if (selSet.has(rows[next])) continue;
      [rows[next], rows[i]] = [rows[i], rows[next]];
    }
  }
  data.value = rows;
}
async function refreshAfterMove(selectedIds: number[]) {
  // ✅ 只重算 tdmc（不动 tdxh）
  renumberTdmcOnly();
  const $grid = gridRef.value;
  // ✅ 虚拟滚动下建议同步一下（没有也不会报错）
  if ($grid?.reloadData) {
    await $grid.reloadData(data.value as any);
  }
  await nextTick();
  requestAnimationFrame(() => {
    buildMergeCellsByVisible();
    restoreCheckedByIds(selectedIds);
  });
}
async function move(direction: 'up' | 'down') {
  const selected = getCheckedRows();

  // ✅ 1) 未选择
  if (!selected.length) {
    ElMessage.warning('请选择数据后再移动');
    return;
  }

  // ✅ 保存稳定主键（用于恢复勾选）
  const selectedIds = getCheckedIds();

  // ✅ 2) 不允许跨梯队选择
  const tierSet = new Set(selected.map(r => r.tdmc));
  if (tierSet.size !== 1) {
    ElMessage.warning('不允许跨梯队移动');
    return;
  }

  const tierTdmc = selected[0].tdmc;
  const range = getTierBlockRangeByTdmc(tierTdmc);
  if (!range) {
    ElMessage.warning('该梯队数据不是连续块，无法移动');
    return;
  }

  // ✅ 是否整梯队移动
  const isWholeTier = selected.length === range.count;

  // ✅ 3) 到顶/到底不能移动（分整梯队 vs 梯队内）
  if (isWholeTier) {
    if (direction === 'up' && range.start === 0) {
      ElMessage.warning('已到最顶层，不能上移');
      return;
    }
    if (direction === 'down' && range.end === data.value.length - 1) {
      ElMessage.warning('已到最底层，不能下移');
      return;
    }
    moveWholeTierOneStep(tierTdmc, direction);
  } else {
    // 梯队内行移动边界判断：看选中行是否顶住梯队边界
    const selSet = new Set(selected);
    let minIdx = Infinity;
    let maxIdx = -Infinity;

    for (let i = range.start; i <= range.end; i++) {
      if (selSet.has(data.value[i])) {
        if (i < minIdx) minIdx = i;
        if (i > maxIdx) maxIdx = i;
      }
    }

    if (direction === 'up' && minIdx === range.start) {
      ElMessage.warning('已到最顶层，不能上移');
      return;
    }
    if (direction === 'down' && maxIdx === range.end) {
      ElMessage.warning('已到最底层，不能下移');
      return;
    }

    moveRowsWithinTierOneStep(tierTdmc, selected, direction);
  }

  await refreshAfterMove(selectedIds);
}
function parseTdmc(tdmc: any): number | null {
  if (tdmc == null) return null;
  if (typeof tdmc === 'number') return tdmc;
  const m = String(tdmc).match(/(\d+)/);
  return m ? Number(m[1]) : null;
}
/**
 * ✅ 预处理 tableData：
 * - 按 xqId 分组并保持首次出现顺序
 * - 每组内按“相邻 tdmc”切合并段
 * - 段 => 全局递增编号，写回 tdmc
 */
function normalizeTableData(raw: RowVO[]): RowVO[] {
  // 1) 按 xqId 分组（保持首次出现顺序）
  const order: string[] = [];
  const groups = new Map<string, RowVO[]>();
  for (const r of raw) {
    const key = r.xqId;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push({ ...r }); // clone
  }
  // 2) 两个编号：
  // rowId：每一行唯一（tdxh）
  // tierId：每个“可合并段”唯一（tdmc）
  let rowId = 1;
  let tierId = 1;
  const result: RowVO[] = [];
  for (const key of order) {
    const rows = groups.get(key)!;
    if (!rows.length) continue;
    let segStart = 0;
    let prev = parseTdmc(rows[0].tdmc);
    for (let i = 1; i <= rows.length; i++) {
      const cur = i < rows.length ? parseTdmc(rows[i].tdmc) : null;
      const isEnd = i === rows.length;
      // 一个“可合并段”结束：分配一个新的梯队号 tierId
      if (isEnd || cur !== prev) {
        const thisTier = tierId++;
        for (let k = segStart; k < i; k++) {
          rows[k].tdxh = rowId++; // ✅ 行唯一主键
          rows[k].tdmc = `第${thisTier}梯队`; // ✅ 用于合并/展示（可重复）
        }
        segStart = i;
        prev = cur;
      }
    }
    result.push(...rows);
  }
  return result;
}
/**
 * ✅ 数据、列、合并规则都拆开（最稳）
 */
const data = ref<RowVO[]>([]);
const columns: VxeGridPropTypes.Columns<RowVO> = [
  { type: 'checkbox', width: 60 },
  { type: 'seq', width: 70 },
  { field: 'tdxh', title: 'id' },
  { field: 'tdmc', title: '梯队名称' },
  { field: 'name', title: '名称' }
];
// vxe merge-cells 需要的结构
const mergeCells = ref<
  { row: number; col: number; rowspan: number; colspan: number }[]
>([]);
/**
 * 你原来的规则：相邻相同值纵向合并（rowspan）
 * 这里示例只合并 name；需要多字段就加进去即可
 */
const spanFields = ['tdmc'] as const;
function buildMergeCellsByVisible() {
  const $grid = gridRef.value;
  if (!$grid) return;
  // 当前可视数据（排序/筛选/虚拟滚动后的渲染顺序）
  const { visibleData } = $grid.getTableData();
  // ✅ 叶子列（可视列），用于正确计算 mergeCells.col（分组表头也不会错）
  const { visibleColumn } = $grid.getTableColumn();
  const result: {
    row: number;
    col: number;
    rowspan: number;
    colspan: number;
  }[] = [];
  for (const field of spanFields) {
    const colIndex = visibleColumn.findIndex(col => col.field === field);
    if (colIndex < 0) continue;
    let start = 0;
    while (start < visibleData.length) {
      const v = (visibleData[start] as any)?.[field];
      if (v == null || v === '') {
        start++;
        continue;
      }
      let end = start + 1;
      while (
        end < visibleData.length &&
        (visibleData[end] as any)?.[field] === v
      ) {
        end++;
      }
      const rowspan = end - start;
      if (rowspan > 1) {
        result.push({ row: start, col: colIndex, rowspan, colspan: 1 });
      }
      start = end;
    }
  }
  // ✅ 更新 mergeCells
  mergeCells.value = result;
  // ✅ 某些版本需要强制刷新一下合并渲染（有就调，没有也不会报错）
  $grid.setMergeCells?.(result);
  $grid.recalculate?.();
}
/**
 * 加载数据并合并
 */
async function reloadAndMerge() {
  // ✅ 必须有连续相同值才会触发纵向合并
  const raw: RowVO[] = [
    {
      tdmc: '第1梯队',
      name: '1',
      xqId: 'A'
    },
    {
      tdmc: '第1梯队',
      name: '2',
      xqId: 'A'
    },
    {
      tdmc: '第1梯队',
      name: '3',
      xqId: 'A'
    },
    {
      tdmc: '第2梯队',
      name: '4',
      xqId: 'A'
    },
    {
      tdmc: '第2梯队',
      name: '5',
      xqId: 'A'
    },
    {
      tdmc: '第1梯队',
      name: '6',
      xqId: 'B'
    },
    {
      tdmc: '第1梯队',
      name: '7',
      xqId: 'B'
    },
    {
      tdmc: '第2梯队',
      name: '8',
      xqId: 'B'
    },
    {
      tdmc: '第2梯队',
      name: '9',
      xqId: 'B'
    },
    {
      tdmc: '第2梯队',
      name: '10',
      xqId: 'B'
    },
    {
      tdmc: '第1梯队',
      name: '11',
      xqId: 'C'
    },
    {
      tdmc: '第2梯队',
      name: '12',
      xqId: 'C'
    },
    {
      tdmc: '第3梯队',
      name: '13',
      xqId: 'C'
    },
    {
      tdmc: '第4梯队',
      name: '14',
      xqId: 'C'
    },
    {
      tdmc: '第4梯队',
      name: '15',
      xqId: 'C'
    }
  ];
  data.value = normalizeTableData(raw);
  // ✅ 等待 Vue 渲染 + vxe 内部列/数据计算完成（虚拟表格常需要晚一拍）
  await nextTick();
  requestAnimationFrame(() => buildMergeCellsByVisible());
}
// 初始化：加载并合并
reloadAndMerge();
</script>
<style scoped></style>
