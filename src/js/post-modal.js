// ===================
// SISTEMA DE MODAL PARA CRIAR POSTS
// ===================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Configuração Firebase (mesma que já existe)
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

// Variáveis globais
let currentUser = null;

// ===================
// CRIAR MODAL HTML
// ===================
function criarModal() {
  // Remove modal existente se houver
  const modalExistente = document.getElementById('postModal');
  if (modalExistente) {
    modalExistente.remove();
  }

  const modalHTML = `
    <div class="post-modal-overlay" id="postModal">
      <div class="post-modal-container">
        <div class="post-modal-header">
          <h2>Criar Nova Postagem</h2>
          <button class="close-modal-btn" id="closeModalBtn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="post-modal-body">
          <!-- Área do usuário -->
          <div class="user-info-modal">
            <img src="./src/icon/default.jpg" alt="Avatar" class="modal-user-avatar" id="modalUserAvatar">
            <div class="user-details-modal">
              <span class="user-name-modal" id="modalUserName">Usuário</span>
              <span class="user-username-modal" id="modalUsername">@usuario</span>
            </div>
          </div>

          <!-- Textarea para o post -->
          <div class="post-content-area">
            <textarea 
              id="postTextarea" 
              placeholder="O que você está pensando?"
              rows="4"
              maxlength="500"
            ></textarea>
            <div class="character-count">
              <span id="charCount">0</span>/500
            </div>
          </div>

          <!-- Área de imagem -->
          <div class="image-input-area">
            <label for="imageUrlInput" class="image-input-label">
              <i class="fas fa-image"></i>
              Adicionar URL de imagem (opcional)
            </label>
            <input 
              type="url" 
              id="imageUrlInput" 
              placeholder="https://exemplo.com/imagem.jpg"
              class="image-url-input"
            >
            <div class="image-preview" id="imagePreview" style="display: none;">
              <img id="previewImg" alt="Preview">
              <button type="button" class="remove-preview-btn" id="removePreviewBtn">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>

          <!-- Hashtags sugeridas -->
          <div class="hashtags-suggestion">
            <span class="hashtag-label">Hashtags populares:</span>
            <div class="hashtag-buttons">
              <button type="button" class="hashtag-btn" data-tag="RealMe">#RealMe</button>
              <button type="button" class="hashtag-btn" data-tag="feed">#feed</button>
              <button type="button" class="hashtag-btn" data-tag="post">#post</button>
              <button type="button" class="hashtag-btn" data-tag="social">#social</button>
            </div>
          </div>
        </div>

        <div class="post-modal-footer">
          <button type="button" class="cancel-btn" id="cancelBtn">Cancelar</button>
          <button type="button" class="submit-post-btn" id="submitPostBtn">
            <i class="fas fa-paper-plane"></i>
            Postar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  adicionarEstilosModal();
}

// ===================
// ESTILOS CSS DO MODAL
// ===================
function adicionarEstilosModal() {
  if (document.getElementById('postModalStyles')) return;

  const styles = `
    <style id="postModalStyles">
      .post-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: modalFadeIn 0.3s ease-out;
      }

      @keyframes modalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .post-modal-container {
        background: linear-gradient(145deg, #1a1a1a, #2d2d2d);
        border: 1px solid #333;
        border-radius: 12px;
        width: 90%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        animation: modalSlideIn 0.3s ease-out;
      }

      @keyframes modalSlideIn {
        from { transform: translateY(-50px) scale(0.9); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }

      .post-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #333;
      }

      .post-modal-header h2 {
        color: #fff;
        font-size: 18px;
        font-weight: 600;
        margin: 0;
      }

      .close-modal-btn {
        background: none;
        border: none;
        color: #999;
        font-size: 18px;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .close-modal-btn:hover {
        background: #333;
        color: #fff;
      }

      .post-modal-body {
        padding: 24px;
      }

      .user-info-modal {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
      }

      .modal-user-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
      }

      .user-details-modal {
        display: flex;
        flex-direction: column;
      }

      .user-name-modal {
        color: #fff;
        font-weight: 600;
        font-size: 16px;
      }

      .user-username-modal {
        color: #999;
        font-size: 14px;
      }

      .post-content-area {
        position: relative;
        margin-bottom: 20px;
      }

      #postTextarea {
        width: 100%;
        min-height: 120px;
        background: #2a2a2a;
        border: 2px solid #333;
        border-radius: 12px;
        padding: 16px;
        color: #fff;
        font-size: 16px;
        font-family: inherit;
        resize: vertical;
        transition: border-color 0.3s ease;
      }

      #postTextarea:focus {
        outline: none;
        border-color: #4A90E2;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
      }

      #postTextarea::placeholder {
        color: #666;
      }

      .character-count {
        position: absolute;
        bottom: -24px;
        right: 0;
        font-size: 12px;
        color: #666;
      }

      .character-count.warning {
        color: #ff9800;
      }

      .character-count.danger {
        color: #f44336;
      }

      .image-input-area {
        margin-bottom: 20px;
        margin-top: 30px;
      }

      .image-input-label {
        display: block;
        color: #4A90E2;
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 8px;
        cursor: pointer;
      }

      .image-input-label i {
        margin-right: 8px;
      }

      .image-url-input {
        width: 100%;
        background: #2a2a2a;
        border: 2px solid #333;
        border-radius: 8px;
        padding: 12px;
        color: #fff;
        font-size: 14px;
        transition: border-color 0.3s ease;
      }

      .image-url-input:focus {
        outline: none;
        border-color: #4A90E2;
      }

      .image-url-input::placeholder {
        color: #666;
      }

      .image-preview {
        margin-top: 12px;
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        background: #333;
      }

      .image-preview img {
        width: 100%;
        max-height: 300px;
        object-fit: cover;
        display: block;
      }

      .remove-preview-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        background: rgba(0, 0, 0, 0.7);
        border: none;
        border-radius: 50%;
        color: #fff;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s ease;
      }

      .remove-preview-btn:hover {
        background: rgba(244, 67, 54, 0.8);
      }

      .hashtags-suggestion {
        margin-bottom: 24px;
      }

      .hashtag-label {
        display: block;
        color: #999;
        font-size: 14px;
        margin-bottom: 8px;
      }

      .hashtag-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .hashtag-btn {
        background: #333;
        border: 1px solid #444;
        color: #4A90E2;
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .hashtag-btn:hover {
        background: #4A90E2;
        color: #fff;
      }

      .post-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 20px 24px;
        border-top: 1px solid #333;
      }

      .cancel-btn {
        background: none;
        border: 2px solid #666;
        color: #999;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .cancel-btn:hover {
        border-color: #999;
        color: #fff;
      }

      .submit-post-btn {
        background: linear-gradient(45deg, #4A90E2, #357abd);
        border: none;
        color: #fff;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
      }

      .submit-post-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
      }

      .submit-post-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }

      .submit-post-btn.loading {
        opacity: 0.7;
      }

      .submit-post-btn.loading i {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      /* Responsivo */
      @media (max-width: 768px) {
        .post-modal-container {
          width: 95%;
          margin: 20px;
        }

        .post-modal-header,
        .post-modal-body,
        .post-modal-footer {
          padding: 16px;
        }

        .hashtag-buttons {
          justify-content: center;
        }
      }
    </style>
  `;

  document.head.insertAdjacentHTML('beforeend', styles);
}

// ===================
// FUNÇÕES AUXILIARES
// ===================
function gerarIdUnico(prefixo = 'post') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `${prefixo}-${timestamp}${random}`;
}

function detectarLinksMaliciosos(texto) {
  const DOMINIOS_MALICIOSOS = [
    'bit.ly', 'tinyurl.com', 'goo.gl', 'ow.ly', 't.co',
    'phishing-example.com', 'malware-site.net', 'scam-website.org'
  ];
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = texto.match(urlRegex) || [];
  
  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      if (DOMINIOS_MALICIOSOS.some(domain => hostname.includes(domain))) {
        return { malicioso: true, url: url };
      }
    } catch (e) {
      return { malicioso: true, url: url };
    }
  }
  return { malicioso: false };
}

async function validarUrlImagem(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    const extensoesImagem = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const urlLower = url.toLowerCase();
    return extensoesImagem.some(ext => urlLower.includes(ext));
  } catch {
    return false;
  }
}

async function buscarDadosUsuario(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) return null;
    
    const userData = docSnap.data();
    
    // Busca foto do usuário
    let userphoto = './src/icon/default.jpg';
    try {
      const photoRef = doc(db, "users", uid, "user-infos", "user-media");
      const photoSnap = await getDoc(photoRef);
      if (photoSnap.exists()) {
        userphoto = photoSnap.data().userphoto || './src/icon/default.jpg';
      }
    } catch {}

    return {
      userphoto,
      username: userData.username || '',
      displayname: userData.displayname || userData.username || 'Usuário'
    };
  } catch (error) {
    console.error("Erro ao buscar dados do usuário:", error);
    return null;
  }
}

function mostrarNotificacao(titulo, mensagem, tipo = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${tipo}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
      <div>
        <strong>${titulo}</strong>
        <p>${mensagem}</p>
      </div>
    </div>
  `;
  
  // Adiciona estilos da notificação se não existir
  if (!document.getElementById('notificationStyles')) {
    const notifStyles = `
      <style id="notificationStyles">
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 10001;
          min-width: 300px;
          animation: slideInRight 0.3s ease-out;
        }
        
        .notification.success { border-left: 4px solid #4caf50; }
        .notification.error { border-left: 4px solid #f44336; }
        .notification.warning { border-left: 4px solid #ff9800; }
        
        .notification-content {
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #333;
        }
        
        .notification i {
          font-size: 20px;
        }
        .notification.success i { color: #4caf50; }
        .notification.error i { color: #f44336; }
        .notification.warning i { color: #ff9800; }
        
        .notification strong {
          display: block;
          margin-bottom: 4px;
        }
        
        .notification p {
          margin: 0;
          font-size: 14px;
          opacity: 0.8;
        }
        
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `;
    document.head.insertAdjacentHTML('beforeend', notifStyles);
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideInRight 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ===================
// ABRIR MODAL
// ===================
async function abrirModal() {
  if (!currentUser) {
    mostrarNotificacao('Erro', 'Você precisa estar logado para criar posts', 'error');
    return;
  }

  criarModal();
  
  // Carrega dados do usuário
  const userData = await buscarDadosUsuario(currentUser.uid);
  if (userData) {
    document.getElementById('modalUserAvatar').src = userData.userphoto;
    document.getElementById('modalUserName').textContent = userData.displayname;
    document.getElementById('modalUsername').textContent = userData.username ? `@${userData.username}` : '';
  }
  
  configurarEventListenersModal();
  
  // Foca no textarea
  setTimeout(() => {
    document.getElementById('postTextarea').focus();
  }, 300);
}

// ===================
// FECHAR MODAL
// ===================
function fecharModal() {
  const modal = document.getElementById('postModal');
  if (modal) {
    modal.style.animation = 'modalFadeIn 0.2s ease-out reverse';
    setTimeout(() => modal.remove(), 200);
  }
}

// ===================
// CONFIGURAR EVENT LISTENERS DO MODAL
// ===================
function configurarEventListenersModal() {
  const modal = document.getElementById('postModal');
  const closeBtn = document.getElementById('closeModalBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const submitBtn = document.getElementById('submitPostBtn');
  const textarea = document.getElementById('postTextarea');
  const charCount = document.getElementById('charCount');
  const imageInput = document.getElementById('imageUrlInput');
  const imagePreview = document.getElementById('imagePreview');
  const removePreviewBtn = document.getElementById('removePreviewBtn');
  const hashtagBtns = document.querySelectorAll('.hashtag-btn');

  // Fechar modal
  closeBtn?.addEventListener('click', fecharModal);
  cancelBtn?.addEventListener('click', fecharModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) fecharModal();
  });

  // Esc para fechar
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.getElementById('postModal')) {
      fecharModal();
    }
  });

  // Contador de caracteres
  textarea?.addEventListener('input', () => {
    const count = textarea.value.length;
    charCount.textContent = count;
    
    if (count > 450) {
      charCount.className = 'character-count danger';
    } else if (count > 400) {
      charCount.className = 'character-count warning';
    } else {
      charCount.className = 'character-count';
    }
    
    submitBtn.disabled = count === 0 || count > 500;
  });

  // Preview de imagem
  imageInput?.addEventListener('input', async () => {
    const url = imageInput.value.trim();
    if (url && await validarUrlImagem(url)) {
      document.getElementById('previewImg').src = url;
      imagePreview.style.display = 'block';
    } else {
      imagePreview.style.display = 'none';
    }
  });

  // Remover preview
  removePreviewBtn?.addEventListener('click', () => {
    imageInput.value = '';
    imagePreview.style.display = 'none';
  });

  // Hashtags sugeridas
  hashtagBtns?.forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      const currentText = textarea.value;
      const hashtag = `#${tag}`;
      
      if (!currentText.includes(hashtag)) {
        textarea.value = currentText + (currentText ? ' ' : '') + hashtag + ' ';
        textarea.dispatchEvent(new Event('input'));
        textarea.focus();
      }
    });
  });

  // Enviar post
  submitBtn?.addEventListener('click', enviarPost);
  
  // Enter + Ctrl para enviar
  textarea?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      enviarPost();
    }
  });
}

// ===================
// ENVIAR POST
// ===================
async function enviarPost() {
  const textarea = document.getElementById('postTextarea');
  const imageInput = document.getElementById('imageUrlInput');
  const submitBtn = document.getElementById('submitPostBtn');
  
  const texto = textarea.value.trim();
  if (!texto) {
    mostrarNotificacao('Campo vazio', 'Digite algo para postar!', 'warning');
    return;
  }

  // Verificar links maliciosos
  const linkCheck = detectarLinksMaliciosos(texto);
  if (linkCheck.malicioso) {
    mostrarNotificacao('Link bloqueado', `O link "${linkCheck.url}" foi identificado como potencialmente malicioso.`, 'error');
    return;
  }

  // Validar imagem se fornecida
  let urlImagem = '';
  if (imageInput.value.trim()) {
    urlImagem = imageInput.value.trim();
    if (!(await validarUrlImagem(urlImagem))) {
      mostrarNotificacao('Imagem inválida', 'A URL da imagem não é válida.', 'warning');
      return;
    }
  }

  // Mostrar loading
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  submitBtn.innerHTML = '<i class="fas fa-spinner"></i> Enviando...';

  try {
    const postId = gerarIdUnico('post');
    const postData = {
      content: texto,
      img: urlImagem,
      likes: 0,
      saves: 0,
      postid: postId,
      creatorid: currentUser.uid,
      reports: 0,
      create: serverTimestamp()
    };

    // Salvar em users/{userid}/posts/{postid}
    const userPostRef = doc(db, 'users', currentUser.uid, 'posts', postId);
    await setDoc(userPostRef, postData);

    // Salvar em posts/{postid}
    const globalPostRef = doc(db, 'posts', postId);
    await setDoc(globalPostRef, postData);

    // Tocar som se existir
    try {
      const audio = new Audio('./src/audio/send.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}

    fecharModal();
    mostrarNotificacao('Sucesso!', 'Post enviado com sucesso!', 'success');
    
    // Recarregar feed se estivermos na página do feed
    if (typeof loadPosts === 'function') {
      const feed = document.getElementById('feed');
      if (feed) {
        feed.innerHTML = '';
        window.allPosts = [];
        window.currentPage = 0;
        window.hasMorePosts = true;
        await loadPosts();
      }
    }

  } catch (error) {
    console.error("Erro ao enviar post:", error);
    mostrarNotificacao('Erro', 'Erro ao enviar post, tente novamente.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Postar';
  }
}

// ===================
// CONFIGURAR BOTÃO CRIAR NA SIDEBAR
// ===================
function configurarBotaoCriar() {
  // Busca o link "Criar" na sidebar
  const criarLinks = document.querySelectorAll('a[href="feed.html"]');
  
  criarLinks.forEach(link => {
    // Verifica se é o botão criar (tem ícone de plus)
    const icon = link.querySelector('i');
    if (icon && (icon.classList.contains('fa-plus-square') || icon.classList.contains('fa-plus'))) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        abrirModal();
      });
    }
  });
}

// ===================
// INICIALIZAÇÃO
// ===================
function inicializarSistemaPost() {
  // Verificar autenticação
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      configurarBotaoCriar();
    }
  });
}

// ===================
// EXPORTAR FUNÇÕES GLOBAIS
// ===================
window.abrirModalPost = abrirModal;
window.fecharModalPost = fecharModal;

// Inicializar quando DOM estiver carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarSistemaPost);
} else {
  inicializarSistemaPost();
}