<template>
  <q-card style="min-width: 400px">
    <q-card-section>
      <div class="text-h6">Create Post</div>
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

    <q-card-actions align="right">
      <q-btn flat label="Cancel" v-close-popup />
      <q-btn
        color="primary"
        label="Post"
        @click="submitPost"
        :loading="isPosting"
        :disable="!postContent.trim()"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from 'stores/auth-store';
import { useQuasar } from 'quasar';
import { RichText, type AppBskyRichtextFacet } from '@atproto/api';

const emit = defineEmits(['close']);

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
    } = {
      text: rt.text,
      createdAt: new Date().toISOString(),
    };
    if (rt.facets) {
      postRecord.facets = rt.facets;
    }

    await authStore.agent.post(postRecord);

    $q.notify({ color: 'positive', message: 'Post created successfully!' });
    postContent.value = '';
    skillTags.value = [];
    emit('close');

  } catch (error) {
    console.error('Failed to create post:', error);
    $q.notify({ color: 'negative', message: 'Failed to create post.' });
  } finally {
    isPosting.value = false;
  }
}
</script>
