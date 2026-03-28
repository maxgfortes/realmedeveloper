// ============================================================
// explore-activities.js — Realme
// Carrega e renderiza atividades reais do Firestore no explore.html
// ============================================================

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, query, where, orderBy, limit,
  getDocs, getDoc, doc, deleteDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB2N41DiH0-Wjdos19dizlWSKOlkpPuOWs",
  authDomain: "ifriendmatch.firebaseapp.com",
  projectId: "ifriendmatch",
  storageBucket: "ifriendmatch.appspot.com",
  messagingSenderId: "306331636603",
  appId: "1:306331636603:web:c0ae0bd22501803995e3de",
  measurementId: "G-D96BEW6RC3"
};

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

function esperarAuth() {
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, user => { unsub(); resolve(user); });
  });
}

const DUAS_SEMANAS_MS = 14 * 24 * 60 * 60 * 1000;
const GROUPING_WINDOW = 6 * 60 * 60 * 1000;
const DEFAULT_PHOTO   = './src/icon/default.jpg';

// ─── Cache de usuários ────────────────────────────────────────────────────────
const userCache = {};
async function resolveUser(uid) {
  if (userCache[uid]) return userCache[uid];
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    let data = { username: uid, nome: uid, photo: DEFAULT_PHOTO };
    if (snap.exists()) {
      const d = snap.data();
      data.username = d.username || uid;
      data.nome     = d.displayName || d.displayname || d.nome || d.name || d.username || uid;
    }
    try {
      const mediaSnap = await getDoc(doc(db, `users/${uid}/user-infos/user-media`));
      if (mediaSnap.exists()) data.photo = mediaSnap.data().pfp || mediaSnap.data().userphoto || DEFAULT_PHOTO;
    } catch (_) {}
    userCache[uid] = data;
    return data;
  } catch (_) {
    return { username: uid, nome: uid, photo: DEFAULT_PHOTO };
  }
}

// ─── Tempo relativo contextual ────────────────────────────────────────────────
function toMs(ts) {
  if (!ts) return 0;
  if (ts.seconds) return ts.seconds * 1000;
  return new Date(ts).getTime();
}

/**
 * Retorna fragmento de tempo para uso natural em frases.
 * Ex: "há 5 minutos", "ontem à noite", "há 3 dias"
 */
function tempoContextual(ms) {
  const diff = Date.now() - ms;
  const m    = Math.floor(diff / 60000);
  const h    = Math.floor(diff / 3600000);
  const d    = Math.floor(diff / 86400000);
  const hora = new Date(ms).getHours();
  const periodo = hora < 12 ? 'de manhã' : hora < 18 ? 'à tarde' : 'à noite';

  if (diff < 60000)  return 'agora mesmo';
  if (m < 60)        return `há ${m} minuto${m > 1 ? 's' : ''}`;
  if (h < 24)        return `há ${h} hora${h > 1 ? 's' : ''}`;
  if (d === 1)       return `ontem ${periodo}`;
  if (d < 7)         return `há ${d} dias`;
  if (d < 14)        return 'semana passada';
  return `há ${d} dias`;
}

function profileLink(username) {
  return `<a class="act-link" href="profile.html?u=${username}">${username}</a>`;
}
function span(text) { return `<span>${text}</span>`; }

// ─── Texto contextual com tempo embutido ─────────────────────────────────────
function gerarTexto(tipo, items, ultimoMs) {
  const primeiro = items[0];
  const n        = items.length;
  const autor    = profileLink(primeiro.authorUsername || primeiro.actorUid);
  const tempo    = tempoContextual(ultimoMs);
  const diffDays = Math.floor((Date.now() - ultimoMs) / 86400000);

  const autoresUnicos = [...new Map(items.map(i => [i.actorUid, i])).values()];
  const autoresLinks  = autoresUnicos.map(i => profileLink(i.authorUsername || i.actorUid));
  function listarNomes(links) {
    if (links.length === 1) return links[0];
    if (links.length === 2) return `${links[0]} e ${links[1]}`;
    const u = [...links]; const last = u.pop();
    return `${u.join(', ')} e ${last}`;
  }

  const statusLabel = {
    solteiro: 'solteiro', namorando: 'namorando',
    casado: 'casado', em_compromisso: 'em compromisso', viuvo: 'viúvo'
  };
  const campoLabel = {
    bio: 'atualizou a bio', foto: 'mudou a foto de perfil', banner: 'mudou a foto de capa',
    nome: 'mudou o nome de exibição', pronomes: 'atualizou os pronomes',
    localizacao: 'atualizou a localização', musica: 'mudou a música favorita',
    genero: 'atualizou o gênero', username: 'mudou o username'
  };

  switch (tipo) {
    case 'new_post':
      return n === 1
        ? `${autor} fez um novo post ${span(tempo)}`
        : `${autor} fez ${span(n + ' novos posts')} — o mais recente ${span(tempo)}`;

    case 'new_bubble':
      return n === 1
        ? `${autor} publicou um nova nota ${span(tempo)}`
        : `${autor} publicou ${span(n + ' novas notas')} — o último ${span(tempo)}`;

    case 'new_comment': {
      const alvo = primeiro.targetUsername ? profileLink(primeiro.targetUsername) : 'alguém';
      return n === 1
        ? `${autor} comentou no post de ${alvo} ${span(tempo)}`
        : `${autor} deixou ${span(n + ' comentários')} — o mais recente ${span(tempo)}`;
    }

    case 'new_friendship': {
      const amigo = primeiro.targetUsername ? profileLink(primeiro.targetUsername) : 'alguém';
      return n === 1
        ? `${autor} e ${amigo} ficaram amigos ${span(tempo)}`
        : `${autor} fez ${span(n + ' novas amizades')} ${span(tempo)}`;
    }

    case 'profile_update': {
      const acao = campoLabel[primeiro.campo] || 'atualizou o perfil';
      return diffDays === 1
        ? `${autor} ${span(acao)} ontem`
        : `${autor} ${span(acao)} ${span(tempo)}`;
    }

    case 'status_change': {
      const novoStatus = statusLabel[primeiro.novoStatus] || primeiro.novoStatus;
      if (diffDays === 0) return `${autor} mudou o status para ${span(novoStatus)} ${span(tempo)}`;
      if (diffDays === 1) return `desde ontem, ${autor} está ${span(novoStatus)}`;
      return `${autor} está ${span(novoStatus)} desde ${span(tempo)}`;
    }

    case 'new_user':
      return n === 1
        ? `${autor} entrou no Realme ${span(tempo)} 👋`
        : `${listarNomes(autoresLinks)} entraram no Realme ${span(tempo)} 👋`;

    default:
      return `${autor} fez algo novo ${span(tempo)}`;
  }
}

// ─── isBig — define qual template usar ──────────────────────────────────────
function isBig(tipo) {
  return ['new_post', 'new_bubble', 'new_friendship', 'new_user'].includes(tipo);
}

// ─── Agrupamento ─────────────────────────────────────────────────────────────
function agrupar(atividades) {
  const grupos = [];
  for (const act of atividades) {
    const actMs = toMs(act.createdAt);
    let adicionado = false;
    for (const grupo of grupos) {
      const mesmotipo = grupo.tipo === act.type;
      const mesmoAtor = act.type === 'new_user' ? true : grupo.items[0].actorUid === act.actorUid;
      const naJanela  = Math.abs(actMs - grupo.ultimoMs) <= GROUPING_WINDOW;
      if (mesmotipo && mesmoAtor && naJanela) {
        if (act.type === 'new_user' && grupo.items.some(i => i.actorUid === act.actorUid)) {
          adicionado = true; break;
        }
        grupo.items.push(act);
        grupo.ultimoMs = Math.min(grupo.ultimoMs, actMs);
        adicionado = true; break;
      }
    }
    if (!adicionado) grupos.push({ tipo: act.type, items: [act], ultimoMs: actMs });
  }
  return grupos;
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
function injetarCSS() {
  if (document.getElementById('xact-style')) return;
  const s = document.createElement('style');
  s.id = 'xact-style';
  s.textContent = ``;
  document.head.appendChild(s);
}

// ─── Renderiza card grande (act-big) ─────────────────────────────────────────
function renderBigCard(grupo, currentUid) {
  const { tipo, items, ultimoMs } = grupo;
  const ids    = items.map(i => i.activityId).join(',');
  const isDono = items.some(i => i.actorUid === currentUid);
  const texto  = gerarTexto(tipo, items, ultimoMs);

  const fotos = [...new Set(items.map(i => i.authorPhoto).filter(Boolean))].slice(0, 3);
  const autoresUnicos = [...new Map(items.map(i => [i.actorUid, i])).values()].slice(0, 2);

  const profilePhotosHtml = fotos.length > 1
    ? `<div class="profile-photos">${fotos.map((f, idx) =>
        `<div class="image user-img${idx + 1}"><img src="${f}" onerror="this.src='${DEFAULT_PHOTO}'"></div>`
      ).join('')}</div>`
    : `<img src="${fotos[0] || DEFAULT_PHOTO}" onerror="this.src='${DEFAULT_PHOTO}'">`;

  const userInfoHtml = autoresUnicos.map(item => `
    <div class="user-info">
      <div class="act-udisplay">${item.authorNome || item.authorUsername || item.actorUid}</div>
      <div class="act-username">@${item.authorUsername || item.actorUid}</div>
    </div>`).join('');

  return `
  <div class="act-big" data-ids="${ids}">
    <div class="act-header">
      ${profilePhotosHtml}
      ${userInfoHtml}
      ${isDono ? `<button class="xact-del" data-ids="${ids}"><i class="fas fa-trash-can"></i></button>` : ''}
    </div>
    <div class="act-content">
      <p>${texto}</p>
    </div>
  </div>`;
}

// ─── Renderiza card pequeno (act-small) ──────────────────────────────────────
function renderSmallCard(grupo, currentUid) {
  const { tipo, items, ultimoMs } = grupo;
  const ids    = items.map(i => i.activityId).join(',');
  const isDono = items.some(i => i.actorUid === currentUid);
  const texto  = gerarTexto(tipo, items, ultimoMs);
  const foto   = items[0].authorPhoto || DEFAULT_PHOTO;
  const nome   = items[0].authorNome || items[0].authorUsername || items[0].actorUid;

  return `
  <div class="act-small" data-ids="${ids}">
    <div class="act-header">
      <img src="${foto}" onerror="this.src='${DEFAULT_PHOTO}'">
      <div class="user-info">
        <div class="act-udisplay">${nome}</div>
      </div>
      ${isDono ? `<button class="xact-del" data-ids="${ids}"><i class="fas fa-trash-can"></i></button>` : ''}
    </div>
    <div class="act-content-small">
      <p>${texto}</p>
    </div>
  </div>`;
}

// ─── Layout: big sozinho, smalls em pares .act-doble ─────────────────────────
function montarLayout(grupos, currentUid) {
  const htmlParts  = [];
  let smallBuffer  = [];

  function flushSmall() {
    if (!smallBuffer.length) return;
    for (let i = 0; i < smallBuffer.length; i += 2) {
      htmlParts.push(i + 1 < smallBuffer.length
        ? `<div class="act-doble">${smallBuffer[i]}${smallBuffer[i + 1]}</div>`
        : smallBuffer[i]);
    }
    smallBuffer = [];
  }

  for (const grupo of grupos) {
    if (isBig(grupo.tipo)) {
      flushSmall();
      htmlParts.push(renderBigCard(grupo, currentUid));
    } else {
      smallBuffer.push(renderSmallCard(grupo, currentUid));
    }
  }
  flushSmall();
  return htmlParts.join('\n');
}

// ─── Função principal ─────────────────────────────────────────────────────────
async function carregarAtividades() {
  injetarCSS();
  const container = document.getElementById('activities-section');
  if (!container) return;

  container.innerHTML = `<div class="xact-loading"></div>`;

  const user = await esperarAuth();
  if (!user) {
    container.innerHTML = `<p class="xact-empty">Você precisa estar logado para ver as atividades.</p>`;
    return;
  }

  try {
    const duasSemanasAtras = Timestamp.fromMillis(Date.now() - DUAS_SEMANAS_MS);

    const snap = await getDocs(query(
      collection(db, 'activities'),
      where('createdAt', '>=', duasSemanasAtras),
      where('visible', '==', true),
      orderBy('createdAt', 'desc'),
      limit(150)
    ));

    let atividades = snap.docs.map(d => ({ activityId: d.id, ...d.data() }));

    // Enriquece autor
    atividades = await Promise.all(atividades.map(async act => {
      if (!act.authorUsername && act.actorUid) {
        const u = await resolveUser(act.actorUid);
        return { ...act, authorUsername: u.username, authorNome: u.nome, authorPhoto: act.authorPhoto || u.photo };
      }
      return act;
    }));

    // Varrer /newusers
    try {
      const nuSnap = await getDocs(query(
        collection(db, 'newusers'),
        where('createat', '>=', duasSemanasAtras),
        orderBy('createat', 'desc'),
        limit(30)
      ));
      for (const d of nuSnap.docs) {
        const uid = d.id;
        if (atividades.some(a => a.type === 'new_user' && a.actorUid === uid)) continue;
        const u = await resolveUser(uid);
        atividades.push({
          activityId: `_newuser_${uid}`, type: 'new_user', actorUid: uid,
          authorUsername: u.username, authorNome: u.nome, authorPhoto: u.photo,
          createdAt: d.data().createat, visible: true
        });
      }
    } catch (e) {
      console.warn('[explore-activities] Erro ao varrer newusers:', e);
    }

    atividades.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
    const grupos = agrupar(atividades);

    if (!grupos.length) {
      container.innerHTML = `<p class="xact-empty">Nenhuma atividade recente ainda</p>`;
      return;
    }

    container.innerHTML = `<div class="xact-list">${montarLayout(grupos, user.uid)}</div>`;

    // Long-press deletar (só dono)
    container.querySelectorAll('.act-big, .act-small').forEach(card => {
      let timer = null;
      card.addEventListener('pointerdown',  () => { timer = setTimeout(() => card.classList.add('show-del'), 600); });
      card.addEventListener('pointerup',    () => clearTimeout(timer));
      card.addEventListener('pointerleave', () => clearTimeout(timer));
      document.addEventListener('pointerdown', e => {
        if (!card.contains(e.target)) card.classList.remove('show-del');
      }, { passive: true });
    });

    container.querySelectorAll('.xact-del').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const card = btn.closest('.act-big, .act-small');
        card.style.opacity = '.3';
        card.style.pointerEvents = 'none';
        const ids = btn.dataset.ids.split(',').filter(id => !id.startsWith('_'));
        await Promise.all(ids.map(id => deleteDoc(doc(db, 'activities', id)).catch(() => {})));
        card.remove();
      });
    });

  } catch (err) {
    console.error('[explore-activities] Erro:', err);
    container.innerHTML = `<p class="xact-empty">Não foi possível carregar as atividades.</p>`;
  }
}

document.addEventListener('DOMContentLoaded', carregarAtividades);