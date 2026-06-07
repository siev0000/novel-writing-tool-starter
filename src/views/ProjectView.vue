<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import ProfileFieldsModal from '../components/ProfileFieldsModal.vue';
import SelectionModal from '../components/SelectionModal.vue';
import type { SelectionModalItem } from '../components/SelectionModal.vue';
import TextField from '../components/TextField.vue';
import { dataStore, deleteCharacterProfileField, exportProjectData, getDeletedItemsForProject, getProject, importProjectData, toggleProjectGenre, updateProjectTitle } from '../store/data';
import { createId, nowIso } from '../utils/id';
import type { ProfileFieldInputType } from '../types/models';

const route = useRoute();
const router = useRouter();
const projectId = route.params.projectId as string;
const genreModalOpen = ref(false);
const profileModalOpen = ref(false);
const importError = ref('');
const importFileInput = ref<HTMLInputElement | null>(null);
const project = computed(() => getProject(projectId));
const deletedItems = computed(() => getDeletedItemsForProject(projectId));
const genreTags = computed(() => dataStore.tags.filter((tag) => tag.projectId === projectId && tag.type === 'ジャンルタグ' && tag.status === 'active'));
const selectedGenreTagIds = computed(() => {
  if (!project.value) return [];
  if (project.value.genreTagIds?.length) return project.value.genreTagIds;
  if (project.value.genreTagId) return [project.value.genreTagId];
  const legacyTag = genreTags.value.find((tag) => tag.name === project.value?.genre);
  return legacyTag ? [legacyTag.id] : [];
});
const genreItems = computed<SelectionModalItem[]>(() => {
  return genreTags.value.map((tag) => ({
    id: tag.id,
    label: tag.name,
    category: tag.category || 'その他',
    description: tag.memo,
    color: tag.color,
  }));
});

function touch() { if (project.value) project.value.updatedAt = nowIso(); }
function updateTitle(title: string) { updateProjectTitle(projectId, title); }
function toggleGenre(item: SelectionModalItem) {
  toggleProjectGenre(projectId, item.id);
}
function addProfileFieldByLabel(label: string, section: string, inputType: ProfileFieldInputType, selectOptions: string[]) {
  if (!project.value) return;
  project.value.characterProfileFields ??= [];
  project.value.characterProfileFields.push({
    id: createId(),
    label,
    section,
    order: project.value.characterProfileFields.length + 1,
    source: 'user',
    status: 'active',
    inputType,
    selectOptions,
  });
  touch();
}
function updateProfileField(fieldId: string, patch: { label?: string; section?: string; inputType?: ProfileFieldInputType; selectOptions?: string[] }) {
  const field = project.value?.characterProfileFields?.find((item) => item.id === fieldId);
  if (!field || field.source !== 'user') return;
  if (patch.label !== undefined) field.label = patch.label;
  if (patch.section !== undefined) field.section = patch.section;
  if (patch.inputType !== undefined) field.inputType = patch.inputType;
  if (patch.selectOptions !== undefined) field.selectOptions = patch.selectOptions;
  touch();
}
function reorderProfileField(fieldId: string, targetFieldId: string) {
  const fields = project.value?.characterProfileFields;
  if (!fields?.length) return;
  const fromIndex = fields.findIndex((field) => field.id === fieldId);
  const toIndex = fields.findIndex((field) => field.id === targetFieldId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

  const [moved] = fields.splice(fromIndex, 1);
  fields.splice(toIndex, 0, moved);
  fields.forEach((field, position) => {
    field.order = position + 1;
  });
  touch();
}
function toggleProfileField(fieldId: string) {
  const field = project.value?.characterProfileFields?.find((item) => item.id === fieldId);
  if (!field) return;
  field.status = field.status === 'hidden' ? 'active' : 'hidden';
  touch();
}
function removeProfileField(fieldId: string) {
  deleteCharacterProfileField(projectId, fieldId);
}
function openProjectTrash() {
  router.push(`/project/${projectId}/trash`);
}
function exportCurrentProject() {
  exportProjectData(projectId);
}
function openImportFileDialog() {
  importError.value = '';
  importFileInput.value?.click();
}
async function importProjectJson(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const importedProjectId = importProjectData(await file.text(), { targetProjectId: projectId });
    input.value = '';
    router.push(`/project/${importedProjectId}`);
  } catch (error) {
    importError.value = error instanceof Error ? error.message : '読み込みに失敗しました。';
    input.value = '';
  }
}
</script>

<template>
  <AppHeader :project-id="projectId" title="作品" />
  <main v-if="project" class="page">
    <section class="card line-form-card">
      <TextField label="作品タイトル" :model-value="project.title" @update:model-value="updateTitle" />
      <section class="field">
        <span>ジャンル</span>
        <div class="select-summary">
          <strong>{{ project.genre || '未設定' }}</strong>
          <button type="button" @click="genreModalOpen = true">ジャンルを選ぶ</button>
        </div>
      </section>
      <TextField label="概要" type="textarea" v-model="project.summary" @update:model-value="touch" />
      <TextField label="メモ" type="textarea" v-model="project.memo" @update:model-value="touch" />

      <section class="inline-panel">
        <div class="panel-heading">
          <h3>JSON入出力</h3>
          <div class="button-row">
            <button type="button" class="secondary" @click="exportCurrentProject">書き出し</button>
            <button type="button" class="secondary" @click="openImportFileDialog">上書き読み込み</button>
          </div>
        </div>
        <p class="hint-text">この作品の内容をJSONで保存し、JSONを読み込むと現在の作品内容を上書きします。</p>
        <p v-if="importError" class="hint-text error-text">{{ importError }}</p>
        <input ref="importFileInput" type="file" accept="application/json,.json" class="hidden-file-input" @change="importProjectJson" />
      </section>

      <section class="inline-panel">
        <div class="panel-heading">
          <h3>人物プロフィール項目</h3>
          <button type="button" class="secondary" @click="profileModalOpen = true">設定</button>
        </div>
        <p class="hint-text">表示するプロフィール項目を設定します。</p>
      </section>

      <section class="inline-panel">
        <div class="panel-heading">
          <h3>削除履歴</h3>
          <button type="button" class="secondary" @click="openProjectTrash">開く</button>
        </div>
        <p class="hint-text">この作品で削除した人物、タグ、プロフィール項目を管理します。</p>
        <div class="meta-line">
          <span>{{ deletedItems.length }}件</span>
        </div>
      </section>
    </section>

    <SelectionModal
      :open="genreModalOpen"
      title="ジャンル一覧"
      :items="genreItems"
      mode="check"
      layout="grid"
      :selected-ids="selectedGenreTagIds"
      empty-text="ジャンルタグがありません。"
      @close="genreModalOpen = false"
      @toggle="toggleGenre"
    />

    <ProfileFieldsModal
      :open="profileModalOpen"
      :fields="project.characterProfileFields ?? []"
      @close="profileModalOpen = false"
      @add="addProfileFieldByLabel"
      @update="updateProfileField"
      @reorder="reorderProfileField"
      @toggle="toggleProfileField"
      @remove="removeProfileField"
    />
  </main>
</template>
