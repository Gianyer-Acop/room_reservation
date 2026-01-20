const express = require('express');
const app = express();
const path = require('path');
const db = require('./database');

const PORT = 3000;

// Middleware para parsear JSON
app.use(express.json());

// Middleware de Logging (Para ver peticiones en la consola)
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Servir archivos estáticos del Frontend
app.use(express.static(path.join(__dirname, 'public')));

// --- API ENDPOINTS ---

// LOGIN
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (err || !row) {
            res.status(401).json({ error: "Credenciales incorrectas" });
        } else {
            res.json({ user: row });
        }
    });
});

// REGISTRO
app.post('/api/register', (req, res) => {
    const { username, email, password, sector } = req.body;
    if (!username || !email || !password || !sector) {
        res.status(400).json({ error: "Faltan datos" });
        return;
    }
    const sql = "INSERT INTO users (username, email, password, role, sector) VALUES (?, ?, ?, 'user', ?)";
    db.run(sql, [username, email, password, sector], function (err) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "El usuario ya existe o hubo un error" });
            return;
        }
        res.json({ message: "Usuario creado", id: this.lastID });
    });
});

// ACTUALIZAR PERFIL
app.put('/api/profile', (req, res) => {
    const { id, oldPassword, newUsername, newPassword } = req.body;

    // Primero verificamos que el usuario existe y la contraseña vieja es correcta
    db.get("SELECT * FROM users WHERE id = ? AND password = ?", [id, oldPassword], (err, user) => {
        if (err || !user) {
            res.status(401).json({ error: "Contraseña anterior incorrecta" });
            return;
        }

        // Si es correcto, actualizamos
        // Si no envía nuevo usuario/pass, mantenemos el viejo
        const finalUsername = newUsername || user.username;
        const finalPassword = newPassword || user.password;

        const updateSql = "UPDATE users SET username = ?, password = ? WHERE id = ?";
        db.run(updateSql, [finalUsername, finalPassword, id], function (err) {
            if (err) {
                res.status(500).json({ error: "Error al actualizar (quizas el usuario ya existe)" });
                return;
            }
            res.json({ message: "Perfil actualizado exitosamente" });
        });
    });
});

// --- ADMIN: GESTION DE USUARIOS ---

// Obtener todos los usuarios (Solo API simple, validación en frontend/business logic)
app.post('/api/users/list', (req, res) => {
    const { requesterId } = req.body; // ID del que pide la lista

    db.get("SELECT role FROM users WHERE id = ?", [requesterId], (err, user) => {
        if (err || !user || user.role !== 'admin') {
            res.status(403).json({ error: "Acceso denegado. Solo administradores." });
            return;
        }

        db.all("SELECT id, username, email, sector, role, createdAt FROM users WHERE username != 'admin'", [], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ data: rows });
        });
    });
});

// Eliminar usuario
app.delete('/api/users/:id', (req, res) => {
    const userIdToDelete = req.params.id;
    const { requesterId } = req.body;

    db.get("SELECT role FROM users WHERE id = ?", [requesterId], (err, admin) => {
        if (err || !admin || admin.role !== 'admin') {
            res.status(403).json({ error: "Solo el admin puede eliminar usuarios." });
            return;
        }

        // Eliminar reservas del usuario primero (Limpieza)
        db.run("DELETE FROM bookings WHERE userId = ?", userIdToDelete, (err) => {
            if (err) console.error("Error borrando reservas de usuario eliminado", err);

            // Eliminar usuario
            db.run("DELETE FROM users WHERE id = ?", userIdToDelete, function (err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ message: "Usuario y sus reservas eliminados." });
            });
        });
    });
});

// Obtener todas las salas
app.get('/api/rooms', (req, res) => {
    db.all("SELECT * FROM rooms", [], (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ data: rows });
    });
});

// Crear Sala (Solo Admin)
app.post('/api/rooms', (req, res) => {
    const { name, capacity, features, requesterId } = req.body;

    db.get("SELECT role FROM users WHERE id = ?", [requesterId], (err, user) => {
        if (err || !user || user.role !== 'admin') {
            res.status(403).json({ error: "Solo admin puede crear salas" });
            return;
        }

        db.run("INSERT INTO rooms (name, capacity, features) VALUES (?, ?, ?)", [name, capacity, features], function (err) {
            if (err) { res.status(500).json({ error: err.message }); return; }
            res.json({ message: "Sala creada", id: this.lastID });
        });
    });
});

// Eliminar Sala (Solo Admin)
app.delete('/api/rooms/:id', (req, res) => {
    const roomId = req.params.id;
    const { requesterId } = req.body;

    db.get("SELECT role FROM users WHERE id = ?", [requesterId], (err, user) => {
        if (err || !user || user.role !== 'admin') {
            res.status(403).json({ error: "Solo admin puede eliminar salas" });
            return;
        }

        // Eliminar reservas asociadas primero
        db.run("DELETE FROM bookings WHERE roomId = ?", roomId, (err) => {
            db.run("DELETE FROM rooms WHERE id = ?", roomId, function (err) {
                if (err) { res.status(500).json({ error: err.message }); return; }
                res.json({ message: "Sala eliminada" });
            });
        });
    });
});

// Obtener reservas (ahora incluye userId para saber quien la creo)
app.get('/api/bookings', (req, res) => {
    // Acepta query params ?date=YYYY-MM-DD para filtrar (opcional)
    const sql = "SELECT * FROM bookings ORDER BY startTime ASC";
    db.all(sql, [], (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ data: rows });
    });
});

// Crear nueva reserva (Actualizado para sistema de usuarios)
app.post('/api/bookings', (req, res) => {
    console.log("Recibida peticion de reserva:", req.body); // DEBUG
    const { roomId, userId, userName, userSector, title, startTime, endTime } = req.body;

    if (!roomId || !userId || !startTime || !endTime) {
        console.error("Faltan datos:", { roomId, userId, startTime, endTime }); // DEBUG
        res.status(400).json({ error: "Faltan datos obligatorios (Selecciona una sala y hora)" });
        return;
    }

    // Validación de conflictos
    const conflictSql = `
        SELECT * FROM bookings 
        WHERE roomId = ? 
        AND (
            (startTime < ? AND endTime > ?) OR
            (startTime < ? AND endTime > ?) OR
            (startTime >= ? AND endTime <= ?)
        )
    `;

    db.get(conflictSql, [roomId, endTime, startTime, endTime, startTime, startTime, endTime], (err, row) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (row) { res.status(409).json({ error: "La sala ya está reservada en ese horario" }); return; }

        // Insertar reserva vinculada al usuario
        const insertSql = `INSERT INTO bookings (roomId, userId, userName, userSector, title, startTime, endTime) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.run(insertSql, [roomId, userId, userName, userSector, title || 'Reunión', startTime, endTime], function (err) {
            if (err) {
                console.error("Error al insertar reserva:", err.message); // DEBUG
                res.status(500).json({ error: "Error de Base de Datos: " + err.message });
                return;
            }
            res.json({ message: "Reserva creada", id: this.lastID });
        });
    });
});

// Eliminar reserva (Con validación de permisos simple)
app.delete('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    const { userId } = req.body; // El frontend debe enviar quien intenta borrar

    // Primero verificamos de quien es la reserva
    db.get("SELECT * FROM bookings WHERE id = ?", [id], (err, booking) => {
        if (!booking) { res.status(404).json({ error: "Reserva no encontrada" }); return; }

        // Verificamos permisos del usuario que solicita
        db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
            if (!user) { res.status(401).json({ error: "Usuario no identificado" }); return; }

            // Lógica: Es Admin O Es el dueño de la reserva
            if (user.role === 'admin' || user.id === booking.userId) {
                db.run("DELETE FROM bookings WHERE id = ?", id, function (err) {
                    if (err) res.status(500).json({ error: err.message });
                    else res.json({ message: "Reserva eliminada" });
                });
            } else {
                res.status(403).json({ error: "No tienes permiso para eliminar esta reserva" });
            }
        });
    });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Reservas corriendo en http://localhost:${PORT}`);
    console.log(`Para acceder desde la red, usa tu dirección IP local en lugar de localhost.`);
});
