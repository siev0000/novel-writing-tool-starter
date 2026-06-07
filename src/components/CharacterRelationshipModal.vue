<script setup lang="ts">
import { computed, ref, watch } from 'vue';

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
}>();

const emit = defineEmits<{
  close: [];
  save: [targetId: string, relationType: string, impressionFromCurrent: string, impressionToCurrent: string];
}>();

const targetId = ref('');
const relationType = ref('');
const impressionFromCurrent = ref('');
const impressionToCurrent = ref('');

function applyDraft(target: string) {
  const draft = props.relations?.find((item) => item.targetId === target);
  relationType.value = draft?.relationType ?? '関係性未設定';
  impressionFromCurrent.value = draft?.impressionFromCurrent ?? '';
  impressionToCurrent.value = draft?.impressionToCurrent ?? '';
}

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    targetId.value = props.characters[0]?.id ?? '';
    applyDraft(targetId.value);
  }
);

watch(targetId, (value) => {
  if (!props.open) return;
  applyDraft(value);
});

const canSave = computed(() => !!targetId.value);

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
          <button class="ghost" type="button" @click="emit('close')">閉じる</button>
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
          <span>その人物への印象</span>
          <textarea v-model="impressionFromCurrent" rows="4" placeholder="こちらから相手への印象や感情" />
        </label>

        <label class="field">
          <span>相手からの印象</span>
          <textarea v-model="impressionToCurrent" rows="4" placeholder="相手からこちらへの印象や感情" />
        </label>

        <div class="button-row">
          <button type="button" :disabled="!canSave" @click="save">保存</button>
          <button type="button" class="secondary" @click="emit('close')">キャンセル</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
