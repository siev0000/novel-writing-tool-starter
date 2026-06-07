<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import ColorPaletteModal from '../components/ColorPaletteModal.vue';
import type { ColorPaletteItem } from '../components/ColorPaletteModal.vue';
import ConfirmModal from '../components/ConfirmModal.vue';
import AppHeader from '../components/AppHeader.vue';
import SingleNameModal from '../components/SingleNameModal.vue';
import SelectionModal from '../components/SelectionModal.vue';
import type { SelectionModalItem } from '../components/SelectionModal.vue';
import TextField from '../components/TextField.vue';
import { dataStore, deleteTag } from '../store/data';
import { createId } from '../utils/id';
import type { Tag } from '../types/models';

const projectId = useRoute().params.projectId as string;
const selectedId = ref('');
const typeFilter = ref('すべて');
const tagDeleteTargetId = ref('');
const colorModalOpen = ref(false);
const statusModalOpen = ref(false);
const typeModalOpen = ref(false);
const tagNameModalOpen = ref(false);

const tagColorItems: ColorPaletteItem[] = [
  { id: '#ffcdd2', label: '赤 100', family: '赤', shade: '100', color: '#ffcdd2' },
  { id: '#ef9a9a', label: '赤 200', family: '赤', shade: '200', color: '#ef9a9a' },
  { id: '#e57373', label: '赤 300', family: '赤', shade: '300', color: '#e57373' },
  { id: '#ef5350', label: '赤 400', family: '赤', shade: '400', color: '#ef5350' },
  { id: '#f44336', label: '赤 500', family: '赤', shade: '500', color: '#f44336' },
  { id: '#e53935', label: '赤 600', family: '赤', shade: '600', color: '#e53935' },
  { id: '#d32f2f', label: '赤 700', family: '赤', shade: '700', color: '#d32f2f' },
  { id: '#c62828', label: '赤 800', family: '赤', shade: '800', color: '#c62828' },
  { id: '#b71c1c', label: '赤 900', family: '赤', shade: '900', color: '#b71c1c' },

  { id: '#f8bbd0', label: '桃 100', family: '桃', shade: '100', color: '#f8bbd0' },
  { id: '#f48fb1', label: '桃 200', family: '桃', shade: '200', color: '#f48fb1' },
  { id: '#f06292', label: '桃 300', family: '桃', shade: '300', color: '#f06292' },
  { id: '#ec407a', label: '桃 400', family: '桃', shade: '400', color: '#ec407a' },
  { id: '#e91e63', label: '桃 500', family: '桃', shade: '500', color: '#e91e63' },
  { id: '#d81b60', label: '桃 600', family: '桃', shade: '600', color: '#d81b60' },
  { id: '#c2185b', label: '桃 700', family: '桃', shade: '700', color: '#c2185b' },
  { id: '#ad1457', label: '桃 800', family: '桃', shade: '800', color: '#ad1457' },
  { id: '#880e4f', label: '桃 900', family: '桃', shade: '900', color: '#880e4f' },

  { id: '#d1c4e9', label: '紫 100', family: '紫', shade: '100', color: '#d1c4e9' },
  { id: '#b39ddb', label: '紫 200', family: '紫', shade: '200', color: '#b39ddb' },
  { id: '#9575cd', label: '紫 300', family: '紫', shade: '300', color: '#9575cd' },
  { id: '#7e57c2', label: '紫 400', family: '紫', shade: '400', color: '#7e57c2' },
  { id: '#673ab7', label: '紫 500', family: '紫', shade: '500', color: '#673ab7' },
  { id: '#5e35b1', label: '紫 600', family: '紫', shade: '600', color: '#5e35b1' },
  { id: '#512da8', label: '紫 700', family: '紫', shade: '700', color: '#512da8' },
  { id: '#4527a0', label: '紫 800', family: '紫', shade: '800', color: '#4527a0' },
  { id: '#311b92', label: '紫 900', family: '紫', shade: '900', color: '#311b92' },

  { id: '#bbdefb', label: '青 100', family: '青', shade: '100', color: '#bbdefb' },
  { id: '#90caf9', label: '青 200', family: '青', shade: '200', color: '#90caf9' },
  { id: '#64b5f6', label: '青 300', family: '青', shade: '300', color: '#64b5f6' },
  { id: '#42a5f5', label: '青 400', family: '青', shade: '400', color: '#42a5f5' },
  { id: '#2196f3', label: '青 500', family: '青', shade: '500', color: '#2196f3' },
  { id: '#1e88e5', label: '青 600', family: '青', shade: '600', color: '#1e88e5' },
  { id: '#1976d2', label: '青 700', family: '青', shade: '700', color: '#1976d2' },
  { id: '#1565c0', label: '青 800', family: '青', shade: '800', color: '#1565c0' },
  { id: '#0d47a1', label: '青 900', family: '青', shade: '900', color: '#0d47a1' },

  { id: '#b2dfdb', label: '青緑 100', family: '青緑', shade: '100', color: '#b2dfdb' },
  { id: '#80cbc4', label: '青緑 200', family: '青緑', shade: '200', color: '#80cbc4' },
  { id: '#4db6ac', label: '青緑 300', family: '青緑', shade: '300', color: '#4db6ac' },
  { id: '#26a69a', label: '青緑 400', family: '青緑', shade: '400', color: '#26a69a' },
  { id: '#009688', label: '青緑 500', family: '青緑', shade: '500', color: '#009688' },
  { id: '#00897b', label: '青緑 600', family: '青緑', shade: '600', color: '#00897b' },
  { id: '#00796b', label: '青緑 700', family: '青緑', shade: '700', color: '#00796b' },
  { id: '#00695c', label: '青緑 800', family: '青緑', shade: '800', color: '#00695c' },
  { id: '#004d40', label: '青緑 900', family: '青緑', shade: '900', color: '#004d40' },

  { id: '#c8e6c9', label: '緑 100', family: '緑', shade: '100', color: '#c8e6c9' },
  { id: '#a5d6a7', label: '緑 200', family: '緑', shade: '200', color: '#a5d6a7' },
  { id: '#81c784', label: '緑 300', family: '緑', shade: '300', color: '#81c784' },
  { id: '#66bb6a', label: '緑 400', family: '緑', shade: '400', color: '#66bb6a' },
  { id: '#4caf50', label: '緑 500', family: '緑', shade: '500', color: '#4caf50' },
  { id: '#43a047', label: '緑 600', family: '緑', shade: '600', color: '#43a047' },
  { id: '#388e3c', label: '緑 700', family: '緑', shade: '700', color: '#388e3c' },
  { id: '#2e7d32', label: '緑 800', family: '緑', shade: '800', color: '#2e7d32' },
  { id: '#1b5e20', label: '緑 900', family: '緑', shade: '900', color: '#1b5e20' },

  { id: '#fff59d', label: '黄 100', family: '黄', shade: '100', color: '#fff59d' },
  { id: '#fff176', label: '黄 200', family: '黄', shade: '200', color: '#fff176' },
  { id: '#ffee58', label: '黄 300', family: '黄', shade: '300', color: '#ffee58' },
  { id: '#ffeb3b', label: '黄 400', family: '黄', shade: '400', color: '#ffeb3b' },
  { id: '#fdd835', label: '黄 500', family: '黄', shade: '500', color: '#fdd835' },
  { id: '#fbc02d', label: '黄 600', family: '黄', shade: '600', color: '#fbc02d' },
  { id: '#f9a825', label: '黄 700', family: '黄', shade: '700', color: '#f9a825' },
  { id: '#f57f17', label: '黄 800', family: '黄', shade: '800', color: '#f57f17' },
  { id: '#ffb300', label: '黄 900', family: '黄', shade: '900', color: '#ffb300' },

  { id: '#ffe0b2', label: '橙 100', family: '橙', shade: '100', color: '#ffe0b2' },
  { id: '#ffcc80', label: '橙 200', family: '橙', shade: '200', color: '#ffcc80' },
  { id: '#ffb74d', label: '橙 300', family: '橙', shade: '300', color: '#ffb74d' },
  { id: '#ffa726', label: '橙 400', family: '橙', shade: '400', color: '#ffa726' },
  { id: '#ff9800', label: '橙 500', family: '橙', shade: '500', color: '#ff9800' },
  { id: '#fb8c00', label: '橙 600', family: '橙', shade: '600', color: '#fb8c00' },
  { id: '#f57c00', label: '橙 700', family: '橙', shade: '700', color: '#f57c00' },
  { id: '#ef6c00', label: '橙 800', family: '橙', shade: '800', color: '#ef6c00' },
  { id: '#e65100', label: '橙 900', family: '橙', shade: '900', color: '#e65100' },

  { id: '#d7ccc8', label: '茶 100', family: '茶', shade: '100', color: '#d7ccc8' },
  { id: '#bcaaa4', label: '茶 200', family: '茶', shade: '200', color: '#bcaaa4' },
  { id: '#a1887f', label: '茶 300', family: '茶', shade: '300', color: '#a1887f' },
  { id: '#8d6e63', label: '茶 400', family: '茶', shade: '400', color: '#8d6e63' },
  { id: '#795548', label: '茶 500', family: '茶', shade: '500', color: '#795548' },
  { id: '#6d4c41', label: '茶 600', family: '茶', shade: '600', color: '#6d4c41' },
  { id: '#5d4037', label: '茶 700', family: '茶', shade: '700', color: '#5d4037' },
  { id: '#4e342e', label: '茶 800', family: '茶', shade: '800', color: '#4e342e' },
  { id: '#3e2723', label: '茶 900', family: '茶', shade: '900', color: '#3e2723' },

  { id: '#f5f5f5', label: '灰 100', family: '灰', shade: '100', color: '#f5f5f5' },
  { id: '#eeeeee', label: '灰 200', family: '灰', shade: '200', color: '#eeeeee' },
  { id: '#e0e0e0', label: '灰 300', family: '灰', shade: '300', color: '#e0e0e0' },
  { id: '#bdbdbd', label: '灰 400', family: '灰', shade: '400', color: '#bdbdbd' },
  { id: '#9e9e9e', label: '灰 500', family: '灰', shade: '500', color: '#9e9e9e' },
  { id: '#757575', label: '灰 600', family: '灰', shade: '600', color: '#757575' },
  { id: '#616161', label: '灰 700', family: '灰', shade: '700', color: '#616161' },
  { id: '#424242', label: '灰 800', family: '灰', shade: '800', color: '#424242' },
  { id: '#212121', label: '灰 900', family: '灰', shade: '900', color: '#212121' },
];

const tagStatusItems: SelectionModalItem[] = [
  { id: 'active', label: '表示', category: '状態', meta: '通常表示' },
  { id: 'hidden', label: '非表示', category: '状態', meta: '一覧や候補から隠す' },
];

const tags = computed(() => dataStore.tags.filter((tag) => tag.projectId === projectId && tag.type !== 'ジャンルタグ'));
const tagTypeItems = computed<SelectionModalItem[]>(() => {
  const baseTypes = ['人物タグ', '関係タグ', '雰囲気タグ', 'シナリオタグ', 'ユーザータグ'];
  const existingTypes = Array.from(new Set(tags.value.map((tag) => tag.type).filter(Boolean)));
  const items = [
    ...baseTypes.map((type) => ({ id: type, label: type, category: '基本分類' })),
    ...existingTypes
      .filter((type) => !baseTypes.includes(type))
      .map((type) => ({ id: type, label: type, category: '既存分類' })),
  ];
  return items;
});
const tagTypes = computed(() => ['すべて', ...Array.from(new Set(tags.value.map((tag) => tag.type).filter(Boolean)))]);
const filteredTags = computed(() => {
  return tags.value.filter((tag) => typeFilter.value === 'すべて' || tag.type === typeFilter.value);
});
const selected = computed(() => dataStore.tags.find((tag) => tag.id === selectedId.value));
const isProjectTitleTag = computed(() => selected.value?.source === 'default' && selected.value.type === '作品タグ');
const selectedTagColorItem = computed(() => tagColorItems.find((item) => item.id === selected.value?.color));
const selectedTagStatusItem = computed(() => tagStatusItems.find((item) => item.id === selected.value?.status));
const selectedTagTypeItem = computed(() => tagTypeItems.value.find((item) => item.id === selected.value?.type));
const selectedTagColorSummary = computed(() => {
  if (!selected.value) return '';
  if (!selectedTagColorItem.value) return selected.value.color;
  return `${selected.value.color} / ${selectedTagColorItem.value.family} ${selectedTagColorItem.value.shade}`;
});

function addTag() {
  const tag: Tag = {
    id: createId(),
    projectId,
    name: '新しいタグ',
    type: 'ユーザータグ',
    color: '#32746d',
    memo: '',
    source: 'user',
    status: 'active',
  };
  dataStore.tags.unshift(tag);
  selectedId.value = tag.id;
  tagNameModalOpen.value = true;
}

function requestDeleteTag() {
  if (!selected.value || isProjectTitleTag.value) return;
  tagDeleteTargetId.value = selected.value.id;
}

function confirmDeleteTag() {
  if (!tagDeleteTargetId.value) return;
  deleteTag(tagDeleteTargetId.value);
  tagDeleteTargetId.value = '';
  selectedId.value = filteredTags.value[0]?.id ?? '';
}

function updateTagColor(item: ColorPaletteItem) {
  if (!selected.value || isProjectTitleTag.value) return;
  selected.value.color = item.id;
  colorModalOpen.value = false;
}

function updateTagStatus(item: SelectionModalItem) {
  if (!selected.value || isProjectTitleTag.value) return;
  selected.value.status = item.id as 'active' | 'hidden';
  statusModalOpen.value = false;
}

function updateTagType(item: SelectionModalItem) {
  if (!selected.value || isProjectTitleTag.value) return;
  selected.value.type = item.id;
  typeModalOpen.value = false;
}

function saveTagName(value: string) {
  if (!selected.value || isProjectTitleTag.value) return;
  selected.value.name = value.trim() || '名前未設定';
  tagNameModalOpen.value = false;
}
</script>

<template>
  <AppHeader :project-id="projectId" title="タグ" />
  <main class="page split-page">
    <section class="card side-list">
      <button @click="addTag">＋ タグ追加</button>
      <select v-model="typeFilter">
        <option v-for="type in tagTypes" :key="type" :value="type">{{ type }}</option>
      </select>
      <button
        v-for="tag in filteredTags"
        :key="tag.id"
        class="list-button tag-list-button"
        :class="{
          active: tag.id === selectedId,
          'default-tag-item': tag.source === 'default',
          'user-tag-item': tag.source !== 'default',
        }"
        @click="selectedId = tag.id"
      >
        <span class="tag-swatch" :style="{ backgroundColor: tag.color }"></span>
        <span>
          {{ tag.name }}
          <small>{{ tag.type }}</small>
        </span>
      </button>
    </section>

    <section v-if="selected" class="card editor-card line-form-card">
      <label v-if="isProjectTitleTag" class="field">
        <span>タグ名</span>
        <input :value="selected.name" disabled />
      </label>
      <TextField v-else label="タグ名" v-model="selected.name" />
      <label v-if="isProjectTitleTag" class="field">
        <span>分類</span>
        <input :value="selected.type" disabled />
      </label>
      <section v-else class="field">
        <span>分類</span>
        <div class="select-summary">
          <strong>{{ selectedTagTypeItem?.label || selected.type }}</strong>
          <button type="button" @click="typeModalOpen = true">選ぶ</button>
        </div>
      </section>
      <label class="field">
        <span>色</span>
        <div class="select-summary">
          <strong>
            <span class="tag-swatch inline-swatch" :style="{ backgroundColor: selected.color }"></span>
            {{ selectedTagColorSummary }}
          </strong>
          <button type="button" :disabled="isProjectTitleTag" @click="colorModalOpen = true">選ぶ</button>
        </div>
      </label>
      <section class="field">
        <span>状態</span>
        <div class="select-summary">
          <strong>{{ selectedTagStatusItem?.label || selected.status }}</strong>
          <button type="button" :disabled="isProjectTitleTag" @click="statusModalOpen = true">選ぶ</button>
        </div>
      </section>
      <TextField label="メモ" type="textarea" v-model="selected.memo" />
      <div class="button-row">
        <button type="button" class="danger" :disabled="isProjectTitleTag" @click="requestDeleteTag">削除</button>
      </div>
    </section>

    <section v-else class="card empty-state">タグを選択してください。</section>

    <ConfirmModal
      :open="Boolean(tagDeleteTargetId)"
      title="タグを削除"
      message="このタグを削除します。関連する人物・用語・シーンなどからも参照を外します。"
      confirm-label="タグを削除"
      @close="tagDeleteTargetId = ''"
      @confirm="confirmDeleteTag"
    />

    <ColorPaletteModal
      :open="colorModalOpen"
      title="タグ色一覧"
      :items="tagColorItems"
      :selected-id="selected?.color || ''"
      @close="colorModalOpen = false"
      @select="updateTagColor"
    />

    <SingleNameModal
      :open="tagNameModalOpen"
      title="タグ名設定"
      label="タグ名"
      :value="selected?.name || ''"
      placeholder="タグ名を入力"
      @close="tagNameModalOpen = false"
      @save="saveTagName"
    />

    <SelectionModal
      :open="statusModalOpen"
      title="タグ状態"
      :items="tagStatusItems"
      :selected-id="selected?.status || ''"
      empty-text="選択できる状態がありません。"
      @close="statusModalOpen = false"
      @select="updateTagStatus"
    />

    <SelectionModal
      :open="typeModalOpen"
      title="タグ分類"
      :items="tagTypeItems"
      :selected-id="selected?.type || ''"
      empty-text="選択できる分類がありません。"
      @close="typeModalOpen = false"
      @select="updateTagType"
    />
  </main>
</template>
