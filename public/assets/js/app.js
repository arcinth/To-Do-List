// ------------------- app.js -------------------

// Element references
const taskList = document.getElementById("taskList");
const addTaskModal = document.getElementById("taskModal");
const analysisModal = document.getElementById("analysisModal");
const openAddTaskBtn = document.getElementById("myBtn");
const saveTaskBtn = document.querySelector("#taskForm button[type='submit']");
const analyzeBtn = document.getElementById("analysisBtn");
const taskProgressBar = document.getElementById("taskProgressBar");
const searchInput = document.getElementById("searchInput");
const sortBy = document.getElementById("sortBy");
const subtasksWrapper = document.getElementById("subtask-list");
const addSubtaskBtn = document.getElementById("addSubtaskBtn");

let chartInstance = null;
const apiBase = "/api/tasks"; // Backend endpoint
let tasksData = [];

// ------------------- MODAL CONTROLS -------------------
openAddTaskBtn.onclick = () => (addTaskModal.style.display = "block");
addTaskModal.querySelector(".btn-close").onclick = () => (addTaskModal.style.display = "none");
analysisModal.querySelector("button").onclick = () => (analysisModal.style.display = "none");

// ------------------- FETCH TASKS -------------------
async function fetchTasks() {
  try {
    const res = await fetch(apiBase);
    const data = await res.json();

    // Remove duplicates by ID
    tasksData = data.filter((task, index, self) =>
      index === self.findIndex(t => t.id === task.id)
    );

    renderTasks(tasksData);
    updateStats(tasksData);
  } catch (err) {
    console.error("Error fetching tasks:", err);
  }
}

// ------------------- RENDER TASKS -------------------
function renderTasks(tasks) {
  taskList.innerHTML = "";

  if (!tasks || tasks.length === 0) {
    taskList.innerHTML = `<p class="empty">No tasks yet! Add one using the + button.</p>`;
    return;
  }

  tasks.forEach(task => {
    const li = document.createElement("li");
    li.className = "task-item d-flex justify-content-between align-items-center mb-2";

    // Task text
    const span = document.createElement("span");
    span.textContent = `${task.name} (${task.priority})`;
    if (task.completed) {
      span.style.textDecoration = "line-through";
      span.style.color = "gray";
    }
    li.appendChild(span);

    // Buttons container
    const btnDiv = document.createElement("div");

    // Complete / Toggle
    const completeBtn = document.createElement("button");
    completeBtn.className = "btn btn-sm btn-success me-2";
    completeBtn.textContent = task.completed ? "Completed" : "Mark Complete";
    completeBtn.onclick = async () => {
      try {
        await fetch(`${apiBase}/${task.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: !task.completed })
        });
        fetchTasks();
      } catch (err) {
        console.error("Error updating task:", err);
      }
    };
    btnDiv.appendChild(completeBtn);

    // Delete
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-sm btn-danger";
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = async () => {
      if (confirm("Are you sure you want to delete this task?")) {
        try {
          await fetch(`${apiBase}/${task.id}`, { method: "DELETE" });
          fetchTasks();
        } catch (err) {
          console.error("Error deleting task:", err);
        }
      }
    };
    btnDiv.appendChild(deleteBtn);

    li.appendChild(btnDiv);
    taskList.appendChild(li);
  });
}

// ------------------- ADD TASK -------------------
document.getElementById("taskForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("taskTitle").value.trim();
  const priority = document.getElementById("priorityInput").value;
  const stage = document.getElementById("stageSelect").value;
  const startDate = document.getElementById("startDate").value;
  const dueDate = document.getElementById("dueDate").value;
  const deadlineTime = document.getElementById("deadlineTime").value;
  const notes = document.getElementById("taskNotes").value;
  const subtasks = Array.from(subtasksWrapper.querySelectorAll("input")).map(input => input.value);

  if (!name) return alert("Please enter a task name!");

  const task = { name, priority, stage, startDate, dueDate, deadlineTime, notes, subtasks };

  try {
    await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task)
    });
    addTaskModal.style.display = "none";
    document.getElementById("taskForm").reset();
    subtasksWrapper.innerHTML = "";
    fetchTasks();
  } catch (err) {
    console.error("Error adding task:", err);
  }
});

// ------------------- SUBTASKS -------------------
addSubtaskBtn.onclick = () => {
  const row = document.createElement("div");
  row.className = "subtask-row d-flex align-items-center gap-2";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Subtask...";
  input.className = "form-control";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn btn-sm btn-danger";
  removeBtn.textContent = "X";
  removeBtn.onclick = () => row.remove();

  row.appendChild(input);
  row.appendChild(removeBtn);
  subtasksWrapper.appendChild(row);
};

// ------------------- ANALYSIS -------------------
analyzeBtn.onclick = () => {
  analysisModal.style.display = "block";

  const highPriority = tasksData.filter(t => t.priority === "High" && t.completed).length;
  const mediumPriority = tasksData.filter(t => t.priority === "Medium" && t.completed).length;
  const lowPriority = tasksData.filter(t => t.priority === "Low" && t.completed).length;

  const ctx = document.getElementById("productivityChart").getContext("2d");
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["High", "Medium", "Low"],
      datasets: [{
        label: "Completed Tasks",
        data: [highPriority, mediumPriority, lowPriority],
        backgroundColor: ["#ff4d4d", "#ffcc00", "#66cc66"]
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Tasks" } }
      }
    }
  });
};

// ------------------- SEARCH & SORT -------------------
searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  const filtered = tasksData.filter(t => t.name.toLowerCase().includes(query));
  renderTasks(filtered);
});

sortBy.addEventListener("change", () => {
  const sortValue = sortBy.value;
  let sorted = [...tasksData];
  if (sortValue === "priority") {
    const order = { "High": 1, "Medium": 2, "Low": 3 };
    sorted.sort((a, b) => order[a.priority] - order[b.priority]);
  } else if (sortValue === "dueDate") {
    sorted.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }
  renderTasks(sorted);
});

// ------------------- STATS & PROGRESS -------------------
function updateStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const remaining = total - completed;

  document.getElementById("state1").textContent = total;
  document.getElementById("state2").textContent = remaining;
  document.getElementById("state3").textContent = completed;

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  taskProgressBar.style.width = `${percent}%`;
  taskProgressBar.textContent = `${percent}%`;
}

// ------------------- INITIAL LOAD -------------------
fetchTasks();
