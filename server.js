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

// Servir arquivos estáticos do Frontend
app.use(express.static(path.join(__dirname, 'public')));

// --- API ENDPOINTS ---

// LOGIN
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (err || !row) {
            res.status(401).json({ error: "Credenciais incorretas" });
        } else {
            res.json({ user: row });
        }
    });
});

// REGISTRO
app.post('/api/register', (req, res) => {
    const { username, email, password, sector } = req.body;
    if (!username || !email || !password || !sector) {
        res.status(400).json({ error: "Faltam dados" });
        return;
    }
    const sql = "INSERT INTO users (username, email, password, role, sector) VALUES (?, ?, ?, 'user', ?)";
    db.run(sql, [username, email, password, sector], function (err) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "O usuário já existe ou houve um erro" });
            return;
        }
        res.json({ message: "Usuário criado", id: this.lastID });
    });
});

// ACTUALIZAR PERFIL
app.put('/api/profile', (req, res) => {
    const { id, oldPassword, newUsername, newPassword } = req.body;

    // Primeiro verificamos que el usuario existe y la contraseña vieja es correcta
    db.get("SELECT * FROM users WHERE id = ? AND password = ?", [id, oldPassword], (err, user) => {
        if (err || !user) {
            res.status(401).json({ error: "Senha anterior incorreta" });
            return;
        }

        // Si es correcto, actualizamos
        // Si no envía nuevo usuario/pass, mantenemos el viejo
        const finalUsername = newUsername || user.username;
        const finalPassword = newPassword || user.password;

        const updateSql = "UPDATE users SET username = ?, password = ? WHERE id = ?";
        db.run(updateSql, [finalUsername, finalPassword, id], function (err) {
            if (err) {
                res.status(500).json({ error: "Erro ao atualizar (talvez o usuário já exista)" });
                return;
            }
            res.json({ message: "Perfil atualizado com sucesso" });
        });
    });
});

// --- ADMIN: GESTION DE USUARIOS ---

// Obtener todos los usuarios (Solo API simple, validación en frontend/business logic)
app.post('/api/users/list', (req, res) => {
    const { requesterId } = req.body; // ID del que pide la lista

    db.get("SELECT role FROM users WHERE id = ?", [requesterId], (err, user) => {
        if (err || !user || user.role !== 'admin') {
            res.status(403).json({ error: "Acesso negado. Apenas administradores." });
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
            res.status(403).json({ error: "Apenas o admin pode excluir usuários." });
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
                res.json({ message: "Usuário e suas reservas excluídos." });
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
            res.status(403).json({ error: "Apenas admin pode criar salas" });
            return;
        }

        db.run("INSERT INTO rooms (name, capacity, features) VALUES (?, ?, ?)", [name, capacity, features], function (err) {
            if (err) { res.status(500).json({ error: err.message }); return; }
            res.json({ message: "Sala criada", id: this.lastID });
        });
    });
});

// EDITAR SALA (SOLO ADMIN)
app.put('/api/rooms/:id', (req, res) => {
    const roomId = req.params.id;
    const { name, capacity, features, requesterId } = req.body;

    db.get("SELECT role FROM users WHERE id = ?", [requesterId], (err, user) => {
        if (err || !user || user.role !== 'admin') {
            res.status(403).json({ error: "Apenas admin pode editar salas" });
            return;
        }

        const sql = "UPDATE rooms SET name = ?, capacity = ?, features = ? WHERE id = ?";
        db.run(sql, [name, capacity, features, roomId], function (err) {
            if (err) { res.status(500).json({ error: err.message }); return; }
            res.json({ message: "Sala atualizada com sucesso" });
        });
    });
});

// Eliminar Sala (Solo Admin)
app.delete('/api/rooms/:id', (req, res) => {
    const roomId = req.params.id;
    const { requesterId } = req.body;

    db.get("SELECT role FROM users WHERE id = ?", [requesterId], (err, user) => {
        if (err || !user || user.role !== 'admin') {
            res.status(403).json({ error: "Apenas admin pode excluir salas" });
            return;
        }

        // Eliminar reservas asociadas primero
        db.run("DELETE FROM bookings WHERE roomId = ?", roomId, (err) => {
            db.run("DELETE FROM rooms WHERE id = ?", roomId, function (err) {
                if (err) { res.status(500).json({ error: err.message }); return; }
                res.json({ message: "Sala excluída" });
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
    console.log("Recebida petição de reserva:", req.body); // DEBUG
    const { roomId, userId, userName, userSector, title, startTime, endTime } = req.body;

    if (!roomId || !userId || !startTime || !endTime) {
        console.error("Faltam dados:", { roomId, userId, startTime, endTime }); // DEBUG
        res.status(400).json({ error: "Faltam dados obrigatórios (Selecione uma sala e horário)" });
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
        if (row) { res.status(409).json({ error: "A sala já está reservada neste horário" }); return; }

        // Insertar reserva vinculada al usuario
        const insertSql = `INSERT INTO bookings (roomId, userId, userName, userSector, title, startTime, endTime) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.run(insertSql, [roomId, userId, userName, userSector, title || 'Reunião', startTime, endTime], function (err) {
            if (err) {
                console.error("Erro ao inserir reserva:", err.message); // DEBUG
                res.status(500).json({ error: "Erro de Banco de Dados: " + err.message });
                return;
            }
            res.json({ message: "Reserva criada", id: this.lastID });
        });
    });
});

// Eliminar reserva (Con validación de permisos simple)
app.delete('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    const { userId } = req.body; // El frontend debe enviar quien intenta borrar

    // Primero verificamos de quien es la reserva
    db.get("SELECT * FROM bookings WHERE id = ?", [id], (err, booking) => {
        if (!booking) { res.status(404).json({ error: "Reserva não encontrada" }); return; }

        // Verificamos permisos del usuario que solicita
        db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
            if (!user) { res.status(401).json({ error: "Usuário não identificado" }); return; }

            // Lógica: Es Admin O Es el dueño de la reserva
            if (user.role === 'admin' || user.id === booking.userId) {
                db.run("DELETE FROM bookings WHERE id = ?", id, function (err) {
                    if (err) res.status(500).json({ error: err.message });
                    else res.json({ message: "Reserva excluída" });
                });
            } else {
                res.status(403).json({ error: "Você não tem permissão para excluir esta reserva" });
            }
        });
    });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Reservas rodando em http://localhost:${PORT}`);
    console.log(`Para acessar da rede, use seu endereço IP local.`);
});
