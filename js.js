import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Firebase do codigo-mobile (ifriendmatch)
const firebaseConfig = {
  apiKey: "AIzaSyB2N41DiH0-Wjdos19dizlWSKOlkpPuOWs",
  authDomain: "ifriendmatch.firebaseapp.com",
  projectId: "ifriendmatch",
  storageBucket: "ifriendmatch.appspot.com",
  messagingSenderId: "306331636603",
  appId: "1:306331636603:web:c0ae0bd22501803995e3de",
  measurementId: "G-D96BEW6RC3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
let currentUserId = null;
let profileUserId = null;

export { db, auth, currentUser, profileUserId };

// ===================
// UTILITÁRIOS
// ===================

function getUsernameFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('userid') || params.get('username') || params.get('u') || params.get('user');
}

function determinarUsuarioParaCarregar() {
  const params = new URLSearchParams(window.location.search);
  const useridParam = params.get("userid");
  if (useridParam) return useridParam;
  return currentUserId;
}

// Cache simples de dados de usuário
const cache = {
  users: new Map(),
  photos: new Map()
};

async function getUserData(userid) {
  if (cache.users.has(userid)) return cache.users.get(userid);
  // Caminhos do profiles.js: users/{uid}
  const userRef = doc(db, "users", userid);
  const userSnap = await getDoc(userRef);
  const data = userSnap.exists() ? userSnap.data() : {};
  cache.users.set(userid, data);
  return data;
}

async function getUserPhoto(userid) {
  if (cache.photos.has(userid)) return cache.photos.get(userid);
  // Caminhos do profiles.js: users/{uid}/user-infos/user-media
  const mediaRef = doc(db, "users", userid, "user-infos", "user-media");
  const mediaSnap = await getDoc(mediaRef);
  const photo = mediaSnap.exists()
    ? (mediaSnap.data().userphoto || mediaSnap.data().pfp || './src/icon/default.jpg')
    : './src/icon/default.jpg';
  cache.photos.set(userid, photo);
  return photo;
}

// ===================
// SISTEMA DE SEGUIR / SEGUIDORES
// ===================

async function verificarSeEstaSeguindo(currentUid, targetUid) {
  const segRef = doc(db, 'users', targetUid, 'followers', currentUid);
  const segDoc = await getDoc(segRef);
  return segDoc.exists();
}

async function seguirUsuario(currentUid, targetUid) {
  const now = new Date();
  await setDoc(doc(db, 'users', targetUid, 'followers', currentUid), {
    userid: currentUid,
    followerin: now
  });
  await setDoc(doc(db, 'users', currentUid, 'following', targetUid), {
    userid: targetUid,
    followin: now
  });
}

async function deixarDeSeguir(currentUid, targetUid) {
  await deleteDoc(doc(db, 'users', targetUid, 'followers', currentUid));
  await deleteDoc(doc(db, 'users', currentUid, 'following', targetUid));
}

async function contarSeguidores(userid) {
  const col = collection(db, 'users', userid, 'followers');
  const snap = await getDocs(col);
  return snap.size;
}

async function contarSeguindo(userid) {
  const col = collection(db, 'users', userid, 'following');
  const snap = await getDocs(col);
  return snap.size;
}

// Amigos = seguidores mútuos
async function contarAmigos(userid) {
  const seguidoresSnap = await getDocs(collection(db, 'users', userid, 'followers'));
  const seguidores = seguidoresSnap.docs.map(d => d.id);
  const seguindoSnap = await getDocs(collection(db, 'users', userid, 'following'));
  const seguindo = seguindoSnap.docs.map(d => d.id);
  const amigos = seguidores.filter(uid => seguindo.includes(uid));
  return amigos.length;
}

// ===================
// ESTATÍSTICAS E BOTÕES DINÂMICOS
// ===================

async function atualizarEstatisticasPerfil(userid) {
  const numSeguidores = await contarSeguidores(userid);
  const numSeguindo = await contarSeguindo(userid);
  const numAmigos = await contarAmigos(userid);

  // Contar posts da coleção global /posts filtrando por creatorid
  let numPosts = 0;
  try {
    const postsSnap = await getDocs(collection(db, 'posts'));
    postsSnap.forEach(d => {
      if (d.data().creatorid === userid) numPosts++;
    });
  } catch (e) {
    console.warn('Erro ao contar posts:', e);
  }

  const statsElement = document.querySelector('.profile-stats');
  if (statsElement) {
    statsElement.innerHTML = `
      <div class="stats">
        <span>
          <strong>${numAmigos}</strong>
          <a href="list.html?userid=${userid}&tab=amigos" class="stats-link">amigos</a>
        </span>
      </div>
      <div class="stats">
        <span>
          <strong>${numSeguidores}</strong>
          <a href="list.html?userid=${userid}&tab=seguidores" class="stats-link">seguidores</a>
        </span>
      </div>
      <div class="stats">
        <span>
          <strong>${numSeguindo}</strong>
          <a href="list.html?userid=${userid}&tab=seguindo" class="stats-link">seguindo</a>
        </span>
      </div>
    `;
  }
}

// Botão dinâmico de seguir / editar perfil
async function configurarBotaoSeguir(targetUserId) {
  const followBtn = document.querySelector('.btn-follow');
  if (!followBtn || !currentUserId) return;

  if (targetUserId === currentUserId) {
    followBtn.style.display = 'none';
    const msgBtn = document.querySelector('.btn-message');
    if (msgBtn) msgBtn.style.display = 'none';
    const nudgeBtn = document.querySelector('.btn-nudge');
    if (nudgeBtn) nudgeBtn.style.display = 'none';
    // Botão de editar perfil
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Editar perfil';
    editBtn.className = 'btn-edit-profile';
    editBtn.onclick = () => window.location.href = 'config.html';
    followBtn.parentNode.appendChild(editBtn);
    return;
  }

  let isFollowing = await verificarSeEstaSeguindo(currentUserId, targetUserId);
  followBtn.textContent = isFollowing ? 'seguindo' : 'seguir';
  followBtn.className = isFollowing ? 'btn-follow following' : 'btn-follow';

  followBtn.onclick = async () => {
    followBtn.disabled = true;
    followBtn.textContent = 'carregando...';
    if (isFollowing) {
      await deixarDeSeguir(currentUserId, targetUserId);
      isFollowing = false;
      followBtn.textContent = 'seguir';
      followBtn.className = 'btn-follow';
    } else {
      await seguirUsuario(currentUserId, targetUserId);
      isFollowing = true;
      followBtn.textContent = 'seguindo';
      followBtn.className = 'btn-follow following';
    }
    await atualizarEstatisticasPerfil(targetUserId);
    followBtn.disabled = false;
  };
}

// Configura o botão de mensagem (DM)
function configurarBotaoMensagem(targetUserId) {
  const btnMsg = document.getElementById('btnMensagemPerfil') || document.querySelector('.btn-msg') || document.querySelector('.btn-message');
  if (!btnMsg) return;
  if (targetUserId === currentUserId) {
    btnMsg.style.display = 'none';
    return;
  }
  btnMsg.style.display = 'inline-block';
  btnMsg.onclick = () => iniciarChatComUsuario(targetUserId);
}

// ===================
// LISTA DE AMIGOS, SEGUINDO E SEGUIDORES
// ===================

async function carregarListaAmigos(userid) {
  const container = document.querySelector('.amigos-tab .about-container') || document.querySelector('.amigos-tab');
  if (!container) return;

  container.innerHTML = `<div class="loading-container"><div class="loading-spinner"></div><p>Carregando amigos...</p></div>`;

  const seguidoresSnap = await getDocs(collection(db, 'users', userid, 'followers'));
  const seguidores = seguidoresSnap.docs.map(d => d.id);
  const seguindoSnap = await getDocs(collection(db, 'users', userid, 'following'));
  const seguindo = seguindoSnap.docs.map(d => d.id);
  const amigosIds = seguidores.filter(uid => seguindo.includes(uid));

  container.innerHTML = '';

  if (amigosIds.length === 0) {
    container.innerHTML = `
      <div class="empty-list">
        <div class="empty-icon"><i class="fas fa-user-friends"></i></div>
        <h3>Nenhum amigo ainda</h3>
        <p>Amigos são pessoas que se seguem mutuamente.</p>
      </div>
    `;
    return;
  }

  for (const uid of amigosIds) {
    const userData = await getUserData(uid);
    const foto = await getUserPhoto(uid);
    const card = criarCardUsuario(uid, userData, foto);
    container.appendChild(card);
  }
}

async function carregarListaSeguidores(userid) {
  const container = document.querySelector('.seguidores-tab .about-container') || document.querySelector('.seguidores-tab');
  if (!container) return;

  container.innerHTML = `<div class="loading-container"><div class="loading-spinner"></div><p>Carregando seguidores...</p></div>`;

  const snap = await getDocs(collection(db, 'users', userid, 'followers'));
  container.innerHTML = '';

  if (snap.empty) {
    container.innerHTML = `
      <div class="empty-list">
        <div class="empty-icon"><i class="fas fa-users"></i></div>
        <h3>Nenhum seguidor ainda</h3>
      </div>
    `;
    return;
  }

  for (const docSnap of snap.docs) {
    const uid = docSnap.id;
    const userData = await getUserData(uid);
    const foto = await getUserPhoto(uid);
    const card = criarCardUsuario(uid, userData, foto);
    container.appendChild(card);
  }
}

async function carregarListaSeguindo(userid) {
  const container = document.querySelector('.seguindo-tab .about-container') || document.querySelector('.seguindo-tab');
  if (!container) return;

  container.innerHTML = `<div class="loading-container"><div class="loading-spinner"></div><p>Carregando seguindo...</p></div>`;

  const snap = await getDocs(collection(db, 'users', userid, 'following'));
  container.innerHTML = '';

  if (snap.empty) {
    container.innerHTML = `
      <div class="empty-list">
        <div class="empty-icon"><i class="fas fa-user-plus"></i></div>
        <h3>Não está seguindo ninguém ainda</h3>
      </div>
    `;
    return;
  }

  for (const docSnap of snap.docs) {
    const uid = docSnap.id;
    const userData = await getUserData(uid);
    const foto = await getUserPhoto(uid);
    const card = criarCardUsuario(uid, userData, foto);
    container.appendChild(card);
  }
}

function criarCardUsuario(uid, userData, foto) {
  const card = document.createElement('div');
  card.className = 'user-card';
  const nome = userData.displayname || userData.displayName || userData.username || 'Usuário';
  const username = userData.username || '';
  card.innerHTML = `
    <img src="${foto}" alt="${nome}" class="user-card-photo"
      onerror="this.src='./src/icon/default.jpg'"
      onclick="window.location.href='profile.html?userid=${uid}'">
    <div class="user-card-info">
      <span class="user-card-name" onclick="window.location.href='profile.html?userid=${uid}'">${nome}</span>
      ${username ? `<span class="user-card-username">@${username}</span>` : ''}
    </div>
  `;
  return card;
}

// ===================
// SISTEMA DE CHAT / DM
// ===================

function gerarChatId(user1, user2) {
  return `chat-${[user1, user2].sort().join("-")}`;
}

async function iniciarChatComUsuario(targetUserId) {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    console.error("IDs inválidos:", { currentUserId, targetUserId });
    return;
  }

  const chatId = gerarChatId(currentUserId, targetUserId);
  const chatRef = doc(db, "chats", chatId);

  try {
    await setDoc(chatRef, {
      participants: [currentUserId, targetUserId].sort(),
      createdAt: new Date(),
      lastMessage: "",
      lastMessageTime: null
    }, { merge: true });

    window.location.href = `direct-mobile.html?chatid=${chatId}`;
  } catch (error) {
    console.error("Erro ao criar/acessar chat:", error);
    alert("Erro ao iniciar conversa. Verifique suas permissões.");
  }
}

// ===================
// RENDERIZAÇÃO DE POSTS — /posts/{postid}
// ===================

let postsDoUsuario = [];

function formatarDataPost(timestamp) {
  if (!timestamp) return 'Data não disponível';
  let date;
  if (timestamp && typeof timestamp.toDate === 'function') date = timestamp.toDate();
  else if (timestamp && timestamp.seconds) date = new Date(timestamp.seconds * 1000);
  else if (timestamp) date = new Date(timestamp);
  else return 'Data inválida';
  const agora = new Date();
  const diff = agora - date;
  const diffMinutos = Math.floor(diff / (1000 * 60));
  const diffHoras = Math.floor(diff / (1000 * 60 * 60));
  const diffDias = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (diffMinutos < 1) return 'Agora';
  if (diffMinutos < 60) return `${diffMinutos}min`;
  if (diffHoras < 24) return `${diffHoras}h`;
  if (diffDias < 7) return `${diffDias}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatarConteudoPost(conteudo) {
  if (!conteudo) return '<p class="empty-content">Post sem conteúdo</p>';
  let conteudoFormatado = conteudo;
  conteudoFormatado = conteudoFormatado.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  conteudoFormatado = conteudoFormatado.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
  conteudoFormatado = conteudoFormatado.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
  conteudoFormatado = conteudoFormatado.replace(/\n/g, '<br>');
  return `<p>${conteudoFormatado}</p>`;
}

// Carrega posts do usuário da coleção global /posts/{postid}
// onde postData.creatorid === userid
// Comentários em /posts/{postid}/comentarios/{id}
async function carregarPostsDoUsuario(userid) {
  const muralContainer = document.getElementById('muralPosts') || document.querySelector('.visao-tab');
  if (!muralContainer) return;

  muralContainer.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Carregando posts...</p>
    </div>
  `;

  try {
    const postsRef = collection(db, 'posts');
    const postsSnap = await getDocs(postsRef);

    // Filtra posts do usuário e ordena por data (mais recente primeiro)
    const userPosts = [];
    postsSnap.forEach(postDoc => {
      const data = postDoc.data();
      if (data.creatorid === userid) {
        userPosts.push({ id: postDoc.id, data });
      }
    });

    userPosts.sort((a, b) => {
      const getTime = (ts) => {
        if (!ts) return 0;
        if (typeof ts.toDate === 'function') return ts.toDate().getTime();
        if (ts.seconds) return ts.seconds * 1000;
        return new Date(ts).getTime();
      };
      return getTime(b.data.create) - getTime(a.data.create);
    });

    muralContainer.innerHTML = '';
    postsDoUsuario = [];

    if (userPosts.length === 0) {
      muralContainer.innerHTML = `
        <div class="empty-posts">
          <div class="empty-icon"><i class="fas fa-pen-alt"></i></div>
          <h3>Nenhum post ainda</h3>
          <p>Este usuário ainda não compartilhou nada.</p>
        </div>
      `;
      return;
    }

    userPosts.forEach(post => {
      postsDoUsuario.push({ id: post.id, userid, data: post.data });
      const preview = criarPreviewPost(post.data, post.id, userid);
      muralContainer.appendChild(preview);
    });

  } catch (err) {
    console.error('Erro ao carregar posts:', err);
    muralContainer.innerHTML = `<p style="color:#aaa;text-align:center;">Erro ao carregar posts.</p>`;
  }
}

// Preview do post (grid)
function criarPreviewPost(postData, postId, userid) {
  const preview = document.createElement('div');
  preview.className = 'postpreview';

  if (postData.img && postData.img.trim()) {
    preview.innerHTML = `
      <img src="${postData.img}"
           alt="Post"
           class="post-preview-img"
           onerror="this.parentElement.innerHTML='<div class=post-preview-error>Erro ao carregar imagem</div>'">
    `;
  } else {
    const conteudo = postData.content || 'Post sem conteúdo';
    const textoPreview = conteudo.length > 80 ? conteudo.slice(0, 80) + '...' : conteudo;
    preview.innerHTML = `
      <div class="post-preview-text-container">
        <p class="post-preview-text">${textoPreview}</p>
      </div>
    `;
  }

  preview.onclick = () => {
    const index = postsDoUsuario.findIndex(p => p.id === postId);
    abrirModalFeed(index);
  };

  return preview;
}

// Modal de feed vertical com comentários de /posts/{postid}/comentarios/{id}
function abrirModalFeed(indexInicial) {
  const modal = document.createElement('div');
  modal.className = 'post-feed-modal';
  modal.innerHTML = `
    <div class="feed-overlay"></div>
    <div class="feed-header-global">
      <button class="close-feed">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 298 511.93">
          <path d="M285.77 441c16.24 16.17 16.32 42.46.15 58.7-16.16 16.24-42.45 16.32-58.69.16l-215-214.47c-16.24-16.16-16.32-42.45-.15-58.69L227.23 12.08c16.24-16.17 42.53-16.09 58.69.15 16.17 16.24 16.09 42.54-.15 58.7l-185.5 185.04L285.77 441z"/>
        </svg>
      </button>
      <span id="feedHeaderUsername" class="feed-header-username"></span>
    </div>
    <div class="feed-scroll"></div>
  `;

  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add("aberto"), 10);
  document.body.style.overflow = "hidden";

  function fecharFeed() {
    modal.classList.remove("aberto");
    modal.classList.add("fechando");
    setTimeout(() => {
      modal.remove();
      document.body.style.overflow = "auto";
    }, 350);
  }

  const scrollArea = modal.querySelector('.feed-scroll');

  // Preenche username no header
  if (postsDoUsuario[indexInicial]) {
    getUserData(postsDoUsuario[indexInicial].userid).then(u => {
      document.getElementById("feedHeaderUsername").textContent = u.username || "usuario";
    });
  }

  postsDoUsuario.forEach(post => {
    const postEl = document.createElement('div');
    postEl.className = 'feed-page';

    const curtidas = post.data.likes || 0;

    postEl.innerHTML = `
      <div class="feed-header">
        <img src="./src/icon/default.jpg" class="feed-avatar" id="feedPic-${post.id}">
        <div class="feed-info">
          <span class="feed-name" id="feedName-${post.id}"></span>
          <span class="feed-username" id="feedUser-${post.id}"></span>
        </div>
      </div>
      <div class="feed-body">
        ${post.data.img ? `<img src="${post.data.img}" class="feed-img">` : ''}
        <div class="feed-text">${formatarConteudoPost(post.data.content)}</div>
      </div>
      <div class="feed-actions">
        <button class="action-btn like-btn ${curtidas > 0 ? 'has-likes' : ''}" data-post-id="${post.id}" data-userid="${post.userid}">
          <i class="fas fa-heart"></i>
          <span class="action-count">${curtidas > 0 ? curtidas : ''}</span>
        </button>
        <button class="action-btn comment-btn" data-post-id="${post.id}" data-userid="${post.userid}">
          <i class="fas fa-comment"></i>
        </button>
      </div>
      <div class="comentarios-container" style="display:none;"></div>
      <div class="comentar-area" style="display:none;">
        <input type="text" class="input-comentario" placeholder="Escreva um comentário..." maxlength="200">
        <button class="btn-enviar-comentario"><i class="fas fa-paper-plane"></i></button>
      </div>
    `;

    // Preenche dados do autor
    getUserData(post.userid).then(u => {
      const nameEl = document.getElementById(`feedName-${post.id}`);
      const userEl = document.getElementById(`feedUser-${post.id}`);
      if (nameEl) nameEl.textContent = u.displayname || u.displayName || u.username || '';
      if (userEl) userEl.textContent = "@" + (u.username || '');
    });
    getUserPhoto(post.userid).then(foto => {
      const picEl = document.getElementById(`feedPic-${post.id}`);
      if (picEl) picEl.src = foto;
    });

    // Like
    const likeBtn = postEl.querySelector('.like-btn');
    likeBtn.onclick = async () => {
      likeBtn.disabled = true;
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, { likes: increment(1) });
      const countEl = likeBtn.querySelector('.action-count');
      let count = parseInt(countEl.textContent) || 0;
      count++;
      countEl.textContent = count;
      likeBtn.classList.add('liked', 'has-likes');
      likeBtn.disabled = false;
    };

    // Comentários — de /posts/{postid}/comentarios/{id}
    const commentBtn = postEl.querySelector('.comment-btn');
    const comentariosContainer = postEl.querySelector('.comentarios-container');
    const comentarArea = postEl.querySelector('.comentar-area');
    const inputComentario = postEl.querySelector('.input-comentario');
    const btnEnviar = postEl.querySelector('.btn-enviar-comentario');

    commentBtn.onclick = () => {
      const visible = comentariosContainer.style.display === 'block';
      comentariosContainer.style.display = visible ? 'none' : 'block';
      comentarArea.style.display = visible ? 'none' : 'flex';
      if (!visible) carregarComentariosPost(post.id, comentariosContainer);
    };

    btnEnviar.onclick = async () => {
      const texto = inputComentario.value.trim();
      if (!texto || !currentUserId) return;
      await comentarPost(post.id, texto);
      inputComentario.value = '';
      carregarComentariosPost(post.id, comentariosContainer);
    };

    inputComentario.addEventListener('keypress', e => {
      if (e.key === 'Enter') btnEnviar.click();
    });

    scrollArea.appendChild(postEl);
  });

  // Scroll para o post clicado
  setTimeout(() => {
    scrollArea.scrollTo({ top: indexInicial * window.innerHeight, behavior: "instant" });
  }, 50);

  modal.querySelector('.close-feed').onclick = fecharFeed;
  modal.querySelector('.feed-overlay').onclick = fecharFeed;
}

// Carregar comentários de /posts/{postid}/comentarios/{id}
async function carregarComentariosPost(postId, container) {
  container.innerHTML = '<div class="loading-comments">Carregando...</div>';
  const comentariosRef = collection(db, 'posts', postId, 'comentarios');
  const snap = await getDocs(comentariosRef);
  container.innerHTML = '';

  if (snap.empty) {
    container.innerHTML = '<div class="no-comments">Nenhum comentário ainda.</div>';
    return;
  }

  const comentariosDiv = document.createElement('div');
  comentariosDiv.className = 'comentarios';

  for (const comentDoc of snap.docs) {
    const comentData = comentDoc.data();
    const userData = await getUserData(comentData.creatorid || comentData.senderid || '');
    const nome = userData.displayname || userData.displayName || userData.username || 'Usuário';
    const username = userData.username ? `@${userData.username}` : '';
    const foto = await getUserPhoto(comentData.creatorid || comentData.senderid || '');
    const dataStr = formatarDataPost(comentData.create);

    const comentEl = document.createElement('div');
    comentEl.className = 'comentario-item';
    comentEl.innerHTML = `
      <div class="comentario-header">
        <img src="${foto}" alt="Avatar" class="comentario-avatar" onerror="this.src='./src/icon/default.jpg'" />
        <div class="comentario-meta">
          <strong>${nome}</strong>
          <small>${username}</small>
          <small>há ${dataStr}</small>
        </div>
      </div>
      <div class="comentario-conteudo">${formatarConteudoPost(comentData.content)}</div>
    `;
    comentariosDiv.appendChild(comentEl);
  }

  container.appendChild(comentariosDiv);
}

// Enviar comentário em /posts/{postid}/comentarios/{id}
async function comentarPost(postId, conteudo) {
  if (!conteudo || !currentUserId) return;
  const comentarioId = `coment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  await setDoc(doc(db, 'posts', postId, 'comentarios', comentarioId), {
    content: conteudo,
    create: new Date(),
    creatorid: currentUserId,
    report: 0
  });
}

// ===================
// INICIALIZAÇÃO
// ===================

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  currentUserId = user ? user.uid : null;

  profileUserId = determinarUsuarioParaCarregar();
  if (!profileUserId) return;

  // Carrega estatísticas, botões e listas
  await Promise.all([
    configurarBotaoSeguir(profileUserId),
    atualizarEstatisticasPerfil(profileUserId)
  ]);

  configurarBotaoMensagem(profileUserId);

  // Carrega posts do usuário da coleção global /posts
  await carregarPostsDoUsuario(profileUserId);

  // Carrega listas de amigos/seguindo/seguidores sob demanda
  // (chamadas quando as tabs são abertas)
  carregarListaAmigos(profileUserId);
  carregarListaSeguidores(profileUserId);
  carregarListaSeguindo(profileUserId);
});

// Exporta funções úteis para uso externo
window.carregarListaAmigos = carregarListaAmigos;
window.carregarListaSeguidores = carregarListaSeguidores;
window.carregarListaSeguindo = carregarListaSeguindo;
window.iniciarChatComUsuario = iniciarChatComUsuario;
window.abrirModalFeed = abrirModalFeed;