<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import TextField from '../components/TextField.vue';
import { dataStore, downloadBlob, ensureEpisodeChapters, getProjectNavigatorSelection, setProjectNavigatorSelection, transientStore } from '../store/data';
import { createId, nowIso } from '../utils/id';
import type { BodyDraft, Chapter, Episode, LineMemo, MemoType, Scene } from '../types/models';

type EditorSelectionKind = 'chapter' | 'episode' | 'scene';

const projectId = useRoute().params.projectId as string;
const route = useRoute();
const initialInfoPanelPosition = (localStorage.getItem('editor-info-panel-position') as 'bottom' | 'left') ?? 'bottom';

ensureEpisodeChapters(projectId);

const selectedKind = ref<EditorSelectionKind>('scene');
const selectedChapterId = ref('');
const selectedEpisodeId = ref('');
const selectedSceneId = ref('');
const collapsedChapterIds = ref<string[]>([]);
const collapsedEpisodeIds = ref<string[]>([]);
const bodyTextareaRef = ref<HTMLTextAreaElement | null>(null);
const lineViewRef = ref<HTMLDivElement | null>(null);
const newMemoLine = ref(1);
const newMemoType = ref<MemoType>('revision');
const newMemoContent = ref('');
const leftSidebarCollapsed = ref(false);
const editorPanelCollapsed = ref(false);
const editorTab = ref<'info' | 'memo' | 'export' | 'settings'>(initialInfoPanelPosition === 'left' ? 'memo' : 'info');
const infoTab = ref<'chapter' | 'episode' | 'scene'>('episode');
const infoPanelPosition = ref<'bottom' | 'left'>(initialInfoPanelPosition);
const memoPopover = ref<{ memo: LineMemo; top: number } | null>(null);
const memoPopoverPinned = ref(false);
const visualLineCounts = ref<number[]>([]);
const editorFontFamily = ref(localStorage.getItem('editor-font-family') ?? "'Yu Gothic', 'Hiragino Sans', monospace");
const editorFontSize = ref(Number(localStorage.getItem('editor-font-size') ?? '28'));
getProjectNavigatorSelection(projectId);

const fontFamilyOptions = [
  { label: '游ゴシック', value: "'Yu Gothic', 'Hiragino Sans', monospace" },
  { label: 'メイリオ', value: "Meiryo, 'Hiragino Sans', sans-serif" },
  { label: 'ゴシック体', value: "'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif" },
  { label: '明朝体', value: "'Yu Mincho', 'Hiragino Mincho ProN', serif" },
  { label: '等幅', value: "ui-monospace, SFMono-Regular, Consolas, monospace" },
] as const;
const fontSizeOptions = [20, 24, 28, 32, 36];
const editorTextStyle = computed(() => ({
  fontFamily: editorFontFamily.value,
  fontSize: `${editorFontSize.value}px`,
}));
const editorLineNumberStyle = computed(() => ({
  fontSize: `${Math.max(18, editorFontSize.value - 4)}px`,
}));
const showSideInfoPanel = computed(() => selectedKind.value === 'scene' && infoPanelPosition.value === 'left');

const chapters = computed(() => dataStore.chapters.filter((chapter) => chapter.projectId === projectId).sort((a, b) => a.number - b.number));
const episodes = computed(() => dataStore.episodes.filter((episode) => episode.projectId === projectId).sort((a, b) => a.number - b.number));
const scenes = computed(() => dataStore.scenes.filter((scene) => scene.projectId === projectId));
const bodyDrafts = computed(() => dataStore.bodyDrafts.filter((draft) => draft.projectId === projectId));
const characters = computed(() => dataStore.characters.filter((character) => character.projectId === projectId));
const tags = computed(() => dataStore.tags.filter((tag) => tag.projectId === projectId));

const selectedChapter = computed(() => chapters.value.find((chapter) => chapter.id === selectedChapterId.value));
const selectedEpisode = computed(() => episodes.value.find((episode) => episode.id === selectedEpisodeId.value));
const selectedScene = computed(() => scenes.value.find((scene) => scene.id === selectedSceneId.value));
const episodeScenes = computed(() => scenes.value.filter((scene) => scene.episodeId === selectedEpisodeId.value));
const selectedChapterEpisodes = computed(() =>
  episodes.value
    .filter((episode) => episode.chapterId === selectedChapterId.value)
    .sort((a, b) => a.number - b.number),
);
const selectedChapterScenes = computed(() =>
  selectedChapterEpisodes.value.flatMap((episode) =>
    scenes.value.filter((scene) => scene.episodeId === episode.id),
  ),
);

const selectedSceneBody = computed(() => {
  if (!selectedScene.value) return undefined;
  return bodyDrafts.value.find((draft) => draft.sceneId === selectedScene.value?.id);
});

const selectedEpisodeBody = computed(() => {
  if (!selectedEpisode.value) return undefined;
  return bodyDrafts.value.find((draft) => draft.episodeId === selectedEpisode.value?.id && !draft.sceneId);
});

const displayedContent = computed(() => {
  if (selectedKind.value === 'scene') return selectedSceneBody.value?.content ?? '';
  if (selectedKind.value === 'chapter') {
    const chapterSceneContents = selectedChapterScenes.value
      .map((scene) => bodyDrafts.value.find((draft) => draft.sceneId === scene.id)?.content?.trim() ?? '')
      .filter(Boolean);
    return chapterSceneContents.join('\n\n');
  }
  if (!selectedEpisode.value) return '';

  const sceneContents = episodeScenes.value
    .map((scene) => bodyDrafts.value.find((draft) => draft.sceneId === scene.id)?.content?.trim() ?? '')
    .filter(Boolean);

  if (sceneContents.length) return sceneContents.join('\n\n');
  return selectedEpisodeBody.value?.content ?? '';
});

const displayedLines = computed(() => displayedContent.value.split('\n'));
const charCount = computed(() => displayedContent.value.length);
const blankLineCount = computed(() => displayedLines.value.filter((line) => !line.trim()).length);
const dialogueCount = computed(() => displayedLines.value.filter((line) => line.trim().startsWith('「')).length);
const currentBody = computed(() => (selectedKind.value === 'scene' ? selectedSceneBody.value : selectedEpisodeBody.value));
const memos = computed(() => {
  if (selectedKind.value !== 'scene' || !currentBody.value) return [];
  return dataStore.lineMemos.filter((memo) => memo.projectId === projectId && memo.bodyId === currentBody.value?.id);
});
const selectedTargetLabel = computed(() => {
  if (selectedKind.value === 'chapter' && selectedChapter.value) {
    return `第${selectedChapter.value.number}章 ${selectedChapter.value.title}`.trim();
  }
  if (selectedKind.value === 'scene' && selectedScene.value && selectedEpisode.value) {
    return `第${selectedEpisode.value.number}話 / ${selectedScene.value.title}`;
  }
  if (selectedEpisode.value) {
    return `第${selectedEpisode.value.number}話 ${selectedEpisode.value.title}`.trim();
  }
  return '未選択';
});
const selectedModeLabel = computed(() => {
  if (selectedKind.value === 'chapter') return '章本文（配下結合表示）';
  return selectedKind.value === 'scene' ? 'シーン本文' : '話本文（シーン結合表示）';
});
const characterNameMap = computed(() => new Map(characters.value.map((character) => [character.id, character.name])));
const tagNameMap = computed(() => new Map(tags.value.map((tag) => [tag.id, tag.name])));
const selectedEpisodeCharacterNames = computed(() =>
  (selectedEpisode.value?.characterIds ?? []).map((id) => characterNameMap.value.get(id)).filter((name): name is string => Boolean(name))
);
const selectedEpisodeTagNames = computed(() =>
  (selectedEpisode.value?.tagIds ?? []).map((id) => tagNameMap.value.get(id)).filter((name): name is string => Boolean(name))
);
const selectedSceneCharacterNames = computed(() =>
  (selectedScene.value?.characterIds ?? []).map((id) => characterNameMap.value.get(id)).filter((name): name is string => Boolean(name))
);
const selectedSceneTagNames = computed(() =>
  (selectedScene.value?.tagIds ?? []).map((id) => tagNameMap.value.get(id)).filter((name): name is string => Boolean(name))
);
const hasText = (value?: string | null) => Boolean(value?.trim());
const hasItems = (items?: string[]) => Boolean(items?.length);

function syncLineViewScroll() {
  if (!bodyTextareaRef.value || !lineViewRef.value) return;
  lineViewRef.value.scrollTop = bodyTextareaRef.value.scrollTop;
}

function measureWrappedLineCounts() {
  const textarea = bodyTextareaRef.value;
  if (!textarea) {
    visualLineCounts.value = displayedLines.value.map(() => 1);
    return;
  }

  const style = window.getComputedStyle(textarea);
  const font = [
    style.fontStyle,
    style.fontVariant,
    style.fontWeight,
    style.fontSize,
    style.fontFamily,
  ].join(' ');
  const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(style.paddingRight) || 0;
  const availableWidth = Math.max(1, textarea.clientWidth - paddingLeft - paddingRight);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    visualLineCounts.value = displayedLines.value.map(() => 1);
    return;
  }
  context.font = font;

  visualLineCounts.value = displayedLines.value.map((line) => {
    if (!line) return 1;
    let rowCount = 1;
    let currentWidth = 0;
    for (const char of Array.from(line)) {
      const charWidth = context.measureText(char).width;
      if (currentWidth + charWidth > availableWidth) {
        rowCount += 1;
        currentWidth = charWidth;
      } else {
        currentWidth += charWidth;
      }
    }
    return Math.max(1, rowCount);
  });
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

function selectChapter(chapterId: string) {
  selectedKind.value = 'chapter';
  selectedChapterId.value = chapterId;
  selectedEpisodeId.value = '';
  selectedSceneId.value = '';
  collapsedChapterIds.value = collapsedChapterIds.value.filter((id) => id !== chapterId);
  clearMemoPopover();
  editorPanelCollapsed.value = false;
  editorTab.value = 'info';
  infoTab.value = 'chapter';
}

function selectEpisode(episodeId: string) {
  const episode = episodes.value.find((item) => item.id === episodeId);
  if (!episode) return;
  selectedKind.value = 'episode';
  selectedEpisodeId.value = episode.id;
  selectedSceneId.value = '';
  selectedChapterId.value = episode.chapterId ?? '';
  collapsedChapterIds.value = collapsedChapterIds.value.filter((id) => id !== selectedChapterId.value);
  collapsedEpisodeIds.value = collapsedEpisodeIds.value.filter((id) => id !== episode.id);
  clearMemoPopover();
  editorPanelCollapsed.value = false;
  editorTab.value = 'info';
  infoTab.value = 'episode';
}

function selectScene(sceneId: string) {
  const scene = scenes.value.find((item) => item.id === sceneId);
  if (!scene) return;
  const episode = episodes.value.find((item) => item.id === scene.episodeId);
  if (!episode) return;
  selectedKind.value = 'scene';
  selectedSceneId.value = scene.id;
  selectedEpisodeId.value = episode.id;
  selectedChapterId.value = episode.chapterId ?? '';
  collapsedChapterIds.value = collapsedChapterIds.value.filter((id) => id !== selectedChapterId.value);
  collapsedEpisodeIds.value = collapsedEpisodeIds.value.filter((id) => id !== episode.id);
  clearMemoPopover();
  editorPanelCollapsed.value = false;
  editorTab.value = 'memo';
  infoTab.value = 'scene';
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
  collapsedChapterIds.value = collapsedChapterIds.value.filter((id) => id !== chapter.id);
  collapsedEpisodeIds.value = collapsedEpisodeIds.value.filter((id) => id !== episode.id);
}

function addEpisode(chapterId: string) {
  const chapter = chapters.value.find((item) => item.id === chapterId);
  if (!chapter) return;
  const nextNumber = episodes.value.filter((item) => item.chapterId === chapterId).length + 1;
  const episode: Episode = {
    id: createId(),
    projectId,
    chapterId,
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
  selectEpisode(episode.id);
  collapsedChapterIds.value = collapsedChapterIds.value.filter((id) => id !== chapter.id);
}

function addScene(episodeId: string) {
  const episode = episodes.value.find((item) => item.id === episodeId);
  if (!episode) return;
  const sceneCount = scenes.value.filter((item) => item.episodeId === episodeId).length + 1;
  const scene: Scene = {
    id: createId(),
    projectId,
    episodeId,
    title: `シーン${sceneCount}`,
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
  selectScene(scene.id);
  collapsedEpisodeIds.value = collapsedEpisodeIds.value.filter((id) => id !== episode.id);
}

function ensureSceneBodyDraft(scene: Scene) {
  const existing = dataStore.bodyDrafts.find((draft) => draft.projectId === projectId && draft.sceneId === scene.id);
  if (existing) return existing;

  const now = nowIso();
  const episode = episodes.value.find((item) => item.id === scene.episodeId);
  const draft: BodyDraft = {
    id: createId(),
    projectId,
    episodeId: scene.episodeId,
    sceneId: scene.id,
    title: episode ? `第${episode.number}話 ${scene.title}` : scene.title,
    content: '',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
  dataStore.bodyDrafts.unshift(draft);
  return draft;
}

function updateSceneContent(value: string) {
  if (selectedKind.value !== 'scene' || !selectedScene.value) return;
  const draft = ensureSceneBodyDraft(selectedScene.value);
  draft.content = value;
  draft.updatedAt = nowIso();
}

function memoForLine(lineNumber: number) {
  return memos.value.find((memo) => memo.lineNumber === lineNumber);
}

function addMemo() {
  if (selectedKind.value !== 'scene' || !selectedScene.value || !newMemoContent.value.trim()) return;
  const draft = ensureSceneBodyDraft(selectedScene.value);
  const index = Math.max(0, newMemoLine.value - 1);
  const memo: LineMemo = {
    id: createId(),
    projectId,
    episodeId: draft.episodeId,
    sceneId: draft.sceneId,
    bodyId: draft.id,
    blockId: `line-${newMemoLine.value}`,
    lineNumber: newMemoLine.value,
    targetText: displayedLines.value[index] ?? '',
    beforeText: displayedLines.value[index - 1] ?? '',
    afterText: displayedLines.value[index + 1] ?? '',
    memoType: newMemoType.value,
    content: newMemoContent.value,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  dataStore.lineMemos.push(memo);
  clearMemoPopover();
  newMemoContent.value = '';
  editorTab.value = 'memo';
}

function exportText(withMemos = false) {
  if (!displayedContent.value.trim() && !withMemos) return;
  const content = withMemos && selectedKind.value === 'scene'
    ? displayedLines.value.map((line, index) => {
        const memo = memoForLine(index + 1);
        return memo ? `${line}\n[メモ:${memo.memoType}] ${memo.content}` : line;
      }).join('\n')
    : displayedContent.value;
  const filename = selectedKind.value === 'scene'
    ? `${selectedScene.value?.title || 'シーン本文'}.txt`
    : `${selectedEpisode.value?.title || '話本文'}.txt`;
  downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), filename);
}

watchEffect(() => {
  const bodyId = route.query.bodyId;
  if (typeof bodyId !== 'string') return;
  const draft = dataStore.bodyDrafts.find((item) => item.id === bodyId);
  if (!draft) return;
  if (draft.sceneId) {
    selectScene(draft.sceneId);
    return;
  }
  if (draft.episodeId) selectEpisode(draft.episodeId);
});

watch(
  episodes,
  (items) => {
    if (!items.length) {
      selectedEpisodeId.value = '';
      selectedSceneId.value = '';
      return;
    }
    if (!selectedEpisodeId.value || !items.some((episode) => episode.id === selectedEpisodeId.value)) {
      selectEpisode(items[0].id);
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

watch(
  () => displayedContent.value,
  () => {
    measureWrappedLineCounts();
    syncLineViewScroll();
  },
  { immediate: true }
);

watch(
  () => selectedKind.value,
  () => {
    measureWrappedLineCounts();
  }
);

watch(editorFontFamily, (value) => {
  localStorage.setItem('editor-font-family', value);
  measureWrappedLineCounts();
});

watch(editorFontSize, (value) => {
  localStorage.setItem('editor-font-size', String(value));
  measureWrappedLineCounts();
});

watch(infoPanelPosition, (value) => {
  localStorage.setItem('editor-info-panel-position', value);
  if (value === 'left' && editorTab.value === 'info') {
    editorTab.value = 'memo';
  }
});

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
    if (selection.kind === 'chapter' && selection.chapterId && (selectedKind.value !== 'chapter' || selection.chapterId !== selectedChapterId.value)) {
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

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
  window.addEventListener('resize', measureWrappedLineCounts);
  measureWrappedLineCounts();
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
  window.removeEventListener('resize', measureWrappedLineCounts);
});

function getMemoTypeLabel(memoType: MemoType): string {
  const labels: Record<MemoType, string> = {
    revision: '修正',
    foreshadowing: '伏線',
    characterEmotion: 'キャラ感情',
    description: '描写',
    caution: '注意',
    prePostCheck: '前後チェック',
  };
  return labels[memoType] || memoType;
}

function lineButtonMemo(lineNumber: number) {
  return memoForLine(lineNumber) ?? null;
}

function openMemoPopover(lineNumber: number, event: MouseEvent) {
  const memo = lineButtonMemo(lineNumber);
  if (!memo) return;
  const button = event.currentTarget as HTMLElement;
  const container = button.closest('.editor-pane');
  if (!container) return;
  const buttonRect = button.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  memoPopover.value = {
    memo,
    top: buttonRect.top - containerRect.top + (buttonRect.height / 2) + 8,
  };
}

function hoverMemo(lineNumber: number, event: MouseEvent) {
  if (memoPopoverPinned.value) return;
  openMemoPopover(lineNumber, event);
}

function pinMemo(lineNumber: number, event: MouseEvent) {
  memoPopoverPinned.value = true;
  editorPanelCollapsed.value = false;
  editorTab.value = 'memo';
  openMemoPopover(lineNumber, event);
}

function clearMemoPopover() {
  memoPopoverPinned.value = false;
  memoPopover.value = null;
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return;
  if (target.closest('.line-number') || target.closest('.memo-popover')) return;
  memoPopover.value = null;
}
</script>

<template>
  <AppHeader :project-id="projectId" title="本文エディタ" />
  <main class="page split-page editor-layout" :class="{ 'sidebar-collapsed': leftSidebarCollapsed }">
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
          <template v-for="chapter in chapters" :key="chapter.id">
            <button
              type="button"
              class="sidebar-compact-item"
              :class="{ active: selectedChapterId === chapter.id && selectedKind !== 'scene' && selectedKind !== 'episode' }"
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
                  :class="{ active: selectedKind === 'episode' && selectedEpisodeId === episode.id }"
                  @click="selectEpisode(episode.id)"
                  :title="`第${episode.number}話`"
                >
                  <span class="sidebar-compact-icon">📄</span>
                  <span class="sidebar-compact-badge">{{ episode.number }}</span>
                </button>
                <template v-if="!isEpisodeCollapsed(episode.id)">
                  <button
                    v-for="(scene, sceneIndex) in scenes.filter((item) => item.episodeId === episode.id)"
                    :key="scene.id"
                    type="button"
                    class="sidebar-compact-item scene"
                    :class="{ active: selectedKind === 'scene' && selectedSceneId === scene.id }"
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
        <div class="scroll-list plot-tree" data-tree-root="editor">
        <section
          v-for="chapter in chapters"
          :key="chapter.id"
          class="plot-tree-group"
          data-tree-level="chapter"
          :data-tree-id="chapter.id"
        >
          <div
            class="plot-tree-item chapter-item"
            :class="{ active: selectedChapterId === chapter.id && selectedKind !== 'scene' && selectedKind !== 'episode' }"
          >
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
              <div class="plot-tree-item episode-item" :class="{ active: selectedKind === 'episode' && selectedEpisodeId === episode.id }">
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
                  v-for="scene in scenes.filter((item) => item.episodeId === episode.id)"
                  :key="scene.id"
                  class="plot-tree-item scene-item"
                  :class="{ active: selectedKind === 'scene' && selectedSceneId === scene.id }"
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

    <section
      v-if="(selectedKind === 'chapter' && selectedChapter) || selectedEpisode"
      class="editor-workspace"
      :class="{
        'chapter-workspace': selectedKind === 'chapter',
        'scene-workspace': selectedKind === 'scene',
        'episode-workspace': selectedKind === 'episode',
        'panel-minimized': editorPanelCollapsed && selectedKind === 'scene',
        'no-lower-panel': selectedKind !== 'scene',
      }"
    >
      <div class="select-summary">
        <strong>{{ selectedTargetLabel }}</strong>
        <small>{{ selectedModeLabel }}</small>
      </div>

      <div v-if="showSideInfoPanel" class="editor-main-split">
        <section class="card side-info-panel">
          <div class="editor-panel-section">
            <div class="info-tab-bar">
              <button type="button" class="editor-panel-tab info-subtab" :class="{ active: infoTab === 'chapter' }" @click="infoTab = 'chapter'">章</button>
              <button type="button" class="editor-panel-tab info-subtab" :class="{ active: infoTab === 'episode' }" @click="infoTab = 'episode'">話</button>
              <button
                type="button"
                class="editor-panel-tab info-subtab"
                :class="{ active: infoTab === 'scene' }"
                :disabled="selectedKind !== 'scene' || !selectedScene"
                @click="infoTab = 'scene'"
              >
                シーン
              </button>
            </div>

            <section v-if="infoTab === 'chapter' && selectedChapter" class="info-block">
              <strong class="info-block-title">章プロット</strong>
              <div class="info-list">
                <div v-if="hasText(selectedChapter.purpose)" class="info-row"><span>章の目的</span><p>{{ selectedChapter.purpose }}</p></div>
                <div v-if="hasText(selectedChapter.flow)" class="info-row"><span>章の流れ</span><p>{{ selectedChapter.flow }}</p></div>
                <div v-if="hasText(selectedChapter.memo)" class="info-row"><span>メモ</span><p>{{ selectedChapter.memo }}</p></div>
              </div>
            </section>

            <section v-if="infoTab === 'episode' && selectedEpisode" class="info-block">
              <strong class="info-block-title">話プロット</strong>
              <div class="info-list">
                <div v-if="hasText(selectedEpisode.purpose)" class="info-row"><span>この話の目的</span><p>{{ selectedEpisode.purpose }}</p></div>
                <div v-if="hasItems(selectedEpisodeCharacterNames)" class="info-row"><span>登場人物</span><p>{{ selectedEpisodeCharacterNames.join(' / ') }}</p></div>
                <div v-if="hasItems(selectedEpisodeTagNames)" class="info-row"><span>関連タグ</span><p>{{ selectedEpisodeTagNames.join(' / ') }}</p></div>
                <div v-if="hasText(selectedEpisode.startSituation)" class="info-row"><span>開始状況</span><p>{{ selectedEpisode.startSituation }}</p></div>
                <div v-if="hasText(selectedEpisode.mainEvent)" class="info-row"><span>起きる事件</span><p>{{ selectedEpisode.mainEvent }}</p></div>
                <div v-if="hasText(selectedEpisode.revealInfo)" class="info-row"><span>明かす情報</span><p>{{ selectedEpisode.revealInfo }}</p></div>
                <div v-if="hasText(selectedEpisode.hiddenInfo)" class="info-row"><span>隠す情報</span><p>{{ selectedEpisode.hiddenInfo }}</p></div>
                <div v-if="hasText(selectedEpisode.foreshadowing)" class="info-row"><span>伏線</span><p>{{ selectedEpisode.foreshadowing }}</p></div>
                <div v-if="hasText(selectedEpisode.endingHook)" class="info-row"><span>ラストの引き</span><p>{{ selectedEpisode.endingHook }}</p></div>
                <div v-if="hasText(selectedEpisode.memo)" class="info-row"><span>本文メモ</span><p>{{ selectedEpisode.memo }}</p></div>
              </div>
            </section>

            <section v-if="infoTab === 'scene' && selectedKind === 'scene' && selectedScene" class="info-block">
              <strong class="info-block-title">シーンプロット</strong>
              <div class="info-list">
                <div v-if="hasText(selectedScene.location)" class="info-row"><span>場所</span><p>{{ selectedScene.location }}</p></div>
                <div v-if="hasText(selectedScene.time)" class="info-row"><span>時間</span><p>{{ selectedScene.time }}</p></div>
                <div v-if="hasItems(selectedSceneCharacterNames)" class="info-row"><span>登場人物</span><p>{{ selectedSceneCharacterNames.join(' / ') }}</p></div>
                <div v-if="hasText(selectedScene.event)" class="info-row"><span>起きること</span><p>{{ selectedScene.event }}</p></div>
                <div v-if="hasText(selectedScene.conversationPurpose)" class="info-row"><span>会話の目的</span><p>{{ selectedScene.conversationPurpose }}</p></div>
                <div v-if="hasText(selectedScene.conflict)" class="info-row"><span>衝突</span><p>{{ selectedScene.conflict }}</p></div>
                <div v-if="hasText(selectedScene.result)" class="info-row"><span>結果</span><p>{{ selectedScene.result }}</p></div>
                <div v-if="hasText(selectedScene.nextHook)" class="info-row"><span>次への繋ぎ</span><p>{{ selectedScene.nextHook }}</p></div>
                <div v-if="hasItems(selectedSceneTagNames)" class="info-row"><span>関連タグ</span><p>{{ selectedSceneTagNames.join(' / ') }}</p></div>
                <div v-if="hasText(selectedScene.memo)" class="info-row"><span>メモ</span><p>{{ selectedScene.memo }}</p></div>
              </div>
            </section>
          </div>
        </section>

        <section class="card editor-pane-card scene-pane-card">
          <div class="editor-pane">
          <div class="vscode-editor">
            <div ref="lineViewRef" class="line-view" :style="editorLineNumberStyle">
              <div class="line-view-inner">
                <button
                  v-for="(line, index) in displayedLines"
                  :key="index"
                  class="line-number"
                  :class="{ hasMemo: memoForLine(index + 1) }"
                  :style="{ minHeight: `calc(var(--editor-line-height) * ${visualLineCounts[index] || 1})` }"
                  @mouseenter="hoverMemo(index + 1, $event)"
                  @mouseleave="!memoPopoverPinned ? clearMemoPopover() : null"
                  @click="pinMemo(index + 1, $event)"
                >
                  <span v-if="!memoForLine(index + 1)">{{ index + 1 }}</span>
                  <span v-else class="line-number-badge">{{ index + 1 }}</span>
                </button>
              </div>
            </div>
            <textarea
              ref="bodyTextareaRef"
              class="body-textarea auto-textarea"
              :style="editorTextStyle"
              :value="displayedContent"
              @scroll="syncLineViewScroll"
              @input="updateSceneContent(($event.target as HTMLTextAreaElement).value)"
            />
          </div>
          <div v-if="memoPopover" class="memo-popover" :style="{ top: `${memoPopover.top}px` }">
            <strong class="memo-type-label">{{ getMemoTypeLabel(memoPopover.memo.memoType) }}</strong>
            <p>{{ memoPopover.memo.content }}</p>
          </div>
          </div>
          <div class="scene-editor-meta">
            <span>文字数 {{ charCount }}</span>
            <span>行数 {{ displayedLines.length }}</span>
          </div>
        </section>
      </div>

      <template v-else>
      <section class="card editor-pane-card" :class="{ 'scene-pane-card': selectedKind === 'scene' }">
        <div class="editor-pane">
        <div class="vscode-editor" :class="{ 'merged-episode-view': selectedKind !== 'scene' }">
          <div ref="lineViewRef" class="line-view" :style="editorLineNumberStyle">
            <div class="line-view-inner">
              <button
                v-for="(line, index) in displayedLines"
                :key="index"
                class="line-number"
                :class="{ hasMemo: selectedKind === 'scene' && memoForLine(index + 1) }"
                :style="{ minHeight: `calc(var(--editor-line-height) * ${visualLineCounts[index] || 1})` }"
                @mouseenter="selectedKind === 'scene' ? hoverMemo(index + 1, $event) : null"
                @mouseleave="selectedKind === 'scene' && !memoPopoverPinned ? clearMemoPopover() : null"
                @click="selectedKind === 'scene' ? pinMemo(index + 1, $event) : null"
              >
                <span v-if="!(selectedKind === 'scene' && memoForLine(index + 1))">{{ index + 1 }}</span>
                <span v-else class="line-number-badge">{{ index + 1 }}</span>
              </button>
            </div>
          </div>
          <textarea
            ref="bodyTextareaRef"
            class="body-textarea auto-textarea"
            :class="{ readonly: selectedKind !== 'scene' }"
            :style="editorTextStyle"
            :readonly="selectedKind !== 'scene'"
            :value="displayedContent"
            @scroll="syncLineViewScroll"
            @input="updateSceneContent(($event.target as HTMLTextAreaElement).value)"
          />
        </div>
        <div v-if="memoPopover" class="memo-popover" :style="{ top: `${memoPopover.top}px` }">
          <strong class="memo-type-label">{{ getMemoTypeLabel(memoPopover.memo.memoType) }}</strong>
          <p>{{ memoPopover.memo.content }}</p>
        </div>
        </div>
        <div v-if="selectedKind === 'scene'" class="scene-editor-meta">
          <span>文字数 {{ charCount }}</span>
          <span>行数 {{ displayedLines.length }}</span>
        </div>
      </section>
      </template>

      <section v-if="selectedKind === 'scene'" class="card editor-lower-panel scene-lower-panel" :class="{ collapsed: editorPanelCollapsed }">
        <div class="editor-panel-tabs" :class="{ 'side-info-mode': showSideInfoPanel }">
          <button
            v-if="!showSideInfoPanel"
            type="button"
            class="editor-panel-tab"
            :class="{ active: editorTab === 'info' }"
            @click="editorTab = 'info'"
          >
            情報
          </button>
          <button
            type="button"
            class="editor-panel-tab"
            :class="{ active: editorTab === 'memo' }"
            @click="editorTab = 'memo'"
          >
            行間メモ
          </button>
          <button
            type="button"
            class="editor-panel-tab"
            :class="{ active: editorTab === 'export' }"
            @click="editorTab = 'export'"
          >
            出力
          </button>
          <button
            type="button"
            class="editor-panel-tab"
            :class="{ active: editorTab === 'settings' }"
            @click="editorTab = 'settings'"
          >
            設定
          </button>
          <button type="button" class="secondary editor-panel-toggle" @click="editorPanelCollapsed = !editorPanelCollapsed">
            {{ editorPanelCollapsed ? '展開' : '最小化' }}
          </button>
        </div>
        <div v-if="!editorPanelCollapsed" class="editor-panel-body">
          <div v-if="editorTab === 'info'" class="editor-panel-section">
            <div class="info-tab-bar">
              <button type="button" class="editor-panel-tab info-subtab" :class="{ active: infoTab === 'chapter' }" @click="infoTab = 'chapter'">章</button>
              <button type="button" class="editor-panel-tab info-subtab" :class="{ active: infoTab === 'episode' }" @click="infoTab = 'episode'">話</button>
              <button
                type="button"
                class="editor-panel-tab info-subtab"
                :class="{ active: infoTab === 'scene' }"
                :disabled="selectedKind !== 'scene' || !selectedScene"
                @click="infoTab = 'scene'"
              >
                シーン
              </button>
            </div>

            <section v-if="infoTab === 'chapter' && selectedChapter" class="info-block">
              <strong class="info-block-title">章プロット</strong>
              <div class="info-list">
                <div v-if="hasText(selectedChapter.purpose)" class="info-row"><span>章の目的</span><p>{{ selectedChapter.purpose }}</p></div>
                <div v-if="hasText(selectedChapter.flow)" class="info-row"><span>章の流れ</span><p>{{ selectedChapter.flow }}</p></div>
                <div v-if="hasText(selectedChapter.memo)" class="info-row"><span>メモ</span><p>{{ selectedChapter.memo }}</p></div>
              </div>
            </section>

            <section v-if="infoTab === 'episode' && selectedEpisode" class="info-block">
              <strong class="info-block-title">話プロット</strong>
              <div class="info-list">
                <div v-if="hasText(selectedEpisode.purpose)" class="info-row"><span>この話の目的</span><p>{{ selectedEpisode.purpose }}</p></div>
                <div v-if="hasItems(selectedEpisodeCharacterNames)" class="info-row"><span>登場人物</span><p>{{ selectedEpisodeCharacterNames.join(' / ') }}</p></div>
                <div v-if="hasItems(selectedEpisodeTagNames)" class="info-row"><span>関連タグ</span><p>{{ selectedEpisodeTagNames.join(' / ') }}</p></div>
                <div v-if="hasText(selectedEpisode.startSituation)" class="info-row"><span>開始状況</span><p>{{ selectedEpisode.startSituation }}</p></div>
                <div v-if="hasText(selectedEpisode.mainEvent)" class="info-row"><span>起きる事件</span><p>{{ selectedEpisode.mainEvent }}</p></div>
                <div v-if="hasText(selectedEpisode.revealInfo)" class="info-row"><span>明かす情報</span><p>{{ selectedEpisode.revealInfo }}</p></div>
                <div v-if="hasText(selectedEpisode.hiddenInfo)" class="info-row"><span>隠す情報</span><p>{{ selectedEpisode.hiddenInfo }}</p></div>
                <div v-if="hasText(selectedEpisode.foreshadowing)" class="info-row"><span>伏線</span><p>{{ selectedEpisode.foreshadowing }}</p></div>
                <div v-if="hasText(selectedEpisode.endingHook)" class="info-row"><span>ラストの引き</span><p>{{ selectedEpisode.endingHook }}</p></div>
                <div v-if="hasText(selectedEpisode.memo)" class="info-row"><span>本文メモ</span><p>{{ selectedEpisode.memo }}</p></div>
              </div>
            </section>

            <section v-if="infoTab === 'scene' && selectedKind === 'scene' && selectedScene" class="info-block">
              <strong class="info-block-title">シーンプロット</strong>
              <div class="info-list">
                <div v-if="hasText(selectedScene.location)" class="info-row"><span>場所</span><p>{{ selectedScene.location }}</p></div>
                <div v-if="hasText(selectedScene.time)" class="info-row"><span>時間</span><p>{{ selectedScene.time }}</p></div>
                <div v-if="hasItems(selectedSceneCharacterNames)" class="info-row"><span>登場人物</span><p>{{ selectedSceneCharacterNames.join(' / ') }}</p></div>
                <div v-if="hasText(selectedScene.event)" class="info-row"><span>起きること</span><p>{{ selectedScene.event }}</p></div>
                <div v-if="hasText(selectedScene.conversationPurpose)" class="info-row"><span>会話の目的</span><p>{{ selectedScene.conversationPurpose }}</p></div>
                <div v-if="hasText(selectedScene.conflict)" class="info-row"><span>衝突</span><p>{{ selectedScene.conflict }}</p></div>
                <div v-if="hasText(selectedScene.result)" class="info-row"><span>結果</span><p>{{ selectedScene.result }}</p></div>
                <div v-if="hasText(selectedScene.nextHook)" class="info-row"><span>次への繋ぎ</span><p>{{ selectedScene.nextHook }}</p></div>
                <div v-if="hasItems(selectedSceneTagNames)" class="info-row"><span>関連タグ</span><p>{{ selectedSceneTagNames.join(' / ') }}</p></div>
                <div v-if="hasText(selectedScene.memo)" class="info-row"><span>メモ</span><p>{{ selectedScene.memo }}</p></div>
              </div>
            </section>

          </div>

          <div v-if="editorTab === 'memo'" class="editor-panel-section">
            <div v-if="selectedKind === 'scene'" class="memo-form">
              <label class="field"><span>行番号</span><input type="number" min="1" v-model.number="newMemoLine" /></label>
              <label class="field"><span>種類</span><select v-model="newMemoType"><option value="revision">修正</option><option value="foreshadowing">伏線</option><option value="characterEmotion">キャラ感情</option><option value="description">描写</option><option value="caution">注意</option><option value="prePostCheck">前後チェック</option></select></label>
              <TextField label="メモ内容" type="textarea" v-model="newMemoContent" />
              <button class="secondary" @click="addMemo">メモ追加</button>
            </div>
            <div v-else class="hint-box">
              話表示では行間メモを編集しません。シーンを選択してください。
            </div>
          </div>

          <div v-if="editorTab === 'export'" class="editor-panel-section">
            <div class="button-row">
              <button class="secondary" @click="exportText(false)">本文のみtxt出力</button>
              <button v-if="selectedKind === 'scene'" class="secondary" @click="exportText(true)">メモ付きtxt出力</button>
            </div>
          </div>

          <div v-if="editorTab === 'settings'" class="editor-panel-section">
            <label class="field">
              <span>フォント</span>
              <select v-model="editorFontFamily">
                <option v-for="option in fontFamilyOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
            <label class="field">
              <span>文字サイズ</span>
              <select v-model.number="editorFontSize">
                <option v-for="size in fontSizeOptions" :key="size" :value="size">{{ size }}px</option>
              </select>
            </label>
            <label class="field">
              <span>情報表示位置</span>
              <select v-model="infoPanelPosition">
                <option value="bottom">下</option>
                <option value="left">左</option>
              </select>
            </label>
          </div>
        </div>
      </section>
    </section>

    <section v-else class="card empty-state">本文を書く話かシーンを選択してください。</section>
  </main>
</template>
