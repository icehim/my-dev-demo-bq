<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-width="0"
    status-icon
  >
    <div style="display: flex; gap: 12px; align-items: center">
      <el-form-item prop="minRate" style="margin-bottom: 0">
        <el-input-number
          v-model="form.minRate"
          :min="0"
          :max="form.maxRate ?? 0.8"
          :step="0.01"
          :precision="2"
          controls-position="right"
        />
      </el-form-item>

      <span>~</span>

      <el-form-item prop="maxRate" style="margin-bottom: 0">
        <el-input-number
          v-model="form.maxRate"
          :min="form.minRate ?? 0"
          :max="0.8"
          :step="0.01"
          :precision="2"
          controls-position="right"
        />
      </el-form-item>
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';

const props = defineProps<{
  minRate: number | null;
  maxRate: number | null;
}>();

const formRef = ref<FormInstance>();

// 草稿态（弹窗内编辑，不直接影响外部）
const form = reactive<{
  minRate: number | null;
  maxRate: number | null;
}>({
  minRate: props.minRate ?? 0,
  maxRate: props.maxRate ?? 0.8
});

// 外部初始值变化时，同步草稿
watch(
  () => [props.minRate, props.maxRate] as const,
  ([min, max]) => {
    form.minRate = min ?? 0;
    form.maxRate = max ?? 0.8;
    formRef.value?.clearValidate();
  }
);

// 校验规则（跨字段）
const rules: FormRules = {
  minRate: [
    {
      validator: (_, value, cb) => {
        if (value == null) return cb(new Error('请输入最小值'));
        if (value < 0 || value > 0.8) return cb(new Error('范围需在 0 ~ 0.8'));
        if (form.maxRate != null && value > form.maxRate)
          return cb(new Error('最小值不能大于最大值'));
        cb();
      },
      trigger: ['change', 'blur']
    }
  ],
  maxRate: [
    {
      validator: (_, value, cb) => {
        if (value == null) return cb(new Error('请输入最大值'));
        if (value < 0 || value > 0.8) return cb(new Error('范围需在 0 ~ 0.8'));
        if (form.minRate != null && value < form.minRate)
          return cb(new Error('最大值不能小于最小值'));
        cb();
      },
      trigger: ['change', 'blur']
    }
  ]
};

// 互相触发校验，避免提示不同步
watch(
  () => form.minRate,
  () => formRef.value?.validateField('maxRate'),
  { flush: 'post' }
);
watch(
  () => form.maxRate,
  () => formRef.value?.validateField('minRate'),
  { flush: 'post' }
);

// 暴露给 addDialog
async function validate() {
  return await formRef.value!.validate();
}
function getValue() {
  return { minRate: form.minRate!, maxRate: form.maxRate! };
}

defineExpose({ validate, getValue });
</script>
