<template>
  <q-page class="q-pa-md">
    <div v-if="isLoading" class="text-center q-pa-lg">
      <q-spinner-dots color="primary" size="40px" />
    </div>
    <div v-else-if="error" class="text-center q-pa-md text-negative">
      {{ error }}
    </div>
    <template v-else>
      <!-- Main Post -->
      <q-card v-if="mainPost" class="q-mb-md">
        <post-item :post="mainPost" />
      </q-card>

      <!-- Reply Composer -->
      <div v-if="mainPost" class="q-mb-md q-px-sm">
        <q-input
          v-model="replyText"
          filled
          type="textarea"
          placeholder="Write a reply..."
          autogrow
          class="q-mb-sm"
          @keyup.enter.ctrl="submitReply"
        >
          <template v-slot:after>
            <q-btn
              flat
              round
              icon="send"
              color="primary"
              @click="submitReply"
              :disable="!replyText.trim()"
            />
          </template>
        </q-input>
      </div>

      <!-- Replies -->
      <div v-if="replies.length > 0" class="q-mt-lg">
        <div class="text-h6 q-mb-md">Replies</div>
        <q-list separator>
          <post-item
            v-for="reply in replies"
            :key="reply.uri"
            :post="reply"
            class="q-mb-sm"
          />
        </q-list>
      </div>
      <div v-else class="text-center text-grey q-pa-lg">
        No replies yet. Be the first to respond!
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute } from 'vue-router';
import { useAuthStore } from 'stores/auth-store';
import { RichText } from '@atproto/api';
import type { ThreadViewPost, PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs';
import type { AppBskyRichtextFacet } from '@atproto/api';
import PostItem from 'components/PostItem.vue';

const route = useRoute();
const authStore = useAuthStore();
const $q = useQuasar();

const mainPost = ref<PostView | null>(null);
const replies = ref<PostView[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const replyText = ref('');
const isPostingReply = ref(false);

async function submitReply() {
  if (!replyText.value.trim() || !mainPost.value) return;
  
  isPostingReply.value = true;
  try {
    const rt = new RichText({ text: replyText.value });
    await rt.detectFacets(authStore.agent);
    
    const postRecord: {
      text: string;
      facets?: AppBskyRichtextFacet.Main[];
      reply: {
        root: { uri: string; cid: string };
        parent: { uri: string; cid: string };
      };
      createdAt: string;
    } = {
      text: rt.text,
      reply: {
        root: {
          uri: mainPost.value.uri,
          cid: mainPost.value.cid,
        },
        parent: {
          uri: mainPost.value.uri,
          cid: mainPost.value.cid,
        },
      },
      createdAt: new Date().toISOString(),
    };

    if (rt.facets) {
      postRecord.facets = rt.facets;
    }

    await authStore.agent.post(postRecord);
    
    replyText.value = '';
    await loadThread();
    $q.notify({ color: 'positive', message: 'Reply posted' });
  } catch (error) {
    console.error('Failed to post reply:', error);
    $q.notify({ color: 'negative', message: 'Failed to post reply' });
  } finally {
    isPostingReply.value = false;
  }
}

async function loadThread() {
  if (!authStore.isLoggedIn) {
    error.value = 'Please log in to view this thread.';
    isLoading.value = false;
    return;
  }

  const postUri = route.params.uri as string;
  if (!postUri) {
    error.value = 'Invalid post URL';
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const response = await authStore.agent.getPostThread({
      uri: postUri,
      depth: 10, // Adjust depth as needed
    });

    const thread = response.data.thread;
    if (thread && typeof thread === 'object' && 'post' in thread) {
      mainPost.value = thread.post;
      
      // Extract replies
      if (thread.replies && Array.isArray(thread.replies)) {
        replies.value = thread.replies
          .filter(reply => reply && typeof reply === 'object' && 'post' in reply)
          .map(reply => (reply as ThreadViewPost).post);
      } else {
        replies.value = [];
      }
    }
  } catch (e) {
    console.error('Failed to load thread:', e);
    error.value = 'Failed to load thread. Please try again.';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadThread();
});
</script>
