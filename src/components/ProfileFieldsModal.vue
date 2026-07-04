<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { CharacterProfileField, ProfileFieldInputType } from '../types/models';
import { compareCharacterProfileFields } from '../store/data';
import AddProfileFieldModal from './AddProfileFieldModal.vue';
import ConfirmModal from './ConfirmModal.vue';

type ProfileFieldPatch = {
  label?: string;
  section?: string;
  inputType?: ProfileFieldInputType;
  selectOptions?: string[];
};

const props = defineProps<{
  open: boolean;
  fields: CharacterProfileField[];
}>();

const emit = defineEmits<{
  close: [];
  add: [label: string, section: string, inputType: ProfileFieldInputType, selectOptions: string[]];
  update: [fieldId: string, patch: ProfileFieldPatch];
  toggle: [fieldId: string];
  remove: [fieldId: string];
  reorder: [fieldId: string, targetFieldId: string];
}>();

const inputTypeOptions: Array<{ value: ProfileFieldInputType; label: string }> = [
  { value: 'text', label: '一文' },
  { value: 'textarea', label: '文章' },
  { value: 'number', label: '数値' },
  { value: 'select', label: '選択肢' },
];
const sectionOrder = ['基本情報', '人物像', '能力', '話し方', '外見', 'その他'] as const;

const sortedFields = computed(() => props.fields.slice().sort(compareCharacterProfileFields));
const groupedFields = computed(() => {
  const groups = new Map<string, CharacterProfileField[]>();
  sortedFields.value.forEach((field) => {
    const section = field.section || 'その他';
    groups.set(section, [...(groups.get(section) ?? []), field]);
  });
  return sectionOrder
    .map((section) => ({ section, fields: groups.get(section) ?? [] }))
    .filter((group) => group.fields.length > 0);
});
const collapsedSections = ref<Record<string, boolean>>({});
const draggedFieldId = ref('');
const addModalOpen = ref(false);
const editTargetId = ref('');
const removeConfirmOpen = ref(false);
const editModalOpen = computed(() => !!editTargetId.value);
const editTarget = computed(() => props.fields.find((field) => field.id === editTargetId.value));

watch(
  () => props.open,
  (open) => {
    if (open) return;
    addModalOpen.value = false;
    editTargetId.value = '';
    removeConfirmOpen.value = false;
  }
);

watch(groupedFields, (groups) => {
  const nextState = { ...collapsedSections.value };
  groups.forEach((group) => {
    if (!(group.section in nextState)) nextState[group.section] = false;
  });
  collapsedSections.value = nextState;
}, { immediate: true });

function addField(label: string, section: string, inputType: ProfileFieldInputType, selectOptions: string[]) {
  emit('add', label, section, inputType, selectOptions);
  addModalOpen.value = false;
}

function updateField(label: string, section: string, inputType: ProfileFieldInputType, selectOptions: string[]) {
  if (!editTargetId.value) return;
  emit('update', editTargetId.value, { label, section, inputType, selectOptions });
  editTargetId.value = '';
}

function removeEditingField() {
  if (!editTargetId.value) return;
  removeConfirmOpen.value = true;
}

function confirmRemoveEditingField() {
  if (!editTargetId.value) return;
  emit('remove', editTargetId.value);
  removeConfirmOpen.value = false;
  editTargetId.value = '';
}

function startDrag(event: DragEvent, fieldId: string) {
  draggedFieldId.value = fieldId;
  event.dataTransfer?.setData('text/plain', fieldId);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function dropOnField(targetFieldId: string) {
  if (!draggedFieldId.value || draggedFieldId.value === targetFieldId) return;
  emit('reorder', draggedFieldId.value, targetFieldId);
  draggedFieldId.value = '';
}

function fieldTypeLabel(inputType?: ProfileFieldInputType) {
  return inputTypeOptions.find((item) => item.value === inputType)?.label || '文章';
}

function fieldOptionsLabel(field: CharacterProfileField) {
  if (field.inputType !== 'select') return '';
  return (field.selectOptions ?? []).join(' / ');
}

function fieldSectionLabel(field: CharacterProfileField) {
  return field.section || 'その他';
}

function toggleSection(section: string) {
  collapsedSections.value = {
    ...collapsedSections.value,
    [section]: !collapsedSections.value[section],
  };
}

</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop">
      <section class="modal-panel profile-modal" role="dialog" aria-modal="true" aria-label="プロフィール項目設定" @click.stop>
        <header class="modal-header">
          <h2>プロフィール項目設定</h2>
          <div class="header-actions-inline">
            <button type="button" @click="addModalOpen = true">項目追加</button>
          </div>
        </header>

        <div class="profile-field-modal-list">
          <section v-for="group in groupedFields" :key="group.section" class="profile-field-group">
            <button type="button" class="section-toggle-header" @click="toggleSection(group.section)">
              <span>{{ collapsedSections[group.section] ? '▶' : '▼' }}</span>
              <strong>{{ group.section }}</strong>
            </button>
            <template v-if="!collapsedSections[group.section]">
              <div
                v-for="field in group.fields"
                :key="field.id"
                class="profile-modal-row profile-modal-grid"
                :class="{ hidden: field.status === 'hidden', dragging: draggedFieldId === field.id }"
                draggable="true"
                @dragstart="startDrag($event, field.id)"
                @dragend="draggedFieldId = ''"
                @dragover.prevent
                @drop.prevent="dropOnField(field.id)"
              >
                <button type="button" class="profile-drag-handle ghost" aria-label="ドラッグで並び替え">⋮⋮</button>
                <div class="profile-modal-name">
                  <strong>{{ field.label }}</strong>
                  <small>
                    {{ fieldSectionLabel(field) }}
                    <template v-if="fieldTypeLabel(field.inputType)"> / {{ fieldTypeLabel(field.inputType) }}</template>
                  </small>
                  <small v-if="fieldOptionsLabel(field)">{{ fieldOptionsLabel(field) }}</small>
                </div>
                <button v-if="field.source === 'user'" type="button" class="secondary" @click="editTargetId = field.id">変更</button>
                <button type="button" class="secondary" @click="emit('toggle', field.id)">
                  {{ field.status === 'hidden' ? '表示' : '非表示' }}
                </button>
              </div>
            </template>
          </section>
        </div>

        <div class="button-row modal-footer profile-modal-footer">
          <button type="button" @click="emit('close')">決定</button>
        </div>
      </section>
    </div>
  </Teleport>

  <AddProfileFieldModal
    :open="addModalOpen"
    @close="addModalOpen = false"
    @submit="addField"
  />

  <AddProfileFieldModal
    :open="editModalOpen"
    title="プロフィール項目変更"
    confirm-label="変更"
    :show-delete="!!editTarget && editTarget.source === 'user'"
    :initial-label="editTarget?.label"
    :initial-section="editTarget?.section"
    :initial-input-type="editTarget?.inputType"
    :initial-select-options="editTarget?.selectOptions ?? []"
    @close="editTargetId = ''"
    @submit="updateField"
    @remove="removeEditingField"
  />

  <ConfirmModal
    :open="removeConfirmOpen"
    title="プロフィール項目を削除"
    :message="`「${editTarget?.label || ''}」を削除します。削除履歴から元に戻せます。`"
    confirm-label="削除"
    @close="removeConfirmOpen = false"
    @confirm="confirmRemoveEditingField"
  />
</template>
