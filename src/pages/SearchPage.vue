<template>
  <q-page>
    <q-card flat>
      <q-tabs
        v-model="searchType"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="justify"
      >
        <q-tab name="request" label="Find Requests" />
        <q-tab name="help" label="Find Help" />
      </q-tabs>

      <q-separator />

      <q-card-section>
        <q-input
          v-model="searchQuery"
          filled
          label="Search by skill (e.g., python, vue)"
          @keyup.enter="searchPosts"
          hint="Leave empty to see all posts"
        >
          <template v-slot:append>
            <q-icon name="search" class="cursor-pointer" @click="searchPosts" />
          </template>
        </q-input>
      </q-card-section>
    </q-card>

    <div v-if="isLoading" class="text-center q-pa-md">
      <q-spinner-dots color="primary" size="40px" />
    </div>
    <div v-else-if="error" class="text-center q-pa-md text-grey-7">
      {{ error }}
    </div>
    <q-list v-else separator>
      <post-item
        v-for="post in searchResults"
        :key="post.uri"
        :post="post"
        @reply-to-post="handleReplyToPost"
      />
    </q-list>

    <q-dialog v-model="showReplyComposer">
      <composer-component
        v-if="replyToPost"
        :reply-to="replyToPost"
        @close="showReplyComposer = false"
      />
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useAuthStore } from 'stores/auth-store';
import type { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs';
import PostItem from 'components/PostItem.vue';
import ComposerComponent from 'components/ComposerComponent.vue';

const authStore = useAuthStore();
const searchType = ref('request'); // 'request' or 'help'
const searchQuery = ref('');
const searchResults = ref<PostView[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const showReplyComposer = ref(false);
const replyToPost = ref<PostView | undefined>(undefined);

function handleReplyToPost(post: PostView) {
  replyToPost.value = post;
  showReplyComposer.value = true;
}

async function searchPosts() {
  // Do not search if not logged in
  if (!authStore.isLoggedIn) {
    error.value = 'Please log in to search.';
    return;
  }

  isLoading.value = true;
  error.value = null;
  searchResults.value = []; // Start with a clean slate

  try {
    // Construct the full query with the type hashtag
    const typeTag = searchType.value === 'request' ? '#dekobokoRequest' : '#dekobokoHelp';
  
    // If there's a search query, combine it with the type tag. Otherwise, just use the type tag.
    const fullQuery = searchQuery.value.trim()
      ? `${typeTag} ${searchQuery.value.trim()}`
      : typeTag;

    const response = await authStore.agent.app.bsky.feed.searchPosts({ q: fullQuery, limit: 50 });
    searchResults.value = response.data.posts;

    if (response.data.posts.length === 0) {
      error.value = 'No results found.';
    }
  } catch (e) {
    console.error('Failed to search posts:', e);
    error.value = 'Failed to search posts. Please try again.';
  } finally {
    isLoading.value = false;
  }
}

// Clear results when search type changes
watch(searchType, () => {
  searchResults.value = [];
  error.value = null;
  searchQuery.value = ''; // Also clear the search query
  void searchPosts(); // Trigger a new search when the search type changes
});

onMounted(() => {
  void searchPosts();
});
</script>
