const STORAGE_KEY = "daymark.tasks.v1";
const filters = new Set(["all", "active", "completed"]);
const taskList = document.querySelector("#task-list");
const addForm = document.querySelector("#add-form");
const taskInput = document.querySelector("#task-input");
const emptyState = document.querySelector("#empty-state");
const warning = document.querySelector("#storage-warning");
const clearCompletedButton = document.querySelector("#clear-completed");

let currentFilter = "all";
let editingTaskId = null;
let storageAvailable = true;

function loadTasks() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const tasks = JSON.parse(saved);
    if (!Array.isArray(tasks)) return [];
    return tasks.filter((task) =>
      task && typeof task.id === "string" && typeof task.text === "string" &&
      typeof task.completed === "boolean" && typeof task.createdAt === "string"
    );
  } catch {
    storageAvailable = false;
    return [];
  }
}

let tasks = loadTasks();

function saveTasks() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  warning.hidden = storageAvailable;
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeActionButton(label, className, iconMarkup, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-button ${className}`;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = iconMarkup;
  button.addEventListener("click", onClick);
  return button;
}

function createTaskRow(task) {
  const row = document.createElement("li");
  row.className = `task-row${task.completed ? " is-complete" : ""}`;
  row.dataset.taskId = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `${task.completed ? "Mark as to do" : "Complete"}: ${task.text}`);
  checkbox.addEventListener("change", () => {
    task.completed = checkbox.checked;
    if (editingTaskId === task.id) editingTaskId = null;
    saveTasks();
    render();
  });
  row.append(checkbox);

  if (editingTaskId === task.id) {
    const editInput = document.createElement("input");
    editInput.className = "edit-input";
    editInput.type = "text";
    editInput.maxLength = 160;
    editInput.value = task.text;
    editInput.setAttribute("aria-label", "Edit task");
    row.append(editInput);

    const saveEdit = () => {
      const updatedText = editInput.value.trim();
      if (updatedText) task.text = updatedText;
      editingTaskId = null;
      saveTasks();
      render();
    };
    editInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") saveEdit();
      if (event.key === "Escape") {
        editingTaskId = null;
        render();
      }
    });
    editInput.addEventListener("blur", saveEdit);
    requestAnimationFrame(() => {
      editInput.focus();
      editInput.select();
    });
  } else {
    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;
    row.append(text);
  }

  const time = document.createElement("time");
  time.className = "task-time";
  time.dateTime = task.createdAt;
  time.textContent = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(task.createdAt));
  row.append(time);

  const actions = document.createElement("span");
  actions.className = "task-actions";
  const editIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m13.5 4.5 2 2M5 15l1-.2 8.8-8.8a1.4 1.4 0 0 0-2-2L4 12.8 3.5 16z"/><path d="M10 16.5h6"/></svg>';
  const deleteIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 6h11M8 6V4h4v2m2 0-.6 10h-6.8L6 6m2.5 2.5v5m3-5v5"/></svg>';
  actions.append(
    makeActionButton("Edit task", "edit-button", editIcon, () => {
      editingTaskId = task.id;
      render();
    }),
    makeActionButton("Delete task", "delete-button", deleteIcon, () => {
      tasks = tasks.filter((item) => item.id !== task.id);
      if (editingTaskId === task.id) editingTaskId = null;
      saveTasks();
      render();
    })
  );
  row.append(actions);
  return row;
}

function render() {
  const activeTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.length - activeTasks.length;
  const visibleTasks = tasks.filter((task) =>
    currentFilter === "all" || (currentFilter === "active" && !task.completed) || (currentFilter === "completed" && task.completed)
  );
  const filterTitle = { all: "All tasks", active: "To do", completed: "Completed" }[currentFilter];

  document.querySelector("#page-title").innerHTML = `${filterTitle}<span class="heading-period">.</span>`;
  document.querySelector("#task-summary").textContent = tasks.length === 0
    ? "A clear space to think."
    : `${activeTasks.length} ${activeTasks.length === 1 ? "task" : "tasks"} left to do.`;
  document.querySelector("#all-count").textContent = tasks.length;
  document.querySelector("#active-count").textContent = activeTasks.length;
  document.querySelector("#completed-count").textContent = completedTasks;
  document.querySelector("#tab-all-count").textContent = tasks.length;
  document.querySelector("#tab-active-count").textContent = activeTasks.length;
  document.querySelector("#tab-completed-count").textContent = completedTasks;
  document.querySelector("#footer-count").textContent = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;

  const completion = tasks.length === 0 ? 0 : Math.round(completedTasks / tasks.length * 100);
  document.querySelector("#progress-number").textContent = `${completion}%`;
  document.querySelector("#progress-ring").style.strokeDashoffset = `${201.06 * (1 - completion / 100)}`;
  document.querySelector(".progress-stamp svg").setAttribute("aria-label", `${completion} percent complete`);

  document.querySelectorAll("[data-filter]").forEach((button) => {
    const selected = button.dataset.filter === currentFilter;
    button.classList.toggle(button.classList.contains("nav-item") ? "is-selected" : "is-active", selected);
    if (button.classList.contains("filter-tab")) button.setAttribute("aria-pressed", String(selected));
    if (button.classList.contains("nav-item")) {
      if (selected) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
  });

  taskList.replaceChildren(...visibleTasks.map(createTaskRow));
  emptyState.hidden = visibleTasks.length > 0;
  clearCompletedButton.hidden = completedTasks === 0;
  if (visibleTasks.length === 0) {
    const emptyMessages = {
      all: ["A fresh start.", "Add a task above and make today yours."],
      active: ["All caught up.", "Nothing left on your to-do list. Enjoy the breathing room."],
      completed: ["Not yet, and that's okay.", "Finished tasks will find their way here."],
    };
    document.querySelector("#empty-title").textContent = emptyMessages[currentFilter][0];
    document.querySelector("#empty-caption").textContent = emptyMessages[currentFilter][1];
  }
}

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!filters.has(button.dataset.filter)) return;
    currentFilter = button.dataset.filter;
    editingTaskId = null;
    render();
  });
});

addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  tasks.unshift({ id: makeId(), text, completed: false, createdAt: new Date().toISOString() });
  currentFilter = "all";
  editingTaskId = null;
  saveTasks();
  render();
  taskInput.value = "";
  taskInput.focus();
});

clearCompletedButton.addEventListener("click", () => {
  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  render();
});

document.querySelector("#today-date").textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "long", month: "long", day: "numeric",
}).format(new Date());

warning.hidden = storageAvailable;
render();