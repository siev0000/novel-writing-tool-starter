<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import SelectionModal from '../components/SelectionModal.vue';
import type { SelectionModalItem } from '../components/SelectionModal.vue';
import { dataStore } from '../store/data';

const route = useRoute();
const router = useRouter();
const projectId = route.params.projectId as string;
const selectedCharacterId = ref('');
const selectedRelationshipId = ref('');
const characterSelectModalOpen = ref(false);
const detailPanelCollapsed = ref(false);

const GRAPH_WIDTH = 920;
const GRAPH_HEIGHT = 900;
const CENTER_X = GRAPH_WIDTH / 2;
const CENTER_Y = 470;
const CENTER_RADIUS = 75;
const NODE_RADIUS = 66;

const characters = computed(() =>
  dataStore.characters
    .filter((character) => character.projectId === projectId)
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
);

const relationships = computed(() =>
  dataStore.relationships.filter((relationship) => relationship.projectId === projectId)
);

watch(
  characters,
  (items) => {
    if (!items.length) {
      selectedCharacterId.value = '';
      selectedRelationshipId.value = '';
      return;
    }
    if (!selectedCharacterId.value || !items.some((character) => character.id === selectedCharacterId.value)) {
      selectedCharacterId.value = items[0].id;
      selectedRelationshipId.value = '';
    }
  },
  { immediate: true }
);

const selectedCharacter = computed(() =>
  characters.value.find((character) => character.id === selectedCharacterId.value)
);

function characterName(characterId: string) {
  return characters.value.find((character) => character.id === characterId)?.name || '名前未設定';
}

const connectedRelationships = computed(() => {
  if (!selectedCharacter.value) return [];
  return relationships.value.filter((relationship) =>
    relationship.characterAId === selectedCharacter.value?.id || relationship.characterBId === selectedCharacter.value?.id
  );
});

const selectedRelationship = computed(() =>
  connectedRelationships.value.find((relationship) => relationship.id === selectedRelationshipId.value) ?? null
);

const graphNodes = computed(() => {
  if (!selectedCharacter.value) return [];

  const connected = connectedRelationships.value.map((relationship) => {
    const targetId =
      relationship.characterAId === selectedCharacter.value!.id
        ? relationship.characterBId
        : relationship.characterAId;
    const target = characters.value.find((character) => character.id === targetId);
    return {
      relationshipId: relationship.id,
      id: targetId,
      name: target?.name || '名前未設定',
      color: target?.color || '#607d8b',
      relationType: relationship.relationType?.trim() || '',
    };
  });

  const total = connected.length;
  const baseRadiusX = 280;
  const baseRadiusY = 220;

  return connected.map((node, index) => {
    const angle = total <= 1 ? -Math.PI / 2 : -Math.PI / 2 + ((Math.PI * 2) / total) * index;
    const labelLength = node.relationType.length;
    const isVerticalByAngle = Math.abs(Math.sin(angle)) > Math.abs(Math.cos(angle)) * 1.2;
    const extraDistance = node.relationType
      ? Math.min(
          260,
          (isVerticalByAngle ? 120 : 48) + Math.max(0, labelLength - 2) * (isVerticalByAngle ? 22 : 12)
        )
      : 0;
    const radiusX = baseRadiusX + extraDistance;
    const radiusY = baseRadiusY + extraDistance * 0.8;
    const x = Math.cos(angle) * radiusX;
    const y = Math.sin(angle) * radiusY;
    const distance = Math.hypot(x, y) || 1;
    const unitX = x / distance;
    const unitY = y / distance;
    const startX = CENTER_X + unitX * CENTER_RADIUS;
    const startY = CENTER_Y + unitY * CENTER_RADIUS;
    const endX = CENTER_X + x - unitX * NODE_RADIUS;
    const endY = CENTER_Y + y - unitY * NODE_RADIUS;
    const midX = startX + (endX - startX) * 0.58;
    const midY = startY + (endY - startY) * 0.58;
    const labelAngle = Math.atan2(endY - startY, endX - startX);
    const normalizedAngle =
      labelAngle > Math.PI / 2 || labelAngle < -Math.PI / 2 ? labelAngle + Math.PI : labelAngle;
    const isVerticalLabel = Math.abs(unitY) > Math.abs(unitX) * 1.2;

    return {
      ...node,
      left: CENTER_X + x,
      top: CENTER_Y + y,
      startX,
      startY,
      endX,
      endY,
      labelX: midX,
      labelY: midY,
      labelAngle: normalizedAngle * (180 / Math.PI),
      isVerticalLabel,
    };
  });
});

const selectedRelationshipDetail = computed(() => {
  const relationship = selectedRelationship.value;
  const center = selectedCharacter.value;
  if (!relationship || !center) return null;

  const isCenterA = relationship.characterAId === center.id;
  const otherId = isCenterA ? relationship.characterBId : relationship.characterAId;
  const otherName = characterName(otherId);

  return {
    relationType: relationship.relationType?.trim() || '',
    fromCenterLabel: center.name,
    toCenterLabel: otherName,
    fromCenterEmotion: isCenterA ? relationship.emotionAtoB : relationship.emotionBtoA,
    toCenterEmotion: isCenterA ? relationship.emotionBtoA : relationship.emotionAtoB,
    publicRelation: relationship.publicRelation,
    hiddenRelation: relationship.hiddenRelation,
    changePlan: relationship.changePlan,
    memo: relationship.memo,
  };
});

const characterSelectItems = computed<SelectionModalItem[]>(() =>
  characters.value.map((character) => ({
    id: character.id,
    label: character.name || '名前未設定',
    color: character.color || '#607d8b',
  }))
);

function selectCenterCharacter(characterId: string) {
  selectedCharacterId.value = characterId;
  selectedRelationshipId.value = '';
  detailPanelCollapsed.value = false;
}

function selectRelationship(relationshipId: string) {
  const nextId = selectedRelationshipId.value === relationshipId ? '' : relationshipId;
  selectedRelationshipId.value = nextId;
  if (nextId) detailPanelCollapsed.value = false;
}

function openCharacter(characterId: string) {
  router.push(`/project/${projectId}/characters`);
  selectedCharacterId.value = characterId;
}

function openCharacterSelectModal() {
  characterSelectModalOpen.value = true;
}

function selectCharacterItem(item: SelectionModalItem) {
  selectCenterCharacter(item.id);
  characterSelectModalOpen.value = false;
}

function collapseDetailPanel() {
  detailPanelCollapsed.value = true;
}

function expandDetailPanel() {
  detailPanelCollapsed.value = false;
}
</script>

<template>
  <AppHeader :project-id="projectId" title="相関図" />
  <main class="page relationship-page-layout">
    <section v-if="selectedCharacter" class="card relationship-graph-card">
      <div class="relationship-graph-header">
        <button
          type="button"
          class="relationship-character-trigger"
          :style="{ borderLeftColor: selectedCharacter.color || '#607d8b' }"
          @click="openCharacterSelectModal"
        >
          <strong>{{ selectedCharacter.name }}</strong>
        </button>
        <span>中心人物を選択</span>
      </div>

      <div class="relationship-graph-body">
        <div v-if="graphNodes.length" class="relationship-graph-stage">
          <svg
            class="relationship-graph-svg"
            :viewBox="`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`"
            preserveAspectRatio="xMidYMid meet"
          >
            <g v-for="node in graphNodes" :key="`edge-${node.id}`">
              <line
                class="relationship-edge-hit"
                :x1="node.startX"
                :y1="node.startY"
                :x2="node.endX"
                :y2="node.endY"
                @click.stop="selectRelationship(node.relationshipId)"
              />
              <line
                class="relationship-edge-line"
                :class="{ active: node.relationshipId === selectedRelationshipId }"
                :x1="node.startX"
                :y1="node.startY"
                :x2="node.endX"
                :y2="node.endY"
              />
            </g>
          </svg>

          <div class="relationship-center-node" :style="{ borderColor: selectedCharacter.color || '#607d8b' }">
            <span>{{ selectedCharacter.name }}</span>
          </div>

          <template v-for="node in graphNodes" :key="node.id">
            <div
              v-if="node.relationType"
              class="relationship-edge-label"
              :class="{ vertical: node.isVerticalLabel }"
              :style="{
                left: `${node.labelX}px`,
                top: `${node.labelY}px`,
                transform: node.isVerticalLabel
                  ? 'translate(-50%, -50%)'
                  : `translate(-50%, -50%) rotate(${node.labelAngle}deg)`,
              }"
              @click.stop="selectRelationship(node.relationshipId)"
            >
              {{ node.relationType }}
            </div>
            <button
              type="button"
              class="relationship-node"
              :style="{
                left: `${node.left}px`,
                top: `${node.top}px`,
                borderColor: node.color,
              }"
              @click.stop="selectCenterCharacter(node.id)"
              @dblclick="openCharacter(node.id)"
            >
              <span>{{ node.name }}</span>
            </button>
          </template>
        </div>

        <div v-else class="empty-state relationship-empty-state">
          この人物に設定された相関はありません。
        </div>

        <div class="relationship-detail-dock" :class="{ collapsed: detailPanelCollapsed }">
          <div class="relationship-detail-dock-header">
            <strong>{{ selectedRelationshipDetail?.relationType || '相関詳細' }}</strong>
            <button
              v-if="selectedRelationshipDetail && !detailPanelCollapsed"
              type="button"
              class="secondary compact-button"
              @click="collapseDetailPanel"
            >
              最小化
            </button>
            <button
              v-else-if="selectedRelationshipDetail && detailPanelCollapsed"
              type="button"
              class="secondary compact-button"
              @click="expandDetailPanel"
            >
              展開
            </button>
          </div>

          <div v-if="!detailPanelCollapsed" class="relationship-detail-dock-body">
            <div v-if="selectedRelationshipDetail" class="relationship-detail-list">
              <div class="relationship-detail-character-grid">
                <section class="relationship-detail-character-block">
                  <strong>{{ selectedRelationshipDetail.fromCenterLabel }}</strong>
                  <p v-if="selectedRelationshipDetail.fromCenterEmotion" class="relationship-detail-character-text">
                    {{ selectedRelationshipDetail.fromCenterEmotion }}
                  </p>
                </section>
                <section class="relationship-detail-character-block">
                  <strong>{{ selectedRelationshipDetail.toCenterLabel }}</strong>
                  <p v-if="selectedRelationshipDetail.toCenterEmotion" class="relationship-detail-character-text">
                    {{ selectedRelationshipDetail.toCenterEmotion }}
                  </p>
                </section>
              </div>
              <div v-if="selectedRelationshipDetail.publicRelation" class="info-row">
                <span>表向きの関係</span>
                <p>{{ selectedRelationshipDetail.publicRelation }}</p>
              </div>
              <div v-if="selectedRelationshipDetail.hiddenRelation" class="info-row">
                <span>裏の関係</span>
                <p>{{ selectedRelationshipDetail.hiddenRelation }}</p>
              </div>
              <div v-if="selectedRelationshipDetail.changePlan" class="info-row">
                <span>変化予定</span>
                <p>{{ selectedRelationshipDetail.changePlan }}</p>
              </div>
              <div v-if="selectedRelationshipDetail.memo" class="info-row">
                <span>メモ</span>
                <p>{{ selectedRelationshipDetail.memo }}</p>
              </div>
            </div>
            <div v-else class="relationship-detail-empty">
              線を選ぶと詳細を表示します。
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-else class="card empty-state">中心にする人物を選択してください。</section>
  </main>

  <SelectionModal
    :open="characterSelectModalOpen"
    title="中心人物を選択"
    :items="characterSelectItems"
    :selected-id="selectedCharacterId"
    empty-text="人物がありません。"
    @close="characterSelectModalOpen = false"
    @select="selectCharacterItem"
  />
</template>
