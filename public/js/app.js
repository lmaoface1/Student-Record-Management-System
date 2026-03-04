let editingId = null;
let allStudents = [];
let filtered = [];
let sortCol = null;
let sortDir = "asc";
let currentPage = 1;
let PAGE_SIZE = 5;

const form = document.getElementById("studentForm");
const formTitle = document.getElementById("formTitle");
const formTag = document.getElementById("formTag");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const searchInput = document.getElementById("searchInput");
const courseFilter = document.getElementById("courseFilter");
const tableBody = document.getElementById("tableBody");
const studentCount = document.getElementById("studentCount");
const pagination = document.getElementById("pagination");
const toast = document.getElementById("toast");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeToggleMobile = document.getElementById("themeToggleMobile");
const themeIconMobile = document.getElementById("themeIconMobile");
const burgerBtn = document.getElementById("burgerBtn");
const mobileMenu = document.getElementById("mobileMenu");
const formPanel = document.getElementById("formPanel");

// DARK MODE
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
setThemeLabels(savedTheme);

function setThemeLabels(theme) {
  themeIcon.textContent = theme === "dark" ? "Light" : "Dark";
  themeIconMobile.textContent = theme === "dark" ? "Light" : "Dark";
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  setThemeLabels(next);
  buildCharts(allStudents);
}

themeToggle.addEventListener("click", toggleTheme);
themeToggleMobile.addEventListener("click", toggleTheme);

// BURGER MENU
burgerBtn.addEventListener("click", () => {
  const isOpen = mobileMenu.classList.toggle("open");
  burgerBtn.classList.toggle("open", isOpen);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest("header")) closeMobileMenu();
});

function closeMobileMenu() {
  mobileMenu.classList.remove("open");
  burgerBtn.classList.remove("open");
}

// TOAST NOTIFICATION
let toastTimer;

function showToast(message, type = "success") {
  toast.className = `show ${type}`;
  toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

// PAGE SIZE SELECTOR
document.querySelectorAll(".size-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const newSize = parseInt(btn.dataset.size);
    if (newSize === PAGE_SIZE) return;

    PAGE_SIZE = newSize;
    currentPage = 1;

    document
      .querySelectorAll(".size-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    renderPage();
  });
});

// FETCH STUDENTS (API)
async function fetchStudents() {
  tableBody.innerHTML = `<tr><td colspan="7" class="empty-state">Loading...</td></tr>`;
  try {
    const res = await fetch("/api/students");
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    allStudents = data.data;
    applyFilterAndSort();
    buildCharts(allStudents);
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="7" class="empty-state">Error: ${err.message}</td></tr>`;
  }
}

// FILTER + SORT PIPELINE
function applyFilterAndSort() {
  const keyword = searchInput.value.trim().toLowerCase();
  const course = courseFilter.value;

  filtered = allStudents.filter((s) => {
    const matchCourse = course === "all" || s.course === course;
    const matchKeyword =
      !keyword ||
      s.first_name.toLowerCase().includes(keyword) ||
      s.last_name.toLowerCase().includes(keyword) ||
      s.student_number.toLowerCase().includes(keyword);
    return matchCourse && matchKeyword;
  });

  if (sortCol) {
    filtered.sort((a, b) => {
      let aVal = a[sortCol];
      let bVal = b[sortCol];

      if (sortCol === "year_level") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }

      if (sortCol === "created_at") {
        return sortDir === "asc"
          ? new Date(aVal) - new Date(bVal)
          : new Date(bVal) - new Date(aVal);
      }

      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }

  currentPage = 1;
  renderPage();
}

// RENDER PAGE
function renderPage() {
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  const page = filtered.slice(start, end);

  studentCount.textContent = `${total} ${total === 1 ? "entry" : "entries"}`;

  if (page.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="empty-state">No students found.</td></tr>`;
    pagination.innerHTML = "";
    return;
  }

  tableBody.innerHTML = page
    .map(
      (s, i) => `
    <tr data-id="${s.id}">
      <td>${start + i + 1}</td>
      <td>${s.student_number}</td>
      <td>${s.last_name}, ${s.first_name}</td>
      <td><span class="course-badge">${s.course}</span></td>
      <td>Year ${s.year_level}</td>
      <td>${new Date(s.created_at).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}</td>
      <td>
        <div class="actions-cell">
          <button class="btn-edit"   onclick="editStudent(${s.id})">Edit</button>
          <button class="btn-delete" onclick="deleteStudent(${s.id}, '${s.first_name} ${s.last_name}')">Delete</button>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");

  renderPagination(totalPages);
}

// PAGINATION CONTROLS
function renderPagination(totalPages) {
  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  let html = "";

  html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>&#8592;</button>`;

  getPageRange(currentPage, totalPages).forEach((p) => {
    html +=
      p === "..."
        ? `<span class="page-info">...</span>`
        : `<button class="page-btn ${p === currentPage ? "active" : ""}" onclick="goToPage(${p})">${p}</button>`;
  });

  html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""}>&#8594;</button>`;

  html += `<span class="page-info">${currentPage} / ${totalPages}</span>`;

  pagination.innerHTML = html;
}

function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3)
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

function goToPage(page) {
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderPage();
}

// SORT HEADERS
document.querySelectorAll("th.sortable").forEach((th) => {
  th.addEventListener("click", () => {
    const col = th.dataset.col;

    sortDir = sortCol === col ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    sortCol = col;

    document.querySelectorAll("th.sortable").forEach((t) => {
      t.classList.remove("asc", "desc");
      document.getElementById(`sort-${t.dataset.col}`).textContent = "↕";
    });

    th.classList.add(sortDir);
    document.getElementById(`sort-${col}`).textContent =
      sortDir === "asc" ? "↑" : "↓";

    applyFilterAndSort();
  });
});

// SEARCH & COURSE FILTER
let searchDebounce;

searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => applyFilterAndSort(), 300);
});

courseFilter.addEventListener("change", () => applyFilterAndSort());

// FORM SUBMIT (ADD / UPDATE)
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const studentNumberRaw = document
    .getElementById("student_number")
    .value.trim();
  const firstNameRaw = document.getElementById("first_name").value.trim();
  const lastNameRaw = document.getElementById("last_name").value.trim();
  const courseVal = document.getElementById("course").value;
  const yearVal = parseInt(document.getElementById("year_level").value);

  if (!/^\d{10}$/.test(studentNumberRaw)) {
    showToast(
      "Student number must be exactly 10 digits (numbers only).",
      "warning",
    );
    return;
  }

  if (!/^[A-Za-z\s\-.]+$/.test(firstNameRaw)) {
    showToast("First name must contain letters only.", "warning");
    return;
  }

  if (!/^[A-Za-z\s\-.]+$/.test(lastNameRaw)) {
    showToast("Last name must contain letters only.", "warning");
    return;
  }

  if (!courseVal) {
    showToast("Please select a course.", "warning");
    return;
  }
  if (!yearVal) {
    showToast("Please select a year level.", "warning");
    return;
  }

  const payload = {
    student_number: studentNumberRaw,
    first_name: firstNameRaw,
    last_name: lastNameRaw,
    course: courseVal,
    year_level: yearVal,
  };

  if (
    !payload.student_number ||
    !payload.first_name ||
    !payload.last_name ||
    !payload.course ||
    !payload.year_level
  ) {
    showToast("Please fill in all fields.", "warning");
    return;
  }

  const url = editingId ? `/api/students/${editingId}` : "/api/students";
  const method = editingId ? "PUT" : "POST";

  submitBtn.disabled = true;
  submitBtn.textContent = editingId ? "Updating..." : "Saving...";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!data.success) {
      showToast(data.message, "error");
    } else {
      showToast(editingId ? "Student updated." : "Student added.", "success");
      resetForm();
      await fetchStudents();
    }
  } catch (err) {
    showToast("Network error: " + err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingId ? "Update Record" : "Save Record";
  }
});

// EDIT STUDENT
async function editStudent(id) {
  try {
    const res = await fetch(`/api/students/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    const s = data.data;
    document.getElementById("student_number").value = s.student_number;
    document.getElementById("first_name").value = s.first_name;
    document.getElementById("last_name").value = s.last_name;
    document.getElementById("course").value = s.course;
    document.getElementById("year_level").value = s.year_level;

    editingId = id;
    formTitle.textContent = "Edit Student";
    formTag.textContent = "Editing Record";
    submitBtn.textContent = "Update Record";
    cancelEditBtn.style.display = "inline-flex";

    formPanel.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    showToast("Failed to load student: " + err.message, "error");
  }
}

// DELETE STUDENT
async function deleteStudent(id, name) {
  if (!confirm(`Delete ${name}? This cannot be undone.`)) return;

  try {
    const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!data.success) {
      showToast(data.message, "error");
    } else {
      showToast(`${name} removed.`, "success");
      await fetchStudents();
    }
  } catch (err) {
    showToast("Delete failed: " + err.message, "error");
  }
}

// RESET FORM
function resetForm() {
  form.reset();
  editingId = null;
  formTitle.textContent = "Add Student";
  formTag.textContent = "New Record";
  submitBtn.textContent = "Save Record";
  cancelEditBtn.style.display = "none";
}

cancelEditBtn.addEventListener("click", resetForm);

// CHARTS
let courseChart = null;
let yearChart = null;

const COURSE_COLORS = {
  light: ["#235347", "#8EB69B", "#163832", "#DAF1DE"],
  dark: ["#8EB69B", "#DAF1DE", "#235347", "#163832"],
};

const YEAR_COLORS = {
  light: ["#051F20", "#163832", "#8EB69B", "#DAF1DE"],
  dark: ["#DAF1DE", "#8EB69B", "#235347", "#0B2B26"],
};

function getTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

function buildDoughnut(canvasId, chartRef, labels, counts, colors, legendId) {
  const f = labels.reduce(
    (acc, label, i) => {
      if (counts[i] > 0) {
        acc.labels.push(label);
        acc.data.push(counts[i]);
        acc.colors.push(colors[i]);
      }
      return acc;
    },
    { labels: [], data: [], colors: [] },
  );

  document.getElementById(legendId).innerHTML =
    f.labels.length === 0
      ? `<p style="font-size:0.78rem;color:var(--text-subtle)">No data yet</p>`
      : f.labels
          .map(
            (label, i) => `
        <div class="legend-item">
          <span class="legend-dot" style="background:${f.colors[i]}"></span>
          <span class="legend-name">${label}</span>
          <span class="legend-count">${f.data[i]}</span>
        </div>
      `,
          )
          .join("");

  if (chartRef) chartRef.destroy();

  const ctx = document.getElementById(canvasId).getContext("2d");
  return new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: f.labels,
      datasets: [
        {
          data: f.data,
          backgroundColor: f.colors,
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      cutout: "68%",
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}` } },
      },
      animation: { animateRotate: true, duration: 600 },
    },
  });
}

function buildCharts(students) {
  const theme = getTheme();

  const courseLabels = ["BSIT", "BSCS", "BSTCM", "BSDS"];
  const courseCounts = courseLabels.map(
    (c) => students.filter((s) => s.course === c).length,
  );
  courseChart = buildDoughnut(
    "courseChart",
    courseChart,
    courseLabels,
    courseCounts,
    COURSE_COLORS[theme],
    "courseLegend",
  );

  const yearLabels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const yearCounts = [1, 2, 3, 4].map(
    (y) => students.filter((s) => s.year_level === y).length,
  );
  yearChart = buildDoughnut(
    "yearChart",
    yearChart,
    yearLabels,
    yearCounts,
    YEAR_COLORS[theme],
    "yearLegend",
  );

  document.getElementById("statTotal").textContent = students.length;
}

// INIT
document.addEventListener("DOMContentLoaded", () => {
  fetchStudents();
});
