<script setup lang="ts">
import { computed } from 'vue';
import AppHeader from '../components/AppHeader.vue';
import { restoreDeletedItem, transientStore } from '../store/data';

const deletedItems = computed(() => transientStore.deletedItems);

function itemTypeLabel(kind: string) {
  if (kind === 'project') return '作品';
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
  <AppHeader title="削除済み" />
  <main class="page">
    <section class="card hero-card">
      <h2>削除済みの管理</h2>
      <p>再読み込みするまではここから復元できます。削除履歴は30件まで保持します。</p>
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

    <section v-else class="card empty-state">削除済みの項目はありません。</section>
  </main>
</template>
