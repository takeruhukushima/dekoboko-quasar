<template>
  <q-item class="q-py-md post-item" clickable @click="navigateToThread">
    <q-item-section top avatar>
      <q-avatar>
        <img v-if="post.author.avatar" :src="post.author.avatar" />
        <q-icon v-else name="person" />
      </q-avatar>
    </q-item-section>

    <q-item-section>
      <q-item-label class="font-weight-bold">{{ post.author.displayName || post.author.handle }}</q-item-label>
      <q-item-label caption>@{{ post.author.handle }}</q-item-label>
      <div class="text-pre-wrap q-mt-sm">{{ (post.record as Record<string, unknown>)?.text }}</div>
      <div class="q-mt-sm row items-center q-gutter-x-md">
        <q-btn flat round icon="reply" size="sm" @click.stop="$emit('reply-to-post', post.uri)" />
        <!-- Add other actions here if needed, e.g., like, repost -->
      </div>
    </q-item-section>

    <q-item-section side top>
      <q-icon :name="postIcon.name" :color="postIcon.color" size="sm" />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs';

const props = defineProps<{ post: PostView }>();
const router = useRouter();

async function navigateToThread() {
  try {
    await router.push(`/thread/${encodeURIComponent(props.post.uri)}`);
  } catch (error) {
    console.error('Navigation error:', error);
  }
}

const postIcon = computed(() => {
  const text = (props.post.record as Record<string, unknown>)?.text as string || '';
  if (text.includes('#dekobokoRequest')) {
    return { name: 'work', color: 'secondary' };
  }
  if (text.includes('#dekobokoHelp')) {
    return { name: 'support', color: 'accent' };
  }
  return { name: 'chat_bubble_outline', color: 'grey' };
});
</script>

<style scoped>
.text-pre-wrap {
  white-space: pre-wrap;
  word-break: break-word;
}

.post-item {
  transition: background-color 0.2s;
}

.post-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}
</style>
