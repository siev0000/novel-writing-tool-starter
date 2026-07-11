<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { resizeTextarea } from '../utils/textarea';

type CharacterOption = {
  id: string;
  name: string;
};

type RelationshipDraft = {
  targetId: string;
  relationType: string;
  impressionFromCurrent: string;
  impressionToCurrent: string;
};

const props = defineProps<{
  open: boolean;
  characters: CharacterOption[];
  relations?: RelationshipDraft[];
  initialTargetId?: string;
}>();

const emit = defineEmits<{
  close: [];
  save: [targetId: string, relationType: string, impressionFromCurrent: string, impressionToCurrent: string];
}>();

const targetId = ref('');
const relationType = ref('');
const impressionFromCurrent = ref('');
const impressionToCurrent = ref('');
const impressionFromTextarea = ref<HTMLTextAreaElement | null>(null);
const impressionToTextarea = ref<HTMLTextAreaElement | null>(null);

function applyDraft(target: string) {
  const draft = props.relations?.find((item) => item.targetId === target);
  relationType.value = draft?.relationType ?? '';
  impressionFromCurrent.value = draft?.impressionFromCurrent ?? '';
  impressionToCurrent.value = draft?.impressionToCurrent ?? '';
}

function syncTextareas() {
  resizeTextarea(impressionFromTextarea.value, 6);
  resizeTextarea(impressionToTextarea.value, 6);
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    targetId.value = props.initialTargetId || props.characters[0]?.id || '';
    applyDraft(targetId.value);
    await nextTick();
    syncTextareas();
  }
);

watch(targetId, (value) => {
  if (!props.open) return;
  applyDraft(value);
  nextTick(syncTextareas);
});

watch(
  () => [impressionFromCurrent.value, impressionToCurrent.value],
  async () => {
    if (!props.open) return;
    await nextTick();
    syncTextareas();
  }
);

const canSave = computed(() => !!targetId.value);

onMounted(() => {
  window.addEventListener('resize', syncTextareas);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncTextareas);
});

function save() {
  if (!canSave.value) return;
  emit('save', targetId.value, relationType.value, impressionFromCurrent.value, impressionToCurrent.value);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop">
      <section class="modal-panel relationship-create-modal" role="dialog" aria-modal="true" aria-label="相関設定" @click.stop>
        <header class="modal-header">
          <h2>相関設定</h2>
        </header>

        <label class="field">
          <span>相手の人物</span>
          <select v-model="targetId">
            <option v-for="character in characters" :key="character.id" :value="character.id">{{ character.name }}</option>
          </select>
        </label>

        <label class="field">
          <span>関係性</span>
          <input v-model="relationType" placeholder="関係性を入力" />
        </label>

        <label class="field">
          <span>こちらから</span>
          <textarea ref="impressionFromTextarea" v-model="impressionFromCurrent" class="auto-textarea" rows="4" placeholder="こちらからの印象を記載" />
        </label>

        <label class="field">
          <span>相手から</span>
          <textarea ref="impressionToTextarea" v-model="impressionToCurrent" class="auto-textarea" rows="4" placeholder="相手からの印象を記載" />
        </label>

        <div class="button-row modal-footer">
          <button type="button" :disabled="!canSave" @click="save">保存</button>
          <button type="button" class="secondary" @click="emit('close')">キャンセル</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
