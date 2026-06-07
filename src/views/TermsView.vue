<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import CharacterNameModal from '../components/CharacterNameModal.vue';
import SelectionModal from '../components/SelectionModal.vue';
import type { SelectionModalItem } from '../components/SelectionModal.vue';
import TextField from '../components/TextField.vue';
import {
  activateTermVersion,
  createTermVersion,
  dataStore,
  ensureTermVersions,
  getTermActiveVersion,
  isTermVersionChanged,
  syncTermActiveVersion,
} from '../store/data';
import { createId, nowIso } from '../utils/id';
import type { Term, TermVersion } from '../types/models';

const projectId = useRoute().params.projectId as string;
const selectedId = ref('');
const keyword = ref('');
const category = ref('すべて');
const termNameModalOpen = ref(false);
const termNameError = ref('');
const tagModalOpen = ref(false);
const tagRemoveModalOpen = ref(false);
const terms = computed(() => {
  return dataStore.terms.filter((t) => {
    const matchProject = t.projectId === projectId;
    const matchKeyword = !keyword.value || `${t.name} ${t.ruby} ${t.description}`.includes(keyword.value);
    const matchCategory = category.value === 'すべて' || t.category === category.value;
    return matchProject && matchKeyword && matchCategory;
  });
});
const categories = ['すべて', '地名', '組織', '種族', '魔法', '技', 'アイテム', '神話', '歴史', '事件', '概念', '文化', '宗教', '国家', 'その他'];
const tags = computed(() => dataStore.tags.filter((tag) => tag.projectId === projectId && tag.status === 'active' && tag.type !== 'ジャンルタグ'));
const selected = computed(() => dataStore.terms.find((t) => t.id === selectedId.value));
const selectedVersions = computed(() => selected.value?.versions ?? []);
const activeVersion = computed(() => (selected.value ? getTermActiveVersion(selected.value) : undefined));
const activeVersionChanged = computed(() => (activeVersion.value ? isTermVersionChanged(activeVersion.value) : false));
const selectedTags = computed(() => tags.value.filter((tag) => selected.value?.relatedTagIds?.includes(tag.id)));
const addTagItems = computed<SelectionModalItem[]>(() => {
  return tags.value.map((tag) => ({
    id: tag.id,
    label: tag.name,
    category: tag.type,
    description: tag.memo,
    color: tag.color,
    disabled: selected.value?.relatedTagIds?.includes(tag.id) ?? false,
  }));
});
const removeTagItems = computed<SelectionModalItem[]>(() => {
  return selectedTags.value.map((tag) => ({
    id: tag.id,
    label: tag.name,
    category: tag.type,
    description: tag.memo,
    color: tag.color,
  }));
});

function normalizeTermName(value: string) {
  return value.trim();
}

function hasDuplicateTermName(name: string, excludeId?: string) {
  const normalized = normalizeTermName(name);
  if (!normalized) return false;
  return dataStore.terms.some((term) =>
    term.projectId === projectId
    && term.id !== excludeId
    && normalizeTermName(term.name) === normalized
  );
}

watch(selectedId, () => {
  termNameError.value = '';
  tagModalOpen.value = false;
  tagRemoveModalOpen.value = false;
});

watch(
  terms,
  (items) => {
    if (!items.length) {
      selectedId.value = '';
      return;
    }
    if (!selectedId.value || !items.some((term) => term.id === selectedId.value)) {
      selectedId.value = items[0].id;
    }
  },
  { immediate: true }
);

function addTerm() {
  const now = nowIso();
  const term: Term = {
    id: createId(), projectId, name: '新しい用語', ruby: '', category: 'その他', description: '', shortDescription: '',
    relatedCharacterIds: [], relatedPlotIds: [], relatedTagIds: [], spoilerInfo: '', publicInfo: '', memo: '', createdAt: now, updatedAt: now,
  };
  dataStore.terms.unshift(term);
  ensureTermVersions(term);
  selectedId.value = term.id;
  nextTick(() => {
    termNameModalOpen.value = true;
  });
}

function saveTermName(name: string, ruby: string) {
  if (!selected.value) return;
  const normalized = normalizeTermName(name) || '名前未設定';
  if (hasDuplicateTermName(normalized, selected.value.id)) {
    termNameError.value = '同じ名前の用語は設定できません。';
    return;
  }
  selected.value.name = normalized;
  selected.value.ruby = ruby.trim();
  selected.value.updatedAt = nowIso();
  syncTermActiveVersion(selected.value);
  termNameError.value = '';
  termNameModalOpen.value = false;
}

function addVersion() {
  if (!selected.value) return;
  const version = createTermVersion(selected.value);
  if (version) {
    selected.value.updatedAt = nowIso();
    syncTermActiveVersion(selected.value);
  }
}

function switchVersion(versionId: string) {
  if (!selected.value) return;
  activateTermVersion(selected.value, versionId);
  termNameError.value = '';
}

function versionChanged(version: TermVersion) {
  return isTermVersionChanged(version);
}

function addTag(item: SelectionModalItem) {
  if (!selected.value) return;
  selected.value.relatedTagIds ??= [];
  if (!selected.value.relatedTagIds.includes(item.id)) selected.value.relatedTagIds.push(item.id);
  selected.value.updatedAt = nowIso();
  syncTermActiveVersion(selected.value);
  tagModalOpen.value = false;
}

function removeTag(item: SelectionModalItem) {
  if (!selected.value) return;
  selected.value.relatedTagIds = selected.value.relatedTagIds.filter((id) => id !== item.id);
  selected.value.updatedAt = nowIso();
  syncTermActiveVersion(selected.value);
  tagRemoveModalOpen.value = false;
}

function updateSelectedField<K extends keyof Term>(key: K, value: Term[K]) {
  if (!selected.value) return;
  selected.value[key] = value;
  selected.value.updatedAt = nowIso();
  syncTermActiveVersion(selected.value);
}
</script>

<template>
  <AppHeader :project-id="projectId" title="用語まとめ" />
  <main class="page split-page">
    <section class="card side-list term-side-list">
      <div class="term-side-toolbar">
        <button @click="addTerm">＋ 用語追加</button>
        <input v-model="keyword" placeholder="用語検索" />
        <select v-model="category">
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="scroll-list">
        <button v-for="t in terms" :key="t.id" class="list-button" :class="{ active: t.id === selectedId }" @click="selectedId = t.id">
          <span class="ruby-stack list-ruby">
            <span class="ruby-text">{{ t.ruby || '　' }}</span>
            <span class="ruby-base">{{ t.name }}</span>
          </span>
          <small>{{ t.category }}</small>
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
          <div class="version-tabs">
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
          </div>
        </div>
        <section class="name-display-row compact-name-row">
        <div class="field-label-value">
          <strong class="section-label">用語名</strong>
          <span class="ruby-stack compact-name-value">
            <span class="ruby-text">{{ selected.ruby || '　' }}</span>
            <span class="ruby-base">{{ selected.name || '名前未設定' }}</span>
          </span>
        </div>
        <button type="button" class="secondary" @click="termNameModalOpen = true">変更</button>
        </section>
        <p v-if="termNameError" class="hint-text error-text">{{ termNameError }}</p>
      </div>
      <div class="editor-scroll-body">
        <section class="inline-panel">
          <div class="panel-heading">
            <h3>関連タグ</h3>
            <div class="button-row">
              <button type="button" class="secondary" @click="tagModalOpen = true">＋ タグ追加</button>
              <button type="button" class="secondary" :disabled="!selectedTags.length" @click="tagRemoveModalOpen = true">タグ削除</button>
            </div>
          </div>
          <div v-if="selectedTags.length" class="chip-grid">
            <span v-for="tag in selectedTags" :key="tag.id" class="selected-chip">
              <span class="tag-swatch" :style="{ backgroundColor: tag.color }"></span>
              {{ tag.name }}
            </span>
          </div>
          <p v-else class="hint-text">未設定</p>
        </section>
        <label class="field">
          <span>分類</span>
          <select :value="selected.category" @change="updateSelectedField('category', ($event.target as HTMLSelectElement).value)">
            <option v-for="c in categories.filter(x => x !== 'すべて')" :key="c">{{ c }}</option>
          </select>
        </label>
        <TextField label="説明" type="textarea" :model-value="selected.description" @update:model-value="updateSelectedField('description', $event)" />
        <TextField label="本文用の短い説明" type="textarea" :model-value="selected.shortDescription" @update:model-value="updateSelectedField('shortDescription', $event)" />
        <TextField label="メモ" type="textarea" :model-value="selected.memo" @update:model-value="updateSelectedField('memo', $event)" />
      </div>
    </section>

    <section v-else class="card empty-state">用語を選択してください。</section>

    <CharacterNameModal
      :open="termNameModalOpen"
      title="用語名設定"
      :name="selected?.name || ''"
      :ruby="selected?.ruby || ''"
      :error-message="termNameError"
      @close="termNameModalOpen = false"
      @save="saveTermName"
    />
    <SelectionModal
      :open="tagModalOpen"
      title="関連タグ"
      :items="addTagItems"
      layout="grid"
      :selected-id="''"
      empty-text="タグがありません。"
      @close="tagModalOpen = false"
      @select="addTag"
    />
    <SelectionModal
      :open="tagRemoveModalOpen"
      title="削除する関連タグ"
      :items="removeTagItems"
      layout="grid"
      :selected-id="''"
      empty-text="削除できるタグがありません。"
      @close="tagRemoveModalOpen = false"
      @select="removeTag"
    />
  </main>
</template>
