<template>
  <div class="login-page">
    <!-- 背景泥土纹理 -->
    <div class="dirt-bg"></div>

    <!-- 登录面板 -->
    <div class="login-panel mc-panel">
      <!-- Logo -->
      <div class="logo-area">
        <div class="mc-logo">
          <img src="@/assets/mclogo.png" alt="Cube Recall" class="logo-block" />
        </div>
        <h1 class="logo-title">{{ t('login.title') }}</h1>
        <p class="logo-sub">{{ t('login.subtitle') }}</p>
      </div>

      <!-- 登录表单 -->
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username">{{ t('login.username') }}</label>
          <input
            id="username"
            class="mc-input"
            v-model="form.username"
            :placeholder="t('login.usernamePlaceholder')"
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label for="password">{{ t('login.password') }}</label>
          <input
            id="password"
            class="mc-input"
            v-model="form.password"
            type="password"
            :placeholder="t('login.passwordPlaceholder')"
            autocomplete="current-password"
          />
        </div>

        <p v-if="error" class="msg-error">{{ error }}</p>

        <button
          class="mc-btn mc-btn-primary mc-btn-full login-btn"
          type="submit"
          :disabled="loading"
        >
          {{ loading ? t('login.submitting') : t('login.submit') }}
        </button>
      </form>

      <!-- 分隔线 -->
      <div class="divider">
        <span class="divider-line"></span>
        <span class="divider-text">{{ t('login.or') }}</span>
        <span class="divider-line"></span>
      </div>

      <!-- 注册链接 -->
      <router-link to="/register" class="mc-btn mc-btn-full register-link">
        {{ t('login.createAccount') }}
      </router-link>
    </div>

    <!-- 底部版本信息 -->
    <div class="version-info">
      <span>Cube Recall {{ t('app.version') }}</span>
      <span>{{ t('login.forgeVersion') }}</span>
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

const form = ref({ username: '', password: '' })
const error = ref('')
const loading = ref(false)

onMounted(() => {
  userStore.initMachineId()
})

async function handleLogin() {
  error.value = ''
  if (!form.value.username || !form.value.password) {
    error.value = t('login.errorEmpty')
    return
  }
  loading.value = true
  try {
    await userStore.login(form.value.username, form.value.password)
    router.push('/home')
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || t('login.errorFailed')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 42px);
  position: relative;
  overflow: hidden;
}

/* 泥土纹理背景 */
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

/* 登录面板 */
.login-panel {
  position: relative;
  width: 400px;
  z-index: 1;
  background: rgba(0, 0, 0, 0.75);
  border: 3px solid #555;
  box-shadow:
    inset -3px -3px 0 0 #222,
    inset 3px 3px 0 0 #666,
    0 0 40px rgba(0,0,0,0.5);
  padding: 32px;
}

/* Logo 区域 */
.logo-area {
  text-align: center;
  margin-bottom: 28px;
}

.mc-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 14px;
}

.logo-block {
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
  filter: drop-shadow(3px 3px 0 rgba(0,0,0,0.5));
}

.logo-title {
  font-family: var(--font-heading);
  font-size: 16px;
  color: var(--mc-gold);
  text-shadow:
    2px 2px 0 #8B6914,
    3px 3px 0 rgba(0,0,0,0.5);
  letter-spacing: 2px;
  margin-bottom: 8px;
}

.logo-sub {
  font-family: var(--font-body);
  font-size: 18px;
  color: var(--text-secondary);
  text-shadow: 1px 1px 0 rgba(0,0,0,0.5);
}

/* 登录表单 */
.login-form {
  margin-bottom: 16px;
}

.login-btn {
  margin-top: 8px;
  padding: 12px;
  font-size: 12px;
}

/* 分隔线 */
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

/* 注册按钮 */
.register-link {
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-size: 10px;
  color: var(--text-primary);
}

/* 版本信息 */
.version-info {
  position: absolute;
  bottom: 12px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 20px;
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--text-muted);
  text-shadow: 1px 1px 0 rgba(0,0,0,0.8);
  z-index: 1;
}
</style>
