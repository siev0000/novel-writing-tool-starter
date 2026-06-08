<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { dataStore, formatStorageBytes, getProject, getStoredDataBytes, STORAGE_USAGE_QUOTA_BYTES, transientStore } from '../store/data';

const props = defineProps<{ projectId?: string; title?: string }>();
const router = useRouter();
const route = useRoute();
const project = computed(() => (props.projectId ? getProject(props.projectId) : undefined));
const deletedCount = computed(() => transientStore.deletedItems.length);
const onTrashPage = computed(() => route.path === '/trash');
const storageUsedBytes = computed(() => getStoredDataBytes());
const storageQuotaBytes = computed(() => STORAGE_USAGE_QUOTA_BYTES);
const storagePercent = computed(() => {
  if (!storageQuotaBytes.value) return 0;
  return Math.min(100, (storageUsedBytes.value / storageQuotaBytes.value) * 100);
});
const storageUsedLabel = computed(() => formatStorageBytes(storageUsedBytes.value));
const storageQuotaLabel = computed(() => formatStorageBytes(storageQuotaBytes.value));
const counts = computed(() => {
  const projectId = props.projectId;
  if (!projectId) {
    return { characters: 0, tags: 0, relationships: 0, terms: 0, episodes: 0, bodies: 0 };
  }
  return {
    characters: dataStore.characters.filter((item) => item.projectId === projectId).length,
    tags: dataStore.tags.filter((item) => item.projectId === projectId && item.type !== 'ジャンルタグ').length,
    relationships: dataStore.relationships.filter((item) => item.projectId === projectId).length,
    terms: dataStore.terms.filter((item) => item.projectId === projectId).length,
    episodes: dataStore.episodes.filter((item) => item.projectId === projectId).length,
    bodies: dataStore.bodyDrafts.filter((item) => item.projectId === projectId).length,
  };
});

function goBack() {
  if (history.length > 1) router.back();
  else if (props.projectId) router.push(`/project/${props.projectId}`);
  else router.push('/');
}

function goHome() {
  router.push('/');
}

function goTrash() {
  router.push('/trash');
}
</script>

<template>
  <header class="app-header">
    <div class="storage-meter" :title="`保存容量 ${storageUsedLabel}/${storageQuotaLabel}`">
      <div class="storage-meter-track">
        <div
          class="storage-meter-fill"
          :class="{ warn: storagePercent >= 80, danger: storagePercent >= 95 }"
          :style="{ width: `${storagePercent}%` }"
        />
      </div>
      <div class="storage-meter-label">{{ storageUsedLabel }}/{{ storageQuotaLabel }}</div>
    </div>
    <div class="header-top">
      <div class="header-left">
        <button class="ghost" @click="goBack">← 戻る</button>
        <div>
          <p class="eyebrow">小説書き出しアプリ</p>
          <h1>{{ project?.title || title || '作品一覧' }}</h1>
        </div>
      </div>
      <div class="header-actions">
        <button v-if="!projectId && !onTrashPage" class="ghost" @click="goTrash">削除済み <span>{{ deletedCount }}</span></button>
        <button v-if="onTrashPage" class="ghost" @click="goHome">作品一覧</button>
        <button v-if="projectId" class="ghost" @click="goHome">作品一覧</button>
      </div>
    </div>
    <nav v-if="projectId" class="tabs">
      <router-link :to="`/project/${projectId}`">作品</router-link>
      <router-link :to="`/project/${projectId}/characters`">人物 <span>{{ counts.characters }}</span></router-link>
      <router-link :to="`/project/${projectId}/tags`">タグ <span>{{ counts.tags }}</span></router-link>
      <router-link :to="`/project/${projectId}/relationships`">相関図 <span>{{ counts.relationships }}</span></router-link>
      <router-link :to="`/project/${projectId}/terms`">用語 <span>{{ counts.terms }}</span></router-link>
      <router-link :to="`/project/${projectId}/plot`">プロット <span>{{ counts.episodes }}</span></router-link>
      <router-link :to="`/project/${projectId}/editor`">本文 <span>{{ counts.bodies }}</span></router-link>
    </nav>
  </header>
</template>
