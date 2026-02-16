<template>
  <div class="register-page">
    <div class="dirt-bg"></div>

    <div class="register-panel mc-panel">
      <div class="panel-header">
        <h1 class="panel-title">{{ t('register.title') }}</h1>
        <p class="panel-sub">{{ t('register.subtitle') }}</p>
      </div>

      <form @submit.prevent="handleRegister" class="register-form">
        <div class="form-group">
          <label for="reg-username">{{ t('register.username') }}</label>
          <input
            id="reg-username"
            class="mc-input"
            v-model="form.username"
            :placeholder="t('register.usernamePlaceholder')"
            autocomplete="username"
          />
          <p class="field-hint">{{ t('register.usernameHint') }}</p>
        </div>

        <div class="form-group">
          <label for="reg-password">{{ t('register.password') }}</label>
          <input
            id="reg-password"
            class="mc-input"
            v-model="form.password"
            type="password"
            :placeholder="t('register.passwordPlaceholder')"
            autocomplete="new-password"
          />
        </div>

        <div class="form-group">
          <label for="reg-confirm">{{ t('register.confirmPassword') }}</label>
          <input
            id="reg-confirm"
            class="mc-input"
            v-model="form.confirmPassword"
            type="password"
            :placeholder="t('register.confirmPlaceholder')"
            autocomplete="new-password"
          />
        </div>

        <p v-if="error" class="msg-error">{{ error }}</p>
        <p v-if="success" class="msg-success">{{ success }}</p>

        <button
          class="mc-btn mc-btn-primary mc-btn-full register-btn"
          type="submit"
          :disabled="loading"
        >
          {{ loading ? t('register.submitting') : t('register.submit') }}
        </button>
      </form>

      <div class="divider">
        <span class="divider-line"></span>
        <span class="divider-text">{{ t('register.or') }}</span>
        <span class="divider-line"></span>
      </div>

      <router-link to="/login" class="mc-btn mc-btn-full back-link">
        {{ t('register.backToLogin') }}
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { t } from '../i18n'

const router = useRouter()
const userStore = useUserStore()

const form = ref({ username: '', password: '', confirmPassword: '' })
const error = ref('')
const success = ref('')
const loading = ref(false)

onMounted(() => {
  userStore.initMachineId()
})

async function handleRegister() {
  error.value = ''
  success.value = ''

  if (!form.value.username || !form.value.password || !form.value.confirmPassword) {
    error.value = t('register.errorEmpty')
    return
  }

  const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/
  if (!usernameRegex.test(form.value.username)) {
    error.value = t('register.errorUsername')
    return
  }

  if (form.value.password.length < 6) {
    error.value = t('register.errorPasswordLength')
    return
  }

  if (form.value.password !== form.value.confirmPassword) {
    error.value = t('register.errorPasswordMatch')
    return
  }

  loading.value = true
  try {
    await userStore.register(form.value.username, form.value.password)
    success.value = t('register.success')
    setTimeout(() => router.push('/login'), 1500)
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || t('register.errorFailed')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 42px);
  position: relative;
  overflow: hidden;
}

.dirt-bg {
  position: absolute;
  inset: 0;
  background-color: #866043;
  background-image:
    radial-gradient(ellipse 3px 3px at 4px 4px, #593D29 50%, transparent 50%),
    radial-gradient(ellipse 3px 3px at 12px 14px, #9B7653 50%, transparent 50%),
    radial-gradient(ellipse 2px 2px at 20px 8px, #593D29 50%, transparent 50%),
    radial-gradient(ellipse 3px 3px at 28px 18px, #74523A 50%, transparent 50%);
  background-size: 32px 24px;
  image-rendering: pixelated;
  opacity: 0.5;
}

.register-panel {
  position: relative;
  width: 400px;
  z-index: 1;
  background: rgba(0, 0, 0, 0.75);
  border: 3px solid #555;
  box-shadow:
    inset -3px -3px 0 0 #222,
    inset 3px 3px 0 0 #666,
    0 0 40px rgba(0,0,0,0.5);
  padding: 28px 32px;
}

.panel-header {
  text-align: center;
  margin-bottom: 24px;
}

.panel-title {
  font-family: var(--font-heading);
  font-size: 13px;
  color: var(--mc-gold);
  text-shadow:
    2px 2px 0 #8B6914,
    3px 3px 0 rgba(0,0,0,0.5);
  letter-spacing: 2px;
  margin-bottom: 8px;
}

.panel-sub {
  font-family: var(--font-body);
  font-size: 18px;
  color: var(--text-secondary);
  text-shadow: 1px 1px 0 rgba(0,0,0,0.5);
}

.field-hint {
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--text-muted);
  margin-top: 4px;
}

.register-btn {
  margin-top: 8px;
  padding: 12px;
  font-size: 12px;
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0;
}

.divider-line {
  flex: 1;
  height: 2px;
  background: #444;
}

.divider-text {
  font-family: var(--font-heading);
  font-size: 8px;
  color: var(--text-muted);
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-size: 10px;
  color: var(--text-primary);
}
</style>
