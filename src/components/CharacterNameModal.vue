<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  open: boolean;
  name: string;
  ruby: string;
  title?: string;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  close: [];
  save: [name: string, ruby: string];
}>();

const draftName = ref('');
const draftRuby = ref('');

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    draftName.value = props.name;
    draftRuby.value = props.ruby;
  }
);

function save() {
  emit('save', draftName.value, draftRuby.value);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop">
      <section class="modal-panel name-modal" role="dialog" aria-modal="true" aria-label="名前設定" @click.stop>
        <header class="modal-header">
          <h2>{{ title || '名前設定' }}</h2>
        </header>

        <label class="field">
          <span>名前</span>
          <input v-model="draftName" />
        </label>
        <label class="field">
          <span>フリガナ</span>
          <input v-model="draftRuby" />
        </label>
        <p v-if="errorMessage" class="hint-text error-text">{{ errorMessage }}</p>

        <div class="button-row modal-footer">
          <button type="button" @click="save">保存</button>
          <button type="button" class="secondary" @click="emit('close')">キャンセル</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
