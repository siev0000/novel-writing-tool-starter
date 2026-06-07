<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { applyGlobalScale } from './utils/scale';

let cleanup: (() => void) | undefined;

onMounted(() => {
  cleanup = applyGlobalScale('scalable-frame');
});

onBeforeUnmount(() => {
  cleanup?.();
});
</script>

<template>
  <div class="app-stage">
    <div id="scalable-frame" class="app-frame">
      <div id="scalable-root" class="app-shell">
        <router-view />
      </div>
    </div>
  </div>
</template>
