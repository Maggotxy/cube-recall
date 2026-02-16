import axios from 'axios'

// 后端 API 地址（可动态配置）
const client = axios.create({
  baseURL: 'http://mc.sivita.xyz:5806',
  timeout: 30000,
})

function setBaseURL(url) {
  client.defaults.baseURL = url
}

export default {
  setBaseURL,

  async login(username, password, machineId) {
    const { data } = await client.post('/auth/login', { username, password, machine_id: machineId })
    return data
  },

  async register(username, password, machineId) {
    const { data } = await client.post('/auth/register', { username, password, machine_id: machineId })
    return data
  },

  async getModsManifest() {
    const { data } = await client.get('/mods/manifest')
    return data
  },

  async getAnnouncements() {
    const { data } = await client.get('/announcements/')
    return data
  },
}
