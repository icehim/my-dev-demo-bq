<template>
  <div class="tech-card">
    <div class="tech-card__header">
      <div class="header-decor decor-1" />
      <div class="header-decor decor-2" />
      <div class="header-decor decor-3" />
      <div class="tech-card__title">{{ title }}</div>
    </div>

    <div class="tech-card__body">
      <div class="tech-card__desc">
        <span class="label">描述：</span>
        <span class="desc-text">{{ desc }}</span>
      </div>

      <div class="tech-card__date">{{ date }}</div>
    </div>

    <div class="tech-card__footer">
      <button
        v-for="(action, index) in actions"
        :key="index"
        class="tech-btn"
        :class="`tech-btn--${action.type || 'blue'}`"
        @click="handleClick(action, index)"
      >
        {{ action.text }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ActionItem {
  text: string;
  type?: 'blue' | 'green';
  key?: string;
}

const props = withDefaults(
  defineProps<{
    title: string;
    desc: string;
    date: string;
    actions?: ActionItem[];
  }>(),
  {
    actions: () => [
      { text: '按钮1', type: 'blue', key: 'btn1' },
      { text: '按钮2', type: 'green', key: 'btn2' },
      { text: '按钮3', type: 'blue', key: 'btn3' }
    ]
  }
);

const emit = defineEmits<{
  actionClick: [action: ActionItem, index: number];
}>();

const handleClick = (action: ActionItem, index: number) => {
  emit('actionClick', action, index);
};

defineOptions({ name: 'tech-card' });
</script>

<style scoped>
.tech-card {
  position: relative;
  box-sizing: border-box;
  width: 720px;
  min-height: 360px;
  padding: 26px 28px 28px;
  overflow: hidden;
  background: linear-gradient(
    180deg,
    rgb(8 30 67 / 82%) 0%,
    rgb(6 22 52 / 90%) 100%
  );
}

/* 外层发光边框 */
.tech-card::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  border: 2px solid rgb(43 231 255 / 88%);
  border-radius: 6px;
  box-shadow:
    0 0 8px rgb(43 231 255 / 75%),
    0 0 16px rgb(43 231 255 / 28%),
    inset 0 0 8px rgb(43 231 255 / 18%);
}

/* 轻微光感 */
.tech-card::after {
  position: absolute;
  top: 12px;
  right: 20px;
  width: 180px;
  height: 120px;
  pointer-events: none;
  content: '';
  background: radial-gradient(
    circle,
    rgb(35 197 255 / 18%) 0%,
    rgb(35 197 255 / 8%) 35%,
    transparent 75%
  );
}

/* 顶部区域 */
.tech-card__header {
  position: relative;
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 28px;
  margin: -8px -8px 28px;
  overflow: hidden;
  background: linear-gradient(
    90deg,
    rgb(32 119 255 / 42%) 0%,
    rgb(41 132 255 / 28%) 36%,
    rgb(30 150 255 / 12%) 65%,
    rgb(30 150 255 / 2%) 100%
  );
  border-bottom: 1px solid rgb(77 223 255 / 45%);
}

.tech-card__title {
  position: relative;
  z-index: 2;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
  text-shadow: 0 0 8px rgb(120 220 255 / 35%);
}

.header-decor {
  position: absolute;
  bottom: 0;
  height: 18px;
  background: linear-gradient(
    90deg,
    rgb(118 208 255 / 50%) 0%,
    rgb(118 208 255 / 15%) 100%
  );
  transform: skewX(38deg);
}

.decor-1 {
  left: 70px;
  width: 70px;
}

.decor-2 {
  left: 162px;
  width: 78px;
}

.decor-3 {
  left: 272px;
  width: 64px;
}

/* 内容区 */
.tech-card__body {
  position: relative;
  z-index: 1;
  color: rgb(255 255 255 / 94%);
}

.tech-card__desc {
  margin-bottom: 18px;
  font-size: 16px;
  line-height: 1.65;
  word-break: break-word;
}

.label {
  font-weight: 700;
  color: #fff;
}

.desc-text {
  color: rgb(255 255 255 / 94%);
}

.tech-card__date {
  font-size: 15px;
  color: rgb(255 255 255 / 86%);
  letter-spacing: 1px;
}

/* 按钮区 */
.tech-card__footer {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 20px;
  justify-content: space-between;
  margin-top: 48px;
}

.tech-btn {
  box-sizing: border-box;
  min-width: 160px;
  height: 56px;
  padding: 0 28px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
  cursor: pointer;
  outline: none;
  border: 2px solid rgb(255 255 255 / 78%);
  border-radius: 4px;
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease;
}

.tech-btn:hover {
  transform: translateY(-1px);
}

.tech-btn--blue {
  background: linear-gradient(
    180deg,
    rgb(21 110 205 / 62%) 0%,
    rgb(15 77 148 / 45%) 100%
  );
  box-shadow:
    inset 0 0 12px rgb(90 195 255 / 12%),
    0 0 8px rgb(56 200 255 / 8%);
}

.tech-btn--blue:hover {
  box-shadow:
    inset 0 0 14px rgb(90 195 255 / 18%),
    0 0 10px rgb(56 200 255 / 28%);
}

.tech-btn--green {
  background: linear-gradient(
    180deg,
    rgb(35 132 92 / 72%) 0%,
    rgb(27 98 70 / 55%) 100%
  );
  box-shadow:
    inset 0 0 12px rgb(100 255 190 / 10%),
    0 0 8px rgb(60 255 180 / 8%);
}

.tech-btn--green:hover {
  box-shadow:
    inset 0 0 14px rgb(100 255 190 / 18%),
    0 0 10px rgb(60 255 180 / 24%);
}
</style>
