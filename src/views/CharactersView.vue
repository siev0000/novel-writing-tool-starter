<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ColorPaletteModal from '../components/ColorPaletteModal.vue';
import type { ColorPaletteItem } from '../components/ColorPaletteModal.vue';
import ConfirmModal from '../components/ConfirmModal.vue';
import AppHeader from '../components/AppHeader.vue';
import CharacterNameModal from '../components/CharacterNameModal.vue';
import CharacterRelationshipModal from '../components/CharacterRelationshipModal.vue';
import SelectionModal from '../components/SelectionModal.vue';
import type { SelectionModalItem } from '../components/SelectionModal.vue';
import { DEFAULT_CHARACTER_COLOR, tagColorItems } from '../constants/colorPalette';
import TextField from '../components/TextField.vue';
import {
  activateCharacterVersion,
  createCharacterVersion,
  dataStore,
  deleteCharacter,
  deleteCharacterVersion,
  deleteRelationship,
  ensureCharacterVersions,
  getCharacterActiveVersion,
  getProject,
  isCharacterVersionChanged,
  compareCharacterProfileFields,
  syncCharacterActiveVersion,
} from '../store/data';
import { createId, nowIso } from '../utils/id';
import type { Character, CharacterProfileField, CharacterVersion, Relationship } from '../types/models';

const characterProfileKeys = [
  'ruby',
  'alias',
  'age',
  'gender',
  'birthday',
  'race',
  'affiliation',
  'origin',
  'height',
  'weight',
  'role',
  'personality',
  'goal',
  'behaviorPrinciple',
  'likes',
  'dislikes',
  'weakness',
  'secret',
  'battleStyle',
  'weapon',
  'magic',
  'firstPerson',
  'secondPerson',
  'speechStyle',
  'skill',
  'appearance',
  'hairStyle',
  'hairColor',
  'eyeColor',
  'build',
  'clothing',
  'equipment',
  'memo',
] as const;
type CharacterProfileKey = typeof characterProfileKeys[number];

const route = useRoute();
const router = useRouter();
const projectId = route.params.projectId as string;
const profileSectionOrder = ['基本情報', '人物像', '能力', '話し方', '外見', 'その他'] as const;
const selectedId = ref('');
const keyword = ref('');
const tagFilterId = ref('すべて');
const colorModalOpen = ref(false);
const tagModalOpen = ref(false);
const tagFilterModalOpen = ref(false);
const nameModalOpen = ref(false);
const relationshipModalOpen = ref(false);
const relationshipDeleteModalOpen = ref(false);
const deleteTargetModalOpen = ref(false);
const isEditing = ref(false);
const settingsMenuOpen = ref(false);
const characterDeleteTargetId = ref('');
const characterVersionDeleteTargetId = ref('');
const relationshipDeleteTargetId = ref('');
const characters = computed(() => dataStore.characters.filter((c) => c.projectId === projectId));
const tags = computed(() => dataStore.tags.filter((tag) => tag.projectId === projectId && tag.status === 'active' && tag.type !== 'ジャンルタグ'));
const relationships = computed(() => dataStore.relationships.filter((relationship) => relationship.projectId === projectId));
const selected = computed(() => dataStore.characters.find((c) => c.id === selectedId.value));
const selectedVersions = computed(() => selected.value?.versions ?? []);
const activeVersion = computed(() => (selected.value ? getCharacterActiveVersion(selected.value) : undefined));
const activeVersionChanged = computed(() => (activeVersion.value ? isCharacterVersionChanged(activeVersion.value) : false));
const selectedColorItem = computed(() => tagColorItems.find((item) => item.id === selected.value?.color));
const selectedColorSummary = computed(() => {
  if (!selected.value) return '';
  if (!selectedColorItem.value) return selected.value.color;
  return `${selected.value.color} / ${selectedColorItem.value.family} ${selectedColorItem.value.shade}`;
});
const tagFilterItems = computed<SelectionModalItem[]>(() => [
  { id: 'すべて', label: 'すべて', category: 'タグ検索' },
  ...tags.value.map((tag) => ({
    id: tag.id,
    label: tag.name,
    category: getDisplayTypeLabel(tag.type),
    color: tag.color,
  })),
]);
const project = computed(() => getProject(projectId));
const collapsedSections = ref<Record<string, boolean>>({});
const profileFields = computed(() => {
  return project.value?.characterProfileFields
    ?.filter((field) => field.status !== 'hidden')
    .slice()
    .sort(compareCharacterProfileFields) ?? [];
});
const groupedProfileFields = computed(() => {
  const groups = new Map<string, CharacterProfileField[]>();
  profileFields.value.forEach((field) => {
    const section = field.section || 'その他';
    groups.set(section, [...(groups.get(section) ?? []), field]);
  });
  return profileSectionOrder
    .map((section) => ({ section, fields: groups.get(section) ?? [] }))
    .filter((group) => group.fields.length > 0);
});
const selectedTags = computed(() => tags.value.filter((tag) => selected.value?.tagIds?.includes(tag.id)));
const filteredCharacters = computed(() => {
  const query = keyword.value.trim();
  return characters.value.filter((character) => {
    const matchKeyword = !query || `${character.name} ${character.ruby || ''}`.includes(query);
    const matchTag = tagFilterId.value === 'すべて' || character.tagIds?.includes(tagFilterId.value);
    return matchKeyword && matchTag;
  });
});
function getDisplayTypeLabel(type?: string) {
  if (!type) return '';
  return type.endsWith('タグ') ? type.slice(0, -2) : type;
}
const addTagItems = computed<SelectionModalItem[]>(() => {
  return tags.value.map((tag) => ({
    id: tag.id,
    label: tag.name,
    category: getDisplayTypeLabel(tag.type),
    description: tag.memo,
    color: tag.color,
  }));
});
const relationshipCharacterOptions = computed(() => {
  if (!selected.value) return [];
  return characters.value
    .filter((character) => character.id !== selected.value?.id)
    .map((character) => ({ id: character.id, name: character.name || '名前未設定' }));
});
const relationshipDrafts = computed(() => {
  const currentCharacter = selected.value;
  if (!currentCharacter) return [];
  return relationshipCharacterOptions.value.map((character) => {
    const existing = relationships.value.find((relationship) =>
      (relationship.characterAId === currentCharacter.id && relationship.characterBId === character.id)
      || (relationship.characterAId === character.id && relationship.characterBId === currentCharacter.id)
    );
    if (!existing) {
      return {
        targetId: character.id,
        relationType: '関係性未設定',
        impressionFromCurrent: '',
        impressionToCurrent: '',
      };
    }

    if (existing.characterAId === currentCharacter.id) {
      return {
        targetId: character.id,
        relationType: existing.relationType,
        impressionFromCurrent: existing.emotionAtoB,
        impressionToCurrent: existing.emotionBtoA,
      };
    }

    return {
      targetId: character.id,
      relationType: existing.relationType,
      impressionFromCurrent: existing.emotionBtoA,
      impressionToCurrent: existing.emotionAtoB,
    };
  });
});
const selectedRelationshipSummaries = computed(() => {
  const currentCharacter = selected.value;
  if (!currentCharacter) return [];
  return relationships.value
    .filter((relationship) => relationship.characterAId === currentCharacter.id || relationship.characterBId === currentCharacter.id)
    .map((relationship) => {
      const targetId = relationship.characterAId === currentCharacter.id ? relationship.characterBId : relationship.characterAId;
      const targetCharacter = characters.value.find((character) => character.id === targetId);
      const impression = relationship.characterAId === currentCharacter.id ? relationship.emotionAtoB : relationship.emotionBtoA;
      return {
        id: relationship.id,
        name: targetCharacter?.name || '名前未設定',
        relationType: relationship.relationType || '関係性未設定',
        impression,
      };
    });
});
const relationshipDeleteItems = computed<SelectionModalItem[]>(() => {
  return selectedRelationshipSummaries.value.map((item) => ({
    id: item.id,
    label: item.name,
    category: item.relationType,
    meta: item.impression,
  }));
});
const deleteTargetItems = computed<SelectionModalItem[]>(() => {
  if (!selected.value) return [];
  const items: SelectionModalItem[] = [
    { id: 'character', label: '人物全体を削除', category: '削除対象', meta: '人物・関連参照を削除' },
  ];
  if ((selected.value.versions?.length ?? 0) > 1) {
    selectedVersions.value.forEach((version, index) => {
      items.push({
        id: `version:${version.id}`,
        label: `V${index + 1} を削除`,
        category: '版削除',
        meta: version.id === activeVersion.value?.id ? '現在選択中' : '',
      });
    });
  }
  return items;
});
const versionDeleteTargetLabel = computed(() => {
  if (!characterVersionDeleteTargetId.value) return '';
  const versionIndex = selectedVersions.value.findIndex((version) => version.id === characterVersionDeleteTargetId.value);
  return versionIndex >= 0 ? `V${versionIndex + 1}` : '';
});

watch(selectedId, () => {
  isEditing.value = false;
  settingsMenuOpen.value = false;
  colorModalOpen.value = false;
  nameModalOpen.value = false;
  relationshipModalOpen.value = false;
  relationshipDeleteModalOpen.value = false;
  deleteTargetModalOpen.value = false;
  characterDeleteTargetId.value = '';
  characterVersionDeleteTargetId.value = '';
  relationshipDeleteTargetId.value = '';
});

watch(
  () => route.query.tagId,
  (queryTagId) => {
    tagFilterId.value = typeof queryTagId === 'string' && queryTagId ? queryTagId : 'すべて';
  },
  { immediate: true }
);

watch(tagFilterId, (value) => {
  const current = typeof route.query.tagId === 'string' && route.query.tagId ? route.query.tagId : 'すべて';
  if (current === value) return;
  router.replace({
    path: route.path,
    query: value === 'すべて'
      ? { ...route.query, tagId: undefined }
      : { ...route.query, tagId: value },
  });
});

watch(groupedProfileFields, (groups) => {
  const nextState = { ...collapsedSections.value };
  groups.forEach((group) => {
    if (!(group.section in nextState)) nextState[group.section] = false;
  });
  collapsedSections.value = nextState;
}, { immediate: true });

watch(
  filteredCharacters,
  (items) => {
    if (!items.length) {
      selectedId.value = '';
      return;
    }
    if (!selectedId.value || !items.some((character) => character.id === selectedId.value)) {
      selectedId.value = items[0].id;
    }
  },
  { immediate: true }
);

function addCharacter() {
  const now = nowIso();
  const c: Character = {
    id: createId(), projectId, name: '新しい人物', ruby: '', alias: '', age: '', gender: '', birthday: '',
    color: DEFAULT_CHARACTER_COLOR,
    race: '', affiliation: '', origin: '', height: '', weight: '', role: '', personality: '', goal: '',
    behaviorPrinciple: '', likes: '', dislikes: '', weakness: '', secret: '', battleStyle: '', weapon: '',
    magic: '', firstPerson: '', secondPerson: '', speechStyle: '', skill: '', appearance: '', hairStyle: '',
    hairColor: '', eyeColor: '', build: '', clothing: '', equipment: '', tagIds: [], memo: '',
    customFields: [], createdAt: now, updatedAt: now,
  };
  dataStore.characters.unshift(c);
  ensureCharacterVersions(c);
  selectedId.value = c.id;
  nextTick(() => {
    nameModalOpen.value = true;
  });
}

function addVersion() {
  if (!selected.value) return;
  const version = createCharacterVersion(selected.value);
  if (version) {
    selected.value.updatedAt = nowIso();
    syncCharacterActiveVersion(selected.value);
  }
}

function requestDeleteCharacter() {
  if (!selected.value) return;
  deleteTargetModalOpen.value = true;
}

function confirmDeleteCharacter() {
  if (!characterDeleteTargetId.value) return;
  const deleteIndex = characters.value.findIndex((character) => character.id === characterDeleteTargetId.value);
  const fallbackId =
    characters.value[deleteIndex + 1]?.id
    ?? characters.value[deleteIndex - 1]?.id
    ?? '';
  deleteCharacter(characterDeleteTargetId.value);
  characterDeleteTargetId.value = '';
  selectedId.value = fallbackId;
}

function selectDeleteTarget(item: SelectionModalItem) {
  deleteTargetModalOpen.value = false;
  if (item.id === 'character') {
    characterDeleteTargetId.value = selected.value?.id ?? '';
    return;
  }
  if (item.id.startsWith('version:')) {
    characterVersionDeleteTargetId.value = item.id.replace('version:', '');
  }
}

function confirmDeleteVersion() {
  if (!selected.value || !characterVersionDeleteTargetId.value) return;
  deleteCharacterVersion(selected.value, characterVersionDeleteTargetId.value);
  characterVersionDeleteTargetId.value = '';
  isEditing.value = false;
  settingsMenuOpen.value = false;
  nameModalOpen.value = false;
}

function switchVersion(versionId: string) {
  if (!selected.value) return;
  activateCharacterVersion(selected.value, versionId);
  isEditing.value = false;
  settingsMenuOpen.value = false;
  nameModalOpen.value = false;
}

function toggleTag(item: SelectionModalItem) {
  if (!selected.value) return;
  selected.value.tagIds ??= [];
  if (selected.value.tagIds.includes(item.id)) {
    selected.value.tagIds = selected.value.tagIds.filter((id) => id !== item.id);
  } else {
    selected.value.tagIds.push(item.id);
  }
  selected.value.updatedAt = nowIso();
  syncCharacterActiveVersion(selected.value);
}

function updateName(name: string, ruby: string) {
  if (!selected.value) return;
  selected.value.name = name.trim() || '名前未設定';
  selected.value.ruby = ruby.trim();
  selected.value.updatedAt = nowIso();
  syncCharacterActiveVersion(selected.value);
  nameModalOpen.value = false;
}

function updateCharacterColor(item: ColorPaletteItem) {
  if (!selected.value) return;
  selected.value.color = item.id;
  selected.value.updatedAt = nowIso();
  syncCharacterActiveVersion(selected.value);
  colorModalOpen.value = false;
}

function updateTagFilter(item: SelectionModalItem) {
  tagFilterId.value = item.id;
  tagFilterModalOpen.value = false;
}

function openRelationshipModal() {
  if (!selected.value || relationshipCharacterOptions.value.length < 1) return;
  relationshipModalOpen.value = true;
}

function saveRelationship(targetId: string, relationType: string, impressionFromCurrent: string, impressionToCurrent: string) {
  if (!selected.value) return;
  const existing = relationships.value.find((relationship) =>
    (relationship.characterAId === selected.value!.id && relationship.characterBId === targetId)
    || (relationship.characterAId === targetId && relationship.characterBId === selected.value!.id)
  );

  if (existing) {
    if (existing.characterAId === selected.value.id) {
      existing.relationType = relationType.trim() || '関係性未設定';
      existing.emotionAtoB = impressionFromCurrent;
      existing.emotionBtoA = impressionToCurrent;
    } else {
      existing.relationType = relationType.trim() || '関係性未設定';
      existing.emotionBtoA = impressionFromCurrent;
      existing.emotionAtoB = impressionToCurrent;
    }
    relationshipModalOpen.value = false;
    return;
  }

  const relationship: Relationship = {
    id: createId(),
    projectId,
    characterAId: selected.value.id,
    characterBId: targetId,
    relationType: relationType.trim() || '関係性未設定',
    emotionAtoB: impressionFromCurrent,
    emotionBtoA: impressionToCurrent,
    publicRelation: '',
    hiddenRelation: '',
    changePlan: '',
    tagIds: [],
    memo: '',
  };
  dataStore.relationships.unshift(relationship);
  relationshipModalOpen.value = false;
}

function requestDeleteRelationship() {
  if (!selectedRelationshipSummaries.value.length) return;
  relationshipDeleteModalOpen.value = true;
}

function selectRelationshipDeleteTarget(item: SelectionModalItem) {
  relationshipDeleteModalOpen.value = false;
  relationshipDeleteTargetId.value = item.id;
}

function confirmDeleteRelationship() {
  if (!relationshipDeleteTargetId.value) return;
  deleteRelationship(relationshipDeleteTargetId.value);
  relationshipDeleteTargetId.value = '';
}

function isCharacterProfileKey(fieldKey?: string): fieldKey is CharacterProfileKey {
  return characterProfileKeys.includes(fieldKey as CharacterProfileKey);
}

function profileFieldValue(field: CharacterProfileField) {
  if (!selected.value) return '';
  if (field.source === 'default' && isCharacterProfileKey(field.fieldKey)) {
    return selected.value[field.fieldKey] ?? '';
  }
  return selected.value.customFields.find((customField) => customField.templateId === field.id)?.value ?? '';
}

function updateProfileFieldValue(field: CharacterProfileField, value: string) {
  if (!selected.value) return;
  if (field.source === 'default' && isCharacterProfileKey(field.fieldKey)) {
    selected.value[field.fieldKey] = value;
    selected.value.updatedAt = nowIso();
    syncCharacterActiveVersion(selected.value);
    return;
  }

  selected.value.customFields ??= [];
  let customField = selected.value.customFields.find((item) => item.templateId === field.id);
  if (!customField) {
    customField = {
      id: createId(),
      templateId: field.id,
      label: field.label,
      value: '',
      order: field.order,
    };
    selected.value.customFields.push(customField);
  }
  customField.label = field.label;
  customField.value = value;
  customField.order = field.order;
  selected.value.updatedAt = nowIso();
  syncCharacterActiveVersion(selected.value);
}

function versionChanged(version: CharacterVersion) {
  return isCharacterVersionChanged(version);
}

function toggleEditMode() {
  if (!selected.value) return;
  isEditing.value = !isEditing.value;
}

function toggleProfileSection(section: string) {
  collapsedSections.value = {
    ...collapsedSections.value,
    [section]: !collapsedSections.value[section],
  };
}

</script>

<template>
  <AppHeader :project-id="projectId" title="登場人物" />
  <main class="page split-page">
    <section class="card side-list fixed-side-list">
      <div class="side-toolbar-stack">
        <div class="list-toolbar">
          <button @click="addCharacter">＋ 追加</button>
          <b>{{ characters.length }}</b>
        </div>
        <div class="term-side-toolbar">
          <button type="button" class="list-button tag-filter-button compact-filter-button" @click="tagFilterModalOpen = true">
            <span class="tag-filter-label compact-filter-label">タグ検索</span>
          </button>
          <input v-model="keyword" class="side-search-input compact-side-search-input" placeholder="人物検索" />
        </div>
      </div>
      <div class="scroll-list">
        <button
          v-for="c in filteredCharacters"
          :key="c.id"
          class="list-button tag-list-button"
          :class="{ active: c.id === selectedId }"
          :style="{ borderLeftColor: c.color || DEFAULT_CHARACTER_COLOR }"
          @click="selectedId = c.id"
        >
          <span class="ruby-stack list-ruby tag-list-main" :class="{ 'no-ruby': !c.ruby }">
            <span v-if="c.ruby" class="ruby-text">{{ c.ruby }}</span>
            <span class="ruby-base">{{ c.name }}</span>
          </span>
        </button>
      </div>
    </section>

    <section
      v-if="selected"
      class="card editor-card fixed-editor-card"
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
            <button type="button" class="secondary" @click="toggleEditMode">{{ isEditing ? '✓' : '✎' }}</button>
            <div class="version-settings-wrap">
              <button type="button" class="secondary" @click="settingsMenuOpen = !settingsMenuOpen">⚙</button>
              <div v-if="settingsMenuOpen" class="version-settings-menu">
                <button type="button" class="secondary" :disabled="selectedVersions.length <= 1" @click="settingsMenuOpen = false; characterVersionDeleteTargetId = activeVersion?.id || ''">バージョン削除</button>
                <button type="button" class="danger" @click="settingsMenuOpen = false; requestDeleteCharacter()">人物削除</button>
              </div>
            </div>
          </div>
        </div>
        <section class="name-display-row compact-name-row">
          <div class="field-label-value">
            <div class="name-label-line">
              <button v-if="isEditing" type="button" class="inline-edit-button" @click="nameModalOpen = true">✎</button>
              <strong class="section-label">名前</strong>
            </div>
            <span class="ruby-stack compact-name-value" :class="{ 'no-ruby': !selected.ruby }">
              <span v-if="selected.ruby" class="ruby-text">{{ selected.ruby }}</span>
              <span class="ruby-base">{{ selected.name || '名前未設定' }}</span>
            </span>
          </div>
        </section>
        <section v-if="!tagModalOpen" class="inline-panel sticky-related-panel">
          <div class="panel-heading sticky-related-heading">
            <div class="sticky-related-inline">
              <button v-if="isEditing" type="button" class="inline-edit-button" @click="tagModalOpen = true">✎</button>
              <span class="sticky-related-label">タグ:</span>
              <div v-if="selectedTags.length" class="sticky-related-chips">
                <span
                  v-for="tag in selectedTags"
                  :key="tag.id"
                  class="selected-chip selected-chip-lined"
                  :style="{ borderLeftColor: tag.color }"
                >
                  {{ tag.name }}
                </span>
              </div>
              <span v-else class="hint-text">未設定</span>
            </div>
          </div>
        </section>
      </div>
      <div class="editor-scroll-body">
        <section v-for="group in groupedProfileFields" :key="group.section" class="profile-section">
          <button type="button" class="section-toggle-header" @click="toggleProfileSection(group.section)">
            <span>{{ collapsedSections[group.section] ? '▶' : '▼' }}</span>
            <strong>{{ group.section }}</strong>
          </button>
          <div v-if="!collapsedSections[group.section]" class="profile-section-body">
            <section v-if="group.section === '基本情報'" class="field">
              <div class="name-label-line">
                <button v-if="isEditing" type="button" class="inline-edit-button" @click="colorModalOpen = true">✎</button>
                <span>色</span>
              </div>
              <div class="select-summary color-summary-lined" :style="{ borderLeftColor: selected.color || DEFAULT_CHARACTER_COLOR }">
                <strong>{{ selectedColorSummary }}</strong>
              </div>
            </section>
            <TextField
              v-for="field in group.fields"
              :key="field.id"
              :label="field.label"
              :model-value="profileFieldValue(field)"
              :type="field.inputType || 'textarea'"
              :options="field.selectOptions"
              @update:model-value="updateProfileFieldValue(field, $event)"
            />
          </div>
        </section>
        <section class="inline-panel relationship-panel">
          <div class="panel-heading">
            <h3>相関</h3>
            <div class="button-row">
              <button type="button" class="secondary" :disabled="relationshipCharacterOptions.length < 1" @click="openRelationshipModal">追加</button>
              <button type="button" class="secondary" :disabled="!selectedRelationshipSummaries.length" @click="requestDeleteRelationship">削除</button>
            </div>
          </div>
          <div v-if="selectedRelationshipSummaries.length" class="relationship-summary-list">
            <article v-for="item in selectedRelationshipSummaries" :key="item.id" class="relationship-summary-item">
              <strong>{{ item.name }} <span>{{ item.relationType }}</span></strong>
              <p v-if="item.impression">{{ item.impression }}</p>
            </article>
          </div>
          <p v-else class="hint-text">未設定</p>
        </section>
      </div>

      <SelectionModal
        :open="deleteTargetModalOpen"
        title="削除対象"
        :items="deleteTargetItems"
        :selected-id="''"
        empty-text="削除できる対象がありません。"
        @close="deleteTargetModalOpen = false"
        @select="selectDeleteTarget"
      />
      <SelectionModal
        :open="tagModalOpen"
        title="関連タグ"
        :items="addTagItems"
        layout="grid"
        mode="check"
        :selected-ids="selected?.tagIds || []"
        empty-text="タグがありません。"
        @close="tagModalOpen = false"
        @toggle="toggleTag"
      />
      <SelectionModal
        :open="relationshipDeleteModalOpen"
        title="削除する相関"
        :items="relationshipDeleteItems"
        :selected-id="''"
        empty-text="削除できる相関がありません。"
        @close="relationshipDeleteModalOpen = false"
        @select="selectRelationshipDeleteTarget"
      />
      <CharacterNameModal
        :open="nameModalOpen"
        :name="selected.name"
        :ruby="selected.ruby"
        @close="nameModalOpen = false"
        @save="updateName"
      />
      <CharacterRelationshipModal
        :open="relationshipModalOpen"
        :characters="relationshipCharacterOptions"
        :relations="relationshipDrafts"
        @close="relationshipModalOpen = false"
        @save="saveRelationship"
      />
      <ColorPaletteModal
        :open="colorModalOpen"
        title="人物色一覧"
        :items="tagColorItems"
        :selected-id="selected?.color || ''"
        @close="colorModalOpen = false"
        @select="updateCharacterColor"
      />
    </section>

    <section v-else class="card empty-state">
      <p>該当する人物がありません。</p>
      <div class="button-row">
        <button type="button" class="secondary" @click="tagFilterModalOpen = true">タグ検索</button>
        <button type="button" class="secondary" @click="tagFilterId = 'すべて'; keyword = ''">絞り込み解除</button>
      </div>
    </section>

    <SelectionModal
      :open="tagFilterModalOpen"
      title="タグ検索"
      :items="tagFilterItems"
      :selected-id="tagFilterId"
      empty-text="タグがありません。"
      @close="tagFilterModalOpen = false"
      @select="updateTagFilter"
    />

    <ConfirmModal
      :open="Boolean(characterDeleteTargetId)"
      title="人物を削除"
      message="この人物を削除します。人物の関係データや登場記録からも参照を外します。"
      confirm-label="人物を削除"
      @close="characterDeleteTargetId = ''"
      @confirm="confirmDeleteCharacter"
    />
    <ConfirmModal
      :open="Boolean(characterVersionDeleteTargetId)"
      title="人物版を削除"
      :message="`${versionDeleteTargetLabel} を削除します。残っている版へ切り替わります。`"
      confirm-label="版を削除"
      @close="characterVersionDeleteTargetId = ''"
      @confirm="confirmDeleteVersion"
    />
    <ConfirmModal
      :open="Boolean(relationshipDeleteTargetId)"
      title="相関を削除"
      message="この相関を削除します。"
      confirm-label="相関を削除"
      @close="relationshipDeleteTargetId = ''"
      @confirm="confirmDeleteRelationship"
    />
  </main>
</template>
