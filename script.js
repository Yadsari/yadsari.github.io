//Uses localStorage to save data
const STORAGE_KEY = "fitness_workouts";
const GOAL_KEY = "fitness_weekly_goal";

let workouts = [];
let editingId = null;
let weeklyGoal = 150;

// DOM references
const form = document.getElementById("workout-form");
const dateInput = document.getElementById("date");
const typeInput = document.getElementById("type");
const durationInput = document.getElementById("duration");
const notesInput = document.getElementById("notes");
const saveButton = document.getElementById("save-button");
const cancelEditButton = document.getElementById("cancel-edit");

const historyBody = document.getElementById("history-body");
const weeklyTotalCell = document.getElementById("weekly-total");
const summaryText = document.getElementById("summary-text");
const progressFill = document.getElementById("progress-fill");
const badgesList = document.getElementById("badges-list");
const goalLabel = document.getElementById("goal-label");
const recentList = document.getElementById("recent-list");
const totalCountLabel = document.getElementById("total-count-label");

const statWorkouts = document.getElementById("stat-workouts");
const statMinutes = document.getElementById("stat-minutes");
const statAverage = document.getElementById("stat-average");
const statLongest = document.getElementById("stat-longest");
const statByType = document.getElementById("stat-by-type");

const filterType = document.getElementById("filter-type");
const filterReset = document.getElementById("filter-reset");

const settingsForm = document.getElementById("settings-form");
const goalInput = document.getElementById("goal-input");
const clearAllButton = document.getElementById("clear-all");

const navLinks = document.querySelectorAll(".nav-link");
const views = document.querySelectorAll(".view");

// hero stats
const heroWeekSummary = document.getElementById("hero-week-summary");
const heroWorkoutsCount = document.getElementById("hero-workouts-count");


function loadWorkouts() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        workouts = [];
        return;
    }
    try {
        workouts = JSON.parse(raw);
    } catch (e) {
        console.error("Failed to parse workouts", e);
        workouts = [];
    }
}

function saveWorkouts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}

function loadGoal() {
    const raw = localStorage.getItem(GOAL_KEY);
    if (!raw) {
        weeklyGoal = 150;
        return;
    }
    const parsed = Number(raw);
    weeklyGoal = isNaN(parsed) || parsed <= 0 ? 150 : parsed;
}

function saveGoal() {
    localStorage.setItem(GOAL_KEY, String(weeklyGoal));
}
// Date helpers (week starts on Sunday)
function parseLocalDate(dateStr) {
    if (!dateStr) return new Date(NaN);
    const [year, month, day] = dateStr.split("-");
    return new Date(Number(year), Number(month) - 1, Number(day)); // local calendar date
}

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sun, 1 = Mon
    const diff = d.getDate() - day; // Sunday start of the week
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


// Render functions
function renderHistoryTable() {
    if (!historyBody) return;
    historyBody.innerHTML = "";

    const filtered = workouts
        .slice()
        .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date))
        .filter(w => {
            if (!filterType) return true;
            const ft = filterType.value || "";
            if (!ft) return true;
            return w.type === ft;
        });

    const today = new Date();
    let weeklyMinutes = 0;
    let weeklyCount = 0;

    if (filtered.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.textContent = "No workouts yet. Add your first one on the Dashboard.";
        td.style.textAlign = "center";
        tr.appendChild(td);
        historyBody.appendChild(tr);
    } else {
        filtered.forEach(w => {
            const d = parseLocalDate(w.date);
            if (!isNaN(d) && isSameWeek(d, today)) {
                weeklyMinutes += Number(w.duration) || 0;
                weeklyCount++;
            }

            const tr = document.createElement("tr");

            const dateTd = document.createElement("td");
            dateTd.textContent = w.date;

            const typeTd = document.createElement("td");
            typeTd.textContent = w.type;

            const durationTd = document.createElement("td");
            durationTd.textContent = `${w.duration} min`;

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

            historyBody.appendChild(tr);
        });
    }

    if (weeklyTotalCell) {
        weeklyTotalCell.textContent =
            `Weekly Total: ${weeklyMinutes} min (${weeklyCount} workout${weeklyCount !== 1 ? "s" : ""})`;
    }
}

function renderDashboardSummary() {
    const today = new Date();
    let weeklyMinutes = 0;
    let weeklyCount = 0;

    workouts.forEach(w => {
        const d = parseLocalDate(w.date);
        if (!isNaN(d) && isSameWeek(d, today)) {
            weeklyMinutes += Number(w.duration) || 0;
            weeklyCount++;
        }
    });

    if (summaryText) {
        summaryText.textContent =
            `${weeklyCount} workout${weeklyCount !== 1 ? "s" : ""} • ${weeklyMinutes} minute${weeklyMinutes !== 1 ? "s" : ""}`;
    }

    const pct = Math.min((weeklyMinutes / weeklyGoal) * 100, 100);
    if (progressFill) {
        progressFill.style.width = pct + "%";
    }
    if (goalLabel) {
        goalLabel.textContent = weeklyGoal;
    }

    // hero
    if (heroWeekSummary) heroWeekSummary.textContent = `${weeklyMinutes} min`;
    if (heroWorkoutsCount) heroWorkoutsCount.textContent = workouts.length;

    renderBadges(weeklyMinutes, weeklyCount);
}

function renderBadges(totalMinutes, count) {
    if (!badgesList) return;
    badgesList.innerHTML = "";

    if (count === 0) {
        const li = document.createElement("li");
        li.textContent = "No badges yet — log your first workout!";
        badgesList.appendChild(li);
        return;
    }

    const earned = [];

    if (count >= 3) {
        earned.push("Consistency Star (3+ workouts)");
    }
    if (totalMinutes >= weeklyGoal) {
        earned.push("Goal Crusher (Hit your weekly goal)");
    }
    if (totalMinutes >= weeklyGoal * 2) {
        earned.push("Athlete Mode (2x weekly goal)");
    }

    if (earned.length === 0) {
        const li = document.createElement("li");
        li.textContent = "Keep going — you're getting closer!";
        badgesList.appendChild(li);
    } else {
        earned.forEach(label => {
            const li = document.createElement("li");
            li.textContent = label;
            badgesList.appendChild(li);
        });
    }
}

function renderRecent() {
    if (!recentList || !totalCountLabel) return;
    recentList.innerHTML = "";

    if (workouts.length === 0) {
        totalCountLabel.textContent = "No workouts yet";
        const li = document.createElement("li");
        li.textContent = "Your most recent workouts will appear here.";
        li.style.fontSize = "14px";
        li.style.color = "#60735f";
        recentList.appendChild(li);
        return;
    }

    totalCountLabel.textContent = `${workouts.length} total workout${workouts.length !== 1 ? "s" : ""}`;

    const sorted = workouts
        .slice()
        .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date))
        .slice(0, 5);

    sorted.forEach(w => {
        const li = document.createElement("li");
        li.className = "recent-item";

        const left = document.createElement("div");
        left.className = "recent-meta";
        const typeSpan = document.createElement("span");
        typeSpan.className = "recent-type";
        typeSpan.textContent = w.type;
        const notesSpan = document.createElement("span");
        notesSpan.className = "recent-notes";
        notesSpan.textContent = w.notes || "No notes";
        left.appendChild(typeSpan);
        left.appendChild(notesSpan);

        const right = document.createElement("div");
        right.className = "recent-right";
        const durationSpan = document.createElement("span");
        durationSpan.textContent = `${w.duration} min`;
        const dateSpan = document.createElement("span");
        dateSpan.textContent = w.date;
        right.appendChild(durationSpan);
        right.appendChild(dateSpan);

        li.appendChild(left);
        li.appendChild(right);
        recentList.appendChild(li);
    });
}

function renderStats() {
    if (!statWorkouts || !statMinutes || !statAverage || !statLongest || !statByType) return;

    const totalWorkouts = workouts.length;
    const totalMinutes = workouts.reduce((sum, w) => sum + (Number(w.duration) || 0), 0);
    const longest = workouts.reduce((max, w) => Math.max(max, Number(w.duration) || 0), 0);
    const avg = totalWorkouts === 0 ? 0 : Math.round(totalMinutes / totalWorkouts);

    statWorkouts.textContent = totalWorkouts;
    statMinutes.textContent = totalMinutes;
    statLongest.textContent = `${longest} min`;
    statAverage.textContent = `${avg} min`;

    // by type this week
    statByType.innerHTML = "";
    if (workouts.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No workouts logged yet.";
        statByType.appendChild(li);
        return;
    }

    const today = new Date();
    const map = {};

    workouts.forEach(w => {
        const d = parseLocalDate(w.date);
        if (!isNaN(d) && isSameWeek(d, today)) {
            const key = w.type || "Other";
            const minutes = Number(w.duration) || 0;
            if (!map[key]) {
                map[key] = { minutes: 0, count: 0 };
            }
            map[key].minutes += minutes;
            map[key].count += 1;
        }
    });

    const entries = Object.entries(map);
    if (entries.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No workouts this week yet.";
        statByType.appendChild(li);
        return;
    }

    entries.forEach(([type, obj]) => {
        const li = document.createElement("li");
        const left = document.createElement("span");
        const right = document.createElement("span");
        left.textContent = `${type}`;
        right.textContent = `${obj.minutes} min · ${obj.count}x`;
        li.appendChild(left);
        li.appendChild(right);
        statByType.appendChild(li);
    });
}

function refreshUI() {
    renderDashboardSummary();
    renderRecent();
    renderHistoryTable();
    renderStats();
}

function addWorkout(workout) {
    workouts.push(workout);
    saveWorkouts();
    refreshUI();
}

function updateWorkout(id, updated) {
    const index = workouts.findIndex(w => w.id === id);
    if (index !== -1) {
        workouts[index] = { ...workouts[index], ...updated };
        saveWorkouts();
        refreshUI();
    }
}

function deleteWorkout(id) {
    if (!confirm("Delete this workout?")) return;
    workouts = workouts.filter(w => w.id !== id);
    saveWorkouts();
    refreshUI();
}

function clearAllWorkouts() {
    if (!confirm("Clear all workouts? This cannot be undone.")) return;
    workouts = [];
    saveWorkouts();
    refreshUI();
}

// Edit form
function startEdit(id) {
    const w = workouts.find(x => x.id === id);
    if (!w) return;

    editingId = id;
    dateInput.value = w.date;
    typeInput.value = w.type;
    durationInput.value = w.duration;
    notesInput.value = w.notes || "";

    saveButton.textContent = "Save changes";
    cancelEditButton.style.display = "inline-block";

    showView("dashboard");
}

function resetForm() {
    editingId = null;
    form.reset();
    saveButton.textContent = "Add workout";
    cancelEditButton.style.display = "none";
}

// ----------------- View navigation -----------------
function showView(name) {
    views.forEach(v => {
        if (v.id === `view-${name}`) {
            v.classList.add("active");
        } else {
            v.classList.remove("active");
        }
    });

    navLinks.forEach(btn => {
        if (btn.dataset.view === name) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
}

// Event listeners
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

if (cancelEditButton) {
    cancelEditButton.addEventListener("click", () => {
        resetForm();
    });
}

if (navLinks.length) {
    navLinks.forEach(btn => {
        btn.addEventListener("click", () => {
            const view = btn.dataset.view;
            showView(view);
        });
    });
}

if (filterType) {
    filterType.addEventListener("change", () => {
        renderHistoryTable();
    });
}

if (filterReset) {
    filterReset.addEventListener("click", () => {
        filterType.value = "";
        renderHistoryTable();
    });
}

if (settingsForm) {
    settingsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const val = Number(goalInput.value);
        if (!val || val <= 0) {
            alert("Please enter a positive number for the weekly goal.");
            return;
        }
        weeklyGoal = val;
        saveGoal();
        refreshUI();
    });
}

if (clearAllButton) {
    clearAllButton.addEventListener("click", clearAllWorkouts);
}

document.addEventListener("DOMContentLoaded", () => {
    loadWorkouts();
    loadGoal();
    if (goalInput) goalInput.value = weeklyGoal;
    if (goalLabel) goalLabel.textContent = weeklyGoal;
    refreshUI();
    showView("dashboard");
});
