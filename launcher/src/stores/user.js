import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../api'

export const useUserStore = defineStore('user', () => {
  const username = ref('')
  const token = ref('')
  const isLoggedIn = ref(false)
  const machineId = ref('')

  async function initMachineId() {
    machineId.value = await window.electronAPI.getMachineId()
  }

  async function login(user, pass) {
    const res = await api.login(user, pass, machineId.value)
    username.value = res.username
    token.value = res.token
    isLoggedIn.value = true
    return res
  }

  async function register(user, pass) {
    return await api.register(user, pass, machineId.value)
  }

  function logout() {
    username.value = ''
    token.value = ''
    isLoggedIn.value = false
  }

  return { username, token, isLoggedIn, machineId, initMachineId, login, register, logout }
})
