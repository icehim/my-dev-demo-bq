<template>
  <div style="padding: 12px">
    <div style="display: flex; gap: 8px; margin-bottom: 8px">
      <el-button type="primary" @click="moveUp">上移</el-button>
      <el-button type="primary" @click="moveDown">下移</el-button>
      <el-button type="primary" @click="saveSort">保存排序</el-button>
    </div>
    <vxe-grid
      ref="gridRef"
      border
      height="1000"
      :row-config="{ isHover: true, keyField: 'id' }"
      :column-config="{ resizable: true }"
      :scroll-y="{ enabled: true }"
      :merge-cells="mergeCells"
      :columns="columns"
      :data="data"
    />
  </div>
</template>
<script lang="tsx" setup>
import { nextTick, ref } from 'vue';
import { VxeGridInstance, VxeGridPropTypes } from 'vxe-table';
import { ElMessage } from 'element-plus';
import { tableData } from '@/views/sea/tableMerge/data';
interface RowVO {
  id: string; // ✅ 后端主键
  sort?: number;
  tdmc: string;
  name: string;
  xqId: string;
  date?: string;
}
const gridRef = ref<VxeGridInstance<RowVO>>();
function getCheckedRows(): RowVO[] {
  const $grid = gridRef.value;
  if (!$grid) return [];
  return ($grid.getCheckboxRecords?.() as RowVO[]) ?? [];
}

// 只负责“展示梯队名全局递增”的重编号函数（不动 id）:这个函数会根据 当前 data 顺序，按 xqId 分组顺序 + 相邻段，重新把 tdmc 改成 第1梯队、第2梯队…（全局不重复、连续递增）。
function renumberDisplayTiersByOrder(list: RowVO[]): RowVO[] {
  let tierId = 1;
  let rowSeq = 1;

  let prevTdmc: string | null = null;
  for (const r of list) {
    // 每当 tdmc 变化，说明进入下一个梯队块
    if (prevTdmc !== r.tdmc) {
      prevTdmc = r.tdmc;
      // 新块开始：tierId 不变在本行赋值后再 ++，更直观
      r.tdmc = `第${tierId}梯队`;
      tierId++;
    } else {
      // 同一块内保持同名
      r.tdmc = `第${tierId - 1}梯队`;
    }
  }

  return list;
}
function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function isAllSelectedInTier(allRows: RowVO[], checked: RowVO[], tdmc: string) {
  const tierAll = allRows.filter(r => r.tdmc === tdmc);
  const tierChecked = checked.filter(r => r.tdmc === tdmc);
  return tierAll.length > 0 && tierChecked.length === tierAll.length;
}

// 梯队内：把选中行作为“块”上移/下移一格（保持相对顺序），且不跨梯队
function moveSelectedRowsWithinTier(
  allRows: RowVO[],
  checkedIds: Set<RowVO['id']>,
  tdmc: string,
  dir: 'up' | 'down'
) {
  // 只处理该梯队段的连续区间
  const idxs = allRows
    .map((r, i) => ({ r, i }))
    .filter(x => x.r.tdmc === tdmc)
    .map(x => x.i);

  if (!idxs.length) return false;

  const start = idxs[0];
  const end = idxs[idxs.length - 1];

  let moved = false;

  if (dir === 'up') {
    for (let i = start + 1; i <= end; i++) {
      const curSel = checkedIds.has(allRows[i].id);
      const prevSel = checkedIds.has(allRows[i - 1].id);
      if (curSel && !prevSel) {
        const tmp = allRows[i - 1];
        allRows[i - 1] = allRows[i];
        allRows[i] = tmp;
        moved = true;
      }
    }
  } else {
    for (let i = end - 1; i >= start; i--) {
      const curSel = checkedIds.has(allRows[i].id);
      const nextSel = checkedIds.has(allRows[i + 1].id);
      if (curSel && !nextSel) {
        const tmp = allRows[i + 1];
        allRows[i + 1] = allRows[i];
        allRows[i] = tmp;
        moved = true;
      }
    }
  }

  return moved;
}

// 整梯队：与相邻梯队段交换（仅同 xqId 内）
function swapTierBlock(allRows: RowVO[], tdmc: string, dir: 'up' | 'down') {
  // 当前梯队块区间
  const curIdxs = allRows
    .map((r, i) => ({ r, i }))
    .filter(x => x.r.tdmc === tdmc)
    .map(x => x.i);

  if (!curIdxs.length) return false;
  const curStart = curIdxs[0];
  const curEnd = curIdxs[curIdxs.length - 1];

  if (dir === 'up') {
    if (curStart === 0) return false;
    const prevTdmc = allRows[curStart - 1].tdmc;

    // 找 prev 块起止
    let prevEnd = curStart - 1;
    let prevStart = prevEnd;
    while (prevStart - 1 >= 0 && allRows[prevStart - 1].tdmc === prevTdmc)
      prevStart--;

    const prevBlock = allRows.slice(prevStart, prevEnd + 1);
    const curBlock = allRows.slice(curStart, curEnd + 1);

    allRows.splice(
      prevStart,
      prevBlock.length + curBlock.length,
      ...curBlock,
      ...prevBlock
    );
    return true;
  } else {
    if (curEnd === allRows.length - 1) return false;
    const nextTdmc = allRows[curEnd + 1].tdmc;

    let nextStart = curEnd + 1;
    let nextEnd = nextStart;
    while (
      nextEnd + 1 < allRows.length &&
      allRows[nextEnd + 1].tdmc === nextTdmc
    )
      nextEnd++;

    const curBlock = allRows.slice(curStart, curEnd + 1);
    const nextBlock = allRows.slice(nextStart, nextEnd + 1);

    allRows.splice(
      curStart,
      curBlock.length + nextBlock.length,
      ...nextBlock,
      ...curBlock
    );
    return true;
  }
}

async function afterMoveAndRefresh(checked: RowVO[]) {
  // 1) 重新编号（保证第1..第N递增不重复）
  data.value = renumberDisplayTiersByOrder([...data.value]);

  // 2) 等待渲染并重算合并
  await nextTick();
  requestAnimationFrame(() => buildMergeCellsByVisible());

  // 3) 重新勾选（按 id）
  const $grid = gridRef.value;
  if ($grid?.setCheckboxRow) {
    // 清空后再勾选（避免 vxe 内部状态不同步）
    $grid.setAllCheckboxRow?.(false);
    for (const r of checked) {
      const row = data.value.find(x => x.id === r.id);
      if (row) $grid.setCheckboxRow(row, true);
    }
  }
}

async function moveUp() {
  const $grid = gridRef.value;
  if (!$grid) return;

  const checked = getCheckedRows();
  if (!checked.length) {
    ElMessage.warning('请先勾选要移动的数据');
    return;
  }

  const tdList = unique(checked.map(r => r.tdmc));

  // 不能跨梯队移动
  if (tdList.length !== 1) {
    ElMessage.warning('不能跨梯队移动，请只选择同一梯队的数据');
    return;
  }

  const tdmc = tdList[0];

  const checkedIds = new Set(checked.map(r => r.id));

  // 判断是否全选该梯队：全选则视为“整梯队移动”
  const isAll = isAllSelectedInTier(data.value, checked, tdmc);

  let moved = false;
  if (isAll) {
    moved = swapTierBlock(data.value, tdmc, 'up');
    if (!moved) {
      ElMessage.info('已到最上方梯队，无法上移');
      return;
    }
  } else {
    moved = moveSelectedRowsWithinTier(data.value, checkedIds, tdmc, 'up');
    if (!moved) {
      ElMessage.info('已到梯队顶部，无法上移');
      return;
    }
  }

  await afterMoveAndRefresh(checked);
}

async function moveDown() {
  const $grid = gridRef.value;
  if (!$grid) return;

  const checked = getCheckedRows();
  if (!checked.length) {
    ElMessage.warning('请先勾选要移动的数据');
    return;
  }

  const tdList = unique(checked.map(r => r.tdmc));

  if (tdList.length !== 1) {
    ElMessage.warning('不能跨梯队移动，请只选择同一梯队的数据');
    return;
  }

  const tdmc = tdList[0];

  const checkedIds = new Set(checked.map(r => r.id));

  const isAll = isAllSelectedInTier(data.value, checked, tdmc);

  let moved = false;
  if (isAll) {
    moved = swapTierBlock(data.value, tdmc, 'down');
    if (!moved) {
      ElMessage.info('已到最下方梯队，无法下移');
      return;
    }
  } else {
    moved = moveSelectedRowsWithinTier(data.value, checkedIds, tdmc, 'down');
    if (!moved) {
      ElMessage.info('已到梯队底部，无法下移');
      return;
    }
  }

  await afterMoveAndRefresh(checked);
}

function parseTdmc(tdmc: any): number | null {
  if (tdmc == null) return null;
  if (typeof tdmc === 'number') return tdmc;
  const m = String(tdmc).match(/(\d+)/);
  return m ? Number(m[1]) : null;
}
/**
 * ✅ 顺序保持型 normalize：
 * - 不按 xqId 分组、不重排
 * - 只沿着当前数组顺序扫描
 * - 按“相邻 tdmc(数字) 变化”切段
 * - 给每个段分配全局递增且不重复的展示梯队名：第1、第2...梯队
 */
function normalizeTableData(raw: RowVO[]): RowVO[] {
  const rows = raw.map(r => ({ ...r })); // clone

  let tierId = 1;

  let segStart = 0;
  let prevNum = rows.length ? parseTdmc(rows[0].tdmc) : null;
  let prevXq = rows.length ? rows[0].xqId : null;

  for (let i = 1; i <= rows.length; i++) {
    const isEnd = i === rows.length;
    const curNum = i < rows.length ? parseTdmc(rows[i].tdmc) : null;
    const curXq = i < rows.length ? rows[i].xqId : null;

    // ✅ 段切分：tdmc数字变化 或 xqId变化
    if (isEnd || curNum !== prevNum || curXq !== prevXq) {
      const thisTier = tierId++;
      for (let k = segStart; k < i; k++) {
        rows[k].tdmc = `第${thisTier}梯队`;
      }
      segStart = i;
      prevNum = curNum;
      prevXq = curXq;
    }
  }

  return rows;
}
function onTierDateChange(anchorRow: RowVO, val: any) {
  // 同梯队共享：把该 tdmc 下所有行 date 都更新成同一个值
  const tdmc = anchorRow.tdmc;
  for (const r of data.value) {
    if (r.tdmc === tdmc) r.date = val;
  }
}
/**
 * ✅ 数据、列、合并规则都拆开（最稳）
 */
const data = ref<RowVO[]>([]);
const columns: VxeGridPropTypes.Columns<RowVO> = [
  { fixed: 'left', type: 'checkbox', width: 60 },
  { fixed: 'left', type: 'seq', width: 70 },
  { fixed: 'left', field: 'id', title: 'id' },
  { fixed: 'left', field: 'tdmc', title: '梯队名称' },
  {
    fixed: 'left',
    field: 'date',
    title: '日期',
    width: 180,
    slots: {
      default: ({ row, rowIndex }) => {
        const $grid = gridRef.value;
        const { visibleData } = $grid?.getTableData?.() ?? {
          visibleData: [] as RowVO[]
        };

        // 不是该梯队首行：不渲染（避免重复组件/状态异常）
        if (!isTierFirstRow(visibleData, rowIndex)) return null;

        return (
          <el-date-picker
            modelValue={row.date}
            type="datetime"
            class="w-[150px]!"
            placeholder="请选择日期"
            onUpdate:modelValue={(val: any) => onTierDateChange(row, val)}
          />
        );
      }
    }
  },
  { fixed: 'left', field: 'cbmc', title: '船舶名称' },
  { fixed: 'left', field: 'zzgkmc', title: '装载港口名称' },
  { fixed: 'left', field: 'imo', title: 'IMO号' },
  { fixed: 'left', field: 'mmsi', title: 'MMSI' },
  { fixed: 'left', field: 'callsign', title: '呼号' },
  { fixed: 'left', field: 'shipType', title: '船舶类型' },
  { fixed: 'left', field: 'shipSubType', title: '船舶子类型' },
  { field: 'flag', title: '船旗国' },
  { field: 'shipOwner', title: '船东' },
  { field: 'shipOperator', title: '船舶经营人' },
  { field: 'shipCompany', title: '船公司' },
  { field: 'classSociety', title: '船级社' },
  { field: 'buildYear', title: '建造年份' },
  { field: 'buildYard', title: '建造船厂' },
  { field: 'length', title: '船长(m)' },
  { field: 'breadth', title: '船宽(m)' },
  { field: 'depth', title: '型深(m)' },
  { fixed: 'right', field: 'draft', title: '吃水(m)' },
  { fixed: 'right', field: 'dwt', title: '载重吨(DWT)' },
  { fixed: 'right', field: 'grt', title: '总吨(GRT)' },
  { fixed: 'right', field: 'nrt', title: '净吨(NRT)' },
  { fixed: 'right', field: 'teu', title: '箱位(TEU)' },
  { fixed: 'right', field: 'engineType', title: '主机型号' },
  { fixed: 'right', field: 'enginePower', title: '主机功率(kW)' },
  { fixed: 'right', field: 'serviceSpeed', title: '服务航速(kn)' },
  { fixed: 'right', field: 'maxSpeed', title: '最大航速(kn)' },
  { fixed: 'right', field: 'fuelType', title: '燃料类型' }
];
// 只在“梯队的首行”渲染日期组件
function isTierFirstRow(visibleData: RowVO[], rowIndex: number) {
  if (rowIndex === 0) return true;
  return visibleData[rowIndex - 1]?.tdmc !== visibleData[rowIndex]?.tdmc;
}
// vxe merge-cells 需要的结构
const mergeCells = ref<
  { row: number; col: number; rowspan: number; colspan: number }[]
>([]);

// 1) 梯队层：在同一 tdmc 段内一起合并的字段
const mergeTierFields = ['tdmc', 'date'] as const;

// 2) 船舶层：在同一 tdmc 段内，再按 cbmc 连续段分块；这些字段跟着 cbmc 段一起合并
//    （常见：cbmc、船类型、IMO、船公司… 你自己加）
const mergeShipFields = ['cbmc'] as const;

// 3) 港口/明细层：在同一 cbmc 段内，再按“该字段自身相邻且相同”合并
//    这里不止 zzgkmc，一个数组塞很多字段即可
const mergeDetailFields = [
  'zzgkmc',
  'zzgkmc',
  'imo',
  'mmsi',
  'callsign',
  'shipType',
  'shipSubType',
  'flag',
  'shipOwner',
  'shipOperator',
  'shipCompany',
  'classSociety',
  'buildYear',
  'buildYard',
  'length',
  'breadth',
  'depth',
  'draft',
  'dwt',
  'grt',
  'nrt',
  'teu',
  'engineType',
  'enginePower',
  'serviceSpeed',
  'maxSpeed',
  'fuelType'
] as const;

function buildMergeCellsByVisible() {
  const $grid = gridRef.value;
  if (!$grid) return;

  const { visibleData } = $grid.getTableData();
  const { visibleColumn } = $grid.getTableColumn();

  const result: {
    row: number;
    col: number;
    rowspan: number;
    colspan: number;
  }[] = [];

  const colIndexOf = (field: string) =>
    visibleColumn.findIndex(col => col.field === field);

  const pushMerge = (row: number, field: string, rowspan: number) => {
    if (rowspan <= 1) return;
    const col = colIndexOf(field);
    if (col >= 0) result.push({ row, col, rowspan, colspan: 1 });
  };

  // const isBlank = (v: any) => v == null || v === '';

  // 扫描 [start, end) 区间内，按 field 的“相邻且相同”切段
  const scanSegments = (start: number, end: number, field: string) => {
    const segs: { start: number; end: number; value: any }[] = [];
    let i = start;

    while (i < end) {
      const v = (visibleData[i] as any)?.[field];
      /*if (isBlank(v)) {
        i++;
        continue;
      }*/
      let j = i + 1;
      while (j < end && (visibleData[j] as any)?.[field] === v) j++;
      segs.push({ start: i, end: j, value: v });
      i = j;
    }
    return segs;
  };

  // 1) 先按 tdmc 切梯队段
  const tierSegs = scanSegments(0, visibleData.length, 'tdmc');

  for (const tier of tierSegs) {
    const tierRowspan = tier.end - tier.start;

    // 梯队层字段合并
    for (const f of mergeTierFields) pushMerge(tier.start, f, tierRowspan);

    // 2) 梯队段内：按 cbmc 切船舶段
    const shipSegs = scanSegments(tier.start, tier.end, 'cbmc');

    for (const ship of shipSegs) {
      const shipRowspan = ship.end - ship.start;

      // 船舶层字段（跟随 cbmc 段）一起合并
      for (const f of mergeShipFields) pushMerge(ship.start, f, shipRowspan);

      // 3) 船舶段内：明细字段逐个做“相邻且相同”合并（不互相绑定）
      for (const field of mergeDetailFields) {
        const detailSegs = scanSegments(ship.start, ship.end, field);
        for (const seg of detailSegs) {
          pushMerge(seg.start, field, seg.end - seg.start);
        }
      }
    }
  }

  mergeCells.value = result;
  $grid.setMergeCells?.(result);
  $grid.recalculate?.();
}
/**
 * 加载数据并合并
 */
async function reloadAndMerge() {
  // ✅ 必须有连续相同值才会触发纵向合并
  const raw: RowVO[] = tableData;
  data.value = normalizeTableData(raw);
  // ✅ 等待 Vue 渲染 + vxe 内部列/数据计算完成（虚拟表格常需要晚一拍）
  await nextTick();
  requestAnimationFrame(() => buildMergeCellsByVisible());
}
// 初始化：加载并合并
reloadAndMerge();

async function saveSort() {
  if (!data.value.length) {
    ElMessage.warning('暂无数据可保存');
    return;
  }

  // 1) 生成 sort（全表 1..N）
  const payload = data.value.map((row, idx) => {
    const sort = idx + 1;
    row.sort = sort; // 可选：回写到前端数据，方便你看
    return { id: row.id, sort };
  });

  // 2) 调后端接口（你按实际项目替换）
  // 下面用伪代码表示：await api.saveSort(payload)
  try {
    console.log('save sort payload:', payload);
    console.log('data:', data.value);
    // await saveTierSortApi(payload);

    ElMessage.success('保存成功');

    // ✅ 可选：保存成功后重新拉取一次（确保和后端一致）
    // await reloadAndMerge();
  } catch (e: any) {
    ElMessage.error(e?.message ?? '保存失败');
  }
}
</script>
<style scoped></style>
