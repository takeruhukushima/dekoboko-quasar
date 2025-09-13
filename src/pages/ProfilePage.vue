<template>
  <q-page padding class="flex column items-center">
    <div v-if="authStore.isLoggedIn" class="q-gutter-md">
      <p class="text-h6">Welcome, {{ authStore.session?.handle }}</p>
      <q-btn color="negative" label="Logout" @click="logout" />
    </div>
    <div v-else>
      <q-btn color="primary" label="Login" @click="loginDialogOpen = true" />
    </div>

    <q-dialog v-model="loginDialogOpen">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Login to Bluesky</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input dense v-model="identifier" autofocus label="Handle or Email" />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input dense v-model="password" type="password" label="App Password" />
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn flat label="Login" @click="login" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from 'stores/auth-store';
import { useQuasar } from 'quasar';

const authStore = useAuthStore();
const $q = useQuasar();

const loginDialogOpen = ref(false);
const identifier = ref('');
const password = ref('');

async function login() {
  try {
    await authStore.agent.login({
      identifier: identifier.value,
      password: password.value,
    });
    if (authStore.agent.session) {
      authStore.setSession(authStore.agent.session);
      loginDialogOpen.value = false;
      $q.notify({
        color: 'positive',
        message: 'Login successful!',
      });
    }
  } catch (error) {
    console.error(error);
    $q.notify({
      color: 'negative',
      message: 'Login failed. Please check your credentials.',
    });
  }
}

function logout() {
  authStore.clearSession();
  $q.notify({
    message: 'Logged out.',
  });
}
</script>
