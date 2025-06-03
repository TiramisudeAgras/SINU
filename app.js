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


    // --- DOM Element References ---
    const authSection = document.getElementById('auth-section');
    const authTitle = document.getElementById('auth-title'); // For changing title (e.g. pending approval)
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
    // const inventoryListContainer = document.getElementById('inventory-list'); // Defined in HTML, can grab if needed
    // const addItemFormContainer = document.getElementById('add-item-form-container'); // Defined in HTML


    // --- Initial Page Setup ---
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // --- UI State Functions ---
    function showAuthSection() {
        authSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
    }

    function showDashboardSection() {
        authSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        sitesSection.classList.remove('hidden'); // Default to sites view
        inventorySection.classList.add('hidden');
    }

    // --- Authentication State Observer ---
    auth.onAuthStateChanged(async user => { // Added async
        if (user) {
            console.log("User signed in:", user.uid, user.email);

            try {
                const userDocRef = db.collection("users").doc(user.uid);
                const userDoc = await userDocRef.get();

                if (userDoc.exists && userDoc.data().isApproved) {
                    console.log("User is approved.");
                    if(dashboardTitle) dashboardTitle.textContent = `Panel de ${user.email || 'Usuario'}`;
                    showDashboardSection();
                    loadConstructionSites();
                    renderAddSiteButton();
                } else {
                    console.log("User is NOT approved or profile doesn't exist yet.");
                    showAuthSection(); 
                    if(authTitle) authTitle.textContent = "Cuenta Pendiente de Aprobación"; // UI Text
                    if(loginFormContainer) {
                        loginFormContainer.innerHTML = `
                            <p class="text-center text-nova-gray-dark font-lexend mb-4">
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
                    // To prevent a flash of "old" login form if onAuthStateChanged runs multiple times quickly
                    // or if profile fetch is slow, ensure no other form is rendered.
                }
            } catch (error) {
                console.error("Error fetching user approval status:", error);
                showAuthSection();
                if(authTitle) authTitle.textContent = "Error de Cuenta"; // UI Text
                if(loginFormContainer) loginFormContainer.innerHTML = `<p class="text-red-500 text-center font-lexend">Error al verificar el estado de su cuenta. Por favor, intente recargar la página o contacte soporte.</p> 
                    <button id="logout-error-button" class="w-full mt-4 bg-nova-green hover:bg-nova-green-dark text-white font-bold py-2 px-4 rounded">Cerrar Sesión</button>`;
                if(registrationArea) registrationArea.innerHTML = '';
                const logoutErrorButton = document.getElementById('logout-error-button');
                if(logoutErrorButton) logoutErrorButton.addEventListener('click', () => auth.signOut());
            }

        } else {
            // User is signed out.
            console.log("User signed out.");
            if(dashboardTitle) dashboardTitle.textContent = 'Panel Principal';
            if(authTitle) authTitle.textContent = 'Bienvenido'; // Reset auth title
            showAuthSection();
            if(sitesListContainer) sitesListContainer.innerHTML = '<p class="text-nova-gray">Cargando obras...</p>';
            if(addSiteFormContainer) addSiteFormContainer.innerHTML = '';
            renderLoginForm();
        }
    });

    // --- Logout Functionality ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log('User signed out successfully');
            }).catch(error => {
                console.error('Sign out error', error);
                alert(`Error al cerrar sesión: ${getFirebaseAuthErrorMessage(error)}`);
            });
        });
    }

    // --- Render Login Form ---
    function renderLoginForm() {
        if (!loginFormContainer) return;
        if(authTitle) authTitle.textContent = 'Bienvenido'; // Reset auth title
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
        if(authTitle) authTitle.textContent = 'Crear Nueva Cuenta'; // Update auth title
        loginFormContainer.innerHTML = `
            <form id="signup-form" class="space-y-6">
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
                <div>
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
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = signupForm['signup-email'].value;
                const password = signupForm['signup-password'].value;
                const confirmPassword = signupForm['signup-confirm-password'].value;
                const signupErrorEl = document.getElementById('signup-error');
                if(signupErrorEl) signupErrorEl.textContent = '';

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

                const submitButton = e.target.querySelector('button[type="submit"]');
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
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        isApproved: false, 
                        roles: ['user'] 
                    });
                    console.log("User profile created in Firestore, pending approval.");
                    
                    // The onAuthStateChanged observer will now handle showing the "pending approval" message.
                    // No need to sign out here or show an alert if onAuthStateChanged handles the UI correctly.

                } catch (error) {
                    console.error("Signup error:", error);
                    if(signupErrorEl) signupErrorEl.textContent = getFirebaseAuthErrorMessage(error);
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                }
            });
        }
    }

    // --- Helper for Firebase Auth Error Messages (Spanish UI Text) ---
    function getFirebaseAuthErrorMessage(error) {
        // (Same as before)
        switch (error.code) {
            case 'auth/invalid-email': return 'El formato del correo electrónico no es válido.';
            case 'auth/user-disabled': return 'Este usuario ha sido deshabilitado.';
            case 'auth/user-not-found': return 'No se encontró cuenta con este correo electrónico.';
            case 'auth/wrong-password': return 'Contraseña incorrecta.';
            case 'auth/email-already-in-use': return 'Este correo electrónico ya está registrado.';
            case 'auth/weak-password': return 'La contraseña es considerada débil por Firebase. Intente una combinación más robusta.';
            case 'auth/requires-recent-login': return 'Esta operación requiere autenticación reciente. Vuelve a iniciar sesión.';
            case 'auth/too-many-requests': return 'Demasiados intentos. Intenta de nuevo más tarde.';
            default: return 'Ocurrió un error. (' + error.message + ')';
        }
    }

    // --- Construction Site Functions ---
    function renderAddSiteButton() {
        if (!addSiteFormContainer) return;
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
    }

    function renderAddSiteForm() {
        if (!addSiteFormContainer) return;
        // Removed font-plex-serif from h4
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

        if (addSiteForm) {
            addSiteForm.addEventListener('submit', handleAddSiteSubmit);
        }
        if (cancelAddSiteButton) {
            cancelAddSiteButton.addEventListener('click', () => {
                renderAddSiteButton();
            });
        }
    }

    async function handleAddSiteSubmit(event) {
        event.preventDefault();
        const siteNameInput = event.target.elements['site-name'];
        const siteAddressInput = event.target.elements['site-address'];
        const siteName = siteNameInput.value.trim();
        const siteAddress = siteAddressInput.value.trim();
        
        const errorElement = document.getElementById('add-site-error');
        if (errorElement) errorElement.textContent = '';

        if (!siteName) {
            if (errorElement) errorElement.textContent = 'El nombre de la obra es obligatorio.';
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            if (errorElement) errorElement.textContent = 'Debes estar conectado para añadir una obra.';
            console.error("User not authenticated to add site.");
            return;
        }

        const submitButton = event.target.querySelector('button[type="submit"]');
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
        if (!sitesListContainer) {
            console.error("Sites list container not found");
            return;
        }
        sitesListContainer.innerHTML = '<p class="text-nova-gray p-4">Cargando obras...</p>';

        const user = auth.currentUser;
        if (!user) { // Should not happen if onAuthStateChanged is working correctly and user is approved
            sitesListContainer.innerHTML = '<p class="text-nova-gray p-4">Debes iniciar sesión para ver tus obras.</p>';
            return;
        }

        try {
            const sitesSnapshot = await db.collection("constructionSites")
                                          .where("createdBy", "==", user.uid)
                                          .orderBy("createdAt", "desc")
                                          .get();

            if (sitesSnapshot.empty) {
                sitesListContainer.innerHTML = '<p class="text-nova-gray p-4">Aún no has añadido ninguna obra. ¡Crea una!</p>';
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
                    console.log(`Site clicked: ID=${siteId}, Name=${siteName}`);
                    alert(`Has hecho clic en la obra: ${siteName} (ID: ${siteId}). La funcionalidad de inventario vendrá pronto.`);
                    // showInventoryForSite(siteId, siteName); // For later
                });
            });

        } catch (error) {
            console.error("Error loading construction sites: ", error);
            sitesListContainer.innerHTML = `<p class="text-red-500 p-4">Error al cargar las obras: ${error.message}</p>`;
        }
    }

}); // End DOMContentLoaded