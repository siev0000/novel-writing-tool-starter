<script setup lang="ts">
import { computed, ref, watch } from 'vue';

export interface SelectionModalItem {
  id: string;
  label: string;
  category?: string;
  description?: string;
  meta?: string;
  color?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<{
  open: boolean;
  title: string;
  items: SelectionModalItem[];
  mode?: 'select' | 'check';
  layout?: 'list' | 'grid';
  selectedId?: string;
  selectedIds?: string[];
  emptyText?: string;
  uncategorizedLabel?: string;
}>(), {
  mode: 'select',
  layout: 'list',
  selectedId: '',
  selectedIds: () => [],
  emptyText: '選択できる項目がありません。',
  uncategorizedLabel: '未分類',
});

const emit = defineEmits<{
  close: [];
  select: [item: SelectionModalItem];
  toggle: [item: SelectionModalItem];
}>();

const keyword = ref('');

watch(
  () => props.open,
  (open) => {
    if (open) keyword.value = '';
  }
);

const filteredItems = computed(() => {
  const query = keyword.value.trim().toLowerCase();
  if (!query) return props.items;

  return props.items.filter((item) => {
    return [item.label, item.category, item.description, item.meta]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query));
  });
});

const groupedItems = computed(() => {
  const groups = new Map<string, SelectionModalItem[]>();
  filteredItems.value.forEach((item) => {
    const category = item.category || props.uncategorizedLabel;
    groups.set(category, [...(groups.get(category) ?? []), item]);
  });
  return Array.from(groups, ([category, items]) => ({ category, items }));
});

function selectItem(item: SelectionModalItem) {
  if (item.disabled) return;
  if (props.mode === 'check') {
    emit('toggle', item);
  } else {
    emit('select', item);
  }
}

function isSelected(item: SelectionModalItem) {
  return props.mode === 'check'
    ? props.selectedIds.includes(item.id)
    : item.id === props.selectedId;
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop">
      <section class="modal-panel" role="dialog" aria-modal="true" :aria-label="title" @click.stop>
        <header class="modal-header">
          <h2>{{ title }}</h2>
          <button class="ghost" type="button" @click="emit('close')">閉じる</button>
        </header>

        <input v-model="keyword" class="modal-search" placeholder="一覧から検索" />

        <div v-if="groupedItems.length" class="modal-list" :class="`modal-list-${layout}`">
          <section v-for="group in groupedItems" :key="group.category" class="modal-group">
            <h3>{{ group.category }}</h3>
            <div class="modal-items">
              <button
                v-for="item in group.items"
                :key="item.id"
                type="button"
                class="modal-item"
                :class="{ active: isSelected(item), checkable: mode === 'check' }"
                :disabled="item.disabled"
                :title="item.description || item.meta || item.label"
                @click="selectItem(item)"
              >
                <span v-if="mode === 'check'" class="check-mark" :class="{ checked: isSelected(item) }"></span>
                <span v-if="item.color" class="tag-swatch" :style="{ backgroundColor: item.color }"></span>
                <span class="modal-item-body">
                  <b>{{ item.label }}</b>
                  <small v-if="item.meta">{{ item.meta }}</small>
                </span>
                <span v-if="item.description" class="item-tooltip">{{ item.description }}</span>
              </button>
            </div>
          </section>
        </div>

        <p v-else class="empty-state">{{ emptyText }}</p>

        <div class="button-row">
          <button type="button" class="secondary" @click="emit('close')">閉じる</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
