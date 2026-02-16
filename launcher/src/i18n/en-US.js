export default {
  // Common
  app: {
    title: 'Cube Recall',
    version: 'v1.0.0',
    login: 'LOGIN',
  },

  // Title bar
  titleBar: {
    minimize: 'Minimize',
    maximize: 'Maximize',
    close: 'Close',
  },

  // Login page
  login: {
    title: 'Cube Recall',
    subtitle: 'Minecraft Server Launcher',
    username: 'USERNAME',
    password: 'PASSWORD',
    usernamePlaceholder: 'Enter username...',
    passwordPlaceholder: 'Enter password...',
    submit: 'LOGIN',
    submitting: 'Connecting...',
    or: 'OR',
    createAccount: 'CREATE NEW ACCOUNT',
    noAccount: 'No account?',
    register: 'REGISTER NOW',
    errorEmpty: 'Please fill in username and password',
    errorFailed: 'Login failed',
    forgeVersion: 'Forge 1.20.1',
  },

  // Register page
  register: {
    title: 'CREATE ACCOUNT',
    subtitle: 'Register a new launcher account',
    username: 'USERNAME',
    password: 'PASSWORD',
    confirmPassword: 'CONFIRM PASSWORD',
    usernamePlaceholder: 'Letters, numbers, underscore',
    passwordPlaceholder: 'At least 6 characters',
    confirmPlaceholder: 'Repeat password',
    usernameHint: '3-16 characters, a-z A-Z 0-9 _',
    submit: 'REGISTER',
    submitting: 'Creating...',
    or: 'OR',
    haveAccount: 'Already have an account?',
    backToLogin: 'BACK TO LOGIN',
    errorEmpty: 'Please fill in all fields',
    errorUsername: 'Username can only contain letters, numbers, underscore (3-16 chars)',
    errorPasswordLength: 'Password must be at least 6 characters',
    errorPasswordMatch: 'Passwords do not match',
    errorFailed: 'Registration failed',
    success: 'Registration successful! Redirecting to login...',
  },

  // Home page
  home: {
    // Sidebar
    notLoggedIn: 'NOT LOGGED IN',
    clickToLogin: 'Login when you launch',
    guest: 'GUEST',
    online: 'ONLINE',
    offline: 'OFFLINE',
    loginNow: 'LOGIN NOW',
    java: 'Java',
    game: 'Game',
    mods: 'Mods',
    logout: 'LOGOUT',

    // Status values
    javaFound: 'Installed',
    javaNotFound: 'Not Found',
    gameInstalled: 'Installed',
    gameNotInstalled: 'Not Installed',
    modsUnknown: 'Unknown',
    modsChecking: 'Checking...',
    modsSynced: 'Up to date',
    modsOutdated: 'Need sync',

    // Banner
    bannerTitle: 'Cube Recall',
    bannerVersion: 'MINECRAFT Forge 1.20.1',

    // Action area
    console: 'CONSOLE',
    clear: 'CLEAR',
    readyTitle: 'Ready to play!',
    readyHint: 'Click the button below to start',

    // Progress
    installingJava: 'Installing Java 17',
    installingGame: 'Installing Game',
    syncingMods: 'Syncing Mods',

    // Launch bar
    serverLabel: 'Server',
    serverNotConfigured: 'Not configured',
    play: 'PLAY',
    launching: 'LAUNCHING...',

    // Announcement
    announcement: 'ANNOUNCEMENTS',
    noAnnouncement: 'No announcements',

    // Logs
    // Login modal
    loginRequired: 'Login Required',
    loginRequiredHint: 'Please login before launching',
    switchToRegister: 'No account? Create one',
    switchToLogin: 'Have an account? Login',

    logInit: 'Initializing launcher...',
    logJavaFound: 'Java {version} found ({source})',
    logJavaNotFound: 'Java 17 not found',
    logJavaDetectError: 'Java detection error: {error}',
    logGameInstalled: 'Game is installed',
    logGameNotInstalled: 'Game not installed',
    logGameCheckError: 'Game check error: {error}',
    logNeedLogin: 'Please login to launch the game',
    logPreparingEnvironment: 'Preparing game environment...',
    logEnvironmentReady: 'Game environment ready',
    logLaunchingGame: 'Launching game...',
    logLaunchCancelled: 'Launch cancelled',
    logStartLaunch: 'Starting launch sequence...',
    logJavaInstalling: 'Java 17 not found, installing...',
    logJavaInstalled: 'Java {version} installed',
    logGameDownloading: 'Game not installed, downloading...',
    logGameDownloaded: 'Game installed successfully',
    logModsSyncing: 'Syncing mods...',
    logModsSynced: 'Mods synced',
    logLaunching: 'Launching Minecraft...',
    logLaunched: 'Game launched!',
    logError: 'Error: {error}',
  },

  // Language
  lang: {
    label: 'Language',
    zhCN: '简体中文',
    enUS: 'English',
  },
}
