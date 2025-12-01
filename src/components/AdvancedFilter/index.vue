<template>
  <el-popover
    v-model:visible="visible"
    placement="bottom-start"
    trigger="click"
    width="420"
  >
    <!-- popover 内容：表单 + 底部按钮 -->
    <div class="advanced-filter">
      <el-form :model="innerForm" :label-width="labelWidth" size="small">
        <!-- 头部插槽，比如标题、说明 -->
        <slot name="header" />

        <!-- 默认插槽：把 innerForm 通过插槽参数暴露给父组件用 -->
        <slot :form="innerForm" />

        <!-- 底部按钮 -->
        <el-form-item class="adv-footer">
          <div class="adv-footer-actions">
            <el-button text size="small" @click="onReset">重置</el-button>
            <el-button type="primary" size="small" @click="onConfirm">
              确定
            </el-button>
          </div>
        </el-form-item>

        <!-- 表单下方的额外区域，比如提示、额外按钮 -->
        <slot name="footer-extra" />
      </el-form>
    </div>

    <!-- 触发 Popover 的“输入框” -->
    <template #reference>
      <!-- 仍然保留 reference 插槽，方便以后完全自定义 -->
      <slot name="reference" :has-value="hasValue">
        <!-- 默认外观：仿 el-select 多选输入框 -->
        <div class="adv-input">
          <!-- 没有任何条件时，显示占位文字 -->
          <template v-if="!hasValue">
            <span class="adv-placeholder mr-[8px]">高级检索</span>
          </template>

          <!-- 有条件时：第一个 tag + +N -->
          <template v-else>
            <el-tag
              effect="plain"
              :title="firstText"
              class="w-[120px] custom-truncate mr-[8px]"
            >
              {{ firstText }}
            </el-tag>
            <el-tag v-if="restCount > 0" class="mr-[8px]">
              +{{ restCount }}
            </el-tag>
          </template>
          <el-icon><Filter /></el-icon>
        </div>
      </slot>
    </template>
  </el-popover>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { Filter } from '@element-plus/icons-vue';
import { cloneDeep } from '@pureadmin/utils';

const props = defineProps<{
  /** 父组件传进来的高级筛选对象，比如 { name: '', gender: '' } */
  model: Record<string, any>;
  /**
   * 字段配置，用来生成 tag 文案 & 重置
   */
  fields: {
    key: string;
    label: string;
    formatter?: (value: any, model: Record<string, any>) => string;
    /** 重置时的默认值，不传就按类型猜 */
    resetValue?: any;
  }[];
  /** 表单 label 宽度，默认 80px */
  labelWidth?: string | number;
}>();

const emit = defineEmits<{
  (e: 'confirm', payload: Record<string, any>): void;
  (e: 'reset', payload: Record<string, any>): void;
}>();

const visible = ref(false);

/** 内部自己的表单副本，想怎么改都可以（不触碰 props） */
const innerForm = reactive<Record<string, any>>(cloneDeep(props.model));

/** 如果父组件外部改了 model，这里同步一下副本（例如点击“外层重置”） */
watch(
  () => props.model,
  newVal => {
    Object.assign(innerForm, cloneDeep(newVal));
  },
  { deep: true }
);

const labelWidth = computed(() => props.labelWidth ?? '80px');

/** 根据 innerForm 计算 tag 文案 */
const activeTexts = computed(() => {
  const result: string[] = [];

  props.fields.forEach(field => {
    const value = innerForm[field.key];

    if (value === undefined || value === null || value === '') return;

    const text = field.formatter?.(value, innerForm) ?? String(value);
    if (!text) return;

    result.push(`${field.label}: ${text}`);
  });

  return result;
});

const hasValue = computed(() => activeTexts.value.length > 0);
const firstText = computed(() => activeTexts.value[0] ?? '');
const restCount = computed(() => activeTexts.value.length - 1);

/** 重置：只动 innerForm，然后把结果通过事件抛回去，父组件自己赋值 */
const onReset = () => {
  const next = cloneDeep(innerForm);

  props.fields.forEach(field => {
    const key = field.key;
    const cur = innerForm[key];

    if ('resetValue' in field) {
      next[key] = field.resetValue;
    } else if (Array.isArray(cur)) {
      next[key] = [];
    } else if (typeof cur === 'number') {
      next[key] = undefined;
    } else if (typeof cur === 'boolean') {
      next[key] = false;
    } else {
      next[key] = '';
    }
  });

  // 用 next 更新副本
  Object.assign(innerForm, next);
  // 通知父组件：你要不要也把自己的 model 一起重置
  emit('reset', cloneDeep(next));
};

/** 确定：关闭弹窗 + 抛出当前 innerForm 内容给父组件 */
const onConfirm = () => {
  visible.value = false;
  emit('confirm', cloneDeep(innerForm));
};

// 暴露给父组件控制弹窗（可选）
defineExpose({
  open: () => (visible.value = true),
  close: () => (visible.value = false)
});
</script>

<style scoped>
.advanced-filter {
  padding: 8px 4px;
}

/* 底部按钮靠右 */
.adv-footer {
  margin-bottom: 0;
}

.adv-footer-actions {
  margin-left: auto;
}

/* 外框：仿 el-select 多选的输入框样式 */
.adv-input {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  max-width: 260px;
  height: 32px;
  padding: 0 8px;
  cursor: pointer;
  background-color: #fff;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.adv-input:hover {
  border-color: var(--el-color-primary);
}

/* 占位文字 */
.adv-placeholder {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
</style>
