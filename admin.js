// Create the SINU_APP object if it doesn't exist, to be safe.
window.SINU_APP = window.SINU_APP || {};

//
// DEFINE THE FUNCTION IN THE GLOBAL SCOPE - This happens immediately when the script loads
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
                const currentRole = user.roles && user.roles.length > 0 ? user.roles[0] : 'espectador';
                const isApprovedText = user.isApproved ? 'Aprobado' : 'Pendiente';
                const approvedClass = user.isApproved ? 'text-green-600 font-semibold' : 'text-yellow-600 font-semibold';
                const buttonClass = user.isApproved ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600';
                
                usersHTML += `
                    <tr>
                        <td class="px-6 py-4">
                            <div class="text-sm font-medium text-gray-900">${user.nombre || ''} ${user.apellidos || ''}</div>
                            <div class="text-sm text-gray-500">${user.email || 'N/A'}</div>
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-500">
                            <select class="role-select text-xs border border-gray-300 rounded px-2 py-1" 
                                    data-uid="${doc.id}" 
                                    data-current-role="${currentRole}"
                                    ${!user.isApproved ? 'disabled' : ''}>
                                <option value="espectador" ${currentRole === 'espectador' ? 'selected' : ''}>Espectador</option>
                                <option value="oficina" ${currentRole === 'oficina' ? 'selected' : ''}>Oficina</option>
                                <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Admin</option>
                            </select>
                        </td>
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

        // Add event listeners for the approval buttons
        userListContainer.querySelectorAll('.toggle-approval-btn').forEach(btn => {
            btn.addEventListener('click', toggleUserApproval);
        });

        // Add event listeners for role changes
        userListContainer.querySelectorAll('.role-select').forEach(select => {
            select.addEventListener('change', changeUserRole);
        });

    } catch (error) {
        console.error("Error loading admin users:", error);
        userListContainer.innerHTML = `<p class="text-red-500">Error al cargar usuarios: ${error.message}</p>`;
    }
};

// Define toggleUserApproval in the global scope as well
window.SINU_APP.toggleUserApproval = async (e) => {
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

// Define changeUserRole in the global scope
window.SINU_APP.changeUserRole = async (e) => {
    const uid = e.target.dataset.uid;
    const currentRole = e.target.dataset.currentRole;
    const newRole = e.target.value;
    const db = window.SINU_APP.db;

    // If no change, do nothing
    if (currentRole === newRole) {
        return;
    }

    if (!confirm(`¿Está seguro de que desea cambiar el rol de este usuario a "${newRole}"?`)) {
        // Reset the select to the current role if user cancels
        e.target.value = currentRole;
        return;
    }

    try {
        await db.collection("users").doc(uid).update({
            roles: [newRole]
        });
        
        // Update the data attribute for future changes
        e.target.dataset.currentRole = newRole;
        
        alert(`Rol actualizado exitosamente a "${newRole}".`);
        
        // Optionally refresh the list to ensure consistency
        window.SINU_APP.loadAdminUsers();
    } catch (error) {
        alert(`Error al actualizar el rol: ${error.message}`);
        // Reset the select to the current role on error
        e.target.value = currentRole;
    }
};

// Keep the local reference for the event listener
const toggleUserApproval = window.SINU_APP.toggleUserApproval;
const changeUserRole = window.SINU_APP.changeUserRole;

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