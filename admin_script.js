import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabaseUrl = "https://hkfixjnwzkghapljsxzg.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrZml4am53emtnaGFwbGpzeHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDYyODgsImV4cCI6MjA3NjcyMjI4OH0.vfaXH70jFUlNzqynIKDKyCpIH5P0SrrwRWROjfIB5EI";

const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ Wait for page load
window.addEventListener("DOMContentLoaded", async () => {
  const admin = localStorage.getItem("adminUser");
  if (!admin) {
    window.location.href = "admin_login.html";
    return;
  }
  await loadDashboard();
  await loadUsers();
  await loadWithdrawals();
  await loadPayments();
  await loadGiftCodes();
  await loadLinks();
  await loadOfferwall();
});

// ✅ Make global so HTML can call these
window.logout = function () {
  localStorage.removeItem("adminUser");
  localStorage.removeItem("adminLoggedIn");
  window.location.href = "admin_login.html";
};

window.showSection = function (id) {
  document.querySelectorAll(".section").forEach((s) => (s.style.display = "none"));
  document.querySelectorAll("nav button").forEach((b) => b.classList.remove("active"));
  document.getElementById(id).style.display = "block";
  document
    .querySelector(`nav button[onclick="showSection('${id}')"]`)
    ?.classList.add("active");
};

// === DASHBOARD ===
async function loadDashboard() {
  const { data: users } = await supabase.from("users").select("balance, total_balance");
  const { data: withdrawals } = await supabase.from("withdrawals").select("status, amount");

  const totalUsers = users?.length || 0;
  const totalBalance = users?.reduce((a, b) => a + Number(b.balance || 0), 0) || 0;
  const pending = withdrawals?.filter((w) => w.status === "pending").length || 0;
  const success = withdrawals?.filter((w) => w.status === "success").length || 0;
  const failed = withdrawals?.filter((w) => w.status === "failed").length || 0;

  document.getElementById("totalUsers").textContent = `Total Users: ${totalUsers}`;
  document.getElementById("totalBalance").textContent = `Total Balance: ₹${totalBalance.toFixed(2)}`;
  document.getElementById("pendingWithdrawals").textContent = `Pending Withdrawals: ${pending}`;
  document.getElementById("successWithdrawals").textContent = `Successful Withdrawals: ${success}`;
  document.getElementById("failedWithdrawals").textContent = `Failed Withdrawals: ${failed}`;
}

// === TABLE LOADERS ===
async function loadUsers() {
  const { data } = await supabase.from("users").select("*").limit(50);
  renderTable("usersTable", data);
}

async function loadWithdrawals() {
  const { data } = await supabase.from("withdrawals").select("*").order("created_at", { ascending: false });
  renderTable("withdrawalsTable", data, true);
}

async function loadPayments() {
  const { data } = await supabase.from("users_paymentmode").select("*");
  renderTable("paymentsTable", data);
}

async function loadGiftCodes() {
  const { data } = await supabase.from("gift_codes").select("*");
  renderTable("giftcodesTable", data, false, true);
}

async function loadLinks() {
  const { data } = await supabase.from("links").select("*");
  renderTable("linksTable", data, false, true);
}

async function loadOfferwall() {
  const { data } = await supabase.from("offerwall_details").select("*");
  renderTable("offerwallTable", data);
}

// === RENDER TABLE ===
function renderTable(id, data, includeActions = false, editable = false) {
  const table = document.getElementById(id);
  if (!data || data.length === 0) {
    table.innerHTML = "<tr><td>No data</td></tr>";
    return;
  }

  const headers = Object.keys(data[0]);
  let headerRow =
    "<tr>" +
    headers.map((h) => `<th>${h}</th>`).join("") +
    (includeActions ? "<th>Actions</th>" : "") +
    "</tr>";

  let rows = data
    .map((row) => {
      let cells = headers.map((h) => `<td>${row[h]}</td>`).join("");
      if (includeActions) {
        cells += `
          <td>
            <button class="action-btn accept" onclick="updateWithdrawal(${row.id}, 'success')">Accept</button>
            <button class="action-btn reject" onclick="updateWithdrawal(${row.id}, 'failed')">Reject</button>
          </td>`;
      } else if (editable) {
        cells += `<td><button class="action-btn edit" onclick="editRecord('${id}', ${row.id})">Edit</button></td>`;
      }
      return `<tr>${cells}</tr>`;
    })
    .join("");

  table.innerHTML = headerRow + rows;
}

window.filterTable = function (tableId, query) {
  query = query.toLowerCase();
  const rows = document.querySelectorAll(`#${tableId} tr`);
  rows.forEach((row) => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(query) ? "" : "none";
  });
};

window.updateWithdrawal = async function (id, status) {
  await supabase.from("withdrawals").update({ status }).eq("id", id);
  alert(`Withdrawal marked as ${status}`);
  loadWithdrawals();
};

window.editRecord = async function (table, id) {
  const newValue = prompt('Enter JSON (e.g. {"status":"inactive"})');
  if (!newValue) return;
  try {
    const parsed = JSON.parse(newValue);
    const tableName = table.replace("Table", "").toLowerCase();
    await supabase.from(tableName).update(parsed).eq("id", id);
    alert("Record updated!");
    location.reload();
  } catch {
    alert("Invalid JSON format");
  }
};
