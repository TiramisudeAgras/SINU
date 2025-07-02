// app.js

document.addEventListener('DOMContentLoaded', () => {

     // Initialize the global object first
    window.SINU_APP = window.SINU_APP || {};
    
    const firebaseConfig = {
        apiKey: "AIzaSyDydDrSWx8eS3MgLfdpzbWWxTrxBaUINvU",
        authDomain: "sinu-nova-urbano.firebaseapp.com",
        projectId: "sinu-nova-urbano",
        storageBucket: "sinu-nova-urbano.firebasestorage.app",
        messagingSenderId: "984651974634",
        appId: "1:984651974634:web:f1108efa92e11e90161493",
        measurementId: "G-LZ4R7S6EPG"
    };

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Attach instances to the global object
    window.SINU_APP.auth = auth;
    window.SINU_APP.db = db;
    // -- END: Firebase Configuration --

    let currentUserRole = null;
    let showZeroQuantityItems = false;
    let currentSiteFilter = 'all'; // <-- ADD THIS LINE

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
    const historyModal = document.getElementById('history-modal');
    const historyModalTitle = document.getElementById('history-modal-title');
    const historyModalContent = document.getElementById('history-modal-content');
    const closeHistoryModalButton = document.getElementById('close-history-modal-button');
    const editItemModal = document.getElementById('edit-item-modal');
    const editItemForm = document.getElementById('edit-item-form');
    const editItemModalTitle = document.getElementById('edit-item-modal-title');
    const cancelEditItemButton = document.getElementById('cancel-edit-item-button');
    const editItemIdInput = document.getElementById('edit-item-id');
    const editItemSiteIdInput = document.getElementById('edit-item-site-id');
    const editItemSiteNameInput = document.getElementById('edit-item-site-name');
    const adjustQuantityModal = document.getElementById('adjust-quantity-modal');
    const adjustQuantityForm = document.getElementById('adjust-quantity-form');
    const adjustQuantityModalTitle = document.getElementById('adjust-quantity-modal-title');
    const adjustQuantityItemNameDisplay = document.getElementById('adjust-quantity-item-name');
    const cancelAdjustQuantityButton = document.getElementById('cancel-adjust-quantity-button');
    const adjustItemIdInput = document.getElementById('adjust-item-id');
    const adjustItemSiteIdInput = document.getElementById('adjust-item-site-id');
    const adjustItemSiteNameInput = document.getElementById('adjust-item-site-name');
    const adjustItemCurrentQuantityInput = document.getElementById('adjust-item-current-quantity');
    const currentItemQuantityDisplay = document.getElementById('current-item-quantity-display');
    const transferItemModal = document.getElementById('transfer-item-modal');
    const transferItemForm = document.getElementById('transfer-item-form');
    const transferItemModalTitle = document.getElementById('transfer-item-modal-title');
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
    const toggleZeroQtyCheckbox = document.getElementById('toggle-zero-qty');
    // Maintenance modal elements
    const maintenanceModal = document.getElementById('maintenance-modal');
    const maintenanceModalTitle = document.getElementById('maintenance-modal-title');
    const maintenanceModalContent = document.getElementById('maintenance-modal-content');
    const closeMaintenanceModalButton = document.getElementById('close-maintenance-modal-button');
    const addMaintenanceEntryBtn = document.getElementById('add-maintenance-entry-btn');
    const exportMaintenancePdfBtn = document.getElementById('export-maintenance-pdf');
    const addMaintenanceModal = document.getElementById('add-maintenance-modal');
    const addMaintenanceForm = document.getElementById('add-maintenance-form');
    const cancelAddMaintenanceButton = document.getElementById('cancel-add-maintenance-button');
    // Export History
    const exportHistoryPdfBtn = document.getElementById('export-history-pdf');

    // --- Initial Page Setup ---
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // --- UI State Functions ---


    // --- Global Search Functions ---
    const searchInput = document.getElementById('global-search-input');
    const searchResultsContainer = document.getElementById('global-search-results');

    let allItemsCache = []; // Cache items to avoid re-fetching
    let sitesCache = {}; // Cache site names

    async function primeSearchCache() {
        if (!auth.currentUser) return; // Don't run if not logged in
        
        try {
            // Fetch all items once when the dashboard loads
            const inventorySnapshot = await db.collection("inventoryItems").get();
            allItemsCache = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Fetch all sites once
            const sitesSnapshot = await db.collection("constructionSites").get();
            sitesCache = {}; // Clear previous cache
            sitesSnapshot.forEach(doc => {
                sitesCache[doc.id] = doc.data().name;
            });
            console.log("Search cache primed successfully.");
        } catch(error) {
            console.error("Error priming search cache:", error);
            // Optionally display an error to the user in the search results area
            if(searchResultsContainer) searchResultsContainer.innerHTML = `<p class="text-red-500">Error al inicializar la búsqueda.</p>`
        }
    }

    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            if (query.length < 3) {
                searchResultsContainer.innerHTML = '';
                return;
            }

            const results = allItemsCache.filter(item => {
                const nameMatch = item.itemName?.toLowerCase().includes(query);
                const serialMatch = item.serialModel?.toLowerCase().includes(query);
                const nuiMatch = item.nui?.toLowerCase().includes(query);
                return nameMatch || serialMatch || nuiMatch;
            });

            displaySearchResults(results);
        });
    }

    function displaySearchResults(results) {
        if (!searchResultsContainer) return;
        if (results.length === 0) {
            searchResultsContainer.innerHTML = '<p class="text-nova-gray">No se encontraron resultados.</p>';
            return;
        }

        let resultsHTML = '<ul class="space-y-2">';
        results.forEach(item => {
            const siteName = sitesCache[item.siteId] || 'Ubicación desconocida';
            const escapedItemName = item.itemName?.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) || 'Ítem sin nombre';

            resultsHTML += `
                <li class="p-3 bg-nova-gray-light rounded-md border border-gray-200">
                    <p class="font-semibold text-nova-green-dark">${escapedItemName}</p>
                    <p class="text-sm">NUI: ${item.nui || 'N/A'} | Serial: ${item.serialModel || 'N/A'}</p>
                    <p class="text-sm font-bold">Ubicación: <span class="text-nova-green">${siteName}</span></p>
                </li>
            `;
        });
        resultsHTML += '</ul>';
        searchResultsContainer.innerHTML = resultsHTML;
    }

// --- END Global Search Functions ---

    function showAuthSection() {
        authSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
    }

     // --- Filter Button Setup ---
    function setupFilterButtons() {
        const filterContainer = document.getElementById('site-filter-container');
        if (!filterContainer) return;

        filterContainer.addEventListener('click', (e) => {
            if (e.target.matches('.filter-btn')) {
                // Update active style
                filterContainer.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active-filter-btn'));
                e.target.classList.add('active-filter-btn');

                // Update state and reload sites
                currentSiteFilter = e.target.id.replace('filter-', ''); // "all", "obra", or "bodega"
                loadConstructionSites();
            }
        });
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
    // --- Authentication State Observer ---
auth.onAuthStateChanged(async user => {
    if (user) {
        currentUserRole = null; // Reset role on user change
        try {
            const userDocRef = db.collection("users").doc(user.uid);
            const userDoc = await userDocRef.get();

            if (userDoc.exists && userDoc.data().isApproved) {
                const userData = userDoc.data();
                // Correctly determine the user's primary role
                currentUserRole = (userData.roles && userData.roles.length > 0) ? userData.roles[0] : 'espectador';

                const userNameDisplay = (userData.nombre && userData.apellidos) ?
                    `${userData.nombre} ${userData.apellidos}` :
                    user.email || 'Usuario';

                if (dashboardTitle) dashboardTitle.textContent = `Panel de ${userNameDisplay} (${currentUserRole})`;

                // --- NEW LOGIC FOR ADMIN BUTTON ---
                const adminButton = document.getElementById('admin-panel-button');
                if (adminButton) { // Ensure the button exists before adding listeners
                    // First, clone and replace to remove any old listeners
                    const newAdminButton = adminButton.cloneNode(true);
                    adminButton.parentNode.replaceChild(newAdminButton, adminButton);

                    if (currentUserRole === 'admin') {
                        newAdminButton.classList.remove('hidden');
                        newAdminButton.addEventListener('click', () => {
                            document.getElementById('dashboard-section').classList.add('hidden');
                            document.getElementById('admin-section').classList.remove('hidden');
                            
                            // Call the function from admin.js to load users
                            // Ensure admin.js and SINU_APP are loaded
                            if (window.SINU_APP && typeof window.SINU_APP.loadAdminUsers === 'function') {
                                window.SINU_APP.loadAdminUsers();
                            } else {
                                console.error("Admin functions not available.");
                            }
                        });
                    } else {
                        newAdminButton.classList.add('hidden');
                    }
                }
                // --- END OF NEW LOGIC ---

                showDashboardSection();
                setupFilterButtons();
                loadConstructionSites();
                primeSearchCache(); // Initialize the cache for global search

            } else {
                // This handles users who are not approved yet
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
        // This handles when no user is logged in
        currentUserRole = null;
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

    // --- Login/Signup Forms (No Changes) ---
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
                    if (loginErrorEl) loginErrorEl.textContent = getFirebaseAuthErrorMessage(error);
                }
            });
        }
    }

    function renderSignupForm() {
        if (!loginFormContainer) return;
        if (authTitle) authTitle.textContent = 'Crear Nueva Cuenta';
        loginFormContainer.innerHTML = `
            <form id="signup-form" class="space-y-3">
                <div><label for="signup-nombre" class="block text-sm font-medium text-nova-gray-dark">Nombre(s)</label><input type="text" id="signup-nombre" name="nombre" required autocomplete="given-name" class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm"><p class="mt-1 text-xs text-nova-gray">Ej: Alonso</p></div>
                <div><label for="signup-apellidos" class="block text-sm font-medium text-nova-gray-dark">Apellidos</label><input type="text" id="signup-apellidos" name="apellidos" required autocomplete="family-name" class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm"><p class="mt-1 text-xs text-nova-gray">Ej: Quijano Saavedra</p></div>
                <div><label for="signup-cedula" class="block text-sm font-medium text-nova-gray-dark">Número de Cédula</label><input type="text" id="signup-cedula" name="cedula" required class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm"><p class="mt-1 text-xs text-nova-gray">Ej: 1234567890</p></div>
                <div><label for="signup-email" class="block text-sm font-medium text-nova-gray-dark">Correo Electrónico</label><input type="email" id="signup-email" name="email" required autocomplete="email" class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm"></div>
                <div><label for="signup-password" class="block text-sm font-medium text-nova-gray-dark">Contraseña</label><input type="password" id="signup-password" name="password" required autocomplete="new-password" class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm"></div>
                <div><label for="signup-confirm-password" class="block text-sm font-medium text-nova-gray-dark">Confirmar Contraseña</label><input type="password" id="signup-confirm-password" name="confirm-password" required autocomplete="new-password" class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm"></div>
                <div class="text-xs text-nova-gray-dark">La contraseña debe tener al menos 12 caracteres e incluir al menos uno de los siguientes símbolos: & % # "</div>
                <div class="pt-2 flex items-start"><div class="flex items-center h-5"><input id="data-consent" name="dataConsent" type="checkbox" required class="focus:ring-nova-green h-4 w-4 text-nova-green border-gray-300 rounded"></div><div class="ml-3 text-sm"><label for="data-consent" class="font-medium text-nova-gray-dark">Acepto que mis datos sean tratados de acuerdo con la Ley de Protección de Datos de Colombia (Ley 1581 de 2012) y la Política de Tratamiento de Datos de Nova Urbano.</label></div></div>
                <div class="pt-2"><button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nova-green hover:bg-nova-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nova-green-dark transition-colors duration-150">Registrarse</button></div>
            </form>
            <p id="signup-error" class="mt-2 text-center text-sm text-red-600"></p>
        `;
        if (registrationArea) {
            registrationArea.innerHTML = `<p class="text-sm text-nova-gray-dark">¿Ya tienes cuenta? <a href="#" id="show-login-link" class="font-medium text-nova-green hover:text-nova-green-dark">Inicia sesión aquí</a></p>`;
            document.getElementById('show-login-link').addEventListener('click', (e) => {
                e.preventDefault();
                renderLoginForm();
            });
        }
        document.getElementById('signup-form').addEventListener('submit', handleSignupSubmit);
    }

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
        } catch (error) {
            if (signupErrorEl) signupErrorEl.textContent = getFirebaseAuthErrorMessage(error);
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }

    function getFirebaseAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email':
                return 'El formato del correo electrónico no es válido.';
            case 'auth/user-disabled':
                return 'Este usuario ha sido deshabilitado.';
            case 'auth/user-not-found':
                return 'No se encontró cuenta con este correo electrónico.';
            case 'auth/wrong-password':
                return 'Contraseña incorrecta.';
            case 'auth/email-already-in-use':
                return 'Este correo electrónico ya está registrado.';
            case 'auth/weak-password':
                return 'La contraseña es considerada débil por Firebase.';
            case 'auth/requires-recent-login':
                return 'Esta operación requiere autenticación reciente. Vuelve a iniciar sesión.';
            case 'auth/too-many-requests':
                return 'Demasiados intentos. Intenta de nuevo más tarde.';
            default:
                return 'Ocurrió un error. (' + error.message + ')';
        }
    }

    // --- Construction Site Functions (MODIFIED) ---
    function renderAddSiteButton() {
        if (!addSiteFormContainer) return;
        if (currentUserRole === 'oficina') {
            addSiteFormContainer.innerHTML = `
                <button id="show-add-site-form-button" class="bg-nova-green hover:bg-nova-green-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-150">
                    + Añadir Nueva Ubicación
                </button>
            `;
            document.getElementById('show-add-site-form-button').addEventListener('click', renderAddSiteForm);
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
                <h4 class="text-lg font-semibold text-nova-green-dark mb-3">Detalles de la Nueva Ubicación</h4>
                <div>
                    <label for="site-type" class="block text-sm font-medium text-nova-gray-dark">Tipo de Ubicación</label>
                    <select id="site-type" name="siteType" required class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                        <option value="obra">Obra</option>
                        <option value="bodega">Bodega</option>
                    </select>
                </div>
                <div>
                    <label for="site-name" class="block text-sm font-medium text-nova-gray-dark">Nombre de la Ubicación</label>
                    <input type="text" id="site-name" name="siteName" required class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                </div>
                <div>
                    <label for="site-address" class="block text-sm font-medium text-nova-gray-dark">Dirección (Opcional)</label>
                    <input type="text" id="site-address" name="siteAddress" class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm">
                </div>
                <div class="flex space-x-3">
                    <button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nova-green hover:bg-nova-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nova-green-dark transition-colors duration-150">
                        Guardar Ubicación
                    </button>
                    <button type="button" id="cancel-add-site" class="w-full flex justify-center py-2 px-4 border border-nova-gray rounded-md shadow-sm text-sm font-medium text-nova-gray-dark bg-white hover:bg-nova-gray-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nova-gray transition-colors duration-150">
                        Cancelar
                    </button>
                </div>
                <p id="add-site-error" class="mt-2 text-center text-sm text-red-600"></p>
            </form>
        `;
        document.getElementById('add-site-form').addEventListener('submit', handleAddSiteSubmit);
        document.getElementById('cancel-add-site').addEventListener('click', renderAddSiteButton);
    }

    async function handleAddSiteSubmit(event) {
        event.preventDefault();
        if (currentUserRole !== 'oficina') return;

        const form = event.target;
        const siteType = form.elements['siteType'].value; // Changed
        const siteName = form.elements['siteName'].value.trim();
        const siteAddress = form.elements['siteAddress'].value.trim();
        const errorElement = document.getElementById('add-site-error');
        if (errorElement) errorElement.textContent = '';

        if (!siteName || !siteType) {
            if (errorElement) errorElement.textContent = 'El tipo y nombre de la ubicación son obligatorios.';
            return;
        }
        const user = auth.currentUser;
        if (!user) {
            if (errorElement) errorElement.textContent = 'Error de autenticación.';
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';

        try {
            await db.collection("constructionSites").add({
                type: siteType, // Added type field
                name: siteName,
                address: siteAddress,
                createdBy: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            renderAddSiteButton();
            loadConstructionSites();
        } catch (error) {
            if (errorElement) errorElement.textContent = `Error al añadir ubicación: ${error.message}`;
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }

    async function loadConstructionSites() {
        if (!sitesListContainer) return;
        sitesListContainer.innerHTML = '<p class="text-nova-gray p-4">Cargando ubicaciones...</p>';
        const user = auth.currentUser;
        if (!user) return;

        try {
            // Start with the base query
            let query = db.collection("constructionSites");

            // Conditionally add the filter
            if (currentSiteFilter !== 'all') {
                query = query.where("type", "==", currentSiteFilter);
            }

            // Add ordering and get the documents
            const sitesSnapshot = await query.orderBy("createdAt", "desc").get();

            if (sitesSnapshot.empty) {
                let message = 'No hay ubicaciones registradas en el sistema.';
                if (currentSiteFilter === 'obra') {
                    message = `No hay obras registradas.`;
                } else if (currentSiteFilter === 'bodega') {
                    message = `No hay bodegas registradas.`;
                }
                sitesListContainer.innerHTML = `<p class="text-nova-gray p-4">${message}</p>`;
                return;
            }

            let sitesHTML = '<ul class="space-y-3">';
            sitesSnapshot.forEach(doc => {
                const site = doc.data();
                const siteType = site.type === 'bodega' ? 'Bodega' : 'Obra';
                const escapedSiteName = site.name.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
                const escapedSiteAddress = site.address ? site.address.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : '';
                sitesHTML += `
                    <li class="bg-nova-gray-light hover:bg-gray-200 p-4 rounded-lg shadow cursor-pointer transition-colors duration-150 flex justify-between items-center" data-site-id="${doc.id}" data-site-name="${escapedSiteName}">
                        <div>
                            <h4 class="text-lg text-nova-green-dark">${escapedSiteName} <span class="text-sm text-nova-gray-dark">(${siteType})</span></h4>
                            ${escapedSiteAddress ? `<p class="text-sm text-nova-gray-dark">${escapedSiteAddress}</p>` : ''}
                        </div>
                        <span class="text-nova-green text-xl font-bold">&rarr;</span>
                    </li>
                `;
            });
            sitesHTML += '</ul>';
            sitesListContainer.innerHTML = sitesHTML;

            // Re-attach listeners
            document.querySelectorAll('#sites-list li').forEach(item => {
                item.addEventListener('click', () => {
                    const siteId = item.dataset.siteId;
                    const siteName = item.dataset.siteName;
                    showInventoryForSite(siteId, siteName);
                });
            });
        } catch (error) {
            let errorMessage = `Error al cargar las ubicaciones: ${error.message}.`;
            if (error.message.includes("The query requires an index")) {
                errorMessage += ` <b>Acción Requerida:</b> Debe crear un índice compuesto en Firestore. Busque un enlace en la consola de errores del navegador (F12) para crearlo.`;
            }
            sitesListContainer.innerHTML = `<p class="text-red-500 p-4">${errorMessage}</p>`;
        }
    }

    // --- Inventory UI Transition and Item Functions (MODIFIED) ---
    function showInventoryForSite(siteId, siteName) {
        if (sitesSection) sitesSection.classList.add('hidden');
        if (inventorySection) inventorySection.classList.remove('hidden');
        if (selectedSiteNameSpan) selectedSiteNameSpan.textContent = siteName;
        // Store site context on a DOM element for the toggle to find
        inventorySection.dataset.currentSiteId = siteId;
        inventorySection.dataset.currentSiteName = siteName;
        loadInventoryItems(siteId, siteName);
        renderAddInventoryItemButton(siteId, siteName);

        const exportButton = document.getElementById('export-csv-button');
            if (exportButton) {
            const newExportButton = exportButton.cloneNode(true);
            exportButton.parentNode.replaceChild(newExportButton, exportButton);
            newExportButton.addEventListener('click', exportInventoryToCsv);
        }
    }

    if (backToSitesButton) {
        backToSitesButton.addEventListener('click', showSitesView);
    }

    async function loadInventoryItems(siteId, siteName) {
        if (!inventoryListContainer) {
            return;
        }
        // Switched to table view
        inventoryListContainer.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ítem</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial/Modelo</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th scope="col" class="relative px-6 py-3"><span class="sr-only">Acciones</span></th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Cargando inventario para ${siteName}...</td></tr>
                </tbody>
            </table>`;

        const tableBody = inventoryListContainer.querySelector('tbody');
        if (!tableBody) return;

        const user = auth.currentUser;
        if (!user) {
            tableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-red-500">Error: Usuario no autenticado.</td></tr>';
            return;
        }

        try {
            const inventorySnapshot = await db.collection("inventoryItems")
                .where("siteId", "==", siteId)
                .orderBy("itemName", "asc")
                .get();

            let itemsHTML = '';
            let itemsToDisplay = 0;

            inventorySnapshot.forEach(doc => {
                const item = doc.data();
                const itemId = doc.id;

                if (item.quantity === 0 && !showZeroQuantityItems) {
                    return;
                }
                itemsToDisplay++;

                const escapedItemName = item.itemName ? item.itemName.replace(/[&<>"']/g, char => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                } [char])) : 'Ítem sin nombre';
                const escapedUnit = item.unit ? item.unit.replace(/[&<>"']/g, char => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                } [char])) : '';
                const escapedSerialModel = item.serialModel ? item.serialModel.replace(/[&<>"']/g, char => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                } [char])) : 'N/A';
                const escapedCondition = item.condition ? item.condition.replace(/[&<>"']/g, char => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                } [char])) : 'N/A';
                const zeroQtyClass = item.quantity === 0 ? 'opacity-60' : '';

                itemsHTML += `
                    <tr class="${zeroQtyClass}" data-item-id="${itemId}">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">${escapedItemName}</div>
                            <div class="text-xs text-gray-500">NUI: ${item.nui || 'N/A'}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.quantity !== undefined ? item.quantity : 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${escapedUnit}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${escapedSerialModel}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${escapedCondition}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div class="flex space-x-2">
                                ${currentUserRole === 'oficina' ? `
                                    <button class="edit-item-btn text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded" data-item-id="${itemId}" data-site-id="${siteId}" data-site-name="${siteName}">Editar</button>
                                    <button class="adjust-quantity-btn text-xs bg-green-500 hover:bg-green-600 text-white py-1 px-2 rounded" data-item-id="${itemId}" data-site-id="${siteId}" data-site-name="${siteName}" data-item-name="${escapedItemName}" data-current-quantity="${item.quantity}">Ajustar Cant.</button>
                                    <button class="transfer-item-btn text-xs bg-yellow-500 hover:bg-yellow-600 text-black py-1 px-2 rounded" data-item-id="${itemId}" data-site-id="${siteId}" data-site-name="${siteName}">Transferir</button>
                                ` : ''}
                                <button class="view-history-btn text-xs bg-gray-400 hover:bg-gray-500 text-white py-1 px-2 rounded" data-item-id="${itemId}" data-item-name="${escapedItemName}">Historial</button>
                                <button class="maintenance-log-btn text-xs bg-orange-500 hover:bg-orange-600 text-white py-1 px-2 rounded" data-item-id="${itemId}" data-item-name="${escapedItemName}" data-site-id="${siteId}" data-site-name="${siteName}">Bitácora</button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            if (inventorySnapshot.empty || itemsToDisplay === 0) {
                let noItemsMessage = `<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">No hay ítems de inventario para esta ubicación (${siteName}).</td></tr>`;
                if (!inventorySnapshot.empty && itemsToDisplay === 0) {
                    noItemsMessage = `<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Todos los ítems tienen cantidad cero. Active "Mostrar ítems sin stock" para verlos.</td></tr>`;
                }
                tableBody.innerHTML = noItemsMessage;
            } else {
                tableBody.innerHTML = itemsHTML;
            }

            // Re-attach event listeners
            if (currentUserRole === 'oficina') {
                document.querySelectorAll('.edit-item-btn').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        const itemId = e.target.dataset.itemId;
                        const siteId = e.target.dataset.siteId;
                        const siteName = e.target.dataset.siteName;
                        try {
                            const itemDoc = await db.collection("inventoryItems").doc(itemId).get();
                            if (itemDoc.exists) renderEditItemForm(itemId, itemDoc.data(), siteId, siteName);
                            else alert("Error: Ítem no encontrado.");
                        } catch (error) {
                            alert("Error al cargar datos del ítem para editar.");
                        }
                    });
                });
                document.querySelectorAll('.adjust-quantity-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const itemId = e.target.dataset.itemId;
                        const siteId = e.target.dataset.siteId;
                        const siteName = e.target.dataset.siteName;
                        const itemName = e.target.dataset.itemName;
                        const currentQuantity = parseFloat(e.target.dataset.currentQuantity);
                        renderAdjustQuantityForm(itemId, itemName, currentQuantity, siteId, siteName);
                    });
                });
                document.querySelectorAll('.transfer-item-btn').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        const itemId = e.target.dataset.itemId;
                        const siteId = e.target.dataset.siteId;
                        const siteName = e.target.dataset.siteName;
                        try {
                            const itemDoc = await db.collection("inventoryItems").doc(itemId).get();
                            if (itemDoc.exists) renderTransferItemForm(itemId, itemDoc.data(), siteId, siteName);
                            else alert("Error: Ítem no encontrado.");
                        } catch (error) {
                            alert("Error al cargar datos del ítem para transferir.");
                        }
                    });
                });
            }
            document.querySelectorAll('.view-history-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const itemId = e.target.dataset.itemId;
                    const itemName = e.target.dataset.itemName;
                    showItemHistory(itemId, itemName);
                });
            });

            document.querySelectorAll('.maintenance-log-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const itemId = e.target.dataset.itemId;
                    const itemName = e.target.dataset.itemName;
                    const siteId = e.target.dataset.siteId;
                    const siteName = e.target.dataset.siteName;
                    showMaintenanceLog(itemId, itemName, siteId, siteName);
                });
            });
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-red-500">Error al cargar el inventario: ${error.message}.</td></tr>`;
            if (error.message.includes("index")) {
                tableBody.innerHTML += `<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-red-400">Es posible que necesite crear un índice compuesto en Firestore.</td></tr>`;
            }
        }
    }

    async function exportInventoryToCsv() {
    const siteId = inventorySection.dataset.currentSiteId;
    const siteName = inventorySection.dataset.currentSiteName;

    if (!siteId) {
        alert("No se ha seleccionado una ubicación para exportar.");
        return;
    }

    try {
        const inventorySnapshot = await db.collection("inventoryItems")
            .where("siteId", "==", siteId)
            .orderBy("itemName", "asc")
            .get();

        if (inventorySnapshot.empty) {
            alert(`No hay ítems de inventario para exportar en ${siteName}.`);
            return;
        }

        const headers = [
            "NUI",
            "Nombre del Ítem",
            "Cantidad",
            "Unidad",
            "Serial/Modelo",
            "Estado",
            "Observaciones",
            "Estatus",
            "Última Actualización"
        ];

        // --- INICIO DE LA SECCIÓN MEJORADA ---

        // Función auxiliar para formatear cada campo de forma segura para CSV
        const toCsvField = (value) => {
            const stringValue = String(value === undefined || value === null ? '' : value);
            // Si el valor contiene comas, comillas o saltos de línea, lo encapsulamos entre comillas dobles.
            // También, duplicamos cualquier comilla doble que ya exista dentro del valor.
            if (/[",\n\r]/.test(stringValue)) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        const rows = inventorySnapshot.docs.map(doc => {
            const item = doc.data();
            
            // 1. Formatear la fecha a un estándar sin comas (YYYY-MM-DD HH:MM:SS)
            let lastUpdated = 'N/A';
            if (item.lastUpdatedAt && item.lastUpdatedAt.toDate) {
                const d = item.lastUpdatedAt.toDate();
                const pad = (num) => String(num).padStart(2, '0');
                lastUpdated = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            }
            
            // 2. Mapear los datos a un array
            const rowData = [
                item.nui,
                item.itemName,
                item.quantity,
                item.unit,
                item.serialModel,
                item.condition, // Este es el campo que daba problemas
                item.description,
                item.status,
                lastUpdated
            ];

            // 3. Aplicar el formato seguro a cada campo y luego unirlos
            return rowData.map(toCsvField).join(',');
        });

        // --- FIN DE LA SECCIÓN MEJORADA ---

        const csvContent = [headers.join(','), ...rows].join('\n');
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); 
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const safeSiteName = siteName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `inventario_${safeSiteName}_${new Date().toISOString().slice(0, 10)}.csv`;
        
        downloadCsv(blob, fileName);

    } catch (error) {
        console.error("Error al exportar a CSV:", error);
        alert(`Error al exportar los datos: ${error.message}`);
    }
}

    /**
     * Dispara la descarga de un archivo en el navegador.
     * @param {Blob} blob El contenido del archivo como un objeto Blob.
     * @param {string} fileName El nombre del archivo a descargar.
     */
    function downloadCsv(blob, fileName) {
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // --- Transfer Item Functions (MODIFIED TO MIMIC ORIGINAL) ---
    async function renderTransferItemForm(itemId, itemData, sourceSiteId, sourceSiteName) {
        if (!transferItemModal || !transferItemForm || currentUserRole !== 'oficina') {
            return;
        }

        if (transferItemIdInput) transferItemIdInput.value = itemId;
        if (transferSourceSiteIdInput) transferSourceSiteIdInput.value = sourceSiteId;
        if (transferSourceSiteNameInput) transferSourceSiteNameInput.value = sourceSiteName;
        if (transferItemCurrentQuantityInput) transferItemCurrentQuantityInput.value = itemData.quantity;
        if (transferSourceItemDataJsonInput) transferSourceItemDataJsonInput.value = JSON.stringify(itemData);

        const escapedItemName = itemData.itemName ? itemData.itemName.replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        } [char])) : 'Ítem Desconocido';
        if (transferItemNameDisplay) transferItemNameDisplay.textContent = `Ítem: ${escapedItemName}`;
        if (transferItemSiteOriginDisplay) transferItemSiteOriginDisplay.textContent = `Desde Ubicación: ${sourceSiteName}`;
        if (transferCurrentQuantityDisplay) transferCurrentQuantityDisplay.value = itemData.quantity;

        const quantityToTransferEl = transferItemForm.elements['quantityToTransfer'];
        const destinationSiteEl = transferItemForm.elements['destinationSiteId'];
        const transferReasonEl = transferItemForm.elements['transferReason'];
        const errorElement = document.getElementById('transfer-item-error');

        if (quantityToTransferEl) {
            quantityToTransferEl.value = '1'; // Default to 1
            quantityToTransferEl.max = itemData.quantity;
        }
        if (destinationSiteEl) destinationSiteEl.innerHTML = '<option value="">Cargando destinos...</option>';
        if (transferReasonEl) transferReasonEl.value = '';
        if (errorElement) errorElement.textContent = '';

        let optionsHTML = '<option value="">Seleccione destino...</option>';
        try {
            // This is the key change: Fetch ALL sites, not just obras
            const sitesSnapshot = await db.collection("constructionSites").orderBy("name", "asc").get();
            sitesSnapshot.forEach(doc => {
                if (doc.id !== sourceSiteId) {
                    const site = doc.data();
                    const siteType = site.type === 'bodega' ? 'Bodega' : 'Obra';
                    const escapedOptionSiteName = site.name.replace(/[&<>"']/g, char => ({
                        '&': '&amp;',
                        '<': '&lt;',
                        '>': '&gt;',
                        '"': '&quot;',
                        "'": '&#39;'
                    } [char]));
                    optionsHTML += `<option value="${doc.id}">${escapedOptionSiteName} (${siteType})</option>`;
                }
            });
            if (destinationSiteEl) destinationSiteEl.innerHTML = optionsHTML;
        } catch (error) {
            if (destinationSiteEl) destinationSiteEl.innerHTML = '<option value="">Error al cargar destinos</option>';
        }

        transferItemModal.classList.remove('hidden');
        if (quantityToTransferEl) quantityToTransferEl.focus();

        const submitButton = transferItemForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Transferir";
        }
    }

    async function handleTransferItemSubmit(event, itemId, sourceItemData, sourceSiteId, sourceSiteName) {
        event.preventDefault();
        if (currentUserRole !== 'oficina') return;

        const form = event.target;
        const quantityToTransferStr = form.elements['quantityToTransfer'].value;
        const destinationSiteId = form.elements['destinationSiteId'].value;
        const reason = form.elements['transferReason'].value.trim();
        const errorElement = document.getElementById('transfer-item-error');
        if (errorElement) errorElement.textContent = '';
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;

        if (!quantityToTransferStr || !destinationSiteId || !reason) {
            if (errorElement) errorElement.textContent = 'Cantidad, destino y motivo son obligatorios.';
            return;
        }
        const quantityToTransfer = parseFloat(quantityToTransferStr);
        if (isNaN(quantityToTransfer) || quantityToTransfer <= 0) {
            if (errorElement) errorElement.textContent = 'La cantidad a transferir debe ser un número positivo.';
            return;
        }
        const currentSourceQuantity = parseFloat(sourceItemData.quantity);
        if (isNaN(currentSourceQuantity) || quantityToTransfer > currentSourceQuantity) {
            if (errorElement) errorElement.textContent = `No puede transferir más de la cantidad actual (${currentSourceQuantity}).`;
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            if (errorElement) errorElement.textContent = 'Error de autenticación.';
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Transfiriendo...';

        try {
            let performingUserName = "Usuario Desconocido",
                performingUserApellidos = "",
                performingUserCedula = "";
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
            const itemNUI = sourceItemData.nui;

            const sourceItemRef = db.collection("inventoryItems").doc(itemId);
            const newSourceQuantity = currentSourceQuantity - quantityToTransfer;

            batch.update(sourceItemRef, {
                quantity: newSourceQuantity,
                lastUpdatedAt: timestamp
            });

            const sourceHistoryRef = sourceItemRef.collection("history").doc();
            batch.set(sourceHistoryRef, {
                timestamp: timestamp,
                userId: user.uid,
                userName: performingUserName,
                userApellidos: performingUserApellidos,
                userCedula: performingUserCedula,
                nui: itemNUI,
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

            const destinationItemsQuery = db.collection("inventoryItems")
                .where("siteId", "==", destinationSiteId)
                .where("nui", "==", itemNUI);

            const destinationItemsSnapshot = await destinationItemsQuery.get();
            let destinationItemRef;
            let destinationItemAction = "";
            let destinationItemNotes = "";
            let finalDestinationQuantity;

            if (!destinationItemsSnapshot.empty) {
                const existingDestinationItemDoc = destinationItemsSnapshot.docs[0];
                destinationItemRef = existingDestinationItemDoc.ref;
                const currentDestinationQuantity = parseFloat(existingDestinationItemDoc.data().quantity);
                finalDestinationQuantity = currentDestinationQuantity + quantityToTransfer;

                batch.update(destinationItemRef, {
                    quantity: finalDestinationQuantity,
                    lastUpdatedAt: timestamp,
                    status: "Disponible"
                });
                destinationItemAction = "TRANSFERENCIA_ENTRADA";
                destinationItemNotes = `Cantidad incrementada por transferencia de ${quantityToTransfer} ${sourceItemData.unit || ''} de "${sourceItemData.itemName}" (NUI: ${itemNUI}) desde "${sourceSiteName}".`;
            } else {
                destinationItemRef = db.collection("inventoryItems").doc();
                finalDestinationQuantity = quantityToTransfer;
                batch.set(destinationItemRef, {
                    nui: itemNUI,
                    itemName: sourceItemData.itemName,
                    unit: sourceItemData.unit,
                    serialModel: sourceItemData.serialModel,
                    condition: sourceItemData.condition,
                    description: sourceItemData.description,
                    quantity: quantityToTransfer,
                    initialQuantity: quantityToTransfer,
                    siteId: destinationSiteId,
                    createdBy: user.uid,
                    createdAt: timestamp,
                    lastUpdatedAt: timestamp,
                    status: "Disponible",
                });
                destinationItemAction = "CREADO_POR_TRANSFERENCIA";
                destinationItemNotes = `Recepción de ${quantityToTransfer} ${sourceItemData.unit || ''} de "${sourceItemData.itemName}" (NUI: ${itemNUI}) desde "${sourceSiteName}".`;
            }

            const destinationHistoryRef = destinationItemRef.collection("history").doc();
            batch.set(destinationHistoryRef, {
                timestamp: timestamp,
                userId: user.uid,
                userName: performingUserName,
                userApellidos: performingUserApellidos,
                userCedula: performingUserCedula,
                nui: itemNUI,
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
            if (transferItemModal) transferItemModal.classList.add('hidden');
            loadInventoryItems(sourceSiteId, sourceSiteName);

        } catch (error) {
            if (errorElement) errorElement.textContent = `Error al transferir ítem: ${error.message}`;
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }

    // --- Other Functions (No Changes) ---
    // Includes renderAddInventoryItemButton, renderAddInventoryItemForm, handleAddInventoryItemSubmit,
    // renderEditItemForm, handleEditItemSubmit, renderAdjustQuantityForm, handleAdjustQuantitySubmit,
    // showItemHistory, formatLogDetails, and all their event listeners.
    // The original code for these functions is sound and does not need modification for the requested features.
    
    // --- Add/Edit/Adjust/History functions from original code (No changes needed)
    function renderAddInventoryItemButton(siteId, siteName) {
        if (!addItemFormContainer) return;
        if (currentUserRole === 'oficina') {
            addItemFormContainer.innerHTML = `<button id="show-add-item-form-btn" class="bg-nova-green hover:bg-nova-green-dark text-white font-bold py-2 px-4 rounded transition-colors duration-150">+ Añadir Ítem de Inventario</button>`;
            document.getElementById('show-add-item-form-btn').addEventListener('click', () => renderAddInventoryItemForm(siteId, siteName));
        } else {
            addItemFormContainer.innerHTML = '';
        }
    }

    function renderAddInventoryItemForm(siteId, siteName) {
        if (!addItemFormContainer || currentUserRole !== 'oficina') {
            if (addItemFormContainer) addItemFormContainer.innerHTML = '';
            return;
        }
        const escapedSiteName = siteName.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
        addItemFormContainer.innerHTML = `<form id="add-inventory-item-form" class="space-y-4 bg-nova-gray-light p-4 rounded-md shadow-inner mb-6"> <h4 class="text-lg font-semibold text-nova-green-dark mb-3">Añadir Nuevo Ítem a: ${escapedSiteName}</h4> <div> <label for="item-name" class="block text-sm font-medium text-nova-gray-dark">Equipo/Maquinaria (Nombre del Ítem)</label> <input type="text" id="item-name" name="itemName" required class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm"> </div> <div class="grid grid-cols-1 md:grid-cols-3 gap-4"> <div> <label for="item-quantity" class="block text-sm font-medium text-nova-gray-dark">Cantidad Actual (Inicial)</label> <input type="number" id="item-quantity" name="itemQuantity" required min="0" step="any" class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm"> </div> <div> <label for="item-unit" class="block text-sm font-medium text-nova-gray-dark">Unidad</label> <input type="text" id="item-unit" name="itemUnit" required placeholder="Ej: bolsas, kg, mts, und." class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm"> </div> <div> <label for="item-serial-model" class="block text-sm font-medium text-nova-gray-dark">Serial/Modelo</label> <input type="text" id="item-serial-model" name="itemSerialModel" class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm"> </div> </div> <div> <label for="item-condition" class="block text-sm font-medium text-nova-gray-dark">Estado</label> <input type="text" id="item-condition" name="itemCondition" placeholder="Ej: Buen Estado, Por Reparar" class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm"> </div> <div> <label for="item-description" class="block text-sm font-medium text-nova-gray-dark">Observaciones</label> <textarea id="item-description" name="itemDescription" rows="2" class="mt-1 block w-full px-3 py-2 border border-nova-gray rounded-md shadow-sm focus:outline-none focus:ring-nova-green focus:border-nova-green sm:text-sm"></textarea> </div> <div class="flex space-x-3 pt-2"> <button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nova-green hover:bg-nova-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nova-green-dark transition-colors duration-150"> Guardar Ítem </button> <button type="button" id="cancel-add-item" class="w-full flex justify-center py-2 px-4 border border-nova-gray rounded-md shadow-sm text-sm font-medium text-nova-gray-dark bg-white hover:bg-nova-gray-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nova-gray transition-colors duration-150"> Cancelar </button> </div> <p id="add-item-error" class="mt-2 text-center text-sm text-red-600"></p> </form>`;
        document.getElementById('add-inventory-item-form').addEventListener('submit', (event) => handleAddInventoryItemSubmit(event, siteId, siteName));
        document.getElementById('cancel-add-item').addEventListener('click', () => renderAddInventoryItemButton(siteId, siteName));
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
            const newItemRef = db.collection("inventoryItems").doc();
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            const nui = `NUI-${newItemRef.id.substring(0, 8).toUpperCase()}`;
            const newItemData = {
                nui: nui,
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
                nui: nui,
                action: "CREADO",
                details: {
                    createdWithQuantity: quantity,
                    unit: unit,
                    serialModel: serialModel,
                    condition: condition,
                    notes: `Ítem "${itemName}" (NUI: ${nui}) creado en el sistema en obra "${siteName}".`
                }
            });
            renderAddInventoryItemButton(siteId, siteName);
            loadInventoryItems(siteId, siteName);
        } catch (error) {
            if (errorElement) errorElement.textContent = `Error al guardar el ítem: ${error.message}`;
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }

    function renderEditItemForm(itemId, itemData, siteId, siteName) {
        if (!editItemModal || !editItemForm || currentUserRole !== 'oficina') return;
        editItemIdInput.value = itemId;
        editItemSiteIdInput.value = siteId;
        editItemSiteNameInput.value = siteName;
        editItemForm.elements['itemName'].value = itemData.itemName || '';
        editItemForm.elements['itemUnit'].value = itemData.unit || '';
        editItemForm.elements['itemSerialModel'].value = itemData.serialModel || '';
        editItemForm.elements['itemCondition'].value = itemData.condition || '';
        editItemForm.elements['itemDescription'].value = itemData.description || '';
        editItemForm.dataset.oldData = JSON.stringify(itemData);
        if (editItemModalTitle) editItemModalTitle.textContent = `Editar: ${itemData.itemName?.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) || 'Ítem'}`;
        const errEl = document.getElementById('edit-item-error');
        if (errEl) errEl.textContent = '';
        editItemModal.classList.remove('hidden');
    }

    async function handleEditItemSubmit(event, itemId, oldItemData, siteId, siteName) {
        if (currentUserRole !== 'oficina') return;
        event.preventDefault();
        const form = event.target;
        const errEl = document.getElementById('edit-item-error');
        if (errEl) errEl.textContent = '';
        const updated = {
            itemName: form.elements['itemName'].value.trim(),
            unit: form.elements['itemUnit'].value.trim(),
            serialModel: form.elements['itemSerialModel'].value.trim(),
            condition: form.elements['itemCondition'].value.trim(),
            description: form.elements['itemDescription'].value.trim(),
            lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!updated.itemName || !updated.unit) {
            if (errEl) errEl.textContent = 'Nombre y Unidad son obligatorios.';
            return;
        }
        const user = auth.currentUser;
        if (!user) {
            if (errEl) errEl.textContent = 'Error de autenticación.';
            return;
        }
        const changes = {};
        const oldVals = {};
        const newVals = {};
        let hasChanges = false;
        for (const k in updated) {
            if (k !== 'lastUpdatedAt' && updated[k] !== (oldItemData[k] === undefined ? '' : oldItemData[k])) {
                changes[k] = 1;
                oldVals[k] = oldItemData[k] || '';
                newVals[k] = updated[k];
                hasChanges = true;
            }
        }
        if (!hasChanges) {
            if (errEl) errEl.textContent = 'No se detectaron cambios.';
            setTimeout(() => editItemModal.classList.add('hidden'), 1500);
            return;
        }
        const btn = form.querySelector('button[type="submit"]');
        const btnTxt = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Actualizando...';
        try {
            let pUserName = "N/A",
                pUserApellidos = "",
                pUserCedula = "";
            const uProfile = await db.collection("users").doc(user.uid).get();
            if (uProfile.exists) {
                const d = uProfile.data();
                pUserName = d.nombre || pUserName;
                pUserApellidos = d.apellidos || "";
                pUserCedula = d.cedula || "";
            }
            const itemRef = db.collection("inventoryItems").doc(itemId);
            await itemRef.update(updated);
            await itemRef.collection("history").add({
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userId: user.uid,
                userName: pUserName,
                userApellidos: pUserApellidos,
                userCedula: pUserCedula,
                action: "ITEM_ACTUALIZADO",
                details: {
                    changedFields: Object.keys(changes),
                    oldValues: oldVals,
                    newValues: newVals,
                    notes: `Ítem "${updated.itemName}" actualizado.`
                }
            });
            btn.disabled = false;
            btn.textContent = btnTxt;
            if (editItemModal) editItemModal.classList.add('hidden');
            loadInventoryItems(siteId, siteName);
        } catch (error) {
            if (errEl) errEl.textContent = `Error: ${error.message}`;
            btn.disabled = false;
            btn.textContent = btnTxt;
        }
    }

    function renderAdjustQuantityForm(itemId, itemName, currentQuantity, siteId, siteName) {
        if (!adjustQuantityModal || !adjustQuantityForm || currentUserRole !== 'oficina') return;
        if (adjustItemIdInput) adjustItemIdInput.value = itemId;
        if (adjustItemSiteIdInput) adjustItemSiteIdInput.value = siteId;
        if (adjustItemSiteNameInput) adjustItemSiteNameInput.value = siteName;
        let adjustItemNameInput = document.getElementById('adjust-item-name-hidden');
        if (!adjustItemNameInput) {
            adjustItemNameInput = document.createElement('input');
            adjustItemNameInput.type = 'hidden';
            adjustItemNameInput.id = 'adjust-item-name-hidden';
            adjustQuantityForm.appendChild(adjustItemNameInput);
        }
        adjustItemNameInput.value = itemName;
        if (adjustItemCurrentQuantityInput) adjustItemCurrentQuantityInput.value = currentQuantity;
        if (adjustQuantityItemNameDisplay) adjustQuantityItemNameDisplay.textContent = `Ítem: ${itemName}`;
        if (currentItemQuantityDisplay) currentItemQuantityDisplay.value = currentQuantity;
        const newItemQuantityEl = adjustQuantityForm.elements['newItemQuantity'];
        const adjustmentReasonEl = adjustQuantityForm.elements['adjustmentReason'];
        const errorElement = document.getElementById('adjust-quantity-error');
        if (newItemQuantityEl) newItemQuantityEl.value = '';
        if (adjustmentReasonEl) adjustmentReasonEl.value = '';
        if (errorElement) errorElement.textContent = '';
        adjustQuantityModal.classList.remove('hidden');
        if (newItemQuantityEl) newItemQuantityEl.focus();
    }

    async function handleAdjustQuantitySubmit(event, itemId, oldQuantity, siteId, siteName, itemName) {
        event.preventDefault();
        if (currentUserRole !== 'oficina') return;
        const form = event.target;
        const newQuantityStr = form.elements['newItemQuantity'].value;
        const reason = form.elements['adjustmentReason'].value.trim();
        const errorElement = document.getElementById('adjust-quantity-error');
        if (errorElement) errorElement.textContent = '';
        if (!newQuantityStr || !reason) {
            if (errorElement) errorElement.textContent = 'La nueva cantidad y el motivo son obligatorios.';
            return;
        }
        const newQuantity = parseFloat(newQuantityStr);
        if (isNaN(newQuantity) || newQuantity < 0) {
            if (errorElement) errorElement.textContent = 'La nueva cantidad debe ser un número válido y no negativo.';
            return;
        }
        if (newQuantity === oldQuantity) {
            if (errorElement) errorElement.textContent = 'La nueva cantidad es igual a la actual. No se realizaron cambios.';
            return;
        }
        const user = auth.currentUser;
        if (!user) {
            if (errorElement) errorElement.textContent = 'Error de autenticación.';
            return;
        }
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Ajustando...';
        try {
            let performingUserName = "Usuario Desconocido",
                performingUserApellidos = "",
                performingUserCedula = "";
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
            await itemRef.update({
                quantity: newQuantity,
                lastUpdatedAt: timestamp
            });
            await itemRef.collection("history").add({
                timestamp: timestamp,
                userId: user.uid,
                userName: performingUserName,
                userApellidos: performingUserApellidos,
                userCedula: performingUserCedula,
                action: "CANTIDAD_AJUSTADA",
                details: {
                    oldQuantity: oldQuantity,
                    newQuantity: newQuantity,
                    adjustment: newQuantity - oldQuantity,
                    reason: reason,
                    notes: `Cantidad ajustada para "${itemName || 'ítem desconocido'}" en obra "${siteName}".`
                }
            });
            if (adjustQuantityModal) adjustQuantityModal.classList.add('hidden');
            loadInventoryItems(siteId, siteName);
        } catch (error) {
            if (errorElement) errorElement.textContent = `Error al ajustar cantidad: ${error.message}`;
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }

    async function showItemHistory(itemId, itemName) {
        if (!historyModal || !historyModalTitle || !historyModalContent) {
            return;
        }
        const escapedItemName = itemName ? itemName.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : 'Ítem Desconocido';
        historyModalTitle.textContent = `Historial para: ${escapedItemName}`;
        historyModalContent.innerHTML = '<p class="text-nova-gray p-4">Cargando historial...</p>';
        historyModal.classList.remove('hidden');

        // Store data for PDF export
        historyModal.dataset.itemId = itemId;
        historyModal.dataset.itemName = itemName;
        try {
            const historySnapshot = await db.collection("inventoryItems").doc(itemId).collection("history").orderBy("timestamp", "desc").get();
            if (historySnapshot.empty) {
                historyModalContent.innerHTML = '<p class="text-nova-gray p-4">No hay historial para este ítem.</p>';
                return;
            }
            let historyHTML = '<ul class="space-y-4 text-left">';
            historySnapshot.forEach(doc => {
                const log = doc.data();
                const logDate = log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString('es-CO', {
                    dateStyle: 'long',
                    timeStyle: 'medium'
                }) : 'Fecha desconocida';
                const userDetails = `Usuario: ${log.userName || 'N/A'} ${log.userApellidos || ''} (Cédula: ${log.userCedula || 'N/A'})`;
                const formattedDetails = formatLogDetails(log);
                const nuiDisplayForHistory = log.nui ? `<p class="text-xs text-nova-green-dark font-semibold">NUI: ${log.nui}</p>` : '';
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
        } catch (error) {
            historyModalContent.innerHTML = `<p class="text-red-500 p-4">Error al cargar el historial: ${error.message}</p>`;
        }
    }

    async function exportHistoryToPDF() {
    const itemId = historyModal.dataset.itemId;
    const itemName = historyModal.dataset.itemName;
    
    if (!itemId || !window.jspdf) {
        alert('Error: No se puede generar el PDF.');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        // Create PDF in LANDSCAPE orientation
        const doc = new jsPDF('landscape', 'mm', 'a4');
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(6, 78, 59); // Nova green dark
        doc.text('NOVA URBANO SAS', 148, 20, { align: 'center' }); // Centered for landscape
        
        doc.setFontSize(16);
        doc.text('Historial de Movimientos', 148, 30, { align: 'center' });
        
        // Item info
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Ítem: ${itemName}`, 20, 45);
        
        // Get the item details for more info
        const itemDoc = await db.collection("inventoryItems").doc(itemId).get();
        if (itemDoc.exists) {
            const itemData = itemDoc.data();
            doc.text(`NUI: ${itemData.nui || 'N/A'}`, 20, 52);
            if (itemData.serialModel) {
                doc.text(`Serial/Modelo: ${itemData.serialModel}`, 20, 59);
            }
            
            // Get site name
            const siteDoc = await db.collection("constructionSites").doc(itemData.siteId).get();
            if (siteDoc.exists) {
                doc.text(`Ubicación Actual: ${siteDoc.data().name}`, 20, 66);
            }
        }
        
        // Report metadata - positioned to the right for landscape
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const reportDate = new Date().toLocaleString('es-CO');
        doc.text(`Fecha del reporte: ${reportDate}`, 200, 52);
        
        const currentUser = auth.currentUser;
        let generatedBy = 'Usuario';
        if (currentUser) {
            const userDoc = await db.collection("users").doc(currentUser.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                generatedBy = `${userData.nombre || ''} ${userData.apellidos || ''}`.trim() || currentUser.email;
            }
        }
        doc.text(`Generado por: ${generatedBy}`, 200, 59);
        
        // Get history entries
        const historySnapshot = await db.collection("inventoryItems").doc(itemId).collection("history").orderBy("timestamp", "desc").get();
        
        if (historySnapshot.empty) {
            doc.text('No hay movimientos registrados.', 20, 95);
        } else {
            // Prepare table data
            const tableData = [];
            
            historySnapshot.forEach(doc => {
                const log = doc.data();
                const logDate = log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString('es-CO', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                }) : 'N/A';
                
                const user = `${log.userName || 'N/A'} ${log.userApellidos || ''}`.trim();
                
                // Create a summary of the action
                let actionSummary = log.action || 'Acción desconocida';
                let details = '';
                
                switch (log.action) {
                    case 'CREADO':
                        details = `Cantidad inicial: ${log.details?.createdWithQuantity || 'N/A'} ${log.details?.unit || ''}`;
                        break;
                    case 'CANTIDAD_AJUSTADA':
                        details = `De ${log.details?.oldQuantity || 'N/A'} a ${log.details?.newQuantity || 'N/A'} - ${log.details?.reason || 'Sin motivo'}`;
                        break;
                    case 'TRANSFERENCIA_SALIDA':
                        details = `${log.details?.quantityTransferred || 'N/A'} unidades a ${log.details?.toSiteName || 'N/A'}`;
                        break;
                    case 'TRANSFERENCIA_ENTRADA':
                        details = `${log.details?.quantityReceivedOrUpdated || 'N/A'} unidades desde ${log.details?.fromSiteName || 'N/A'}`;
                        break;
                    case 'ITEM_ACTUALIZADO':
                        details = `Campos: ${(log.details?.changedFields || []).join(', ')}`;
                        break;
                    case 'MANTENIMIENTO_REGISTRADO':
                        details = `Tipo: ${log.details?.type || 'N/A'} - Costo: $${log.details?.cost || 0}`;
                        break;
                    default:
                        details = log.details?.notes || 'Sin detalles';
                }
                
                tableData.push([
                    logDate,
                    actionSummary,
                    details,
                    user,
                    log.userCedula || 'N/A'
                ]);
            });
            
            // Create table - adjusted for landscape
            doc.autoTable({
                startY: 75,
                head: [['Fecha/Hora', 'Acción', 'Detalles', 'Usuario', 'Cédula']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [6, 78, 59], // Nova green dark
                    textColor: 255
                },
                alternateRowStyles: {
                    fillColor: [243, 244, 246] // Nova gray light
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                columnStyles: {
                    0: { cellWidth: 40 },  // Date column
                    1: { cellWidth: 45 },  // Action column
                    2: { cellWidth: 110 }, // Details column - much wider now!
                    3: { cellWidth: 50 },  // User column
                    4: { cellWidth: 25 }   // Cedula column
                },
                margin: { left: 15, right: 15 }
            });
            
            // Add footer note
            const finalY = doc.lastAutoTable.finalY || 150;
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text('Este documento es un registro oficial del sistema SINU - Nova Urbano', 148, finalY + 10, { align: 'center' });
            doc.text(`Los registros de mantenimiento siguen el NUI y están disponibles en todas las ubicaciones`, 148, finalY + 17, { align: 'center' });
        }
        
        // Save the PDF
        const fileName = `Historial_${itemName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);
        
    } catch (error) {
        console.error('Error generating history PDF:', error);
        alert(`Error al generar el PDF: ${error.message}`);
    }
}

    function formatLogDetails(log) {
        if (!log.details || typeof log.details !== 'object' || Object.keys(log.details).length === 0) {
            return '<p class="text-xs text-gray-500 mt-1">No hay detalles adicionales.</p>';
        }
        let detailsHTML = '<ul class="list-none pl-0 text-xs mt-1 text-gray-600 space-y-1">';
        switch (log.action) {
            case "CREADO":
                detailsHTML += `<li><span class="font-medium text-gray-700">Cantidad Inicial:</span> ${log.details.createdWithQuantity !== undefined ? log.details.createdWithQuantity : 'N/A'} ${log.details.unit || ''}</li>`;
                if (log.details.serialModel) detailsHTML += `<li><span class="font-medium text-gray-700">Serial/Modelo:</span> ${log.details.serialModel}</li>`;
                if (log.details.condition) detailsHTML += `<li><span class="font-medium text-gray-700">Estado Inicial:</span> ${log.details.condition}</li>`;
                if (log.details.notes) detailsHTML += `<li><span class="font-medium text-gray-700">Notas:</span> ${log.details.notes}</li>`;
                break;
            case "ITEM_ACTUALIZADO":
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
                break;
            case "CANTIDAD_AJUSTADA":
                detailsHTML += `<li><span class="font-medium text-gray-700">Cantidad Anterior:</span> ${log.details.oldQuantity !== undefined ? log.details.oldQuantity : 'N/A'}</li>`;
                detailsHTML += `<li><span class="font-medium text-gray-700">Nueva Cantidad:</span> ${log.details.newQuantity !== undefined ? log.details.newQuantity : 'N/A'}</li>`;
                if (log.details.adjustment !== undefined) detailsHTML += `<li><span class="font-medium text-gray-700">Ajuste:</span> ${log.details.adjustment > 0 ? '+' : ''}${log.details.adjustment}</li>`;
                if (log.details.reason) detailsHTML += `<li><span class="font-medium text-gray-700">Motivo:</span> ${log.details.reason}</li>`;
                break;
            case "TRANSFERENCIA_SALIDA":
                detailsHTML += `<li><span class="font-medium text-gray-700">Cantidad Transferida:</span> ${log.details.quantityTransferred || 'N/A'}</li>`;
                detailsHTML += `<li><span class="font-medium text-gray-700">Hacia:</span> ${log.details.toSiteName || 'Desconocida'}</li>`;
                if (log.details.reason) detailsHTML += `<li><span class="font-medium text-gray-700">Motivo:</span> ${log.details.reason}</li>`;
                break;
            case "CREADO_POR_TRANSFERENCIA":
            case "TRANSFERENCIA_ENTRADA":
                detailsHTML += `<li><span class="font-medium text-gray-700">Cantidad Recibida:</span> ${log.details.quantityReceivedOrUpdated || 'N/A'}</li>`;
                detailsHTML += `<li><span class="font-medium text-gray-700">Desde:</span> ${log.details.fromSiteName || 'Desconocida'}</li>`;
                if (log.details.reason) detailsHTML += `<li><span class="font-medium text-gray-700">Motivo:</span> ${log.details.reason}</li>`;
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

    // --- Maintenance Log Functions ---
    async function showMaintenanceLog(itemId, itemName, siteId, siteName) {
    if (!maintenanceModal || !maintenanceModalTitle || !maintenanceModalContent) {
        return;
    }
    
    const escapedItemName = itemName ? itemName.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) : 'Ítem Desconocido';
    maintenanceModalTitle.textContent = `Bitácora de Mantenimiento: ${escapedItemName}`;
    maintenanceModalContent.innerHTML = '<p class="text-nova-gray p-4">Cargando bitácora...</p>';
    maintenanceModal.classList.remove('hidden');
    
    // Store data for adding new entries and PDF export
    maintenanceModal.dataset.itemId = itemId;
    maintenanceModal.dataset.itemName = itemName;
    maintenanceModal.dataset.siteId = siteId;
    maintenanceModal.dataset.siteName = siteName;
    
    try {
        // Get item data to find NUI
        const itemDoc = await db.collection("inventoryItems").doc(itemId).get();
        if (!itemDoc.exists) {
            maintenanceModalContent.innerHTML = '<p class="text-red-500 p-4">Error: Ítem no encontrado.</p>';
            return;
        }
        
        const itemData = itemDoc.data();
        const itemNUI = itemData.nui;
        
        // Get maintenance by NUI from global collection
        const maintenanceSnapshot = await db.collection("maintenanceLogs")
            .where("nui", "==", itemNUI)
            .orderBy("serviceDate", "desc")
            .get();
        
        let maintenanceHTML = '';
        
        // Add NUI display
        maintenanceHTML += `
            <div class="mb-4 p-2 bg-gray-100 rounded">
                <p class="text-sm text-gray-700">
                    <strong>NUI:</strong> ${itemNUI} - El historial sigue este identificador único
                </p>
            </div>
        `;
        
        // Add warning note if quantity > 1
        if (itemData.quantity > 1) {
            maintenanceHTML += `
                <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p class="text-sm text-yellow-800">
                        ⚠️ <strong>Nota:</strong> Este ítem tiene cantidad ${itemData.quantity}. 
                        La bitácora aplica al grupo completo.
                    </p>
                </div>
            `;
        }
        
        if (maintenanceSnapshot.empty) {
            maintenanceHTML += '<p class="text-nova-gray p-4">No hay entradas de mantenimiento para este ítem.</p>';
        } else {
            let totalCost = 0;
            
            // Calculate total cost
            maintenanceSnapshot.forEach(doc => {
                const entry = doc.data();
                totalCost += entry.cost || 0;
            });
            
            // Show total cost
            if (totalCost > 0) {
                maintenanceHTML += `
                    <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p class="text-lg font-bold text-yellow-800">Costo Total de Mantenimiento: $${totalCost.toLocaleString('es-CO')}</p>
                    </div>
                `;
            }
            
            maintenanceHTML += '<ul class="space-y-4">';
            
            maintenanceSnapshot.forEach(doc => {
                const entry = doc.data();
                const cost = entry.cost || 0;
                
                const serviceDate = entry.serviceDate ? new Date(entry.serviceDate.seconds * 1000).toLocaleDateString('es-CO') : 'Fecha desconocida';
                const nextServiceDate = entry.nextServiceDate ? new Date(entry.nextServiceDate.seconds * 1000).toLocaleDateString('es-CO') : 'No programado';
                
                const typeLabels = {
                    'preventivo': 'Preventivo',
                    'correctivo': 'Correctivo',
                    'inspeccion': 'Inspección',
                    'reparacion': 'Reparación Mayor'
                };
                
                const typeLabel = typeLabels[entry.type] || entry.type || 'Tipo desconocido';
                const typeColor = entry.type === 'correctivo' || entry.type === 'reparacion' ? 'text-red-600' : 'text-green-600';
                
                maintenanceHTML += `
                    <li class="p-4 bg-nova-gray-light rounded-lg shadow-sm border border-gray-200">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <p class="font-semibold text-nova-green-dark text-lg">${typeLabel}</p>
                                <p class="text-sm text-gray-600">Fecha: ${serviceDate}</p>
                                <p class="text-xs text-gray-500">Realizado en: ${entry.siteName || 'Ubicación no especificada'}</p>
                            </div>
                            <div class="text-right">
                                ${cost > 0 ? `<p class="font-bold text-lg ${typeColor}">$${cost.toLocaleString('es-CO')}</p>` : ''}
                                ${entry.hours ? `<p class="text-xs text-gray-500">${entry.hours}</p>` : ''}
                            </div>
                        </div>
                        <div class="mt-2 space-y-1">
                            <p class="text-sm"><span class="font-medium">Trabajo realizado:</span> ${entry.description || 'No especificado'}</p>
                            <p class="text-sm"><span class="font-medium">Técnico/Proveedor:</span> ${entry.technician || 'No especificado'}</p>
                            ${entry.nextServiceDate ? `<p class="text-sm"><span class="font-medium">Próximo servicio:</span> ${nextServiceDate}</p>` : ''}
                            <p class="text-xs text-gray-500 mt-2">Registrado por: ${entry.userName || 'Usuario'} ${entry.userApellidos || ''}</p>
                        </div>
                    </li>
                `;
            });
            
            maintenanceHTML += '</ul>';
        }
        
        // Success message
        maintenanceHTML += `
            <div class="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p class="text-xs text-green-800">
                    ✅ <strong>Transferencias sin problema:</strong> La bitácora sigue al NUI ${itemNUI}, 
                    así que el historial completo está disponible sin importar dónde esté el equipo.
                </p>
            </div>
        `;
        
        maintenanceModalContent.innerHTML = maintenanceHTML;
        
    } catch (error) {
        maintenanceModalContent.innerHTML = `<p class="text-red-500 p-4">Error al cargar la bitácora: ${error.message}</p>`;
    }
}
    
    function showAddMaintenanceForm() {
        const itemId = maintenanceModal.dataset.itemId;
        const itemName = maintenanceModal.dataset.itemName;
        const siteId = maintenanceModal.dataset.siteId;
        const siteName = maintenanceModal.dataset.siteName;
        
        if (!addMaintenanceModal || !addMaintenanceForm) return;
        
        // Set hidden inputs
        document.getElementById('maintenance-item-id').value = itemId;
        document.getElementById('maintenance-item-name').value = itemName;
        document.getElementById('maintenance-site-id').value = siteId;
        document.getElementById('maintenance-site-name').value = siteName;
        
        // Reset form
        addMaintenanceForm.reset();
        document.getElementById('maintenance-date').value = new Date().toISOString().split('T')[0]; // Today's date
        document.getElementById('add-maintenance-error').textContent = '';
        
        addMaintenanceModal.classList.remove('hidden');
    }
    
    async function handleAddMaintenanceSubmit(event) {
    event.preventDefault();
    if (currentUserRole !== 'oficina') return;
    
    const form = event.target;
    const itemId = document.getElementById('maintenance-item-id').value;
    const itemName = document.getElementById('maintenance-item-name').value;
    const siteId = document.getElementById('maintenance-site-id').value;
    const siteName = document.getElementById('maintenance-site-name').value;
    
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    const errorElement = document.getElementById('add-maintenance-error');
    
    // Clear any previous errors
    if (errorElement) errorElement.textContent = '';
    
    try {
        // Get the NUI from the item
        const itemDoc = await db.collection("inventoryItems").doc(itemId).get();
        if (!itemDoc.exists) {
            if (errorElement) errorElement.textContent = 'Error: Item no encontrado';
            return;
        }
        const itemNUI = itemDoc.data().nui;
        
        const serviceDate = form.elements['maintenanceDate'].value;
        const type = form.elements['maintenanceType'].value;
        const description = form.elements['maintenanceDescription'].value.trim();
        const costStr = form.elements['maintenanceCost'].value;
        const technician = form.elements['maintenanceTechnician'].value.trim();
        const hours = form.elements['maintenanceHours'].value.trim();
        const nextServiceDate = form.elements['nextMaintenanceDate'].value;
        
        if (!serviceDate || !type || !description || !technician) {
            if (errorElement) errorElement.textContent = 'Por favor complete todos los campos obligatorios.';
            return;
        }
        
        const cost = costStr ? parseFloat(costStr) : 0;
        
        const user = auth.currentUser;
        if (!user) {
            if (errorElement) errorElement.textContent = 'Error de autenticación.';
            return;
        }
        
        // Set loading state
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';
        
        let performingUserName = "Usuario Desconocido";
        let performingUserApellidos = "";
        let performingUserCedula = "";
        
        const userProfileSnap = await db.collection("users").doc(user.uid).get();
        if (userProfileSnap.exists) {
            const userData = userProfileSnap.data();
            performingUserName = userData.nombre || performingUserName;
            performingUserApellidos = userData.apellidos || "";
            performingUserCedula = userData.cedula || "";
        }
        
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        // Create maintenance entry in GLOBAL collection
        const maintenanceData = {
            nui: itemNUI, // This is the KEY - maintenance follows NUI
            itemName: itemName, // For reference
            serviceDate: firebase.firestore.Timestamp.fromDate(new Date(serviceDate)),
            type: type,
            description: description,
            cost: cost,
            technician: technician,
            hours: hours,
            siteId: siteId, // Where maintenance was performed
            siteName: siteName,
            userId: user.uid,
            userName: performingUserName,
            userApellidos: performingUserApellidos,
            userCedula: performingUserCedula,
            createdAt: timestamp
        };
        
        if (nextServiceDate) {
            maintenanceData.nextServiceDate = firebase.firestore.Timestamp.fromDate(new Date(nextServiceDate));
        }
        
        // Add to GLOBAL maintenance collection
        await db.collection("maintenanceLogs").add(maintenanceData);
        
        // Still add to history for tracking
        await db.collection("inventoryItems").doc(itemId).collection("history").add({
            timestamp: timestamp,
            userId: user.uid,
            userName: performingUserName,
            userApellidos: performingUserApellidos,
            userCedula: performingUserCedula,
            nui: itemNUI,
            action: "MANTENIMIENTO_REGISTRADO",
            details: {
                type: type,
                serviceDate: serviceDate,
                cost: cost,
                technician: technician,
                notes: `Mantenimiento ${type} realizado. ${description}`
            }
        });
        
        // Update ALL items with this NUI across ALL sites
        const allItemsWithNUI = await db.collection("inventoryItems").where("nui", "==", itemNUI).get();
        const batch = db.batch();
        
        allItemsWithNUI.forEach(doc => {
            batch.update(doc.ref, {
                lastMaintenanceDate: firebase.firestore.Timestamp.fromDate(new Date(serviceDate)),
                nextMaintenanceDate: nextServiceDate ? firebase.firestore.Timestamp.fromDate(new Date(nextServiceDate)) : null,
                lastUpdatedAt: timestamp
            });
        });
        
        await batch.commit();
        
        // SUCCESS: Close modal and refresh
        if (addMaintenanceModal) addMaintenanceModal.classList.add('hidden');
        showMaintenanceLog(itemId, itemName, siteId, siteName); // Refresh the log
        
    } catch (error) {
        console.error('Error saving maintenance record:', error);
        if (errorElement) errorElement.textContent = `Error al guardar: ${error.message}`;
    } finally {
        // ALWAYS reset the button state, regardless of success or error
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}
    
    async function exportMaintenanceToPDF() {
    const itemId = maintenanceModal.dataset.itemId;
    const itemName = maintenanceModal.dataset.itemName;
    const siteId = maintenanceModal.dataset.siteId;
    const siteName = maintenanceModal.dataset.siteName;
    
    if (!itemId || !window.jspdf) {
        alert('Error: No se puede generar el PDF.');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(6, 78, 59); // Nova green dark
        doc.text('NOVA URBANO SAS', 105, 20, { align: 'center' });
        
        doc.setFontSize(16);
        doc.text('Bitácora de Mantenimiento', 105, 30, { align: 'center' });
        
        // Get item details including NUI
        const itemDoc = await db.collection("inventoryItems").doc(itemId).get();
        if (!itemDoc.exists) {
            alert('Error: Ítem no encontrado');
            return;
        }
        
        const itemData = itemDoc.data();
        const itemNUI = itemData.nui;
        
        // Equipment info
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Equipo: ${itemName}`, 20, 45);
        doc.text(`NUI: ${itemNUI}`, 20, 52);
        doc.text(`Ubicación Actual: ${siteName}`, 20, 59);
        
        if (itemData.serialModel) {
            doc.text(`Serial/Modelo: ${itemData.serialModel}`, 20, 66);
        }
        
        // Report metadata
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const reportDate = new Date().toLocaleString('es-CO');
        doc.text(`Fecha del reporte: ${reportDate}`, 20, 73);
        
        const currentUser = auth.currentUser;
        let generatedBy = 'Usuario';
        if (currentUser) {
            const userDoc = await db.collection("users").doc(currentUser.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                generatedBy = `${userData.nombre || ''} ${userData.apellidos || ''}`.trim() || currentUser.email;
            }
        }
        doc.text(`Generado por: ${generatedBy}`, 20, 80);
        
        // Get maintenance entries by NUI
        const maintenanceSnapshot = await db.collection("maintenanceLogs")
            .where("nui", "==", itemNUI)
            .orderBy("serviceDate", "desc")
            .get();
        
        if (maintenanceSnapshot.empty) {
            doc.text('No hay entradas de mantenimiento registradas.', 20, 90);
        } else {
            // Prepare table data
            const tableData = [];
            let totalCost = 0;
            
            maintenanceSnapshot.forEach(doc => {
                const entry = doc.data();
                const cost = entry.cost || 0;
                totalCost += cost;
                
                const serviceDate = entry.serviceDate ? new Date(entry.serviceDate.seconds * 1000).toLocaleDateString('es-CO') : 'N/A';
                const typeLabels = {
                    'preventivo': 'Preventivo',
                    'correctivo': 'Correctivo',
                    'inspeccion': 'Inspección',
                    'reparacion': 'Reparación Mayor'
                };
                
                tableData.push([
                    serviceDate,
                    typeLabels[entry.type] || entry.type || 'N/A',
                    entry.description || 'N/A',
                    entry.technician || 'N/A',
                    entry.siteName || 'N/A', // Where maintenance was done
                    cost > 0 ? `$${cost.toLocaleString('es-CO')}` : '-',
                    entry.hours || '-'
                ]);
            });
            
            // Create table
            doc.autoTable({
                startY: 85,
                head: [['Fecha', 'Tipo', 'Descripción', 'Técnico', 'Ubicación', 'Costo', 'Horas/Km']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [6, 78, 59], // Nova green dark
                    textColor: 255
                },
                alternateRowStyles: {
                    fillColor: [243, 244, 246] // Nova gray light
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2
                },
                columnStyles: {
                    2: { cellWidth: 50 }, // Description column wider
                    5: { halign: 'right' }, // Cost column right-aligned
                    6: { halign: 'center' } // Hours column centered
                }
            });
            
            // Add total cost
            const finalY = doc.lastAutoTable.finalY;
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(`Costo Total de Mantenimiento: $${totalCost.toLocaleString('es-CO')}`, 20, finalY + 10);
            
            // Add NUI note
            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`Este historial corresponde al equipo con NUI ${itemNUI} en todas sus ubicaciones`, 105, finalY + 20, { align: 'center' });
            
            // Add signature lines
            doc.setFontSize(10);
            const signatureY = finalY + 35;
            
            // Supervisor signature
            doc.line(20, signatureY, 80, signatureY);
            doc.text('Supervisor de Mantenimiento', 50, signatureY + 5, { align: 'center' });
            
            // Manager signature
            doc.line(130, signatureY, 190, signatureY);
            doc.text('Gerente de Operaciones', 160, signatureY + 5, { align: 'center' });
        }
        
        // Save the PDF
        const fileName = `Bitacora_${itemNUI}_${itemName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert(`Error al generar el PDF: ${error.message}`);
    }
}
    
    // --- Event Listeners ---
    if (editItemForm) editItemForm.addEventListener('submit', (event) => {
        const itemId = editItemIdInput.value;
        const siteId = editItemSiteIdInput.value;
        const siteName = editItemSiteNameInput.value;
        const oldItemDataString = event.target.dataset.oldData;
        if (!itemId || !siteId || !siteName || !oldItemDataString) return;
        const oldItemData = JSON.parse(oldItemDataString);
        handleEditItemSubmit(event, itemId, oldItemData, siteId, siteName);
    });

    if (cancelEditItemButton) cancelEditItemButton.addEventListener('click', () => editItemModal.classList.add('hidden'));
    if (editItemModal) editItemModal.addEventListener('click', e => { if (e.target === editItemModal) editItemModal.classList.add('hidden'); });
    if (adjustQuantityForm) adjustQuantityForm.addEventListener('submit', (event) => {
        const itemId = adjustItemIdInput.value;
        const siteId = adjustItemSiteIdInput.value;
        const siteName = adjustItemSiteNameInput.value;
        const currentQuantity = parseFloat(adjustItemCurrentQuantityInput.value);
        const itemName = document.getElementById('adjust-item-name-hidden').value;
        handleAdjustQuantitySubmit(event, itemId, currentQuantity, siteId, siteName, itemName);
    });

    if (cancelAdjustQuantityButton) cancelAdjustQuantityButton.addEventListener('click', () => adjustQuantityModal.classList.add('hidden'));
    if (adjustQuantityModal) adjustQuantityModal.addEventListener('click', e => { if (e.target === adjustQuantityModal) adjustQuantityModal.classList.add('hidden'); });
    if (transferItemForm) transferItemForm.addEventListener('submit', (event) => {
        const itemId = transferItemIdInput.value;
        const sourceSiteId = transferSourceSiteIdInput.value;
        const sourceSiteName = transferSourceSiteNameInput.value;
        const sourceItemData = JSON.parse(transferSourceItemDataJsonInput.value || '{}');
        handleTransferItemSubmit(event, itemId, sourceItemData, sourceSiteId, sourceSiteName);
    });

    if (cancelTransferItemButton) cancelTransferItemButton.addEventListener('click', () => transferItemModal.classList.add('hidden'));
    if (transferItemModal) transferItemModal.addEventListener('click', e => { if (e.target === transferItemModal) transferItemModal.classList.add('hidden'); });
    if (closeHistoryModalButton) closeHistoryModalButton.addEventListener('click', () => historyModal.classList.add('hidden'));
    if (historyModal) historyModal.addEventListener('click', e => { if (e.target === historyModal) historyModal.classList.add('hidden'); });
    if (exportHistoryPdfBtn) {
    exportHistoryPdfBtn.addEventListener('click', exportHistoryToPDF);
}
    // Corrected Toggle Listener
    if (toggleZeroQtyCheckbox) {
        toggleZeroQtyCheckbox.addEventListener('change', () => {
            showZeroQuantityItems = toggleZeroQtyCheckbox.checked;
            // Get context from the main inventory section data attributes
            const currentSiteId = inventorySection.dataset.currentSiteId;
            const currentSiteName = inventorySection.dataset.currentSiteName;
            if (currentSiteId && currentSiteName) {
                loadInventoryItems(currentSiteId, currentSiteName);
            }
        });
    }

    // Maintenance Modal Event Listeners
    if (closeMaintenanceModalButton) {
        closeMaintenanceModalButton.addEventListener('click', () => maintenanceModal.classList.add('hidden'));
    }
    if (maintenanceModal) {
        maintenanceModal.addEventListener('click', e => { 
            if (e.target === maintenanceModal) maintenanceModal.classList.add('hidden'); 
        });
    }
    if (addMaintenanceEntryBtn) {
        addMaintenanceEntryBtn.addEventListener('click', showAddMaintenanceForm);
    }
    if (exportMaintenancePdfBtn) {
        exportMaintenancePdfBtn.addEventListener('click', exportMaintenanceToPDF);
    }
    if (addMaintenanceForm) {
        addMaintenanceForm.addEventListener('submit', handleAddMaintenanceSubmit);
    }
    if (cancelAddMaintenanceButton) {
        cancelAddMaintenanceButton.addEventListener('click', () => addMaintenanceModal.classList.add('hidden'));
    }
    if (addMaintenanceModal) {
        addMaintenanceModal.addEventListener('click', e => { 
            if (e.target === addMaintenanceModal) addMaintenanceModal.classList.add('hidden'); 
        });
    }

}); // End DOMContentLoaded