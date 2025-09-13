<template>
  <q-page>
    <q-pull-to-refresh @refresh="loadTimeline">
      <div v-if="!authStore.isLoggedIn" class="text-center q-pa-xl text-grey">
        <p>Please log in to see the timeline.</p>
        <q-btn to="/profile" color="primary" label="Go to Login" />
      </div>
      <div v-else-if="isLoading" class="text-center q-pa-md">
        <q-spinner-dots color="primary" size="40px" />
      </div>
      <div v-else-if="error" class="text-center q-pa-md text-negative">
        {{ error }}
      </div>
      <q-list v-else separator>
        <post-item
          v-for="item in timeline"
          :key="item.post.uri"
          :post="item"
        />
      </q-list>
    </q-pull-to-refresh>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from 'stores/auth-store';
import type { FeedViewPost } from '@atproto/api/dist/client/types/app/bsky/feed/defs';
import PostItem from 'components/PostItem.vue';

const authStore = useAuthStore();
const timeline = ref<FeedViewPost[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

async function loadTimeline(done?: () => void) {
  if (!authStore.isLoggedIn) {
    timeline.value = []; // Clear timeline if logged out
    if (done) done();
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const response = await authStore.agent.getTimeline({ limit: 50 });
    timeline.value = response.data.feed;
  } catch (e) {
    console.error('Failed to load timeline:', e);
    error.value = 'Failed to load timeline. Please try again.';
  } finally {
    isLoading.value = false;
    if (done) {
      done();
    }
  }
}

// Watch for login/logout changes to refresh the timeline
watch(() => authStore.isLoggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    void loadTimeline();
  }
});

onMounted(() => {
  void loadTimeline();
});
</script>