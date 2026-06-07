<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import TextField from '../components/TextField.vue';
import { dataStore, downloadBlob } from '../store/data';
import { createId, nowIso } from '../utils/id';
import type { BodyDraft, LineMemo, MemoType } from '../types/models';

const projectId = useRoute().params.projectId as string;
const route = useRoute();
const selectedBodyId = ref('');
const selectedMemo = ref<LineMemo | null>(null);
const newMemoLine = ref(1);
const newMemoType = ref<MemoType>('revision');
const newMemoContent = ref('');

const bodies = computed(() => dataStore.bodyDrafts.filter((b) => b.projectId === projectId));
const body = computed(() => dataStore.bodyDrafts.find((b) => b.id === selectedBodyId.value));
const lines = computed(() => (body.value?.content ?? '').split('\n'));
const memos = computed(() => dataStore.lineMemos.filter((m) => m.projectId === projectId && m.bodyId === selectedBodyId.value));
const charCount = computed(() => body.value?.content.length ?? 0);
const blankLineCount = computed(() => lines.value.filter((l) => !l.trim()).length);
const dialogueCount = computed(() => lines.value.filter((l) => l.trim().startsWith('「')).length);

watchEffect(() => {
  const bodyId = route.query.bodyId;
  if (typeof bodyId === 'string' && dataStore.bodyDrafts.some((draft) => draft.id === bodyId)) {
    selectedBodyId.value = bodyId;
  }
});

function addBody() {
  const now = nowIso();
  const draft: BodyDraft = { id: createId(), projectId, title: '新しい本文', content: '', status: 'draft', createdAt: now, updatedAt: now };
  dataStore.bodyDrafts.unshift(draft);
  selectedBodyId.value = draft.id;
}
function updateContent(value: string) {
  if (!body.value) return;
  body.value.content = value;
  body.value.updatedAt = nowIso();
}
function memoForLine(lineNumber: number) {
  return memos.value.find((m) => m.lineNumber === lineNumber);
}
function addMemo() {
  if (!body.value || !newMemoContent.value.trim()) return;
  const index = Math.max(0, newMemoLine.value - 1);
  const memo: LineMemo = {
    id: createId(), projectId, bodyId: body.value.id, blockId: `line-${newMemoLine.value}`, lineNumber: newMemoLine.value,
    targetText: lines.value[index] ?? '', beforeText: lines.value[index - 1] ?? '', afterText: lines.value[index + 1] ?? '',
    memoType: newMemoType.value, content: newMemoContent.value, createdAt: nowIso(), updatedAt: nowIso(),
  };
  dataStore.lineMemos.push(memo);
  selectedMemo.value = memo;
  newMemoContent.value = '';
}
function exportText(withMemos = false) {
  if (!body.value) return;
  const content = withMemos
    ? lines.value.map((line, index) => {
        const memo = memoForLine(index + 1);
        return memo ? `${line}\n[メモ:${memo.memoType}] ${memo.content}` : line;
      }).join('\n')
    : body.value.content;
  downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), `${body.value.title}.txt`);
}
</script>

<template>
  <AppHeader :project-id="projectId" title="本文エディタ" />
  <main class="page split-page editor-layout">
    <section class="card side-list">
      <button @click="addBody">＋ 本文追加</button>
      <button v-for="item in bodies" :key="item.id" class="list-button" :class="{ active: item.id === selectedBodyId }" @click="selectedBodyId = item.id">
        {{ item.title }}<small>{{ item.status }}</small>
      </button>
    </section>

    <section v-if="body" class="card editor-card">
      <TextField label="本文タイトル" v-model="body.title" />
      <div class="counter-bar">
        <span>文字数 {{ charCount }}</span>
        <span>行数 {{ lines.length }}</span>
        <span>空行 {{ blankLineCount }}</span>
        <span>会話 {{ dialogueCount }}</span>
        <span>メモ {{ memos.length }}</span>
      </div>

      <div class="vscode-editor">
        <div class="line-view">
          <button
            v-for="(line, index) in lines"
            :key="index"
            class="line-number"
            :class="{ hasMemo: memoForLine(index + 1) }"
            @click="selectedMemo = memoForLine(index + 1) || null; newMemoLine = index + 1"
          >
            {{ index + 1 }}<span v-if="memoForLine(index + 1)">●</span>
          </button>
        </div>
        <textarea class="body-textarea" :value="body.content" @input="updateContent(($event.target as HTMLTextAreaElement).value)" />
      </div>

      <details class="memo-panel" open>
        <summary>行間メモ</summary>
        <div class="memo-form">
          <label class="field"><span>行番号</span><input type="number" min="1" v-model.number="newMemoLine" /></label>
          <label class="field"><span>種類</span><select v-model="newMemoType"><option>revision</option><option>foreshadowing</option><option>characterEmotion</option><option>description</option><option>caution</option><option>prePostCheck</option></select></label>
          <TextField label="メモ内容" type="textarea" v-model="newMemoContent" />
          <button class="secondary" @click="addMemo">メモ追加</button>
        </div>
        <article v-if="selectedMemo" class="selected-memo">
          <b>{{ selectedMemo.lineNumber }}行目 / {{ selectedMemo.memoType }}</b>
          <p>{{ selectedMemo.content }}</p>
        </article>
      </details>

      <div class="button-row">
        <button class="secondary" @click="exportText(false)">本文のみtxt出力</button>
        <button class="secondary" @click="exportText(true)">メモ付きtxt出力</button>
      </div>
    </section>

    <section v-else class="card empty-state">本文を選択してください。</section>
  </main>
</template>
