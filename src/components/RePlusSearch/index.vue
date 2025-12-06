<script setup lang="ts">
import { PlusSearch } from 'plus-pro-components';
import { useAttrs, useSlots, computed } from 'vue';
import ArrowUp from '~icons/ep/arrow-up-bold';
import ArrowDown from '~icons/ri/arrow-down-s-line';
import 'plus-pro-components/es/components/search/style/css.mjs';

// ✅ 封装组件自己新增的 prop：searchLoading
const props = defineProps<{
  searchLoading?: boolean;
}>();

// attrs 里会包含：columns、has-unfold、show-number 等
const rawAttrs = useAttrs() as Record<string, any>;
const slots = useSlots();

// 过滤掉 footer，其它插槽全部透传给 PlusSearch
const filteredSlots = computed(() =>
  Object.fromEntries(
    Object.entries(slots).filter(([name]) => name !== 'footer')
  )
);

/**
 * 处理 has-unfold
 * - 默认值：true
 * - 支持两种写法：has-unfold / hasUnfold
 */
const hasUnfold = computed<boolean>(() => {
  const v = rawAttrs['has-unfold'] ?? rawAttrs.hasUnfold;

  // 未传时，使用默认值 true
  if (v === undefined) return true;

  // 处理布尔/字符串情况
  if (typeof v === 'string') {
    // 兼容写成 has-unfold="false" 的情况
    return v !== 'false';
  }
  return Boolean(v);
});

/**
 * 处理 show-number
 * - 默认值：2
 * - 支持两种写法：show-number / showNumber
 */
const showNumber = computed<number>(() => {
  const v = rawAttrs['show-number'] ?? rawAttrs.showNumber;

  if (v === undefined || v === null || v === '') return 2;

  const num = Number(v);
  return Number.isFinite(num) ? num : 2;
});

/**
 * 拿到 columns
 * - 外层会传 :columns="[]"
 */
const columns = computed<any[]>(() => {
  const v = rawAttrs.columns;
  return Array.isArray(v) ? v : [];
});

/**
 * 有效的搜索项数量：hideInSearch !== true 的项
 */
const validSearchColumnsCount = computed(
  () => columns.value.filter(col => !col || col.hideInSearch !== true).length
);

/**
 * 是否显示“展开/收起”按钮
 *
 * 规则：
 * 1. has-unfold = false -> 不显示
 * 2. has-unfold = true 且 有效项数量 <= show-number -> 不显示
 * 3. 其它情况 -> 显示
 */
const showUnfoldButton = computed<boolean>(() => {
  if (!hasUnfold.value) return false;

  if (validSearchColumnsCount.value <= showNumber.value) return false;

  return true;
});

defineOptions({
  name: 'RePlusSearch'
});
</script>

<template>
  <div class="re-plus-search">
    <!--
      attrs 里依旧透传所有属性（包括 columns / has-unfold / show-number）
      PlusSearch 自己会根据 hasUnfold / showNumber 控制表单折叠逻辑
    -->
    <transition name="plus-row">
      <PlusSearch v-bind="rawAttrs" class="custom-plus-search">
        <!-- 自动转发所有插槽（不含 footer） -->
        <template v-for="(_, name) in filteredSlots" #[name]="slotProps">
          <slot :name="name" v-bind="slotProps" />
        </template>

        <!-- 统一接管 PlusSearch 的 footer 插槽 -->
        <template #footer="scope">
          <!--
          如果父组件传了 #footer：
          这里把 scope + searchLoading + 是否展示展开按钮 showUnfoldButton 一起抛给它
          -->
          <slot
            name="footer"
            v-bind="{
              ...scope,
              searchLoading: props.searchLoading,
              showUnfoldButton
            }"
          >
            <!-- 默认 footer：使用 searchLoading 控制搜索按钮 loading -->
            <div style="display: flex; gap: 8px">
              <el-button
                type="primary"
                :loading="props.searchLoading"
                @click="scope.handleSearch"
              >
                搜索
              </el-button>
              <el-button @click="scope.handleReset">重置</el-button>

              <!-- ⭐ 根据规则控制展开/收起按钮显示 -->
              <el-button
                v-if="showUnfoldButton"
                :icon="scope.isShowUnfold ? ArrowUp : ArrowDown"
                @click="scope.handleUnfold"
              >
                {{ scope.isShowUnfold ? '收起' : '展开' }}
              </el-button>
            </div>
          </slot>
        </template>
      </PlusSearch>
    </transition>
  </div>
</template>

<style scoped>
.re-plus-search {
  position: relative;
  height: 34px;
  background: #fff;

  .custom-plus-search {
    position: absolute;
    width: 100%;
    background: #fff;
  }
}
</style>
