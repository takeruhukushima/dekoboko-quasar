<template>
  <q-layout view="lHh Lpr lFf">
    <q-header bordered>
      <q-toolbar>
        <q-toolbar-title class="text-center"> dekoboko </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer bordered class="bg-white text-primary">
      <q-tabs no-caps active-color="primary" indicator-color="transparent" class="justify-around">
        <q-route-tab to="/" icon="home" />
        <q-route-tab to="/search" icon="search" />
        <q-btn flat round icon="add_circle" size="lg" @click="openComposer" />
        <q-route-tab to="/profile" icon="person" />
      </q-tabs>
    </q-footer>

    <q-dialog v-model="composerOpen" position="bottom">
      <composer-component @close="composerOpen = false" />
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ComposerComponent from 'components/ComposerComponent.vue';

const composerOpen = ref(false);

function openComposer() {
  composerOpen.value = true;
}
</script>

<style lang="scss">
.q-toolbar__title {
  font-size: 18px;
  font-weight: bold;
}

.q-footer .q-tabs {
  .q-btn {
    color: $primary;
  }
}
</style>
