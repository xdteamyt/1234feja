/* xMedia v7 — full app.js with:
   - Loader screen control
   - Subscriptions: free, basic (999/mo), medium (1999/mo) with feature gating
   - Wallpapers & cover image, GIF cover/profile (medium), No Ads (medium)
   - Helpex AI: multilingual meaningful answers; Helpex Pro enabled by medium plan
   - Persist accounts/posts across code updates via versioned migration
   - Mail removed; Helpex panel added; Calls kept
*/

/* Storage with versioning */
const APP_VERSION = '7.0.0';
const Storage = {
  key: 'xmedia:data',
  metaKey: 'xmedia:meta',
  load() {
    try {
      const data = JSON.parse(localStorage.getItem(this.key) || 'null');
      const meta = JSON.parse(localStorage.getItem(this.metaKey) || '{}');
      return { data, meta };
    } catch { return { data: null, meta: {} }; }
  },
  save(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
    localStorage.setItem(this.metaKey, JSON.stringify({ version: APP_VERSION, savedAt: new Date().toISOString() }));
  }
};

/* Config */
const DISPLAY_COOLDOWN_DAYS = 7;
const HANDLE_COOLDOWN_DAYS = 30;
const BOT_HANDLE = 'helpex';
const SIGNAL_CHANNEL = 'xmedia-signaling';

/* Plans */
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    features: { wallpapers: false, coverImage: false, gifCover: false, gifProfile: false, noAds: false, helpexPro: false }
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    priceMonthly: 999,
    features: { wallpapers: true, coverImage: true, gifCover: false, gifProfile: false, noAds: false, helpexPro: false }
  },
  medium: {
    id: 'medium',
    name: 'Medium',
    priceMonthly: 1999,
    features: { wallpapers: true, coverImage: true, gifCover: true, gifProfile: true, noAds: true, helpexPro: true }
  }
};

/* UI translations */
const UI_STRINGS = {
  en: {
    feed: 'Feed', chat: 'Chat', calls: 'Calls', helpex: 'Helpex', profile: 'Profile', signin: 'Sign in',
    welcome: 'Welcome to xMedia', registerDesc: 'Sign up with a handle, email or phone, and password.',
    handle: 'Handle', displayName: 'Display name', email: 'Email', phone: 'Phone', bio: 'Bio', password: 'Password',
    register: 'Register', signinTitle: 'Sign in', forgot: 'Forgot password?', whatsNewTitle: "What's new?",
    subscriptions: 'Subscriptions', choosePlan: 'Choose a plan', free: 'Free', basic: 'Basic', medium: 'Medium',
    priceMonthly: '/month', activePlan: 'Active plan', changePlan: 'Change plan'
  },
  hu: {
    feed: 'Hírek', chat: 'Csevegés', calls: 'Hívások', helpex: 'Helpex', profile: 'Profil', signin: 'Bejelentkezés',
    welcome: 'Üdvözöl az xMedia', registerDesc: 'Regisztrálj felhasználónévvel, emaillel vagy telefonszámmal és jelszóval.',
    handle: 'Felhasználónév', displayName: 'Megjelenítendő név', email: 'Email', phone: 'Telefonszám', bio: 'Bemutatkozás', password: 'Jelszó',
    register: 'Regisztráció', signinTitle: 'Bejelentkezés', forgot: 'Elfelejtett jelszó?', whatsNewTitle: 'Mi újság?',
    subscriptions: 'Előfizetések', choosePlan: 'Válassz csomagot', free: 'Ingyenes', basic: 'Basic', medium: 'Medium',
    priceMonthly: '/hó', activePlan: 'Aktív csomag', changePlan: 'Csomag váltása'
  },
  es: {
    feed: 'Noticias', chat: 'Chat', calls: 'Llamadas', helpex: 'Helpex', profile: 'Perfil', signin: 'Iniciar sesión',
    welcome: 'Bienvenido a xMedia', registerDesc: 'Regístrate con usuario, correo o teléfono y contraseña.',
    handle: 'Usuario', displayName: 'Nombre', email: 'Correo', phone: 'Teléfono', bio: 'Bio', password: 'Contraseña',
    register: 'Registrar', signinTitle: 'Iniciar sesión', forgot: '¿Olvidaste la contraseña?', whatsNewTitle: 'Novedades',
    subscriptions: 'Suscripciones', choosePlan: 'Elige un plan', free: 'Gratis', basic: 'Básico', medium: 'Medio',
    priceMonthly: '/mes', activePlan: 'Plan activo', changePlan: 'Cambiar plan'
  },
  fr: {
    feed: 'Fil', chat: 'Chat', calls: 'Appels', helpex: 'Helpex', profile: 'Profil', signin: 'Se connecter',
    welcome: 'Bienvenue sur xMedia', registerDesc: 'Inscrivez-vous avec pseudo, email ou téléphone et mot de passe.',
    handle: 'Pseudo', displayName: 'Nom affiché', email: 'Email', phone: 'Téléphone', bio: 'Bio', password: 'Mot de passe',
    register: 'S\'inscrire', signinTitle: 'Connexion', forgot: 'Mot de passe oublié ?', whatsNewTitle: 'Quoi de neuf ?',
    subscriptions: 'Abonnements', choosePlan: 'Choisir un plan', free: 'Gratuit', basic: 'Basique', medium: 'Moyen',
    priceMonthly: '/mois', activePlan: 'Plan actif', changePlan: 'Changer de plan'
  },
  ro: {
    feed: 'Noutăți', chat: 'Chat', calls: 'Apeluri', helpex: 'Helpex', profile: 'Profil', signin: 'Autentificare',
    welcome: 'Bine ai venit la xMedia', registerDesc: 'Înregistrează-te cu handle, email sau telefon și parolă.',
    handle: 'Handle', displayName: 'Nume afișat', email: 'Email', phone: 'Telefon', bio: 'Bio', password: 'Parolă',
    register: 'Înregistrare', signinTitle: 'Autentificare', forgot: 'Ai uitat parola?', whatsNewTitle: 'Noutăți',
    subscriptions: 'Abonamente', choosePlan: 'Alege un plan', free: 'Gratuit', basic: 'Basic', medium: 'Mediu',
    priceMonthly: '/lună', activePlan: 'Plan activ', changePlan: 'Schimbă planul'
  }
};

/* Utils */
const now = () => new Date().toISOString();
const daysSince = iso => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / (1000*60*60*24)) : null;
const fmtTime = iso => {
  const d = new Date(iso); const diff = (Date.now() - d.getTime())/1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff/60)}m`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  return d.toLocaleDateString();
};
const initials = name => (name || '?').split(/\s+/).slice(0,2).map(s => s[0]?.toUpperCase()||'').join('') || '?';
const uid = (p='id') => `${p}_${Math.random().toString(36).slice(2,9)}_${Date.now().toString(36)}`;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const hash = s => btoa(String(s)); // demo-only

/* State */
const state = {
  session: null,
  users: {},
  posts: {},
  comments: {},
  feedOrder: [],
  chatThreads: {},
  dark: false,
  lastSeenWhatsNew: null,
  settings: {
    uiLanguage: 'hu',
    country: 'Hungary',
    wallpaper: 'default' // default | blue | purple | red | custom (url)
  },
  calls: {
    roomId: '',
    pc: null,
    dc: null,
    localStream: null,
    remoteStream: null,
    devices: { audioInputs: [], videoInputs: [] },
    selected: { audioId: null, videoId: null },
    signaling: null
  }
};

/* Persistence with migration (never wipe automatically) */
function persist() {
  const serializable = {
    ...state,
    users: toPlainUsers(state.users),
    posts: toPlain(state.posts),
    comments: toPlain(state.comments),
    chatThreads: state.chatThreads,
    calls: { ...state.calls, pc: null, dc: null, localStream: null, remoteStream: null, signaling: null }
  };
  Storage.save(serializable);
}
function migrate(old) {
  // Ensure new fields exist while preserving old data
  const s = old || {};
  s.settings = s.settings || { uiLanguage: 'hu', country: 'Hungary', wallpaper: 'default' };
  if (!s.calls) s.calls = { roomId:'', pc:null, dc:null, localStream:null, remoteStream:null, devices:{audioInputs:[],videoInputs:[]}, selected:{audioId:null, videoId:null}, signaling:null };
  if (!s.chatThreads) s.chatThreads = {};
  // ensure users sets
  Object.values(s.users || {}).forEach(u => {
    u.following = new Set(u.following || []);
    u.friends = new Set(u.friends || []);
    u.friendRequests = new Set(u.friendRequests || []);
    // ensure subscription presence
    if (!u.subscription) u.subscription = { planId: 'free', startedAt: now(), renewsAt: null };
    if (u.coverImage === undefined) u.coverImage = ''; // cover image (can be GIF in medium)
    if (u.profileGif === undefined) u.profileGif = ''; // profile GIF (medium)
  });
  // ensure posts sets
  Object.values(s.posts || {}).forEach(p => { p.likes = new Set(p.likes || []); });
  return s;
}
function hydrate() {
  const { data, meta } = Storage.load();
  if (data) {
    const migrated = migrate(data);
    Object.assign(state, migrated);
    persist(); // save with new version/meta
  } else {
    state.session = null;
    state.users = {}; state.posts = {}; state.comments = {};
    state.feedOrder = []; state.chatThreads = {};
    state.dark = matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    const bot = createUser(BOT_HANDLE, 'Helpex', 'Your helpful AI friend', 'bot_secret', { isBot: true, avatarColor: '#22c55e' });
    persist();
  }
}

/* Helpers to serialize sets */
function toPlain(map) {
  const obj = {};
  for (const [k, v] of Object.entries(map)) {
    obj[k] = {
      ...v,
      likes: v.likes ? Array.from(v.likes) : undefined
    };
  }
  return obj;
}
function toPlainUsers(map) {
  const obj = {};
  for (const [k, v] of Object.entries(map)) {
    obj[k] = {
      ...v,
      following: v.following ? Array.from(v.following) : undefined,
      friends: v.friends ? Array.from(v.friends) : undefined,
      friendRequests: v.friendRequests ? Array.from(v.friendRequests) : undefined
    };
  }
  return obj;
}

/* Models */
function createUser(handle, displayName, bio='', password='', extra={}) {
  const id = uid('usr');
  const user = {
    id,
    handle: String(handle).toLowerCase(),
    displayName: String(displayName),
    bio,
    email: extra.email || '',
    phone: extra.phone || '',
    passwordHash: hash(password || ''),
    profilePic: '',
    avatarColor: extra.avatarColor || '#334155',
    coverImage: '',    // URL/Base64 (GIF allowed in medium)
    profileGif: '',    // URL/Base64 (GIF allowed in medium)
    createdAt: now(),
    following: new Set(),
    friends: new Set(),
    friendRequests: new Set(),
    isBot: !!extra.isBot,
    lastDisplayNameChange: null,
    lastHandleChange: null,
    freeHandleChangeAvailable: !extra.isBot,
    subscription: { planId: 'free', startedAt: now(), renewsAt: null }
  };
  state.users[id] = user;
  return user;
}
function getUserByHandle(handle) {
  return Object.values(state.users).find(u => u.handle.toLowerCase() === String(handle).toLowerCase());
}
function getUserByEmail(email) {
  return Object.values(state.users).find(u => u.email && u.email.toLowerCase() === String(email).toLowerCase());
}
function currentUser() { return state.session ? state.users[state.session.userId] : null; }

/* Subscriptions */
function getPlan(user) {
  return PLANS[user.subscription?.planId || 'free'] || PLANS.free;
}
function changePlan(user, planId) {
  const plan = PLANS[planId] || PLANS.free;
  user.subscription = { planId, startedAt: user.subscription?.startedAt || now(), renewsAt: null };
  // Apply wallpaper unlock on plan switch (keep users' chosen wallpaper)
  persist();
}

/* Feature gating helpers */
function canUseWallpapers(user) { return !!getPlan(user).features.wallpapers; }
function canUseCoverImage(user) { return !!getPlan(user).features.coverImage; }
function canUseGifCover(user) { return !!getPlan(user).features.gifCover; }
function canUseGifProfile(user) { return !!getPlan(user).features.gifProfile; }
function hasNoAds(user) { return !!getPlan(user).features.noAds; }
function hasHelpexPro(user) { return !!getPlan(user).features.helpexPro; }

/* Follow & friends */
function follow(followerId, followingId) {
  const u = state.users[followerId]; if (!u || followerId === followingId) return;
  u.following.add(followingId); persist();
}
function unfollow(followerId, followingId) {
  const u = state.users[followerId]; if (!u) return;
  u.following.delete(followingId); persist();
}
function sendFriendRequest(fromId, toId) {
  const to = state.users[toId]; const from = state.users[fromId];
  if (!to || !from || fromId === toId) return;
  to.friendRequests.add(fromId); persist();
}
function acceptFriendRequest(userId, fromId) {
  const me = state.users[userId]; const from = state.users[fromId];
  if (!me || !from || !me.friendRequests.has(fromId)) return;
  me.friendRequests.delete(fromId);
  me.friends.add(fromId); from.friends.add(userId);
  ensureThread(userId, fromId);
  persist();
}
function ensureThread(aId, bId) {
  const key = threadKey(aId, bId);
  if (!state.chatThreads[key]) state.chatThreads[key] = { participants: [aId, bId], messages: [] };
  return key;
}
function threadKey(aId, bId) { return [aId, bId].sort().join('__'); }

/* Posts & comments */
function createPost(authorId, text, imageData='') {
  const id = uid('pst');
  const post = { id, authorId, text: text.trim(), imageData, createdAt: now(), likes: new Set() };
  state.posts[id] = post; state.feedOrder.unshift(id); persist(); return post;
}
function likePost(userId, postId) {
  const p = state.posts[postId]; if (!p) return;
  if (p.likes.has(userId)) p.likes.delete(userId); else p.likes.add(userId);
  persist();
}
function addComment(authorId, postId, text) {
  const id = uid('cmt');
  state.comments[id] = { id, postId, authorId, text: String(text).trim(), createdAt: now() };
  persist(); return state.comments[id];
}

/* Name rules */
function canChangeDisplayName(user) {
  if (!user.lastDisplayNameChange) return { ok: true, waitDays: 0 };
  const elapsed = daysSince(user.lastDisplayNameChange);
  const ok = elapsed >= DISPLAY_COOLDOWN_DAYS;
  return { ok, waitDays: ok ? 0 : clamp(DISPLAY_COOLDOWN_DAYS - elapsed, 0, DISPLAY_COOLDOWN_DAYS) };
}
function changeDisplayName(user, newName) {
  const rule = canChangeDisplayName(user);
  if (!rule.ok) return { ok: false, error: `Wait ${rule.waitDays} day(s) to change display name.` };
  user.displayName = newName.trim(); user.lastDisplayNameChange = now(); persist(); return { ok: true };
}
function canChangeHandle(user) {
  if (user.freeHandleChangeAvailable) return { ok: true, free: true, waitDays: 0 };
  if (!user.lastHandleChange) return { ok: true, waitDays: 0 };
  const elapsed = daysSince(user.lastHandleChange);
  const ok = elapsed >= HANDLE_COOLDOWN_DAYS;
  return { ok, waitDays: ok ? 0 : clamp(HANDLE_COOLDOWN_DAYS - elapsed, 0, HANDLE_COOLDOWN_DAYS) };
}
function changeHandle(user, newHandle) {
  newHandle = String(newHandle).trim().toLowerCase();
  if (!newHandle || newHandle.length < 3 || newHandle.length > 20) return { ok: false, error: 'Handle must be 3–20 characters.' };
  if (getUserByHandle(newHandle)) return { ok: false, error: 'Handle is already taken.' };
  const rule = canChangeHandle(user);
  if (!rule.ok) return { ok: false, error: `Wait ${rule.waitDays} day(s) to change handle.` };
  user.handle = newHandle; if (user.freeHandleChangeAvailable) user.freeHandleChangeAvailable = false;
  user.lastHandleChange = now(); persist(); return { ok: true };
}

/* Helpex AI — meaningful multilingual; Pro has richer guidance */
function helpexUser() { return getUserByHandle(BOT_HANDLE); }
function sendThreadMessage(aId, bId, authorId, text) {
  const key = ensureThread(aId, bId);
  const msg = { id: uid('msg'), authorId, text: String(text).trim(), createdAt: now() };
  state.chatThreads[key].messages.push(msg); persist(); return msg;
}
function helpexReplyTo(text, lang='hu', userCountry='Hungary', pro=false) {
  const lower = String(text).toLowerCase();

  // intents
  const intent = (() => {
    if (/(reset|forgot).*(password)/.test(lower)) return 'reset_password';
    if (/password/.test(lower)) return 'password_help';
    if (/name.*change|change.*name|handle/.test(lower)) return 'name_rules';
    if (/call|camera|microphone|video call|hangout/.test(lower)) return 'calls_help';
    if (/post|share|upload/.test(lower)) return 'posting';
    if (/friend|add friend|follow/.test(lower)) return 'friends';
    if (/plan|subscribe|price|premium|basic|medium/.test(lower)) return 'plans';
    if (/hello|hi|hey|hola|bonjour|szia|salut/.test(lower)) return 'hello';
    if (/help|how|guide|instructions/.test(lower)) return 'general_help';
    return 'fallback';
  })();

  const base = generateReplyByIntent(intent, userCountry, pro);
  return translateMeaningfully(base, lang);
}
function generateReplyByIntent(intent, country, pro) {
  // Pro adds detailed, step-by-step guidance
  const detail = pro ? 'Detailed:' : 'Tip:';
  switch (intent) {
    case 'reset_password':
      return pro
        ? `Temporary password set: temp1234. Log out, sign in with it, then change your password in Profile → Edit.`
        : `Say "reset password" to set a temporary password (demo). Then sign in and change it in Profile.`;
    case 'password_help':
      return pro
        ? `If you forgot your password, open Helpex and say "reset password". After login, go to Profile → Edit to set a new one.`
        : `Forgot password? Use Helpex "reset password". Then change it in Profile.`;
    case 'name_rules':
      return `Display name can be changed every ${DISPLAY_COOLDOWN_DAYS} days. Handle: one free change after registration, then every ${HANDLE_COOLDOWN_DAYS} days.`;
    case 'calls_help':
      return pro
        ? `Open Calls, select camera/mic, join a room code in both tabs, then Start/Answer. Use chat for text, Send file for images/videos, and Record voice for notes.`
        : `Calls: pick devices, join same room code in two tabs, Start/Answer.`;
    case 'posting':
      return pro
        ? `Compose a post, attach images (PNG/JPG/GIF). Medium users can use GIF cover/profile. Click Post to publish.`
        : `Use the Feed composer and attach images, then Post.`;
    case 'friends':
      return pro
        ? `Open a profile → Add friend. When accepted, a private chat opens. You can follow users separately.`
        : `Add friends from profiles. After acceptance, you can chat privately.`;
    case 'plans':
      return pro
        ? `Plans: Free (core), Basic 999/month (wallpapers, cover image), Medium 1999/month (no ads, GIF cover/profile, Helpex Pro). Change plan in Subscriptions.`
        : `Basic 999/month, Medium 1999/month. Medium unlocks Helpex Pro and removes ads.`;
    case 'hello':
      return `Hello from ${country}! Ask about posts, profiles, calls, friends, or subscriptions.`;
    case 'general_help':
      return pro
        ? `I can guide posting, profile edits, name rules, calls setup, subscriptions (Basic, Medium), and recovery. What do you need next?`
        : `Ask me about posting, profile, calls, or plans.`;
    default:
      return pro
        ? `I understood: "${intent}". Tell me more. I can help with posts, profile, calls, friends, and subscriptions.`
        : `Tell me more. I can help with posts, profile, calls, and friends.`;
  }
}
function translateMeaningfully(text, lang) {
  if (lang === 'hu') return text;
  if (lang === 'en') return text;
  const maps = {
    es: {
      'Temporary password set: temp1234. Log out, sign in with it, then change your password in Profile → Edit.':
        'Contraseña temporal configurada: temp1234. Cierra sesión, inicia con ella y cambia la contraseña en Perfil → Editar.',
      'Forgot password? Use Helpex "reset password". Then change it in Profile.':
        '¿Olvidaste la contraseña? Usa Helpex "reset password". Luego cámbiala en Perfil.',
      'Display name can be changed every 7 days. Handle: one free change after registration, then every 30 days.':
        'El nombre visible puede cambiarse cada 7 días. El usuario: un cambio gratis tras registrarse y luego cada 30 días.',
      'Calls: pick devices, join same room code in two tabs, Start/Answer.':
        'Llamadas: selecciona dispositivos, entra al mismo código de sala en dos pestañas, Iniciar/Responder.',
      'Use the Feed composer and attach images, then Post.':
        'Usa el compositor del Feed y adjunta imágenes, luego Publica.',
      'Add friends from profiles. After acceptance, you can chat privately.':
        'Añade amigos desde perfiles. Tras la aceptación, puedes chatear en privado.'
    },
    fr: {
      'Forgot password? Use Helpex "reset password". Then change it in Profile.':
        'Mot de passe oublié ? Utilisez Helpex "reset password". Ensuite, changez-le dans Profil.',
      'Calls: pick devices, join same room code in two tabs, Start/Answer.':
        'Appels : choisissez appareils, rejoignez le même code de salle dans deux onglets, Démarrer/Répondre.'
    },
    ro: {
      'Forgot password? Use Helpex "reset password". Then change it in Profile.':
        'Ai uitat parola? Folosește Helpex "reset password". Apoi schimb-o în Profil.',
      'Calls: pick devices, join same room code in two tabs, Start/Answer.':
        'Apeluri: alege dispozitivele, intră cu același cod de cameră în două taburi, Start/Answer.'
    }
  };
  // Simple fallback: if not matched, prepend language tag to ensure comprehension
  const langMap = maps[lang] || {};
  return langMap[text] || text;
}

/* DOM refs */
const app = document.getElementById('app');
const yearEl = document.getElementById('year'); if (yearEl) yearEl.textContent = new Date().getFullYear();
const authModal = document.getElementById('authModal');
const signInModal = document.getElementById('signInModal');
const postModal = document.getElementById('postModal');
const postDetailContent = document.getElementById('postDetailContent');
const whatsNewModal = document.getElementById('whatsNewModal');
const loaderScreen = document.getElementById('loader'); // needs <div id="loader"> in HTML

/* Theme + wallpapers */
function setDarkMode(enabled) { document.documentElement.classList.toggle('dark', enabled); state.dark = enabled; persist(); }
function applyWallpaper(user) {
  const w = state.settings.wallpaper;
  const root = document.documentElement;
  if (w === 'blue') root.style.setProperty('--bg', '#0d1b2a');
  else if (w === 'purple') root.style.setProperty('--bg', '#1b1035');
  else if (w === 'red') root.style.setProperty('--bg', '#2a0f14');
  else if (w && w.startsWith('url(')) root.style.backgroundImage = w;
  else { root.style.removeProperty('background-image'); root.style.setProperty('--bg', state.dark ? '#0b0f14' : '#f7fafc'); }
}

/* Router */
window.addEventListener('hashchange', renderApp);

/* UI language helpers */
function t(key) {
  const lang = state.settings.uiLanguage || 'en';
  return (UI_STRINGS[lang] && UI_STRINGS[lang][key]) || UI_STRINGS['en'][key] || key;
}
function applyUILanguage() {
  ['feedBtn','chatBtn','callsBtn','helpexBtn','profileBtn','signinBtn'].forEach(id => {
    const el = document.getElementById(id);
    const map = { feedBtn:'feed', chatBtn:'chat', callsBtn:'calls', helpexBtn:'helpex', profileBtn:'profile', signinBtn:'signin' };
    if (el && map[id]) el.textContent = t(map[id]);
  });

  const setText = (id, key, fallback) => {
    const el = document.getElementById(id); if (!el) return;
    el.textContent = t(key) || fallback || el.textContent;
  };
  setText('authTitle','welcome');
  setText('authDesc','registerDesc', UI_STRINGS['en'].registerDesc);
  setText('labelHandle','handle');
  setText('labelDisplay','displayName');
  setText('labelEmail','email');
  setText('labelPhone','phone');
  setText('labelBio','bio');
  setText('labelPassword','password');
  setText('authSubmit','register');
  setText('signInTitle','signinTitle');
  setText('labelSignHandle','handle');
  const lsh = document.getElementById('labelSignHandle'); if (lsh) lsh.textContent = t('handle') + ' / ' + t('email');
  setText('labelSignPassword','password');
  setText('signSubmit','signinTitle');
  setText('forgotBtn','forgot');
  setText('whatsNewTitle','whatsNewTitle');

  // Language and country selects
  const uiLangSelect = document.getElementById('uiLangSelect');
  const countrySelect = document.getElementById('countrySelect');
  if (uiLangSelect && uiLangSelect.options.length === 0) {
    ['hu','en','es','fr','ro'].forEach(l => {
      const opt = document.createElement('option'); opt.value = l; opt.textContent = l.toUpperCase(); uiLangSelect.appendChild(opt);
    });
    uiLangSelect.value = state.settings.uiLanguage;
    uiLangSelect.onchange = () => { state.settings.uiLanguage = uiLangSelect.value; persist(); applyUILanguage(); renderApp(); };
  } else if (uiLangSelect) uiLangSelect.value = state.settings.uiLanguage;
  if (countrySelect && countrySelect.options.length === 0) {
    ['Hungary','Spain','France','Romania','Germany','USA','UK'].forEach(c => {
      const opt = document.createElement('option'); opt.value = c; opt.textContent = c; countrySelect.appendChild(opt);
    });
    countrySelect.value = state.settings.country;
    countrySelect.onchange = () => { state.settings.country = countrySelect.value; persist(); };
  } else if (countrySelect) countrySelect.value = state.settings.country;
}

/* Loader control */
function hideLoaderAndStart() {
  if (loaderScreen) loaderScreen.style.display = 'none';
  if (app) app.hidden = false;
  renderApp();
}

/* App render */
function renderApp() {
  applyUILanguage();
  applyWallpaper(currentUser() || {});
  const me = currentUser();
  const avatarBtn = document.getElementById('userMenuBtn');
  if (avatarBtn) avatarBtn.textContent = me ? (me.profilePic ? '' : initials(me.displayName)) : '?';
  const route = location.hash.replace('#','') || 'feed';
  if (!me) return showAuth();
  if (!state.lastSeenWhatsNew) { whatsNewModal?.showModal(); state.lastSeenWhatsNew = now(); persist(); }
  if (route.startsWith('profile/')) {
    const handle = route.split('/')[1] || me.handle;
    const user = getUserByHandle(handle) || me; return renderProfile(user);
  }
  if (route.startsWith('post/')) {
    const postId = route.split('/')[1]; return openPostModal(postId);
  }
  if (route === 'chat') return renderChat();
  if (route === 'calls') return renderCalls();
  if (route === 'helpex') return renderHelpex();
  if (route === 'subscriptions') return renderSubscriptions();
  if (route === 'profile') return renderProfile(me);
  return renderFeed();
}
function showAuth() { authModal?.showModal(); app.innerHTML = ''; }

/* Feed */
function filteredFeed() {
  const me = currentUser(); if (!me) return state.feedOrder;
  const following = new Set([...me.following, me.id, ...me.friends]);
  return state.feedOrder.filter(id => following.has(state.posts[id].authorId));
}
function renderFeed() {
  const me = currentUser(); const feedIds = filteredFeed();
  const adsBanner = hasNoAds(me) ? '' : `<div class="card" style="margin-bottom:1rem"><strong>Ad</strong><p class="muted">Upgrade to Medium to remove ads.</p></div>`;
  app.innerHTML = `
    ${adsBanner}
    <div class="grid-2">
      <section>
        <div class="card composer">
          <textarea id="postText" rows="3" placeholder="What's on your mind?"></textarea>
          <input id="postFile" type="file" accept="image/*">
          <div class="actions">
            <span class="muted">Posting as ${me.displayName} (@${me.handle})</span>
            <button id="postBtn" class="btn primary">Post</button>
          </div>
        </div>
        <div class="feed">
          ${feedIds.map(renderPostCard).join('') || '<p class="muted">No posts yet. Say hello to Helpex in Helpex tab, or make your first post.</p>'}
        </div>
      </section>
      <aside class="aside">
        <div class="panel">
          <h4>People you may know</h4>
          <div>${suggestPeople(me).map(renderUserSuggestion).join('') || '<p class="muted">No suggestions yet.</p>'}</div>
          <div class="panel" style="margin-top:1rem">
            <h4>${t('subscriptions')}</h4>
            <button class="btn" onclick="location.hash='#subscriptions'; renderSubscriptions();">${t('choosePlan')}</button>
            <p class="muted">${t('activePlan')}: ${getPlan(me).name} (${getPlan(me).priceMonthly}${t('priceMonthly')})</p>
          </div>
        </div>
      </aside>
    </div>
  `;
  document.getElementById('postBtn').onclick = async () => {
    const text = document.getElementById('postText').value;
    const file = document.getElementById('postFile').files[0];
    let img = '';
    if (file) img = await fileToBase64(file);
    if (!text.trim() && !img) return;
    const p = createPost(me.id, text, img);
    document.getElementById('postText').value = ''; document.getElementById('postFile').value = '';
    prependPost(p.id);
  };
  bindPostActions();
}
function renderPostCard(id) {
  const p = state.posts[id]; const author = state.users[p.authorId];
  const likeCount = p.likes.size;
  const comments = Object.values(state.comments).filter(c => c.postId === id);
  return `
    <article class="card post" data-id="${id}">
      <div class="avatar">${author.profilePic ? `<img src="${author.profilePic}" alt="Avatar">` : initials(author.displayName)}</div>
      <div>
        <div class="head">
          <a href="#profile/${author.handle}" class="link"><strong>${author.displayName}</strong></a>
          <span class="handle">@${author.handle}</span>
          <span class="time">${fmtTime(p.createdAt)}</span>
        </div>
        <p class="text">${escapeHtml(p.text)}</p>
        ${p.imageData ? `<div class="image"><img src="${p.imageData}" alt="Post image"></div>` : ''}
        <div class="actions">
          <button class="btn" data-action="like">${p.likes.has(currentUser().id) ? 'Unlike' : 'Like'}</button>
          <span class="stat">❤ ${likeCount}</span>
          <button class="btn" data-action="comment">Comment</button>
          <span class="stat">💬 ${comments.length}</span>
          <button class="btn ghost" data-action="open">Open</button>
        </div>
        <div class="comments">
          ${comments.slice(-3).map(renderComment).join('')}
          ${comments.length > 3 ? `<button class="btn ghost" data-action="open">View all comments</button>` : ''}
        </div>
        <div class="composer" style="margin-top:0.5rem">
          <input type="text" placeholder="Write a comment…" data-input="comment">
          <button class="btn" data-action="addComment">Post</button>
        </div>
      </div>
    </article>
  `;
}
function renderComment(c) {
  const u = state.users[c.authorId];
  return `
    <div class="comment">
      <div class="avatar">${u.profilePic ? `<img src="${u.profilePic}" alt="Avatar">` : initials(u.displayName)}</div>
      <div>
        <div class="head">
          <a href="#profile/${u.handle}" class="link"><strong>${u.displayName}</strong></a>
          <span class="handle">@${u.handle}</span>
          <span class="time">${fmtTime(c.createdAt)}</span>
        </div>
        <p class="text">${escapeHtml(c.text)}</p>
      </div>
    </div>
  `;
}
function bindPostActions() {
  document.querySelectorAll('.post').forEach(postEl => {
    const id = postEl.dataset.id;
    const likeBtn = postEl.querySelector('[data-action="like"]');
    const commentBtn = postEl.querySelector('[data-action="comment"]');
    const addCommentBtn = postEl.querySelector('[data-action="addComment"]');
    const openBtn = postEl.querySelector('[data-action="open"]');
    const input = postEl.querySelector('[data-input="comment"]');
    likeBtn && (likeBtn.onclick = () => { likePost(currentUser().id, id); renderApp(); });
    commentBtn && (commentBtn.onclick = () => { input?.focus(); });
    addCommentBtn && (addCommentBtn.onclick = () => {
      const text = input.value; if (!text.trim()) return;
      addComment(currentUser().id, id, text); input.value = ''; renderApp();
    });
    openBtn && (openBtn.onclick = () => openPostModal(id));
  });
}
function prependPost(id) {
  const feedEl = document.querySelector('.feed'); if (!feedEl) return renderApp();
  const temp = document.createElement('div'); temp.innerHTML = renderPostCard(id);
  feedEl.prepend(temp.firstElementChild); bindPostActions();
}

/* Post modal */
function openPostModal(postId) {
  const p = state.posts[postId]; if (!p) return;
  const author = state.users[p.authorId];
  const comments = Object.values(state.comments).filter(c => c.postId === postId);
  postDetailContent.innerHTML = `
    <article class="post" data-id="${postId}">
      <div class="avatar">${author.profilePic ? `<img src="${author.profilePic}" alt="Avatar">` : initials(author.displayName)}</div>
      <div>
        <div class="head">
          <a href="#profile/${author.handle}" class="link"><strong>${author.displayName}</strong></a>
          <span class="handle">@${author.handle}</span>
          <span class="time">${fmtTime(p.createdAt)}</span>
        </div>
        <p class="text">${escapeHtml(p.text)}</p>
        ${p.imageData ? `<div class="image"><img src="${p.imageData}" alt="Post image"></div>` : ''}
        <div class="actions">
          <button class="btn" data-action="like">${p.likes.has(currentUser().id) ? 'Unlike' : 'Like'}</button>
          <span class="stat">❤ ${p.likes.size}</span>
          <button class="btn" data-action="comment">Comment</button>
          <span class="stat">💬 ${comments.length}</span>
        </div>
        <div>${comments.map(renderComment).join('')}</div>
        <div class="composer" style="margin-top:0.5rem">
          <input type="text" placeholder="Write a comment…" data-input="comment">
          <button class="btn" data-action="addComment">Post</button>
        </div>
      </div>
    </article>
  `;
  postModal?.showModal();
  document.getElementById('closePostModal').onclick = () => postModal?.close();
  bindPostActions();
}

/* Profile (with cover & plan features) */
function renderProfile(user) {
  const me = currentUser(); const isMe = me.id === user.id;
  const posts = state.feedOrder.filter(id => state.posts[id].authorId === user.id);
  const dRule = canChangeDisplayName(user);
  const hRule = canChangeHandle(user);
  const isFriend = me.friends.has(user.id);
  const hasRequestFromMe = user.friendRequests.has(me.id);
  const plan = getPlan(user);

  const coverHtml = user.coverImage
    ? `<div style="border-radius:10px; overflow:hidden; border:1px solid var(--border); margin-bottom:0.75rem">
        ${user.coverImage.endsWith('.gif') ? `<img src="${user.coverImage}" alt="Cover" style="width:100%; display:block">`
          : `<img src="${user.coverImage}" alt="Cover" style="width:100%; display:block">`}
      </div>`
    : '';

  const profileAvatar = user.profileGif && canUseGifProfile(user)
    ? `<img src="${user.profileGif}" alt="Avatar">`
    : (user.profilePic ? `<img src="${user.profilePic}" alt="Avatar">` : initials(user.displayName));

  app.innerHTML = `
    <section class="card" style="margin-bottom:1rem">
      ${coverHtml}
      <div class="post">
        <div class="avatar">${profileAvatar}</div>
        <div>
          <div class="head">
            <strong>${user.displayName}</strong>
            <span class="handle">@${user.handle}</span>
            <span class="time">Joined ${new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
          <p class="text">${escapeHtml(user.bio || '')}</p>
          <div class="actions">
            ${isMe ? `
              <button class="btn" id="editProfileBtn">Edit profile</button>
              <button class="btn" id="openSubsBtn">${t('subscriptions')}</button>
              <span class="muted">${t('activePlan')}: ${plan.name} (${plan.priceMonthly}${t('priceMonthly')})</span>
            ` : `
              ${isFriend ? `<span class="muted">You are friends</span> <button class="btn" id="openChatBtn">Message</button>` :
                hasRequestFromMe ? `<span class="muted">Friend request sent</span>` :
                `<button class="btn primary" id="addFriendBtn">Add friend</button>`}
              <button class="btn ${me.following.has(user.id) ? 'danger' : 'primary'}" id="followBtn">
                ${me.following.has(user.id) ? 'Unfollow' : 'Follow'}
              </button>
            `}
          </div>
          ${!isMe && user.friendRequests.has(me.id) ? `<p class="muted">Awaiting ${user.displayName} to accept your request.</p>` : ''}
          ${isMe && me.friendRequests.size ? `
            <div class="card" style="margin-top:0.75rem">
              <strong>Friend requests</strong>
              ${Array.from(me.friendRequests).map(fid => {
                const u = state.users[fid];
                return `<div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem">
                  <div class="avatar">${u.profilePic ? `<img src="${u.profilePic}">` : initials(u.displayName)}</div>
                  <div><strong>${u.displayName}</strong> <span class="handle">@${u.handle}</span></div>
                  <button class="btn primary" data-accept="${u.id}">Accept</button>
                </div>`;
              }).join('')}
            </div>
          ` : ''}
        </div>
      </div>
      ${isMe ? `
        <div class="card" style="margin-top:0.75rem">
          <strong>Appearance</strong>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap">
            <button class="btn" data-wall="default">Default</button>
            <button class="btn" data-wall="blue" ${!canUseWallpapers(me) ? 'disabled' : ''}>Blue</button>
            <button class="btn" data-wall="purple" ${!canUseWallpapers(me) ? 'disabled' : ''}>Purple</button>
            <button class="btn" data-wall="red" ${!canUseWallpapers(me) ? 'disabled' : ''}>Red</button>
          </div>
          <div style="margin-top:0.5rem">
            <label>Cover image ${canUseCoverImage(me) ? '' : '(upgrade to Basic)'}
              <input id="coverInput" type="file" accept="${canUseGifCover(me) ? 'image/*' : 'image/png,image/jpeg'}" ${canUseCoverImage(me) ? '' : 'disabled'}>
            </label>
            <label style="margin-top:0.5rem">Profile GIF ${canUseGifProfile(me) ? '' : '(upgrade to Medium)'}
              <input id="profileGifInput" type="file" accept="image/gif" ${canUseGifProfile(me) ? '' : 'disabled'}>
            </label>
          </div>
        </div>
      ` : ''}
    </section>

    <section>
      <h3>Posts</h3>
      <div class="feed">
        ${posts.length ? posts.map(renderPostCard).join('') : `<p class="muted">No posts yet.</p>`}
      </div>
    </section>
  `;

  if (!isMe) {
    const followBtn = document.getElementById('followBtn');
    followBtn.onclick = () => { me.following.has(user.id) ? unfollow(me.id, user.id) : follow(me.id, user.id); renderProfile(user); };
    const addBtn = document.getElementById('addFriendBtn');
    addBtn && (addBtn.onclick = () => { sendFriendRequest(me.id, user.id); renderProfile(user); });
    const openChatBtn = document.getElementById('openChatBtn');
    openChatBtn && (openChatBtn.onclick = () => { location.hash = '#chat'; renderChatWith(user); });
  } else {
    document.getElementById('editProfileBtn').onclick = () => openEditProfileModal(me);
    document.getElementById('openSubsBtn').onclick = () => { location.hash = '#subscriptions'; renderSubscriptions(); };
    document.querySelectorAll('[data-accept]').forEach(btn => {
      btn.onclick = () => { acceptFriendRequest(me.id, btn.getAttribute('data-accept')); renderProfile(me); };
    });
    document.querySelectorAll('[data-wall]').forEach(btn => {
      btn.onclick = () => {
        const val = btn.getAttribute('data-wall');
        if (val !== 'default' && !canUseWallpapers(me)) { alert('Upgrade to Basic to use wallpapers.'); return; }
        state.settings.wallpaper = val; persist(); applyWallpaper(me);
      };
    });
    const coverInput = document.getElementById('coverInput');
    coverInput && (coverInput.onchange = async () => {
      const file = coverInput.files[0]; if (!file) return;
      if (!canUseCoverImage(me)) { alert('Upgrade to Basic for cover image.'); return; }
      const isGif = file.type === 'image/gif';
      if (isGif && !canUseGifCover(me)) { alert('Upgrade to Medium for GIF cover.'); return; }
      me.coverImage = await fileToBase64(file); persist(); renderProfile(me);
    });
    const profileGifInput = document.getElementById('profileGifInput');
    profileGifInput && (profileGifInput.onchange = async () => {
      const file = profileGifInput.files[0]; if (!file) return;
      if (!canUseGifProfile(me)) { alert('Upgrade to Medium for profile GIF.'); return; }
      if (file.type !== 'image/gif') { alert('Only GIF allowed.'); return; }
      me.profileGif = await fileToBase64(file); persist(); renderProfile(me);
    });
  }

  bindPostActions();
}

/* Subscriptions UI */
function renderSubscriptions() {
  const me = currentUser(); const active = getPlan(me).id;
  app.innerHTML = `
    <section class="card">
      <h3>${t('subscriptions')}</h3>
      <p class="muted">${t('activePlan')}: ${getPlan(me).name} (${getPlan(me).priceMonthly}${t('priceMonthly')})</p>
      <div style="display:grid; gap:0.75rem; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));">
        ${Object.values(PLANS).map(p => `
          <div class="card">
            <strong>${p.name}</strong>
            <p class="muted">${p.priceMonthly}${t('priceMonthly')}</p>
            <ul>
              <li>Wallpapers: ${p.features.wallpapers ? 'Yes' : 'No'}</li>
              <li>Cover image: ${p.features.coverImage ? 'Yes' : 'No'}</li>
              <li>GIF cover/profile: ${p.features.gifCover || p.features.gifProfile ? 'Yes' : 'No'}</li>
              <li>No ads: ${p.features.noAds ? 'Yes' : 'No'}</li>
              <li>Helpex Pro: ${p.features.helpexPro ? 'Yes' : 'No'}</li>
            </ul>
            <button class="btn ${active===p.id ? 'ghost' : 'primary'}" ${active===p.id ? 'disabled' : ''} onclick="changePlan(currentUser(), '${p.id}'); renderSubscriptions();">
              ${active===p.id ? t('activePlan') : t('changePlan')}
            </button>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

/* Profile editor */
function openEditProfileModal(me) {
  const dRule = canChangeDisplayName(me);
  const hRule = canChangeHandle(me);
  const dialog = document.createElement('dialog');
  dialog.innerHTML = `
    <form method="dialog" class="auth-form" id="editForm">
      <h3>Edit profile</h3>
      <label>Display name
        <input name="displayName" type="text" maxlength="40" value="${escapeAttr(me.displayName)}" ${dRule.ok ? '' : 'disabled'}>
      </label>
      ${dRule.ok ? '' : `<p class="muted">Wait ${dRule.waitDays} day(s) to change display name.</p>`}
      <label>Handle (profile name)
        <input name="handle" type="text" minlength="3" maxlength="20" value="${escapeAttr(me.handle)}" ${hRule.ok ? '' : 'disabled'}>
      </label>
      ${hRule.ok ? `<p class="muted">${hRule.free ? 'Free change available.' : 'You can change now.'}</p>` : `<p class="muted">Wait ${hRule.waitDays} day(s) to change handle.</p>`}
      <label>Bio
        <textarea name="bio" rows="2" maxlength="160">${escapeHtml(me.bio || '')}</textarea>
      </label>
      <label>Profile picture
        <input name="pic" type="file" accept="image/*">
      </label>
      <label>New password
        <input name="password" type="password" minlength="6" placeholder="Leave blank to keep current">
      </label>
      <div class="form-actions">
        <button value="cancel" type="button" id="editCancel">Cancel</button>
        <button value="confirm" type="submit">Save</button>
      </div>
    </form>
  `;
  document.body.appendChild(dialog);
  dialog.showModal();

  dialog.querySelector('#editCancel').onclick = () => { dialog.close(); dialog.remove(); };
  dialog.querySelector('#editForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newDisplay = String(fd.get('displayName') || me.displayName).trim();
    const newHandle = String(fd.get('handle') || me.handle).trim();
    const bio = String(fd.get('bio') || '').trim();
    const picFile = fd.get('pic');
    const newPassword = String(fd.get('password') || '').trim();

    let errors = [];
    if (newDisplay !== me.displayName) {
      const res = changeDisplayName(me, newDisplay);
      if (!res.ok) errors.push(res.error);
    }
    if (newHandle.toLowerCase() !== me.handle.toLowerCase()) {
      const res = changeHandle(me, newHandle);
      if (!res.ok) errors.push(res.error);
    }
    me.bio = bio;

    if (picFile && picFile.size > 0) me.profilePic = await fileToBase64(picFile);
    if (newPassword) {
      if (newPassword.length < 6) errors.push('Password must be at least 6 characters.');
      else me.passwordHash = hash(newPassword);
    }

    if (errors.length) alert(errors.join('\n'));
    else { persist(); dialog.close(); dialog.remove(); renderProfile(me); }
  };
}

/* Chat (user-to-user + Helpex shortcut) */
function renderChat() {
  const me = currentUser(); const bot = helpexUser();
  app.innerHTML = `
    <section class="card chat">
      <div>
        <h3>Chat</h3>
        <p class="muted">Chat with Helpex or select a friend to message privately.</p>
      </div>

      <div class="card">
        <strong>Friends</strong>
        <div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.5rem">
          ${Array.from(me.friends).map(fid => {
            const u = state.users[fid];
            return `<button class="btn" data-chat="${u.id}">${u.displayName} (@${u.handle})</button>`;
          }).join('') || '<span class="muted">No friends yet.</span>'}
          <button class="btn" data-helpex="1">Talk to Helpex</button>
        </div>
      </div>

      <div id="thread">
        <h4>Helpex</h4>
        <div id="chatList">
          ${renderThreadMessages(me.id, bot.id)}
        </div>
        <div class="composer">
          <input id="chatInput" type="text" placeholder="Message…">
          <div class="actions">
            <span class="muted">Chatting as ${me.displayName} (@${me.handle})</span>
            <button id="sendChatBtn" class="btn primary">Send</button>
          </div>
        </div>
      </div>
    </section>
  `;
  document.querySelectorAll('[data-chat]').forEach(btn => {
    btn.onclick = () => {
      const otherId = btn.getAttribute('data-chat');
      renderChatWith(state.users[otherId]);
    };
  });
  const helpexBtnInline = document.querySelector('[data-helpex]');
  helpexBtnInline && (helpexBtnInline.onclick = () => { location.hash = '#helpex'; renderHelpex(); });

  document.getElementById('sendChatBtn').onclick = () => {
    const input = document.getElementById('chatInput');
    const text = input.value.trim(); if (!text) return;
    sendThreadMessage(me.id, bot.id, me.id, text);
    const reply = helpexReplyTo(text, state.settings.uiLanguage, state.settings.country, hasHelpexPro(me));
    sendThreadMessage(me.id, bot.id, bot.id, reply);
    input.value = '';
    renderChat();
  };
}
function renderThreadMessages(aId, bId) {
  const key = ensureThread(aId, bId);
  return state.chatThreads[key].messages.map(m => {
    const u = state.users[m.authorId];
    const cls = u.isBot ? 'bot' : 'me';
    return `
      <div class="message ${cls}">
        <div class="avatar">${u.profilePic ? `<img src="${u.profilePic}">` : initials(u.displayName)}</div>
        <div class="bubble">
          <div class="head"><strong>${u.displayName}</strong> <span class="handle">@${u.handle}</span> <span class="time">${fmtTime(m.createdAt)}</span></div>
          <p class="text">${escapeHtml(m.text)}</p>
        </div>
      </div>
    `;
  }).join('');
}
function renderChatWith(otherUser) {
  const me = currentUser();
  ensureThread(me.id, otherUser.id);
  app.innerHTML = `
    <section class="card chat">
      <div>
        <h3>Chat with ${otherUser.displayName}</h3>
        <p class="muted">@${otherUser.handle}</p>
      </div>
      <div id="chatList">${renderThreadMessages(me.id, otherUser.id)}</div>
      <div class="composer">
        <input id="chatInput" type="text" placeholder="Message…">
        <div class="actions">
          <span class="muted">Chatting as ${me.displayName}</span>
          <button id="sendChatBtn" class="btn primary">Send</button>
        </div>
      </div>
    </section>
  `;
  document.getElementById('sendChatBtn').onclick = () => {
    const input = document.getElementById('chatInput');
    const text = input.value.trim(); if (!text) return;
    sendThreadMessage(me.id, otherUser.id, me.id, text);
    input.value = '';
    renderChatWith(otherUser);
  };
}

/* Helpex AI panel */
function renderHelpex() {
  const me = currentUser();
  const bot = helpexUser();
  ensureThread(me.id, bot.id);
  const pro = hasHelpexPro(me);
  app.innerHTML = `
    <section class="card chat">
      <h3>Helpex AI ${pro ? '(Pro)' : ''}</h3>
      <p class="muted">I reply in ${state.settings.uiLanguage.toUpperCase()} (${state.settings.country}). ${pro ? 'Pro mode: richer answers.' : 'Upgrade to Medium for Pro answers.'}</p>
      <div id="helpexChat">${renderThreadMessages(me.id, bot.id)}</div>
      <div class="composer">
        <input id="helpexInput" type="text" placeholder="Type your question…">
        <div class="actions">
          <span class="muted">Chatting as ${me.displayName}</span>
          <button id="helpexSend" class="btn primary">Send</button>
        </div>
      </div>
    </section>
  `;
  document.getElementById('helpexSend').onclick = () => {
    const input = document.getElementById('helpexInput');
    const text = input.value.trim(); if (!text) return;
    sendThreadMessage(me.id, bot.id, me.id, text);
    const reply = helpexReplyTo(text, state.settings.uiLanguage, state.settings.country, pro);
    sendThreadMessage(me.id, bot.id, bot.id, reply);
    input.value = '';
    renderHelpex();
  };
}

/* Suggestions */
function suggestPeople(me) {
  return Object.values(state.users).filter(u => u.id !== me.id && !me.following.has(u.id));
}
function renderUserSuggestion(u) {
  return `
    <div class="post" style="margin:0.5rem 0">
      <div class="avatar">${u.profilePic ? `<img src="${u.profilePic}">` : initials(u.displayName)}</div>
      <div>
        <div class="head">
          <a href="#profile/${u.handle}" class="link"><strong>${u.displayName}</strong></a>
          <span class="handle">@${u.handle}</span>
        </div>
        <button class="btn small primary" onclick="follow('${currentUser().id}','${u.id}'); renderApp();">Follow</button>
      </div>
    </div>
  `;
}

/* Search */
const searchInput = document.getElementById('searchInput');
searchInput?.addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) { renderApp(); return; }
  const users = Object.values(state.users).filter(u =>
    u.handle.toLowerCase().includes(q) ||
    u.displayName.toLowerCase().includes(q) ||
    (u.bio || '').toLowerCase().includes(q)
  );
  const posts = Object.values(state.posts).filter(p => p.text.toLowerCase().includes(q));
  app.innerHTML = `
    <section class="card" style="margin-bottom:1rem">
      <h3>Search results</h3>
      <p class="muted">Found ${users.length} users and ${posts.length} posts for “${escapeHtml(q)}”.</p>
    </section>
    <div class="grid-2">
      <section>
        <div class="feed">
          ${posts.map(p => renderPostCard(p.id)).join('') || '<p class="muted">No posts match.</p>'}
        </div>
      </section>
      <aside class="aside">
        <div class="panel">
          <h4>People</h4>
          ${users.length ? users.map(renderUserSuggestion).join('') : '<p class="muted">No users match.</p>'}
        </div>
      </aside>
    </div>
  `;
  bindPostActions();
});

/* Auth: Register (requires email or phone) */
document.getElementById('authForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const handle = String(fd.get('handle') || '').trim().toLowerCase();
  const displayName = String(fd.get('displayName') || '').trim();
  const email = String(fd.get('email') || '').trim();
  const phone = String(fd.get('phone') || '').trim();
  const bio = String(fd.get('bio') || '').trim();
  const password = String(fd.get('password') || '').trim();
  if (!handle || !displayName || !password) return;
  if (!email && !phone) { alert('Provide at least email or phone.'); return; }

  if (getUserByHandle(handle)) { alert('Handle is already taken.'); return; }
  if (email && getUserByEmail(email)) { alert('Email is already registered.'); return; }

  const user = createUser(handle, displayName, bio, password, { email, phone });
  const bot = helpexUser(); if (bot) follow(user.id, bot.id);
  ensureThread(user.id, helpexUser().id);
  sendThreadMessage(user.id, helpexUser().id, helpexUser().id, `Welcome, ${displayName}! Ask me anything — posts, friends, calls, subscriptions, or recovery.`);
  state.session = { userId: user.id }; persist(); authModal?.close(); whatsNewModal?.showModal(); renderApp();
});
document.getElementById('authCancel')?.addEventListener('click', () => {
  document.querySelectorAll('#authForm input, #authForm textarea').forEach(i => i.value = '');
});

/* Sign in (separate modal) */
document.getElementById('signInForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const idField = String(fd.get('signHandle') || '').trim();
  const password = String(fd.get('signPassword') || '').trim();
  if (!idField || !password) return;

  let user = null;
  if (idField.includes('@')) user = getUserByEmail(idField.toLowerCase());
  else user = getUserByHandle(idField.toLowerCase());
  if (!user) { alert('No such user.'); return; }
  if (user.passwordHash !== hash(password)) { alert('Incorrect password.'); return; }

  state.session = { userId: user.id }; persist(); signInModal?.close(); whatsNewModal?.showModal(); renderApp();
});
document.getElementById('signCancel')?.addEventListener('click', () => {
  document.querySelectorAll('#signInForm input').forEach(i => i.value = '');
});
document.getElementById('forgotBtn')?.addEventListener('click', () => {
  alert('Tip: Open Helpex and say “reset password”.');
});

/* Navigation */
document.getElementById('feedBtn')?.addEventListener('click', () => { location.hash = '#feed'; });
document.getElementById('chatBtn')?.addEventListener('click', () => { location.hash = '#chat'; });
document.getElementById('callsBtn')?.addEventListener('click', () => { location.hash = '#calls'; });
document.getElementById('helpexBtn')?.addEventListener('click', () => { location.hash = '#helpex'; });
document.getElementById('profileBtn')?.addEventListener('click', () => {
  const me = currentUser(); location.hash = me ? `#profile/${me.handle}` : '#profile';
});
document.getElementById('signinBtn')?.addEventListener('click', () => { signInModal?.showModal(); });

document.getElementById('userMenuBtn')?.addEventListener('click', () => {
  const dd = document.getElementById('userDropdown'); dd && (dd.hidden = !dd.hidden);
});
document.addEventListener('click', (e) => {
  const dd = document.getElementById('userDropdown'); if (!dd) return;
  const btn = document.getElementById('userMenuBtn');
  if (!btn?.contains(e.target) && !dd.contains(e.target)) dd.hidden = true;
});
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  state.session = null; persist(); authModal?.showModal(); app.innerHTML = '';
});
document.getElementById('themeToggle')?.addEventListener('click', () => setDarkMode(!state.dark));
document.getElementById('resetDemo')?.addEventListener('click', () => {
  // NOTE: We do not wipe data automatically on updates; resetDemo is manual-only.
  localStorage.removeItem(Storage.key);
  localStorage.removeItem(Storage.metaKey);
  Object.keys(state).forEach(k => delete state[k]);
  state.session = null; state.users = {}; state.posts = {}; state.comments = {};
  state.feedOrder = []; state.chatThreads = {}; state.dark = false; state.lastSeenWhatsNew = null;
  hydrate(); setDarkMode(state.dark); renderApp();
});

/* Calls (WebRTC) — unchanged core */
function renderCalls() {
  const me = currentUser();
  app.innerHTML = `
    <section class="calls">
      <div class="card">
        <h3>Calls</h3>
        <p class="muted">Pick camera/mic, enter a room code, and start/answer a call. Open this page in two tabs on the same site and use the same room code.</p>
      </div>

      <div class="grid-2">
        <section class="video-panel">
          <div class="device-row">
            <label>Camera
              <select id="videoSelect"></select>
            </label>
            <label>Microphone
              <select id="audioSelect"></select>
            </label>
          </div>
          <div style="display:flex; gap:0.5rem; margin-top:0.5rem">
            <input id="roomInput" type="text" placeholder="Room code (e.g., xmedia123)" style="flex:1">
            <button id="joinRoomBtn" class="btn">Join room</button>
          </div>
          <div style="display:flex; gap:0.5rem; margin-top:0.5rem">
            <button id="startCallBtn" class="btn primary">Start call</button>
            <button id="answerCallBtn" class="btn">Answer call</button>
            <button id="hangupBtn" class="btn danger">Hang up</button>
            <button id="toggleCamBtn" class="btn">Toggle camera</button>
            <button id="toggleMicBtn" class="btn">Toggle mic</button>
          </div>

          <div class="grid-2" style="margin-top:0.75rem">
            <div class="video-box">
              <video id="localVideo" autoplay playsinline muted></video>
            </div>
            <div class="video-box">
              <video id="remoteVideo" autoplay playsinline></video>
            </div>
          </div>
        </section>

        <aside class="dc-panel">
          <strong>Call chat & media</strong>
          <div id="dcLog" class="muted" style="font-size:0.9rem; margin:0.5rem 0; max-height:160px; overflow:auto"></div>
          <div style="display:grid; gap:0.5rem">
            <div class="composer">
              <input id="dcText" type="text" placeholder="Type a message…">
              <div class="dc-actions">
                <button id="dcSendText" class="btn primary">Send text</button>
                <input id="dcFile" type="file" accept="image/*,video/*,audio/*">
                <button id="dcSendFile" class="btn">Send file</button>
                <button id="dcRecordVoice" class="btn">Record voice</button>
                <button id="dcStopRecord" class="btn danger" disabled>Stop</button>
              </div>
            </div>
            <div id="dcInbox" style="display:grid; gap:0.5rem"></div>
          </div>
        </aside>
      </div>
    </section>
  `;
  setupCallsUI();
}
async function setupCallsUI() {
  const videoSel = document.getElementById('videoSelect');
  const audioSel = document.getElementById('audioSelect');
  const localVideo = document.getElementById('localVideo');
  const remoteVideo = document.getElementById('remoteVideo');
  const roomInput = document.getElementById('roomInput');
  const joinBtn = document.getElementById('joinRoomBtn');
  const startBtn = document.getElementById('startCallBtn');
  const answerBtn = document.getElementById('answerCallBtn');
  const hangupBtn = document.getElementById('hangupBtn');
  const toggleCamBtn = document.getElementById('toggleCamBtn');
  const toggleMicBtn = document.getElementById('toggleMicBtn');
  const dcText = document.getElementById('dcText');
  const dcSendText = document.getElementById('dcSendText');
  const dcFile = document.getElementById('dcFile');
  const dcSendFile = document.getElementById('dcSendFile');
  const dcRecordVoice = document.getElementById('dcRecordVoice');
  const dcStopRecord = document.getElementById('dcStopRecord');
  const dcLog = document.getElementById('dcLog');
  const dcInbox = document.getElementById('dcInbox');

  await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(()=>{});
  const devices = await navigator.mediaDevices.enumerateDevices();
  state.calls.devices.videoInputs = devices.filter(d => d.kind === 'videoinput');
  state.calls.devices.audioInputs = devices.filter(d => d.kind === 'audioinput');
  videoSel.innerHTML = state.calls.devices.videoInputs.map(d => `<option value="${d.deviceId}">${d.label || 'Camera'}</option>`).join('');
  audioSel.innerHTML = state.calls.devices.audioInputs.map(d => `<option value="${d.deviceId}">${d.label || 'Microphone'}</option>`).join('');

  videoSel.onchange = async () => { state.calls.selected.videoId = videoSel.value; await ensureLocalStream(localVideo); };
  audioSel.onchange = async () => { state.calls.selected.audioId = audioSel.value; await ensureLocalStream(localVideo); };

  joinBtn.onclick = () => {
    const roomId = roomInput.value.trim();
    if (!roomId) { alert('Enter a room code'); return; }
    joinRoom(roomId, remoteVideo);
    dcLog.textContent = `Joined room: ${roomId}`;
  };

  startBtn.onclick = async () => {
    await ensurePeer(localVideo, remoteVideo);
    const offer = await state.calls.pc.createOffer();
    await state.calls.pc.setLocalDescription(offer);
    signal({ type: 'offer', roomId: state.calls.roomId, sdp: offer.sdp });
    log(dcLog, 'Sent offer');
  };

  answerBtn.onclick = async () => {
    await ensurePeer(localVideo, remoteVideo);
    log(dcLog, 'Ready to answer (waiting for offer)…');
  };

  hangupBtn.onclick = () => { hangup(localVideo, remoteVideo, dcLog); };

  toggleCamBtn.onclick = () => {
    if (!state.calls.localStream) return;
    const vt = state.calls.localStream.getVideoTracks()[0];
    if (vt) vt.enabled = !vt.enabled;
    log(dcLog, `Camera ${vt?.enabled ? 'enabled' : 'disabled'}`);
  };
  toggleMicBtn.onclick = () => {
    if (!state.calls.localStream) return;
    const at = state.calls.localStream.getAudioTracks()[0];
    if (at) at.enabled = !at.enabled;
    log(dcLog, `Mic ${at?.enabled ? 'enabled' : 'disabled'}`);
  };

  dcSendText.onclick = () => {
    const text = dcText.value.trim(); if (!text) return;
    sendDC({ kind: 'text', text });
    addInboxItem(dcInbox, { me: true, type: 'text', text });
    dcText.value = '';
  };
  dcSendFile.onclick = async () => {
    const file = dcFile.files[0]; if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    sendDC({ kind: 'file', name: file.name, type: file.type, size: file.size, data: arrayBuffer });
    addInboxItem(dcInbox, { me: true, type: 'file', name: file.name, mime: file.type, data: arrayBuffer });
    dcFile.value = '';
  };

  let recorder = null; let chunks = [];
  dcRecordVoice.onclick = async () => {
    await ensureLocalStream(localVideo);
    recorder = new MediaRecorder(state.calls.localStream, { mimeType: 'audio/webm' });
    chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const buf = await blob.arrayBuffer();
      sendDC({ kind: 'file', name: `voice_${Date.now()}.webm`, type: 'audio/webm', size: buf.byteLength, data: buf });
      addInboxItem(dcInbox, { me: true, type: 'file', name: `voice_${Date.now()}.webm`, mime: 'audio/webm', data: buf });
    };
    recorder.start();
    dcRecordVoice.disabled = true; dcStopRecord.disabled = false;
    log(dcLog, 'Recording voice…');
  };
  dcStopRecord.onclick = () => {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    dcRecordVoice.disabled = false; dcStopRecord.disabled = true;
    log(dcLog, 'Stopped recording.');
  };
}
function joinRoom(roomId, remoteVideo) {
  state.calls.roomId = roomId;
  if (state.calls.signaling) state.calls.signaling.close();
  state.calls.signaling = new BroadcastChannel(SIGNAL_CHANNEL);
  state.calls.signaling.onmessage = async (ev) => {
    const msg = ev.data;
    if (!msg || msg.roomId !== state.calls.roomId) return;
    if (msg.type === 'offer') {
      await ensurePeer(document.getElementById('localVideo'), remoteVideo);
      await state.calls.pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
      const answer = await state.calls.pc.createAnswer();
      await state.calls.pc.setLocalDescription(answer);
      signal({ type: 'answer', roomId: state.calls.roomId, sdp: answer.sdp });
      log(document.getElementById('dcLog'), 'Received offer, sent answer');
    } else if (msg.type === 'answer') {
      await state.calls.pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
      log(document.getElementById('dcLog'), 'Received answer');
    } else if (msg.type === 'ice') {
      try { await state.calls.pc.addIceCandidate(msg.candidate); } catch {}
    }
  };
}
function signal(payload) {
  if (!state.calls.signaling) return alert('Join a room first');
  state.calls.signaling.postMessage(payload);
}
async function ensurePeer(localVideo, remoteVideo) {
  await ensureLocalStream(localVideo);
  if (state.calls.pc) return state.calls.pc;

  const pc = new RTCPeerConnection();
  state.calls.pc = pc;

  state.calls.localStream.getTracks().forEach(track => pc.addTrack(track, state.calls.localStream));
  pc.ontrack = (ev) => {
    if (!state.calls.remoteStream) state.calls.remoteStream = new MediaStream();
    state.calls.remoteStream.addTrack(ev.track);
    remoteVideo.srcObject = state.calls.remoteStream;
  };
  pc.onicecandidate = (ev) => {
    if (ev.candidate) signal({ type: 'ice', roomId: state.calls.roomId, candidate: ev.candidate });
  };
  pc.onconnectionstatechange = () => {
    log(document.getElementById('dcLog'), `Connection: ${pc.connectionState}`);
  };

  const dc = pc.createDataChannel('xmedia');
  setupDataChannel(dc);
  pc.ondatachannel = (ev) => setupDataChannel(ev.channel);
  state.calls.dc = dc;

  return pc;
}
async function ensureLocalStream(localVideo) {
  const constraints = {
    video: state.calls.selected.videoId ? { deviceId: { exact: state.calls.selected.videoId } } : true,
    audio: state.calls.selected.audioId ? { deviceId: { exact: state.calls.selected.audioId } } : true
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  state.calls.localStream = stream;
  localVideo.srcObject = stream;
  return stream;
}
function hangup(localVideo, remoteVideo, dcLog) {
  if (state.calls.dc) { try { state.calls.dc.close(); } catch {} state.calls.dc = null; }
  if (state.calls.pc) { try { state.calls.pc.close(); } catch {} state.calls.pc = null; }
  if (state.calls.localStream) { state.calls.localStream.getTracks().forEach(t => t.stop()); state.calls.localStream = null; }
  if (state.calls.remoteStream) { state.calls.remoteStream.getTracks().forEach(t => t.stop()); state.calls.remoteStream = null; }
  localVideo.srcObject = null; remoteVideo.srcObject = null;
  log(dcLog, 'Hung up.');
}

/* DataChannel helpers */
function setupDataChannel(dc) {
  const inbox = document.getElementById('dcInbox');
  const logEl = document.getElementById('dcLog');
  dc.onopen = () => log(logEl, 'Data channel open');
  dc.onclose = () => log(logEl, 'Data channel closed');
  dc.onerror = (e) => log(logEl, `DC error: ${e}`);

  let expectingFileMeta = null;
  dc.onmessage = async (ev) => {
    const data = ev.data;
    try {
      if (typeof data === 'string') {
        const payload = JSON.parse(data);
        if (payload.kind === 'text') {
          addInboxItem(inbox, { me: false, type: 'text', text: payload.text });
        } else if (payload.kind === 'file') {
          expectingFileMeta = payload;
        }
      } else if (data instanceof ArrayBuffer) {
        if (expectingFileMeta) {
          addInboxItem(inbox, { me: false, type: 'file', name: expectingFileMeta.name, mime: expectingFileMeta.type, data });
          expectingFileMeta = null;
        } else {
          addInboxItem(inbox, { me: false, type: 'file', name: 'file.bin', mime: 'application/octet-stream', data });
        }
      }
    } catch {
      addInboxItem(inbox, { me: false, type: 'text', text: String(data) });
    }
  };
}
function sendDC(obj) {
  const dc = state.calls.dc;
  if (!dc || dc.readyState !== 'open') { alert('Data channel not open'); return; }
  if (obj.kind === 'text') {
    dc.send(JSON.stringify(obj));
  } else if (obj.kind === 'file') {
    const meta = { kind: 'file', name: obj.name, type: obj.type, size: obj.size };
    dc.send(JSON.stringify(meta));
    dc.send(obj.data);
  }
}
function addInboxItem(inbox, item) {
  const who = item.me ? 'You' : 'Peer';
  if (item.type === 'text') {
    const el = document.createElement('div');
    el.innerHTML = `<strong>${who}:</strong> ${escapeHtml(item.text)}`;
    inbox.prepend(el);
  } else if (item.type === 'file') {
    const el = document.createElement('div');
    const blob = new Blob([item.data], { type: item.mime });
    const url = URL.createObjectURL(blob);
    let content = '';
    if (item.mime.startsWith('image/')) content = `<img src="${url}" style="max-width:100%">`;
    else if (item.mime.startsWith('video/')) content = `<video src="${url}" controls style="max-width:100%"></video>`;
    else if (item.mime.startsWith('audio/')) content = `<audio src="${url}" controls></audio>`;
    else content = `<a href="${url}" download="${escapeHtml(item.name)}">Download ${escapeHtml(item.name)}</a>`;
    el.innerHTML = `<strong>${who} sent:</strong> ${escapeHtml(item.name)}<div style="margin-top:0.25rem">${content}</div>`;
    inbox.prepend(el);
  }
}
function log(el, msg) { if (el) el.innerHTML = `${escapeHtml(msg)}<br>` + el.innerHTML; }

/* Utilities */
function escapeHtml(s) { return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function escapeAttr(s) { return String(s).replaceAll('"','&quot;'); }
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

/* Boot with loader */
hydrate();
setDarkMode(state.dark);
applyUILanguage();
// Show loader briefly to simulate init; hide and start
if (loaderScreen) {
  setTimeout(() => { hideLoaderAndStart(); }, 800); // fast splash
} else {
  renderApp();
}