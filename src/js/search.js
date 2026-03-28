
import { 
  getDatabase, 
  ref, 
  onValue, 
  set, 
  onDisconnect, 
  serverTimestamp,
  off
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import { initSearchWithButton, saveToCache } from './search-utils.js';

// ===================
// 🔍 INICIALIZAR BUSCA COM CACHE
// ===================
const searchInput = document.getElementById('searchInput');
const resultsList = document.getElementById('searchResults');
const searchButton = document.querySelector('.search-box button');

if (searchInput && resultsList && searchButton) {
  const performSearch = initSearchWithButton(searchInput, resultsList, searchButton);

  // Adicionar usuário visitado ao cache quando clicado
  document.addEventListener('click', (e) => {
    const resultItem = e.target.closest('.search-result-item');
    if (resultItem && resultsList.contains(resultItem)) {
      const username = resultItem.querySelector('.search-user-username')?.textContent.replace('@', '') || '';
      const displayname = resultItem.querySelector('.search-user-name')?.textContent || '';
      const img = resultItem.querySelector('.search-user-thumb');
      const photoURL = img?.src || '';
      
      // Extrair UID da URL quando redirecionar
      const paramMatch = resultItem.href?.match(/userid=([^&]+)/);
      if (paramMatch) {
        saveToCache({
          uid: paramMatch[1],
          username,
          displayname,
          photoURL
        });
      }
    }
  });
}