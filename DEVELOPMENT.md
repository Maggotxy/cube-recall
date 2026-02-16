# Cube Recall - Development Documentation

> Minecraft 1.20.1 Forge Game Launcher
> Version: v1.0.0
> Last Updated: 2026-02-15

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Completed Features](#completed-features)
- [Environment Setup](#environment-setup)
- [Quick Start](#quick-start)
- [Development Guide](#development-guide)
- [API Documentation](#api-documentation)
- [Core Implementation](#core-implementation)
- [Troubleshooting](#troubleshooting)
- [TODO](#todo)

---

## Project Overview

**Cube Recall** is a modern Minecraft launcher designed for Minecraft 1.20.1 + Forge 47.3.0. It features a guest mode + delayed login architecture for smooth user experience.

### Key Features

✅ **Implemented**
- ✅ Guest Mode: Browse without login
- ✅ Delayed Login: Login only when launching game
- ✅ Auto Environment Detection: Java, Game Files, Mods
- ✅ China Mirror Acceleration: BMCLAPI + Huawei OpenJDK
- ✅ MC Pixel Style UI
- ✅ i18n Support: Chinese/English
- ✅ Auto JDK Download: Detects and installs Java 17
- ✅ Auto Mod Sync: MD5 verification + incremental update
- ✅ Anti-cheat System: Machine ID verification
- ✅ Announcement System

🚧 **TODO**
- ⬜ Skin System
- ⬜ Multi-account Management
- ⬜ Auto Updater
- ⬜ In-game Mod Manager
- ⬜ Crash Log Auto Upload

---

## Tech Stack

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Cube Recall System                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Launcher       │  │  Backend     │  │  MC Server │ │
│  │  (Electron)     │  │  (FastAPI)   │  │  (Forge)   │ │
│  │                 │  │              │  │            │ │
│  │  Vue 3 + Vite   │←→│  SQLite DB   │←→│ 1.20.1     │ │
│  │  Port: 5173     │  │  Port: 8000  │  │ Port:25565 │ │
│  └─────────────────┘  └──────────────┘  └────────────┘ │
│           ↓                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Minecraft Client (Downloaded)            │   │
│  │         @xmcl/installer + BMCLAPI Mirror        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Launcher Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop Framework | Electron | 28.3.3 |
| Frontend | Vue 3 | 3.5.28 |
| State Management | Pinia | 2.3.1 |
| Router | Vue Router | 4.6.4 |
| Build Tool | Vite | 5.4.21 |
| Game Launcher | @xmcl | 6.1.2 |

### Backend Stack

| Technology | Version |
|-----------|---------|
| Framework | FastAPI | Latest |
| Database | SQLite | 3 |
| Auth | Custom | - |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+
- Java 17+ (for MC server)

### Start All Services

```bash
# Windows
Double-click: start-launcher.bat

# Or manually
cd launcher
npm run dev
```

### Start Backend

```bash
cd server
python main.py
```

### Start MC Server

```bash
cd mcserver
java @user_jvm_args.txt @libraries/net/minecraftforge/forge/1.20.1-47.2.0/win_args.txt nogui
```

---

## Core Features Implementation

### 1. Guest Mode

**Location**: `src/views/Home.vue`, `src/App.vue`

**Code**:
```vue
<span class="player-name">
  {{ userStore.isLoggedIn ? userStore.username : t('home.guest') }}
</span>
```

### 2. Delayed Login

**Location**: `src/views/Home.vue` (line 365-402)

**Flow**:
1. User clicks "Launch Game"
2. Check environment (no login required)
3. Check login status
4. Show login dialog if not logged in
5. Launch game after successful login

### 3. Auto Environment Detection

**Java Detection Priority**:
1. Bundled JDK (`~/.cuberecall/jdk17`)
2. Windows Registry
3. PATH environment variable
4. Common installation paths

### 4. Proxy Bypass Fix

**Problem**: System proxy (Clash/v2rayN) causes `ECONNREFUSED ::1:443`

**Solution**:

1. **Electron Main Process** (`electron/main.js`)
```javascript
app.commandLine.appendSwitch('no-proxy-server')
delete process.env.HTTP_PROXY
delete process.env.HTTPS_PROXY
```

2. **Download Modules** (`electron/modules/*.js`)
```javascript
const options = {
  agent: new Agent({ keepAlive: false })
}
```

---

## API Documentation

### Authentication

#### POST /auth/login
Login user

**Request**:
```json
{
  "username": "player123",
  "password": "password123",
  "machine_id": "abc123def456"
}
```

**Response**:
```json
{
  "id": 1,
  "username": "player123",
  "token": "user_token_here"
}
```

### Mods

#### GET /mods/manifest
Get mods manifest

**Response**:
```json
{
  "jei-1.20.1-forge-15.3.0.4.jar": {
    "md5": "a1b2c3d4e5f6...",
    "size": 1048576,
    "url": "http://localhost:8000/mods/download/jei-1.20.1-forge-15.3.0.4.jar"
  }
}
```

---

## Troubleshooting

### Port 5173 in Use

```bash
# Kill process
netstat -ano | findstr :5173
taskkill /F /PID <PID>

# Or use batch script
kill-launcher-port.bat
```

### Electron Window Not Opening

**Check**:
1. `package.json` port configuration (should be 5173)
2. Kill all Electron processes
```bash
taskkill /F /IM electron.exe
```

### Download Error ECONNREFUSED

**Cause**: System proxy issue

**Solution**: Already fixed in code, or manually disable proxy:
```bash
# Windows: Settings → Network → Proxy → Off
```

---

## TODO

### High Priority
- [ ] Auto Updater
- [ ] Multi-account Management
- [ ] Crash Log Auto Upload

### Medium Priority
- [ ] Skin System
- [ ] Online Mod Browser
- [ ] Friend System

### Low Priority
- [ ] Screenshot Manager
- [ ] Save Backup
- [ ] Theme System

---

## Contact

- **Project Lead**: [Your Name]
- **Email**: [Your Email]
- **Issues**: [GitHub Issues]

---

**Document Version**: 1.0.0
**Last Updated**: 2026-02-15
