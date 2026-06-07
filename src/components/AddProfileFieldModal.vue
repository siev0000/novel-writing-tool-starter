<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ProfileFieldInputType } from '../types/models';

const sectionOptions = ['基本情報', '人物像', '能力', '話し方', '外見', 'その他'] as const;

const props = defineProps<{
  open: boolean;
  title?: string;
  confirmLabel?: string;
  initialLabel?: string;
  initialSection?: string;
  initialInputType?: ProfileFieldInputType;
  initialSelectOptions?: string[];
  showDelete?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  submit: [label: string, section: string, inputType: ProfileFieldInputType, selectOptions: string[]];
  remove: [];
}>();

const inputTypeOptions: Array<{ value: ProfileFieldInputType; label: string }> = [
  { value: 'text', label: '一文' },
  { value: 'textarea', label: '文章' },
  { value: 'number', label: '数値' },
  { value: 'select', label: '選択肢' },
];

const draftLabel = ref('');
const draftSection = ref<string>('その他');
const draftInputType = ref<ProfileFieldInputType>('text');
const draftSelectOptions = ref('');

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    draftLabel.value = props.initialLabel ?? '';
    draftSection.value = props.initialSection ?? 'その他';
    draftInputType.value = props.initialInputType ?? 'text';
    draftSelectOptions.value = (props.initialSelectOptions ?? []).join('、');
  }
);

function parseSelectOptions(value: string) {
  return value
    .split(/[,、]/)
    .map((option) => option.trim())
    .filter(Boolean);
}

function submitField() {
  const label = draftLabel.value.trim();
  if (!label) return;
  emit('submit', label, draftSection.value, draftInputType.value, draftInputType.value === 'select' ? parseSelectOptions(draftSelectOptions.value) : []);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop">
      <section class="modal-panel add-profile-field-modal" role="dialog" aria-modal="true" aria-label="プロフィール項目追加" @click.stop>
        <header class="modal-header">
          <h2>{{ title || 'プロフィール項目追加' }}</h2>
          <button class="ghost" type="button" @click="emit('close')">閉じる</button>
        </header>

        <div class="profile-add-form">
          <label class="field">
            <span>項目名</span>
            <input v-model="draftLabel" placeholder="追加する項目名" @keydown.enter="submitField" />
          </label>
          <label class="field">
            <span>入力形式</span>
            <select v-model="draftInputType">
              <option v-for="option in inputTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label class="field">
            <span>所属項目</span>
            <select v-model="draftSection">
              <option v-for="section in sectionOptions" :key="section" :value="section">{{ section }}</option>
            </select>
          </label>
          <label v-if="draftInputType === 'select'" class="field">
            <span>選択肢</span>
            <input v-model="draftSelectOptions" placeholder="選択肢を、で区切って入力" @keydown.enter="submitField" />
          </label>
        </div>

        <div class="button-row">
          <button v-if="showDelete" type="button" class="danger" @click="emit('remove')">削除</button>
          <button type="button" @click="submitField">{{ confirmLabel || '追加' }}</button>
          <button type="button" class="secondary" @click="emit('close')">キャンセル</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
