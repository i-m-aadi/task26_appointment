const providerSelect = document.getElementById("providerSelect");
const dateInput = document.getElementById("dateInput");
const slotsContainer = document.getElementById("slotsContainer");
const bookingSection = document.getElementById("bookingSection");
const bookingForm = document.getElementById("bookingForm");
const selectedSlot = document.getElementById("selectedSlot");
const appointmentsContainer =
    document.getElementById("appointmentsContainer");

let selectedProvider = "";
let selectedDate = "";
let selectedStartTime = "";
let selectedEndTime = "";

// -------------------------------------
// LOAD PROVIDERS
// -------------------------------------

async function loadProviders() {
    console.log("Loading providers...");

    try {
        const response = await fetch("/api/providers");

        console.log("Provider response:", response.status);

        if (!response.ok) {
            throw new Error(
                `Server returned ${response.status}`
            );
        }

        const providers = await response.json();

        console.log("Providers received:", providers);

        providerSelect.innerHTML = "";

        const defaultOption =
            document.createElement("option");

        defaultOption.value = "";
        defaultOption.textContent =
            "Select a provider";

        providerSelect.appendChild(defaultOption);

        if (!Array.isArray(providers) || providers.length === 0) {
            const option =
                document.createElement("option");

            option.disabled = true;
            option.textContent =
                "No providers available";

            providerSelect.appendChild(option);

            return;
        }

        providers.forEach(provider => {
            const option =
                document.createElement("option");

            option.value = provider.id;

            option.textContent =
                `${provider.name} - ${provider.email}`;

            providerSelect.appendChild(option);
        });

    } catch (error) {
        console.error(
            "ERROR LOADING PROVIDERS:",
            error
        );

        providerSelect.innerHTML = `
            <option value="">
                Error loading providers
            </option>
        `;
    }
}


// -------------------------------------
// PROVIDER CHANGE
// -------------------------------------

providerSelect.addEventListener("change", () => {

    selectedProvider =
        providerSelect.value;

    console.log(
        "Selected provider:",
        selectedProvider
    );

    bookingSection.style.display = "none";

    if (selectedProvider && dateInput.value) {
        loadSlots();
    }
});


// -------------------------------------
// DATE CHANGE
// -------------------------------------

dateInput.addEventListener("change", () => {

    selectedDate =
        dateInput.value;

    console.log(
        "Selected date:",
        selectedDate
    );

    bookingSection.style.display = "none";

    if (selectedProvider && selectedDate) {
        loadSlots();
    }
});


// -------------------------------------
// LOAD SLOTS
// -------------------------------------

async function loadSlots() {

    slotsContainer.innerHTML =
        "<p>Loading available slots...</p>";

    try {

        const url =
            `/api/slots?provider_id=${selectedProvider}&date=${selectedDate}`;

        console.log("Loading slots:", url);

        const response =
            await fetch(url);

        const slots =
            await response.json();

        console.log("Slots:", slots);

        if (!response.ok) {
            throw new Error(
                slots.error || "Unable to load slots"
            );
        }

        if (slots.length === 0) {

            slotsContainer.innerHTML = `
                <p class="empty">
                    No available slots for this date.
                    <br>
                    Please choose a Monday-Friday date.
                </p>
            `;

            return;
        }

        slotsContainer.innerHTML =
            `<div class="slots"></div>`;

        const slotsDiv =
            slotsContainer.querySelector(".slots");

        slots.forEach(slot => {

            const button =
                document.createElement("button");

            button.type = "button";
            button.className = "slot";

            button.textContent =
                `${slot.start_time} - ${slot.end_time}`;

            button.addEventListener(
                "click",
                () => {

                    selectedStartTime =
                        slot.start_time;

                    selectedEndTime =
                        slot.end_time;

                    selectedSlot.textContent =
                        `${selectedDate} | ${selectedStartTime} - ${selectedEndTime}`;

                    bookingSection.style.display =
                        "block";

                    bookingSection.scrollIntoView({
                        behavior: "smooth"
                    });
                }
            );

            slotsDiv.appendChild(button);
        });

    } catch (error) {

        console.error(
            "ERROR LOADING SLOTS:",
            error
        );

        slotsContainer.innerHTML = `
            <p class="empty">
                Error loading slots:
                ${error.message}
            </p>
        `;
    }
}


// -------------------------------------
// BOOK APPOINTMENT
// -------------------------------------

bookingForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const clientName =
            document.getElementById(
                "clientName"
            ).value.trim();

        const clientEmail =
            document.getElementById(
                "clientEmail"
            ).value.trim();

        try {

            const response =
                await fetch(
                    "/api/appointments",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            provider_id:
                                selectedProvider,

                            client_name:
                                clientName,

                            client_email:
                                clientEmail,

                            appointment_date:
                                selectedDate,

                            start_time:
                                selectedStartTime,

                            end_time:
                                selectedEndTime
                        })
                    }
                );

            const result =
                await response.json();

            if (!response.ok) {

                alert(
                    result.error ||
                    "Unable to book appointment."
                );

                return;
            }

            alert(
                "Appointment booked successfully!"
            );

            bookingForm.reset();

            bookingSection.style.display =
                "none";

            await loadSlots();
            await loadAppointments();

        } catch (error) {

            console.error(error);

            alert(
                "Unable to connect to server."
            );
        }
    }
);


// -------------------------------------
// LOAD APPOINTMENTS
// -------------------------------------

async function loadAppointments() {

    try {

        const response =
            await fetch(
                "/api/appointments"
            );

        const appointments =
            await response.json();

        if (appointments.length === 0) {

            appointmentsContainer.innerHTML = `
                <p class="empty">
                    No appointments found.
                </p>
            `;

            return;
        }

        appointmentsContainer.innerHTML = "";

        appointments.forEach(appointment => {

            const div =
                document.createElement("div");

            div.className =
                "appointment";

            div.innerHTML = `
                <h3>
                    ${appointment.client_name}
                </h3>

                <p>
                    <strong>Provider:</strong>
                    ${appointment.provider_name}
                </p>

                <p>
                    <strong>Date:</strong>
                    ${appointment.appointment_date}
                </p>

                <p>
                    <strong>Time:</strong>
                    ${appointment.start_time}
                    -
                    ${appointment.end_time}
                </p>

                <p>
                    <strong>Email:</strong>
                    ${appointment.client_email}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${appointment.status}
                </p>

                ${
                    appointment.status === "booked"
                    ? `
                        <button
                            class="cancel"
                            onclick="cancelAppointment(${appointment.id})"
                        >
                            Cancel
                        </button>

                        <button
                            class="reschedule"
                            onclick="rescheduleAppointment(${appointment.id})"
                        >
                            Reschedule
                        </button>
                    `
                    : ""
                }
            `;

            appointmentsContainer.appendChild(div);
        });

    } catch (error) {

        console.error(
            "ERROR LOADING APPOINTMENTS:",
            error
        );

        appointmentsContainer.innerHTML = `
            <p class="empty">
                Error loading appointments.
            </p>
        `;
    }
}


// -------------------------------------
// CANCEL
// -------------------------------------

async function cancelAppointment(id) {

    if (
        !confirm(
            "Are you sure you want to cancel this appointment?"
        )
    ) {
        return;
    }

    try {

        const response =
            await fetch(
                `/api/appointments/${id}/cancel`,
                {
                    method: "PATCH"
                }
            );

        const result =
            await response.json();

        if (!response.ok) {
            alert(result.error);
            return;
        }

        alert(
            "Appointment cancelled successfully."
        );

        await loadAppointments();

        if (selectedProvider && selectedDate) {
            await loadSlots();
        }

    } catch (error) {

        console.error(error);

        alert(
            "Unable to cancel appointment."
        );
    }
}


// -------------------------------------
// RESCHEDULE
// -------------------------------------

async function rescheduleAppointment(id) {

    const newDate =
        prompt(
            "Enter new date (YYYY-MM-DD):"
        );

    if (!newDate) return;

    const newStart =
        prompt(
            "Enter new start time (HH:MM):"
        );

    if (!newStart) return;

    const newEnd =
        prompt(
            "Enter new end time (HH:MM):"
        );

    if (!newEnd) return;

    try {

        const response =
            await fetch(
                `/api/appointments/${id}/reschedule`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        appointment_date:
                            newDate,
                        start_time:
                            newStart,
                        end_time:
                            newEnd
                    })
                }
            );

        const result =
            await response.json();

        if (!response.ok) {
            alert(result.error);
            return;
        }

        alert(
            "Appointment rescheduled successfully."
        );

        await loadAppointments();

    } catch (error) {

        console.error(error);

        alert(
            "Unable to reschedule appointment."
        );
    }
}


// -------------------------------------
// START APPLICATION
// -------------------------------------

console.log(
    "Appointment application started."
);

loadProviders();
loadAppointments();