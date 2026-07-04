<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import TextField from '../components/TextField.vue';
import { dataStore } from '../store/data';
import { createId } from '../utils/id';
import type { Relationship } from '../types/models';

const projectId = useRoute().params.projectId as string;
const selectedId = ref('');

const characters = computed(() => dataStore.characters.filter((character) => character.projectId === projectId));
const relationships = computed(() => dataStore.relationships.filter((relationship) => relationship.projectId === projectId));
const selected = computed(() => relationships.value.find((relationship) => relationship.id === selectedId.value));

watch(
  relationships,
  (items) => {
    if (!items.length) {
      selectedId.value = '';
      return;
    }
    if (!selectedId.value || !items.some((relationship) => relationship.id === selectedId.value)) {
      selectedId.value = items[0].id;
    }
  },
  { immediate: true }
);

watch(
  characters,
  (items) => {
    if (!selected.value || !items.length) return;
    const first = items[0];
    const fallback = items[1] ?? first;
    if (!items.some((character) => character.id === selected.value?.characterAId)) {
      selected.value.characterAId = first.id;
    }
    if (!items.some((character) => character.id === selected.value?.characterBId)) {
      selected.value.characterBId = fallback.id;
    }
  },
  { immediate: true }
);

function characterName(characterId: string) {
  return characters.value.find((character) => character.id === characterId)?.name || '未設定';
}

function addRelationship() {
  const first = characters.value[0];
  const second = characters.value[1] ?? characters.value[0];
  if (!first || !second) return;

  const relationship: Relationship = {
    id: createId(),
    projectId,
    characterAId: first.id,
    characterBId: second.id,
    relationType: '関係性未設定',
    emotionAtoB: '',
    emotionBtoA: '',
    publicRelation: '',
    hiddenRelation: '',
    changePlan: '',
    tagIds: [],
    memo: '',
  };
  dataStore.relationships.unshift(relationship);
  selectedId.value = relationship.id;
}
</script>

<template>
  <AppHeader :project-id="projectId" title="相関図" />
  <main class="page split-page">
    <section class="card side-list fixed-side-list">
      <button :disabled="characters.length < 1" @click="addRelationship">＋ 関係追加</button>
      <div class="scroll-list">
        <p v-if="characters.length < 1" class="hint-text">先に人物を追加してください。</p>
        <button
          v-for="relationship in relationships"
          :key="relationship.id"
          class="list-button"
          :class="{ active: relationship.id === selectedId }"
          @click="selectedId = relationship.id"
        >
          {{ characterName(relationship.characterAId) }} → {{ characterName(relationship.characterBId) }}
          <small>{{ relationship.relationType }}</small>
        </button>
      </div>
    </section>

    <section v-if="selected" class="card editor-card fixed-editor-card line-form-card">
      <div class="editor-scroll-body">
        <label class="field">
          <span>人物A</span>
          <select v-model="selected.characterAId">
            <option v-for="character in characters" :key="character.id" :value="character.id">{{ character.name }}</option>
          </select>
        </label>
        <label class="field">
          <span>人物B</span>
          <select v-model="selected.characterBId">
            <option v-for="character in characters" :key="character.id" :value="character.id">{{ character.name }}</option>
          </select>
        </label>
        <TextField label="関係性" v-model="selected.relationType" />
        <TextField label="AからBへの感情" type="textarea" v-model="selected.emotionAtoB" />
        <TextField label="BからAへの感情" type="textarea" v-model="selected.emotionBtoA" />
        <TextField label="表向きの関係" type="textarea" v-model="selected.publicRelation" />
        <TextField label="裏の関係" type="textarea" v-model="selected.hiddenRelation" />
        <TextField label="関係の変化予定" type="textarea" v-model="selected.changePlan" />
        <TextField label="メモ" type="textarea" v-model="selected.memo" />
      </div>
    </section>

    <section v-else class="card empty-state">関係を選択してください。</section>
  </main>
</template>
