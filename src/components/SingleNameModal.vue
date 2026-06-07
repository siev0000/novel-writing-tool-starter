<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  open: boolean;
  title: string;
  label: string;
  value: string;
  placeholder?: string;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  close: [];
  save: [value: string];
}>();

const draftValue = ref('');

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    draftValue.value = props.value;
  }
);

function save() {
  emit('save', draftValue.value);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop">
      <section class="modal-panel name-modal" role="dialog" aria-modal="true" :aria-label="title" @click.stop>
        <header class="modal-header">
          <h2>{{ title }}</h2>
          <button class="ghost" type="button" @click="emit('close')">閉じる</button>
        </header>

        <label class="field">
          <span>{{ label }}</span>
          <input v-model="draftValue" :placeholder="placeholder" />
        </label>
        <p v-if="errorMessage" class="hint-text error-text">{{ errorMessage }}</p>

        <div class="button-row">
          <button type="button" @click="save">保存</button>
          <button type="button" class="secondary" @click="emit('close')">キャンセル</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
