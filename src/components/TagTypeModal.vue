<script setup lang="ts">
import { computed, ref, watch } from 'vue';

export interface TagTypeModalItem {
  id: string;
  label: string;
  category: string;
  removable?: boolean;
}

const props = defineProps<{
  open: boolean;
  title?: string;
  items: TagTypeModalItem[];
  selectedId?: string;
}>();

const emit = defineEmits<{
  close: [];
  select: [item: TagTypeModalItem];
  add: [label: string];
  remove: [item: TagTypeModalItem];
}>();

const keyword = ref('');
const draftLabel = ref('');
const editing = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    keyword.value = '';
    draftLabel.value = '';
    editing.value = false;
  }
);

const filteredItems = computed(() => {
  const query = keyword.value.trim().toLowerCase();
  if (!query) return props.items;
  return props.items.filter((item) =>
    [item.label, item.category]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query))
  );
});

const groupedItems = computed(() => {
  const groups = new Map<string, TagTypeModalItem[]>();
  filteredItems.value.forEach((item) => {
    groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
  });
  return Array.from(groups, ([category, items]) => ({ category, items }));
});

function submitAdd() {
  const value = draftLabel.value.trim();
  if (!value) return;
  emit('add', value);
  draftLabel.value = '';
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop">
      <section class="modal-panel selection-modal tag-type-modal" role="dialog" aria-modal="true" :aria-label="title || 'タグ分類'" @click.stop>
        <header class="modal-header">
          <h2>{{ title || 'タグ分類' }}</h2>
          <div class="header-actions-inline">
            <button type="button" class="secondary" @click="editing = !editing">{{ editing ? '完了' : '✎' }}</button>
            <button class="ghost" type="button" @click="emit('close')">閉じる</button>
          </div>
        </header>

        <div class="tag-type-modal-tools">
          <input v-model="keyword" class="modal-search" placeholder="分類名を検索" />
          <div v-if="editing" class="tag-type-modal-add-row">
            <input v-model="draftLabel" placeholder="追加する分類名" @keydown.enter.prevent="submitAdd" />
            <button type="button" @click="submitAdd">追加</button>
          </div>
        </div>

        <div v-if="groupedItems.length" class="modal-list">
          <section v-for="group in groupedItems" :key="group.category" class="modal-group">
            <h3>{{ group.category }}</h3>
            <div class="modal-items">
              <div
                v-for="item in group.items"
                :key="item.id"
                class="modal-item tag-type-modal-item"
                :class="{ active: selectedId === item.id }"
              >
                <button type="button" class="tag-type-modal-select" @click="emit('select', item)">
                  <span class="modal-item-body">
                    <b>{{ item.label }}</b>
                  </span>
                </button>
                <button
                  v-if="editing && item.removable"
                  type="button"
                  class="danger compact-button"
                  @click.stop="emit('remove', item)"
                >
                  削除
                </button>
              </div>
            </div>
          </section>
        </div>

        <p v-else class="empty-state">選択できる分類がありません。</p>

        <div class="button-row">
          <button type="button" class="secondary" @click="emit('close')">閉じる</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
