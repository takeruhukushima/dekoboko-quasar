<template>
  <q-card style="min-width: 400px">
    <q-card-section class="q-pb-none">
      <div class="text-h6">{{ replyTo ? 'Reply to Post' : 'Create Post' }}</div>
      <div v-if="replyTo" class="text-caption text-grey q-mt-xs">
        Replying to @{{ replyTo.author.handle }}
      </div>
    </q-card-section>

    <q-card-section class="q-gutter-md">
      <q-btn-toggle
        v-model="postType"
        spread
        no-caps
        rounded
        unelevated
        toggle-color="primary"
        color="white"
        text-color="primary"
        :options="[
          { label: 'Normal', value: 'normal' },
          { label: 'Request', value: 'request' },
          { label: 'Help', value: 'help' },
        ]"
      />

      <q-input
        v-model="postContent"
        filled
        type="textarea"
        label="What's on your mind?"
        counter
        maxlength="300"
      />

      <q-select
        v-if="postType !== 'normal'"
        v-model="skillTags"
        filled
        multiple
        use-chips
        use-input
        new-value-mode="add-unique"
        label="Skills (e.g., #python, #vue)"
        hint="Press Enter to add a new skill"
      />
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md">
      <q-btn 
        v-if="!noCancelButton" 
        flat 
        label="Cancel" 
        v-close-popup 
        @click="$emit('close')" 
        :disable="isPosting"
      />
      <q-btn
        color="primary"
        :label="replyTo ? 'Reply' : 'Post'"
        @click="submitPost"
        :loading="isPosting"
        :disable="!postContent.trim()"
        unelevated
        no-caps
        rounded
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from 'stores/auth-store';
import { useQuasar } from 'quasar';
import { RichText, type AppBskyRichtextFacet } from '@atproto/api';
import type { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs';

const emit = defineEmits(['close', 'posted']);

const props = defineProps<{ 
  replyTo?: PostView;
  noCancelButton?: boolean;
}>();

const authStore = useAuthStore();
const $q = useQuasar();

const postType = ref('normal'); // 'normal', 'request', 'help'
const postContent = ref('');
const skillTags = ref<string[]>([]);
const isPosting = ref(false);

async function submitPost() {
  if (!authStore.isLoggedIn) {
    $q.notify({ color: 'negative', message: 'You must be logged in to post.' });
    return;
  }

  isPosting.value = true;

  try {
    let fullPostText = postContent.value;

    // Add type hashtag
    if (postType.value === 'request') {
      fullPostText += ' #dekobokoRequest';
    } else if (postType.value === 'help') {
      fullPostText += ' #dekobokoHelp';
    }

    // Add skill hashtags
    const tags = skillTags.value.map(tag => (tag.startsWith('#') ? tag : `#${tag}`));
    if (tags.length > 0) {
      fullPostText += `\nSkills: ${tags.join(' ')}`;
    }

    const rt = new RichText({ text: fullPostText });
    await rt.detectFacets(authStore.agent);

    const postRecord: {
      text: string;
      facets?: AppBskyRichtextFacet.Main[];
      createdAt: string;
      reply?: {
        root: { uri: string; cid: string };
        parent: { uri: string; cid: string };
      };
    } = {
      text: rt.text,
      createdAt: new Date().toISOString(),
    };

    if (rt.facets) {
      postRecord.facets = rt.facets;
    }

    if (props.replyTo) {
      postRecord.reply = {
        root: {
          uri: props.replyTo.uri,
          cid: props.replyTo.cid,
        },
        parent: {
          uri: props.replyTo.uri,
          cid: props.replyTo.cid,
        },
      };
    }

    await authStore.agent.post(postRecord);

    $q.notify({ 
      color: 'positive', 
      message: props.replyTo ? 'Reply posted successfully!' : 'Post created successfully!' 
    });
    postContent.value = '';
    skillTags.value = [];
    emit('posted');
    emit('close');

  } catch (error) {
    console.error('Failed to create post:', error);
    $q.notify({ color: 'negative', message: 'Failed to create post.' });
  } finally {
    isPosting.value = false;
  }
}
</script>
