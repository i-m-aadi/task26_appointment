# 📅 Appointment Booking System

A full-stack web-based Appointment Booking System that allows clients to view provider availability, select available time slots, book appointments, and manage existing appointments.

The system automatically generates appointment slots based on provider availability and prevents double-booking through backend validation and SQLite database constraints.

---

## 🚀 Features

### 👨‍⚕️ Provider Management
- View available service providers
- Store provider name and email
- Configure provider working hours
- Configure appointment slot duration

### 📆 Availability Management
- Provider availability based on day of the week
- Configurable working hours
- Automatic generation of available time slots
- 30-minute default appointment slots

### 👤 Client Booking
- Select a provider
- Select an appointment date
- View available time slots
- Enter client name and email
- Confirm an appointment

### 🔒 Conflict Prevention
- Prevents double-booking
- Checks for overlapping appointments
- Backend validation
- SQLite unique constraint for additional protection

### ❌ Cancellation
- Cancel existing appointments
- Cancelled appointments no longer occupy a time slot
- Cancelled slots become available again

### 🔄 Rescheduling
- Reschedule an existing appointment
- Check for conflicts before changing the appointment
- Update date and time

### 🗄️ Database
- SQLite database
- Automatic database initialization
- Automatic table creation
- Default provider and availability are created automatically

---

## 🛠️ Technologies Used

### Frontend

- HTML5
- CSS3
- JavaScript
- Fetch API

### Backend

- Node.js
- Express.js
- REST API

### Database

- SQLite
- better-sqlite3

### Other

- CORS
- Git / GitHub

---

## 📂 Project Structure

```text
appointment-booking-system/
│
├── server.js
├── database.js
├── package.json
├── .gitignore
├── README.md
│
├── database/
│   └── appointments.db
│
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/appointment-booking-system.git
```

### 2. Open the project

```bash
cd appointment-booking-system
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the server

```bash
npm start
```

The server will start at:

```text
http://localhost:3000
```

Open the URL in your browser.

---

## 👨‍⚕️ Default Provider

When the application starts for the first time, the database automatically creates a default provider:

```text
Name: Dr. Rahul Sharma
Email: rahul@example.com
```

Default availability:

```text
Monday - Friday
09:00 AM - 05:00 PM
30-minute appointment slots
```

---

## 📡 REST API

### Get Providers

```http
GET /api/providers
```

Returns all available providers.

---

### Add Provider

```http
POST /api/providers
```

Example request:

```json
{
    "name": "Dr. Amit Kumar",
    "email": "amit@example.com"
}
```

---

### Get Provider Availability

```http
GET /api/availability/:providerId
```

Example:

```text
/api/availability/1
```

---

### Add Provider Availability

```http
POST /api/availability
```

Example:

```json
{
    "provider_id": 1,
    "day_of_week": 1,
    "start_time": "09:00",
    "end_time": "17:00",
    "slot_duration": 30
}
```

Day of week:

```text
0 = Sunday
1 = Monday
2 = Tuesday
3 = Wednesday
4 = Thursday
5 = Friday
6 = Saturday
```

---

### Get Available Slots

```http
GET /api/slots?provider_id=1&date=2026-09-11
```

Example response:

```json
[
    {
        "start_time": "09:00",
        "end_time": "09:30"
    },
    {
        "start_time": "09:30",
        "end_time": "10:00"
    },
    {
        "start_time": "10:00",
        "end_time": "10:30"
    }
]
```

---

### Book Appointment

```http
POST /api/appointments
```

Example:

```json
{
    "provider_id": 1,
    "client_name": "Aditya",
    "client_email": "aditya@gmail.com",
    "appointment_date": "2026-09-11",
    "start_time": "10:00",
    "end_time": "10:30"
}
```

Successful response:

```json
{
    "message": "Appointment booked successfully.",
    "appointment_id": 1
}
```

---

### Get Appointments

```http
GET /api/appointments
```

You can also filter by provider:

```http
GET /api/appointments?provider_id=1
```

Or by date:

```http
GET /api/appointments?date=2026-09-11
```

---

### Cancel Appointment

```http
PATCH /api/appointments/:id/cancel
```

Example:

```text
/api/appointments/1/cancel
```

---

### Reschedule Appointment

```http
PATCH /api/appointments/:id/reschedule
```

Example:

```json
{
    "appointment_date": "2026-09-14",
    "start_time": "11:00",
    "end_time": "11:30"
}
```

---

## 🔐 Double-Booking Prevention

The application uses multiple levels of conflict prevention.

### 1. Backend Conflict Check

Before creating an appointment, the server checks whether another appointment overlaps with the requested time.

```sql
AND start_time < ?
AND end_time > ?
```

This prevents overlapping appointments.

### 2. Database Constraint

SQLite also has a unique index:

```sql
CREATE UNIQUE INDEX unique_active_appointment
ON appointments(
    provider_id,
    appointment_date,
    start_time
)
WHERE status = 'booked';
```

This provides an additional layer of protection against duplicate bookings.

---

## 🧮 Slot Generation

The system automatically generates slots according to provider availability.

For example:

```text
Working Hours:
09:00 - 17:00

Slot Duration:
30 minutes
```

The system generates:

```text
09:00 - 09:30
09:30 - 10:00
10:00 - 10:30
10:30 - 11:00
...
16:00 - 16:30
16:30 - 17:00
```

An 8-hour working period produces:

```text
480 minutes / 30 minutes = 16 slots
```

Already-booked slots are automatically removed from the available slot list.

---

## 🔄 Appointment Lifecycle

```text
Available Slot
      │
      ▼
Book Appointment
      │
      ▼
   Booked
   /    \
  /      \
Cancel   Reschedule
  │         │
  ▼         ▼
Cancelled  Updated
```

---

## 🖥️ Application Workflow

```text
Client
  │
  ▼
Select Provider
  │
  ▼
Select Date
  │
  ▼
View Available Slots
  │
  ▼
Select Time
  │
  ▼
Enter Client Details
  │
  ▼
Confirm Appointment
  │
  ▼
Backend Validation
  │
  ├── Conflict → Reject Booking
  │
  └── Available → Save Appointment
                         │
                         ▼
                    Confirmation
```

---

## 🧪 Testing

The following scenarios can be tested:

### Test 1 — Provider Selection

Select a provider from the dropdown.

Expected:

```text
Provider information is displayed.
```

### Test 2 — Available Slots

Select a weekday.

Expected:

```text
Available appointment slots are displayed.
```

### Test 3 — Booking

Select a slot and enter valid client details.

Expected:

```text
Appointment booked successfully.
```

### Test 4 — Double Booking

Attempt to book an already booked slot.

Expected:

```text
This time slot is already booked.
```

### Test 5 — Cancellation

Cancel an existing appointment.

Expected:

```text
Appointment cancelled successfully.
```

The slot becomes available again.

### Test 6 — Rescheduling

Move an appointment to another available time.

Expected:

```text
Appointment rescheduled successfully.
```

---

## 🔮 Future Improvements

The current application provides the core appointment booking functionality. Future versions can include:

- Provider/Admin dashboard
- Client authentication
- Provider authentication
- Role-based authorization
- Interactive calendar
- Email confirmation
- SMS notifications
- Google Calendar integration
- Timezone support
- Appointment reminders
- Search and filtering
- Appointment history
- Provider-specific services
- Multiple appointment durations
- Payment integration
- Deployment using Render/Railway/AWS
- PostgreSQL or MongoDB for production use

---

## 📸 Screenshots

Add screenshots of the application here:

```text
screenshots/
├── home.png
├── available-slots.png
├── booking.png
└── appointments.png
```

Example:

```markdown
![Appointment Booking System](screenshots/home.png)
```

---

## 📚 Learning Outcomes

This project demonstrates practical experience with:

- Full-stack web development
- REST API development
- Node.js and Express.js
- SQLite database integration
- Database schema design
- CRUD operations
- Asynchronous JavaScript
- Fetch API
- Form handling
- Date and time processing
- Conflict detection
- Database constraints
- Frontend-backend integration
- Error handling

---

## 👨‍💻 Author

**Your Name**

GitHub: `https://github.com/YOUR_USERNAME`

LinkedIn: `https://linkedin.com/in/YOUR_USERNAME`

---

## 📄 License

This project is created for educational and portfolio purposes.

You are free to modify and improve the project.