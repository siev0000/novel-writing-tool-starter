<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import ConfirmModal from '../components/ConfirmModal.vue';
import SelectionModal from '../components/SelectionModal.vue';
import type { SelectionModalItem } from '../components/SelectionModal.vue';
import TextField from '../components/TextField.vue';
import { dataStore, deleteChapter, deleteEpisode, deleteScene, ensureEpisodeChapters, ensureWorkPlot, getProjectNavigatorSelection, getWorkPlot, setProjectNavigatorSelection, transientStore } from '../store/data';
import { createId } from '../utils/id';
import type { Chapter, Episode, Scene } from '../types/models';

type PlotSelectionKind = 'workPlot' | 'chapter' | 'episode' | 'scene';

const projectId = useRoute().params.projectId as string;
ensureEpisodeChapters(projectId);
const initialWorkPlot = ensureWorkPlot(projectId);

const selectedKind = ref<PlotSelectionKind>('workPlot');
const selectedChapterId = ref('');
const selectedEpisodeId = ref('');
const selectedSceneId = ref('');
const collapsedChapterIds = ref<string[]>([]);
const collapsedEpisodeIds = ref<string[]>([]);
const leftSidebarCollapsed = ref(false);

const episodeCharacterAddModalOpen = ref(false);
const episodeCharacterRemoveModalOpen = ref(false);
const episodeTagAddModalOpen = ref(false);
const episodeTagRemoveModalOpen = ref(false);
const sceneCharacterAddModalOpen = ref(false);
const sceneCharacterRemoveModalOpen = ref(false);
const deleteTarget = ref<{ kind: 'chapter' | 'episode' | 'scene'; id: string; label: string } | null>(null);
const episodeCharacterDeleteTarget = ref<SelectionModalItem | null>(null);
const episodeTagDeleteTarget = ref<SelectionModalItem | null>(null);
const sceneCharacterDeleteTarget = ref<SelectionModalItem | null>(null);
getProjectNavigatorSelection(projectId);

const workPlot = computed(() => getWorkPlot(projectId) ?? initialWorkPlot);
const chapters = computed(() => dataStore.chapters.filter((chapter) => chapter.projectId === projectId).sort((a, b) => a.number - b.number));
const selectedChapter = computed(() => dataStore.chapters.find((chapter) => chapter.id === selectedChapterId.value));
const episodes = computed(() => dataStore.episodes.filter((episode) => episode.projectId === projectId).sort((a, b) => a.number - b.number));
const chapterEpisodes = computed(() => episodes.value.filter((episode) => episode.chapterId === selectedChapterId.value));
const selectedEpisode = computed(() => dataStore.episodes.find((episode) => episode.id === selectedEpisodeId.value));
const scenes = computed(() => dataStore.scenes.filter((scene) => scene.episodeId === selectedEpisodeId.value));
const selectedScene = computed(() => dataStore.scenes.find((scene) => scene.id === selectedSceneId.value));
const selectedSceneNumber = computed(() => {
  if (!selectedScene.value || !selectedEpisode.value) return null;
  const index = dataStore.scenes
    .filter((scene) => scene.episodeId === selectedEpisode.value?.id)
    .findIndex((scene) => scene.id === selectedScene.value?.id);
  return index >= 0 ? index + 1 : null;
});
const selectedChapterHeaderLabel = computed(() => {
  if (!selectedChapter.value) return '';
  return `${selectedChapter.value.number}章`;
});
const selectedEpisodeHeaderLabel = computed(() => {
  if (!selectedEpisode.value) return '';
  const chapterNumber = selectedChapter.value?.number;
  return chapterNumber ? `${chapterNumber}章 ${selectedEpisode.value.number}話` : `${selectedEpisode.value.number}話`;
});
const selectedSceneHeaderLabel = computed(() => {
  if (!selectedScene.value) return '';
  const chapterNumber = selectedChapter.value?.number;
  const episodeNumber = selectedEpisode.value?.number;
  const sceneNumber = selectedSceneNumber.value;
  const parts = [];
  if (chapterNumber) parts.push(`${chapterNumber}章`);
  if (episodeNumber) parts.push(`${episodeNumber}話`);
  if (sceneNumber) parts.push(`シーン${sceneNumber}`);
  return parts.join(' ');
});
const characters = computed(() => dataStore.characters.filter((character) => character.projectId === projectId));
const tags = computed(() => dataStore.tags.filter((tag) => tag.projectId === projectId && tag.status === 'active' && tag.type !== 'ジャンルタグ'));

const episodeSelectedCharacters = computed(() => characters.value.filter((character) => selectedEpisode.value?.characterIds?.includes(character.id)));
const episodeSelectedTags = computed(() => tags.value.filter((tag) => selectedEpisode.value?.tagIds?.includes(tag.id)));
const sceneSelectedCharacters = computed(() => characters.value.filter((character) => selectedScene.value?.characterIds?.includes(character.id)));

const episodeCharacterAddItems = computed<SelectionModalItem[]>(() => {
  return characters.value.map((character) => ({
    id: character.id,
    label: character.name || '名前未設定',
    meta: character.ruby,
    disabled: selectedEpisode.value?.characterIds?.includes(character.id) ?? false,
  }));
});

const episodeCharacterRemoveItems = computed<SelectionModalItem[]>(() => {
  return episodeSelectedCharacters.value.map((character) => ({
    id: character.id,
    label: character.name || '名前未設定',
    meta: character.ruby,
  }));
});

const episodeTagAddItems = computed<SelectionModalItem[]>(() => {
  return tags.value.map((tag) => ({
    id: tag.id,
    label: tag.name,
    category: tag.type,
    color: tag.color,
    disabled: selectedEpisode.value?.tagIds?.includes(tag.id) ?? false,
  }));
});

const episodeTagRemoveItems = computed<SelectionModalItem[]>(() => {
  return episodeSelectedTags.value.map((tag) => ({
    id: tag.id,
    label: tag.name,
    category: tag.type,
    color: tag.color,
  }));
});

const sceneCharacterAddItems = computed<SelectionModalItem[]>(() => {
  return characters.value.map((character) => ({
    id: character.id,
    label: character.name || '名前未設定',
    meta: character.ruby,
    disabled: selectedScene.value?.characterIds?.includes(character.id) ?? false,
  }));
});

const sceneCharacterRemoveItems = computed<SelectionModalItem[]>(() => {
  return sceneSelectedCharacters.value.map((character) => ({
    id: character.id,
    label: character.name || '名前未設定',
    meta: character.ruby,
  }));
});

watch(
  chapters,
  (items) => {
    if (selectedChapterId.value && !items.some((chapter) => chapter.id === selectedChapterId.value)) {
      selectedChapterId.value = items[0]?.id ?? '';
    }
  },
  { immediate: true }
);

watch(
  [selectedKind, selectedChapterId, selectedEpisodeId, selectedSceneId],
  ([kind, chapterId, episodeId, sceneId]) => {
    setProjectNavigatorSelection(projectId, { kind, chapterId, episodeId, sceneId });
  }
);

watch(
  () => transientStore.navigatorSelections[projectId],
  (selection) => {
    if (!selection) return;
    if (selection.kind === 'workPlot' && selectedKind.value !== 'workPlot') {
      selectWorkPlot();
      return;
    }
    if (selection.kind === 'chapter' && selection.chapterId && selection.chapterId !== selectedChapterId.value) {
      selectChapter(selection.chapterId);
      return;
    }
    if (selection.kind === 'episode' && selection.episodeId && selection.episodeId !== selectedEpisodeId.value) {
      selectEpisode(selection.episodeId);
      return;
    }
    if (selection.kind === 'scene' && selection.sceneId && selection.sceneId !== selectedSceneId.value) {
      selectScene(selection.sceneId);
    }
  },
  { deep: true, immediate: true }
);

watch(
  episodes,
  (items) => {
    if (selectedEpisodeId.value && !items.some((episode) => episode.id === selectedEpisodeId.value)) {
      selectedEpisodeId.value = '';
      if (selectedKind.value === 'episode') selectedKind.value = selectedChapterId.value ? 'chapter' : 'workPlot';
    }
  },
  { immediate: true }
);

watch(
  scenes,
  (items) => {
    if (selectedSceneId.value && !items.some((scene) => scene.id === selectedSceneId.value)) {
      selectedSceneId.value = '';
      if (selectedKind.value === 'scene') selectedKind.value = 'episode';
    }
  },
  { immediate: true }
);

function selectWorkPlot() {
  selectedKind.value = 'workPlot';
}

function selectChapter(chapterId: string) {
  selectedChapterId.value = chapterId;
  selectedKind.value = 'chapter';
  collapsedChapterIds.value = collapsedChapterIds.value.filter((id) => id !== chapterId);
}

function selectEpisode(episodeId: string) {
  const episode = dataStore.episodes.find((item) => item.id === episodeId);
  if (!episode) return;
  selectedChapterId.value = episode.chapterId ?? '';
  selectedEpisodeId.value = episodeId;
  selectedKind.value = 'episode';
  collapsedChapterIds.value = collapsedChapterIds.value.filter((id) => id !== selectedChapterId.value);
  collapsedEpisodeIds.value = collapsedEpisodeIds.value.filter((id) => id !== episodeId);
}

function selectScene(sceneId: string) {
  const scene = dataStore.scenes.find((item) => item.id === sceneId);
  if (!scene) return;
  const episode = dataStore.episodes.find((item) => item.id === scene.episodeId);
  if (episode) {
    selectedChapterId.value = episode.chapterId ?? '';
    selectedEpisodeId.value = episode.id;
  }
  selectedSceneId.value = sceneId;
  selectedKind.value = 'scene';
  if (selectedChapterId.value) collapsedChapterIds.value = collapsedChapterIds.value.filter((id) => id !== selectedChapterId.value);
  if (selectedEpisodeId.value) collapsedEpisodeIds.value = collapsedEpisodeIds.value.filter((id) => id !== selectedEpisodeId.value);
}

function addChapter() {
  const chapterNumber = chapters.value.length + 1;
  const chapter: Chapter = {
    id: createId(),
    projectId,
    number: chapterNumber,
    title: `第${chapterNumber}章`,
    purpose: '',
    flow: '',
    memo: '',
  };
  const episode: Episode = {
    id: createId(),
    projectId,
    chapterId: chapter.id,
    number: 1,
    title: '第1話',
    purpose: '',
    startSituation: '',
    mainEvent: '',
    revealInfo: '',
    hiddenInfo: '',
    foreshadowing: '',
    endingHook: '',
    characterIds: [],
    tagIds: [],
    memo: '',
  };
  const scene: Scene = {
    id: createId(),
    projectId,
    episodeId: episode.id,
    title: 'シーン1',
    location: '',
    time: '',
    event: '',
    conversationPurpose: '',
    conflict: '',
    result: '',
    nextHook: '',
    openingText: '',
    characterIds: [],
    tagIds: [],
    memo: '',
  };
  dataStore.chapters.push(chapter);
  dataStore.episodes.push(episode);
  dataStore.scenes.push(scene);
  selectedChapterId.value = chapter.id;
  selectedEpisodeId.value = episode.id;
  selectedSceneId.value = scene.id;
  selectedKind.value = 'chapter';
  collapsedChapterIds.value = collapsedChapterIds.value.filter((id) => id !== chapter.id);
  collapsedEpisodeIds.value = collapsedEpisodeIds.value.filter((id) => id !== episode.id);
}

function addEpisode() {
  if (!selectedChapter.value) return;
  const nextNumber = chapterEpisodes.value.length + 1;
  const episode: Episode = {
    id: createId(),
    projectId,
    chapterId: selectedChapter.value.id,
    number: nextNumber,
    title: `第${nextNumber}話`,
    purpose: '',
    startSituation: '',
    mainEvent: '',
    revealInfo: '',
    hiddenInfo: '',
    foreshadowing: '',
    endingHook: '',
    characterIds: [],
    tagIds: [],
    memo: '',
  };
  const scene: Scene = {
    id: createId(),
    projectId,
    episodeId: episode.id,
    title: 'シーン1',
    location: '',
    time: '',
    event: '',
    conversationPurpose: '',
    conflict: '',
    result: '',
    nextHook: '',
    openingText: '',
    characterIds: [],
    tagIds: [],
    memo: '',
  };
  dataStore.episodes.push(episode);
  dataStore.scenes.push(scene);
  selectedEpisodeId.value = episode.id;
  selectedSceneId.value = scene.id;
  selectedKind.value = 'episode';
  collapsedChapterIds.value = collapsedChapterIds.value.filter((id) => id !== selectedChapter.value?.id);
  collapsedEpisodeIds.value = collapsedEpisodeIds.value.filter((id) => id !== episode.id);
}

function addScene() {
  if (!selectedEpisode.value) return;
  const scene: Scene = {
    id: createId(),
    projectId,
    episodeId: selectedEpisode.value.id,
    title: `シーン${scenes.value.length + 1}`,
    location: '',
    time: '',
    event: '',
    conversationPurpose: '',
    conflict: '',
    result: '',
    nextHook: '',
    openingText: '',
    characterIds: [],
    tagIds: [],
    memo: '',
  };
  dataStore.scenes.push(scene);
  selectedSceneId.value = scene.id;
  selectedKind.value = 'scene';
  collapsedEpisodeIds.value = collapsedEpisodeIds.value.filter((id) => id !== selectedEpisode.value?.id);
}

function isChapterCollapsed(chapterId: string) {
  return collapsedChapterIds.value.includes(chapterId);
}

function isEpisodeCollapsed(episodeId: string) {
  return collapsedEpisodeIds.value.includes(episodeId);
}

function toggleChapterCollapse(chapterId: string) {
  collapsedChapterIds.value = isChapterCollapsed(chapterId)
    ? collapsedChapterIds.value.filter((id) => id !== chapterId)
    : [...collapsedChapterIds.value, chapterId];
}

function toggleEpisodeCollapse(episodeId: string) {
  collapsedEpisodeIds.value = isEpisodeCollapsed(episodeId)
    ? collapsedEpisodeIds.value.filter((id) => id !== episodeId)
    : [...collapsedEpisodeIds.value, episodeId];
}

function requestDeleteChapter(chapterId: string) {
  const chapter = dataStore.chapters.find((item) => item.id === chapterId);
  if (!chapter) return;
  deleteTarget.value = { kind: 'chapter', id: chapterId, label: chapter.title };
}

function requestDeleteEpisode(episodeId: string) {
  const episode = dataStore.episodes.find((item) => item.id === episodeId);
  if (!episode) return;
  deleteTarget.value = { kind: 'episode', id: episodeId, label: episode.title };
}

function requestDeleteScene(sceneId: string) {
  const scene = dataStore.scenes.find((item) => item.id === sceneId);
  if (!scene) return;
  deleteTarget.value = { kind: 'scene', id: sceneId, label: scene.title };
}

function confirmDeleteTarget() {
  if (!deleteTarget.value) return;
  const { kind, id } = deleteTarget.value;

  if (kind === 'scene') deleteScene(id);
  if (kind === 'episode') deleteEpisode(id);
  if (kind === 'chapter') deleteChapter(id);

  deleteTarget.value = null;
}

const workPlotMiddleText = computed({
  get() {
    if (!workPlot.value.middleEvents.length) return '';
    return workPlot.value.middleEvents
      .map((event) => event.content || event.title || '')
      .filter(Boolean)
      .join('\n\n');
  },
  set(value: string) {
    const normalized = value.trim();
    if (!normalized) {
      workPlot.value.middleEvents = [];
      return;
    }
    const firstEvent = workPlot.value.middleEvents[0];
    workPlot.value.middleEvents = [{
      id: firstEvent?.id || createId(),
      order: 1,
      title: '中盤',
      content: value,
      purpose: firstEvent?.purpose || '',
      change: firstEvent?.change || '',
      relatedCharacterIds: firstEvent?.relatedCharacterIds || [],
      relatedTermIds: firstEvent?.relatedTermIds || [],
      relatedTagIds: firstEvent?.relatedTagIds || [],
      memo: firstEvent?.memo || '',
    }];
  },
});

function toggleId(ids: string[] | undefined, id: string) {
  if (!ids) return [id];
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

function addEpisodeCharacter(item: SelectionModalItem) {
  if (!selectedEpisode.value) return;
  selectedEpisode.value.characterIds = toggleId(selectedEpisode.value.characterIds, item.id);
  episodeCharacterAddModalOpen.value = false;
}

function removeEpisodeCharacter(item: SelectionModalItem) {
  episodeCharacterDeleteTarget.value = item;
}

function confirmRemoveEpisodeCharacter() {
  if (!selectedEpisode.value || !episodeCharacterDeleteTarget.value) return;
  if (!selectedEpisode.value) return;
  selectedEpisode.value.characterIds = selectedEpisode.value.characterIds.filter((id) => id !== episodeCharacterDeleteTarget.value?.id);
  episodeCharacterRemoveModalOpen.value = false;
  episodeCharacterDeleteTarget.value = null;
}

function addEpisodeTag(item: SelectionModalItem) {
  if (!selectedEpisode.value) return;
  selectedEpisode.value.tagIds = toggleId(selectedEpisode.value.tagIds, item.id);
  episodeTagAddModalOpen.value = false;
}

function removeEpisodeTag(item: SelectionModalItem) {
  episodeTagDeleteTarget.value = item;
}

function confirmRemoveEpisodeTag() {
  if (!selectedEpisode.value || !episodeTagDeleteTarget.value) return;
  if (!selectedEpisode.value) return;
  selectedEpisode.value.tagIds = selectedEpisode.value.tagIds.filter((id) => id !== episodeTagDeleteTarget.value?.id);
  episodeTagRemoveModalOpen.value = false;
  episodeTagDeleteTarget.value = null;
}

function addSceneCharacter(item: SelectionModalItem) {
  if (!selectedScene.value) return;
  selectedScene.value.characterIds = toggleId(selectedScene.value.characterIds, item.id);
  sceneCharacterAddModalOpen.value = false;
}

function removeSceneCharacter(item: SelectionModalItem) {
  sceneCharacterDeleteTarget.value = item;
}

function confirmRemoveSceneCharacter() {
  if (!selectedScene.value || !sceneCharacterDeleteTarget.value) return;
  if (!selectedScene.value) return;
  selectedScene.value.characterIds = selectedScene.value.characterIds.filter((id) => id !== sceneCharacterDeleteTarget.value?.id);
  sceneCharacterRemoveModalOpen.value = false;
  sceneCharacterDeleteTarget.value = null;
}
</script>

<template>
  <AppHeader :project-id="projectId" title="プロット" />
  <main class="page split-page plot-page-layout" :class="{ 'sidebar-collapsed': leftSidebarCollapsed }">
    <section class="card plot-sidebar-shell" :class="{ open: !leftSidebarCollapsed }">
      <div v-if="leftSidebarCollapsed" class="sidebar-rail">
        <button
          type="button"
          class="sidebar-rail-button"
          @click="leftSidebarCollapsed = false"
          title="展開"
        >
          ☰
        </button>
        <div class="sidebar-compact-tree">
          <button
            type="button"
            class="sidebar-compact-item work"
            :class="{ active: selectedKind === 'workPlot' }"
            @click="selectWorkPlot"
            title="作品全体プロット"
          >
            <span class="sidebar-compact-icon">🗂</span>
          </button>
          <template v-for="chapter in chapters" :key="chapter.id">
            <button
              type="button"
              class="sidebar-compact-item"
              :class="{ active: selectedKind === 'chapter' && chapter.id === selectedChapterId }"
              @click="selectChapter(chapter.id)"
              :title="`第${chapter.number}章`"
            >
              <span class="sidebar-compact-icon">📁</span>
              <span class="sidebar-compact-badge">{{ chapter.number }}</span>
            </button>
            <template v-if="!isChapterCollapsed(chapter.id)">
              <template v-for="episode in episodes.filter((item) => item.chapterId === chapter.id)" :key="episode.id">
                <button
                  type="button"
                  class="sidebar-compact-item episode"
                  :class="{ active: selectedKind === 'episode' && episode.id === selectedEpisodeId }"
                  @click="selectEpisode(episode.id)"
                  :title="`第${episode.number}話`"
                >
                  <span class="sidebar-compact-icon">📄</span>
                  <span class="sidebar-compact-badge">{{ episode.number }}</span>
                </button>
                <template v-if="!isEpisodeCollapsed(episode.id)">
                  <button
                    v-for="(scene, sceneIndex) in dataStore.scenes.filter((item) => item.episodeId === episode.id)"
                    :key="scene.id"
                    type="button"
                    class="sidebar-compact-item scene"
                    :class="{ active: selectedKind === 'scene' && scene.id === selectedSceneId }"
                    @click="selectScene(scene.id)"
                    :title="`シーン${sceneIndex + 1}`"
                  >
                    {{ sceneIndex + 1 }}
                  </button>
                </template>
              </template>
            </template>
          </template>
        </div>
      </div>
      <section v-else class="side-list fixed-side-list plot-sidebar-panel">
        <div class="sidebar-panel-header">
          <button
            type="button"
            class="sidebar-panel-close"
            @click="leftSidebarCollapsed = true"
            title="最小化"
          >
            ☰
          </button>
          <div class="sidebar-panel-mode-buttons">
            <button
              type="button"
              class="sidebar-rail-button"
              @click="addChapter"
              title="章追加"
            >
              ＋章
            </button>
          </div>
        </div>
        <div class="scroll-list plot-tree" data-tree-root="plot">
        <section class="plot-tree-group" data-tree-level="work">
          <div
            class="plot-tree-item work-plot-item"
            :class="{ active: selectedKind === 'workPlot' }"
            role="button"
            tabindex="0"
            @click="selectWorkPlot"
            @keydown.enter.prevent="selectWorkPlot"
            @keydown.space.prevent="selectWorkPlot"
          >
            <span class="plot-tree-label">作品全体プロット</span>
          </div>
        </section>

        <section
          v-for="chapter in chapters"
          :key="chapter.id"
          class="plot-tree-group"
          data-tree-level="chapter"
          :data-tree-id="chapter.id"
        >
          <div class="plot-tree-item chapter-item" :class="{ active: selectedKind === 'chapter' && chapter.id === selectedChapterId }">
            <div class="plot-tree-label-button" role="button" tabindex="0" @click="selectChapter(chapter.id)" @keydown.enter.prevent="selectChapter(chapter.id)" @keydown.space.prevent="selectChapter(chapter.id)">
              <div class="plot-tree-top-line">
                <span class="plot-tree-left-head">
                  <span class="plot-tree-toggle-text" @click.stop="toggleChapterCollapse(chapter.id)">{{ isChapterCollapsed(chapter.id) ? '▶' : '▼' }}</span>
                  <span class="plot-tree-icon">📁</span>
                  <span class="plot-tree-number-line">第{{ chapter.number }}章</span>
                </span>
              </div>
              <span class="plot-tree-title-line">{{ chapter.title }}</span>
            </div>
          </div>

          <div v-if="!isChapterCollapsed(chapter.id)" class="plot-tree-children chapter-children" data-tree-dropzone="chapter">
            <section
              v-for="episode in episodes.filter((item) => item.chapterId === chapter.id)"
              :key="episode.id"
              class="plot-tree-group"
              data-tree-level="episode"
              :data-tree-id="episode.id"
            >
              <div class="plot-tree-item episode-item" :class="{ active: selectedKind === 'episode' && episode.id === selectedEpisodeId }">
                <div class="plot-tree-label-button" role="button" tabindex="0" @click="selectEpisode(episode.id)" @keydown.enter.prevent="selectEpisode(episode.id)" @keydown.space.prevent="selectEpisode(episode.id)">
                  <div class="plot-tree-top-line">
                    <span class="plot-tree-left-head">
                      <span class="plot-tree-toggle-text" @click.stop="toggleEpisodeCollapse(episode.id)">{{ isEpisodeCollapsed(episode.id) ? '▶' : '▼' }}</span>
                      <span class="plot-tree-icon">📄</span>
                      <span class="plot-tree-number-line">第{{ episode.number }}話</span>
                    </span>
                  </div>
                  <span class="plot-tree-title-line">{{ episode.title }}</span>
                </div>
              </div>

              <div v-if="!isEpisodeCollapsed(episode.id)" class="plot-tree-children episode-children" data-tree-dropzone="episode">
                <div
                  v-for="scene in dataStore.scenes.filter((item) => item.episodeId === episode.id)"
                  :key="scene.id"
                  class="plot-tree-item scene-item"
                  :class="{ active: selectedKind === 'scene' && scene.id === selectedSceneId }"
                  data-tree-level="scene"
                  :data-tree-id="scene.id"
                >
                  <span class="plot-tree-icon">📃</span>
                  <button type="button" class="plot-tree-scene-button" @click="selectScene(scene.id)">
                    <span class="plot-tree-scene-title">{{ scene.title }}</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </section>
        </div>
      </section>
    </section>

    <section v-if="selectedKind === 'workPlot'" class="card editor-card fixed-editor-card line-form-card plot-form-card">
      <div class="editor-sticky-header">
        <section class="name-display-row compact-name-row">
          <div class="field-label-value">
            <div class="name-label-line">
              <strong class="section-label">作品全体プロット</strong>
            </div>
          </div>
        </section>
      </div>
      <div class="editor-scroll-body plot-form-scroll">
        <TextField label="テーマ" v-model="workPlot.theme" />
        <TextField label="物語の始まり" type="textarea" v-model="workPlot.beginning" />
        <TextField label="中盤" type="textarea" v-model="workPlotMiddleText" />
        <TextField label="クライマックス" type="textarea" v-model="workPlot.climax" />
        <TextField label="結末" type="textarea" v-model="workPlot.ending" />
        <TextField label="主人公の最初の状態" type="textarea" v-model="workPlot.protagonistStart" />
        <TextField label="主人公の最終状態" type="textarea" v-model="workPlot.protagonistEnd" />
        <TextField label="メインの謎" type="textarea" v-model="workPlot.mainMystery" />
        <TextField label="最終的に明かす真実" type="textarea" v-model="workPlot.finalTruth" />
        <TextField label="主要な伏線" type="textarea" v-model="workPlot.foreshadowing" />
        <TextField label="メモ" type="textarea" v-model="workPlot.memo" />
      </div>
    </section>

    <section v-else-if="selectedKind === 'chapter' && selectedChapter" class="card editor-card fixed-editor-card line-form-card plot-form-card">
      <div class="editor-sticky-header">
        <section class="name-display-row compact-name-row">
          <div class="field-label-value">
            <div class="name-label-line">
              <strong class="section-label">{{ selectedChapterHeaderLabel }}</strong>
            </div>
          </div>
          <div class="button-row">
            <button type="button" class="secondary" @click="addChapter()">次の章</button>
            <button type="button" class="danger" @click="requestDeleteChapter(selectedChapter.id)">章削除</button>
          </div>
        </section>
      </div>
      <div class="editor-scroll-body plot-form-scroll">
        <TextField label="章タイトル" v-model="selectedChapter.title" />
        <label class="field"><span>第何章</span><input type="number" v-model.number="selectedChapter.number" /></label>
        <TextField label="章の目的" type="textarea" v-model="selectedChapter.purpose" />
        <TextField label="章の流れ" type="textarea" v-model="selectedChapter.flow" />
        <TextField label="メモ" type="textarea" v-model="selectedChapter.memo" />
      </div>
    </section>

    <section v-else-if="selectedKind === 'episode' && selectedEpisode" class="card editor-card fixed-editor-card line-form-card plot-form-card">
      <div class="editor-sticky-header">
        <section class="name-display-row compact-name-row">
          <div class="field-label-value">
            <div class="name-label-line">
              <strong class="section-label">{{ selectedEpisodeHeaderLabel }}</strong>
            </div>
          </div>
          <div class="button-row">
            <button type="button" class="secondary" @click="addEpisode()">次の話</button>
            <button type="button" class="danger" @click="requestDeleteEpisode(selectedEpisode.id)">話削除</button>
          </div>
        </section>
      </div>
      <div class="editor-scroll-body plot-form-scroll">
        <TextField label="タイトル" v-model="selectedEpisode.title" />
        <label class="field"><span>第何話</span><input type="number" v-model.number="selectedEpisode.number" /></label>
        <section class="inline-panel">
          <div class="panel-heading">
            <h3>この話の登場人物</h3>
            <div class="button-row">
              <button type="button" class="secondary" @click="episodeCharacterAddModalOpen = true">＋ 人物追加</button>
              <button type="button" class="secondary" :disabled="!episodeSelectedCharacters.length" @click="episodeCharacterRemoveModalOpen = true">人物削除</button>
            </div>
          </div>
          <div v-if="episodeSelectedCharacters.length" class="chip-grid">
            <span v-for="character in episodeSelectedCharacters" :key="character.id" class="selected-chip">{{ character.name }}</span>
          </div>
          <p v-else class="hint-text">未設定</p>
        </section>
        <section class="inline-panel">
          <div class="panel-heading">
            <h3>関連タグ</h3>
            <div class="button-row">
              <button type="button" class="secondary" @click="episodeTagAddModalOpen = true">＋ タグ追加</button>
              <button type="button" class="secondary" :disabled="!episodeSelectedTags.length" @click="episodeTagRemoveModalOpen = true">タグ削除</button>
            </div>
          </div>
          <div v-if="episodeSelectedTags.length" class="chip-grid">
            <span v-for="tag in episodeSelectedTags" :key="tag.id" class="selected-chip"><span class="tag-swatch" :style="{ backgroundColor: tag.color }"></span>{{ tag.name }}</span>
          </div>
          <p v-else class="hint-text">未設定</p>
        </section>
        <TextField label="この話の目的" type="textarea" v-model="selectedEpisode.purpose" />
        <TextField label="開始状況" type="textarea" v-model="selectedEpisode.startSituation" />
        <TextField label="起きる事件" type="textarea" v-model="selectedEpisode.mainEvent" />
        <TextField label="明かす情報" type="textarea" v-model="selectedEpisode.revealInfo" />
        <TextField label="隠す情報" type="textarea" v-model="selectedEpisode.hiddenInfo" />
        <TextField label="伏線" type="textarea" v-model="selectedEpisode.foreshadowing" />
        <TextField label="ラストの引き" type="textarea" v-model="selectedEpisode.endingHook" />
        <TextField label="本文メモ" type="textarea" v-model="selectedEpisode.memo" />
      </div>
    </section>

    <section v-else-if="selectedKind === 'scene' && selectedScene" class="card editor-card fixed-editor-card line-form-card plot-form-card">
      <div class="editor-sticky-header">
        <section class="name-display-row compact-name-row">
          <div class="field-label-value">
            <div class="name-label-line">
              <strong class="section-label">{{ selectedSceneHeaderLabel }}</strong>
            </div>
          </div>
          <div class="button-row">
            <button type="button" class="secondary" @click="addScene()">＋シーン</button>
            <button type="button" class="danger" @click="requestDeleteScene(selectedScene.id)">シーン削除</button>
          </div>
        </section>
      </div>
      <div class="editor-scroll-body plot-form-scroll">
        <TextField label="シーンタイトル" v-model="selectedScene.title" />
        <TextField label="場所" v-model="selectedScene.location" />
        <TextField label="時間" v-model="selectedScene.time" />
        <section class="inline-panel">
          <div class="panel-heading">
            <h3>シーンの登場人物1</h3>
            <div class="button-row">
              <button type="button" class="secondary" @click="sceneCharacterAddModalOpen = true">＋ 人物追加</button>
              <button type="button" class="secondary" :disabled="!selectedScene.characterIds.length" @click="sceneCharacterRemoveModalOpen = true">人物削除</button>
            </div>
          </div>
          <div v-if="sceneSelectedCharacters.length" class="chip-grid">
            <span v-for="character in sceneSelectedCharacters" :key="character.id" class="selected-chip">{{ character.name }}</span>
          </div>
          <p v-else class="hint-text">未設定</p>
        </section>
        <TextField label="起きること" type="textarea" v-model="selectedScene.event" />
        <TextField label="会話の目的" type="textarea" v-model="selectedScene.conversationPurpose" />
        <TextField label="衝突" type="textarea" v-model="selectedScene.conflict" />
        <TextField label="結果" type="textarea" v-model="selectedScene.result" />
        <TextField label="次への繋ぎ" type="textarea" v-model="selectedScene.nextHook" />
        <TextField label="書き出し" type="textarea" v-model="selectedScene.openingText" />
        <TextField label="メモ" type="textarea" v-model="selectedScene.memo" />
      </div>
    </section>

    <section v-else class="card empty-state">プロット項目を選択してください。</section>

    <SelectionModal
      :open="episodeCharacterAddModalOpen"
      title="話プロットの登場人物"
      :items="episodeCharacterAddItems"
      :selected-id="''"
      empty-text="追加できる人物がありません。"
      @close="episodeCharacterAddModalOpen = false"
      @select="addEpisodeCharacter"
    />
    <SelectionModal
      :open="episodeCharacterRemoveModalOpen"
      title="削除する登場人物"
      :items="episodeCharacterRemoveItems"
      :selected-id="''"
      empty-text="削除できる人物がありません。"
      @close="episodeCharacterRemoveModalOpen = false"
      @select="removeEpisodeCharacter"
    />
    <SelectionModal
      :open="episodeTagAddModalOpen"
      title="関連タグ"
      :items="episodeTagAddItems"
      layout="grid"
      :selected-id="''"
      empty-text="追加できるタグがありません。"
      @close="episodeTagAddModalOpen = false"
      @select="addEpisodeTag"
    />
    <SelectionModal
      :open="episodeTagRemoveModalOpen"
      title="削除する関連タグ"
      :items="episodeTagRemoveItems"
      layout="grid"
      :selected-id="''"
      empty-text="削除できるタグがありません。"
      @close="episodeTagRemoveModalOpen = false"
      @select="removeEpisodeTag"
    />
    <SelectionModal
      :open="sceneCharacterAddModalOpen"
      title="シーンの登場人物"
      :items="sceneCharacterAddItems"
      :selected-id="''"
      empty-text="追加できる人物がありません。"
      @close="sceneCharacterAddModalOpen = false"
      @select="addSceneCharacter"
    />
    <SelectionModal
      :open="sceneCharacterRemoveModalOpen"
      title="削除するシーン登場人物"
      :items="sceneCharacterRemoveItems"
      :selected-id="''"
      empty-text="削除できる人物がありません。"
      @close="sceneCharacterRemoveModalOpen = false"
      @select="removeSceneCharacter"
    />
    <ConfirmModal
      :open="Boolean(deleteTarget)"
      title="プロット項目を削除"
      :message="deleteTarget ? `${deleteTarget.label || 'この項目'}を削除します。配下の項目も削除されます。` : ''"
      confirm-label="削除"
      @close="deleteTarget = null"
      @confirm="confirmDeleteTarget"
    />
    <ConfirmModal
      :open="Boolean(episodeCharacterDeleteTarget)"
      title="登場人物を削除"
      :message="`「${episodeCharacterDeleteTarget?.label || ''}」をこの話の登場人物から外します。`"
      confirm-label="人物を削除"
      @close="episodeCharacterDeleteTarget = null"
      @confirm="confirmRemoveEpisodeCharacter"
    />
    <ConfirmModal
      :open="Boolean(episodeTagDeleteTarget)"
      title="関連タグを削除"
      :message="`「${episodeTagDeleteTarget?.label || ''}」をこの話の関連タグから外します。`"
      confirm-label="タグを削除"
      @close="episodeTagDeleteTarget = null"
      @confirm="confirmRemoveEpisodeTag"
    />
    <ConfirmModal
      :open="Boolean(sceneCharacterDeleteTarget)"
      title="登場人物を削除"
      :message="`「${sceneCharacterDeleteTarget?.label || ''}」をこのシーンの登場人物から外します。`"
      confirm-label="人物を削除"
      @close="sceneCharacterDeleteTarget = null"
      @confirm="confirmRemoveSceneCharacter"
    />
  </main>
</template>
