<template>
  <q-item v-if="post.post" class="q-py-md">
    <q-item-section top avatar>
      <q-avatar>
        <img v-if="post.post.author.avatar" :src="post.post.author.avatar" />
        <q-icon v-else name="person" />
      </q-avatar>
    </q-item-section>

    <q-item-section>
      <q-item-label class="font-weight-bold">{{ post.post.author.displayName || post.post.author.handle }}</q-item-label>
      <q-item-label caption>@{{ post.post.author.handle }}</q-item-label>
      <div class="text-pre-wrap q-mt-sm">{{ (post.post.record as Record<string, unknown>)?.text }}</div>
    </q-item-section>

    <q-item-section side top>
      <q-icon :name="postIcon.name" :color="postIcon.color" size="sm" />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FeedViewPost } from '@atproto/api/dist/client/types/app/bsky/feed/defs';

const props = defineProps<{ post: FeedViewPost }>();

const postIcon = computed(() => {
  const text = (props.post.post.record as Record<string, unknown>)?.text as string || '';
  if (text.includes('uest')) {
    return { name: 'work', color: 'secondary' }; // or a more specific icon
  }
  if (text.includes('#dekobokoHelp')) {
    return { name: 'support', color: 'accent' }; // or a more specific icon
  }
  return { name: 'chat_bubble_outline', color: 'grey' };
});
</script>

<style scoped>
.text-pre-wrap {
  white-space: pre-wrap;
}
</style>
