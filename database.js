const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Database folder
const dbFolder = path.join(__dirname, "database");

if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
}

// SQLite database
const dbPath = path.join(dbFolder, "appointments.db");

const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS availability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_id INTEGER NOT NULL,
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        slot_duration INTEGER NOT NULL DEFAULT 30,

        FOREIGN KEY (provider_id)
        REFERENCES providers(id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_id INTEGER NOT NULL,
        client_name TEXT NOT NULL,
        client_email TEXT NOT NULL,
        appointment_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'booked',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (provider_id)
        REFERENCES providers(id)
        ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_provider_date
    ON appointments(provider_id, appointment_date);

    CREATE UNIQUE INDEX IF NOT EXISTS unique_active_appointment
    ON appointments(
        provider_id,
        appointment_date,
        start_time
    )
    WHERE status = 'booked';
`);

// Check providers
const providerCount = db
    .prepare("SELECT COUNT(*) AS count FROM providers")
    .get();

console.log("Existing providers:", providerCount.count);

// Create default provider if none exists
if (providerCount.count === 0) {

    const providerResult = db
        .prepare(`
            INSERT INTO providers
            (name, email)
            VALUES (?, ?)
        `)
        .run(
            "Dr. Rahul Sharma",
            "rahul@example.com"
        );

    const providerId = providerResult.lastInsertRowid;

    console.log(
        "Created provider with ID:",
        providerId
    );

    // Monday-Friday
    const insertAvailability = db.prepare(`
        INSERT INTO availability
        (
            provider_id,
            day_of_week,
            start_time,
            end_time,
            slot_duration
        )
        VALUES (?, ?, ?, ?, ?)
    `);

    for (let day = 1; day <= 5; day++) {

        insertAvailability.run(
            providerId,
            day,
            "09:00",
            "17:00",
            30
        );
    }

    console.log(
        "Provider availability created."
    );
}

// Verify provider
const providers = db
    .prepare("SELECT * FROM providers")
    .all();

console.log(
    "Providers in database:",
    providers
);

console.log(
    "Database initialized successfully."
);

module.exports = db;