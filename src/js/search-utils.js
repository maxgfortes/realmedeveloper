// =====================================================
// 🔍 SEARCH UTILS OTIMIZADO COM CACHE
// =====================================================
// Módulo reutilizável para busca de usuários com cache de histórico

import { 
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

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

const CACHE_KEY = 'searched_users_cache';
const MAX_CACHED = 10;

/**
 * 📦 Gerenciamento do Cache
 */
export function getSearchCache() {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn('⚠️ Erro ao ler cache:', e);
    return [];
  }
}

export function saveToCache(user) {
  try {
    let cached = getSearchCache();
    
    // Remove duplicatas
    cached = cached.filter(u => u.uid !== user.uid);
    
    // Adiciona no início (mais recente)
    cached.unshift({
      uid: user.uid,
      username: user.username,
      displayname: user.displayname,
      photoURL: user.photoURL || '',
      timestamp: Date.now()
    });
    
    // Mantém apenas últimos 10
    cached = cached.slice(0, MAX_CACHED);
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch (e) {
    console.warn('⚠️ Erro ao salvar cache:', e);
  }
}

export function clearSearchCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.warn('⚠️ Erro ao limpar cache:', e);
  }
}

/**
 * 🔍 Busca Rápida no Firebase (com WHERE)
 */
export async function searchUsers(searchTerm, maxResults = 20) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return [];
  }

  try {
    const term = searchTerm.toLowerCase().trim();
    const usersRef = collection(db, 'users');
    const endChar = String.fromCharCode(term.charCodeAt(term.length - 1) + 1);
    
    // 🔍 Query 1: Busca por USERNAME
    const q1 = query(
      usersRef,
      where('username', '>=', term),
      where('username', '<', term + '\uf8ff'),
      limit(maxResults)
    );

    // 🔍 Query 2: Busca por DISPLAYNAME
    const q2 = query(
      usersRef,
      where('displayname', '>=', term),
      where('displayname', '<', term + '\uf8ff'),
      limit(maxResults)
    );

    // ⚡ Executar ambas em paralelo
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const resultsMap = new Map(); // Para evitar duplicatas
    const results = [];

    // Adicionar resultados da busca por username
    snap1.forEach(doc => {
      const user = { uid: doc.id, ...doc.data() };
      resultsMap.set(user.uid, user);
    });

    // Adicionar resultados da busca por displayname
    snap2.forEach(doc => {
      const user = { uid: doc.id, ...doc.data() };
      if (!resultsMap.has(user.uid)) {
        resultsMap.set(user.uid, user);
      }
    });

    // Converter Map para Array e limitar
    results.push(...Array.from(resultsMap.values()));
    return results.slice(0, maxResults);
    
  } catch (error) {
    console.error('❌ Erro na busca:', error);
    throw error;
  }
}

/**
 * 📝 Render HTML para Resultados
 */
export function createResultElement(user, isRecent = false) {
  const displayName = user.displayname || user.username || 'Usuário';
  const badge = isRecent ? '<span class="search-recent">🕐 Recente</span>' : '';
  
  const li = document.createElement('li');
  li.className = 'search-result-item';
  li.innerHTML = `
    <img src="${user.photoURL || './src/icon/default.jpg'}" 
         alt="${displayName}" 
         class="search-user-thumb"
         onerror="this.src='./src/icon/default.jpg'">
    <div class="search-user-info">
      <span class="search-user-name">${displayName}</span>
      <span class="search-user-username">@${user.username}</span>
    </div>
    ${badge}
  `;
  
  return li;
}

export function createLoadingElement() {
  const li = document.createElement('li');
  li.className = 'search-loading';
  li.innerHTML = '<div class="spinner"></div><span>Buscando...</span>';
  return li;
}

export function createEmptyElement(isRecent = false) {
  const li = document.createElement('li');
  li.className = 'search-empty';
  const msg = isRecent ? 'Histórico vazio' : 'Nenhum usuário encontrado';
  li.innerHTML = msg;
  return li;
}

export function createErrorElement() {
  const li = document.createElement('li');
  li.className = 'search-error';
  li.innerHTML = '⚠️ Erro ao buscar';
  return li;
}

/**
 * 🎨 Renderizar Lista de Resultados
 */
export function renderResults(resultsList, results, isRecent = false) {
  resultsList.innerHTML = '';

  if (results.length === 0) {
    resultsList.appendChild(createEmptyElement(isRecent));
    resultsList.classList.add('visible');
    return;
  }

  results.forEach(user => {
    const element = createResultElement(user, isRecent);
    resultsList.appendChild(element);
  });

  resultsList.classList.add('visible');
}

/**
 * 🔄 Fluxo Completo de Busca (Search Input)
 */
export function initSearchInput(searchInputElement, resultsList) {
  if (!searchInputElement || !resultsList) {
    console.warn('⚠️ Elementos de busca não encontrados');
    return;
  }

  const performSearch = async () => {
    const term = searchInputElement.value.trim().toLowerCase();

    // Se vazio, mostra histórico
    if (!term) {
      const cached = getSearchCache();
      renderResults(resultsList, cached, true);
      return;
    }

    // Mostra loading
    resultsList.innerHTML = '';
    resultsList.appendChild(createLoadingElement());
    resultsList.classList.add('visible');

    try {
      const results = await searchUsers(term);
      renderResults(resultsList, results, false);
    } catch (err) {
      resultsList.innerHTML = '';
      resultsList.appendChild(createErrorElement());
      resultsList.classList.add('visible');
    }
  };

  // Event listeners
  searchInputElement.addEventListener('input', performSearch);
  searchInputElement.addEventListener('focus', performSearch);

  // Fechar ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-area')) {
      resultsList.classList.remove('visible');
    }
  });

  return performSearch;
}

/**
 * 📱 Fluxo Completo com Botão
 */
export function initSearchWithButton(searchInputElement, resultsList, searchButton) {
  const performSearch = initSearchInput(searchInputElement, resultsList);

  if (searchButton) {
    searchButton.addEventListener('click', (e) => {
      e.preventDefault();
      performSearch();
    });
  }

  return performSearch;
}
