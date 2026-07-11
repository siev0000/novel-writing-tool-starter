<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { ProfileFieldInputType } from '../types/models';
import { resizeTextarea } from '../utils/textarea';

const props = defineProps<{
  label: string;
  modelValue: string;
  type?: ProfileFieldInputType;
  placeholder?: string;
  options?: string[];
  maxRows?: number;
}>();
defineEmits<{ 'update:modelValue': [value: string] }>();

const normalizedOptions = computed(() => (props.options ?? []).filter((option) => option.trim().length > 0));
const usesRadioOptions = computed(() => props.type === 'select' && normalizedOptions.value.length === 2);
const radioGroupName = `profile-field-${Math.random().toString(36).slice(2)}`;
const textareaRef = ref<HTMLTextAreaElement | null>(null);
let textareaResizeObserver: ResizeObserver | null = null;
const textareaRows = computed(() => {
  const lineCount = props.modelValue.split('\n').length;
  return Math.max(1, lineCount);
});

function syncTextareaHeight() {
  resizeTextarea(textareaRef.value, props.maxRows ?? 15);
}

function scheduleTextareaHeightSync() {
  requestAnimationFrame(() => {
    syncTextareaHeight();
    requestAnimationFrame(syncTextareaHeight);
  });
}

watch(
  () => props.modelValue,
  async () => {
    if (props.type !== 'textarea') return;
    await nextTick();
    scheduleTextareaHeightSync();
  },
  { immediate: true }
);

watch(
  () => props.type,
  async () => {
    await nextTick();
    scheduleTextareaHeightSync();
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener('resize', scheduleTextareaHeightSync);
  if (typeof ResizeObserver !== 'undefined') {
    textareaResizeObserver = new ResizeObserver(() => {
      scheduleTextareaHeightSync();
    });
    if (textareaRef.value) {
      textareaResizeObserver.observe(textareaRef.value);
      if (textareaRef.value.parentElement) {
        textareaResizeObserver.observe(textareaRef.value.parentElement);
      }
    }
  }
  scheduleTextareaHeightSync();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', scheduleTextareaHeightSync);
  textareaResizeObserver?.disconnect();
  textareaResizeObserver = null;
});
</script>

<template>
  <label class="field">
    <span>{{ label }}</span>
    <div v-if="usesRadioOptions" class="field-radio-group">
      <label v-for="option in normalizedOptions" :key="option" class="field-radio-option">
        <input
          type="radio"
          :name="radioGroupName"
          :checked="modelValue === option"
          :value="option"
          @change="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        />
        <span>{{ option }}</span>
      </label>
    </div>
    <select
      v-else-if="type === 'select'"
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">選択してください</option>
      <option v-for="option in normalizedOptions" :key="option" :value="option">{{ option }}</option>
    </select>
    <input
      v-else-if="type !== 'textarea'"
      :type="type === 'number' ? 'number' : 'text'"
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <textarea
      v-else
      ref="textareaRef"
      class="auto-textarea"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="textareaRows"
      @focus="scheduleTextareaHeightSync"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
  </label>
</template>
