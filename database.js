const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear conexión a la base de datos (archivo local rooms.db)
const dbPath = path.resolve(__dirname, 'rooms.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Tabla de Salas
        db.run(`CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            capacity INTEGER,
            features TEXT
        )`);

        // Tabla de Usuarios
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT, -- Nuevo campo
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user', -- 'admin' o 'user'
            sector TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabla de Reservas
        db.run(`CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            roomId INTEGER NOT NULL,
            userId INTEGER, -- Relacion con usuario
            userName TEXT, -- Guardamos nombre por facilidad
            userSector TEXT, -- Guardamos sector por facilidad
            title TEXT NOT NULL,
            startTime TEXT NOT NULL,
            endTime TEXT NOT NULL,
            FOREIGN KEY(roomId) REFERENCES rooms(id)
        )`);

        // Insertar datos de prueba si no hay salas
        db.get("SELECT count(*) as count FROM rooms", (err, row) => {
            if (row.count === 0) {
                console.log("Insertando salas iniciales...");

                // Salas
                const stmt = db.prepare("INSERT INTO rooms (name, capacity, features) VALUES (?, ?, ?)");
                stmt.run("Sala de Treinamento", 12, "Proyector, Video conferencia");
                stmt.run("Sala de Reunião", 6, "Pizarra blanca");
                stmt.finalize();
            }
        });

        // Insertar Admin si no hay usuarios
        db.get("SELECT count(*) as count FROM users", (err, row) => {
            if (row.count === 0) {
                const userStmt = db.prepare("INSERT INTO users (username, password, role, sector) VALUES (?, ?, ?, ?)");
                userStmt.run("admin", "admin123", "admin", "TI / Soporte");
                userStmt.finalize();
                console.log("Usuario Admin creado correctamente: admin / admin123");
            }
        });
    });
}

module.exports = db;
