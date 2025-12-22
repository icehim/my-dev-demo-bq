<script lang="ts" setup>
import { ElMessage, ElTable } from 'element-plus';
import { nextTick, ref } from 'vue';

const tableData = ref<TD_ITEM[]>([
  { tdxh: 1, tdmc: '第1梯队', bd: 'A部队' },
  { tdxh: 2, tdmc: '第1梯队', bd: 'B部队' },
  { tdxh: 3, tdmc: '第2梯队', bd: 'C部队' },
  { tdxh: 4, tdmc: '第2梯队', bd: 'D部队' },
  { tdxh: 5, tdmc: '第2梯队', bd: 'E部队' },
  { tdxh: 6, tdmc: '第3梯队', bd: 'F部队' },
  { tdxh: 7, tdmc: '第3梯队', bd: 'G部队' }
]);

const selection = ref<TD_ITEM[]>([]);

function onSelectionChange(rows: TD_ITEM[]) {
  selection.value = rows;
}
const tableRef = ref<InstanceType<typeof ElTable>>();
async function onMove(dir: 'up' | 'down') {
  const selectedIds = new Set(selection.value.map(r => r.tdxh));
  // 先移动
  tableData.value = moveSelected(tableData.value, selection.value, dir);

  // 等表格刷新完再恢复选中
  await nextTick();

  tableRef.value?.clearSelection();
  for (const row of tableData.value) {
    if (selectedIds.has(row.tdxh)) {
      tableRef.value?.toggleRowSelection(row, true);
    }
  }
}

type TD_ITEM = { tdxh: number; tdmc: string; bd: string };

const tierRe = /第(\d+)梯队/;
const parseTierNo = (tdmc: string) => Number(tdmc.match(tierRe)?.[1] ?? 0);
const formatTier = (no: number) => `第${no}梯队`;

// 用来判断：当前选中的多行数据，是不是都属于同一个梯队。
function assertSameTier(selected: TD_ITEM[]): number | null {
  if (!selected.length) return null;
  const t = parseTierNo(selected[0].tdmc);
  return selected.every(r => parseTierNo(r.tdmc) === t) ? t : -1;
}

/** 获取某梯队在 list 中的 [start, endExclusive) 连续区间（默认你的数据是按梯队分组的） */
function getTierRange(list: TD_ITEM[], tierNo: number): [number, number] {
  let start = -1,
    end = -1;
  for (let i = 0; i < list.length; i++) {
    if (parseTierNo(list[i].tdmc) === tierNo) {
      start = i;
      break;
    }
  }
  if (start === -1) return [-1, -1];
  end = start;
  while (end < list.length && parseTierNo(list[end].tdmc) === tierNo) end++;
  return [start, end];
}

/** 按“出现顺序”重编号为 1..N（用于梯队整体移动后保证 1 开始递增） */
function renumberTiersByAppearance(list: TD_ITEM[]): TD_ITEM[] {
  const order: number[] = [];
  const seen = new Set<number>();

  for (const r of list) {
    const t = parseTierNo(r.tdmc);
    if (t && !seen.has(t)) {
      seen.add(t);
      order.push(t);
    }
  }

  const map = new Map<number, number>();
  order.forEach((oldNo, idx) => map.set(oldNo, idx + 1));

  return list.map(r => ({
    ...r,
    tdmc: formatTier(map.get(parseTierNo(r.tdmc)) ?? parseTierNo(r.tdmc))
  }));
}

// 移动梯队
function moveTier(
  list: TD_ITEM[],
  selected: TD_ITEM[],
  dir: 'up' | 'down'
): TD_ITEM[] {
  const tierNo = assertSameTier(selected);
  if (tierNo === null || tierNo === -1) return list;

  const [s, e] = getTierRange(list, tierNo);
  if (s === -1) return list;

  // 找相邻梯队块
  if (dir === 'up') {
    if (s === 0) return list;
    const prevTier = parseTierNo(list[s - 1].tdmc);
    const [ps, pe] = getTierRange(list, prevTier);
    if (ps === -1) return list;

    const next = list.slice();
    const prevBlock = next.slice(ps, pe);
    const curBlock = next.slice(s, e);
    next.splice(ps, e - ps, ...curBlock, ...prevBlock);
    return renumberTiersByAppearance(next);
  } else {
    if (e >= list.length) return list;
    const nextTier = parseTierNo(list[e].tdmc);
    const [ns, ne] = getTierRange(list, nextTier);
    if (ns === -1) return list;

    const next = list.slice();
    const curBlock = next.slice(s, e);
    const nextBlock = next.slice(ns, ne);
    next.splice(s, ne - s, ...nextBlock, ...curBlock);
    return renumberTiersByAppearance(next);
  }
}

// 判断是否选中整梯队
function isWholeTierSelected(
  list: TD_ITEM[],
  selected: TD_ITEM[],
  tierNo: number
): boolean {
  const [s, e] = getTierRange(list, tierNo);
  if (s === -1) return false;
  const tierIds = new Set(list.slice(s, e).map(r => r.tdxh));
  const selectedIds = new Set(selected.map(r => r.tdxh));
  return (
    tierIds.size === selectedIds.size &&
    [...tierIds].every(tdxh => selectedIds.has(tdxh))
  );
}

//移动梯队内部队
function moveUnitsWithinTier(
  list: TD_ITEM[],
  selected: TD_ITEM[],
  dir: 'up' | 'down'
): TD_ITEM[] {
  const tierNo = assertSameTier(selected);
  if (tierNo === null || tierNo === -1) return list;

  const [s, e] = getTierRange(list, tierNo);
  if (s === -1) return list;

  const selectedId = new Set(selected.map(r => r.tdxh));
  const next = list.slice();

  if (dir === 'up') {
    for (let i = s + 1; i < e; i++) {
      if (selectedId.has(next[i].tdxh) && !selectedId.has(next[i - 1].tdxh)) {
        [next[i - 1], next[i]] = [next[i], next[i - 1]];
      }
    }
  } else {
    for (let i = e - 2; i >= s; i--) {
      if (selectedId.has(next[i].tdxh) && !selectedId.has(next[i + 1].tdxh)) {
        [next[i], next[i + 1]] = [next[i + 1], next[i]];
      }
    }
  }

  // 梯队内移动不改变梯队顺序，不需要重编号
  return next;
}

function moveSelected(
  list: TD_ITEM[],
  selected: TD_ITEM[],
  dir: 'up' | 'down'
): TD_ITEM[] {
  if (!selected.length) return list;

  const tierNo = assertSameTier(selected);
  if (tierNo === -1) {
    ElMessage.warning('不能跨梯队移动');
    return list;
  }
  if (tierNo === null) return list;

  const wholeTier = isWholeTierSelected(list, selected, tierNo);

  // A) 选中整梯队：提示“梯队到顶/到底”
  if (wholeTier) {
    const [s, e] = getTierRange(list, tierNo);
    if (dir === 'up' && s === 0) {
      ElMessage.info('已到最前梯队，无法上移');
      return list;
    }
    if (dir === 'down' && e >= list.length) {
      ElMessage.info('已到最后梯队，无法下移');
      return list;
    }
    return moveTier(list, selected, dir);
  }

  // B) 选中部分：提示“本梯队内到顶/到底”
  const [s, e] = getTierRange(list, tierNo);
  const selectedId = new Set(selected.map(r => r.tdxh));

  if (dir === 'up') {
    // 如果选中集合里包含本梯队第一行，那么整体无法再上移（至少第一行动不了）
    if (selectedId.has(list[s].tdxh)) {
      ElMessage.info('已到本梯队顶部，无法上移');
      return list;
    }
  } else {
    // 如果选中集合里包含本梯队最后一行，那么整体无法再下移
    if (selectedId.has(list[e - 1].tdxh)) {
      ElMessage.info('已到本梯队底部，无法下移');
      return list;
    }
  }

  return moveUnitsWithinTier(list, selected, dir);
}
</script>

<template>
  <div>
    <el-table
      ref="tableRef"
      :data="tableData"
      row-key="tdxh"
      @selection-change="onSelectionChange"
    >
      <el-table-column type="selection" />
      <el-table-column type="index" />
      <el-table-column prop="tdmc" label="梯队" />
      <el-table-column prop="bd" label="部队" />
    </el-table>

    <el-button @click="onMove('up')">上移</el-button>
    <el-button @click="onMove('down')">下移</el-button>
  </div>
</template>

<style scoped lang="scss"></style>
