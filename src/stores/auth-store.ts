import { defineStore } from 'pinia';
import { BskyAgent, type AtpSessionData } from '@atproto/api';

const ATP_SESSION_KEY = 'atp-session';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    session: null as AtpSessionData | null,
    agent: new BskyAgent({
      service: 'https://bsky.social',
    }),
  }),

  getters: {
    isLoggedIn: (state) => !!state.session,
  },

  actions: {
    setSession(session: AtpSessionData) {
      this.session = session;
      localStorage.setItem(ATP_SESSION_KEY, JSON.stringify(session));
      this.agent = new BskyAgent({
        service: 'https://bsky.social',
      });
      void this.agent.resumeSession(session);
    },

    clearSession() {
      this.session = null;
      localStorage.removeItem(ATP_SESSION_KEY);
      this.agent = new BskyAgent({
        service: 'https://bsky.social',
      });
    },

    // Action to initialize the store from localStorage
    async initialize() {
      const storedSession = localStorage.getItem(ATP_SESSION_KEY);
      if (storedSession) {
        const sessionData = JSON.parse(storedSession) as AtpSessionData;
        this.session = sessionData;
        this.agent = new BskyAgent({
          service: 'https://bsky.social',
        });
        await this.agent.resumeSession(sessionData);
      }
    },
  },
});