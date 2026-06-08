<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import { getDeletedItemsForProject, getProject, restoreDeletedItem } from '../store/data';

const projectId = useRoute().params.projectId as string;
const project = computed(() => getProject(projectId));
const deletedItems = computed(() => getDeletedItemsForProject(projectId));

function itemTypeLabel(kind: string) {
  if (kind === 'character') return '人物';
  if (kind === 'tag') return 'タグ';
  if (kind === 'term') return '用語';
  if (kind === 'profileField') return 'プロフィール項目';
  if (kind === 'relationship') return '相関';
  if (kind === 'chapter') return '章';
  if (kind === 'episode') return '話';
  if (kind === 'scene') return 'シーン';
  return kind;
}
</script>

<template>
  <AppHeader :project-id="projectId" title="削除履歴" />
  <main class="page">
    <section class="card hero-card">
      <h2>{{ project?.title || '作品' }} の削除履歴</h2>
      <p>この作品で削除した人物、タグ、用語、プロフィール項目、相関、章、話、シーンを、再読み込み前までここから復元できます。削除履歴は30件まで保持します。</p>
    </section>

    <section v-if="deletedItems.length" class="list">
      <section v-for="item in deletedItems" :key="item.trashId" class="list-item trash-row">
        <div class="trash-main">
          <strong>{{ item.label }}</strong>
          <span>{{ itemTypeLabel(item.kind) }} / {{ new Date(item.deletedAt).toLocaleString('ja-JP') }}</span>
        </div>
        <div class="button-row">
          <button type="button" @click="restoreDeletedItem(item.trashId)">元に戻す</button>
        </div>
      </section>
    </section>

    <section v-else class="card empty-state">この作品の削除履歴はありません。</section>
  </main>
</template>
