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
import type { Chapter, Episode, MiddleEvent, Scene } from '../types/models';

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

const episodeCharacterAddModalOpen = ref(false);
const episodeCharacterRemoveModalOpen = ref(false);
const episodeTagAddModalOpen = ref(false);
const episodeTagRemoveModalOpen = ref(false);
const sceneCharacterAddModalOpen = ref(false);
const sceneCharacterRemoveModalOpen = ref(false);
const deleteTarget = ref<{ kind: 'chapter' | 'episode' | 'scene'; id: string; label: string } | null>(null);
getProjectNavigatorSelection(projectId);

const workPlot = computed(() => getWorkPlot(projectId) ?? initialWorkPlot);
const chapters = computed(() => dataStore.chapters.filter((chapter) => chapter.projectId === projectId).sort((a, b) => a.number - b.number));
const selectedChapter = computed(() => dataStore.chapters.find((chapter) => chapter.id === selectedChapterId.value));
const episodes = computed(() => dataStore.episodes.filter((episode) => episode.projectId === projectId).sort((a, b) => a.number - b.number));
const chapterEpisodes = computed(() => episodes.value.filter((episode) => episode.chapterId === selectedChapterId.value));
const selectedEpisode = computed(() => dataStore.episodes.find((episode) => episode.id === selectedEpisodeId.value));
const scenes = computed(() => dataStore.scenes.filter((scene) => scene.episodeId === selectedEpisodeId.value));
const selectedScene = computed(() => dataStore.scenes.find((scene) => scene.id === selectedSceneId.value));
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
  const chapter: Chapter = {
    id: createId(),
    projectId,
    number: chapters.value.length + 1,
    title: `第${chapters.value.length + 1}章`,
    purpose: '',
    flow: '',
    memo: '',
  };
  dataStore.chapters.push(chapter);
  selectedChapterId.value = chapter.id;
  selectedEpisodeId.value = '';
  selectedSceneId.value = '';
  selectedKind.value = 'chapter';
  collapsedChapterIds.value = collapsedChapterIds.value.filter((id) => id !== chapter.id);
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
  dataStore.episodes.push(episode);
  selectedEpisodeId.value = episode.id;
  selectedSceneId.value = '';
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

function addMiddleEvent() {
  const middleEvent: MiddleEvent = {
    id: createId(),
    order: workPlot.value.middleEvents.length + 1,
    title: `中盤イベント${workPlot.value.middleEvents.length + 1}`,
    content: '',
    purpose: '',
    change: '',
    relatedCharacterIds: [],
    relatedTermIds: [],
    relatedTagIds: [],
    memo: '',
  };
  workPlot.value.middleEvents.push(middleEvent);
}

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
  if (!selectedEpisode.value) return;
  selectedEpisode.value.characterIds = selectedEpisode.value.characterIds.filter((id) => id !== item.id);
  episodeCharacterRemoveModalOpen.value = false;
}

function addEpisodeTag(item: SelectionModalItem) {
  if (!selectedEpisode.value) return;
  selectedEpisode.value.tagIds = toggleId(selectedEpisode.value.tagIds, item.id);
  episodeTagAddModalOpen.value = false;
}

function removeEpisodeTag(item: SelectionModalItem) {
  if (!selectedEpisode.value) return;
  selectedEpisode.value.tagIds = selectedEpisode.value.tagIds.filter((id) => id !== item.id);
  episodeTagRemoveModalOpen.value = false;
}

function addSceneCharacter(item: SelectionModalItem) {
  if (!selectedScene.value) return;
  selectedScene.value.characterIds = toggleId(selectedScene.value.characterIds, item.id);
  sceneCharacterAddModalOpen.value = false;
}

function removeSceneCharacter(item: SelectionModalItem) {
  if (!selectedScene.value) return;
  selectedScene.value.characterIds = selectedScene.value.characterIds.filter((id) => id !== item.id);
  sceneCharacterRemoveModalOpen.value = false;
}
</script>

<template>
  <AppHeader :project-id="projectId" title="プロット" />
  <main class="page split-page">
    <section class="card side-list fixed-side-list">
      
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
            <span class="plot-tree-spacer"></span>
            <span class="plot-tree-icon">🗂</span>
            <span class="plot-tree-label">作品全体プロット</span>
          </div>
        </section>
        <div class="term-side-toolbar">
          <button type="button" @click="addChapter">＋ 章追加</button>
        </div>

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
                <button type="button" class="secondary plot-inline-action" @click.stop="selectChapter(chapter.id); addEpisode()">＋話</button>
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
                    <button type="button" class="secondary plot-inline-action" @click.stop="selectEpisode(episode.id); addScene()">＋シーン</button>
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
                  <span class="plot-tree-spacer"></span>
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

    <section v-if="selectedKind === 'workPlot'" class="card editor-card line-form-card">
      <TextField label="テーマ" v-model="workPlot.theme" />
      <TextField label="物語の始まり" type="textarea" v-model="workPlot.beginning" />
      <section class="inline-panel">
        <div class="panel-heading">
          <h3>中盤イベント</h3>
          <button type="button" class="secondary" @click="addMiddleEvent">＋ 中盤イベント追加</button>
        </div>
        <div v-if="workPlot.middleEvents.length" class="list">
          <section v-for="event in workPlot.middleEvents" :key="event.id" class="inline-panel middle-event-panel">
            <TextField label="タイトル" v-model="event.title" />
            <TextField label="内容" type="textarea" v-model="event.content" />
            <TextField label="目的" type="textarea" v-model="event.purpose" />
            <TextField label="起きる変化" type="textarea" v-model="event.change" />
            <TextField label="メモ" type="textarea" v-model="event.memo" />
          </section>
        </div>
        <p v-else class="hint-text">中盤イベントを追加してください。</p>
      </section>
      <TextField label="クライマックス" type="textarea" v-model="workPlot.climax" />
      <TextField label="結末" type="textarea" v-model="workPlot.ending" />
      <TextField label="主人公の最初の状態" type="textarea" v-model="workPlot.protagonistStart" />
      <TextField label="主人公の最終状態" type="textarea" v-model="workPlot.protagonistEnd" />
      <TextField label="メインの謎" type="textarea" v-model="workPlot.mainMystery" />
      <TextField label="最終的に明かす真実" type="textarea" v-model="workPlot.finalTruth" />
      <TextField label="主要な伏線" type="textarea" v-model="workPlot.foreshadowing" />
      <TextField label="メモ" type="textarea" v-model="workPlot.memo" />
    </section>

    <section v-else-if="selectedKind === 'chapter' && selectedChapter" class="card editor-card line-form-card">
      <div class="button-row">
        <button type="button" class="danger" @click="requestDeleteChapter(selectedChapter.id)">章削除</button>
      </div>
      <TextField label="章タイトル" v-model="selectedChapter.title" />
      <label class="field"><span>第何章</span><input type="number" v-model.number="selectedChapter.number" /></label>
      <TextField label="章の目的" type="textarea" v-model="selectedChapter.purpose" />
      <TextField label="章の流れ" type="textarea" v-model="selectedChapter.flow" />
      <TextField label="メモ" type="textarea" v-model="selectedChapter.memo" />
    </section>

    <section v-else-if="selectedKind === 'episode' && selectedEpisode" class="card editor-card line-form-card">
      <div class="button-row">
        <button type="button" class="danger" @click="requestDeleteEpisode(selectedEpisode.id)">話削除</button>
      </div>
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
    </section>

    <section v-else-if="selectedKind === 'scene' && selectedScene" class="card editor-card line-form-card">
      <div class="button-row">
        <button type="button" class="danger" @click="requestDeleteScene(selectedScene.id)">シーン削除</button>
      </div>
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
  </main>
</template>
