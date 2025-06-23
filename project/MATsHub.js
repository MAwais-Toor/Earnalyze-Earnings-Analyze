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
      plugins: { legend: { labels: { color: '#ddd' } } },
      scales: {
        x: { ticks: { color: '#aaa' }, grid: { color: '#333' } },
        y: { ticks: { color: '#aaa' }, grid: { color: '#333' } }
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
  let filtered = earnings;

  if (filter === "week") {
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    filtered = earnings.filter(e => new Date(e.date.split("/").reverse().join("/")) >= weekAgo);
  } else if (filter === "month") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    filtered = earnings.filter(e => new Date(e.date.split("/").reverse().join("/")) >= monthStart);
  }

  if (chart && pieChart) {
    chart.data.labels = filtered.map(e => e.date);
    chart.data.datasets[0].data = filtered.map(e => e.amount);
    chart.update();

    const pieData = {};
    filtered.forEach(e => {
      const d = e.date.split('/').slice(1).join('/');
      pieData[d] = (pieData[d] || 0) + e.amount;
    });
    pieChart.data.labels = Object.keys(pieData);
    pieChart.data.datasets[0].data = Object.values(pieData);
    pieChart.update();
  }

  updateStatsUI();
  updateTable();
}

function updateTable() {
  const table = document.getElementById("entryTable");
  const pagination = document.getElementById("paginationControls");

  if (!earnings.length) {
    table.innerHTML = "<tr><td colspan='3' class='text-center p-4'>No entries found.</td></tr>";
    pagination.innerHTML = "";
    return;
  }

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginated = earnings.slice(start, end);

  let rows = `<tr class='border-b border-muted'>
      <th class='text-left p-3'>Date</th>
      <th>Amount</th>
      <th>Action</th>
    </tr>`;

  paginated.forEach((e, i) => {
    const index = start + i;
    rows += `<tr class='border-b border-muted'>
      <td class='p-3'>${e.date}</td>
      <td class='p-3'>
        <input type="number" class="p-2 border rounded bg-card text-white border-muted" value="${e.amount}" onchange="editAmount(${index}, this.value)" />
      </td>
      <td class='p-3'>
        <button onclick="removeEntry(${index})" class="text-danger">🗑️</button>
      </td>
    </tr>`;
  });

  table.innerHTML = rows;

  const totalPages = Math.ceil(earnings.length / rowsPerPage);
  pagination.innerHTML = `
    <div class="flex justify-center items-center gap-4 mt-4">
      <button onclick="prevPage()" ${currentPage === 1 ? "disabled" : ""} class="px-3 py-1 bg-muted rounded text-black">Prev</button>
      <span class="text-sm text-muted">Page ${currentPage} of ${totalPages}</span>
      <button onclick="nextPage()" ${currentPage === totalPages ? "disabled" : ""} class="px-3 py-1 bg-muted rounded text-black">Next</button>
    </div>`;
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

// Admin login
const ADMIN = { username: "admin", password: "1234" };

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

if (localStorage.getItem("loggedIn") === "true") showDashboard();

// Init
updateChart();
