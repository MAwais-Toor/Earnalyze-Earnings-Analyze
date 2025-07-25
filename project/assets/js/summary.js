let currentPage = 1;
const rowsPerPage = 3;

let editIndex = null; // track which row is being edited



const earnings = JSON.parse(localStorage.getItem("earningsData")) || [];
let adjustments = JSON.parse(localStorage.getItem("moneyAdjustments")) || [];

const amountInput = document.getElementById("amountInput");
const descInput = document.getElementById("descInput");
const totalAmountEl = document.getElementById("totalAmount");
const deductedAmountEl = document.getElementById("deductedAmount");
const netAmountEl = document.getElementById("netAmount");
const tableBody = document.getElementById("adjustmentsTable");
const adjustmentCountEl = document.getElementById("adjustmentCount");

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastBox = document.getElementById("toastBox");
    const toastIcon = document.getElementById("toastIcon");
    const toastMessage = document.getElementById("toastMessage");

    const addSound = document.getElementById("addSound");
    const deductSound = document.getElementById("deductSound");

    if (type === "success") {
        toastBox.classList.remove("bg-red-600");
        toastBox.classList.add("bg-green-600");
        toastIcon.className = "fas fa-check-circle text-white text-xl";
        addSound?.play().catch(err => console.warn("Add sound blocked:", err));
    } else {
        toastBox.classList.remove("bg-green-600");
        toastBox.classList.add("bg-red-600");
        toastIcon.className = "fas fa-times-circle text-white text-xl";
        deductSound?.play().catch(err => console.warn("Deduct sound blocked:", err));
    }

    toastMessage.textContent = message;

    toast.classList.remove("opacity-0", "translate-y-4", "pointer-events-none");
    toast.classList.add("opacity-100", "translate-y-0");

    setTimeout(() => {
        toast.classList.remove("opacity-100", "translate-y-0");
        toast.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
    }, 3000);
}


function getSummary() {
    const earningsTotal = earnings.reduce((sum, e) => sum + e.amount, 0);
    const addTotal = adjustments.filter(a => a.type === "add").reduce((s, a) => s + a.amount, 0);
    const deductTotal = adjustments.filter(a => a.type === "deduct").reduce((s, a) => s + a.amount, 0);
    const total = earningsTotal + addTotal;
    const net = total - deductTotal;

    totalAmountEl.textContent = `PKR ${total.toLocaleString()}`;
    deductedAmountEl.textContent = `PKR ${deductTotal.toLocaleString()}`;
    netAmountEl.textContent = `PKR ${net.toLocaleString()}`;
    adjustmentCountEl.textContent = adjustments.length;
}

function adjustMoney(type) {
    const value = parseFloat(amountInput.value);
    const desc = descInput.value.trim();
    const selectedDate = document.getElementById("dateInput").value;

    if (!value || value <= 0) return alert("Enter a valid amount.");
    if (!desc) return alert("Enter a description.");

    // Format selected date or use today's date
    const date = selectedDate
        ? new Date(selectedDate).toLocaleDateString("en-GB")
        : new Date().toLocaleDateString("en-GB");

    const entry = {
        date,
        type,
        amount: value,
        desc
    };

    adjustments.push(entry);
    localStorage.setItem("moneyAdjustments", JSON.stringify(adjustments));

    // Reset inputs
    amountInput.value = "";
    descInput.value = "";
    document.getElementById("dateInput").value = "";

    getSummary();
    updateTable();
    renderCharts();

    showToast(`${type === "add" ? "Added" : "Deducted"} PKR ${value.toLocaleString()}`, type === "add" ? "success" : "error");
}

function toInputDate(ddmmyyyy) {
    const [d, m, y] = ddmmyyyy.split("/");
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}
function toDisplayDate(yyyymmdd) {
    const [y, m, d] = yyyymmdd.split("-");
    return `${d}/${m}/${y}`;
}


function updateTable() {
    const filter = document.getElementById("filterType")?.value || "all";
    const filtered = adjustments.filter(a => filter === "all" || a.type === filter);

    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginated = filtered.slice(start, end);

    if (!paginated.length) {
        tableBody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-muted">No records found.</td></tr>`;
    } else {
        tableBody.innerHTML = paginated.map((a, i) => {
            const globalIndex = start + i;

            if (editIndex === globalIndex) {
                // Editable row
                return `
                <tr class="border-b border-muted/10 bg-white/10">
                    <td class="py-2">
                        <input type="date" value="${toInputDate(a.date)}" id="editDate${i}" class="bg-card text-white p-1 rounded w-full" />
                    </td>
                    <td class="py-2 text-${a.type === "add" ? "green" : "red"}-400">${a.type.toUpperCase()}</td>
                    <td class="py-2">
                        <input type="number" value="${a.amount}" id="editAmount${i}" class="bg-card text-white p-1 rounded w-full" />
                    </td>
                    <td class="py-2">
                        <input type="text" value="${a.desc}" id="editDesc${i}" class="bg-card text-white p-1 rounded w-full" />
                    </td>
                    <td class="py-2 text-right flex gap-2 justify-end">
                        <button onclick="saveEdit(${globalIndex}, ${i})" class="text-accent hover:text-green-400 transition" title="Save">
  <i class="fas fa-check"></i>
</button>
<button onclick="cancelEdit()" class="text-muted hover:text-white transition" title="Cancel">
  <i class="fas fa-times"></i>
</button>

                    </td>
                </tr>`;
            } else {
                // Normal row
                return `
                <tr class="border-b border-muted/10 hover:bg-white/5 transition">
                    <td class="py-2">${a.date}</td>
                    <td class="py-2 text-${a.type === "add" ? "green" : "red"}-400">${a.type.toUpperCase()}</td>
                    <td class="py-2">PKR ${a.amount.toLocaleString()}</td>
                    <td class="py-2">${a.desc}</td>
                    <td class="py-2 text-right flex gap-2 justify-end">
                        <button onclick="editRow(${globalIndex})" class="text-primary hover:text-blue-400 transition" title="Edit">
  <i class="fas fa-pen"></i>
</button>
<button onclick="deleteAdjustment(${globalIndex})" class="text-danger hover:text-red-400 transition" title="Delete">
  <i class="fas fa-trash"></i>
</button>

                    </td>
                </tr>`;
            }
        }).join('');
    }

    document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages || 1}`;
    document.getElementById("prevBtn").disabled = currentPage <= 1;
    document.getElementById("nextBtn").disabled = currentPage >= totalPages;
}

function editRow(index) {
    editIndex = index;
    updateTable();
}

function cancelEdit() {
    editIndex = null;
    updateTable();
}

function saveEdit(globalIndex, localIndex) {
    const newDate = document.getElementById(`editDate${localIndex}`).value;
    const newAmount = parseFloat(document.getElementById(`editAmount${localIndex}`).value);
    const newDesc = document.getElementById(`editDesc${localIndex}`).value.trim();

    if (!newDate || isNaN(newAmount) || newAmount <= 0 || !newDesc) {
        return alert("All fields must be valid.");
    }

    adjustments[globalIndex].date = toDisplayDate(newDate);
    adjustments[globalIndex].amount = newAmount;
    adjustments[globalIndex].desc = newDesc;

    localStorage.setItem("moneyAdjustments", JSON.stringify(adjustments));

    editIndex = null;
    getSummary();
    updateTable();
    renderCharts();
    showToast("Adjustment updated successfully", "success");
}



function changePage(direction) {
    currentPage += direction;
    updateTable();
}



function deleteAdjustment(index) {
    if (confirm("Delete this adjustment?")) {
        adjustments.splice(index, 1);
        localStorage.setItem("moneyAdjustments", JSON.stringify(adjustments));
        getSummary();
        updateTable();
        renderCharts();
    }
}

function resetAdjustments() {
    if (confirm("Clear all adjustments?")) {
        localStorage.removeItem("moneyAdjustments");
        adjustments = [];
        getSummary();
        updateTable();
        renderCharts();
    }
}

// Initial Summary
getSummary();
updateTable();

let totalEarnings = 0;
try {
    const earnings = JSON.parse(localStorage.getItem("earningsData")) || [];
    totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
} catch (e) {
    console.error("Failed to load earnings data:", e);
}
document.getElementById("totalEarnings").textContent = `PKR ${totalEarnings.toLocaleString()}`;

let pieChart, lineChart;

function renderCharts() {
    const addTotal = adjustments.filter(a => a.type === "add").reduce((s, a) => s + a.amount, 0);
    const deductTotal = adjustments.filter(a => a.type === "deduct").reduce((s, a) => s + a.amount, 0);

    // Pie Chart
    const pieCtx = document.getElementById("adjustmentPieChart").getContext("2d");
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(pieCtx, {
        type: "doughnut",
        data: {
            labels: ["Added", "Deducted"],
            datasets: [{
                data: [addTotal, deductTotal],
                backgroundColor: ["#4ade80", "#ef4444"]
            }]
        },
        options: {
            plugins: {
                legend: {
                    labels: { color: "#ddd" },
                    position: "bottom"
                }
            },
            cutout: "70%"
        }
    });

    // Line Chart
    const lineCtx = document.getElementById("adjustmentLineChart").getContext("2d");

    // Group by date
    const grouped = {};
    adjustments.forEach(a => {
        if (!grouped[a.date]) grouped[a.date] = { add: 0, deduct: 0 };
        grouped[a.date][a.type] += a.amount;
    });

    const labels = Object.keys(grouped).sort((a, b) => {
        const [da, db] = [a.split("/").reverse().join("/"), b.split("/").reverse().join("/")];
        return new Date(da) - new Date(db);
    });

    const addData = labels.map(d => grouped[d].add || 0);
    const deductData = labels.map(d => grouped[d].deduct || 0);

    if (lineChart) lineChart.destroy();
    lineChart = new Chart(lineCtx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Added",
                    data: addData,
                    borderColor: "#4ade80",
                    backgroundColor: "rgba(74, 222, 128, 0.1)",
                    fill: true,
                    tension: 0.4
                },
                {
                    label: "Deducted",
                    data: deductData,
                    borderColor: "#ef4444",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: "#ddd" } }
            },
            scales: {
                x: { ticks: { color: "#aaa" }, grid: { color: "#333" } },
                y: { ticks: { color: "#aaa" }, grid: { color: "#333" } }
            }
        }
    });
}

// Render charts on load
renderCharts();
