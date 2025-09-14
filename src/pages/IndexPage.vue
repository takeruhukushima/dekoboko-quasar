<template>
  <q-page class="q-pa-md">
    <div v-if="!authStore.isLoggedIn" class="text-center q-pa-xl text-grey">
      <p>Please log in to see the timeline.</p>
      <q-btn to="/profile" color="primary" label="Go to Login" />
    </div>
    
    <template v-else>
      <!-- New Post Button -->
      <div class="row justify-end q-mb-md">
        <q-btn 
          color="primary" 
          icon="add" 
          label="New Post" 
          @click="composerDialog?.show()"
          unelevated
          no-caps
          rounded
        />
      </div>

      <!-- Timeline -->
      <q-pull-to-refresh @refresh="loadTimeline">
        <div v-if="isLoading && timeline.length === 0" class="text-center q-pa-lg">
          <q-spinner-dots color="primary" size="40px" />
        </div>
        <div v-else-if="error" class="text-center q-pa-md text-negative">
          {{ error }}
        </div>
        <q-list v-else-if="timeline.length > 0" separator>
          <post-item
            v-for="post in timeline"
            :key="post.uri"
            :post="post"
            class="q-mb-sm"
          />
        </q-list>
        <div v-else class="text-center q-pa-lg text-grey">
          No posts yet. Be the first to post!
        </div>
      </q-pull-to-refresh>
    </template>
  </q-page>

  <!-- Composer Dialog -->
  <q-dialog ref="composerDialog">
    <composer-component @close="composerDialog?.hide()" @posted="loadTimeline()" />
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { QDialog } from 'quasar';
import { useAuthStore } from 'stores/auth-store';
import type { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs';
import PostItem from 'components/PostItem.vue';
import ComposerComponent from 'components/ComposerComponent.vue';

const authStore = useAuthStore();
const timeline = ref<PostView[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const composerDialog = ref<{ show: () => void; hide: () => void } | null>(null);

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
    // Map the feed items to PostView array
    timeline.value = response.data.feed.map((item: { post: PostView }) => item.post);
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