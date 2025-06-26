// Create the SINU_APP object if it doesn't exist, to be safe.
window.SINU_APP = window.SINU_APP || {};

//
// DEFINE THE FUNCTION IN THE GLOBAL SCOPE
//
window.SINU_APP.loadAdminUsers = async () => {
    const userListContainer = document.getElementById('user-list-container');
    const db = window.SINU_APP.db;

    if (!userListContainer || !db) {
        console.error("Missing userListContainer or DB connection.");
        if (userListContainer) userListContainer.innerHTML = `<p class="text-red-500">Error de inicialización. No se pudo conectar a la base de datos.</p>`;
        return;
    }

    userListContainer.innerHTML = '<p>Cargando usuarios...</p>';

    try {
        const usersSnapshot = await db.collection("users").orderBy("createdAt", "desc").get();
        let usersHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">`;

        if (usersSnapshot.empty) {
            usersHTML += `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No hay usuarios registrados.</td></tr>`;
        } else {
            usersSnapshot.forEach(doc => {
                const user = doc.data();
                const isApprovedText = user.isApproved ? 'Aprobado' : 'Pendiente';
                const approvedClass = user.isApproved ? 'text-green-600 font-semibold' : 'text-yellow-600 font-semibold';
                const buttonClass = user.isApproved ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600';
                
                usersHTML += `
                    <tr>
                        <td class="px-6 py-4">
                            <div class="text-sm font-medium text-gray-900">${user.nombre || ''} ${user.apellidos || ''}</div>
                            <div class="text-sm text-gray-500">${user.email || 'N/A'}</div>
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-500">${user.roles && user.roles.length > 0 ? user.roles[0] : 'N/A'}</td>
                        <td class="px-6 py-4 text-sm ${approvedClass}">${isApprovedText}</td>
                        <td class="px-6 py-4 text-sm font-medium">
                            <button class="toggle-approval-btn text-white py-1 px-3 rounded text-xs ${buttonClass}" data-uid="${doc.id}" data-is-approved="${user.isApproved}">
                                ${user.isApproved ? 'Revocar' : 'Aprobar'}
                            </button>
                        </td>
                    </tr>`;
            });
        }

        usersHTML += `</tbody></table>`;
        userListContainer.innerHTML = usersHTML;

        // Add event listeners for the new buttons
        userListContainer.querySelectorAll('.toggle-approval-btn').forEach(btn => {
            btn.addEventListener('click', toggleUserApproval);
        });

    } catch (error) {
        console.error("Error loading admin users:", error);
        userListContainer.innerHTML = `<p class="text-red-500">Error al cargar usuarios: ${error.message}</p>`;
    }
};

const toggleUserApproval = async (e) => {
    const uid = e.target.dataset.uid;
    const currentlyApproved = e.target.dataset.isApproved === 'true';
    const db = window.SINU_APP.db;

    if (!confirm(`¿Está seguro de que desea ${currentlyApproved ? 'revocar la aprobación de' : 'aprobar a'} este usuario?`)) {
        return;
    }

    try {
        await db.collection("users").doc(uid).update({
            isApproved: !currentlyApproved
        });
        window.SINU_APP.loadAdminUsers(); // Refresh the list
    } catch (error) {
        alert(`Error al actualizar el usuario: ${error.message}`);
    }
};


//
// ATTACH EVENT LISTENERS AFTER THE DOM IS LOADED
//
document.addEventListener('DOMContentLoaded', () => {
    const backButton = document.getElementById('back-to-dashboard-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            document.getElementById('admin-section').classList.add('hidden');
            document.getElementById('dashboard-section').classList.remove('hidden');
        });
    }
});