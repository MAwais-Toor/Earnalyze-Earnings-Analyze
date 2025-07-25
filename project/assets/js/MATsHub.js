// Earnings data
let earnings = JSON.parse(localStorage.getItem("earningsData")) || [];
let currentPage = 1;
const rowsPerPage = 3;

// Chart context
const ctx = document.getElementById("earningsChart")?.getContext("2d");
const pieCtx = document.getElementById("pieChart")?.getContext("2d");
let chart, pieChart;

if (ctx && pieCtx) {
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Earnings (PKR)",
        data: [],
        borderColor: "#4ade80",
        backgroundColor: "rgba(74, 222, 128, 0.1)",
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#ddd' } }
      },
      scales: {
        x: {
          ticks: { color: '#aaa' },
          grid: { color: '#333' }
        },
        y: {
          beginAtZero: true, // always start from 0
          ticks: { color: '#aaa' },
          grid: { color: '#333' },
          suggestedMax: 1000 // will be updated dynamically
        }
      }
    }
  });


  pieChart = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: ["#4ade80", "#60a5fa", "#facc15", "#f472b6"]
      }]
    },
    options: {
      plugins: { legend: { position: 'bottom', labels: { color: '#ddd' } } },
      cutout: "70%"
    }
  });
}

function getTodayTotal() {
  const today = new Date().toLocaleDateString("en-GB");
  return earnings.reduce((sum, e) => e.date === today ? sum + e.amount : sum, 0);
}

function getYesterdayTotal() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yDate = yesterday.toLocaleDateString("en-GB");
  return earnings.reduce((sum, e) => e.date === yDate ? sum + e.amount : sum, 0);
}

function getThisWeekTotal() {
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);
  return earnings.reduce((sum, e) => {
    const d = new Date(e.date.split("/").reverse().join("/"));
    return d >= weekAgo ? sum + e.amount : sum;
  }, 0);
}

function getLastWeekTotal() {
  const now = new Date();
  const startOfThisWeek = new Date();
  startOfThisWeek.setDate(now.getDate() - 7);
  const startOfLastWeek = new Date();
  startOfLastWeek.setDate(now.getDate() - 14);

  return earnings.reduce((sum, e) => {
    const d = new Date(e.date.split("/").reverse().join("/"));
    return d >= startOfLastWeek && d < startOfThisWeek ? sum + e.amount : sum;
  }, 0);
}

function getThisMonthTotal() {
  const now = new Date();
  return earnings.reduce((sum, e) => {
    const d = new Date(e.date.split("/").reverse().join("/"));
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() ? sum + e.amount : sum;
  }, 0);
}

function getLastMonthTotal() {
  const now = new Date();
  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return earnings.reduce((sum, e) => {
    const d = new Date(e.date.split("/").reverse().join("/"));
    return d.getMonth() === lastMonth && d.getFullYear() === year ? sum + e.amount : sum;
  }, 0);
}

function getAverageEarning() {
  if (!earnings.length) return 0;
  const total = earnings.reduce((sum, e) => sum + e.amount, 0);
  return total / earnings.length;
}

function updateStatsUI() {
  const today = getTodayTotal();
  const yesterday = getYesterdayTotal();
  const week = getThisWeekTotal();
  const lastWeek = getLastWeekTotal();
  const month = getThisMonthTotal();
  const lastMonth = getLastMonthTotal();
  const avg = getAverageEarning();

  document.getElementById("todayEarnings").textContent = `PKR ${today.toLocaleString()}`;
  document.getElementById("totalEntries").textContent = earnings.length;
  document.getElementById("weekTotal").textContent = `PKR ${week.toLocaleString()}`;
  document.getElementById("monthTotal").textContent = `PKR ${month.toLocaleString()}`;
  document.getElementById("avgEarnings").textContent = `PKR ${avg.toFixed(0).toLocaleString()}`;

  updateTrend("today", today, yesterday);
  updateTrend("week", week, lastWeek);
  updateTrend("month", month, lastMonth);
  const allButLast = earnings.slice(0, -1);
  const prevAvg = allButLast.length ? allButLast.reduce((sum, e) => sum + e.amount, 0) / allButLast.length : 0;
  updateTrend("avg", avg, prevAvg);
}

function updateTrend(id, current, previous) {
  const icon = document.getElementById(`${id}Trend`);
  const tooltip = document.getElementById(`${id}Tooltip`);
  if (!icon || !tooltip) return;
  if (current > previous) {
    icon.className = "fas fa-arrow-up text-green-500";
    tooltip.textContent = `${id.charAt(0).toUpperCase() + id.slice(1)} increased`;
  } else if (current < previous) {
    icon.className = "fas fa-arrow-down text-red-500";
    tooltip.textContent = `${id.charAt(0).toUpperCase() + id.slice(1)} decreased`;
  } else {
    icon.className = "fas fa-minus text-gray-400";
    tooltip.textContent = `No change in ${id}`;
  }
}

function updateChart() {
  const filter = document.getElementById("filter")?.value || "all";
  const now = new Date();
  let filtered = [...earnings];

  // Filter by week
  if (filter === "week") {
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    filtered = earnings.filter(e => {
      const d = new Date(e.date.split("/").reverse().join("-"));
      return d >= weekAgo;
    });
  }

  // Filter by month
  else if (filter === "month") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    filtered = earnings.filter(e => {
      const d = new Date(e.date.split("/").reverse().join("-"));
      return d >= monthStart;
    });
  }

  // Update line chart
  if (chart) {
    chart.data.labels = filtered.map(e => e.date);
    chart.data.datasets[0].data = filtered.map(e => e.amount);

    const maxAmount = Math.max(...filtered.map(e => e.amount), 0);
    chart.options.scales.y.suggestedMax = maxAmount + maxAmount * 0.2;

    chart.update();
  }


  // Update pie chart
  if (pieChart) {
    const pieData = {};
    filtered.forEach(e => {
      const label = e.date.split("/").slice(1).join("/"); // MM/YYYY
      pieData[label] = (pieData[label] || 0) + e.amount;
    });
    pieChart.data.labels = Object.keys(pieData);
    pieChart.data.datasets[0].data = Object.values(pieData);
    pieChart.update();
  }

  // Refresh dashboard
  updateStatsUI();
  updateTable();
}


function updateTable() {
  const table = document.getElementById("entryTable");
  const pagination = document.getElementById("paginationControls");

  if (!earnings || earnings.length === 0) {
    table.innerHTML = `<div class="text-center text-muted py-8"><p class="text-lg">No entries found.</p></div>`;
    pagination.innerHTML = "";
    return;
  }

  const sorted = [...earnings].sort((a, b) => new Date(b.date.split("/").reverse().join("/")) - new Date(a.date.split("/").reverse().join("/")));
  const start = (currentPage - 1) * rowsPerPage;
  const paginated = sorted.slice(start, start + rowsPerPage);

  table.innerHTML = `
    <div class="grid grid-cols-1 divide-y divide-muted">
      <div class="grid grid-cols-3 font-semibold text-muted uppercase text-sm px-4 py-2 bg-card border-b border-muted rounded-t-md">
        <div>Date</div>
        <div class="text-center">Amount</div>
        <div class="text-right">Action</div>
      </div>
      ${paginated.map((e, i) => {
    const index = earnings.findIndex(x => x.date === e.date && x.amount === e.amount);
    return `
          <div class="grid grid-cols-3 items-center px-4 py-4 bg-card hover:bg-white/5 transition rounded-md">
            <div class="text-sm">${e.date}</div>
            <div class="text-center">
              <input type="number"
                class="bg-dark border border-muted text-white px-3 py-1 rounded-md w-24 text-center focus:outline-none focus:ring focus:ring-primary transition"
                value="${e.amount}"
                onchange="editAmount(${index}, this.value)" />
            </div>
            <div class="text-right">
              <button onclick="removeEntry(${index})"
                class="text-danger hover:text-red-400 transition text-lg" title="Delete">🗑️</button>
            </div>
          </div>
        `;
  }).join('')}
    </div>
  `;

  const totalPages = Math.ceil(earnings.length / rowsPerPage);
  pagination.innerHTML = `
    <div class="flex justify-center items-center gap-4 mt-6">
      <button onclick="prevPage()" ${currentPage === 1 ? "disabled" : ""}
        class="px-3 py-1 rounded-md bg-muted text-black hover:bg-muted/80 transition disabled:opacity-50 disabled:cursor-not-allowed">
        < Prev
      </button>
      <span class="text-sm text-muted">Page ${currentPage} of ${totalPages}</span>
      <button onclick="nextPage()" ${currentPage === totalPages ? "disabled" : ""}
        class="px-3 py-1 rounded-md bg-muted text-black hover:bg-muted/80 transition disabled:opacity-50 disabled:cursor-not-allowed">
        Next >
      </button>
    </div>
  `;
}

function nextPage() {
  const totalPages = Math.ceil(earnings.length / rowsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    updateTable();
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    updateTable();
  }
}

function editAmount(index, value) {
  const amount = parseFloat(value);
  if (!isNaN(amount)) {
    earnings[index].amount = amount;
    localStorage.setItem("earningsData", JSON.stringify(earnings));
    updateChart();
  }
}

function removeEntry(index) {
  if (confirm("Remove this entry?")) {
    earnings.splice(index, 1);
    localStorage.setItem("earningsData", JSON.stringify(earnings));
    updateChart();
  }
}

function clearEarnings() {
  if (confirm("Clear all data?")) {
    localStorage.removeItem("earningsData");
    earnings = [];
    updateChart();
  }
}

function addEarning() {
  const amount = parseFloat(document.getElementById("amount").value);
  const dateRaw = document.getElementById("date").value;
  if (!amount || !dateRaw) return alert("Enter valid amount and date.");

  const date = new Date(dateRaw).toLocaleDateString("en-GB");
  const existing = earnings.find(e => e.date === date);
  if (existing) existing.amount += amount;
  else earnings.push({ date, amount });

  earnings.sort((a, b) => new Date(a.date.split("/").reverse().join("-")) - new Date(b.date.split("/").reverse().join("-")));
  localStorage.setItem("earningsData", JSON.stringify(earnings));
  document.getElementById("amount").value = "";
  document.getElementById("date").value = "";
  updateChart();
  showToast(`PKR ${amount.toLocaleString()} added successfully!`);
}


// Admin login
const ADMIN = { username: "awais", password: "865422" };

function login(e) {
  e.preventDefault();
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();
  if (user === ADMIN.username && pass === ADMIN.password) {
    localStorage.setItem("loggedIn", "true");
    showDashboard();
  } else {
    alert("Invalid credentials!");
  }
}

function logout() {
  localStorage.removeItem("loggedIn");
  location.reload();
}

function showDashboard() {
  document.getElementById("loginContainer").style.display = "none";
  document.getElementById("dashboardContainer").style.display = "block";
  updateChart();
}

// Toast notification
function showToast(message = "Earning added successfully!") {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");
  const sound = document.getElementById("notificationSound");

  if (!toast || !toastMessage || !sound) return;

  toastMessage.textContent = message;
  toast.classList.remove("opacity-0", "translate-y-4");
  toast.classList.add("opacity-100", "translate-y-0");

  // Play the sound
  sound.currentTime = 0;
  sound.play();

  setTimeout(() => {
    toast.classList.remove("opacity-100", "translate-y-0");
    toast.classList.add("opacity-0", "translate-y-4");
  }, 3000);
}



if (localStorage.getItem("loggedIn") === "true") showDashboard();

// Init
updateChart();
