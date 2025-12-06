// --- Fitness Tracker (Front-end + localStorage) ---

const STORAGE_KEY = "fitness_workouts";

let workouts = [];
let editingId = null;

// ---- Load / Save from localStorage ----
function loadWorkouts() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        workouts = [];
        return;
    }
    try {
        workouts = JSON.parse(raw);
    } catch (e) {
        console.error("Failed to parse workouts from storage", e);
        workouts = [];
    }
}

function saveWorkouts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}

// ---- DOM references ----
const form = document.getElementById("workout-form");
const dateInput = document.getElementById("date");
const typeInput = document.getElementById("type");
const durationInput = document.getElementById("duration");
const notesInput = document.getElementById("notes");

const tbody = document.getElementById("workout-body");
const weeklyTotalCell = document.getElementById("weekly-total");
const summaryText = document.getElementById("summary-text");
const progressFill = document.getElementById("progress-fill");
const badgesList = document.getElementById("badges-list");
const saveButton = document.getElementById("save-button");
const cancelEditButton = document.getElementById("cancel-edit");
const clearAllButton = document.getElementById("clear-all");

// ---- Date helpers for weekly summary ----
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 (Sun) - 6 (Sat)
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday is first
    return new Date(d.getFullYear(), d.getMonth(), diff);
}

function isSameWeek(d1, d2) {
    const m1 = getMonday(d1);
    const m2 = getMonday(d2);
    return (
        m1.getFullYear() === m2.getFullYear() &&
        m1.getMonth() === m2.getMonth() &&
        m1.getDate() === m2.getDate()
    );
}

// ---- Rendering ----
function renderTable() {
    tbody.innerHTML = "";

    if (workouts.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.textContent = "No workouts yet. Add your first one above!";
        td.style.textAlign = "center";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    workouts
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date)) // most recent first
        .forEach((w) => {
            const tr = document.createElement("tr");

            const dateTd = document.createElement("td");
            dateTd.textContent = w.date;

            const typeTd = document.createElement("td");
            typeTd.textContent = w.type;

            const durationTd = document.createElement("td");
            durationTd.textContent = w.duration + " min";

            const notesTd = document.createElement("td");
            notesTd.textContent = w.notes || "-";

            const actionsTd = document.createElement("td");

            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.className = "action-button edit";
            editBtn.addEventListener("click", () => startEdit(w.id));

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Delete";
            deleteBtn.className = "action-button delete";
            deleteBtn.addEventListener("click", () => deleteWorkout(w.id));

            actionsTd.appendChild(editBtn);
            actionsTd.appendChild(deleteBtn);

            tr.appendChild(dateTd);
            tr.appendChild(typeTd);
            tr.appendChild(durationTd);
            tr.appendChild(notesTd);
            tr.appendChild(actionsTd);

            tbody.appendChild(tr);
        });
}

function renderWeeklySummary() {
    const today = new Date();
    let totalMinutes = 0;
    let count = 0;

    workouts.forEach((w) => {
        const d = new Date(w.date);
        if (!isNaN(d) && isSameWeek(d, today)) {
            totalMinutes += Number(w.duration) || 0;
            count += 1;
        }
    });

    summaryText.textContent =
        `${count} workout${count !== 1 ? "s" : ""} • ${totalMinutes} minute${totalMinutes !== 1 ? "s" : ""}`;
    weeklyTotalCell.textContent =
        `Weekly Total: ${totalMinutes} min (${count} workout${count !== 1 ? "s" : ""})`;

    // Progress bar towards 150 min goal
    const goal = 150;
    const pct = Math.min((totalMinutes / goal) * 100, 100);
    progressFill.style.width = pct + "%";

    renderBadges(totalMinutes, count);
}

function renderBadges(totalMinutes, count) {
    badgesList.innerHTML = "";

    if (count === 0) {
        const li = document.createElement("li");
        li.textContent = "No badges yet — start your first workout!";
        badgesList.appendChild(li);
        return;
    }

    const earned = [];

    if (count >= 3) {
        earned.push("Consistency Star (3+ workouts)");
    }
    if (totalMinutes >= 150) {
        earned.push("Goal Crusher (150+ min)");
    }
    if (totalMinutes >= 300) {
        earned.push("Athlete Mode (300+ min)");
    }

    if (earned.length === 0) {
        const li = document.createElement("li");
        li.textContent = "Keep going — you're on your way!";
        badgesList.appendChild(li);
    } else {
        earned.forEach((b) => {
            const li = document.createElement("li");
            li.textContent = b;
            badgesList.appendChild(li);
        });
    }
}

function refreshUI() {
    renderTable();
    renderWeeklySummary();
}

// ---- Actions ----
function addWorkout(workout) {
    workouts.push(workout);
    saveWorkouts();
    refreshUI();
}

function updateWorkout(id, updated) {
    const index = workouts.findIndex((w) => w.id === id);
    if (index !== -1) {
        workouts[index] = { ...workouts[index], ...updated };
        saveWorkouts();
        refreshUI();
    }
}

function deleteWorkout(id) {
    const ok = confirm("Delete this workout?");
    if (!ok) return;
    workouts = workouts.filter((w) => w.id !== id);
    saveWorkouts();
    refreshUI();
}

function clearAllWorkouts() {
    const ok = confirm("Clear all workouts? This cannot be undone.");
    if (!ok) return;
    workouts = [];
    saveWorkouts();
    refreshUI();
}

// ---- Edit mode helpers ----
function startEdit(id) {
    const w = workouts.find((x) => x.id === id);
    if (!w) return;

    editingId = id;
    dateInput.value = w.date;
    typeInput.value = w.type;
    durationInput.value = w.duration;
    notesInput.value = w.notes || "";

    saveButton.textContent = "Save changes";
    cancelEditButton.style.display = "inline-block";
}

function resetForm() {
    editingId = null;
    form.reset();
    saveButton.textContent = "Add workout";
    cancelEditButton.style.display = "none";
}

// ---- Event handling ----
form.addEventListener("submit", (e) => {
    e.preventDefault();

    const dateVal = dateInput.value;
    const typeVal = typeInput.value.trim();
    const durationVal = Number(durationInput.value);
    const notesVal = notesInput.value.trim();

    if (!dateVal || !typeVal || !durationVal || durationVal <= 0) {
        alert("Please fill date, type, and a positive duration.");
        return;
    }

    if (editingId) {
        updateWorkout(editingId, {
            date: dateVal,
            type: typeVal,
            duration: durationVal,
            notes: notesVal
        });
    } else {
        const workout = {
            id: Date.now().toString(),
            date: dateVal,
            type: typeVal,
            duration: durationVal,
            notes: notesVal
        };
        addWorkout(workout);
    }

    resetForm();
});

cancelEditButton.addEventListener("click", () => {
    resetForm();
});

clearAllButton.addEventListener("click", clearAllWorkouts);

// ---- Initialize on page load ----
document.addEventListener("DOMContentLoaded", () => {
    loadWorkouts();
    refreshUI();
});
