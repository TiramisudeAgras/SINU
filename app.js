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
    let showZeroQuantityItems = false; // For the toggle state

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

    // Edit Item Modal Elements
    const editItemModal = document.getElementById('edit-item-modal');
    const editItemForm = document.getElementById('edit-item-form');
    const editItemModalTitle = document.getElementById('edit-item-modal-title');
    const cancelEditItemButton = document.getElementById('cancel-edit-item-button');
    const editItemIdInput = document.getElementById('edit-item-id');
    const editItemSiteIdInput = document.getElementById('edit-item-site-id');
    const editItemSiteNameInput = document.getElementById('edit-item-site-name');

    // app.js - Add these to your DOM Element References section
    const adjustQuantityModal = document.getElementById('adjust-quantity-modal');
    const adjustQuantityForm = document.getElementById('adjust-quantity-form');
    const adjustQuantityModalTitle = document.getElementById('adjust-quantity-modal-title'); // Though we might set item name elsewhere
    const adjustQuantityItemNameDisplay = document.getElementById('adjust-quantity-item-name');
    const cancelAdjustQuantityButton = document.getElementById('cancel-adjust-quantity-button');
    const adjustItemIdInput = document.getElementById('adjust-item-id');
    const adjustItemSiteIdInput = document.getElementById('adjust-item-site-id');
    const adjustItemSiteNameInput = document.getElementById('adjust-item-site-name');
    const adjustItemCurrentQuantityInput = document.getElementById('adjust-item-current-quantity'); // Hidden input to store numeric current quantity
    const currentItemQuantityDisplay = document.getElementById('current-item-quantity-display'); // Readonly display field

    // app.js - Add these to your DOM Element References section
    const transferItemModal = document.getElementById('transfer-item-modal');
    const transferItemForm = document.getElementById('transfer-item-form');
    const transferItemModalTitle = document.getElementById('transfer-item-modal-title'); // Though title is static
    const transferItemNameDisplay = document.getElementById('transfer-item-name-display');
    const transferItemSiteOriginDisplay = document.getElementById('transfer-item-site-origin-display');
    const cancelTransferItemButton = document.getElementById('cancel-transfer-item-button');
    const transferItemIdInput = document.getElementById('transfer-item-id');
    const transferSourceSiteIdInput = document.getElementById('transfer-source-site-id');
    const transferSourceSiteNameInput = document.getElementById('transfer-source-site-name');
    const transferItemCurrentQuantityInput = document.getElementById('transfer-item-current-quantity');
    const transferSourceItemDataJsonInput = document.getElementById('transfer-source-item-data-json');
    const transferCurrentQuantityDisplay = document.getElementById('transfer-current-quantity-display');
    const destinationSiteIdSelect = document.getElementById('destination-site-id');

    // app.js - DOM Element References
    const toggleZeroQtyCheckbox = document.getElementById('toggle-zero-qty');


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
                    if (dashboardTitle) dashboardTitle.textContent = `Panel de ${userNameDisplay} (${currentUserRole})`;

                    showDashboardSection();
                    loadConstructionSites();
                } else {
                    console.log("User is NOT approved or profile doesn't exist yet.");
                    currentUserRole = null;
                    showAuthSection();
                    if (authTitle) authTitle.textContent = "Cuenta Pendiente de Aprobación";
                    if (loginFormContainer) {
                        loginFormContainer.innerHTML = `
                            <p class="text-center text-nova-gray-dark mb-4">
                                Su cuenta (${user.email || 'Nueva cuenta'}) ha sido registrada pero está pendiente de aprobación por un administrador.
                                Por favor, intente iniciar sesión más tarde o contacte al administrador.
                            </p>
                            <button id="logout-pending-button" class="w-full mt-4 bg-nova-green hover:bg-nova-green-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-150">
                                Cerrar Sesión
                            </button>
                        `;
                        if (registrationArea) registrationArea.innerHTML = '';

                        const logoutPendingButton = document.getElementById('logout-pending-button');
                        if (logoutPendingButton) {
                            logoutPendingButton.addEventListener('click', () => auth.signOut());
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching user approval status:", error);
                currentUserRole = null;
                showAuthSection();
                if (authTitle) authTitle.textContent = "Error de Cuenta";
                if (loginFormContainer) loginFormContainer.innerHTML = `<p class="text-red-500 text-center">Error al verificar el estado de su cuenta. Por favor, intente recargar la página o contacte soporte.</p> 
                    <button id="logout-error-button" class="w-full mt-4 bg-nova-green hover:bg-nova-green-dark text-white font-bold py-2 px-4 rounded">Cerrar Sesión</button>`;
                if (registrationArea) registrationArea.innerHTML = '';
                const logoutErrorButton = document.getElementById('logout-error-button');
                if (logoutErrorButton) logoutErrorButton.addEventListener('click', () => auth.signOut());
            }

        } else {
            currentUserRole = null;
            console.log("User signed out.");
            if (dashboardTitle) dashboardTitle.textContent = 'Panel Principal';
            if (authTitle) authTitle.textContent = 'Bienvenido';
            showAuthSection();
            if (sitesListContainer) sitesListContainer.innerHTML = '<p class="text-nova-gray">Cargando obras...</p>';
            if (addSiteFormContainer) addSiteFormContainer.innerHTML = '';
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
        if (authTitle) authTitle.textContent = 'Bienvenido';
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
            if (showSignupLink) {
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
                if (loginErrorEl) loginErrorEl.textContent = '';
                try {
                    await auth.signInWithEmailAndPassword(email, password);
                } catch (error) {
                    console.error("Login error:", error);
                    if (loginErrorEl) loginErrorEl.textContent = getFirebaseAuthErrorMessage(error);
                }
            });
        }
    }

    // --- Render Signup Form ---
    function renderSignupForm() {
        if (!loginFormContainer) return;
        if (authTitle) authTitle.textContent = 'Crear Nueva Cuenta';
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
            if (showLoginLink) {
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
        if (signupErrorEl) signupErrorEl.textContent = '';

        if (!nombre || !apellidos || !cedula) {
            if (signupErrorEl) signupErrorEl.textContent = "Nombre, apellidos y cédula son obligatorios.";
            return;
        }
        if (password !== confirmPassword) {
            if (signupErrorEl) signupErrorEl.textContent = "Las contraseñas no coinciden.";
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
            if (signupErrorEl) signupErrorEl.textContent = passwordErrorMessage.trim();
            return;
        }
        if (!dataConsentChecked) {
            if (signupErrorEl) signupErrorEl.textContent = "Debe aceptar la política de tratamiento de datos para registrarse.";
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
            if (signupErrorEl) signupErrorEl.textContent = getFirebaseAuthErrorMessage(error);
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

    // From your app.js
async function loadInventoryItems(siteId, siteName) {
    // Store current site for the toggle to use (if using global vars)
    // currentOpenSiteId = siteId; 
    // currentOpenSiteName = siteName;

    if (!inventoryListContainer) { 
        console.error("Inventory list container not found");
        return; 
    }
    inventoryListContainer.innerHTML = `<p class="text-nova-gray p-4">Cargando inventario para ${siteName}...</p>`; //
    const user = auth.currentUser; //
    if (!user) { //
        inventoryListContainer.innerHTML = '<p class="text-red-500 p-4">Error: Usuario no autenticado.</p>'; //
        return; //
    }

    try {
        const inventorySnapshot = await db.collection("inventoryItems") //
                                          .where("siteId", "==", siteId) //
                                          .orderBy("itemName", "asc") //
                                          .get(); //
        
        let itemsToDisplay = 0; // Counter for visible items //
        let itemsHTML = '<ul class="space-y-3">'; //

        inventorySnapshot.forEach(doc => { //
            const item = doc.data(); //
            const itemId = doc.id; //

            // ** NEW: Filter for zero quantity **
            if (item.quantity === 0 && !showZeroQuantityItems) { //
                return; // Skip rendering this item //
            }
            itemsToDisplay++; // Increment if item is to be displayed //

            const escapedItemName = item.itemName ? item.itemName.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : 'Ítem sin nombre'; //
            const nuiDisplay = item.nui ? item.nui.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : 'N/A'; //
            const escapedUnit = item.unit ? item.unit.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : ''; //
            const escapedSerialModel = item.serialModel ? item.serialModel.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : 'N/A'; //
            const escapedCondition = item.condition ? item.condition.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : 'N/A'; //
            const escapedDescription = item.description ? item.description.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : ''; //
            
            const zeroQtyClass = item.quantity === 0 ? 'opacity-60' : ''; //

            itemsHTML += `
                <li class="bg-white p-4 rounded-lg shadow border border-nova-gray-light transition-shadow hover:shadow-md ${zeroQtyClass}" data-item-id="${itemId}">
                    <div class="flex justify-between items-start flex-wrap">
                        <div class="flex-grow pr-4 mb-2 sm:mb-0">
                            <h5 class="text-lg font-semibold text-nova-green-dark">${escapedItemName}</h5>
                            <p class="text-xs text-nova-gray-dark font-medium">NUI: ${nuiDisplay}</p>
                            <p class="text-sm text-nova-gray-dark">Cantidad: <span class="font-medium text-black">${item.quantity !== undefined ? item.quantity : 'N/A'}</span> ${escapedUnit}</p>
                            <p class="text-sm text-nova-gray-dark">Serial/Modelo: <span class="font-medium text-black">${escapedSerialModel}</span></p>
                            <p class="text-sm text-nova-gray-dark">Estado: <span class="font-medium text-black">${escapedCondition}</span></p>
                            ${escapedDescription ? `<p class="mt-1 text-xs text-gray-500 w-full">Obs: ${escapedDescription}</p>` : ''}
                        </div>
                        <div class="flex space-x-2 mt-2 sm:mt-0 flex-shrink-0 flex-wrap gap-2 items-start">
                            ${currentUserRole === 'oficina' ? `
                                <button class="edit-item-btn text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded" data-item-id="${itemId}" data-site-id="${siteId}" data-site-name="${siteName}">Editar</button>
                                <button class="adjust-quantity-btn text-xs bg-green-500 hover:bg-green-600 text-white py-1 px-2 rounded" data-item-id="${itemId}" data-site-id="${siteId}" data-site-name="${siteName}" data-item-name="${escapedItemName}" data-current-quantity="${item.quantity}">Ajustar Cant.</button>
                                <button class="transfer-item-btn text-xs bg-yellow-500 hover:bg-yellow-600 text-black py-1 px-2 rounded" data-item-id="${itemId}" data-site-id="${siteId}" data-site-name="${siteName}">Transferir</button>
                            ` : ''}
                            <button class="view-history-btn text-xs bg-gray-400 hover:bg-gray-500 text-white py-1 px-2 rounded" data-item-id="${itemId}" data-item-name="${escapedItemName}">Historial</button>
                        </div>
                    </div>
                    <p class="text-xs text-gray-400 mt-2 w-full text-right">Añadido: ${item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                </li>
            `; //
        });
        itemsHTML += '</ul>'; //

        if (inventorySnapshot.empty || itemsToDisplay === 0) { // Check if snapshot was empty OR if all items were filtered out //
            let noItemsMessage = `<p class="text-nova-gray p-4">No hay ítems de inventario para esta obra (${siteName}).</p>`; //
            if (!inventorySnapshot.empty && itemsToDisplay === 0) { // Means there are items, but all are zero quantity and hidden //
                noItemsMessage = `<p class="text-nova-gray p-4">Todos los ítems para esta obra tienen cantidad cero. Active "Mostrar ítems sin stock" para verlos.</p>`; //
            }
            inventoryListContainer.innerHTML = noItemsMessage; //
        } else {
            inventoryListContainer.innerHTML = itemsHTML; //
        }

        // Re-attach event listeners
        if (currentUserRole === 'oficina') { //
            document.querySelectorAll('.edit-item-btn').forEach(button => {  //
                button.addEventListener('click', async (e) => { //
                    const itemId = e.target.dataset.itemId; const siteId = e.target.dataset.siteId; const siteName = e.target.dataset.siteName; //
                    try { const itemDoc = await db.collection("inventoryItems").doc(itemId).get(); if (itemDoc.exists) renderEditItemForm(itemId, itemDoc.data(), siteId, siteName); else alert("Error: Ítem no encontrado.");} catch (error) { console.error("Error fetching item for edit:", error); alert("Error al cargar datos del ítem para editar."); } //
                });
            });
             document.querySelectorAll('.adjust-quantity-btn').forEach(button => {  //
                button.addEventListener('click', (e) => { //
                    const itemId = e.target.dataset.itemId; const siteId = e.target.dataset.siteId; const siteName = e.target.dataset.siteName; //
                    const itemName = e.target.dataset.itemName; const currentQuantity = parseFloat(e.target.dataset.currentQuantity); //
                    renderAdjustQuantityForm(itemId, itemName, currentQuantity, siteId, siteName); //
                });
            });
            document.querySelectorAll('.transfer-item-btn').forEach(button => {  //
                 button.addEventListener('click', async (e) => { //
                    const itemId = e.target.dataset.itemId; const siteId = e.target.dataset.siteId; const siteName = e.target.dataset.siteName; //
                    try { const itemDoc = await db.collection("inventoryItems").doc(itemId).get(); if (itemDoc.exists) renderTransferItemForm(itemId, itemDoc.data(), siteId, siteName); else alert("Error: Ítem no encontrado.");} catch (error) { console.error("Error fetching item for transfer:", error); alert("Error al cargar datos del ítem para transferir."); } //
                });
            });
        }
        document.querySelectorAll('.view-history-btn').forEach(button => {  //
            button.addEventListener('click', (e) => { //
                const itemId = e.target.dataset.itemId; const itemName = e.target.dataset.itemName; //
                showItemHistory(itemId, itemName); //
            });
        });

    } catch (error) {
        console.error(`Error loading inventory items for site ${siteId}:`, error); //
        inventoryListContainer.innerHTML = `<p class="text-red-500 p-4">Error al cargar el inventario: ${error.message}.</p>`; //
        if (error.message.includes("index")) { //
            inventoryListContainer.innerHTML += `<p class="text-sm text-red-400 p-4">Es posible que necesite crear un índice compuesto en Firestore.</p>`; //
        }
    }
}
    // app.js - Add this new function
async function renderTransferItemForm(itemId, itemData, sourceSiteId, sourceSiteName) {
    if (!transferItemModal || !transferItemForm || currentUserRole !== 'oficina') {
        console.warn("Attempt to render transfer form denied or modal elements missing.");
        return;
    }

    console.log(`Rendering transfer form for item: ${itemData.itemName} (ID: ${itemId}) from site: ${sourceSiteName}`);

    // Store item and source site info in hidden inputs
    if(transferItemIdInput) transferItemIdInput.value = itemId;
    if(transferSourceSiteIdInput) transferSourceSiteIdInput.value = sourceSiteId;
    if(transferSourceSiteNameInput) transferSourceSiteNameInput.value = sourceSiteName;
    if(transferItemCurrentQuantityInput) transferItemCurrentQuantityInput.value = itemData.quantity;
    if(transferSourceItemDataJsonInput) transferSourceItemDataJsonInput.value = JSON.stringify(itemData);

    // Display item info
    const escapedItemName = itemData.itemName ? itemData.itemName.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : 'Ítem Desconocido';
    if(transferItemNameDisplay) transferItemNameDisplay.textContent = `Ítem: ${escapedItemName}`;
    if(transferItemSiteOriginDisplay) transferItemSiteOriginDisplay.textContent = `Desde Obra: ${sourceSiteName}`;
    if(transferCurrentQuantityDisplay) transferCurrentQuantityDisplay.value = itemData.quantity;

    // Clear previous form values and errors
    const quantityToTransferEl = transferItemForm.elements['quantityToTransfer'];
    const destinationSiteEl = transferItemForm.elements['destinationSiteId'];
    const transferReasonEl = transferItemForm.elements['transferReason'];
    const errorElement = document.getElementById('transfer-item-error');

    if(quantityToTransferEl) quantityToTransferEl.value = '';
    if(quantityToTransferEl) quantityToTransferEl.max = itemData.quantity;
    if(destinationSiteEl) destinationSiteEl.innerHTML = '<option value="">Cargando destinos...</option>';
    if(transferReasonEl) transferReasonEl.value = '';
    if(errorElement) errorElement.textContent = '';

    // --- Load sites from Firestore and populate dropdown ---
    let optionsHTML = '<option value="">Seleccione obra de destino</option>';
    try {
        const sitesSnapshot = await db.collection("constructionSites").orderBy("createdAt", "desc").get();
        sitesSnapshot.forEach(doc => {
            if (doc.id !== sourceSiteId) { // Exclude the source site
                const site = doc.data();
                const escapedOptionSiteName = site.name.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
                optionsHTML += `<option value="${doc.id}">${escapedOptionSiteName}</option>`;
            }
        });
        if(destinationSiteEl) destinationSiteEl.innerHTML = optionsHTML;
    } catch (error) {
        console.error("Error loading destination sites:", error);
        if(destinationSiteEl) destinationSiteEl.innerHTML = '<option value="">Error al cargar obras</option>';
    }

    transferItemModal.classList.remove('hidden');
    if(quantityToTransferEl) quantityToTransferEl.focus();

    // Reset submit button state
    const submitButton = transferItemForm.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Transferir"; // Or whatever your default text is
    }
}

    // app.js - Add this new function
    function renderAdjustQuantityForm(itemId, itemName, currentQuantity, siteId, siteName) {
        if (!adjustQuantityModal || !adjustQuantityForm || currentUserRole !== 'oficina') return;

        console.log(`Rendering adjust quantity form for item: ${itemName} (ID: ${itemId}), current qty: ${currentQuantity}`);

        // Store necessary data in hidden inputs or directly on the form
        if(adjustItemIdInput) adjustItemIdInput.value = itemId;
        if(adjustItemSiteIdInput) adjustItemSiteIdInput.value = siteId;
        if(adjustItemSiteNameInput) adjustItemSiteNameInput.value = siteName;
        const adjustItemNameInput = document.createElement('input'); // Create a hidden input for item name
        adjustItemNameInput.type = 'hidden';
        adjustItemNameInput.id = 'adjust-item-name-hidden'; 
        if(adjustItemNameInput) adjustItemNameInput.value = itemName;
        adjustQuantityForm.appendChild(adjustItemNameInput); // Append to form to be accessible
        if(adjustItemCurrentQuantityInput) adjustItemCurrentQuantityInput.value = currentQuantity; // Store numeric current quantity

        // Display item name and current quantity
        if(adjustQuantityItemNameDisplay) adjustQuantityItemNameDisplay.textContent = `Ítem: ${itemName}`;
        if(currentItemQuantityDisplay) currentItemQuantityDisplay.value = currentQuantity; // Display in readonly field

        // Clear previous new quantity and reason, and any errors
        const newItemQuantityEl = adjustQuantityForm.elements['newItemQuantity'];
        const adjustmentReasonEl = adjustQuantityForm.elements['adjustmentReason'];
        const errorElement = document.getElementById('adjust-quantity-error');

        if(newItemQuantityEl) newItemQuantityEl.value = ''; // Clear previous input
        if(adjustmentReasonEl) adjustmentReasonEl.value = ''; // Clear previous input
        if(errorElement) errorElement.textContent = '';

        adjustQuantityModal.classList.remove('hidden');
        if(newItemQuantityEl) newItemQuantityEl.focus(); // Focus on the new quantity field
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
            if (addItemFormContainer) addItemFormContainer.innerHTML = ''; return;
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
            if (errorElement) errorElement.textContent = 'Equipo/Maquinaria, Cantidad y Unidad son obligatorios.';
            return;
        }
        const quantity = parseFloat(quantityStr);
        if (isNaN(quantity) || quantity < 0) {
            if (errorElement) errorElement.textContent = 'La cantidad debe ser un número válido y no negativo.';
            return;
        }
        const user = auth.currentUser;
        if (!user) {
            if (errorElement) errorElement.textContent = 'Error de autenticación. Por favor, inicie sesión de nuevo.';
            return;
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
            }

            const newItemRef = db.collection("inventoryItems").doc(); // Firestore auto-generates an ID for the document
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();

            // ** NEW: Generate NUI for brand new items **
            // This NUI is for this specific batch being entered into the system for the first time.
            const nui = `NUI-${newItemRef.id.substring(0, 8).toUpperCase()}`; // Uses a snippet of the Firestore Doc ID for uniqueness

            const newItemData = {
                nui: nui, // ** ADDED NUI **
                siteId: siteId,
                itemName: itemName,
                quantity: quantity,
                initialQuantity: quantity, // initialQuantity for this batch at this site
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

            // Add NUI to history log
            await newItemRef.collection("history").add({
                timestamp: timestamp,
                userId: user.uid,
                userName: performingUserName,
                userApellidos: performingUserApellidos,
                userCedula: performingUserCedula,
                nui: nui, // ** ADDED NUI TO HISTORY **
                action: "CREADO",
                details: {
                    createdWithQuantity: quantity,
                    unit: unit,
                    serialModel: serialModel,
                    condition: condition,
                    notes: `Ítem "${itemName}" (NUI: ${nui}) creado en el sistema en obra "${siteName}".`
                }
            });
            console.log("Inventory item and history log created successfully with NUI:", newItemRef.id, "NUI:", nui);
            renderAddInventoryItemButton(siteId, siteName);
            loadInventoryItems(siteId, siteName);
        } catch (error) {
            console.error("Error adding inventory item: ", error);
            if (errorElement) errorElement.textContent = `Error al guardar el ítem: ${error.message}`;
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }

    // --- Edit Item Modal Event Listeners ---  <<<<<<<<<< ****** PLACE IT HERE ******
    if (editItemForm) {
        editItemForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission
            // Retrieve stored values needed by the handler
            const itemId = editItemIdInput.value;
            const siteId = editItemSiteIdInput.value;
            const siteName = editItemSiteNameInput.value;
            const oldItemDataString = event.target.dataset.oldData;
            
            if (!itemId || !siteId || !siteName || !oldItemDataString) {
                console.error("Missing data for edit submission. ItemID:", itemId, "SiteID:", siteId, "SiteName:", siteName, "OldData:", oldItemDataString);
                const errorElement = document.getElementById('edit-item-error');
                if (errorElement) errorElement.textContent = 'Error interno. No se pudo procesar la edición.'; // UI Text
                return;
            }
            const oldItemData = JSON.parse(oldItemDataString);
            await handleEditItemSubmit(event, itemId, oldItemData, siteId, siteName);
        });
    }

    if (cancelEditItemButton && editItemModal) {
        cancelEditItemButton.addEventListener('click', () => {
            editItemModal.classList.add('hidden');
        });
        // Optional: Close modal if clicked outside of the content
        editItemModal.addEventListener('click', (event) => {
            if (event.target === editItemModal) { // Check if the click is on the backdrop
                editItemModal.classList.add('hidden');
            }
        });
    }
    // --- END: Edit Item Modal Event Listeners ---

    // --- Adjust Quantity Modal Functions ---
    if (adjustQuantityForm) {
        adjustQuantityForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const itemId = adjustItemIdInput.value;
            const siteId = adjustItemSiteIdInput.value;
            const siteName = adjustItemSiteNameInput.value;
            const currentQuantity = parseFloat(adjustItemCurrentQuantityInput.value);
            const itemName = document.getElementById('adjust-item-name-hidden').value; // Get item name
            await handleAdjustQuantitySubmit(event, itemId, currentQuantity, siteId, siteName, itemName); // Pass itemName
        });
    }

    if (cancelAdjustQuantityButton && adjustQuantityModal) {
        cancelAdjustQuantityButton.addEventListener('click', () => {
            adjustQuantityModal.classList.add('hidden');
        });
        adjustQuantityModal.addEventListener('click', (event) => {
            if (event.target === adjustQuantityModal) {
                adjustQuantityModal.classList.add('hidden');
            }
        });
    }

    // app.js - Add these inside DOMContentLoaded
    if (transferItemForm) {
        transferItemForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const itemId = transferItemIdInput.value;
            const sourceSiteId = transferSourceSiteIdInput.value;
            const sourceSiteName = transferSourceSiteNameInput.value;
            const sourceItemData = JSON.parse(transferSourceItemDataJsonInput.value || '{}');
            // currentQuantity is also stored in a hidden field, or can be from sourceItemData.quantity
            await handleTransferItemSubmit(event, itemId, sourceItemData, sourceSiteId, sourceSiteName);
        });
    }

    if (cancelTransferItemButton && transferItemModal) {
        cancelTransferItemButton.addEventListener('click', () => {
            transferItemModal.classList.add('hidden');
        });
        transferItemModal.addEventListener('click', (event) => {
            if (event.target === transferItemModal) {
                transferItemModal.classList.add('hidden');
            }
        });
    }


    // app.js - Replace the existing (placeholder or previous) handleTransferItemSubmit

async function handleTransferItemSubmit(event, itemId, sourceItemData, sourceSiteId, sourceSiteName) {
    event.preventDefault();
    if (currentUserRole !== 'oficina') {
        console.warn("Attempt to transfer item by non-oficina role blocked.");
        return;
    }

    const form = event.target;
    const quantityToTransferStr = form.elements['quantityToTransfer'].value;
    const destinationSiteId = form.elements['destinationSiteId'].value;
    const reason = form.elements['transferReason'].value.trim();

    const errorElement = document.getElementById('transfer-item-error');
    if (errorElement) errorElement.textContent = '';

    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;

    // Validation
    if (!quantityToTransferStr || !destinationSiteId) {
        if (errorElement) errorElement.textContent = 'Cantidad a transferir y obra de destino son obligatorios.';
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
        return;
    }
    const quantityToTransfer = parseFloat(quantityToTransferStr);
    if (isNaN(quantityToTransfer) || quantityToTransfer <= 0) {
        if (errorElement) errorElement.textContent = 'La cantidad a transferir debe ser un número positivo.';
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
        return;
    }
    const currentSourceQuantity = parseFloat(sourceItemData.quantity);
    if (isNaN(currentSourceQuantity) || quantityToTransfer > currentSourceQuantity) {
        if (errorElement) errorElement.textContent = `No puede transferir más de la cantidad actual (${currentSourceQuantity}).`;
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        if (errorElement) errorElement.textContent = 'Error de autenticación.';
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Transfiriendo...';

    try {
        // Fetch performing user's details for logs
        let performingUserName = "Usuario Desconocido", performingUserApellidos = "", performingUserCedula = "";
        const userProfileSnap = await db.collection("users").doc(user.uid).get();
        if (userProfileSnap.exists) {
            const d = userProfileSnap.data();
            performingUserName = d.nombre || performingUserName;
            performingUserApellidos = d.apellidos || "";
            performingUserCedula = d.cedula || "";
        }

        const destinationSiteDoc = await db.collection("constructionSites").doc(destinationSiteId).get();
        const destinationSiteName = destinationSiteDoc.exists ? destinationSiteDoc.data().name : "Destino Desconocido";
        
        const batch = db.batch();
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        const itemNUI = sourceItemData.nui; // The NUI of the batch being transferred

        // 1. Update Source Item
        const sourceItemRef = db.collection("inventoryItems").doc(itemId);
        const newSourceQuantity = currentSourceQuantity - quantityToTransfer;
        
        batch.update(sourceItemRef, {
            quantity: newSourceQuantity,
            lastUpdatedAt: timestamp
        });

        // Log TRANSFERENCIA_SALIDA for source item
        const sourceHistoryRef = sourceItemRef.collection("history").doc();
        batch.set(sourceHistoryRef, {
            timestamp: timestamp, userId: user.uid, userName: performingUserName, userApellidos: performingUserApellidos, userCedula: performingUserCedula,
            nui: itemNUI, // Log NUI
            action: "TRANSFERENCIA_SALIDA",
            details: {
                quantityTransferred: quantityToTransfer,
                remainingQuantityAtSource: newSourceQuantity,
                toSiteId: destinationSiteId,
                toSiteName: destinationSiteName,
                reason: reason || "N/A",
                notes: `Salida de ${quantityToTransfer} ${sourceItemData.unit || ''} de "${sourceItemData.itemName}" (NUI: ${itemNUI}) desde "${sourceSiteName}" hacia "${destinationSiteName}".`
            }
        });

        // 2. Handle Destination Item (Query for NUI at destination, then Merge or Create)
        const destinationItemsQuery = db.collection("inventoryItems")
            .where("siteId", "==", destinationSiteId)
            .where("nui", "==", itemNUI); // Key query: find by NUI at the destination

        const destinationItemsSnapshot = await destinationItemsQuery.get();
        let destinationItemRef;
        let destinationItemAction = "";
        let destinationItemNotes = "";
        let finalDestinationQuantity;

        if (!destinationItemsSnapshot.empty) {
            // NUI Match found! Update the existing item at the destination.
            // This means this batch (NUI) has been at this site before or part of it is already there.
            const existingDestinationItemDoc = destinationItemsSnapshot.docs[0]; // Assuming NUI + siteId is unique if found
            destinationItemRef = existingDestinationItemDoc.ref;
            const currentDestinationQuantity = parseFloat(existingDestinationItemDoc.data().quantity);
            finalDestinationQuantity = currentDestinationQuantity + quantityToTransfer;
            
            batch.update(destinationItemRef, {
                quantity: finalDestinationQuantity,
                lastUpdatedAt: timestamp,
                // Optionally update status if it was e.g. 'Agotado' from a previous transfer out
                status: "Disponible" 
            });

            destinationItemAction = "TRANSFERENCIA_ENTRADA";
            destinationItemNotes = `Cantidad incrementada por transferencia de ${quantityToTransfer} ${sourceItemData.unit || ''} de "${sourceItemData.itemName}" (NUI: ${itemNUI}) desde "${sourceSiteName}".`;
            console.log(`NUI ${itemNUI} found at destination ${destinationSiteName}. Updating item ${destinationItemRef.id}. New qty: ${finalDestinationQuantity}`);
        } else {
            // No NUI match found. Create a new item record at the destination for this NUI batch.
            destinationItemRef = db.collection("inventoryItems").doc(); // New Firestore ID for this record
            finalDestinationQuantity = quantityToTransfer;

            batch.set(destinationItemRef, {
                nui: itemNUI, // CRITICAL: Copy the NUI from the source
                itemName: sourceItemData.itemName,
                unit: sourceItemData.unit,
                serialModel: sourceItemData.serialModel,
                condition: sourceItemData.condition,
                description: sourceItemData.description,
                quantity: quantityToTransfer,
                initialQuantity: quantityToTransfer, // This is its "initial" qty at this new site for *this record*
                siteId: destinationSiteId,
                createdBy: user.uid, // User performing the transfer is creating this new site record
                createdAt: timestamp, 
                lastUpdatedAt: timestamp,
                status: "Disponible", // Assuming it's available upon arrival
                // Optional: Link back to the original document ID from the source site if useful,
                // but NUI is the primary link for the batch.
                // transferredFromSourceItemId: itemId 
            });

            destinationItemAction = "CREADO_POR_TRANSFERENCIA"; // Or "TRANSFERENCIA_ENTRADA"
            destinationItemNotes = `Recepción de ${quantityToTransfer} ${sourceItemData.unit || ''} de "${sourceItemData.itemName}" (NUI: ${itemNUI}) desde "${sourceSiteName}".`;
            console.log(`NUI ${itemNUI} not found at destination ${destinationSiteName}. Creating new item record ${destinationItemRef.id}.`);
        }

        // Log history for the destination item
        const destinationHistoryRef = destinationItemRef.collection("history").doc();
        batch.set(destinationHistoryRef, {
            timestamp: timestamp, userId: user.uid, userName: performingUserName, userApellidos: performingUserApellidos, userCedula: performingUserCedula,
            nui: itemNUI, // Log NUI
            action: destinationItemAction,
            details: {
                quantityReceivedOrUpdated: quantityToTransfer,
                finalQuantityAtDestination: finalDestinationQuantity,
                unit: sourceItemData.unit,
                fromSiteId: sourceSiteId,
                fromSiteName: sourceSiteName,
                reason: reason || "N/A",
                notes: destinationItemNotes
            }
        });
            
        await batch.commit();
        console.log("Item transfer batch committed successfully.");
        if(transferItemModal) transferItemModal.classList.add('hidden');
        loadInventoryItems(sourceSiteId, sourceSiteName); // Refresh current (source) site's inventory

    } catch (error) {
        console.error("Error transferring item:", error);
        if(errorElement) errorElement.textContent = `Error al transferir ítem: ${error.message}`;
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

    // app.js - Add this new function
async function handleAdjustQuantitySubmit(event, itemId, oldQuantity, siteId, siteName, itemName) {
    if (currentUserRole !== 'oficina') {
        console.warn("Attempt to adjust quantity by non-oficina role blocked.");
        return;
    }

    const form = event.target;
    const newQuantityStr = form.elements['newItemQuantity'].value;
    const reason = form.elements['adjustmentReason'].value.trim();

    const errorElement = document.getElementById('adjust-quantity-error');
    if (errorElement) errorElement.textContent = '';

    if (!newQuantityStr) {
        if (errorElement) errorElement.textContent = 'La nueva cantidad es obligatoria.'; // UI Text
        return;
    }
    if (!reason) {
        if (errorElement) errorElement.textContent = 'El motivo del ajuste es obligatorio.'; // UI Text
        return;
    }

    const newQuantity = parseFloat(newQuantityStr);
    if (isNaN(newQuantity) || newQuantity < 0) {
        if (errorElement) errorElement.textContent = 'La nueva cantidad debe ser un número válido y no negativo.'; // UI Text
        return;
    }

    if (newQuantity === oldQuantity) {
         if (errorElement) errorElement.textContent = 'La nueva cantidad es igual a la cantidad actual. No se realizaron cambios.'; // UI Text
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        if (errorElement) errorElement.textContent = 'Error de autenticación.'; // UI Text
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Ajustando...'; // UI Text

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
        }

        const itemRef = db.collection("inventoryItems").doc(itemId);
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();

        // 1. Update the item's quantity
        await itemRef.update({
            quantity: newQuantity,
            lastUpdatedAt: timestamp
        });

        // 2. Log the adjustment in history
        await itemRef.collection("history").add({
            timestamp: timestamp,
            userId: user.uid,
            userName: performingUserName,
            userApellidos: performingUserApellidos,
            userCedula: performingUserCedula,
            action: "CANTIDAD_AJUSTADA", // UI Text
            details: {
                oldQuantity: oldQuantity,
                newQuantity: newQuantity,
                adjustment: newQuantity - oldQuantity,
                reason: reason,
                notes: `Cantidad ajustada para "${itemName || 'ítem desconocido'}" en obra "${siteName}".`
            }
        });

        console.log("Inventory item quantity adjusted successfully:", itemId);
        if (adjustQuantityModal) adjustQuantityModal.classList.add('hidden');
        loadInventoryItems(siteId, siteName); // Refresh the list

    } catch (error) {
        console.error("Error adjusting item quantity:", error);
        if (errorElement) errorElement.textContent = `Error al ajustar cantidad: ${error.message}`; // UI Text
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

    // --- Edit Item Modal Functions ---
    function renderEditItemForm(itemId, itemData, siteId, siteName) { /* ... Use previous full version ... */ 
        if (!editItemModal || !editItemForm || currentUserRole !== 'oficina') return;
        console.log("Editing item:", itemId, itemData);
        editItemIdInput.value = itemId; editItemSiteIdInput.value = siteId; editItemSiteNameInput.value = siteName;
        editItemForm.elements['itemName'].value = itemData.itemName || ''; editItemForm.elements['itemUnit'].value = itemData.unit || '';
        editItemForm.elements['itemSerialModel'].value = itemData.serialModel || ''; editItemForm.elements['itemCondition'].value = itemData.condition || '';
        editItemForm.elements['itemDescription'].value = itemData.description || '';
        editItemForm.dataset.oldData = JSON.stringify(itemData);
        if(editItemModalTitle) editItemModalTitle.textContent = `Editar: ${itemData.itemName?.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) || 'Ítem'}`;
        const errEl = document.getElementById('edit-item-error'); if(errEl) errEl.textContent = '';
        editItemModal.classList.remove('hidden');
    }
   
    if (cancelEditItemButton && editItemModal) cancelEditItemButton.addEventListener('click', () => editItemModal.classList.add('hidden'));
    if (editItemModal) editItemModal.addEventListener('click', e => { if (e.target === editItemModal) editItemModal.classList.add('hidden'); });

    async function handleEditItemSubmit(event, itemId, oldItemData, siteId, siteName) { /* ... Use previous full version ... */ 
        if (currentUserRole !== 'oficina') return;
        const form = event.target; const errEl = document.getElementById('edit-item-error'); if(errEl) errEl.textContent = '';
        const updated = {
            itemName: form.elements['itemName'].value.trim(), unit: form.elements['itemUnit'].value.trim(),
            serialModel: form.elements['itemSerialModel'].value.trim(), condition: form.elements['itemCondition'].value.trim(),
            description: form.elements['itemDescription'].value.trim(), lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!updated.itemName || !updated.unit) { if(errEl) errEl.textContent = 'Nombre y Unidad son obligatorios.'; return; }
        const user = auth.currentUser; if (!user) { if(errEl) errEl.textContent = 'Error de autenticación.'; return; }
        
        const changes={}; const oldVals={}; const newVals={}; let hasChanges=false;
        for(const k in updated) { if(k!=='lastUpdatedAt' && updated[k]!==(oldItemData[k]===undefined? '':oldItemData[k])) { changes[k]=1; oldVals[k]=oldItemData[k]||''; newVals[k]=updated[k]; hasChanges=true;}}
        if(!hasChanges){ if(errEl)errEl.textContent='No se detectaron cambios.'; setTimeout(()=>editItemModal.classList.add('hidden'),1500); return; }

        const btn = form.querySelector('button[type="submit"]'); const btnTxt = btn.textContent;
        btn.disabled = true; btn.textContent = 'Actualizando...';
        try {
            let pUserName="N/A", pUserApellidos="", pUserCedula="";
            const uProfile = await db.collection("users").doc(user.uid).get();
            if(uProfile.exists) { const d=uProfile.data(); pUserName=d.nombre||pUserName; pUserApellidos=d.apellidos||""; pUserCedula=d.cedula||""; }
            
            const itemRef = db.collection("inventoryItems").doc(itemId);
            await itemRef.update(updated);
            await itemRef.collection("history").add({
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userId: user.uid,
                userName: pUserName,
                userApellidos: pUserApellidos,
                userCedula: pUserCedula,
                action: "ITEM_ACTUALIZADO",
                details: { changedFields: Object.keys(changes), oldValues: oldVals, newValues: newVals, notes: `Ítem "${updated.itemName}" actualizado.`}
            });
            console.log("Item updated:", itemId); 
            btn.disabled = false; btn.textContent = btnTxt; // <-- FIX: re-enable button after success
            if(editItemModal) editItemModal.classList.add('hidden'); 
            loadInventoryItems(siteId, siteName);
        } catch (error) { 
            console.error("Error updating item:", error); 
            if(errEl) errEl.textContent=`Error: ${error.message}`; 
            btn.disabled=false; btn.textContent=btnTxt; 
        }
    }

    // --- Item History Modal Functions ---
    if (closeHistoryModalButton && historyModal) closeHistoryModalButton.addEventListener('click', () => historyModal.classList.add('hidden'));
    if (historyModal) historyModal.addEventListener('click', e => { if (e.target === historyModal) historyModal.classList.add('hidden'); });

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
            return '<p class="text-xs text-gray-500 mt-1">No hay detalles adicionales para esta entrada.</p>';
        }

        let detailsHTML = '<ul class="list-none pl-0 text-xs mt-1 text-gray-600 space-y-1">';
        
        // NUI is now part of the main log object for all new history entries.
        // It will be displayed by the main showItemHistory rendering loop.

        switch (log.action) {
            case "CREADO":
                detailsHTML += `<li><span class="font-medium text-gray-700">Cantidad Inicial:</span> ${log.details.createdWithQuantity !== undefined ? log.details.createdWithQuantity : 'N/A'} ${log.details.unit || ''}</li>`;
                if (log.details.serialModel) {
                    detailsHTML += `<li><span class="font-medium text-gray-700">Serial/Modelo:</span> ${log.details.serialModel}</li>`;
                }
                if (log.details.condition) {
                    detailsHTML += `<li><span class="font-medium text-gray-700">Estado Inicial:</span> ${log.details.condition}</li>`;
                }
                if (log.details.notes) { // This note already includes NUI for CREADO
                    detailsHTML += `<li><span class="font-medium text-gray-700">Notas:</span> ${log.details.notes}</li>`;
                }
                break;
            case "ITEM_ACTUALIZADO":
                // ... (keep existing ITEM_ACTUALIZADO formatting)
                detailsHTML += `<li><span class="font-medium text-gray-700">Campos Modificados:</span> ${(log.details.changedFields || []).map(f => f.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())).join(', ')}</li>`;
                if (log.details.oldValues && log.details.newValues && log.details.changedFields) {
                    detailsHTML += '<li><span class="font-medium text-gray-700">Detalles de Cambios:</span><ul class="list-disc list-inside pl-3 mt-1">';
                    (log.details.changedFields).forEach(field => {
                        const prettyField = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        const oldValueDisplay = log.details.oldValues[field] !== undefined ? `"${log.details.oldValues[field]}"` : "N/A";
                        const newValueDisplay = log.details.newValues[field] !== undefined ? `"${log.details.newValues[field]}"` : "N/A";
                        detailsHTML += `<li><span class="italic">${prettyField}:</span> ${oldValueDisplay} &rarr; ${newValueDisplay}</li>`;
                    });
                    detailsHTML += '</ul></li>';
                }
                if (log.details.notes) {
                    detailsHTML += `<li><span class="font-medium text-gray-700">Notas:</span> ${log.details.notes}</li>`;
                }
                break;
            case "CANTIDAD_AJUSTADA":
                // ... (keep existing CANTIDAD_AJUSTADA formatting)
                detailsHTML += `<li><span class="font-medium text-gray-700">Cantidad Anterior:</span> ${log.details.oldQuantity !== undefined ? log.details.oldQuantity : 'N/A'}</li>`;
                detailsHTML += `<li><span class="font-medium text-gray-700">Nueva Cantidad:</span> ${log.details.newQuantity !== undefined ? log.details.newQuantity : 'N/A'}</li>`;
                if (log.details.adjustment !== undefined) {
                    detailsHTML += `<li><span class="font-medium text-gray-700">Ajuste:</span> ${log.details.adjustment > 0 ? '+' : ''}${log.details.adjustment}</li>`;
                }
                if (log.details.reason) {
                    detailsHTML += `<li><span class="font-medium text-gray-700">Motivo:</span> ${log.details.reason}</li>`;
                }
                if (log.details.notes) {
                    detailsHTML += `<li><span class="font-medium text-gray-700">Notas Adicionales:</span> ${log.details.notes}</li>`;
                }
                break;
            case "TRANSFERENCIA_SALIDA": // NEW
                detailsHTML += `<li><span class="font-medium text-gray-700">Cantidad Transferida:</span> ${log.details.quantityTransferred !== undefined ? log.details.quantityTransferred : 'N/A'}</li>`;
                detailsHTML += `<li><span class="font-medium text-gray-700">Hacia Obra:</span> ${log.details.toSiteName || 'Desconocida'} (ID: ${log.details.toSiteId || 'N/A'})</li>`;
                if (log.details.remainingQuantityAtSource !== undefined) {
                    detailsHTML += `<li><span class="font-medium text-gray-700">Cantidad Restante en Origen:</span> ${log.details.remainingQuantityAtSource}</li>`;
                }
                if (log.details.reason) {
                    detailsHTML += `<li><span class="font-medium text-gray-700">Motivo/Notas de Envío:</span> ${log.details.reason}</li>`;
                }
                if (log.details.notes) {
                    detailsHTML += `<li><span class="font-medium text-gray-700">Detalle Adicional:</span> ${log.details.notes}</li>`;
                }
                break;
            case "TRANSFERENCIA_ENTRADA": // NEW (used when updating an existing item at destination)
            case "CREADO_POR_TRANSFERENCIA": // NEW (used when a new item record is made at destination for the NUI)
                detailsHTML += `<li><span class="font-medium text-gray-700">Cantidad Recibida:</span> ${log.details.quantityReceivedOrUpdated || log.details.quantityReceived || 'N/A'}</li>`;
                detailsHTML += `<li><span class="font-medium text-gray-700">Desde Obra:</span> ${log.details.fromSiteName || 'Desconocida'} (ID: ${log.details.fromSiteId || 'N/A'})</li>`;
                if (log.details.finalQuantityAtDestination !== undefined) {
                    detailsHTML += `<li><span class="font-medium text-gray-700">Nueva Cantidad Total en Destino:</span> ${log.details.finalQuantityAtDestination}</li>`;
                }
                if (log.details.unit && log.action === "CREADO_POR_TRANSFERENCIA") { // Only show unit if it's a creation event
                    detailsHTML += `<li><span class="font-medium text-gray-700">Unidad:</span> ${log.details.unit}</li>`;
                }
                if (log.details.reason) {
                    detailsHTML += `<li><span class="font-medium text-gray-700">Motivo/Notas de Recepción:</span> ${log.details.reason}</li>`;
                }
                if (log.details.notes) {
                    detailsHTML += `<li><span class="font-medium text-gray-700">Detalle Adicional:</span> ${log.details.notes}</li>`;
                }
                break;
            default:
                for (const key in log.details) {
                    const prettyKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    detailsHTML += `<li><span class="font-medium text-gray-700">${prettyKey}:</span> ${log.details[key]}</li>`;
                }
                break;
        }
        detailsHTML += '</ul>';
        return detailsHTML;
    }

    // Modify the main showItemHistory loop to display the NUI if present on the log object itself
    async function showItemHistory(itemId, itemName) {
        // ... (modal setup and title remains the same) ...
        if (!historyModal || !historyModalTitle || !historyModalContent) { /* ... */ return; }
        const escapedItemName = itemName ? itemName.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : 'Ítem Desconocido';
        historyModalTitle.textContent = `Historial para: ${escapedItemName}`;
        historyModalContent.innerHTML = '<p class="text-nova-gray p-4">Cargando historial...</p>';
        historyModal.classList.remove('hidden');

        try {
            const historySnapshot = await db.collection("inventoryItems").doc(itemId)
                .collection("history")
                .orderBy("timestamp", "desc")
                .get();

            if (historySnapshot.empty) { /* ... */ return; }

            let historyHTML = '<ul class="space-y-4 text-left">';
            historySnapshot.forEach(doc => {
                const log = doc.data();
                const logDate = log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'medium' }) : 'Fecha desconocida';
                const userDetails = `Usuario: ${log.userName || 'N/A'} ${log.userApellidos || ''} (Cédula: ${log.userCedula || 'N/A'})`;
                const formattedDetails = formatLogDetails(log);
                const nuiDisplayForHistory = log.nui ? `<p class="text-xs text-nova-green-dark font-semibold">NUI: ${log.nui}</p>` : ''; // ** DISPLAY NUI IN HISTORY **

                historyHTML += `
                    <li class="p-3 bg-nova-gray-light rounded-lg shadow-sm border border-gray-200">
                        <div class="flex justify-between items-center mb-1">
                            <p class="font-semibold text-nova-green-dark text-base">${log.action || 'Acción Desconocida'}</p>
                            <p class="text-xs text-gray-500">${logDate}</p>
                        </div>
                        ${nuiDisplayForHistory} <p class="text-xs text-gray-600 mb-1">${userDetails}</p>
                        <div class="mt-1 border-t border-gray-300 pt-1">
                            ${formattedDetails}
                        </div>
                    </li>
                `;
            });
            historyHTML += '</ul>';
            historyModalContent.innerHTML = historyHTML;

        } catch (error) { /* ... */ }
    }

    // --- Toggle Zero Quantity Checkbox Listener ---
    if (toggleZeroQtyCheckbox) {
        toggleZeroQtyCheckbox.addEventListener('change', () => {
            showZeroQuantityItems = toggleZeroQtyCheckbox.checked;
            console.log("Show zero quantity items:", showZeroQuantityItems);
            const currentViewingSiteId = document.getElementById('adjust-item-site-id')?.value ||
                                         document.getElementById('edit-item-site-id')?.value ||
                                         document.getElementById('transfer-source-site-id')?.value;
            const currentViewingSiteName = selectedSiteNameSpan.textContent;

            if (currentViewingSiteId && currentViewingSiteName && !inventorySection.classList.contains('hidden')) {
                loadInventoryItems(currentViewingSiteId, currentViewingSiteName);
            } else if (!inventorySection.classList.contains('hidden')) {
                console.warn("Could not reload inventory for zero quantity toggle - current site context missing.");
            }
        });
    }

}); // End DOMContentLoaded