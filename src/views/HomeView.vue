<script setup lang="ts">
import { computed, ref } from 'vue';
import ConfirmModal from '../components/ConfirmModal.vue';
import AppHeader from '../components/AppHeader.vue';
import { createProject, dataStore, deleteProject, exportBackup, exportBackupMarkdown, importBackup, importProjectData, removeDeletedItem, restoreDeletedItem, transientStore } from '../store/data';
import { useRouter } from 'vue-router';

const router = useRouter();
const newProjectTitle = ref('');
const projectDeleteTargetId = ref('');
const importError = ref('');
const backupImportFileInput = ref<HTMLInputElement | null>(null);
const projectImportFileInput = ref<HTMLInputElement | null>(null);
const latestDeletedProject = computed(() => transientStore.deletedItems.find((item) => item.kind === 'project'));
const deletedProjectLabel = computed(() => latestDeletedProject.value?.label || '');
function addProject() {
  const project = createProject(newProjectTitle.value.trim() || '新しい作品');
  newProjectTitle.value = '';
  router.push(`/project/${project.id}`);
}
function requestDeleteProject(projectId: string) {
  projectDeleteTargetId.value = projectId;
}
function confirmDeleteProject() {
  if (!projectDeleteTargetId.value) return;
  deleteProject(projectDeleteTargetId.value);
  projectDeleteTargetId.value = '';
}
function undoDeletedProject() {
  if (!latestDeletedProject.value) return;
  restoreDeletedItem(latestDeletedProject.value.trashId);
}
function closeDeletedProject() {
  if (!latestDeletedProject.value) return;
  removeDeletedItem(latestDeletedProject.value.trashId);
}
function openBackupImportFileDialog() {
  importError.value = '';
  backupImportFileInput.value?.click();
}
function openProjectImportFileDialog() {
  importError.value = '';
  projectImportFileInput.value?.click();
}
async function importBackupJson(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const rawText = await file.text();
    const parsed = JSON.parse(rawText) as { format?: string } | null;
    if (parsed?.format === 'novel-writing-tool-project') {
      throw new Error('作品単体JSONです。作品JSON読み込みを使ってください。');
    }
    const result = importBackup(rawText);
    input.value = '';
    if (result.type === 'project') router.push(`/project/${result.projectId}`);
    else router.push('/');
  } catch (error) {
    importError.value = error instanceof Error ? error.message : '読み込みに失敗しました。';
    input.value = '';
  }
}
async function importProjectJson(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const rawText = await file.text();
    const parsed = JSON.parse(rawText) as { format?: string } | null;
    if (parsed?.format !== 'novel-writing-tool-project') {
      throw new Error('作品単体JSONではありません。全体JSON読み込みを使ってください。');
    }
    const projectId = importProjectData(rawText);
    input.value = '';
    router.push(`/project/${projectId}`);
  } catch (error) {
    importError.value = error instanceof Error ? error.message : '読み込みに失敗しました。';
    input.value = '';
  }
}
</script>

<template>
  <AppHeader title="作品一覧" />
  <main class="page">
    <section class="card hero-card">
      <h2>作品を管理する</h2>
      <p>設定・人物・用語・プロット・本文を作品ごとに保存します。</p>
      <label class="field">
        <span>新しい作品名</span>
        <input v-model="newProjectTitle" placeholder="例：天空の地アストラルヘイヴン" @keydown.enter="addProject" />
      </label>
      <div class="button-row">
        <button @click="addProject">＋ 新しい作品</button>
        <button class="secondary" @click="exportBackup">JSONバックアップ</button>
        <button class="secondary" @click="exportBackupMarkdown">MDバックアップ</button>
        <button class="secondary" @click="openBackupImportFileDialog">全体JSON読み込み</button>
        <button class="secondary" @click="openProjectImportFileDialog">作品JSON読み込み</button>
      </div>
      <p v-if="importError" class="hint-text error-text">{{ importError }}</p>
      <input ref="backupImportFileInput" type="file" accept="application/json,.json" class="hidden-file-input" @change="importBackupJson" />
      <input ref="projectImportFileInput" type="file" accept="application/json,.json" class="hidden-file-input" @change="importProjectJson" />
    </section>

    <section v-if="deletedProjectLabel" class="inline-panel undo-panel">
      <strong>{{ deletedProjectLabel }} を削除しました。</strong>
      <div class="button-row">
        <button type="button" @click="undoDeletedProject">元に戻す</button>
        <button type="button" class="secondary" @click="closeDeletedProject">閉じる</button>
      </div>
    </section>

    <section class="list">
      <div v-for="project in dataStore.projects" :key="project.id" class="list-item project-row">
        <router-link class="project-link" :to="`/project/${project.id}`">
          <strong>{{ project.title }}</strong>
          <span>{{ project.genre || 'ジャンル未設定' }}</span>
        </router-link>
        <button type="button" class="danger project-delete-button" @click="requestDeleteProject(project.id)">削除</button>
      </div>
    </section>

    <ConfirmModal
      :open="Boolean(projectDeleteTargetId)"
      title="作品を削除"
      message="この作品を削除します。関連する人物・タグ・本文などもまとめて削除されます。"
      confirm-label="作品を削除"
      @close="projectDeleteTargetId = ''"
      @confirm="confirmDeleteProject"
    />
  </main>
</template>
