import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    orderBy,
    startAt,
    endAt,
    getDocs,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

// ===================
// AUTENTICAÇÃO E CARREGAMENTO DE DADOS
// ===================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        try {
            // Referências aos documentos do usuário
            const userRef = doc(db, "users", currentUser.uid);
            const userMediaRef = doc(db, "users", currentUser.uid, "user-infos", "user-media");
            const aboutRef = doc(db, "users", currentUser.uid, "user-infos", "about");
            const likesRef = doc(db, "users", currentUser.uid, "user-infos", "likes");

            // Busca otimizada de todos os documentos
            const [userDocSnap, userMediaDocSnap, aboutDocSnap, likesDocSnap] = await Promise.all([
                getDoc(userRef),
                getDoc(userMediaRef),
                getDoc(aboutRef),
                getDoc(likesRef)
            ]);

            let allUserData = userDocSnap.exists() ? userDocSnap.data() : {};
            if (userMediaDocSnap.exists()) allUserData = { ...allUserData, ...userMediaDocSnap.data() };
            if (aboutDocSnap.exists()) allUserData = { ...allUserData, ...aboutDocSnap.data() };
            if (likesDocSnap.exists()) allUserData = { ...allUserData, ...likesDocSnap.data() };

            preencherDadosIniciais(allUserData);
            preencherFormulario(allUserData);
            inicializarFuncionalidades();
        } catch (error) {
            alert("Erro ao carregar seus dados. Tente recarregar a página.");
        }
    } else {
        window.location.href = 'login.html';
    }
});

// ===================
// PREENCHER DADOS DO CABEÇALHO E FORMULÁRIO
// ===================
function preencherDadosIniciais(userData) {
    const nomeCompleto = document.getElementById("nomeCompleto");
    if (nomeCompleto) {
        nomeCompleto.textContent = `${userData.name || ''} ${userData.surname || ''}`.trim();
    }

    const usernameElement = document.getElementById("username");
    if (usernameElement) {
        usernameElement.textContent = `@${userData.username || '...'}`;
    }

    const urlPerfil = `PF.html?user=${encodeURIComponent(userData.username)}`;
    const linkSidebar = document.getElementById('linkPerfilSidebar');
    const linkMobile = document.getElementById('linkPerfilMobile');
    if (linkSidebar) linkSidebar.href = urlPerfil;
    if (linkMobile) linkMobile.href = urlPerfil;
}

function preencherFormulario(userData) {
    const form = document.querySelector('form');
    if (!form) return;

    const fillField = (selector, dataKey) => {
        const element = form.querySelector(selector);
        if (element && userData[dataKey] !== undefined) {
            element.value = userData[dataKey];
        }
    };

    // Dados principais
    fillField('input[name="username"]', 'username');
    fillField('input[name="displayname"]', 'displayname');
    fillField('input[name="email"]', 'email');
    fillField('input[name="gender"]', 'gender');
    fillField('input[name="localizacao"]', 'localizacao');
    fillField('input[name="location"]', 'location');
    fillField('input[name="maritalStatus"]', 'maritalStatus');
    fillField('input[name="name"]', 'name');
    fillField('input[name="pronoun1"]', 'pronoun1');
    fillField('input[name="pronoun2"]', 'pronoun2');
    fillField('input[name="status"]', 'status');
    fillField('input[name="surname"]', 'surname');
    fillField('input[name="tel"]', 'tel');
    fillField('input[name="telefone"]', 'telefone');

    // Mídia
    fillField('input[name="background"]', 'background');
    fillField('input[name="headerphoto"]', 'headerphoto');
    fillField('input[name="music"]', 'music');
    fillField('input[name="userphoto"]', 'userphoto');

    // Likes
    fillField('textarea[name="books"]', 'books');
    fillField('textarea[name="characters"]', 'characters');
    fillField('textarea[name="foods"]', 'foods');
    fillField('textarea[name="games"]', 'games');
    fillField('textarea[name="hobbies"]', 'hobbies');
    fillField('textarea[name="movies-series"]', 'movies-series');
    fillField('textarea[name="musicLikes"]', 'music');
    fillField('textarea[name="others"]', 'others');

    // Sobre
    fillField('textarea[name="dreams"]', 'dreams');
    fillField('textarea[name="fears"]', 'fears');
    fillField('textarea[name="overview"]', 'overview');
    fillField('textarea[name="personality"]', 'personality');
    fillField('textarea[name="styles"]', 'styles');
    fillField('input[name="tags"]', 'tags');
}

// ===================
// SALVAR PERFIL NO FIRESTORE
// ===================
async function salvarConfigPerfil(userId, formData) {
    // Dados principais
    const dadosPrincipais = {
        born: Timestamp.fromDate(new Date('2009-10-05T00:00:00-03:00')),
        displayname: formData.get('displayname'),
        email: formData.get('email'),
        gender: formData.get('gender'),
        localizacao: formData.get('localizacao'),
        location: formData.get('location'),
        maritalStatus: formData.get('maritalStatus'),
        name: formData.get('name'),
        pronoun1: formData.get('pronoun1'),
        pronoun2: formData.get('pronoun2'),
        status: formData.get('status'),
        surname: formData.get('surname'),
        tel: Number(formData.get('tel')),
        telefone: formData.get('telefone'),
        ultimaAtualizacao: Timestamp.now(),
        username: formData.get('username')
    };

    // Mídia
    const dadosMedia = {
        background: formData.get('background'),
        headerphoto: formData.get('headerphoto'),
        music: formData.get('music'),
        userphoto: formData.get('userphoto')
    };

    // Likes
    const dadosLikes = {
        books: formData.get('books'),
        characters: formData.get('characters'),
        foods: formData.get('foods'),
        games: formData.get('games'),
        hobbies: formData.get('hobbies'),
        "movies-series": formData.get('movies-series'),
        music: formData.get('musicLikes'),
        others: formData.get('others')
    };

    // Sobre
    const dadosAbout = {
        dreams: formData.get('dreams'),
        fears: formData.get('fears'),
        overview: formData.get('overview'),
        personality: formData.get('personality'),
        styles: formData.get('styles'),
        tags: formData.get('tags')
    };

    await setDoc(doc(db, "users", userId), dadosPrincipais, { merge: true });
    await setDoc(doc(db, "users", userId, "user-infos", "user-media"), dadosMedia, { merge: true });
    await setDoc(doc(db, "users", userId, "user-infos", "likes"), dadosLikes, { merge: true });
    await setDoc(doc(db, "users", userId, "user-infos", "about"), dadosAbout, { merge: true });
}

// ===================
// SUBMIT DO FORMULÁRIO
// ===================
function setupFormSubmit() {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return alert("Usuário não autenticado!");

        const submitBtn = document.querySelector('.submit-btn');
        const originalText = submitBtn ? submitBtn.textContent : 'Salvar Configurações';
        if (submitBtn) {
            submitBtn.textContent = 'Salvando...';
            submitBtn.disabled = true;
        }

        try {
            // Não faz upload, apenas salva os valores dos campos como texto/URL
            const formData = new FormData(form);
            await salvarConfigPerfil(currentUser.uid, formData);
            alert('Configurações salvas com sucesso!');
        } catch (error) {
            alert('Erro ao salvar as configurações: ' + error.message);
        } finally {
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }
    });
}

// ===================
// FUNCIONALIDADES GERAIS
// ===================
function inicializarFuncionalidades() {
    setupTabs();
    setupCharCounters();
    setupSearch();
    setupFormSubmit();
    setupMenuLinks();
    setupFloatingMenu();
    setupLogout();
}

function setupTabs() {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            const tabContent = document.getElementById(button.dataset.tab);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });
}

function setupCharCounters() {
    document.querySelectorAll('textarea[maxlength], input[maxlength]').forEach(element => {
        const counter = element.parentNode.querySelector('.char-counter');
        if (counter) {
            const maxLength = parseInt(element.getAttribute('maxlength'));
            const updateCounter = () => {
                const currentLength = element.value.length;
                counter.textContent = `${currentLength}/${maxLength}`;
                counter.classList.toggle('danger', currentLength > maxLength * 0.9);
                counter.classList.toggle('warning', currentLength > maxLength * 0.75 && currentLength <= maxLength * 0.9);
            };
            element.addEventListener('input', updateCounter);
            updateCounter();
        }
    });
}

function atualizarContadores() {
    document.querySelectorAll('textarea[maxlength], input[maxlength]').forEach(element => {
        const counter = element.parentNode.querySelector('.char-counter');
        if (counter) {
            const maxLength = parseInt(element.getAttribute('maxlength'));
            const currentLength = element.value.length;
            counter.textContent = `${currentLength}/${maxLength}`;
            counter.classList.toggle('danger', currentLength > maxLength * 0.9);
            counter.classList.toggle('warning', currentLength > maxLength * 0.75 && currentLength <= maxLength * 0.9);
        }
    });
}

function setupSearch() {
    const searchInput = document.getElementById("searchInput");
    const resultsList = document.getElementById("searchResults");
    const searchButton = document.querySelector(".search-box button");

    if (!searchInput || !resultsList || !searchButton) return;

    const performSearch = async () => {
        const term = searchInput.value.trim().toLowerCase();
        resultsList.innerHTML = "";
        resultsList.classList.remove("visible");
        if (!term) return;

        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("username"), startAt(term), endAt(term + "\uf8ff"));

        try {
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                resultsList.innerHTML = "<li>Nenhum usuário encontrado</li>";
                resultsList.classList.add("visible");
                return;
            }

            snapshot.forEach((docSnap) => {
                const user = docSnap.data();
                const li = document.createElement("li");
                li.textContent = user.username;
                li.addEventListener("click", () => {
                    window.location.href = `PF.html?username=${user.username}`;
                });
                resultsList.appendChild(li);
            });
            resultsList.classList.add("visible");
        } catch (err) {
            resultsList.innerHTML = "<li>Erro na busca</li>";
            resultsList.classList.add("visible");
        }
    };

    searchButton.addEventListener("click", (e) => {
        e.preventDefault();
        performSearch();
    });

    searchInput.addEventListener("input", performSearch);

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-area")) {
            resultsList.classList.remove("visible");
        }
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById('btnSair');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Tem certeza que deseja sair?')) {
                try {
                    await signOut(auth);
                    window.location.href = 'login.html';
                } catch (error) {
                    alert("Erro ao tentar sair. Tente novamente.");
                }
            }
        });
    }
}

function setupMenuLinks() {
    const menuItems = document.querySelectorAll('.menu-item');
    const tabs = document.querySelectorAll('.tab');
    if (menuItems.length > 0 && tabs.length > 0) {
        menuItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                tabs.forEach(tab => tab.classList.remove('active'));
                if (tabs[index]) tabs[index].classList.add('active');
                menuItems.forEach(btn => btn.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }
}

function setupFloatingMenu() {
    const moreMenu = document.getElementById('moreMenu');
    const moreToggle = document.getElementById('moreToggle');
    const floatingMenu = document.getElementById('floatingMenu');
    const overlay = document.getElementById('overlay');

    if (!moreToggle || !moreMenu || !overlay) return;

    const closeFloatingMenu = () => {
        moreMenu.classList.remove('active');
        overlay.classList.remove('active');
    };

    const openFloatingMenu = () => {
        moreMenu.classList.add('active');
        overlay.classList.add('active');
    };

    moreToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        moreMenu.classList.contains('active') ? closeFloatingMenu() : openFloatingMenu();
    });

    overlay.addEventListener('click', closeFloatingMenu);

    if (floatingMenu) {
        floatingMenu.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                closeFloatingMenu();
            }
        });
        floatingMenu.addEventListener('click', (e) => e.stopPropagation());
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && moreMenu.classList.contains('active')) {
            closeFloatingMenu();
        }
    });
}