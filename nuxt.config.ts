export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || ''
  },

  compatibilityDate: '2025-05-25'
})
