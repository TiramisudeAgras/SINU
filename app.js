// app.js

document.addEventListener('DOMContentLoaded', () => {

    // -- START: Firebase Configuration --
    // ACTION: Replace this with your project's Firebase configuration
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDydDrSWx8eS3MgLfdpzbWWxTrxBaUINvU",
  authDomain: "sinu-nova-urbano.firebaseapp.com",
  projectId: "sinu-nova-urbano",
  storageBucket: "sinu-nova-urbano.firebasestorage.app",
  messagingSenderId: "984651974634",
  appId: "1:984651974634:web:f1108efa92e11e90161493",
  measurementId: "G-LZ4R7S6EPG"
};

     // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    // -- END: Firebase Configuration --

    let currentUserRole = null;

    // --- DOM Element References ---
    const authSection = document.getElementById('auth-section');
    const authTitle = document.getElementById('auth-title');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginFormContainer = document.getElementById('login-form-container');
    const registrationArea = document.getElementById('registration-area');
    const logoutButton = document.getElementById('logout-button');
    const currentYearSpan = document.getElementById('current-year');

    const dashboardTitle = document.getElementById('dashboard-title');
    const sitesSection = document.getElementById('sites-section');
    const sitesListContainer = document.getElementById('sites-list');
    const addSiteFormContainer = document.getElementById('add-site-form-container');

    const inventorySection = document.getElementById('inventory-section');
    const selectedSiteNameSpan = document.getElementById('selected-site-name');
    const backToSitesButton = document.getElementById('back-to-sites-button');
    const inventoryListContainer = document.getElementById('inventory-list');
    const addItemFormContainer = document.getElementById('add-item-form-container');

    // History Modal Elements
    const historyModal = document.getElementById('history-modal');
    const historyModalTitle = document.getElementById('history-modal-title');
    const historyModalContent = document.getElementById('history-modal-content');
    const closeHistoryModalButton = document.getElementById('close-history-modal-button');


    // --- Initial Page Setup ---
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // --- UI State Functions ---
    function showAuthSection() {
        authSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
    }

    function showSitesView() {
        sitesSection.classList.remove('hidden');
        inventorySection.classList.add('hidden');
        if (selectedSiteNameSpan) selectedSiteNameSpan.textContent = '';
        if (inventoryListContainer) inventoryListContainer.innerHTML = '<p class="text-nova-gray p-4">Cargando inventario...</p>';
        if (addItemFormContainer) addItemFormContainer.innerHTML = '';
        renderAddSiteButton();
    }
    
    function showDashboardSection() {
        authSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        showSitesView();
    }

    // --- Authentication State Observer ---
    auth.onAuthStateChanged(async user => {
        if (user) {
            console.log("User signed in:", user.uid, user.email);
            currentUserRole = null; 

            try {
                const userDocRef = db.collection("users").doc(user.uid);
                const userDoc = await userDocRef.get();

                if (userDoc.exists && userDoc.data().isApproved) {
                    const userData = userDoc.data();
                    currentUserRole = (userData.roles && userData.roles.length > 0) ? userData.roles[0] : 'espectador';
                    console.log("User is approved. Role:", currentUserRole);
                    
                    const userNameDisplay = (userData.nombre && userData.apellidos) 
                                     ? `${userData.nombre} ${userData.apellidos}` 
                                     : user.email || 'Usuario';
                    if(dashboardTitle) dashboardTitle.textContent = `Panel de ${userNameDisplay} (${currentUserRole})`;
                    
                    showDashboardSection();
                    loadConstructionSites();
                } else {
                    console.log("User is NOT approved or profile doesn't exist yet.");
                    currentUserRole = null; 
                    showAuthSection(); 
                    if(authTitle) authTitle.textContent = "Cuenta Pendiente de Aprobación";
                    if(loginFormContainer) {
                        loginFormContainer.innerHTML = `
                            <p class="text-center text-nova-gray-dark mb-4">
                                Su cuenta (${user.email || 'Nueva cuenta'}) ha sido registrada pero está pendiente de aprobación por un administrador.
                                Por favor, intente iniciar sesión más tarde o contacte al administrador.
                            </p>
                            <button id="logout-pending-button" class="w-full mt-4 bg-nova-green hover:bg-nova-green-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-150">
                                Cerrar Sesión
                            </button>
                        `;
                        if(registrationArea) registrationArea.innerHTML = '';
                        
                        const logoutPendingButton = document.getElementById('logout-pending-button');
                        if(logoutPendingButton) {
                            logoutPendingButton.addEventListener('click', () => auth.signOut());
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching user approval status:", error);
                currentUserRole = null;
                showAuthSection();
                if(authTitle) authTitle.textContent = "Error de Cuenta";
                if(loginFormContainer) loginFormContainer.innerHTML = `<p class="text-red-500 text-center">Error al verificar el estado de su cuenta. Por favor, intente recargar la página o contacte soporte.</p> 
                    <button id="logout-error-button" class="w-full mt-4 bg-nova-green hover:bg-nova-green-dark text-white font-bold py-2 px-4 rounded">Cerrar Sesión</button>`;
                if(registrationArea) registrationArea.innerHTML = '';
                const logoutErrorButton = document.getElementById('logout-error-button');
                if(logoutErrorButton) logoutErrorButton.addEventListener('click', () => auth.signOut());
            }

        } else {
            currentUserRole = null;
            console.log("User signed out.");
            if(dashboardTitle) dashboardTitle.textContent = 'Panel Principal';
            if(authTitle) authTitle.textContent = 'Bienvenido';
            showAuthSection();
            if(sitesListContainer) sitesListContainer.innerHTML = '<p class="text-nova-gray">Cargando obras...</p>';
            if(addSiteFormContainer) addSiteFormContainer.innerHTML = '';
            renderLoginForm();
        }
    });

    // --- Logout Functionality ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().catch(error => {
                console.error('Sign out error', error);
                alert(`Error al cerrar sesión: ${getFirebaseAuthErrorMessage(error)}`);
            });
        });
    }

    // --- Render Login Form ---
    function renderLoginForm() {
        if (!loginFormContainer) return;
        if(authTitle) authTitle.textContent = 'Bienvenido';
        loginFormContainer.innerHTML = `
            <form id="login-form" class="space-y-6">
                <div>
                    <label for="login-email" class="block text-sm font-medium text-nova-gray-dark">Correo Electrónico</label>
                    <input type="email" id="login-email" name="email" required autocomplete="email"
                           class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                </div>
                <div>
                    <label for="login-password" class="block text-sm font-medium text-nova-gray-dark">Contraseña</label>
                    <input type="password" id="login-password" name="password" required autocomplete="current-password"
                           class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                </div>
                <div>
                    <button type="submit"
                            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nova-green hover:bg-nova-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nova-green-dark transition-colors duration-150">
                        Iniciar Sesión
                    </button>
                </div>
            </form>
            <p id="login-error" class="mt-2 text-center text-sm text-red-600"></p>
        `;

        if (registrationArea) {
            registrationArea.innerHTML = `
                <p class="text-sm text-nova-gray-dark">¿No tienes cuenta?
                    <a href="#" id="show-signup-link" class="font-medium text-nova-green hover:text-nova-green-dark">Regístrate aquí</a>
                </p>
            `;
            const showSignupLink = document.getElementById('show-signup-link');
            if(showSignupLink) {
                showSignupLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    renderSignupForm();
                });
            }
        }

        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = loginForm['login-email'].value;
                const password = loginForm['login-password'].value;
                const loginErrorEl = document.getElementById('login-error');
                if(loginErrorEl) loginErrorEl.textContent = '';
                try {
                    await auth.signInWithEmailAndPassword(email, password);
                } catch (error) {
                    console.error("Login error:", error);
                    if(loginErrorEl) loginErrorEl.textContent = getFirebaseAuthErrorMessage(error);
                }
            });
        }
    }

    // --- Render Signup Form ---
    function renderSignupForm() {
        if (!loginFormContainer) return;
        if(authTitle) authTitle.textContent = 'Crear Nueva Cuenta';
        loginFormContainer.innerHTML = `
            <form id="signup-form" class="space-y-3">
                <div>
                    <label for="signup-nombre" class="block text-sm font-medium text-nova-gray-dark">Nombre(s)</label>
                    <input type="text" id="signup-nombre" name="nombre" required autocomplete="given-name"
                           class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                    <p class="mt-1 text-xs text-nova-gray">Ej: Alonso</p>
                </div>
                <div>
                    <label for="signup-apellidos" class="block text-sm font-medium text-nova-gray-dark">Apellidos</label>
                    <input type="text" id="signup-apellidos" name="apellidos" required autocomplete="family-name"
                           class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                    <p class="mt-1 text-xs text-nova-gray">Ej: Quijano Saavedra</p>
                </div>
                <div>
                    <label for="signup-cedula" class="block text-sm font-medium text-nova-gray-dark">Número de Cédula</label>
                    <input type="text" id="signup-cedula" name="cedula" required 
                           class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                    <p class="mt-1 text-xs text-nova-gray">Ej: 1234567890</p>
                </div>
                <div>
                    <label for="signup-email" class="block text-sm font-medium text-nova-gray-dark">Correo Electrónico</label>
                    <input type="email" id="signup-email" name="email" required autocomplete="email"
                           class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                </div>
                <div>
                    <label for="signup-password" class="block text-sm font-medium text-nova-gray-dark">Contraseña</label>
                    <input type="password" id="signup-password" name="password" required autocomplete="new-password"
                           class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                </div>
                <div>
                    <label for="signup-confirm-password" class="block text-sm font-medium text-nova-gray-dark">Confirmar Contraseña</label>
                    <input type="password" id="signup-confirm-password" name="confirm-password" required autocomplete="new-password"
                           class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                </div>
                <div class="text-xs text-nova-gray-dark">
                    La contraseña debe tener al menos 12 caracteres e incluir al menos uno de los siguientes símbolos: & % # "
                </div>
                <div class="pt-2 flex items-start">
                    <div class="flex items-center h-5">
                        <input id="data-consent" name="dataConsent" type="checkbox" required
                               class="focus:ring-nova-green h-4 w-4 text-nova-green border-gray-300 rounded">
                    </div>
                    <div class="ml-3 text-sm">
                        <label for="data-consent" class="font-medium text-nova-gray-dark">
                            Acepto que mis datos sean tratados de acuerdo con la Ley de Protección de Datos de Colombia (Ley 1581 de 2012) y la Política de Tratamiento de Datos de Nova Urbano.
                        </label>
                    </div>
                </div>
                <div class="pt-2">
                    <button type="submit"
                            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nova-green hover:bg-nova-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nova-green-dark transition-colors duration-150">
                        Registrarse
                    </button>
                </div>
            </form>
            <p id="signup-error" class="mt-2 text-center text-sm text-red-600"></p>
        `;
        if (registrationArea) {
            registrationArea.innerHTML = `
                <p class="text-sm text-nova-gray-dark">¿Ya tienes cuenta?
                    <a href="#" id="show-login-link" class="font-medium text-nova-green hover:text-nova-green-dark">Inicia sesión aquí</a>
                </p>
            `;
             const showLoginLink = document.getElementById('show-login-link');
            if(showLoginLink) {
                showLoginLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    renderLoginForm();
                });
            }
        }
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', handleSignupSubmit);
        }
    }
    
    // --- Signup Form Submission Handler ---
    async function handleSignupSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const nombre = form['signup-nombre'].value.trim();
        const apellidos = form['signup-apellidos'].value.trim();
        const cedula = form['signup-cedula'].value.trim();
        const email = form['signup-email'].value;
        const password = form['signup-password'].value;
        const confirmPassword = form['signup-confirm-password'].value;
        const dataConsentChecked = form['data-consent'].checked;
        
        const signupErrorEl = document.getElementById('signup-error');
        if(signupErrorEl) signupErrorEl.textContent = '';

        if (!nombre || !apellidos || !cedula) {
            if(signupErrorEl) signupErrorEl.textContent = "Nombre, apellidos y cédula son obligatorios.";
            return;
        }
        if (password !== confirmPassword) {
            if(signupErrorEl) signupErrorEl.textContent = "Las contraseñas no coinciden.";
            return;
        }
        const passwordMinLength = 12;
        const requiredSymbols = /[&%#"]/;
        let passwordErrorMessage = "";
        if (password.length < passwordMinLength) {
            passwordErrorMessage += `La contraseña debe tener al menos ${passwordMinLength} caracteres. `;
        }
        if (!requiredSymbols.test(password)) {
            passwordErrorMessage += 'La contraseña debe incluir al menos uno de los siguientes símbolos: & % # "';
        }
        if (passwordErrorMessage) {
            if(signupErrorEl) signupErrorEl.textContent = passwordErrorMessage.trim();
            return;
        }
        if (!dataConsentChecked) {
            if(signupErrorEl) signupErrorEl.textContent = "Debe aceptar la política de tratamiento de datos para registrarse.";
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = "Registrando...";

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            console.log("Firebase Auth user created:", user.uid);

            await db.collection("users").doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                nombre: nombre,
                apellidos: apellidos,
                cedula: cedula,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isApproved: false, 
                roles: ['espectador'],
                dataConsentGiven: true 
            });
            console.log("User profile created in Firestore with consent, pending approval.");
            
        } catch (error) {
            console.error("Signup error:", error);
            if(signupErrorEl) signupErrorEl.textContent = getFirebaseAuthErrorMessage(error);
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }

    // --- Helper for Firebase Auth Error Messages ---
    function getFirebaseAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email': return 'El formato del correo electrónico no es válido.';
            case 'auth/user-disabled': return 'Este usuario ha sido deshabilitado.';
            case 'auth/user-not-found': return 'No se encontró cuenta con este correo electrónico.';
            case 'auth/wrong-password': return 'Contraseña incorrecta.';
            case 'auth/email-already-in-use': return 'Este correo electrónico ya está registrado.';
            case 'auth/weak-password': return 'La contraseña es considerada débil por Firebase.';
            case 'auth/requires-recent-login': return 'Esta operación requiere autenticación reciente. Vuelve a iniciar sesión.';
            case 'auth/too-many-requests': return 'Demasiados intentos. Intenta de nuevo más tarde.';
            default: return 'Ocurrió un error. (' + error.message + ')';
        }
    }

    // --- Construction Site Functions ---
    function renderAddSiteButton() {
        if (!addSiteFormContainer) return;
        if (currentUserRole === 'oficina') {
            addSiteFormContainer.innerHTML = `
                <button id="show-add-site-form-button" class="bg-nova-green hover:bg-nova-green-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-150">
                    + Añadir Nueva Obra
                </button>
            `;
            const showButton = document.getElementById('show-add-site-form-button');
            if (showButton) {
                showButton.addEventListener('click', () => {
                    renderAddSiteForm();
                });
            }
        } else {
            addSiteFormContainer.innerHTML = '';
        }
    }

    function renderAddSiteForm() {
        if (!addSiteFormContainer || currentUserRole !== 'oficina') {
             if (addSiteFormContainer) addSiteFormContainer.innerHTML = '';
            return;
        }
        addSiteFormContainer.innerHTML = `
            <form id="add-site-form" class="space-y-4 bg-nova-gray-light p-4 rounded-md shadow-inner mt-4">
                <h4 class="text-lg font-semibold text-nova-green-dark mb-3">Detalles de la Nueva Obra</h4>
                <div>
                    <label for="site-name" class="block text-sm font-medium text-nova-gray-dark">Nombre de la Obra</label>
                    <input type="text" id="site-name" name="siteName" required
                           class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                </div>
                <div>
                    <label for="site-address" class="block text-sm font-medium text-nova-gray-dark">Dirección (Opcional)</label>
                    <input type="text" id="site-address" name="siteAddress"
                           class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                </div>
                <div class="flex space-x-3">
                    <button type="submit"
                            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nova-green hover:bg-nova-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nova-green-dark transition-colors duration-150">
                        Guardar Obra
                    </button>
                    <button type="button" id="cancel-add-site"
                            class="w-full flex justify-center py-2 px-4 border border-nova-gray rounded-md shadow-sm text-sm font-medium text-nova-gray-dark bg-white hover:bg-nova-gray-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nova-gray transition-colors duration-150">
                        Cancelar
                    </button>
                </div>
                <p id="add-site-error" class="mt-2 text-center text-sm text-red-600"></p>
            </form>
        `;
        const addSiteForm = document.getElementById('add-site-form');
        const cancelAddSiteButton = document.getElementById('cancel-add-site');
        if (addSiteForm) addSiteForm.addEventListener('submit', handleAddSiteSubmit);
        if (cancelAddSiteButton) cancelAddSiteButton.addEventListener('click', renderAddSiteButton);
    }

    async function handleAddSiteSubmit(event) {
        event.preventDefault();
        if (currentUserRole !== 'oficina') return;

        const form = event.target;
        const siteName = form.elements['site-name'].value.trim();
        const siteAddress = form.elements['site-address'].value.trim();
        const errorElement = document.getElementById('add-site-error');
        if (errorElement) errorElement.textContent = '';

        if (!siteName) {
            if (errorElement) errorElement.textContent = 'El nombre de la obra es obligatorio.';
            return;
        }
        const user = auth.currentUser;
        if (!user) {
            if (errorElement) errorElement.textContent = 'Error de autenticación.'; return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';

        try {
            await db.collection("constructionSites").add({
                name: siteName,
                address: siteAddress,
                createdBy: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("Construction site added successfully!");
            renderAddSiteButton(); 
            loadConstructionSites();
        } catch (error) {
            console.error("Error adding construction site: ", error);
            if (errorElement) errorElement.textContent = `Error al añadir obra: ${error.message}`;
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }

    async function loadConstructionSites() {
        if (!sitesListContainer) return;
        sitesListContainer.innerHTML = '<p class="text-nova-gray p-4">Cargando obras...</p>';
        const user = auth.currentUser;
        if (!user) return;

        try {
            const sitesSnapshot = await db.collection("constructionSites")
                                          .orderBy("createdAt", "desc") // Keep this or change to itemName if preferred
                                          .get();
            if (sitesSnapshot.empty) {
                sitesListContainer.innerHTML = '<p class="text-nova-gray p-4">No hay obras registradas en el sistema.</p>';
                return;
            }
            let sitesHTML = '<ul class="space-y-3">';
            sitesSnapshot.forEach(doc => {
                const site = doc.data();
                const escapedSiteName = site.name.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
                const escapedSiteAddress = site.address ? site.address.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : '';
                sitesHTML += `
                    <li class="bg-nova-gray-light hover:bg-gray-200 p-4 rounded-lg shadow cursor-pointer transition-colors duration-150 flex justify-between items-center" data-site-id="${doc.id}" data-site-name="${escapedSiteName}">
                        <div>
                            <h4 class="text-lg text-nova-green-dark">${escapedSiteName}</h4>
                            ${escapedSiteAddress ? `<p class="text-sm text-nova-gray-dark">${escapedSiteAddress}</p>` : ''}
                        </div>
                        <span class="text-nova-green text-xl font-bold">&rarr;</span>
                    </li>
                `;
            });
            sitesHTML += '</ul>';
            sitesListContainer.innerHTML = sitesHTML;
            document.querySelectorAll('#sites-list li').forEach(item => {
                item.addEventListener('click', () => {
                    const siteId = item.dataset.siteId;
                    const siteName = item.dataset.siteName;
                    showInventoryForSite(siteId, siteName);
                });
            });
        } catch (error) {
            console.error("Error loading construction sites: ", error);
            sitesListContainer.innerHTML = `<p class="text-red-500 p-4">Error al cargar las obras: ${error.message}. Verifique los índices de Firestore si el error lo sugiere.</p>`;
        }
    }

    // --- Inventory UI Transition and Item Functions ---
    function showInventoryForSite(siteId, siteName) {
        console.log(`Attempting to show inventory for site: ${siteName} (ID: ${siteId})`);
        if (sitesSection) sitesSection.classList.add('hidden');
        if (inventorySection) inventorySection.classList.remove('hidden');
        if (selectedSiteNameSpan) selectedSiteNameSpan.textContent = siteName;

        loadInventoryItems(siteId, siteName); 
        renderAddInventoryItemButton(siteId, siteName);
    }

    if (backToSitesButton) {
        backToSitesButton.addEventListener('click', () => {
            showSitesView(); 
        });
    }

    async function loadInventoryItems(siteId, siteName) {
        if (!inventoryListContainer) {
            console.error("Inventory list container not found");
            return;
        }
        inventoryListContainer.innerHTML = `<p class="text-nova-gray p-4">Cargando inventario para ${siteName}...</p>`;
        const user = auth.currentUser;
        if (!user) {
            inventoryListContainer.innerHTML = '<p class="text-red-500 p-4">Error: Usuario no autenticado.</p>';
            return;
        }
        try {
            const inventorySnapshot = await db.collection("inventoryItems")
                                              .where("siteId", "==", siteId)
                                              .orderBy("itemName", "asc") // Order by item name
                                              .get();
            if (inventorySnapshot.empty) {
                inventoryListContainer.innerHTML = `<p class="text-nova-gray p-4">No hay ítems de inventario para esta obra (${siteName}).</p>`;
                return;
            }
            let itemsHTML = '<ul class="space-y-3">';
            inventorySnapshot.forEach(doc => {
                const item = doc.data();
                const itemId = doc.id;
                const escapedItemName = item.itemName ? item.itemName.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : 'Ítem sin nombre';
                const escapedUnit = item.unit ? item.unit.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : '';
                const escapedSerialModel = item.serialModel ? item.serialModel.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : 'N/A';
                const escapedCondition = item.condition ? item.condition.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : 'N/A';
                const escapedDescription = item.description ? item.description.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : '';
                
                itemsHTML += `
                    <li class="bg-white p-4 rounded-lg shadow border border-nova-gray-light transition-shadow hover:shadow-md" data-item-id="${itemId}">
                        <div class="flex justify-between items-start flex-wrap">
                            <div class="flex-grow pr-4 mb-2 sm:mb-0">
                                <h5 class="text-lg font-semibold text-nova-green-dark">${escapedItemName}</h5>
                                <p class="text-sm text-nova-gray-dark">Cantidad: <span class="font-medium text-black">${item.quantity !== undefined ? item.quantity : 'N/A'}</span> ${escapedUnit}</p>
                                <p class="text-sm text-nova-gray-dark">Serial/Modelo: <span class="font-medium text-black">${escapedSerialModel}</span></p>
                                <p class="text-sm text-nova-gray-dark">Estado: <span class="font-medium text-black">${escapedCondition}</span></p>
                                ${escapedDescription ? `<p class="mt-1 text-xs text-gray-500 w-full">Obs: ${escapedDescription}</p>` : ''}
                            </div>
                            <div class="flex space-x-2 mt-2 sm:mt-0 flex-shrink-0 flex-wrap gap-2 items-start">
                                ${currentUserRole === 'oficina' ? `
                                    <button class="edit-item-btn text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded" data-item-id="${itemId}" data-site-id="${siteId}" data-site-name="${siteName}">Editar</button>
                                    <button class="transfer-item-btn text-xs bg-yellow-500 hover:bg-yellow-600 text-black py-1 px-2 rounded" data-item-id="${itemId}" data-site-id="${siteId}" data-site-name="${siteName}">Transferir</button>
                                ` : ''}
                                <button class="view-history-btn text-xs bg-gray-400 hover:bg-gray-500 text-white py-1 px-2 rounded" data-item-id="${itemId}" data-item-name="${escapedItemName}">Historial</button>
                            </div>
                        </div>
                        <p class="text-xs text-gray-400 mt-2 w-full text-right">Añadido: ${item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                    </li>
                `;
            });
            itemsHTML += '</ul>';
            inventoryListContainer.innerHTML = itemsHTML;

            if (currentUserRole === 'oficina') {
                document.querySelectorAll('.edit-item-btn').forEach(button => {
                    button.addEventListener('click', (e) => { alert(`Editar ítem: ${e.target.dataset.itemId} (Funcionalidad pendiente)`); });
                });
                document.querySelectorAll('.transfer-item-btn').forEach(button => {
                    button.addEventListener('click', (e) => { alert(`Transferir ítem: ${e.target.dataset.itemId} (Funcionalidad pendiente)`); });
                });
            }
            document.querySelectorAll('.view-history-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const itemId = e.target.dataset.itemId;
                    const itemName = e.target.dataset.itemName;
                    showItemHistory(itemId, itemName);
                });
            });
        } catch (error) {
            console.error(`Error loading inventory items for site ${siteId}:`, error);
            inventoryListContainer.innerHTML = `<p class="text-red-500 p-4">Error al cargar el inventario: ${error.message}</p>`;
            if (error.message.includes("index")) {
                inventoryListContainer.innerHTML += `<p class="text-sm text-red-400 p-4">Es posible que necesite crear un índice compuesto en Firestore. Revise la consola de Firebase para ver el enlace de creación del índice si está disponible en el mensaje de error original.</p>`;
            }
        }
    }

    function renderAddInventoryItemButton(siteId, siteName) {
        if (!addItemFormContainer) return;
        if (currentUserRole === 'oficina') {
            addItemFormContainer.innerHTML = `
                <button id="show-add-item-form-btn" class="bg-nova-green hover:bg-nova-green-dark text-white font-bold py-2 px-4 rounded transition-colors duration-150">
                    + Añadir Ítem de Inventario
                </button>
            `;
            const showButton = document.getElementById('show-add-item-form-btn');
            if (showButton) {
                showButton.addEventListener('click', () => renderAddInventoryItemForm(siteId, siteName));
            }
        } else {
            addItemFormContainer.innerHTML = '';
        }
    }

    function renderAddInventoryItemForm(siteId, siteName) {
        if (!addItemFormContainer || currentUserRole !== 'oficina') {
            if(addItemFormContainer) addItemFormContainer.innerHTML = ''; return;
        }
        const escapedSiteName = siteName.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
        addItemFormContainer.innerHTML = `
            <form id="add-inventory-item-form" class="space-y-4 bg-nova-gray-light p-4 rounded-md shadow-inner mb-6">
                <h4 class="text-lg font-semibold text-nova-green-dark mb-3">Añadir Nuevo Ítem a: ${escapedSiteName}</h4>
                <div>
                    <label for="item-name" class="block text-sm font-medium text-nova-gray-dark">Equipo/Maquinaria (Nombre del Ítem)</label>
                    <input type="text" id="item-name" name="itemName" required
                           class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label for="item-quantity" class="block text-sm font-medium text-nova-gray-dark">Cantidad Actual (Inicial)</label>
                        <input type="number" id="item-quantity" name="itemQuantity" required min="0" step="any" 
                               class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                    </div>
                    <div>
                        <label for="item-unit" class="block text-sm font-medium text-nova-gray-dark">Unidad</label>
                        <input type="text" id="item-unit" name="itemUnit" required placeholder="Ej: bolsas, kg, mts, und."
                               class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                    </div>
                    <div>
                        <label for="item-serial-model" class="block text-sm font-medium text-nova-gray-dark">Serial/Modelo</label>
                        <input type="text" id="item-serial-model" name="itemSerialModel"
                               class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                    </div>
                </div>
                <div>
                    <label for="item-condition" class="block text-sm font-medium text-nova-gray-dark">Estado</label>
                    <input type="text" id="item-condition" name="itemCondition" placeholder="Ej: Buen Estado, Por Reparar"
                           class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                </div>
                <div>
                    <label for="item-description" class="block text-sm font-medium text-nova-gray-dark">Observaciones</label>
                    <textarea id="item-description" name="itemDescription" rows="2"
                              class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm"></textarea>
                </div>
                <div class="flex space-x-3 pt-2">
                    <button type="submit"
                            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nova-green hover:bg-nova-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nova-green-dark transition-colors duration-150">
                        Guardar Ítem
                    </button>
                    <button type="button" id="cancel-add-item"
                            class="w-full flex justify-center py-2 px-4 border border-nova-gray rounded-md shadow-sm text-sm font-medium text-nova-gray-dark bg-white hover:bg-nova-gray-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nova-gray transition-colors duration-150">
                        Cancelar
                    </button>
                </div>
                <p id="add-item-error" class="mt-2 text-center text-sm text-red-600"></p>
            </form>
        `;
        const addInventoryItemForm = document.getElementById('add-inventory-item-form');
        const cancelAddItemButton = document.getElementById('cancel-add-item');
        if (addInventoryItemForm) addInventoryItemForm.addEventListener('submit', (event) => handleAddInventoryItemSubmit(event, siteId, siteName));
        if (cancelAddItemButton) cancelAddItemButton.addEventListener('click', () => renderAddInventoryItemButton(siteId, siteName));
    }

    async function handleAddInventoryItemSubmit(event, siteId, siteName) {
        event.preventDefault();
        if (currentUserRole !== 'oficina') return;

        const form = event.target;
        const itemName = form.elements['item-name'].value.trim();
        const quantityStr = form.elements['item-quantity'].value;
        const unit = form.elements['item-unit'].value.trim();
        const serialModel = form.elements['item-serial-model'].value.trim();
        const condition = form.elements['item-condition'].value.trim();
        const description = form.elements['item-description'].value.trim();
        
        const errorElement = document.getElementById('add-item-error');
        if (errorElement) errorElement.textContent = '';

        if (!itemName || !quantityStr || !unit) {
            if (errorElement) errorElement.textContent = 'Equipo/Maquinaria, Cantidad y Unidad son obligatorios.'; return;
        }
        const quantity = parseFloat(quantityStr);
        if (isNaN(quantity) || quantity < 0) {
            if (errorElement) errorElement.textContent = 'La cantidad debe ser un número válido y no negativo.'; return;
        }
        const user = auth.currentUser;
        if (!user) {
            if (errorElement) errorElement.textContent = 'Error de autenticación. Por favor, inicie sesión de nuevo.'; return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando Ítem...';

        try {
            let performingUserName = "Usuario Desconocido";
            let performingUserApellidos = "";
            let performingUserCedula = "";
            const userProfileRef = db.collection("users").doc(user.uid);
            const userProfileSnap = await userProfileRef.get();
            if (userProfileSnap.exists) {
                const userProfileData = userProfileSnap.data();
                performingUserName = userProfileData.nombre || performingUserName;
                performingUserApellidos = userProfileData.apellidos || "";
                performingUserCedula = userProfileData.cedula || "";
            } else {
                console.warn(`User profile document not found for UID: ${user.uid}. History log will have limited user details.`);
            }

            const newItemRef = db.collection("inventoryItems").doc();
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            const newItemData = {
                siteId: siteId,
                itemName: itemName,
                quantity: quantity,
                initialQuantity: quantity,
                unit: unit,
                serialModel: serialModel,
                condition: condition,
                description: description,
                createdBy: user.uid,
                createdAt: timestamp,
                lastUpdatedAt: timestamp,
                status: "Disponible" 
            };
            await newItemRef.set(newItemData);
            await newItemRef.collection("history").add({
                timestamp: timestamp,
                userId: user.uid,
                userName: performingUserName,
                userApellidos: performingUserApellidos,
                userCedula: performingUserCedula,
                action: "CREADO",
                details: { 
                    createdWithQuantity: quantity, 
                    unit: unit,
                    serialModel: serialModel,
                    condition: condition,
                    notes: `Ítem "${itemName}" creado en el sistema en obra "${siteName}".`
                }
            });
            console.log("Inventory item and history log created successfully!", newItemRef.id);
            renderAddInventoryItemButton(siteId, siteName);
            loadInventoryItems(siteId, siteName);
        } catch (error) {
            console.error("Error adding inventory item: ", error);
            if (errorElement) errorElement.textContent = `Error al guardar el ítem: ${error.message}`;
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }

    // --- Item History Modal Functions ---
    if (closeHistoryModalButton && historyModal) {
    closeHistoryModalButton.addEventListener('click', () => {
        historyModal.classList.add('hidden');
    });
    // Optional: Close modal if clicked outside of the content
    historyModal.addEventListener('click', (event) => {
        if (event.target === historyModal) { // Check if the click is on the backdrop itself
            historyModal.classList.add('hidden');
        }
    });
    }

    // Helper function to format log details based on action type
    function formatLogDetails(log) {
        if (!log.details || typeof log.details !== 'object' || Object.keys(log.details).length === 0) {
            return '<p class="text-xs text-gray-500 mt-1">No hay detalles adicionales para esta entrada.</p>'; // UI Text
        }

        let detailsHTML = '<ul class="list-none pl-0 text-xs mt-1 text-gray-600 space-y-1">'; // Changed to list-none for custom styling

        switch (log.action) {
            case "CREADO":
                detailsHTML += `<li><span class="font-medium text-gray-700">Cantidad Inicial:</span> ${log.details.createdWithQuantity || 'N/A'} ${log.details.unit || ''}</li>`;
                if (log.details.serialModel) {
                    detailsHTML += `<li><span class="font-medium text-gray-700">Serial/Modelo:</span> ${log.details.serialModel}</li>`;
                }
                if (log.details.condition) {
                    detailsHTML += `<li><span class="font-medium text-gray-700">Estado Inicial:</span> ${log.details.condition}</li>`;
                }
                if (log.details.notes) {
                    detailsHTML += `<li><span class="font-medium text-gray-700">Notas:</span> ${log.details.notes}</li>`;
                }
                break;
            // Future cases for other actions:
            // case "CANTIDAD_AJUSTADA":
            //     detailsHTML += `<li><span class="font-medium text-gray-700">Cantidad Anterior:</span> ${log.details.oldQuantity || 'N/A'}</li>`;
            //     detailsHTML += `<li><span class="font-medium text-gray-700">Nueva Cantidad:</span> ${log.details.newQuantity || 'N/A'}</li>`;
            //     if (log.details.reason) {
            //         detailsHTML += `<li><span class="font-medium text-gray-700">Razón:</span> ${log.details.reason}</li>`;
            //     }
            //     break;
            // case "TRANSFERENCIA_SALIDA":
            //     detailsHTML += `<li><span class="font-medium text-gray-700">Cantidad Transferida:</span> ${log.details.quantityTransferred || 'N/A'}</li>`;
            //     detailsHTML += `<li><span class="font-medium text-gray-700">Hacia Obra ID:</span> ${log.details.toSiteId || 'N/A'} (${log.details.toSiteName || 'Nombre Desconocido'})</li>`;
            //     break;
            // case "TRANSFERENCIA_ENTRADA":
            //     detailsHTML += `<li><span class="font-medium text-gray-700">Cantidad Recibida:</span> ${log.details.quantityReceived || 'N/A'}</li>`;
            //     detailsHTML += `<li><span class="font-medium text-gray-700">Desde Obra ID:</span> ${log.details.fromSiteId || 'N/A'} (${log.details.fromSiteName || 'Nombre Desconocido'})</li>`;
            //     break;
            // case "ITEM_ACTUALIZADO":
            //     detailsHTML += `<li><span class="font-medium text-gray-700">Campos Modificados:</span> ${(log.details.changedFields || []).join(', ')}</li>`;
            //     // You might want to show oldValues and newValues if available
            //     break;
            default:
                // Generic fallback for unknown actions or if no specific formatting is defined
                for (const key in log.details) {
                    const prettyKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    detailsHTML += `<li><span class="font-medium text-gray-700">${prettyKey}:</span> ${log.details[key]}</li>`;
                }
                break;
        }
        detailsHTML += '</ul>';
        return detailsHTML;
    }

    async function showItemHistory(itemId, itemName) {
        if (!historyModal || !historyModalTitle || !historyModalContent) {
            console.error("History modal elements not found");
            return;
        }

        // Basic escaping for item name in modal title
        const escapedItemName = itemName ? itemName.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : 'Ítem Desconocido';
        historyModalTitle.textContent = `Historial para: ${escapedItemName}`;
        historyModalContent.innerHTML = '<p class="text-nova-gray p-4">Cargando historial...</p>'; // UI Text
        historyModal.classList.remove('hidden');

        try {
            const historySnapshot = await db.collection("inventoryItems").doc(itemId)
                                            .collection("history")
                                            .orderBy("timestamp", "desc") // Show newest history first
                                            .get();

            if (historySnapshot.empty) {
                historyModalContent.innerHTML = '<p class="text-nova-gray p-4">No hay historial registrado para este ítem.</p>'; // UI Text
                return;
            }

            let historyHTML = '<ul class="space-y-4 text-left">'; // Increased space-y for better separation
            historySnapshot.forEach(doc => {
                const log = doc.data();
                const logDate = log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'medium' }) : 'Fecha desconocida'; // More detailed date
                
                const userDetails = `Usuario: ${log.userName || 'N/A'} ${log.userApellidos || ''} (Cédula: ${log.userCedula || 'N/A'})`; // UI Text

                // Use the helper function to format details
                const formattedDetails = formatLogDetails(log);

                historyHTML += `
                    <li class="p-3 bg-nova-gray-light rounded-lg shadow-sm border border-gray-200">
                        <div class="flex justify-between items-center mb-1">
                            <p class="font-semibold text-nova-green-dark text-base">${log.action || 'Acción Desconocida'}</p> <p class="text-xs text-gray-500">${logDate}</p>
                        </div>
                        <p class="text-xs text-gray-600 mb-1">${userDetails}</p>
                        <div class="mt-1 border-t border-gray-300 pt-1">
                            ${formattedDetails}
                        </div>
                    </li>
                `;
            });
            historyHTML += '</ul>';
            historyModalContent.innerHTML = historyHTML;

        } catch (error) {
            console.error(`Error loading history for item ${itemId}:`, error);
            historyModalContent.innerHTML = `<p class="text-red-500 p-4">Error al cargar el historial: ${error.message}</p>`; // UI Text
        }
    }

}); // End DOMContentLoaded