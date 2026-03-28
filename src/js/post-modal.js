import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Configuração do Firebase
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

// API Key do ImgBB
const IMGBB_API_KEY = 'fc8497dcdf559dc9cbff97378c82344c';

// ============================================
// FUNÇÕES AUXILIARES DE IMAGEM
// ============================================
async function comprimirImagem(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, {
              type: 'image/jpeg/gif/png',
              lastModified: Date.now()
            }));
          },
          'image/jpeg/png/gif',
          quality
        );
      };
      
      img.onerror = reject;
    };
    
    reader.onerror = reject;
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// ============================================
// UPLOAD DE ARQUIVO PARA IMGBB (IMAGENS)
// ============================================
async function uploadToImgBB(file, userId) {
  try {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      throw new Error('Arquivo inválido. Apenas imagens e vídeos são permitidos.');
    }

    // Para vídeos, apenas fazer upload direto
    if (isVideo) {
      const maxSize = 50 * 1024 * 1024; // 50MB para vídeos
      if (file.size > maxSize) {
        throw new Error('Vídeo muito grande. Máximo 50MB permitido.');
      }
      const formData = new FormData();
      formData.append('image', file);
      
      console.log('Enviando vídeo para ImgBB...', file.name, file.size);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Erro na requisição ao ImgBB');
      }

      const data = await response.json();
      if (data.success) {
        console.log('Upload de vídeo bem-sucedido:', data.data.url);
        return data.data.url;
      } else {
        throw new Error('Erro ao fazer upload do vídeo');
      }
    }

    // Para imagens
    const maxSize = 50 * 1024 * 1024;
    let fileToUpload = file;
    
    if (file.size > maxSize) {
      console.log('Comprimindo imagem...');
      fileToUpload = await comprimirImagem(file, 1920, 0.7);
    }

    const formData = new FormData();
    formData.append('image', fileToUpload);

    console.log('Enviando imagem para ImgBB...', fileToUpload.name, fileToUpload.size);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });

    console.log('Resposta ImgBB status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na resposta:', errorText);
      throw new Error('Erro na requisição ao ImgBB');
    }

    const data = await response.json();
    
    console.log('Resposta ImgBB:', data);

    if (data.success) {
      console.log('Upload bem-sucedido:', data.data.url);
      return data.data.url;
    } else {
      throw new Error(data.error?.message || 'Erro ao fazer upload');
    }
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    throw error;
  }
}

// Abrir/fechar modal de post
window.abrirPostModal = function() {
  const modal = document.getElementById('postModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
};
window.fecharPostModal = function() {
  const modal = document.getElementById('postModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('postModalText').value = '';
    const fileInput = document.getElementById('postModalImg');
    if (fileInput) fileInput.value = '';
    const preview = document.getElementById('postModalImgPreview');
    if (preview) {
      preview.style.display = 'none';
      preview.src = '';
    }
    const videoPreview = document.getElementById('postModalVideoPreview');
    if (videoPreview) {
      videoPreview.style.display = 'none';
      videoPreview.src = '';
    }
    const placeholder = document.getElementById('postImagePlaceholder');
    if (placeholder) placeholder.style.display = 'flex';
    const removeBtn = document.getElementById('postModalRemoveImg');
    if (removeBtn) removeBtn.style.display = 'none';
  }
};

// Botão "Criar" abre o modal
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.postmodal').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      window.abrirPostModal();
    });
  });

  // File input para imagem
  const fileInput = document.getElementById('postModalImg');
  const preview = document.getElementById('postModalImgPreview');
  const removeBtn = document.getElementById('postModalRemoveImg');
  const placeholder = document.getElementById('postImagePlaceholder');
  const imageContainer = document.getElementById('postImageContainer');

  // Fazer o container clicável abrir o file input
  if (imageContainer && fileInput) {
    imageContainer.addEventListener('click', function() {
      fileInput.click();
    });
  }

  // File input change listener
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      if (this.files && this.files[0]) {
        const file = this.files[0];
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (!isImage && !isVideo) {
          alert('Por favor, selecione uma imagem ou vídeo válido.');
          return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
          if (isImage) {
            if (preview) {
              preview.src = event.target.result;
              preview.style.display = 'block';
            }
            const videoPreview = document.getElementById('postModalVideoPreview');
            if (videoPreview) {
              videoPreview.style.display = 'none';
            }
          } else if (isVideo) {
            const videoPreview = document.getElementById('postModalVideoPreview');
            if (videoPreview) {
              videoPreview.src = event.target.result;
              videoPreview.style.display = 'block';
            }
            if (preview) {
              preview.style.display = 'none';
            }
          }
          
          if (placeholder) {
            placeholder.style.display = 'none';
          }
          if (removeBtn) {
            removeBtn.style.display = 'block';
          }
          // Adicionar hover effect ao container
          if (imageContainer) {
            imageContainer.style.borderColor = '#4A90E2';
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Botão "Remover Imagem"
  if (removeBtn) {
    removeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (fileInput) fileInput.value = '';
      if (preview) {
        preview.style.display = 'none';
        preview.src = '';
      }
      const videoPreview = document.getElementById('postModalVideoPreview');
      if (videoPreview) {
        videoPreview.style.display = 'none';
        videoPreview.src = '';
      }
      if (placeholder) placeholder.style.display = 'flex';
      if (removeBtn) removeBtn.style.display = 'none';
      if (imageContainer) {
        imageContainer.style.borderColor = '#444';
      }
    });
  }
});

// Busca dados extras do usuário logado
async function getUserDataForPost(uid) {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
  } catch (e) {}
  return {};
}

// Enviar post
window.enviarPostModal = async function() {
  const texto = document.getElementById('postModalText').value.trim();
  const fileInput = document.getElementById('postModalImg');
  let usuarioLogado = auth.currentUser;

  if (!usuarioLogado || !usuarioLogado.uid) {
    alert('Você precisa estar logado para postar. Tente atualizar a página.');
    return;
  }
  if (!texto) {
    alert('Digite algo para postar!');
    return;
  }

  try {
    const btnPublicar = document.querySelector('#postModal [onclick="window.enviarPostModal()"]');
    if (btnPublicar) {
      btnPublicar.disabled = true;
      btnPublicar.textContent = 'Publicando...';
    }

    let imgUrl = '';
    
    // Se houver arquivo de imagem selecionado, fazer upload
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      imgUrl = await uploadToImgBB(file, usuarioLogado.uid);
    }

    const userData = await getUserDataForPost(usuarioLogado.uid);

    const postId = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const postData = {
      content: texto,
      img: imgUrl || '',
      likes: 0,
      saves: 0,
      postid: postId,
      creatorid: usuarioLogado.uid,
      creatorUsername: userData.username || "",
      creatorName: userData.displayname || "",
      creatorPhoto: userData.userphoto || usuarioLogado.photoURL || "",
      reports: 0,
      create: new Date()
    };

    await setDoc(doc(db, 'users', usuarioLogado.uid, 'posts', postId), postData);
    await setDoc(doc(db, 'posts', postId), postData);

    window.fecharPostModal();
    alert('Post enviado com sucesso!');
    if (typeof window.loadPosts === 'function') window.loadPosts();
  } catch (error) {
    console.error('Erro ao publicar post:', error);
    alert('Erro ao publicar o post. Tente novamente.');
  } finally {
    const btnPublicar = document.querySelector('#postModal [onclick="window.enviarPostModal()"]');
    if (btnPublicar) {
      btnPublicar.disabled = false;
      btnPublicar.textContent = 'Publicar';
    }
  }
};




