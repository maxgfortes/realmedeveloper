// ===================
// SISTEMA DE PERFIL COM FIREBASE AUTH E FIRESTORE (SEM EFEITO DOMINÓ)
// ===================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  startAt,
  endAt,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  limit,
  startAfter,
  deleteDoc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
let currentUserId = null;
let currentUserData = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = user;
  currentUserId = user.uid;
  currentUserData = await getUserData(currentUserId);
  await carregarPerfilCompleto();
  configurarLinks();
  configurarNavegacaoTabs();
  await atualizarMarqueeUltimoUsuario();
});




// ===================
// BUSCA DE USUÁRIOS
// ===================
const searchInput = document.getElementById('searchInput');
const resultsList = document.getElementById('searchResults');
const searchButton = document.querySelector('.search-box button');

if (searchInput && resultsList && searchButton) {
  async function performSearch() {
    const term = searchInput.value.trim().toLowerCase();
    resultsList.innerHTML = '';
    resultsList.classList.remove('visible');
    if (!term) return;

    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('username'), startAt(term), endAt(term + '\uf8ff'));
    try {
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        resultsList.innerHTML = '<li>Nenhum usuário encontrado</li>';
        resultsList.classList.add('visible');
        return;
      }
      snapshot.forEach(docSnap => {
        const user = docSnap.data();
        const li = document.createElement('li');
        li.textContent = user.displayname ? `${user.displayname} (@${user.username})` : user.username;
        li.addEventListener('click', () => {
          window.location.href = `PF.html?userid=${docSnap.id}`;
        });
        resultsList.appendChild(li);
      });
      resultsList.classList.add('visible');
    } catch (err) {
      resultsList.innerHTML = '<li>Erro na busca</li>';
      resultsList.classList.add('visible');
    }
  }
  searchButton.addEventListener('click', (e) => {
    e.preventDefault();
    performSearch();
  });
  searchInput.addEventListener('input', performSearch);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-area')) {
      resultsList.classList.remove('visible');
    }
  });
}

// ===================
// FUNÇÕES AUXILIARES
// ===================
async function getUserData(userid) {
  const userRef = doc(db, "users", userid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data() : {};
}

// ===================
// SISTEMA DE SEGUIR/SEGUINDO
// ===================
async function verificarSeEstaSeguindo(currentUserId, targetUserId) {
  const segRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
  const segDoc = await getDoc(segRef);
  return segDoc.exists();
}

async function seguirUsuario(currentUserId, targetUserId) {
  const now = new Date();
  await setDoc(doc(db, 'users', targetUserId, 'followers', currentUserId), {
    userid: currentUserId,
    followerin: now
  });
  await setDoc(doc(db, 'users', currentUserId, 'following', targetUserId), {
    userid: targetUserId,
    followin: now
  });
}

async function deixarDeSeguir(currentUserId, targetUserId) {
  await deleteDoc(doc(db, 'users', targetUserId, 'followers', currentUserId));
  await deleteDoc(doc(db, 'users', currentUserId, 'following', targetUserId));
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

async function atualizarEstatisticasPerfil(userid) {
  const postsRef = collection(db, 'users', userid, 'posts');
  const postsSnap = await getDocs(postsRef);
  const numPosts = postsSnap.size;
  const numSeguidores = await contarSeguidores(userid);
  const numSeguindo = await contarSeguindo(userid);
  const statsElement = document.querySelector('.profile-stats');
  if (statsElement) {
    statsElement.innerHTML = `
      <div class="stats">
          <span><strong>${numPosts}</strong> posts</span>
        </div>
        <div class="stats">
          <span><strong>${numSeguidores}</strong> seguidores</span>
        </div>
        <div class="stats">
          <span><strong>0</strong> amigos</span>
        </div>
        <div class="stats">
          <span><strong>${numSeguindo}</strong> seguindo</span>
        </div>
    `;
  }
}

async function configurarBotaoSeguir(targetUserId) {
  const followBtn = document.querySelector('.btn-follow');
  if (!followBtn || !currentUserId) return;
  if (targetUserId === currentUserId) {
    followBtn.style.display = 'none';
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

// ===================
// SISTEMA DE DEPOIMENTOS
// ===================
async function carregarDepoimentos(userid) {
  const depoimentosContainer = document.querySelector('.deps-tab .about-container');
  if (!depoimentosContainer) return;
  depoimentosContainer.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Carregando depoimentos...</p>
    </div>
  `;
  const depoimentosRef = collection(db, 'users', userid, 'depoimentos');
  const depoimentosQuery = query(depoimentosRef, orderBy('criadoem', 'desc'));
  const snapshot = await getDocs(depoimentosQuery);
  depoimentosContainer.innerHTML = '';
  const isOwnProfile = userid === currentUserId;
  if (!isOwnProfile) {
    const depoimentoForm = document.createElement('div');
    depoimentoForm.className = 'depoimento-form';
    depoimentoForm.innerHTML = `
      <h4>Deixar um depoimento</h4>
      <textarea id="depoimentoTexto" placeholder="Escreva seu depoimento aqui..." maxlength="500"></textarea>
      <div class="form-actions">
        <span class="char-count">0/500</span>
        <button class="btn-enviar-depoimento" onclick="enviarDepoimento('${userid}')">
          <i class="fas fa-paper-plane"></i> Enviar Depoimento
        </button>
      </div>
    `;
    depoimentosContainer.appendChild(depoimentoForm);
    const textarea = depoimentoForm.querySelector('#depoimentoTexto');
    const charCount = depoimentoForm.querySelector('.char-count');
    textarea.addEventListener('input', () => {
      const count = textarea.value.length;
      charCount.textContent = `${count}/500`;
      charCount.style.color = count > 450 ? '#dc3545' : '#666';
    });
  }
  if (snapshot.empty) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-depoimentos';
    emptyDiv.innerHTML = `
      <div class="empty-icon"><i class="fas fa-comments"></i></div>
      <h3>Nenhum depoimento ainda</h3>
      <p>${isOwnProfile ? 'Você ainda não recebeu depoimentos.' : 'Este usuário ainda não recebeu depoimentos.'}</p>
    `;
    depoimentosContainer.appendChild(emptyDiv);
    return;
  }
  for (const depoDoc of snapshot.docs) {
    const depoData = depoDoc.data();
    let autorData = {};
    if (depoData.creatorid) {
      autorData = await getUserData(depoData.creatorid);
    }
    const depoElement = criarElementoDepoimento(depoData, autorData, depoDoc.id, userid);
    depoimentosContainer.appendChild(depoElement);
  }
}

function criarElementoDepoimento(depoData, autorData, depoId, targetUserId) {
  const depoElement = document.createElement('div');
  depoElement.className = 'depoimento-card';
  depoElement.setAttribute('data-depo-id', depoId);
  const autorFoto = autorData.userphoto || './src/icon/default.jpg';
  const autorNome = autorData.displayname || autorData.username || 'Usuário';
  const dataFormatada = formatarDataPost(depoData.criadoem);
  const conteudo = depoData.conteudo || 'Depoimento sem conteúdo';
  const isOwner = currentUserId === targetUserId;
  const isAuthor = currentUserId === depoData.creatorid;
  const podeExcluir = isOwner || isAuthor;
  depoElement.innerHTML = `
    <div class="depoimento-header">
      <div class="autor-info">
        <img src="${autorFoto}" alt="Foto do autor" class="autor-pic"
          onerror="this.src='./src/icon/default.jpg'"
          onclick="window.location.href='PF.html?userid=${depoData.creatorid}'">
        <div class="autor-details">
          <span class="autor-nome" onclick="window.location.href='PF.html?userid=${depoData.creatorid}'">${autorNome}</span>
          <span class="depo-time">${dataFormatada}</span>
        </div>
      </div>
      ${podeExcluir ? `<button class="delete-depo-btn" onclick="excluirDepoimento('${depoId}', '${targetUserId}')">
        <i class="fas fa-trash"></i>
      </button>` : ''}
    </div>
    <div class="depoimento-content"><p>${conteudo}</p></div>
  `;
  return depoElement;
}

async function enviarDepoimento(targetUserId) {
  const textarea = document.getElementById('depoimentoTexto');
  const btnEnviar = document.querySelector('.btn-enviar-depoimento');
  if (!textarea || !btnEnviar) return;
  const conteudo = textarea.value.trim();
  if (!conteudo) {
    alert('Por favor, escreva um depoimento antes de enviar.');
    return;
  }
  if (currentUserId === targetUserId) {
    alert('Você não pode deixar um depoimento para si mesmo.');
    return;
  }
  btnEnviar.disabled = true;
  btnEnviar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
  try {
    const depoId = `dep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const depoimentoData = {
      conteudo,
      creatorid: currentUserId,
      criadoem: new Date()
    };
    await setDoc(doc(db, 'users', targetUserId, 'depoimentos', depoId), depoimentoData);
    textarea.value = '';
    const charCount = document.querySelector('.char-count');
    if (charCount) charCount.textContent = '0/500';
    await carregarDepoimentos(targetUserId);
    const successMsg = document.createElement('div');
    successMsg.className = 'success-message';
    successMsg.textContent = 'Depoimento enviado com sucesso!';
    successMsg.style.cssText = `
      position: fixed; top: 20px; right: 20px; background: #28a745; color: white;
      padding: 12px 20px; border-radius: 8px; z-index: 9999; animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(successMsg);
    setTimeout(() => { successMsg.remove(); }, 3000);
  } catch {
    alert('Erro ao enviar depoimento. Tente novamente.');
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Depoimento';
  }
}

async function excluirDepoimento(depoId, targetUserId) {
  if (!confirm('Tem certeza que deseja excluir este depoimento?')) return;
  await deleteDoc(doc(db, 'users', targetUserId, 'depoimentos', depoId));
  await carregarDepoimentos(targetUserId);
  const successMsg = document.createElement('div');
  successMsg.className = 'success-message';
  successMsg.textContent = 'Depoimento excluído com sucesso!';
  successMsg.style.cssText = `
    position: fixed; top: 20px; right: 20px; background: #dc3545; color: white;
    padding: 12px 20px; border-radius: 8px; z-index: 9999; animation: slideIn 0.3s ease-out;
  `;
  document.body.appendChild(successMsg);
  setTimeout(() => { successMsg.remove(); }, 3000);
}

// ===================
// SISTEMA DE LINKS
// ===================
async function carregarLinks(userid) {
  const linksContainer = document.querySelector('.links-tab .about-container');
  if (!linksContainer) return;
  const userRef = doc(db, 'users', userid, 'user-infos', 'user-media');
  const userDoc = await getDoc(userRef);
  linksContainer.innerHTML = '';
  if (!userDoc.exists()) {
    linksContainer.innerHTML = `
      <div class="empty-links"><div class="empty-icon"><i class="fas fa-link"></i></div>
      <h3>Usuário não encontrado</h3></div>
    `;
    return;
  }
  const links = userDoc.data().links || {};
  if (!links || Object.keys(links).length === 0) {
    linksContainer.innerHTML = `
      <div class="empty-links"><div class="empty-icon"><i class="fas fa-link"></i></div>
      <h3>Nenhum link ainda</h3><p>Este usuário ainda não adicionou nenhum link.</p></div>
    `;
    return;
  }
  Object.entries(links).forEach(([key, url]) => {
    if (url && url.trim()) {
      const linkElement = document.createElement('div');
      linkElement.className = 'link-box';
      let icon = 'fas fa-external-link-alt', label = key;
      if (url.includes('instagram.com')) { icon = 'fab fa-instagram'; label = 'Instagram'; }
      else if (url.includes('twitter.com') || url.includes('x.com')) { icon = 'fab fa-twitter'; label = 'Twitter/X'; }
      else if (url.includes('tiktok.com')) { icon = 'fab fa-tiktok'; label = 'TikTok'; }
      else if (url.includes('youtube.com')) { icon = 'fab fa-youtube'; label = 'YouTube'; }
      else if (url.includes('github.com')) { icon = 'fab fa-github'; label = 'GitHub'; }
      else if (url.includes('linkedin.com')) { icon = 'fab fa-linkedin'; label = 'LinkedIn'; }
      else if (url.includes('discord')) { icon = 'fab fa-discord'; label = 'Discord'; }
      else if (url.includes('spotify.com')) { icon = 'fab fa-spotify'; label = 'Spotify'; }
      linkElement.innerHTML = `
        <a href="${url}" target="_blank" rel="noopener noreferrer" class="user-link">
          <i class="${icon}"></i>
          <span>${label}</span>
          <i class="fas fa-external-link-alt link-arrow"></i>
        </a>
      `;
      linksContainer.appendChild(linkElement);
    }
  });
}

// ===================
// SISTEMA DE POSTS
// ===================
let isLoadingPosts = false;
let lastPostDoc = null;
let currentProfileId = null;

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

function criarElementoPost(postData, userPhoto, displayName, username, postId) {
  const postCard = document.createElement('div');
  postCard.className = 'post-card';
  postCard.setAttribute('data-post-id', postId);
  const dataPost = formatarDataPost(postData.criadoem);
  const conteudoFormatado = formatarConteudoPost(postData.content || postData.conteudo);
  let imagemHTML = '';
  if (postData.img || postData.imagem) {
    const imgUrl = postData.img || postData.imagem;
    imagemHTML = `
      <div class="post-image-container">
        <img src="${imgUrl}" alt="Imagem do post" class="post-image"
          onerror="this.parentElement.style.display='none'"
          onclick="abrirModalImagem('${imgUrl}')">
      </div>
    `;
  }
  const curtidas = postData.likes || postData.curtidas || 0;
  postCard.innerHTML = `
    <div class="post-header">
      <div class="profile-info">
        <img src="${userPhoto}" alt="Foto de perfil" class="user-pic"
          onerror="this.src='./src/icon/default.jpg'">
        <div class="user-details">
          <span class="display-name">${displayName}</span>
          <span class="username-small">@${username}</span>
          <span class="post-time">${dataPost}</span>
        </div>
      </div>
      <button class="post-options" onclick="mostrarOpcoesPost('${postId}')">
        <i class="fas fa-ellipsis-h"></i>
      </button>
    </div>
    <div class="post-content">${conteudoFormatado}${imagemHTML}</div>
    <div class="post-actions">
      <button class="action-btn like-btn ${curtidas > 0 ? 'has-likes' : ''}"
        onclick="curtirPost('${postId}', '${username}', this)">
        <i class="fas fa-heart"></i>
        <span class="action-count">${curtidas > 0 ? curtidas : ''}</span>
      </button>
      <button class="action-btn comment-btn" onclick="abrirComentarios('${postId}')">
        <i class="fas fa-comment"></i>
        <span class="action-count"></span>
      </button>
      <button class="action-btn share-btn" onclick="compartilharPost('${postId}')">
        <i class="fas fa-share"></i>
      </button>
      <button class="action-btn bookmark-btn" onclick="salvarPost('${postId}')">
        <i class="fas fa-bookmark"></i>
      </button>
    </div>
  `;
  return postCard;
}

async function carregarPostsDoMural(userid) {
  const muralContainer = document.getElementById('muralPosts');
  if (!muralContainer || isLoadingPosts) return;
  isLoadingPosts = true;
  currentProfileId = userid;
  muralContainer.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Carregando posts...</p>
    </div>
  `;
  const userData = await getUserData(userid);
  const userPhoto = userData.userphoto || './src/icon/default.jpg';
  const displayName = userData.displayname || userData.username || userid;
  const username = userData.username || userid;
  const postsRef = collection(db, 'users', userid, 'posts');
  const postsQuery = query(postsRef, orderBy('criadoem', 'desc'), limit(10));
  const snapshot = await getDocs(postsQuery);
  muralContainer.innerHTML = '';
  if (snapshot.empty) {
    muralContainer.innerHTML = `
      <div class="empty-posts">
        <div class="empty-icon"><i class="fas fa-pen-alt"></i></div>
        <h3>Nenhum post ainda</h3>
        <p>Este usuário ainda não compartilhou nada.</p>
        ${userid === currentUserId ? '<a href="feed.html" class="btn-primary">Fazer primeiro post</a>' : ''}
      </div>
    `;
    isLoadingPosts = false;
    return;
  }
  snapshot.forEach(postDoc => {
    const postData = postDoc.data();
    const postElement = criarElementoPost(postData, userPhoto, displayName, username, postDoc.id);
    muralContainer.appendChild(postElement);
  });
  if (snapshot.docs.length > 0) lastPostDoc = snapshot.docs[snapshot.docs.length - 1];
  if (snapshot.docs.length === 10) {
    const loadMoreBtn = document.createElement('div');
    loadMoreBtn.className = 'load-more-container';
    loadMoreBtn.innerHTML = `
      <button class="load-more-btn" onclick="carregarMaisPosts()">
        <i class="fas fa-chevron-down"></i>
        Carregar mais posts
      </button>
    `;
    muralContainer.appendChild(loadMoreBtn);
  }
  isLoadingPosts = false;
}

async function carregarMaisPosts() {
  if (!currentProfileId || !lastPostDoc || isLoadingPosts) return;
  isLoadingPosts = true;
  const loadMoreBtn = document.querySelector('.load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
    loadMoreBtn.disabled = true;
  }
  const userData = await getUserData(currentProfileId);
  const userPhoto = userData.userphoto || './src/icon/default.jpg';
  const displayName = userData.displayname || userData.username || currentProfileId;
  const username = userData.username || currentProfileId;
  const postsRef = collection(db, 'users', currentProfileId, 'posts');
  const postsQuery = query(postsRef, orderBy('criadoem', 'desc'), startAfter(lastPostDoc), limit(5));
  const snapshot = await getDocs(postsQuery);
  if (!snapshot.empty) {
    const muralContainer = document.getElementById('muralPosts');
    const loadMoreContainer = document.querySelector('.load-more-container');
    if (loadMoreContainer) loadMoreContainer.remove();
    snapshot.forEach(postDoc => {
      const postData = postDoc.data();
      const postElement = criarElementoPost(postData, userPhoto, displayName, username, postDoc.id);
      muralContainer.appendChild(postElement);
    });
    lastPostDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.docs.length === 5) {
      const loadMoreBtn = document.createElement('div');
      loadMoreBtn.className = 'load-more-container';
      loadMoreBtn.innerHTML = `
        <button class="load-more-btn" onclick="carregarMaisPosts()">
          <i class="fas fa-chevron-down"></i>
          Carregar mais posts
        </button>
      `;
      muralContainer.appendChild(loadMoreBtn);
    }
  } else {
    const loadMoreContainer = document.querySelector('.load-more-container');
    if (loadMoreContainer) {
      loadMoreContainer.innerHTML = `
        <div class="end-posts">
          <i class="fas fa-check-circle"></i>
          Todos os posts foram carregados
        </div>
      `;
    }
  }
  isLoadingPosts = false;
}

// ===================
// SISTEMA DE NAVEGAÇÃO ENTRE TABS
// ===================
function configurarNavegacaoTabs() {
  const menuItems = document.querySelectorAll('.menu-item');
  const tabs = document.querySelectorAll('.tab');
  if (!menuItems.length || !tabs.length) return;
  menuItems.forEach((item, index) => {
    item.addEventListener('click', async () => {
      menuItems.forEach(mi => mi.classList.remove('active'));
      tabs.forEach(tab => tab.classList.remove('active'));
      item.classList.add('active');
      if (tabs[index]) tabs[index].classList.add('active');
      const userid = determinarUsuarioParaCarregar();
      if (!userid) return;
      if (index === 0) {
        if (!document.querySelector('#muralPosts .post-card:not(.loading-container):not(.empty-posts):not(.error-container)')) {
          await carregarPostsDoMural(userid);
        }
      } else if (index === 3) {
        await carregarDepoimentos(userid);
      } else if (index === 4) {
        await carregarLinks(userid);
      }
    });
  });
  if (menuItems[0] && tabs[0]) {
    menuItems[0].classList.add('active');
    tabs[0].classList.add('active');
  }
}

// ===================
// FUNÇÕES DE INTERAÇÃO COM POSTS
// ===================
async function curtirPost(postId, userid, btnElement) {
  btnElement.classList.add('loading');
  const countElement = btnElement.querySelector('.action-count');
  let currentCount = parseInt(countElement.textContent) || 0;
  currentCount++;
  countElement.textContent = currentCount;
  btnElement.classList.add('liked', 'has-likes');
  btnElement.style.transform = 'scale(1.2)';
  setTimeout(() => { btnElement.style.transform = 'scale(1)'; }, 200);
  btnElement.classList.remove('loading');
}

function abrirModalImagem(imagemUrl) {
  const modal = document.createElement('div');
  modal.className = 'image-modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="fecharModal()">
      <div class="modal-content" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="fecharModal()">
          <i class="fas fa-times"></i>
        </button>
        <img src="${imagemUrl}" alt="Imagem ampliada" class="modal-image">
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  const modal = document.querySelector('.image-modal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = 'auto';
  }
}

function mostrarOpcoesPost(postId) {}
function abrirComentarios(postId) {}
function compartilharPost(postId) {
  if (navigator.share) {
    navigator.share({
      title: 'Post do RealMe',
      url: window.location.href
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(window.location.href)
      .then(() => alert('Link copiado!'))
      .catch(() => {});
  }
}
function salvarPost(postId) {}

// ===================
// OUTRAS FUNÇÕES
// ===================
function determinarUsuarioParaCarregar() {
  const params = new URLSearchParams(window.location.search);
  const useridParam = params.get("userid");
  if (useridParam) return useridParam;
  return currentUserId;
}

async function carregarPerfilCompleto() {
  const userid = determinarUsuarioParaCarregar();
  if (!userid) {
    window.location.href = 'index.html';
    return;
  }
  const userData = await getUserData(userid);
  const aboutRef = doc(db, "users", userid, "user-infos", "about");
  const aboutSnap = await getDoc(aboutRef);
  const aboutData = aboutSnap.exists() ? aboutSnap.data() : {};
  atualizarInformacoesBasicas(userData, userid);
  atualizarVisaoGeral(aboutData);
  atualizarGostos(aboutData);
  atualizarImagensPerfil(userData, userid);
  await atualizarEstatisticasPerfil(userid);
  await configurarBotaoSeguir(userid);
  await tocarMusicaDoUsuario(userid);
  await carregarPostsDoMural(userid);

  // Configura botão de mensagem
  const btnMsg = document.getElementById('btnMensagemPerfil') || document.querySelector('.btn-msg');
  if (btnMsg && userid !== currentUserId) {
    btnMsg.onclick = () => iniciarChatComUsuario(userid);
    btnMsg.style.display = 'inline-block';
  } else if (btnMsg) {
    btnMsg.style.display = 'none';
  }

  // Função para gerar ID único do chat
function gerarChatId(user1, user2) {
  return `chat-${[user1, user2].sort().join("-")}`;
}

// Função principal para iniciar/criar chat
async function iniciarChatComUsuario(targetUserId) {
  try {
    // Validação básica
    if (!currentUserId || !targetUserId) {
      console.error("IDs de usuário não fornecidos");
      return;
    }

    // Não permitir chat consigo mesmo
    if (currentUserId === targetUserId) {
      console.error("Não é possível criar chat consigo mesmo");
      return;
    }

    // Gerar ID do chat
    const chatId = gerarChatId(currentUserId, targetUserId);
    const chatRef = doc(db, "chats", chatId);
    
    // Verificar se chat já existe
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      // Criar novo chat com a estrutura exata que você mostrou
      await setDoc(chatRef, {
        participants: [currentUserId, targetUserId].sort(),
        createdAt: new Date(), // Será convertido para timestamp automaticamente
        lastMessage: "", // String vazia inicial
        lastMessageTime: null // Null inicial, será preenchido com a primeira mensagem
      });
      
      console.log(`Chat criado: ${chatId}`);
    } else {
      console.log(`Chat já existe: ${chatId}`);
    }
    
    // Redirecionar para a página do chat
    window.location.href = `direct.html?chatid=${chatId}`;
    
  } catch (error) {
    console.error("Erro ao criar/acessar chat:", error);
  }
}

// Função auxiliar para buscar chat existente (caso precise)
async function buscarChat(chatId) {
  try {
    const chatRef = doc(db, "chats", chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (chatDoc.exists()) {
      return { id: chatDoc.id, ...chatDoc.data() };
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar chat:", error);
    return null;
  }
}
}
function atualizarInformacoesBasicas(userData, userid) {
  // Usa displayname salvo no documento do usuário
  const nomeCompleto = userData.displayname || "Nome não disponível";
  const nomeElement = document.getElementById("displayname");
  if (nomeElement) nomeElement.textContent = nomeCompleto;

  // Usa username salvo no documento do usuário
  const usernameElement = document.getElementById("username");
  if (usernameElement) usernameElement.textContent = userData.username ? `@${userData.username}` : `@${userid}`;

  const tituloMural = document.getElementById("tituloMural");
  if (tituloMural) tituloMural.textContent = `Mural de ${nomeCompleto}`;

  const visaoGeralTitle = document.getElementById("visao-geral-title");
  if (visaoGeralTitle) visaoGeralTitle.textContent = `Visão Geral de ${nomeCompleto}`;

  const gostosTitle = document.getElementById("gostos-title");
  if (gostosTitle) gostosTitle.textContent = `Gostos de ${nomeCompleto}`;

  const depsTitle = document.querySelector('.deps-tab h3');
  if (depsTitle) depsTitle.textContent = `Depoimentos de ${nomeCompleto}`;

  const linksTitle = document.querySelector('.links-tab h3');
  if (linksTitle) linksTitle.textContent = `Links de ${nomeCompleto}`;

  const amigosTitle = document.querySelector('.amigos-tab h3');
  if (amigosTitle) amigosTitle.textContent = `Amigos de ${nomeCompleto}`;

  if (userData.pronoun1 || userData.pronoun2) {
    const pronomes = `${userData.pronoun1 || ''}/${userData.pronoun2 || ''}`.replace(/^\/|\/$/g, '');
    const handleElement = document.querySelector('.handle');
    if (handleElement && pronomes) {
      handleElement.innerHTML = `@${userData.username || userid} • ${pronomes}`;
    }
  }
}




function atualizarVisaoGeral(dados) {
  const visaoTab = document.querySelector('.visao-tab .about-container');
  if (!visaoTab) return;
  const aboutBoxes = visaoTab.querySelectorAll('.about-box');
  if (aboutBoxes[0]) aboutBoxes[0].innerHTML = `<p><i>Visão geral:</i></p><p>${dados.overview || "Informação não disponível"}</p>`;
  if (aboutBoxes[1]) aboutBoxes[1].innerHTML = `<p><i>Tags:</i></p><p>${dados.tags || "Informação não disponível"}</p>`;
  if (aboutBoxes[2]) aboutBoxes[2].innerHTML = `<p><i>Meu Estilo:</i></p><p>${dados.styles || "Informação não disponível"}</p>`;
  if (aboutBoxes[3]) aboutBoxes[3].innerHTML = `<p><i>Minha personalidade:</i></p><p>${dados.personality || "Informação não disponível"}</p>`;
  if (aboutBoxes[4]) aboutBoxes[4].innerHTML = `<p><i>Meus Sonhos e desejos:</i></p><p>${dados.dreams || "Informação não disponível"}</p>`;
  if (aboutBoxes[5]) aboutBoxes[5].innerHTML = `<p><i>Meus Medos:</i></p><p>${dados.fears || "Informação não disponível"}</p>`;
}

function atualizarGostos(dados) {
  const gostosTab = document.querySelector('.gostos-tab .about-container');
  if (!gostosTab) return;
  const aboutBoxes = gostosTab.querySelectorAll('.about-box');
  if (aboutBoxes[0]) aboutBoxes[0].innerHTML = `<p><i>Músicas:</i></p><p>${dados.music || "Informação não disponível"}</p>`;
  if (aboutBoxes[1]) aboutBoxes[1].innerHTML = `<p><i>Filmes e Séries:</i></p><p>${dados["movies-series"] || "Informação não disponível"}</p>`;
  if (aboutBoxes[2]) aboutBoxes[2].innerHTML = `<p><i>Livros:</i></p><p>${dados.books || "Informação não disponível"}</p>`;
  if (aboutBoxes[3]) aboutBoxes[3].innerHTML = `<p><i>Personagens:</i></p><p>${dados.characters || "Informação não disponível"}</p>`;
  if (aboutBoxes[4]) aboutBoxes[4].innerHTML = `<p><i>Comidas e Bebidas:</i></p><p>${dados.foods || "Informação não disponível"}</p>`;
  if (aboutBoxes[5]) aboutBoxes[5].innerHTML = `<p><i>Hobbies:</i></p><p>${dados.hobbies || "Informação não disponível"}</p>`;
  if (aboutBoxes[6]) aboutBoxes[6].innerHTML = `<p><i>Jogos favoritos:</i></p><p>${dados.games || "Informação não disponível"}</p>`;
  if (aboutBoxes[7]) aboutBoxes[7].innerHTML = `<p><i>Outros gostos:</i></p><p>${dados.others || "Informação não disponível"}</p>`;
}

async function atualizarImagensPerfil(userData, userid) {
  // Busca dados de user-media
  const mediaRef = doc(db, "users", userid, "user-infos", "user-media");
  const mediaSnap = await getDoc(mediaRef);
  const mediaData = mediaSnap.exists() ? mediaSnap.data() : {};

  // Foto de perfil
  const profilePic = document.querySelector('.profile-pic');
  if (profilePic) {
    profilePic.src = mediaData.userphoto || './src/icon/default.jpg';
    profilePic.onerror = () => { profilePic.src = './src/icon/default.jpg'; };
  }

  // Fotos em outros lugares
  const userPics = document.querySelectorAll('.user-pic');
  userPics.forEach(pic => {
    pic.src = mediaData.userphoto || './src/icon/default.jpg';
    pic.onerror = () => { pic.src = './src/icon/default.jpg'; };
  });

   // Fotos navbar
  const navPic = document.querySelectorAll('.profile-mini');
  navPic.forEach(pic => {
    pic.src = mediaData.userphoto || './src/icon/default.jpg';
    pic.onerror = () => { pic.src = './src/icon/default.jpg'; };
  });

  

  // Background
  const bgUrl = mediaData.background;
  if (bgUrl) {
    document.body.style.backgroundImage = `url('${bgUrl}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
  }

  // Header
  const headerPhoto = mediaData.headerphoto;
  const headerEl = document.querySelector('.profile-header');
  if (headerEl && headerPhoto) {
    headerEl.style.backgroundImage = `url('${headerPhoto}')`;
    headerEl.style.backgroundSize = 'cover';
    headerEl.style.backgroundPosition = 'center';
  }
}

function configurarLinks() {
  if (currentUserId && currentUserData) {
    const urlPerfil = `PF.html?userid=${encodeURIComponent(currentUserId)}`;
    const linkSidebar = document.getElementById('linkPerfilSidebar');
    const linkMobile = document.getElementById('linkPerfilMobile');
    if (linkSidebar) linkSidebar.href = urlPerfil;
    if (linkMobile) linkMobile.href = urlPerfil;
  }
  const btnSair = document.getElementById('btnSair');
  if (btnSair) {
    btnSair.addEventListener('click', (e) => {
      e.preventDefault();
      signOut(auth);
      window.location.href = 'index.html';
    });
  }
}



async function atualizarMarqueeUltimoUsuario() {
  const lastUpdateRef = doc(db, "lastupdate", "latestUser");
  const docSnap = await getDoc(lastUpdateRef);
  const marquee = document.querySelector(".marquee");
  if (!marquee) return;
  if (docSnap.exists()) {
    const data = docSnap.data();
    const nomeUsuario = data.username || "Usuário";
    marquee.textContent = `${nomeUsuario} acabou de entrar no RealMe!`;
  } else {
    marquee.textContent = "Bem-vindo ao RealMe!";
  }
}

// ===================
// TORNAR FUNÇÕES GLOBAIS PARA ONCLICK
// ===================
window.curtirPost = curtirPost;
window.abrirModalImagem = abrirModalImagem;
window.fecharModal = fecharModal;
window.mostrarOpcoesPost = mostrarOpcoesPost;
window.abrirComentarios = abrirComentarios;
window.compartilharPost = compartilharPost;
window.salvarPost = salvarPost;
window.carregarMaisPosts = carregarMaisPosts;
window.enviarDepoimento = enviarDepoimento;
window.excluirDepoimento = excluirDepoimento;
window.carregarDepoimentos = carregarDepoimentos;
window.carregarLinks = carregarLinks;


// ===================
// FIRESTORE SECURITY RULES SUGESTÃO
// ===================
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      match /followers/{followerId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.auth.uid == followerId;
      }
      match /following/{followingId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
      match /posts/{postId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
      match /depoimentos/{depoId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && (request.auth.uid == userId || request.auth.uid == resource.data.creatorid);
        allow delete: if request.auth != null && (request.auth.uid == userId || request.auth.uid == resource.data.creatorid);
      }
      match /user-infos/{docId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }
    match /lastupdate/{docId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
*/


