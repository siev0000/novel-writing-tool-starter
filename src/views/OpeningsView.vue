<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import TextField from '../components/TextField.vue';
import { dataStore } from '../store/data';
import { createId, nowIso } from '../utils/id';
import type { BodyDraft, OpeningIdea } from '../types/models';

const projectId = useRoute().params.projectId as string;
const router = useRouter();
const selectedType = ref('会話から始める');
const selectedSourceType = ref<OpeningIdea['sourceType']>('scene');
const selectedSourceId = ref('');
const selectedPostStyleId = ref('');
const usedCharacterIds = ref<string[]>([]);
const usedTagIds = ref<string[]>([]);
const usedTermIds = ref<string[]>([]);
const text = ref('');
const memo = ref('');
const openings = computed(() => dataStore.openingIdeas.filter((o) => o.projectId === projectId));
const characters = computed(() => dataStore.characters.filter((character) => character.projectId === projectId));
const tags = computed(() => dataStore.tags.filter((tag) => tag.projectId === projectId && tag.status === 'active'));
const terms = computed(() => dataStore.terms.filter((term) => term.projectId === projectId));
const episodes = computed(() => dataStore.episodes.filter((episode) => episode.projectId === projectId).sort((a, b) => a.number - b.number));
const scenes = computed(() => dataStore.scenes.filter((scene) => scene.projectId === projectId));
const postStyles = computed(() => dataStore.postStylePresets.filter((style) => style.projectId === projectId));
const sourceOptions = computed(() => {
  if (selectedSourceType.value === 'episode') {
    return episodes.value.map((episode) => ({ id: episode.id, label: `第${episode.number}話 ${episode.title}` }));
  }
  if (selectedSourceType.value === 'scene') {
    return scenes.value.map((scene) => ({ id: scene.id, label: scene.title }));
  }
  if (selectedSourceType.value === 'character') {
    return characters.value.map((character) => ({ id: character.id, label: character.name }));
  }
  if (selectedSourceType.value === 'tag') {
    return tags.value.map((tag) => ({ id: tag.id, label: tag.name }));
  }
  if (selectedSourceType.value === 'term') {
    return terms.value.map((term) => ({ id: term.id, label: term.name }));
  }
  return [];
});

function saveOpening() {
  if (!text.value.trim()) return;
  const idea: OpeningIdea = {
    id: createId(), projectId, sourceType: selectedSourceType.value, sourceId: selectedSourceId.value, type: selectedType.value, text: text.value,
    score: 0, usedCharacterIds: [...usedCharacterIds.value], usedTagIds: [...usedTagIds.value], usedTermIds: [...usedTermIds.value],
    postStylePresetId: selectedPostStyleId.value || undefined, memo: memo.value, status: 'candidate', createdAt: nowIso(),
  };
  dataStore.openingIdeas.unshift(idea);
  text.value = '';
  memo.value = '';
}
function adopt(idea: OpeningIdea) {
  idea.status = 'adopted';
  const now = nowIso();
  const body: BodyDraft = {
    id: createId(),
    projectId,
    title: `${idea.type}の本文`,
    content: idea.text,
    episodeId: idea.sourceType === 'episode' ? idea.sourceId : undefined,
    sceneId: idea.sourceType === 'scene' ? idea.sourceId : undefined,
    postStylePresetId: idea.postStylePresetId,
    sourceOpeningIdeaId: idea.id,
    status: 'writing',
    createdAt: now,
    updatedAt: now,
  };
  dataStore.bodyDrafts.unshift(body);
  router.push(`/project/${projectId}/editor?bodyId=${body.id}`);
}

function toggleSelection(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

function sourceLabel(idea: OpeningIdea) {
  if (!idea.sourceId) return '作成元未設定';
  const pools = {
    episode: episodes.value.map((episode) => ({ id: episode.id, label: `第${episode.number}話 ${episode.title}` })),
    scene: scenes.value.map((scene) => ({ id: scene.id, label: scene.title })),
    character: characters.value.map((character) => ({ id: character.id, label: character.name })),
    tag: tags.value.map((tag) => ({ id: tag.id, label: tag.name })),
    term: terms.value.map((term) => ({ id: term.id, label: term.name })),
    workPlot: [],
  };
  return pools[idea.sourceType].find((item) => item.id === idea.sourceId)?.label || '作成元未設定';
}

function postStyleName(styleId?: string) {
  return postStyles.value.find((style) => style.id === styleId)?.name || '投稿設定なし';
}
</script>

<template>
  <AppHeader :project-id="projectId" title="書き出し" />
  <main class="page">
    <section class="card line-form-card">
      <div class="form-grid">
        <label class="field">
          <span>書き出しタイプ</span>
          <select v-model="selectedType">
            <option>会話から始める</option>
            <option>異常な状況から始める</option>
            <option>主人公の独白から始める</option>
            <option>事件から始める</option>
            <option>世界観説明から始める</option>
            <option>不穏な一文から始める</option>
          </select>
        </label>
        <label class="field">
          <span>作成元</span>
          <select v-model="selectedSourceType" @change="selectedSourceId = ''">
            <option value="episode">話プロット</option>
            <option value="scene">シーン</option>
            <option value="character">登場人物</option>
            <option value="tag">タグ</option>
            <option value="term">用語</option>
          </select>
        </label>
        <label class="field">
          <span>作成元の選択</span>
          <select v-model="selectedSourceId">
            <option value="">未選択</option>
            <option v-for="source in sourceOptions" :key="source.id" :value="source.id">{{ source.label }}</option>
          </select>
        </label>
        <label class="field">
          <span>投稿場所設定</span>
          <select v-model="selectedPostStyleId">
            <option value="">未設定</option>
            <option v-for="style in postStyles" :key="style.id" :value="style.id">{{ style.name }}</option>
          </select>
        </label>
      </div>
      <section class="inline-panel">
        <h3>使う人物・タグ・用語</h3>
        <div class="asset-picker">
          <div>
            <b>人物</b>
            <div class="chip-grid">
              <button v-for="character in characters" :key="character.id" type="button" class="chip-button" :class="{ active: usedCharacterIds.includes(character.id) }" @click="usedCharacterIds = toggleSelection(usedCharacterIds, character.id)">
                {{ character.name }}
              </button>
            </div>
          </div>
          <div>
            <b>タグ</b>
            <div class="chip-grid">
              <button v-for="tag in tags" :key="tag.id" type="button" class="chip-button" :class="{ active: usedTagIds.includes(tag.id) }" @click="usedTagIds = toggleSelection(usedTagIds, tag.id)">
                <span class="tag-swatch" :style="{ backgroundColor: tag.color }"></span>
                {{ tag.name }}
              </button>
            </div>
          </div>
          <div>
            <b>用語</b>
            <div class="chip-grid">
              <button v-for="term in terms" :key="term.id" type="button" class="chip-button" :class="{ active: usedTermIds.includes(term.id) }" @click="usedTermIds = toggleSelection(usedTermIds, term.id)">
                {{ term.name }}
              </button>
            </div>
          </div>
        </div>
      </section>
      <TextField label="候補本文" type="textarea" v-model="text" />
      <TextField label="メモ" type="textarea" v-model="memo" />
      <button @click="saveOpening">候補を保存</button>
    </section>

    <section class="list">
      <article v-for="idea in openings" :key="idea.id" class="card opening-card">
        <div class="status-line"><b>{{ idea.type }}</b><span>{{ idea.status }}</span></div>
        <div class="meta-line">
          <span>{{ sourceLabel(idea) }}</span>
          <span>{{ postStyleName(idea.postStylePresetId) }}</span>
        </div>
        <p class="opening-text">{{ idea.text }}</p>
        <p v-if="idea.memo" class="memo-text">{{ idea.memo }}</p>
        <div class="button-row">
          <button class="secondary" @click="adopt(idea)">採用して本文へ</button>
          <button class="secondary" @click="idea.status = 'hold'">保留</button>
          <button class="danger" @click="idea.status = 'rejected'">ボツ</button>
        </div>
      </article>
    </section>
  </main>
</template>
