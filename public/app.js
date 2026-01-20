document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO DE LA SESION ---
    let currentUser = JSON.parse(localStorage.getItem('meetingAppUser'));

    // Elementos UI
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    const userDisplay = document.getElementById('user-display');
    const loginForm = document.getElementById('login-form');

    // Elementos App Principal
    const roomsContainer = document.getElementById('rooms-container');
    const roomSelect = document.getElementById('room-select');
    const bookingForm = document.getElementById('booking-form');
    const scheduleTimeline = document.getElementById('schedule-timeline');
    const currentDateEl = document.getElementById('current-date');
    const dateInput = document.getElementById('booking-date');
    const startTimeSelect = document.getElementById('start-time');
    const endTimeSelect = document.getElementById('end-time');

    // Elementos Admin
    const adminModal = document.getElementById('admin-modal');
    const usersListContainer = document.getElementById('users-list');
    const roomsListAdminContainer = document.getElementById('rooms-list-admin');
    const btnAdminUsers = document.getElementById('btn-admin-users');

    // --- MANEJO DE VISTAS ---
    function updateView() {
        if (currentUser) {
            loginScreen.style.display = 'none';
            mainApp.style.display = 'block';
            userDisplay.textContent = `${currentUser.username} (${currentUser.role === 'admin' ? 'Admin' : currentUser.sector})`;
            checkAdmin();
            initializeApp();
        } else {
            loginScreen.style.display = 'block';
            mainApp.style.display = 'none';
        }
    }

    // --- LOGICA DE AUTH ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (res.ok) {
                currentUser = data.user;
                localStorage.setItem('meetingAppUser', JSON.stringify(currentUser));
                updateView();
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert('Error al conectar con el servidor');
        }
    });

    window.logout = function () {
        localStorage.removeItem('meetingAppUser');
        currentUser = null;
        updateView();
    };

    // --- PERFIL ---
    const profileModal = document.getElementById('profile-modal');
    window.openProfile = function () {
        document.getElementById('prof-username').value = currentUser.username;
        document.getElementById('prof-new-pass').value = '';
        document.getElementById('prof-old-pass').value = '';
        profileModal.style.display = 'flex';
    };

    window.closeProfile = function () {
        profileModal.style.display = 'none';
    };

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUsername = document.getElementById('prof-username').value;
        const newPassword = document.getElementById('prof-new-pass').value;
        const oldPassword = document.getElementById('prof-old-pass').value;

        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: currentUser.id,
                    oldPassword,
                    newUsername,
                    newPassword
                })
            });
            const data = await res.json();

            if (res.ok) {
                alert('Perfil actualizado. Por favor inicia sesión de nuevo.');
                closeProfile();
                logout();
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert('Error al actualizar perfil');
        }
    });

    // --- ADMIN PANEL ---
    function checkAdmin() {
        if (currentUser && currentUser.role === 'admin') {
            btnAdminUsers.style.display = 'block';
            btnAdminUsers.textContent = '⚙️ Administración';
        } else {
            btnAdminUsers.style.display = 'none';
        }
    }

    window.openAdmin = function () {
        adminModal.style.display = 'flex';
        loadAllUsers();
        loadAllRoomsAdmin();
    };

    window.closeAdmin = function () {
        adminModal.style.display = 'none';
    };

    // -- ADMIN: USUARIOS --
    function loadAllUsers() {
        usersListContainer.innerHTML = '<div class="loading">Cargando...</div>';
        fetch('/api/users/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requesterId: currentUser.id })
        })
            .then(res => res.json())
            .then(data => {
                usersListContainer.innerHTML = '';
                if (data.data) {
                    data.data.forEach(user => {
                        const isAdmin = user.role === 'admin';

                        usersListContainer.innerHTML += `
                        <div class="admin-list-item">
                            <div>
                                <div style="font-weight: bold;">${user.username}</div>
                                <div style="font-size: 0.85rem; opacity: 0.6;">${user.sector} ${isAdmin ? '<span style="color:var(--primary-accent); font-weight:bold; font-size:0.8em">[ADMIN]</span>' : ''}</div>
                            </div>
                            ${!isAdmin ?
                                `<button onclick="deleteUser('${user.id}', '${user.username}')" class="btn-icon btn-trash" title="Eliminar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                </button>`
                                : ''}
                        </div>
                    `;
                    });
                }
            });
    }

    window.adminCreateUser = function () {
        const username = document.getElementById('new-user-name').value;
        const email = document.getElementById('new-user-email').value;
        const password = document.getElementById('new-user-pass').value;
        const sector = document.getElementById('new-user-sector').value;

        if (!username || !password || !sector || !email) { alert("Completa todos los campos"); return; }

        fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, sector })
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) alert(data.error);
                else {
                    alert('Usuario creado');
                    loadAllUsers();
                    document.getElementById('new-user-name').value = '';
                    document.getElementById('new-user-email').value = '';
                    document.getElementById('new-user-pass').value = '';
                    document.getElementById('new-user-sector').value = '';
                }
            });
    };

    window.deleteUser = function (userId, username) {
        if (!confirm(`¿Eliminar usuario ${username}?`)) return;
        fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requesterId: currentUser.id })
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) alert(data.error);
                else {
                    alert(data.message);
                    loadAllUsers();
                    loadBookings();
                }
            });
    };

    // -- ADMIN: SALAS --
    let isEditingRoom = false;

    function loadAllRoomsAdmin() {
        roomsListAdminContainer.innerHTML = '<div class="loading">Cargando...</div>';
        fetch('/api/rooms').then(res => res.json()).then(data => {
            roomsListAdminContainer.innerHTML = '';
            data.data.forEach(room => {
                const roomData = JSON.stringify(room).replace(/"/g, '&quot;');
                roomsListAdminContainer.innerHTML += `
                    <div class="admin-list-item">
                        <div>
                            <div style="font-weight: bold;">${room.name}</div>
                            <div style="font-size: 0.85rem; opacity: 0.6;">Cap: ${room.capacity} | ${room.features}</div>
                        </div>
                        <div style="display:flex; gap: 5px;">
                            <button onclick="startEditRoom(${roomData})" class="btn-icon btn-edit" title="Editar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                            <button onclick="deleteRoom('${room.id}', '${room.name}')" class="btn-icon btn-trash" title="Eliminar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                `;
            });
        });
    }

    window.startEditRoom = function (room) {
        isEditingRoom = true;
        document.getElementById('edit-room-id').value = room.id;
        document.getElementById('new-room-name').value = room.name;
        document.getElementById('new-room-cap').value = room.capacity;
        document.getElementById('new-room-feat').value = room.features;

        document.getElementById('room-form-title').textContent = "Editar Sala";
        document.getElementById('btn-room-submit').textContent = "Guardar Cambios";
        document.getElementById('btn-cancel-edit').style.display = 'inline-block';
    };

    window.resetRoomForm = function () {
        isEditingRoom = false;
        document.getElementById('edit-room-id').value = '';
        document.getElementById('new-room-name').value = '';
        document.getElementById('new-room-cap').value = '';
        document.getElementById('new-room-feat').value = '';

        document.getElementById('room-form-title').textContent = "Agregar Sala";
        document.getElementById('btn-room-submit').textContent = "Agregar Sala";
        document.getElementById('btn-cancel-edit').style.display = 'none';
    };

    window.handleRoomSubmit = function () {
        if (isEditingRoom) {
            adminEditRoom();
        } else {
            adminCreateRoom();
        }
    };

    window.adminCreateRoom = function () {
        const name = document.getElementById('new-room-name').value;
        const capacity = document.getElementById('new-room-cap').value;
        const features = document.getElementById('new-room-feat').value;

        if (!name || !capacity) { alert("Nombre y capacidad requeridos"); return; }

        fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, capacity, features, requesterId: currentUser.id })
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) alert(data.error);
                else {
                    alert('Sala creada');
                    resetRoomForm();
                    loadAllRoomsAdmin();
                    loadRooms();
                }
            });
    };

    window.adminEditRoom = function () {
        const id = document.getElementById('edit-room-id').value;
        const name = document.getElementById('new-room-name').value;
        const capacity = document.getElementById('new-room-cap').value;
        const features = document.getElementById('new-room-feat').value;

        if (!id) return;

        fetch(`/api/rooms/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, capacity, features, requesterId: currentUser.id })
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) alert(data.error);
                else {
                    alert('Sala actualizada');
                    resetRoomForm();
                    loadAllRoomsAdmin();
                    loadRooms();
                }
            });
    };

    window.deleteRoom = function (id, name) {
        if (!confirm(`¿Eliminar sala ${name}?\nSe borrarán todas sus reservas.`)) return;
        fetch(`/api/rooms/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requesterId: currentUser.id })
        }).then(() => {
            loadAllRoomsAdmin();
            loadRooms();
        });
    };

    // --- LOGICA PRINCIPAL DE RESERVAS ---

    function initializeApp() {
        const now = new Date();
        if (!dateInput.value) dateInput.valueAsDate = now;
        currentDateEl.textContent = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // Timer de refresco automatico cada 30s
        if (window.refreshInterval) clearInterval(window.refreshInterval);
        window.refreshInterval = setInterval(loadBookings, 30000);

        const timeOptions = generateTimeOptions();
        populateSelect(startTimeSelect, timeOptions);
        populateSelect(endTimeSelect, timeOptions);

        loadRooms();
        loadBookings();
    }

    function generateTimeOptions() {
        const options = [];
        for (let h = 7; h <= 20; h++) {
            const hour = h.toString().padStart(2, '0');
            ['00', '30', '45'].forEach(min => { options.push(`${hour}:${min}`); });
        }
        return options;
    }

    function populateSelect(select, options) {
        if (select.children.length > 1) return;
        select.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "--:--";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);

        options.forEach(time => {
            const opt = document.createElement('option');
            opt.value = time;
            opt.textContent = time;
            select.appendChild(opt);
        });
    }

    function loadRooms() {
        fetch('/api/rooms')
            .then(res => res.json())
            .then(data => {
                roomsContainer.innerHTML = '';
                if (data.data.length === 0) roomsContainer.innerHTML = '<div>No hay salas disponibles.</div>';

                // Guardar seleccion previa
                const currentVal = roomSelect.value;
                roomSelect.innerHTML = '<option value="" disabled selected>Selecciona una sala</option>';

                data.data.forEach(room => {
                    const card = document.createElement('div');
                    card.className = 'room-card';
                    if (currentVal == room.id) card.classList.add('selected');
                    card.innerHTML = `
                        <h3>${room.name}</h3>
                        <div class="room-details">
                            <span>👥 ${room.capacity} personas</span>
                            <span>✨ ${room.features}</span>
                        </div>
                    `;
                    card.addEventListener('click', () => {
                        document.querySelectorAll('.room-card').forEach(c => c.classList.remove('selected'));
                        card.classList.add('selected');
                        roomSelect.value = room.id;
                    });
                    roomsContainer.appendChild(card);

                    const option = document.createElement('option');
                    option.value = room.id;
                    option.textContent = room.name;
                    roomSelect.appendChild(option);
                });
                if (currentVal) roomSelect.value = currentVal;
            });
    }

    function loadBookings() {
        fetch('/api/bookings')
            .then(res => res.json())
            .then(data => {
                scheduleTimeline.innerHTML = '';
                if (data.data.length === 0) {
                    scheduleTimeline.innerHTML = '<p style="text-align:center; color: #94a3b8;">No hay reservas hoy.</p>';
                    return;
                }

                data.data.forEach(booking => {
                    const start = new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const end = new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const canDelete = currentUser && (currentUser.role === 'admin' || currentUser.id === booking.userId);

                    const item = document.createElement('div');
                    item.className = 'booking-item';
                    item.innerHTML = `
                        <div class="booking-info">
                            <div class="time">${start} - ${end}</div>
                            <div><strong>${booking.title}</strong></div>
                            <div style="font-size: 0.85em; opacity: 0.8;">${booking.userName || 'Usuario'} (${booking.userSector || 'General'})</div>
                        </div>
                        ${canDelete ? `
                        <button class="btn-delete" onclick="deleteBooking(${booking.id})" title="Eliminar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>` : ''}
                    `;
                    scheduleTimeline.appendChild(item);
                });
            });
    }

    window.deleteBooking = function (id) {
        if (!currentUser) return;
        if (!confirm('¿Eliminar reserva?')) return;
        fetch(`/api/bookings/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id })
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) alert(data.error);
                else { alert('Reserva eliminada'); loadBookings(); }
            })
            .catch(err => alert('Error al eliminar'));
    };

    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const dateVal = dateInput.value;
        const startVal = startTimeSelect.value;
        const endVal = endTimeSelect.value;
        if (!dateVal || !startVal || !endVal) { alert('Completa la hora.'); return; }

        const formData = {
            roomId: roomSelect.value,
            userId: currentUser.id,
            userName: currentUser.username,
            userSector: currentUser.sector,
            title: document.getElementById('meeting-title').value,
            startTime: `${dateVal}T${startVal}`,
            endTime: `${dateVal}T${endVal}`
        };

        fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                alert('¡Reserva creada!');
                bookingForm.reset();
                dateInput.valueAsDate = new Date();
                loadBookings();
            })
            .catch(err => alert(err.message));
    });

    updateView();
});
