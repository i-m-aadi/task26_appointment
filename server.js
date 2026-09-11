const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./database");

const app = express();

const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/*
--------------------------------------------------
UTILITY FUNCTIONS
--------------------------------------------------
*/

function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60)
        .toString()
        .padStart(2, "0");

    const mins = (minutes % 60)
        .toString()
        .padStart(2, "0");

    return `${hours}:${mins}`;
}

/*
--------------------------------------------------
GET PROVIDERS
--------------------------------------------------
*/

app.get("/api/providers", (req, res) => {
    try {
        const providers = db
            .prepare("SELECT * FROM providers ORDER BY name")
            .all();

        res.json(providers);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

/*
--------------------------------------------------
ADD PROVIDER
--------------------------------------------------
*/

app.post("/api/providers", (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({
            error: "Name and email are required."
        });
    }

    try {
        const result = db
            .prepare(`
                INSERT INTO providers (name, email)
                VALUES (?, ?)
            `)
            .run(name, email);

        res.status(201).json({
            id: result.lastInsertRowid,
            name,
            email
        });
    } catch (error) {
        res.status(400).json({
            error: "Provider already exists or invalid data."
        });
    }
});

/*
--------------------------------------------------
SET PROVIDER AVAILABILITY
--------------------------------------------------
*/

app.post("/api/availability", (req, res) => {
    const {
        provider_id,
        day_of_week,
        start_time,
        end_time,
        slot_duration
    } = req.body;

    if (
        !provider_id ||
        day_of_week === undefined ||
        !start_time ||
        !end_time ||
        !slot_duration
    ) {
        return res.status(400).json({
            error: "All availability fields are required."
        });
    }

    if (timeToMinutes(start_time) >= timeToMinutes(end_time)) {
        return res.status(400).json({
            error: "Start time must be before end time."
        });
    }

    try {
        const result = db
            .prepare(`
                INSERT INTO availability
                (
                    provider_id,
                    day_of_week,
                    start_time,
                    end_time,
                    slot_duration
                )
                VALUES (?, ?, ?, ?, ?)
            `)
            .run(
                provider_id,
                day_of_week,
                start_time,
                end_time,
                slot_duration
            );

        res.status(201).json({
            id: result.lastInsertRowid,
            message: "Availability added successfully."
        });

    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

/*
--------------------------------------------------
GET AVAILABILITY
--------------------------------------------------
*/

app.get("/api/availability/:providerId", (req, res) => {
    const providerId = req.params.providerId;

    try {
        const availability = db
            .prepare(`
                SELECT *
                FROM availability
                WHERE provider_id = ?
                ORDER BY day_of_week, start_time
            `)
            .all(providerId);

        res.json(availability);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

/*
--------------------------------------------------
GENERATE AVAILABLE SLOTS
--------------------------------------------------
*/

app.get("/api/slots", (req, res) => {
    const {
        provider_id,
        date
    } = req.query;

    if (!provider_id || !date) {
        return res.status(400).json({
            error: "provider_id and date are required."
        });
    }

    try {
        const selectedDate = new Date(`${date}T00:00:00`);

        if (isNaN(selectedDate.getTime())) {
            return res.status(400).json({
                error: "Invalid date."
            });
        }

        const dayOfWeek = selectedDate.getDay();

        const availability = db
            .prepare(`
                SELECT *
                FROM availability
                WHERE provider_id = ?
                AND day_of_week = ?
            `)
            .all(provider_id, dayOfWeek);

        if (availability.length === 0) {
            return res.json([]);
        }

        const bookings = db
            .prepare(`
                SELECT start_time, end_time
                FROM appointments
                WHERE provider_id = ?
                AND appointment_date = ?
                AND status = 'booked'
            `)
            .all(provider_id, date);

        const slots = [];

        for (const schedule of availability) {

            const start = timeToMinutes(schedule.start_time);
            const end = timeToMinutes(schedule.end_time);

            for (
                let current = start;
                current + schedule.slot_duration <= end;
                current += schedule.slot_duration
            ) {

                const slotStart = minutesToTime(current);

                const slotEnd = minutesToTime(
                    current + schedule.slot_duration
                );

                const conflict = bookings.some(booking => {

                    const bookingStart =
                        timeToMinutes(booking.start_time);

                    const bookingEnd =
                        timeToMinutes(booking.end_time);

                    return (
                        current < bookingEnd &&
                        current + schedule.slot_duration > bookingStart
                    );
                });

                if (!conflict) {
                    slots.push({
                        start_time: slotStart,
                        end_time: slotEnd
                    });
                }
            }
        }

        res.json(slots);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

/*
--------------------------------------------------
BOOK APPOINTMENT
--------------------------------------------------
*/

app.post("/api/appointments", (req, res) => {

    const {
        provider_id,
        client_name,
        client_email,
        appointment_date,
        start_time,
        end_time
    } = req.body;

    if (
        !provider_id ||
        !client_name ||
        !client_email ||
        !appointment_date ||
        !start_time ||
        !end_time
    ) {
        return res.status(400).json({
            error: "All fields are required."
        });
    }

    try {

        /*
        Check provider availability
        */

        const date = new Date(
            `${appointment_date}T00:00:00`
        );

        const dayOfWeek = date.getDay();

        const availability = db
            .prepare(`
                SELECT *
                FROM availability
                WHERE provider_id = ?
                AND day_of_week = ?
            `)
            .all(provider_id, dayOfWeek);

        const requestedStart =
            timeToMinutes(start_time);

        const requestedEnd =
            timeToMinutes(end_time);

        const withinWorkingHours =
            availability.some(schedule => {

                return (
                    requestedStart >=
                        timeToMinutes(schedule.start_time) &&
                    requestedEnd <=
                        timeToMinutes(schedule.end_time)
                );
            });

        if (!withinWorkingHours) {
            return res.status(400).json({
                error: "The selected time is outside provider availability."
            });
        }

        /*
        Check existing appointment
        */

        const conflict = db
            .prepare(`
                SELECT *
                FROM appointments
                WHERE provider_id = ?
                AND appointment_date = ?
                AND status = 'booked'
                AND start_time < ?
                AND end_time > ?
            `)
            .get(
                provider_id,
                appointment_date,
                end_time,
                start_time
            );

        if (conflict) {
            return res.status(409).json({
                error: "This time slot is already booked."
            });
        }

        /*
        Insert appointment
        */

        const result = db
            .prepare(`
                INSERT INTO appointments
                (
                    provider_id,
                    client_name,
                    client_email,
                    appointment_date,
                    start_time,
                    end_time,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, 'booked')
            `)
            .run(
                provider_id,
                client_name,
                client_email,
                appointment_date,
                start_time,
                end_time
            );

        res.status(201).json({
            message: "Appointment booked successfully.",
            appointment_id: result.lastInsertRowid
        });

    } catch (error) {

        /*
        Database-level conflict protection
        */

        if (
            error.message.includes(
                "UNIQUE constraint failed"
            )
        ) {
            return res.status(409).json({
                error: "This slot has just been booked by someone else."
            });
        }

        res.status(500).json({
            error: error.message
        });
    }
});

/*
--------------------------------------------------
GET APPOINTMENTS
--------------------------------------------------
*/

app.get("/api/appointments", (req, res) => {

    const {
        provider_id,
        date
    } = req.query;

    try {

        let query = `
            SELECT
                appointments.*,
                providers.name AS provider_name
            FROM appointments
            JOIN providers
            ON appointments.provider_id = providers.id
            WHERE 1 = 1
        `;

        const params = [];

        if (provider_id) {
            query += " AND appointments.provider_id = ?";
            params.push(provider_id);
        }

        if (date) {
            query += " AND appointments.appointment_date = ?";
            params.push(date);
        }

        query += `
            ORDER BY
            appointment_date,
            start_time
        `;

        const appointments = db
            .prepare(query)
            .all(...params);

        res.json(appointments);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

/*
--------------------------------------------------
CANCEL APPOINTMENT
--------------------------------------------------
*/

app.patch("/api/appointments/:id/cancel", (req, res) => {

    const id = req.params.id;

    try {

        const result = db
            .prepare(`
                UPDATE appointments
                SET status = 'cancelled'
                WHERE id = ?
                AND status = 'booked'
            `)
            .run(id);

        if (result.changes === 0) {
            return res.status(404).json({
                error: "Appointment not found or already cancelled."
            });
        }

        res.json({
            message: "Appointment cancelled successfully."
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

/*
--------------------------------------------------
RESCHEDULE APPOINTMENT
--------------------------------------------------
*/

app.patch("/api/appointments/:id/reschedule", (req, res) => {

    const id = req.params.id;

    const {
        appointment_date,
        start_time,
        end_time
    } = req.body;

    if (!appointment_date || !start_time || !end_time) {
        return res.status(400).json({
            error: "Date and time are required."
        });
    }

    try {

        const appointment = db
            .prepare(`
                SELECT *
                FROM appointments
                WHERE id = ?
                AND status = 'booked'
            `)
            .get(id);

        if (!appointment) {
            return res.status(404).json({
                error: "Appointment not found."
            });
        }

        /*
        Check conflict excluding current appointment
        */

        const conflict = db
            .prepare(`
                SELECT *
                FROM appointments
                WHERE provider_id = ?
                AND appointment_date = ?
                AND status = 'booked'
                AND id != ?
                AND start_time < ?
                AND end_time > ?
            `)
            .get(
                appointment.provider_id,
                appointment_date,
                id,
                end_time,
                start_time
            );

        if (conflict) {
            return res.status(409).json({
                error: "The new time slot is already booked."
            });
        }

        db.prepare(`
            UPDATE appointments
            SET
                appointment_date = ?,
                start_time = ?,
                end_time = ?
            WHERE id = ?
        `).run(
            appointment_date,
            start_time,
            end_time,
            id
        );

        res.json({
            message: "Appointment rescheduled successfully."
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

/*
--------------------------------------------------
DEFAULT ROUTE
--------------------------------------------------
*/

app.get("*", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

/*
--------------------------------------------------
START SERVER
--------------------------------------------------
*/

app.listen(PORT, () => {
    console.log(`
=========================================
 Appointment Booking System
=========================================
 Server running at:
 http://localhost:${PORT}
=========================================
`);
});