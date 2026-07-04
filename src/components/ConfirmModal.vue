<script setup lang="ts">
const props = defineProps<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [];
}>();
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" class="modal-backdrop">
      <section class="modal-panel confirm-modal" role="dialog" aria-modal="true" :aria-label="props.title" @click.stop>
        <header class="modal-header">
          <h2>{{ props.title }}</h2>
        </header>

        <p class="confirm-message">{{ props.message }}</p>

        <div class="button-row modal-footer">
          <button type="button" class="danger" @click="emit('confirm')">{{ props.confirmLabel || '削除' }}</button>
          <button type="button" class="secondary" @click="emit('close')">キャンセル</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
