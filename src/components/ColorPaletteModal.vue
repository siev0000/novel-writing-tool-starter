<script setup lang="ts">
import { computed } from 'vue';

export type ColorPaletteItem = {
  id: string;
  label: string;
  color: string;
  family: string;
  shade: string;
};

const props = defineProps<{
  open: boolean;
  title: string;
  items: ColorPaletteItem[];
  selectedId?: string;
}>();

const emit = defineEmits<{
  close: [];
  select: [item: ColorPaletteItem];
}>();

const families = computed(() => Array.from(new Set(props.items.map((item) => item.family))));
const shades = computed(() => Array.from(new Set(props.items.map((item) => item.shade))));
const paletteMap = computed(() => {
  const map = new Map<string, ColorPaletteItem>();
  props.items.forEach((item) => {
    map.set(`${item.family}::${item.shade}`, item);
  });
  return map;
});

function paletteItem(family: string, shade: string) {
  return paletteMap.value.get(`${family}::${shade}`);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop">
      <section class="modal-panel palette-modal" role="dialog" aria-modal="true" :aria-label="title" @click.stop>
        <header class="modal-header">
          <h2>{{ title }}</h2>
        </header>

        <div class="palette-table-wrap">
          <div class="palette-table" :style="{ gridTemplateColumns: `72px repeat(${families.length}, minmax(56px, 1fr))` }">
            <div class="palette-corner"></div>
            <div v-for="family in families" :key="family" class="palette-family">{{ family }}</div>

            <template v-for="shade in shades" :key="shade">
              <div class="palette-shade">{{ shade }}</div>
              <button
                v-for="family in families"
                :key="`${family}-${shade}`"
                type="button"
                class="palette-cell"
                :class="{ active: paletteItem(family, shade)?.id === selectedId, empty: !paletteItem(family, shade) }"
                :style="{ backgroundColor: paletteItem(family, shade)?.color || 'transparent' }"
                :title="paletteItem(family, shade)?.label || ''"
                :disabled="!paletteItem(family, shade)"
                @click="paletteItem(family, shade) && emit('select', paletteItem(family, shade)!)"
              >
                {{ shade }}
              </button>
            </template>
          </div>
        </div>

        <div class="button-row modal-footer">
          <button type="button" class="secondary" @click="emit('close')">閉じる</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
