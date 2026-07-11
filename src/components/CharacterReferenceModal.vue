<script setup lang="ts">
import { computed } from 'vue';
import { compareCharacterProfileFields, dataStore } from '../store/data';
import type { Character, CharacterProfileField, Tag } from '../types/models';

const props = defineProps<{
  projectId: string;
  characterId: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const character = computed(() =>
  dataStore.characters.find((item) => item.projectId === props.projectId && item.id === props.characterId)
);

const characterTags = computed(() => {
  const currentCharacter = character.value;
  if (!currentCharacter) return [];
  const tagMap = new Map(dataStore.tags.filter((tag) => tag.projectId === props.projectId).map((tag) => [tag.id, tag]));
  return currentCharacter.tagIds.map((id) => tagMap.get(id)).filter((tag): tag is Tag => Boolean(tag));
});

function profileFieldValue(currentCharacter: Character, field: CharacterProfileField) {
  if (field.source === 'default' && field.fieldKey) {
    const value = (currentCharacter as unknown as Record<string, unknown>)[field.fieldKey];
    return typeof value === 'string' ? value : '';
  }
  return currentCharacter.customFields.find((item) => item.templateId === field.id)?.value ?? '';
}

const profileGroups = computed(() => {
  const currentCharacter = character.value;
  const project = dataStore.projects.find((item) => item.id === props.projectId);
  if (!currentCharacter || !project) return [];

  const groups = new Map<string, Array<{ id: string; label: string; value: string }>>();
  (project.characterProfileFields ?? [])
    .slice()
    .sort(compareCharacterProfileFields)
    .forEach((field) => {
      const value = profileFieldValue(currentCharacter, field).trim();
      if (!value) return;
      const section = field.section || 'その他';
      groups.set(section, [...(groups.get(section) ?? []), { id: field.id, label: field.label, value }]);
    });

  return Array.from(groups, ([section, fields]) => ({ section, fields }));
});
</script>

<template>
  <Teleport to="body">
    <div v-if="character" class="modal-backdrop">
      <section class="modal-panel character-reference-modal" role="dialog" aria-modal="true" :aria-label="`${character.name}の説明`" @click.stop>
        <header class="character-reference-header">
          <div class="character-reference-title">
            <h2>{{ character.name }}</h2>
            <span v-if="character.ruby">{{ character.ruby }}</span>
            <small v-if="character.alias">{{ character.alias }}</small>
          </div>
          <div v-if="characterTags.length" class="character-reference-tags">
            <span v-for="tag in characterTags" :key="tag.id" class="selected-chip selected-chip-lined" :style="{ borderLeftColor: tag.color }">{{ tag.name }}</span>
          </div>
        </header>

        <div class="character-reference-scroll">
          <div v-if="profileGroups.length" class="character-reference-profile">
            <section v-for="group in profileGroups" :key="group.section" class="profile-section">
              <div class="section-toggle-header"><strong>{{ group.section }}</strong></div>
              <div class="profile-section-body">
                <div v-for="field in group.fields" :key="field.id" class="info-row">
                  <span>{{ field.label }}</span>
                  <p>{{ field.value }}</p>
                </div>
              </div>
            </section>
          </div>
          <p v-else class="empty-state">入力済みのプロフィール項目はありません。</p>
        </div>

        <div class="button-row modal-footer">
          <button type="button" class="secondary" @click="emit('close')">閉じる</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
