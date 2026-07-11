<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ColorPaletteModal from '../components/ColorPaletteModal.vue';
import type { ColorPaletteItem } from '../components/ColorPaletteModal.vue';
import ConfirmModal from '../components/ConfirmModal.vue';
import AppHeader from '../components/AppHeader.vue';
import CharacterNameModal from '../components/CharacterNameModal.vue';
import SelectionModal from '../components/SelectionModal.vue';
import type { SelectionModalItem } from '../components/SelectionModal.vue';
import { getColorDisplayLabel, getColorPaletteItem } from '../constants/colorPalette';
import TextField from '../components/TextField.vue';
import {
  activateTagVersion,
  createTagVersion,
  dataStore,
  deleteTag,
  deleteTagVersion,
  ensureTagVersions,
  getTagActiveVersion,
  getProject,
  isTagVersionChanged,
  syncTagActiveVersion,
  transientStore,
} from '../store/data';
import { createId, nowIso } from '../utils/id';
import { resizeTextarea } from '../utils/textarea';
import type { Tag, TagVersion } from '../types/models';

const route = useRoute();
const router = useRouter();
const projectId = route.params.projectId as string;
const selectedId = ref('');
const selectionHistory = ref<string[]>([]);
const keyword = ref('');
const categoryFilter = ref('すべて');
const typeFilter = ref('すべて');
const listMode = ref<'tag' | 'term'>('tag');
const tagListRef = ref<HTMLElement | null>(null);
const listScrollTop = ref(0);
const tagDeleteTargetId = ref('');
const colorModalOpen = ref(false);
const statusModalOpen = ref(false);
const typeFilterModalOpen = ref(false);
const categoryFilterModalOpen = ref(false);
const categorySelectModalOpen = ref(false);
const relatedTagsModalOpen = ref(false);
const isEditing = ref(false);
const nameModalOpen = ref(false);
const nameError = ref('');
const pendingCreateType = ref<'tag' | 'term' | null>(null);
const settingsMenuOpen = ref(false);
const versionDeleteTargetId = ref('');
const summaryDeleteTargetId = ref('');
const collapsedSections = ref({
  memo: false,
  summary: false,
});
const builtinTagTypes = ['人物タグ', '関係タグ', '雰囲気タグ', 'シナリオタグ', '用語', 'ユーザータグ'] as const;

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
const termCategories = ['地名', '組織', '種族', '魔法', '技', 'アイテム', '神話', '歴史', '事件', '概念', '文化', '宗教', '国家', 'その他'];
const isTermListMode = computed(() => listMode.value === 'term');
const project = computed(() => getProject(projectId));

const tags = computed(() => dataStore.tags.filter((tag) => tag.projectId === projectId && tag.type !== 'ジャンルタグ'));
const termFilterCategories = computed(() => {
  const usedCategories = Array.from(new Set(
    tags.value
      .filter((tag) => tag.source !== 'default')
      .map((tag) => tag.category || 'その他')
  ));
  const ordered = termCategories.filter((category) => usedCategories.includes(category));
  const extra = usedCategories.filter((category) => !termCategories.includes(category));
  return [...ordered, ...extra];
});
const termCategoryFilterItems = computed<SelectionModalItem[]>(() => [
  { id: 'すべて', label: 'すべて', category: '分類' },
  ...termFilterCategories.value.map((category) => ({ id: category, label: category, category: '分類' })),
]);
const termCategorySelectItems = computed<SelectionModalItem[]>(() => {
  const current = selected.value?.category?.trim();
  const items = [...termFilterCategories.value];
  if (current && !items.includes(current)) items.push(current);
  if (!items.includes('その他')) items.push('その他');
  return items.map((category) => ({ id: category, label: category, category: '分類' }));
});
const tagTypeItems = computed<SelectionModalItem[]>(() => {
  const customTypes = project.value?.customTagTypes ?? [];
  const existingTypes = Array.from(new Set(tags.value.map((tag) => tag.type).filter(Boolean)));
  const managedTypes = Array.from(new Set([...customTypes, ...existingTypes.filter((type) => !builtinTagTypes.includes(type as typeof builtinTagTypes[number]))]));
  return [
    ...builtinTagTypes.map((type) => ({ id: type, label: getDisplayTypeLabel(type), category: '基本分類' })),
    ...managedTypes.map((type) => ({ id: type, label: getDisplayTypeLabel(type), category: '追加分類' })),
  ];
});
const tagTypes = computed(() => ['すべて', ...Array.from(new Set(
  tags.value
    .filter((tag) => tag.source === 'default')
    .map((tag) => tag.type)
    .filter((type) => type && type !== '用語')
))]);
const tagTypeFilterItems = computed<SelectionModalItem[]>(() => [
  { id: 'すべて', label: 'すべて', category: '分類' },
  ...tagTypes.value
    .filter((type) => type !== 'すべて')
    .map((type) => ({ id: type, label: getDisplayTypeLabel(type), category: '分類' })),
]);
const filteredTags = computed(() => {
  return tags.value.filter((tag) => {
    const matchMode = isTermListMode.value ? tag.source !== 'default' : tag.source === 'default';
    const matchType = isTermListMode.value || typeFilter.value === 'すべて' || tag.type === typeFilter.value;
    const summaryText = (tag.summaryItems ?? []).map((item) => `${item.title} ${item.content}`).join(' ');
    const matchKeyword = !keyword.value || `${tag.name} ${tag.ruby || ''} ${summaryText} ${tag.memo || ''}`.includes(keyword.value);
    const matchCategory = !isTermListMode.value || categoryFilter.value === 'すべて' || (tag.category || 'その他') === categoryFilter.value;
    return matchMode && matchType && matchKeyword && matchCategory;
  });
});
const selected = computed(() => dataStore.tags.find((tag) => tag.id === selectedId.value));
const isProjectTitleTag = computed(() => selected.value?.source === 'default' && selected.value.type === '作品タグ');
const isTermTag = computed(() => selected.value?.type === '用語');
const selectedVersions = computed(() => selected.value?.versions ?? []);
const activeVersion = computed(() => (selected.value ? getTagActiveVersion(selected.value) : undefined));
const activeVersionChanged = computed(() => (activeVersion.value ? isTagVersionChanged(activeVersion.value) : false));
const selectedRelatedTags = computed(() => tags.value.filter((tag) => selected.value?.relatedTagIds?.includes(tag.id)));
const selectedTagColorItem = computed(() => getColorPaletteItem(selected.value?.color));
const selectedTagStatusItem = computed(() => tagStatusItems.find((item) => item.id === selected.value?.status));
const selectedSummaryItems = computed(() => selected.value?.summaryItems ?? []);
const selectedHeaderClassification = computed(() => {
  if (!selected.value) return '';
  return getTagClassificationLabel(selected.value);
});
const addTagItems = computed<SelectionModalItem[]>(() => {
  if (!selected.value) return [];
  const currentName = selected.value.name.trim();
  return tags.value
    .filter((tag) => tag.id !== selected.value?.id)
    .filter((tag) => tag.name.trim() !== currentName)
    .map((tag) => ({
      id: tag.id,
      label: tag.name,
      category: getTagClassificationLabel(tag),
      description: tag.memo,
      color: tag.color,
    }));
});
const selectedTagColorSummary = computed(() => {
  if (!selected.value) return '';
  return getColorDisplayLabel(selected.value.color);
});
const modeToggleLabel = computed(() => (isTermListMode.value ? '用語' : 'タグ'));
const modeToggleSubLabel = computed(() => (isTermListMode.value ? 'タグ' : '用語'));

function getSavedTagViewState() {
  return transientStore.tagViewSelections[projectId] ?? {
    selectedId: '',
    keyword: '',
    categoryFilter: 'すべて',
    typeFilter: 'すべて',
    listMode: 'tag',
    scrollTop: 0,
  };
}

const initialTagViewState = getSavedTagViewState();
selectedId.value = initialTagViewState.selectedId;
keyword.value = initialTagViewState.keyword;
categoryFilter.value = initialTagViewState.categoryFilter;
typeFilter.value = initialTagViewState.typeFilter;
listMode.value = initialTagViewState.listMode;
listScrollTop.value = initialTagViewState.scrollTop ?? 0;

function saveListScrollPosition() {
  listScrollTop.value = tagListRef.value?.scrollTop ?? 0;
}

function restoreListScrollPosition() {
  nextTick(() => {
    if (tagListRef.value) tagListRef.value.scrollTop = listScrollTop.value;
  });
}

onMounted(restoreListScrollPosition);

function getDisplayTypeLabel(type?: string) {
  if (!type) return '';
  if (type === '用語') return '用語';
  return type.endsWith('タグ') ? type.slice(0, -2) : type;
}

function getTagClassificationLabel(tag?: Tag) {
  if (!tag) return '';
  if (tag.type === '用語' || tag.source !== 'default') return tag.category || 'その他';
  return getDisplayTypeLabel(tag.type);
}

watch(selectedId, () => {
  isEditing.value = false;
  nameModalOpen.value = false;
  settingsMenuOpen.value = false;
  versionDeleteTargetId.value = '';
  summaryDeleteTargetId.value = '';
});

function resizeSummaryTextareas() {
  document.querySelectorAll<HTMLTextAreaElement>('.tag-summary-content').forEach((textarea) => {
    resizeTextarea(textarea, 7);
  });
}

watch(
  selectedSummaryItems,
  async () => {
    await nextTick();
    resizeSummaryTextareas();
  },
  { deep: true, immediate: true }
);

watch(
  () => route.query.type,
  (queryType) => {
    if (typeof queryType !== 'string' || !queryType) return;
    listMode.value = queryType === '用語' ? 'term' : 'tag';
    if (typeFilter.value !== queryType) typeFilter.value = queryType;
  },
  { immediate: true }
);

watch(listMode, (value) => {
  if (value === 'term') {
    typeFilter.value = '用語';
    return;
  }
  if (typeFilter.value === '用語') typeFilter.value = 'すべて';
});

watch(typeFilter, (value) => {
  const current = typeof route.query.type === 'string' && route.query.type ? route.query.type : 'すべて';
  if (current === value) return;
  router.replace({
    path: route.path,
    query: value === 'すべて'
      ? { ...route.query, type: undefined }
      : { ...route.query, type: value },
  });
});

watch(
  [selectedId, keyword, categoryFilter, typeFilter, listMode, listScrollTop],
  () => {
    transientStore.tagViewSelections[projectId] = {
      selectedId: selectedId.value,
      keyword: keyword.value,
      categoryFilter: categoryFilter.value,
      typeFilter: typeFilter.value,
      listMode: listMode.value,
      scrollTop: listScrollTop.value,
    };
  },
  { immediate: true }
);

watch(
  filteredTags,
  (items) => {
    if (!items.length) {
      selectedId.value = '';
      return;
    }
    if (!selectedId.value || !items.some((tag) => tag.id === selectedId.value)) {
      selectedId.value = items[0].id;
    }
  },
  { immediate: true }
);

function addTag() {
  pendingCreateType.value = isTermListMode.value ? 'term' : 'tag';
  nameError.value = '';
  nameModalOpen.value = true;
}

function createTagWithName(name: string, ruby: string) {
  const now = nowIso();
  const isTerm = pendingCreateType.value === 'term';
  const normalized = normalizeTagName(name) || '名前未設定';
  if (hasDuplicateTagName(normalized)) {
    nameError.value = '同じ名前のタグは設定できません。';
    return;
  }
  const tag: Tag = {
    id: createId(),
    projectId,
    name: normalized,
    ruby: ruby.trim(),
    type: isTerm ? '用語' : 'ユーザータグ',
    category: isTerm ? 'その他' : undefined,
    color: isTerm ? '#607d8b' : '#32746d',
    relatedTagIds: [],
    summaryItems: [],
    description: '',
    shortDescription: '',
    memo: '',
    source: 'user',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
  dataStore.tags.unshift(tag);
  ensureTagVersions(tag);
  selectedId.value = tag.id;
  isEditing.value = true;
  nameError.value = '';
  pendingCreateType.value = null;
  nameModalOpen.value = false;
}

function normalizeTagName(value: string) {
  return value.trim();
}

function hasDuplicateTagName(name: string, excludeId?: string) {
  return tags.value.some((tag) => tag.id !== excludeId && normalizeTagName(tag.name) === name);
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
  selected.value.updatedAt = nowIso();
  syncTagActiveVersion(selected.value);
  colorModalOpen.value = false;
}

function updateTagStatus(item: SelectionModalItem) {
  if (!selected.value || isProjectTitleTag.value) return;
  selected.value.status = item.id as 'active' | 'hidden';
  selected.value.updatedAt = nowIso();
  syncTagActiveVersion(selected.value);
  statusModalOpen.value = false;
}

function updateCategoryFilter(item: SelectionModalItem) {
  categoryFilter.value = item.id;
  categoryFilterModalOpen.value = false;
}

function updateTypeFilter(item: SelectionModalItem) {
  typeFilter.value = item.id;
  typeFilterModalOpen.value = false;
}

const classificationSelectItems = computed<SelectionModalItem[]>(() => {
  if (!selected.value) return [];
  return (selected.value.type === '用語' || selected.value.source !== 'default')
    ? termCategorySelectItems.value
    : tagTypeItems.value;
});

function openClassificationModal() {
  if (!selected.value || isProjectTitleTag.value) return;
  categorySelectModalOpen.value = true;
}

function updateSelectedClassification(item: SelectionModalItem) {
  if (!selected.value || isProjectTitleTag.value) return;
  if (selected.value.type === '用語' || selected.value.source !== 'default') {
    selected.value.category = item.id;
  } else {
    selected.value.type = item.id;
  }
  selected.value.updatedAt = nowIso();
  syncTagActiveVersion(selected.value);
  categorySelectModalOpen.value = false;
}

function updateTagName(value: string) {
  if (!selected.value || isProjectTitleTag.value) return;
  selected.value.name = value;
  selected.value.updatedAt = nowIso();
  syncTagActiveVersion(selected.value);
}

function updateTagMemo(value: string) {
  if (!selected.value || isProjectTitleTag.value) return;
  selected.value.memo = value;
  selected.value.updatedAt = nowIso();
  syncTagActiveVersion(selected.value);
}

function updateTagRuby(value: string) {
  if (!selected.value || isProjectTitleTag.value) return;
  selected.value.ruby = value;
  selected.value.updatedAt = nowIso();
  syncTagActiveVersion(selected.value);
}

function updateTagDisplayName(name: string, ruby: string) {
  if (pendingCreateType.value) {
    createTagWithName(name, ruby);
    return;
  }
  if (!selected.value || isProjectTitleTag.value) return;
  const normalized = normalizeTagName(name) || '名前未設定';
  if (hasDuplicateTagName(normalized, selected.value.id)) {
    nameError.value = '同じ名前のタグは設定できません。';
    return;
  }
  updateTagName(normalized);
  updateTagRuby(ruby.trim());
  nameError.value = '';
  nameModalOpen.value = false;
}

function updateTagCategory(value: string) {
  if (!selected.value || isProjectTitleTag.value) return;
  selected.value.category = value;
  selected.value.updatedAt = nowIso();
  syncTagActiveVersion(selected.value);
}


function toggleRelatedTag(item: SelectionModalItem) {
  if (!selected.value || isProjectTitleTag.value) return;
  selected.value.relatedTagIds ??= [];
  if (selected.value.relatedTagIds.includes(item.id)) {
    selected.value.relatedTagIds = selected.value.relatedTagIds.filter((id) => id !== item.id);
  } else {
    selected.value.relatedTagIds.push(item.id);
  }
  selected.value.updatedAt = nowIso();
  syncTagActiveVersion(selected.value);
}

function addSummaryItem() {
  if (!selected.value || isProjectTitleTag.value || !isEditing.value) return;
  selected.value.summaryItems ??= [];
  selected.value.summaryItems.push({
    id: createId(),
    title: '',
    content: '',
  });
  selected.value.updatedAt = nowIso();
  syncTagActiveVersion(selected.value);
}

function removeSummaryItem(itemId: string) {
  summaryDeleteTargetId.value = itemId;
}

function confirmRemoveSummaryItem() {
  if (!summaryDeleteTargetId.value) return;
  if (!selected.value || isProjectTitleTag.value || !isEditing.value) return;
  selected.value.summaryItems = (selected.value.summaryItems ?? []).filter((item) => item.id !== summaryDeleteTargetId.value);
  selected.value.updatedAt = nowIso();
  syncTagActiveVersion(selected.value);
  summaryDeleteTargetId.value = '';
}

function updateSummaryItem(itemId: string, key: 'title' | 'content', value: string) {
  if (!selected.value || isProjectTitleTag.value || !isEditing.value) return;
  const item = selected.value.summaryItems?.find((summaryItem) => summaryItem.id === itemId);
  if (!item) return;
  item[key] = value;
  selected.value.updatedAt = nowIso();
  syncTagActiveVersion(selected.value);
  nextTick(resizeSummaryTextareas);
}

function addVersion() {
  if (!selected.value) return;
  const version = createTagVersion(selected.value);
  if (version) {
    selected.value.updatedAt = nowIso();
    syncTagActiveVersion(selected.value);
    isEditing.value = true;
  }
}

function switchVersion(versionId: string) {
  if (!selected.value) return;
  activateTagVersion(selected.value, versionId);
  isEditing.value = false;
}

function openTag(tagId: string) {
  if (!tagId || tagId === selectedId.value) return;
  if (selectedId.value) selectionHistory.value.push(selectedId.value);
  selectedId.value = tagId;
}

function selectTag(tagId: string) {
  openTag(tagId);
}

function goBackToPreviousTag() {
  while (selectionHistory.value.length) {
    const previousId = selectionHistory.value.pop();
    if (!previousId) continue;
    if (!filteredTags.value.some((tag) => tag.id === previousId)) continue;
    selectedId.value = previousId;
    return true;
  }
  return false;
}

function removeCurrentVersion() {
  if (!selected.value || !activeVersion.value) return;
  versionDeleteTargetId.value = activeVersion.value.id;
}

function confirmRemoveCurrentVersion() {
  if (!selected.value || !activeVersion.value) return;
  const deleted = deleteTagVersion(selected.value, versionDeleteTargetId.value);
  if (deleted) isEditing.value = false;
  versionDeleteTargetId.value = '';
}

function versionChanged(version: TagVersion) {
  return isTagVersionChanged(version);
}

function toggleEditMode() {
  if (!selected.value || isProjectTitleTag.value) return;
  isEditing.value = !isEditing.value;
}

function switchToTagList() {
  listMode.value = 'tag';
}

function switchToTermList() {
  listMode.value = 'term';
}

function toggleListMode() {
  listMode.value = isTermListMode.value ? 'tag' : 'term';
}

function toggleSection(section: 'memo' | 'summary') {
  collapsedSections.value = {
    ...collapsedSections.value,
    [section]: !collapsedSections.value[section],
  };
}

function openTagCharacterSearch() {
  if (!selected.value) return;
  router.push({
    path: `/project/${projectId}/characters`,
    query: { tagId: selected.value.id },
  });
}
</script>

<template>
  <AppHeader :project-id="projectId" title="タグ" :back-handler="goBackToPreviousTag" />
  <main class="page split-page">
    <section class="card side-list fixed-side-list" :class="{ 'term-side-list': isTermListMode }">
      <div class="term-side-toolbar">
        <div class="tag-toolbar-top">
          <button class="tag-add-button" @click="addTag">＋</button>
          <button type="button" class="tag-mode-toggle" :class="{ 'term-mode': isTermListMode }" @click="toggleListMode">
            <span class="tag-mode-toggle-stack">
              <span class="tag-mode-toggle-sub">{{ modeToggleSubLabel }}</span>
              <span class="tag-mode-toggle-main">{{ modeToggleLabel }}</span>
            </span>
          </button>
        </div>
        <button
          v-if="isTermListMode"
          type="button"
          class="list-button tag-filter-button"
          @click="categoryFilterModalOpen = true"
        >
          <span class="tag-filter-label">分類</span>
        </button>
        <button
          v-else
          type="button"
          class="list-button tag-filter-button"
          @click="typeFilterModalOpen = true"
        >
          <span class="tag-filter-label">分類</span>
        </button>
        <input v-model="keyword" class="side-search-input" :placeholder="isTermListMode ? '用語検索' : 'タグ検索'" />
      </div>
      <div ref="tagListRef" class="scroll-list" @scroll="saveListScrollPosition">
        <button
          v-for="tag in filteredTags"
          :key="tag.id"
          class="list-button tag-list-button"
          :class="{
            active: tag.id === selectedId,
            'default-tag-item': tag.source === 'default',
            'user-tag-item': tag.source !== 'default',
          }"
          :style="{ borderLeftColor: tag.color }"
          @click="openTag(tag.id)"
        >
          <span class="tag-list-main">
            <span class="ruby-stack list-ruby" :class="{ 'no-ruby': !tag.ruby }">
              <span v-if="tag.ruby" class="ruby-text">{{ tag.ruby }}</span>
              <span class="ruby-base">{{ tag.name }}</span>
            </span>
            <small class="tag-list-sub">{{ getTagClassificationLabel(tag) }}</small>
          </span>
        </button>
      </div>
    </section>

    <section
      v-if="selected"
      class="card editor-card fixed-editor-card line-form-card"
      :class="{ 'version-dirty': activeVersionChanged }"
    >
      <div class="editor-sticky-header">
        <div class="version-bar">
          <div class="version-tabs" :class="{ 'is-scrollable': selectedVersions.length > 5 }">
            <button
              v-for="(version, index) in selectedVersions"
              :key="version.id"
              type="button"
              class="version-tab"
              :class="{ active: version.id === activeVersion?.id, changed: versionChanged(version) }"
              @click="switchVersion(version.id)"
            >
              v{{ index + 1 }}
            </button>
          </div>
          <div class="version-actions">
            <button type="button" class="secondary" @click="addVersion">＋</button>
            <button type="button" class="secondary" :disabled="isProjectTitleTag" @click="toggleEditMode">{{ isEditing ? '✓' : '✎' }}</button>
            <div class="version-settings-wrap">
              <button type="button" class="secondary" @click="settingsMenuOpen = !settingsMenuOpen">⚙</button>
              <div v-if="settingsMenuOpen" class="version-settings-menu">
                <button type="button" class="secondary" :disabled="selectedVersions.length <= 1" @click="settingsMenuOpen = false; removeCurrentVersion()">バージョン削除</button>
                <button type="button" class="danger" :disabled="isProjectTitleTag" @click="settingsMenuOpen = false; requestDeleteTag()">タグ削除</button>
              </div>
            </div>
          </div>
        </div>
        <section class="name-display-row compact-name-row">
          <div class="field-label-value">
            <div class="name-label-line">
              <button v-if="isEditing" type="button" class="inline-edit-button" :disabled="isProjectTitleTag" @click="nameModalOpen = true">✎</button>
              <strong class="section-label">
                {{ isEditing ? (isTermTag ? '用語名' : 'タグ名') : selectedHeaderClassification }}
              </strong>
            </div>
            <button
              v-if="!isEditing && !isProjectTitleTag"
              type="button"
              class="name-search-trigger"
              @click="openTagCharacterSearch"
            >
              <span class="ruby-stack compact-name-value" :class="{ 'no-ruby': !selected.ruby }">
                <span v-if="selected.ruby" class="ruby-text">{{ selected.ruby }}</span>
                <span class="ruby-base">{{ selected.name || '名前未設定' }}</span>
              </span>
            </button>
            <span v-else class="ruby-stack compact-name-value" :class="{ 'no-ruby': !selected.ruby }">
              <span v-if="selected.ruby" class="ruby-text">{{ selected.ruby }}</span>
              <span class="ruby-base">{{ selected.name || '名前未設定' }}</span>
            </span>
          </div>
        </section>
        <section v-if="!relatedTagsModalOpen" class="inline-panel sticky-related-panel">
          <div class="panel-heading sticky-related-heading">
            <div class="sticky-related-inline">
              <button v-if="isEditing" type="button" class="inline-edit-button" :disabled="isProjectTitleTag" @click="relatedTagsModalOpen = true">✎</button>
              <span class="sticky-related-label">タグ:</span>
              <div v-if="selectedRelatedTags.length" class="sticky-related-chips">
                <button
                  v-for="tag in selectedRelatedTags"
                  :key="tag.id"
                  type="button"
                  class="selected-chip selected-chip-lined related-tag-link"
                  :style="{ borderLeftColor: tag.color }"
                  @click="selectTag(tag.id)"
                >
                  {{ tag.name }}
                </button>
              </div>
              <span v-else class="hint-text">未設定</span>
            </div>
          </div>
        </section>
      </div>
      <div class="editor-scroll-body">
        <section v-if="isEditing" class="profile-section">
          <button type="button" class="section-toggle-header" disabled>
            <span>▼</span>
            <strong>基本情報</strong>
          </button>
          <div class="profile-section-body tag-profile-body">
            <div class="tag-meta-row">
              <section class="field">
                <div class="name-label-line">
                  <button v-if="isEditing" type="button" class="inline-edit-button" :disabled="isProjectTitleTag" @click="openClassificationModal">✎</button>
                  <span>分類</span>
                </div>
                <div class="select-summary">
                  <strong>{{ getTagClassificationLabel(selected) }}</strong>
                </div>
              </section>

              <section class="field">
                <div class="name-label-line">
                  <button v-if="isEditing" type="button" class="inline-edit-button" :disabled="isProjectTitleTag" @click="colorModalOpen = true">✎</button>
                  <span>色</span>
                </div>
                <div class="select-summary color-summary-lined" :style="{ borderLeftColor: selected.color, color: selected.color }">
                  <strong>
                    {{ selectedTagColorSummary }}
                  </strong>
                </div>
              </section>

              <section class="field">
                <div class="name-label-line">
                  <button v-if="isEditing" type="button" class="inline-edit-button" :disabled="isProjectTitleTag" @click="statusModalOpen = true">✎</button>
                  <span>表示切替</span>
                </div>
                <div class="select-summary">
                  <strong>{{ selectedTagStatusItem?.label || selected.status }}</strong>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section class="profile-section">
          <div class="section-toggle-header">
            <button type="button" class="section-toggle-trigger" @click="toggleSection('memo')">
              <span>{{ collapsedSections.memo ? '▶' : '▼' }}</span>
              <strong>メモ</strong>
            </button>
          </div>
          <div v-if="!collapsedSections.memo" class="profile-section-body">
            <TextField
              v-if="isEditing && !isProjectTitleTag"
              label="メモ"
              type="textarea"
              :model-value="selected.memo"
              @update:model-value="updateTagMemo"
            />
            <label v-else class="field">
              <span>メモ</span>
              <textarea :value="selected.memo" rows="3" disabled />
            </label>
          </div>
        </section>

        <section class="profile-section">
          <div class="section-toggle-header section-toggle-header-with-action">
            <button type="button" class="section-toggle-trigger" @click="toggleSection('summary')">
              <span>{{ collapsedSections.summary ? '▶' : '▼' }}</span>
              <strong>概要</strong>
            </button>
            <button v-if="isEditing" type="button" class="secondary section-header-action" :disabled="isProjectTitleTag" @click.stop="addSummaryItem">＋ 項目追加</button>
          </div>
          <div v-if="!collapsedSections.summary" class="profile-section-body">
            <section class="inline-panel">
              <div v-if="selectedSummaryItems.length" class="tag-summary-list">
                <section v-for="item in selectedSummaryItems" :key="item.id" class="tag-summary-item">
                  <div class="button-row tag-summary-actions" v-if="isEditing">
                    <button type="button" class="danger" :disabled="isProjectTitleTag" @click="removeSummaryItem(item.id)">削除</button>
                  </div>
                  <label class="field tag-summary-field">
                    <input
                      :value="item.title"
                      placeholder="タイトル"
                      :readonly="!isEditing || isProjectTitleTag"
                      @input="updateSummaryItem(item.id, 'title', ($event.target as HTMLInputElement).value)"
                    />
                  </label>
                  <label class="field tag-summary-field">
                    <textarea
                      class="auto-textarea tag-summary-content"
                      :value="item.content"
                      placeholder="内容"
                      rows="1"
                      :readonly="!isEditing || isProjectTitleTag"
                      @input="updateSummaryItem(item.id, 'content', ($event.target as HTMLTextAreaElement).value)"
                    />
                  </label>
                </section>
              </div>
              <p v-else class="hint-text">未設定</p>
            </section>
          </div>
        </section>
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
      :selected-id="selectedTagColorItem?.id || ''"
      @close="colorModalOpen = false"
      @select="updateTagColor"
    />

    <SelectionModal
      :open="typeFilterModalOpen"
      title="タグ分類"
      :items="tagTypeFilterItems"
      :selected-id="typeFilter"
      @close="typeFilterModalOpen = false"
      @select="updateTypeFilter"
    />

    <SelectionModal
      :open="categoryFilterModalOpen"
      title="用語分類"
      :items="termCategoryFilterItems"
      :selected-id="categoryFilter"
      @close="categoryFilterModalOpen = false"
      @select="updateCategoryFilter"
    />

    <SelectionModal
      :open="categorySelectModalOpen"
      title="分類"
      :items="classificationSelectItems"
      :selected-id="selected?.type === '用語' || selected?.source !== 'default' ? (selected?.category || '') : (selected?.type || '')"
      @close="categorySelectModalOpen = false"
      @select="updateSelectedClassification"
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

    <ConfirmModal
      :open="Boolean(versionDeleteTargetId)"
      title="タグ版を削除"
      message="この版を削除します。残っている版へ切り替わります。"
      confirm-label="版を削除"
      @close="versionDeleteTargetId = ''"
      @confirm="confirmRemoveCurrentVersion"
    />

    <ConfirmModal
      :open="Boolean(summaryDeleteTargetId)"
      title="概要項目を削除"
      message="この概要項目を削除します。"
      confirm-label="概要項目を削除"
      @close="summaryDeleteTargetId = ''"
      @confirm="confirmRemoveSummaryItem"
    />

    <CharacterNameModal
      :open="nameModalOpen"
      :title="pendingCreateType === 'term' ? '用語名設定' : pendingCreateType === 'tag' ? 'タグ名設定' : isTermTag ? '用語名設定' : 'タグ名設定'"
      :name="pendingCreateType ? '' : selected?.name || ''"
      :ruby="pendingCreateType ? '' : selected?.ruby || ''"
      :error-message="nameError"
      @close="nameModalOpen = false; nameError = ''; pendingCreateType = null"
      @save="updateTagDisplayName"
    />

    <SelectionModal
      :open="relatedTagsModalOpen"
      title="関連タグ"
      :items="addTagItems"
      layout="grid"
      mode="check"
      :selected-ids="selected?.relatedTagIds || []"
      empty-text="タグがありません。"
      @close="relatedTagsModalOpen = false"
      @toggle="toggleRelatedTag"
    />
  </main>
</template>
