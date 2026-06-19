// AKSHA FARM - Core Application Logic
import {
  getEmployees,
  getActiveEmployees,
  saveEmployee,
  deactivateEmployee,
  activateEmployee,
  deleteEmployee,
  getAttendanceByDate,
  getEmployeeAttendanceForMonth,
  saveDailyAttendance,
  getSalariesByMonth,
  getEmployeeSalaries,
  saveSalary,
  calculateSalaryForEmployee,
  deleteSalary,
  getSettings,
  saveSettings,
  initializeDatabase,
  getLeaves,
  getEmployeeLeaves,
  saveLeaveApplication,
  updateLeaveStatus,
  calculateLeaveBalances,
  getNotifications,
  getUnreadNotificationsCount,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead
} from './db.js';

// ─────────────────────────────────────────────
// APPLICATION STATE
// ─────────────────────────────────────────────
let state = {
  currentUser: null,
  currentTheme: 'dark',
  activeView: 'owner-dashboard',
  selectedDate: getTodayDateString(),
  selectedPayrollMonth: getCurrentMonth(),
  selectedReportMonth: getCurrentMonth(),
  currentSalaryPreview: null,
  
  // New State variables for sub-tabs and filters
  activeReportTab: 'report-salary',
  selectedReportSalaryEmpId: 'EMP001',
  activeAttendanceSubtab: 'att-mark',
  activeEmployeeView: 'emp-dashboard',
  selectedEmpAttendanceMonth: getCurrentMonth(),
  selectedLeaveActionId: null
};

// DOM shortcuts
const loginView      = document.getElementById('login-view');
const adminShell     = document.getElementById('admin-shell');
const employeeShell  = document.getElementById('employee-shell');
const topbarTitle    = document.getElementById('topbar-title');

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initializeDatabase();

  const savedUser = sessionStorage.getItem('aksha_session');
  if (savedUser) {
    state.currentUser = JSON.parse(savedUser);
    showShellForUser();
  } else {
    loginView.style.display = 'flex';
  }

  const savedTheme = localStorage.getItem('aksha_theme') || 'dark';
  setTheme(savedTheme);

  setupEventListeners();
  syncDateInputs();
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function getTodayDateString() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().split('T')[0];
}

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthStr) {
  const d = new Date(monthStr + '-02');
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function fmtCurrency(amount, currency = 'Rs.') {
  return `${currency} ${Number(amount).toLocaleString()}`;
}

function syncDateInputs() {
  const ad = document.getElementById('attendance-date');
  const pm = document.getElementById('payroll-month');
  const rm = document.getElementById('report-month');
  if (ad) ad.value = state.selectedDate;
  if (pm) pm.value = state.selectedPayrollMonth;
  if (rm) rm.value = state.selectedReportMonth;
}

// ─────────────────────────────────────────────
// TOAST NOTIFICATION (replaces alert() calls)
// ─────────────────────────────────────────────
function showToast(message, type = 'success') {
  const existing = document.getElementById('toast-container');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'toast-container';
  container.style.cssText = `
    position:fixed; bottom:30px; right:30px; z-index:9999;
    background:${type === 'success' ? '#2d6a4f' : type === 'error' ? '#ef4444' : '#d4af37'};
    color:#fff; padding:14px 22px; border-radius:10px;
    font-family:'Inter',sans-serif; font-size:0.9rem; font-weight:600;
    box-shadow:0 8px 30px rgba(0,0,0,0.4);
    animation: slideUp 0.3s ease;
    display:flex; align-items:center; gap:10px; max-width:380px;
  `;
  container.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span><span>${message}</span>`;
  document.body.appendChild(container);
  setTimeout(() => { if (container.parentNode) container.remove(); }, 3500);
}

// ─────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────
function setTheme(theme) {
  state.currentTheme = theme;
  localStorage.setItem('aksha_theme', theme);
  document.body.classList.toggle('light-theme', theme === 'light');
  document.querySelectorAll('.theme-switch-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

// ─────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────
function setupEventListeners() {
  // Login
  document.getElementById('btn-login-submit').addEventListener('click', handleLogin);
  document.getElementById('login-username').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin(e);
  });
  document.getElementById('quick-admin-login').addEventListener('click', () => doLogin('admin'));
  document.getElementById('quick-emp-login').addEventListener('click', () => {
    const emps = getActiveEmployees();
    doLogin('employee', emps.length > 0 ? emps[0].employee_id : 'EMP001');
  });

  // Logout buttons
  document.querySelectorAll('.btn-logout').forEach(btn => btn.addEventListener('click', handleLogout));

  // Theme togglers
  document.querySelectorAll('.theme-switch-btn').forEach(btn => {
    btn.addEventListener('click', e => setTheme(e.currentTarget.dataset.theme));
  });

  // Admin sidebar navigation
  document.querySelectorAll('#admin-shell .sidebar-menu li').forEach(li => {
    li.addEventListener('click', e => {
      const item = e.target.closest('li[data-target]');
      if (!item) return;
      navigateTo(item.dataset.target);
    });
  });

  // Employee sidebar navigation
  document.querySelectorAll('#employee-shell .sidebar-menu li').forEach(li => {
    li.addEventListener('click', e => {
      const item = e.target.closest('li[data-target]');
      if (!item) return;
      navigateToEmployee(item.dataset.target);
    });
  });

  // Attendance sub-tabs
  document.getElementById('btn-att-tab-mark').addEventListener('click', () => switchAttendanceSubtab('att-mark'));
  document.getElementById('btn-att-tab-summary').addEventListener('click', () => switchAttendanceSubtab('att-summary'));
  document.getElementById('attendance-summary-month').addEventListener('change', e => {
    drawAttendanceSummaryTable(e.target.value);
  });

  // Attendance date
  document.getElementById('attendance-date').addEventListener('change', e => {
    state.selectedDate = e.target.value;
    drawAttendanceMarking();
  });

  // Save attendance
  document.getElementById('btn-save-attendance').addEventListener('click', saveAttendanceMarking);

  // Leave admin filters
  document.getElementById('leaves-filter').addEventListener('change', () => drawLeavesAdministration());

  // Leave Action approval/rejection modal listeners
  document.getElementById('btn-close-leave-modal').addEventListener('click', closeLeaveActionModal);
  document.getElementById('btn-cancel-leave-action').addEventListener('click', closeLeaveActionModal);
  document.getElementById('btn-approve-leave-submit').addEventListener('click', () => handleLeaveReview('Approved'));
  document.getElementById('btn-reject-leave-submit').addEventListener('click', () => handleLeaveReview('Rejected'));

  // Payroll month
  document.getElementById('payroll-month').addEventListener('change', e => {
    state.selectedPayrollMonth = e.target.value;
    drawPayrollManagement();
  });

  // Reports sub-tabs
  document.getElementById('btn-rep-tab-salary').addEventListener('click', () => switchReportTab('report-salary'));
  document.getElementById('btn-rep-tab-attendance').addEventListener('click', () => switchReportTab('report-attendance'));
  document.getElementById('btn-rep-tab-leaves').addEventListener('click', () => switchReportTab('report-leaves'));

  // Reports filters
  document.getElementById('report-month').addEventListener('change', e => {
    state.selectedReportMonth = e.target.value;
    drawReportsDashboard();
  });
  document.getElementById('report-attendance-month').addEventListener('change', e => {
    drawAttendanceReportTable(e.target.value);
  });
  document.getElementById('report-leave-month').addEventListener('change', e => {
    drawLeaveReportTable(e.target.value);
  });
  document.getElementById('report-salary-emp-id').addEventListener('change', e => {
    state.selectedReportSalaryEmpId = e.target.value;
    drawEmployeeSalaryHistory();
  });

  // Reports actions
  document.getElementById('btn-print-report').addEventListener('click', () => window.print());
  document.getElementById('btn-export-csv').addEventListener('click', exportPayrollCSV);

  // Settings
  document.getElementById('btn-save-settings').addEventListener('click', saveSettingsHandler);
  document.getElementById('btn-reset-data').addEventListener('click', resetDatabaseHandler);
  document.getElementById('btn-add-holiday').addEventListener('click', addHolidayHandler);

  // Employee modal
  document.getElementById('btn-add-employee').addEventListener('click', () => openEmployeeModal(null));
  ['btn-close-emp-modal', 'btn-cancel-emp'].forEach(id =>
    document.getElementById(id).addEventListener('click', closeEmployeeModal)
  );
  document.getElementById('btn-save-emp-submit').addEventListener('click', saveEmployeeHandler);
  document.getElementById('emp-salary-type').addEventListener('change', e =>
    toggleSalaryRateInputs(e.target.value)
  );

  // Salary modal
  ['btn-close-salary-modal', 'btn-cancel-salary'].forEach(id =>
    document.getElementById(id).addEventListener('click', closeSalaryModal)
  );
  document.getElementById('btn-save-salary-submit').addEventListener('click', saveSalaryHandler);

  // Live recalculate net salary
  ['sal-deductions', 'sal-bonus', 'sal-advances', 'sal-leave-deductions'].forEach(id => {
    document.getElementById(id).addEventListener('input', recalculateLiveSalary);
  });

  // Payslip modal
  ['btn-close-payslip-modal', 'btn-close-payslip'].forEach(id =>
    document.getElementById(id).addEventListener('click', closePayslipModal)
  );
  document.getElementById('btn-print-payslip').addEventListener('click', () => window.print());

  // Employee actions
  document.getElementById('btn-dashboard-view-all-notif').addEventListener('click', () => navigateToEmployee('emp-notifications'));
  document.getElementById('btn-dashboard-apply-leave').addEventListener('click', () => navigateToEmployee('emp-leaves'));
  document.getElementById('emp-apply-leave-form').addEventListener('submit', handleLeaveApplicationSubmit);
  document.getElementById('emp-attendance-month-filter').addEventListener('change', e => {
    state.selectedEmpAttendanceMonth = e.target.value;
    drawEmployeeAttendanceHistory();
  });
  document.getElementById('btn-emp-clear-notif').addEventListener('click', handleClearAllNotifications);

  // Close modals on overlay click
  ['employee-modal', 'process-salary-modal', 'payslip-modal', 'leave-action-modal'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
      if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    });
  });
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const passwordInput = document.getElementById('login-password').value;
  if (!username) { showToast('Please enter your username or Employee ID', 'error'); return; }

  if (username.toLowerCase() === 'admin') {
    if (passwordInput === 'admin123' || passwordInput === '123456' || passwordInput === '') {
      doLogin('admin');
    } else {
      showToast('Invalid admin password.', 'error');
    }
  } else {
    const emp = getEmployees().find(e => e.employee_id === username && e.status === 'Active');
    if (emp) {
      if (passwordInput === emp.password || passwordInput === '123456' || passwordInput === '') {
        doLogin('employee', emp.employee_id);
      } else {
        showToast('Invalid password for Employee.', 'error');
      }
    } else {
      showToast('Invalid credentials. Try "admin" or an Employee ID like "EMP001"', 'error');
    }
  }
}

function doLogin(role, employeeId = null) {
  state.currentUser = { role, employee_id: employeeId };
  sessionStorage.setItem('aksha_session', JSON.stringify(state.currentUser));
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  showShellForUser();
}

function handleLogout() {
  sessionStorage.removeItem('aksha_session');
  state.currentUser = null;
  adminShell.style.display    = 'none';
  employeeShell.style.display = 'none';
  loginView.style.display     = 'flex';
}

function showShellForUser() {
  loginView.style.display = 'none';
  if (state.currentUser.role === 'admin') {
    adminShell.style.display    = 'flex';
    employeeShell.style.display = 'none';
    navigateTo('owner-dashboard');
  } else {
    adminShell.style.display    = 'none';
    employeeShell.style.display = 'flex';
    navigateToEmployee('emp-dashboard');
  }
}

// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────
const VIEW_TITLES = {
  'owner-dashboard' : '🏠 Dashboard',
  'owner-employees' : '👨 Employees',
  'owner-attendance': '📅 Attendance',
  'owner-leaves'    : '📝 Leave Applications',
  'owner-salary'    : '💰 Salary Management',
  'owner-reports'   : '📊 Reports',
  'owner-settings'  : '⚙️ Settings',
  'future-poultry'  : '🐔 Poultry Management',
  'future-feed'     : '🌾 Feed Management',
  'future-expense'  : '💸 Expense Management',
  'future-sales'    : '🚚 Sales Management',
};

function navigateTo(viewName) {
  state.activeView = viewName;
  topbarTitle.textContent = VIEW_TITLES[viewName] || viewName;

  document.querySelectorAll('#admin-shell .app-view').forEach(v => v.style.display = 'none');
  const el = document.getElementById(`view-${viewName}`);
  if (el) el.style.display = 'block';

  document.querySelectorAll('#admin-shell .sidebar-menu li').forEach(li => {
    li.classList.toggle('active', li.dataset.target === viewName);
  });

  const drawFns = {
    'owner-dashboard' : drawOwnerDashboard,
    'owner-employees' : drawEmployeesDirectory,
    'owner-attendance': drawAttendanceMarking,
    'owner-leaves'    : drawLeavesAdministration,
    'owner-salary'    : drawPayrollManagement,
    'owner-reports'   : drawReportsDashboard,
    'owner-settings'  : drawSettingsEditor,
  };
  if (drawFns[viewName]) drawFns[viewName]();
}

function navigateToEmployee(viewName) {
  state.activeEmployeeView = viewName;

  document.querySelectorAll('#employee-shell .sidebar-menu li').forEach(li => {
    li.classList.toggle('active', li.dataset.target === viewName);
  });

  document.querySelectorAll('#employee-shell .app-view').forEach(v => v.style.display = 'none');
  const el = document.getElementById(`view-${viewName}`);
  if (el) el.style.display = 'block';

  const drawFns = {
    'emp-dashboard'    : drawEmployeeDashboard,
    'emp-attendance'   : drawEmployeeAttendanceHistory,
    'emp-leaves'       : drawEmployeeLeavesPanel,
    'emp-payslips'     : drawEmployeePayslips,
    'emp-notifications': drawEmployeeNotifications
  };
  if (drawFns[viewName]) drawFns[viewName]();
  
  updateEmployeeUnreadBadge();
}

// ─────────────────────────────────────────────
// VIEW: OWNER DASHBOARD
// ─────────────────────────────────────────────
function drawOwnerDashboard() {
  const settings   = getSettings();
  const activeEmps = getActiveEmployees();
  const todayAtt   = getAttendanceByDate(state.selectedDate);

  let presentToday = 0, absentToday = 0;
  activeEmps.forEach(emp => {
    const rec = todayAtt.find(r => r.employee_id === emp.employee_id);
    if (!rec) return;
    if (rec.status === 'Present' || rec.status === 'Overtime') presentToday++;
    else if (rec.status === 'Absent') absentToday++;
    else if (rec.status === 'Half Day') presentToday += 0.5;
  });

  const processedSalaries = getSalariesByMonth(state.selectedPayrollMonth);
  const totalPayout = processedSalaries.reduce((s, r) => s + r.net_salary, 0);

  document.getElementById('stat-total-employees').textContent = activeEmps.length;
  document.getElementById('stat-present-today').textContent   = presentToday;
  document.getElementById('stat-absent-today').textContent    = absentToday;
  document.getElementById('stat-salary-expense').textContent  = fmtCurrency(totalPayout, settings.currency);

  // Summary table
  const tbody = document.querySelector('#dashboard-summary-table tbody');
  tbody.innerHTML = '';
  if (activeEmps.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No employees registered yet.</td></tr>`;
    return;
  }
  activeEmps.forEach(emp => {
    const calc      = calculateSalaryForEmployee(emp.employee_id, state.selectedPayrollMonth);
    const attMonth  = getEmployeeAttendanceForMonth(emp.employee_id, state.selectedPayrollMonth);
    const absentCnt = attMonth.filter(a => a.status === 'Absent').length;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${emp.name}</strong> <span class="text-muted">(${emp.employee_id})</span></td>
      <td>${badge(emp.salary_type, emp.salary_type === 'Daily' ? 'badge-info' : 'badge-accent')}</td>
      <td>${calc.days_worked} days</td>
      <td style="color:${absentCnt > 0 ? 'var(--danger)' : 'inherit'}">${absentCnt} days</td>
      <td>${calc.overtime_hours} hrs</td>
      <td><strong>${fmtCurrency(calc.net_salary, settings.currency)}</strong></td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm btn-secondary edit-payroll-btn">✏️ Edit</button>
          <button class="btn btn-sm btn-danger-action delete-payroll-btn" ${calc.is_processed ? '' : 'disabled style="opacity:0.4; cursor:not-allowed;"'}>🗑️ Delete</button>
        </div>
      </td>
    `;

    tr.querySelector('.edit-payroll-btn').addEventListener('click', () => {
      openSalaryModal(calc);
    });

    const deleteBtn = tr.querySelector('.delete-payroll-btn');
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Are you sure you want to reset/delete the processed payroll for ${emp.name} for ${formatMonthLabel(state.selectedPayrollMonth)}?`)) {
        deleteSalary(emp.employee_id, state.selectedPayrollMonth);
        drawOwnerDashboard();
        drawPayrollManagement();
        showToast(`Payroll record for ${emp.name} reset.`, 'info');
      }
    });

    tbody.appendChild(tr);
  });
}

// ─────────────────────────────────────────────
// VIEW: EMPLOYEES DIRECTORY
// ─────────────────────────────────────────────
function drawEmployeesDirectory() {
  const settings   = getSettings();
  const employees  = getEmployees();
  const tbody      = document.querySelector('#employees-table tbody');
  tbody.innerHTML  = '';

  if (employees.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row">No employees registered. Click "+ Add New Employee".</td></tr>`;
    return;
  }

  employees.forEach(emp => {
    const rateLabel = emp.salary_type === 'Daily'
      ? `${fmtCurrency(emp.daily_rate, settings.currency)} / day`
      : `${fmtCurrency(emp.monthly_salary, settings.currency)} / month`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${emp.employee_id}</strong></td>
      <td>${emp.name}</td>
      <td>${emp.phone}</td>
      <td>${emp.position}</td>
      <td>${emp.join_date}</td>
      <td>${badge(emp.salary_type, emp.salary_type === 'Daily' ? 'badge-info' : 'badge-accent')}</td>
      <td>${rateLabel}</td>
      <td>${badge(emp.status, emp.status === 'Active' ? 'badge-success' : 'badge-danger')}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-sm btn-secondary edit-emp-btn">✏️ Edit</button>
          ${emp.status === 'Active'
            ? `<button class="btn btn-sm btn-danger-action deact-btn">Deactivate</button>`
            : `<button class="btn btn-sm btn-primary-action act-btn">Activate</button>`}
          <button class="btn btn-sm btn-danger-action remove-emp-btn">🗑️ Remove</button>
        </div>
      </td>
    `;

    tr.querySelector('.edit-emp-btn').addEventListener('click', () => openEmployeeModal(emp));

    const deactBtn = tr.querySelector('.deact-btn');
    if (deactBtn) {
      deactBtn.addEventListener('click', () => {
        if (confirm(`Deactivate ${emp.name}?`)) {
          deactivateEmployee(emp.employee_id);
          drawEmployeesDirectory();
          showToast(`${emp.name} deactivated.`, 'info');
        }
      });
    }
    const actBtn = tr.querySelector('.act-btn');
    if (actBtn) {
      actBtn.addEventListener('click', () => {
        activateEmployee(emp.employee_id);
        drawEmployeesDirectory();
        showToast(`${emp.name} re-activated.`, 'success');
      });
    }

    tr.querySelector('.remove-emp-btn').addEventListener('click', () => {
      if (confirm(`⚠️ Permanently remove ${emp.name} (${emp.employee_id})?\n\nThis will delete their employee record and all related history (attendance, salaries, leaves, and notifications). This action cannot be undone.`)) {
        deleteEmployee(emp.employee_id);
        drawEmployeesDirectory();
        drawOwnerDashboard();
        showToast(`${emp.name} permanently removed.`, 'success');
      }
    });

    tbody.appendChild(tr);
  });
}

// ─────────────────────────────────────────────
// VIEW: ATTENDANCE MARKING
// ─────────────────────────────────────────────
function drawAttendanceMarking() {
  const activeEmps = getActiveEmployees();
  const container  = document.getElementById('attendance-marking-list');
  container.innerHTML = '';

  if (activeEmps.length === 0) {
    container.innerHTML = `<p class="empty-row">No active employees found.</p>`;
    return;
  }

  const existing = getAttendanceByDate(state.selectedDate);

  activeEmps.forEach(emp => {
    const rec     = existing.find(r => r.employee_id === emp.employee_id);
    const status  = rec ? rec.status : 'Present';
    const otHours = rec ? rec.overtime_hours : 0;

    const row = document.createElement('div');
    row.className    = 'attendance-employee-row';
    row.dataset.empId = emp.employee_id;

    row.innerHTML = `
      <div class="att-emp-details">
        <span class="att-emp-name">${emp.name}</span>
        <span class="att-emp-meta">${emp.employee_id} · ${emp.position}</span>
      </div>
      <div class="att-options">
        <button type="button" class="att-btn ${status === 'Present'  ? 'active-present' : ''}" data-status="Present">✅ Present</button>
        <button type="button" class="att-btn ${status === 'Half Day' ? 'active-half'    : ''}" data-status="Half Day">🌓 Half Day</button>
        <button type="button" class="att-btn ${status === 'Absent'   ? 'active-absent'  : ''}" data-status="Absent">❌ Absent</button>
        <button type="button" class="att-btn ${status === 'Leave'    ? 'active-leave'   : ''}" data-status="Leave">📝 Leave</button>
        <button type="button" class="att-btn ${status === 'Holiday'  ? 'active-holiday' : ''}" data-status="Holiday">🏖 Holiday</button>
        <button type="button" class="att-btn ${status === 'Overtime' ? 'active-ot'      : ''}" data-status="Overtime">⏱ Overtime</button>
        <div class="ot-hours-input-container" style="display:${status === 'Overtime' ? 'flex' : 'none'}">
          <span>Hrs:</span>
          <input type="number" step="0.5" min="0" max="12" class="ot-mini-input" value="${otHours}">
        </div>
      </div>
    `;

    const buttons     = row.querySelectorAll('.att-btn');
    const otContainer = row.querySelector('.ot-hours-input-container');
    const otInput     = row.querySelector('.ot-mini-input');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active-present','active-half','active-absent','active-ot','active-leave','active-holiday'));
        const s = btn.dataset.status;
        if (s === 'Present')  btn.classList.add('active-present');
        if (s === 'Half Day') btn.classList.add('active-half');
        if (s === 'Absent')   btn.classList.add('active-absent');
        if (s === 'Leave')    btn.classList.add('active-leave');
        if (s === 'Holiday')  btn.classList.add('active-holiday');
        if (s === 'Overtime') btn.classList.add('active-ot');
        otContainer.style.display = s === 'Overtime' ? 'flex' : 'none';
        if (s === 'Overtime' && !otInput.value) otInput.value = 2;
      });
    });

    container.appendChild(row);
  });
}

function saveAttendanceMarking() {
  const rows    = document.querySelectorAll('#attendance-marking-list .attendance-employee-row');
  const records = [];

  rows.forEach(row => {
    const employee_id = row.dataset.empId;
    const activeBtn   = row.querySelector('.att-btn.active-present,.att-btn.active-half,.att-btn.active-absent,.att-btn.active-leave,.att-btn.active-holiday,.att-btn.active-ot');
    const status      = activeBtn ? activeBtn.dataset.status : 'Present';
    const otInput     = row.querySelector('.ot-mini-input');
    const overtime_hours = status === 'Overtime' ? parseFloat(otInput.value) || 0 : 0;
    records.push({ employee_id, status, overtime_hours });
  });

  saveDailyAttendance(state.selectedDate, records);
  showToast(`Attendance saved for ${state.selectedDate}`, 'success');
  
  // Refresh monthly attendance table if showing
  if (state.activeAttendanceSubtab === 'att-summary') {
    drawAttendanceSummaryTable(document.getElementById('attendance-summary-month').value);
  }
  
  drawOwnerDashboard(); // refresh dashboard counts if we're on it
}

// ─────────────────────────────────────────────
// VIEW: PAYROLL MANAGEMENT
// ─────────────────────────────────────────────
function drawPayrollManagement() {
  const settings   = getSettings();
  const activeEmps = getActiveEmployees();
  const tbody      = document.querySelector('#payroll-table tbody');
  tbody.innerHTML  = '';

  if (activeEmps.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty-row">No active employees.</td></tr>`;
    return;
  }

  activeEmps.forEach(emp => {
    const calc      = calculateSalaryForEmployee(emp.employee_id, state.selectedPayrollMonth);
    const rateVal   = emp.salary_type === 'Daily' ? emp.daily_rate : emp.monthly_salary;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${emp.employee_id}</strong></td>
      <td>${emp.name}</td>
      <td>${badge(emp.salary_type, emp.salary_type === 'Daily' ? 'badge-info' : 'badge-accent')}</td>
      <td>${calc.days_worked} days</td>
      <td>${calc.overtime_hours} hrs</td>
      <td>${fmtCurrency(rateVal, settings.currency)}</td>
      <td style="color:var(--danger)">${fmtCurrency(calc.deductions, settings.currency)}</td>
      <td style="color:var(--success)">${fmtCurrency(calc.bonus, settings.currency)}</td>
      <td><strong>${fmtCurrency(calc.net_salary, settings.currency)}</strong></td>
      <td>${badge(calc.is_processed ? 'Processed' : 'Pending', calc.is_processed ? 'badge-success' : 'badge-warning')}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-sm btn-primary-action process-sal-btn">⚙️ Process</button>
          ${calc.is_processed ? `<button class="btn btn-sm btn-secondary view-payslip-btn">📄 Payslip</button>` : ''}
        </div>
      </td>
    `;

    tr.querySelector('.process-sal-btn').addEventListener('click', () => openSalaryModal(calc));
    const psBtn = tr.querySelector('.view-payslip-btn');
    if (psBtn) psBtn.addEventListener('click', () => viewPayslipHandler(calc));

    tbody.appendChild(tr);
  });
}

// ─────────────────────────────────────────────
// VIEW: REPORTS
// ─────────────────────────────────────────────
function drawReportsDashboard() {
  const settings         = getSettings();
  const monthlySalaries  = getSalariesByMonth(state.selectedReportMonth);
  const employees        = getEmployees();
  const tbody            = document.querySelector('#reports-payroll-summary-table tbody');
  tbody.innerHTML        = '';

  let totalPayout = 0, dailyPayout = 0, monthlyPayout = 0;

  if (monthlySalaries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No processed payroll for this month yet. Go to "Salary" to process.</td></tr>`;
    ['report-total-payout','report-daily-payout','report-monthly-payout'].forEach(id =>
      document.getElementById(id).textContent = fmtCurrency(0, settings.currency)
    );
    return;
  }

  monthlySalaries.forEach(sal => {
    const emp = employees.find(e => e.employee_id === sal.employee_id);
    if (!emp) return;

    const baseRate  = emp.salary_type === 'Daily' ? emp.daily_rate : emp.monthly_salary;
    const basePay   = emp.salary_type === 'Daily' ? sal.days_worked * baseRate : baseRate;
    const otRate    = emp.salary_type === 'Daily' ? emp.daily_rate / 8 : settings.defaultOvertimeRate;
    const otPay     = sal.overtime_hours * otRate;

    totalPayout   += sal.net_salary;
    if (emp.salary_type === 'Daily') dailyPayout   += sal.net_salary;
    else                             monthlyPayout += sal.net_salary;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${sal.employee_id}</strong></td>
      <td>${emp.name}</td>
      <td>${badge(emp.salary_type, emp.salary_type === 'Daily' ? 'badge-info' : 'badge-accent')}</td>
      <td>${fmtCurrency(Math.round(basePay), settings.currency)}</td>
      <td>${fmtCurrency(Math.round(otPay), settings.currency)}</td>
      <td style="color:var(--danger)">${fmtCurrency(sal.deductions, settings.currency)}</td>
      <td style="color:var(--success)">${fmtCurrency(sal.bonus, settings.currency)}</td>
      <td><strong>${fmtCurrency(sal.net_salary, settings.currency)}</strong></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('report-total-payout').textContent   = fmtCurrency(totalPayout, settings.currency);
  document.getElementById('report-daily-payout').textContent   = fmtCurrency(dailyPayout, settings.currency);
  document.getElementById('report-monthly-payout').textContent = fmtCurrency(monthlyPayout, settings.currency);
}

function exportPayrollCSV() {
  const salaries = getSalariesByMonth(state.selectedReportMonth);
  if (salaries.length === 0) { showToast('No data available for this month.', 'info'); return; }

  const employees = getEmployees();
  const headers   = ['Employee ID','Name','Salary Type','Days Worked','Overtime Hours','Deductions','Bonus','Net Salary'];
  const rows      = [headers.join(',')];

  salaries.forEach(sal => {
    const emp  = employees.find(e => e.employee_id === sal.employee_id);
    const name = emp ? emp.name : 'Unknown';
    const type = emp ? emp.salary_type : 'Unknown';
    rows.push([sal.employee_id, `"${name}"`, type, sal.days_worked, sal.overtime_hours, sal.deductions, sal.bonus, sal.net_salary].join(','));
  });

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `AkshaFarm_Payroll_${state.selectedReportMonth}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported successfully!', 'success');
}

// ─────────────────────────────────────────────
// VIEW: SETTINGS
// ─────────────────────────────────────────────
function drawSettingsEditor() {
  const s = getSettings();
  document.getElementById('settings-company-name').value    = s.companyName;
  document.getElementById('settings-company-phone').value   = s.companyPhone;
  document.getElementById('settings-company-address').value = s.companyAddress;
  document.getElementById('settings-currency').value        = s.currency;
  document.getElementById('settings-ot-rate').value         = s.defaultOvertimeRate;
  
  // Populate leave limits
  const limits = s.leaveLimits || { Annual: 14, Sick: 7, Casual: 7, Emergency: 3 };
  document.getElementById('settings-limit-annual').value = limits.Annual;
  document.getElementById('settings-limit-sick').value = limits.Sick;
  document.getElementById('settings-limit-casual').value = limits.Casual;
  document.getElementById('settings-limit-emergency').value = limits.Emergency;

  drawHolidaysList();
}

function saveSettingsHandler() {
  const data = {
    companyName       : document.getElementById('settings-company-name').value.trim(),
    companyPhone      : document.getElementById('settings-company-phone').value.trim(),
    companyAddress    : document.getElementById('settings-company-address').value.trim(),
    currency          : document.getElementById('settings-currency').value.trim(),
    defaultOvertimeRate: parseFloat(document.getElementById('settings-ot-rate').value) || 350,
    leaveLimits: {
      Annual: parseInt(document.getElementById('settings-limit-annual').value) || 14,
      Sick: parseInt(document.getElementById('settings-limit-sick').value) || 7,
      Casual: parseInt(document.getElementById('settings-limit-casual').value) || 7,
      Emergency: parseInt(document.getElementById('settings-limit-emergency').value) || 3,
      Unpaid: 999
    }
  };
  saveSettings(data);
  showToast('Settings saved successfully!', 'success');
}

function resetDatabaseHandler() {
  if (confirm('⚠️ This will reset ALL data to demo defaults. Proceed?')) {
    localStorage.clear();
    initializeDatabase();
    showToast('Database reset to demo data.', 'info');
    navigateTo('owner-dashboard');
  }
}

// ─────────────────────────────────────────────
// MODAL: ADD / EDIT EMPLOYEE
// ─────────────────────────────────────────────
function openEmployeeModal(emp = null) {
  const modal = document.getElementById('employee-modal');
  document.getElementById('employee-modal-title').textContent = emp ? 'Edit Employee' : 'Add New Employee';
  document.getElementById('emp-form-action').value = emp ? 'edit' : 'create';

  const empIdInput = document.getElementById('emp-id');

  if (emp) {
    empIdInput.value = emp.employee_id;
    empIdInput.disabled = true;
    document.getElementById('emp-name').value           = emp.name;
    document.getElementById('emp-phone').value          = emp.phone;
    document.getElementById('emp-position').value       = emp.position;
    document.getElementById('emp-join-date').value      = emp.join_date;
    document.getElementById('emp-salary-type').value    = emp.salary_type;
    document.getElementById('emp-daily-rate').value     = emp.daily_rate;
    document.getElementById('emp-monthly-salary').value = emp.monthly_salary;
    document.getElementById('emp-nic').value            = emp.nic || '';
    document.getElementById('emp-address').value        = emp.address || '';
    document.getElementById('emp-password').value       = emp.password || 'password123';
    toggleSalaryRateInputs(emp.salary_type);
  } else {
    const list = getEmployees();
    let maxIdNum = 0;
    list.forEach(e => {
      const match = e.employee_id.match(/\d+/);
      if (match) {
        const num = parseInt(match[0]);
        if (num > maxIdNum) maxIdNum = num;
      }
    });
    empIdInput.value = `EMP${String(maxIdNum + 1).padStart(3, '0')}`;
    empIdInput.disabled = false;
    document.getElementById('emp-name').value           = '';
    document.getElementById('emp-phone').value          = '';
    document.getElementById('emp-position').value       = '';
    document.getElementById('emp-join-date').value      = getTodayDateString();
    document.getElementById('emp-salary-type').value    = 'Daily';
    document.getElementById('emp-daily-rate').value     = 1500;
    document.getElementById('emp-monthly-salary').value = 0;
    toggleSalaryRateInputs('Daily');
  }
  modal.style.display = 'flex';
}

function toggleSalaryRateInputs(type) {
  document.getElementById('container-daily-rate').style.display    = type === 'Daily'   ? 'block' : 'none';
  document.getElementById('container-monthly-salary').style.display = type === 'Monthly' ? 'block' : 'none';
}

function closeEmployeeModal() {
  document.getElementById('employee-modal').style.display = 'none';
}

function saveEmployeeHandler() {
  const data = {
    employee_id    : document.getElementById('emp-id').value.trim().toUpperCase(),
    name           : document.getElementById('emp-name').value.trim(),
    phone          : document.getElementById('emp-phone').value.trim(),
    position       : document.getElementById('emp-position').value.trim(),
    join_date      : document.getElementById('emp-join-date').value,
    salary_type    : document.getElementById('emp-salary-type').value,
    daily_rate     : parseFloat(document.getElementById('emp-daily-rate').value)     || 0,
    monthly_salary : parseFloat(document.getElementById('emp-monthly-salary').value) || 0,
    nic            : document.getElementById('emp-nic').value.trim(),
    address        : document.getElementById('emp-address').value.trim(),
    password       : document.getElementById('emp-password').value.trim() || 'password123'
  };

  if (!data.name || !data.phone || !data.position || !data.join_date || !data.nic || !data.address) {
    showToast('Please fill out all required fields.', 'error');
    return;
  }

  try {
    saveEmployee(data);
    closeEmployeeModal();
    drawEmployeesDirectory();
    showToast(`${data.name} saved successfully!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─────────────────────────────────────────────
// MODAL: PROCESS SALARY
// ─────────────────────────────────────────────
function openSalaryModal(preview) {
  state.currentSalaryPreview = preview;
  const settings = getSettings();

  document.getElementById('sal-emp-id').value  = preview.employee_id;
  document.getElementById('sal-month').value   = preview.month;
  document.getElementById('sal-calc-name').textContent = `Employee: ${preview.name}`;

  const rateLabel = preview.salary_type === 'Daily'
    ? `${fmtCurrency(preview.rate, settings.currency)} / day`
    : `${fmtCurrency(preview.rate, settings.currency)} / month`;
  document.getElementById('sal-calc-meta').textContent =
    `Type: ${preview.salary_type} | Rate: ${rateLabel}`;
  document.getElementById('sal-calc-days').textContent =
    `Days: ${preview.days_worked} | OT: ${preview.overtime_hours} hrs | OT Pay: ${fmtCurrency(preview.ot_pay, settings.currency)}`;

  document.getElementById('sal-deductions').value = preview.deductions;
  document.getElementById('sal-bonus').value       = preview.bonus;
  document.getElementById('sal-advances').value    = preview.advance_payments || 0;
  document.getElementById('sal-leave-deductions').value = preview.leave_deductions || 0;
  document.getElementById('sal-calculated-net').textContent = fmtCurrency(preview.net_salary, settings.currency);

  document.getElementById('process-salary-modal').style.display = 'flex';
}

function recalculateLiveSalary() {
  const preview = state.currentSalaryPreview;
  if (!preview) return;
  const settings   = getSettings();
  const deductions = parseFloat(document.getElementById('sal-deductions').value) || 0;
  const bonus      = parseFloat(document.getElementById('sal-bonus').value)       || 0;
  const advances   = parseFloat(document.getElementById('sal-advances').value)    || 0;
  const leaveDeductions = parseFloat(document.getElementById('sal-leave-deductions').value) || 0;
  
  const basePay    = preview.salary_type === 'Daily'
    ? preview.rate * preview.days_worked
    : preview.rate;
  const net = Math.max(0, Math.round(basePay + preview.ot_pay + bonus - deductions - advances - leaveDeductions));
  document.getElementById('sal-calculated-net').textContent = fmtCurrency(net, settings.currency);
}

function closeSalaryModal() {
  document.getElementById('process-salary-modal').style.display = 'none';
  state.currentSalaryPreview = null;
}

function saveSalaryHandler() {
  const preview    = state.currentSalaryPreview;
  const employee_id = document.getElementById('sal-emp-id').value;
  const month       = document.getElementById('sal-month').value;
  const settings    = getSettings();
  const deductions  = parseFloat(document.getElementById('sal-deductions').value) || 0;
  const bonus       = parseFloat(document.getElementById('sal-bonus').value)       || 0;
  const advances    = parseFloat(document.getElementById('sal-advances').value)    || 0;
  const leaveDeductions = parseFloat(document.getElementById('sal-leave-deductions').value) || 0;

  const basePay = preview.salary_type === 'Daily'
    ? preview.rate * preview.days_worked
    : preview.rate;
  const net = Math.max(0, Math.round(basePay + preview.ot_pay + bonus - deductions - advances - leaveDeductions));

  saveSalary({ 
    employee_id, 
    month, 
    days_worked: preview.days_worked, 
    overtime_hours: preview.overtime_hours, 
    deductions, 
    bonus, 
    advance_payments: advances,
    leave_deductions: leaveDeductions,
    net_salary: net 
  });
  
  // Create notification for employee
  createNotification(
    employee_id,
    'Salary Processed',
    `Your salary for ${formatMonthLabel(month)} has been processed. Net pay: ${fmtCurrency(net, settings.currency)}.`,
    'Salary_Processed'
  );
  
  closeSalaryModal();
  drawPayrollManagement();
  drawOwnerDashboard();
  showToast(`Salary approved for ${preview.name} — ${formatMonthLabel(month)}`, 'success');
}

// ─────────────────────────────────────────────
// MODAL: PAYSLIP
// ─────────────────────────────────────────────
function viewPayslipHandler(calc) {
  const settings    = getSettings();
  const empDetails  = getEmployees().find(e => e.employee_id === calc.employee_id);

  // Company block
  document.getElementById('payslip-company-name').textContent    = settings.companyName;
  document.getElementById('payslip-company-address').textContent = settings.companyAddress;
  document.getElementById('payslip-company-phone').textContent   = `Phone: ${settings.companyPhone}`;
  document.getElementById('payslip-display-month').textContent   = formatMonthLabel(calc.month);

  // Employee block
  document.getElementById('payslip-emp-id').textContent          = calc.employee_id;
  document.getElementById('payslip-emp-name').textContent        = calc.name;
  document.getElementById('payslip-emp-position').textContent    = empDetails ? empDetails.position : '-';
  document.getElementById('payslip-emp-salary-type').textContent = `${calc.salary_type} Worker`;

  const rateVal = empDetails
    ? (empDetails.salary_type === 'Daily' ? empDetails.daily_rate : empDetails.monthly_salary)
    : 0;
  document.getElementById('payslip-emp-rate').textContent    = fmtCurrency(rateVal, settings.currency);
  document.getElementById('payslip-days-worked').textContent = calc.days_worked;

  // Earnings table
  const basePay = calc.salary_type === 'Daily'
    ? calc.days_worked * calc.rate
    : calc.rate;
  document.getElementById('payslip-table-base').textContent        = fmtCurrency(Math.round(basePay), settings.currency);
  document.getElementById('payslip-ot-hours').textContent          = calc.overtime_hours;
  document.getElementById('payslip-table-ot').textContent          = fmtCurrency(calc.ot_pay, settings.currency);
  document.getElementById('payslip-table-bonus').textContent       = fmtCurrency(calc.bonus, settings.currency);
  document.getElementById('payslip-table-deductions').textContent  = fmtCurrency(calc.deductions || 0, settings.currency);
  document.getElementById('payslip-table-leave-deductions').textContent = fmtCurrency(calc.leave_deductions || 0, settings.currency);
  document.getElementById('payslip-table-advances').textContent    = fmtCurrency(calc.advance_payments || 0, settings.currency);
  document.getElementById('payslip-table-net').textContent         = fmtCurrency(calc.net_salary, settings.currency);

  document.getElementById('payslip-modal').style.display = 'flex';
}

function closePayslipModal() {
  document.getElementById('payslip-modal').style.display = 'none';
}

// ─────────────────────────────────────────────
// VIEW: EMPLOYEE DASHBOARD
// ─────────────────────────────────────────────
function drawEmployeeDashboard() {
  const empId   = state.currentUser.employee_id;
  const employee = getEmployees().find(e => e.employee_id === empId);
  const settings = getSettings();

  if (!employee) { showToast('Employee profile not found.', 'error'); handleLogout(); return; }

  // Sidebar
  const initials = employee.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  document.getElementById('emp-sidebar-name').textContent  = employee.name;
  document.getElementById('emp-sidebar-id').textContent    = employee.employee_id;
  document.getElementById('emp-sidebar-avatar').textContent = initials;

  // Profile card
  document.getElementById('emp-profile-avatar').textContent      = initials;
  document.getElementById('emp-profile-name').textContent        = employee.name;
  document.getElementById('emp-profile-position').textContent    = employee.position;
  document.getElementById('emp-profile-id').textContent          = employee.employee_id;
  document.getElementById('emp-profile-nic').textContent         = employee.nic || '—';
  document.getElementById('emp-profile-phone').textContent       = employee.phone;
  document.getElementById('emp-profile-address').textContent     = employee.address || '—';
  document.getElementById('emp-profile-join').textContent        = employee.join_date;
  document.getElementById('emp-profile-salary-type').textContent = `${employee.salary_type} Worker`;

  // Month stats
  const calc = calculateSalaryForEmployee(empId, getCurrentMonth());
  document.getElementById('emp-stat-days-worked').textContent = calc.days_worked;
  document.getElementById('emp-stat-ot-hours').textContent    = calc.overtime_hours;

  // Render recent notifications
  const notifs = getNotifications(empId).slice().reverse().slice(0, 3); // show top 3 recent
  const notifContainer = document.getElementById('emp-dashboard-notif-list');
  notifContainer.innerHTML = '';
  if (notifs.length === 0) {
    notifContainer.innerHTML = `<div style="padding:10px;text-align:center;color:var(--text-muted);font-size:0.85rem;">No recent notifications.</div>`;
  } else {
    notifs.forEach(n => {
      const item = document.createElement('div');
      item.className = `notification-item-card ${n.read ? 'read' : 'unread'}`;
      item.innerHTML = `
        <div class="notification-item-header">
          <strong class="notification-title">${n.title}</strong>
          <span class="notification-date">${n.date}</span>
        </div>
        <p class="notification-message">${n.message}</p>
      `;
      notifContainer.appendChild(item);
    });
  }

  // Render leave balance quick view
  const leaveData = calculateLeaveBalances(empId);
  const leaveGrid = document.getElementById('emp-dashboard-leave-grid');
  leaveGrid.innerHTML = '';
  const leavesToShow = ['Annual', 'Sick', 'Casual', 'Emergency'];
  leavesToShow.forEach(type => {
    const card = document.createElement('div');
    card.className = 'leave-balance-mini-card';
    card.innerHTML = `
      <div class="leave-balance-title">${type}</div>
      <div class="leave-balance-value">${leaveData.balances[type]} / ${leaveData.limits[type]}</div>
      <div class="leave-balance-label">Days Left</div>
    `;
    leaveGrid.appendChild(card);
  });
}

function drawEmployeeAttendanceHistory() {
  const empId = state.currentUser.employee_id;
  const filterVal = document.getElementById('emp-attendance-month-filter');
  if (filterVal && !filterVal.value) {
    filterVal.value = state.selectedEmpAttendanceMonth;
  }
  const monthStr = filterVal ? filterVal.value : state.selectedEmpAttendanceMonth;

  // Attendance table
  const attList  = getEmployeeAttendanceForMonth(empId, monthStr);
  const tbodyAtt = document.querySelector('#emp-attendance-table tbody');
  tbodyAtt.innerHTML = '';

  if (attList.length === 0) {
    tbodyAtt.innerHTML = `<tr><td colspan="3" class="empty-row">No attendance records this month.</td></tr>`;
  } else {
    attList.sort((a, b) => b.date.localeCompare(a.date));
    attList.forEach(rec => {
      const badgeMap = {
        'Present' : badge('Present',  'badge-success'),
        'Absent'  : badge('Absent',   'badge-danger'),
        'Half Day': badge('Half Day', 'badge-warning'),
        'Overtime': badge('Overtime', 'badge-accent'),
        'Leave'   : badge('Leave',    'badge-info'),
        'Holiday' : badge('Holiday',  'badge-success')
      };
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${rec.date}</strong></td>
        <td>${badgeMap[rec.status] || rec.status}</td>
        <td>${rec.overtime_hours > 0 ? rec.overtime_hours + ' hrs' : '—'}</td>
      `;
      tbodyAtt.appendChild(tr);
    });
  }
}

function drawEmployeeLeavesPanel() {
  const empId = state.currentUser.employee_id;
  const leaveData = calculateLeaveBalances(empId);

  // Set min dates for start & end inputs to today
  const todayStr = getTodayDateString();
  const startInput = document.getElementById('leave-apply-start');
  const endInput = document.getElementById('leave-apply-end');
  if (startInput) startInput.min = todayStr;
  if (endInput) endInput.min = todayStr;

  // Render leave balance widgets
  const widgetContainer = document.getElementById('emp-leave-balance-widgets');
  widgetContainer.innerHTML = '';
  const leaveTypes = ['Annual', 'Sick', 'Casual', 'Emergency'];
  
  leaveTypes.forEach(type => {
    const card = document.createElement('div');
    card.className = 'metric-card';
    card.innerHTML = `
      <div class="metric-icon">📝</div>
      <div class="metric-info">
        <h3>${type} Balance</h3>
        <div class="metric-value">${leaveData.balances[type]} <span style="font-size:0.9rem; font-weight:normal; color:var(--text-muted);">/ ${leaveData.limits[type]} days</span></div>
      </div>
    `;
    widgetContainer.appendChild(card);
  });

  // Render leave history
  const historyList = getEmployeeLeaves(empId);
  const tbody = document.querySelector('#emp-leaves-history-table tbody');
  tbody.innerHTML = '';

  if (historyList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No leave requests found.</td></tr>`;
  } else {
    historyList.sort((a, b) => b.applied_date.localeCompare(a.applied_date));
    historyList.forEach(l => {
      const statusClass = l.status === 'Approved' ? 'badge-success' : l.status === 'Rejected' ? 'badge-danger' : 'badge-warning';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${l.leave_type} Leave</strong></td>
        <td>${l.start_date} to ${l.end_date}</td>
        <td>${l.days_count} days</td>
        <td>${badge(l.status, statusClass)}</td>
        <td><span style="font-size:0.85rem; color:var(--text-muted);">${l.admin_remarks || '—'}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }
}

function handleLeaveApplicationSubmit(e) {
  e.preventDefault();
  const empId = state.currentUser.employee_id;
  const leaveType = document.getElementById('leave-apply-type').value;
  const startDate = document.getElementById('leave-apply-start').value;
  const endDate = document.getElementById('leave-apply-end').value;
  const reason = document.getElementById('leave-apply-reason').value.trim();

  if (!startDate || !endDate || !reason) {
    showToast('Please fill out all fields.', 'error');
    return;
  }

  // Calculate days count
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  if (diffDays <= 0) {
    showToast('End Date must be after or equal to Start Date.', 'error');
    return;
  }

  // Validate balance limits
  const leaveData = calculateLeaveBalances(empId);
  if (leaveType !== 'Unpaid' && diffDays > leaveData.balances[leaveType]) {
    showToast(`Insufficient balance. You only have ${leaveData.balances[leaveType]} days of ${leaveType} leave remaining.`, 'error');
    return;
  }

  // Submit leave
  saveLeaveApplication({
    employee_id: empId,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    days_count: diffDays,
    reason: reason
  });

  document.getElementById('emp-apply-leave-form').reset();
  showToast('Leave request submitted successfully!', 'success');
  drawEmployeeLeavesPanel();
}

function drawEmployeePayslips() {
  const empId = state.currentUser.employee_id;
  const settings = getSettings();
  const salaries = getEmployeeSalaries(empId);
  const tbodyPayslips = document.querySelector('#emp-payslips-table tbody');
  tbodyPayslips.innerHTML = '';

  if (salaries.length === 0) {
    tbodyPayslips.innerHTML = `<tr><td colspan="6" class="empty-row">No salary records processed yet.</td></tr>`;
  } else {
    salaries.sort((a, b) => b.month.localeCompare(a.month));
    salaries.forEach(sal => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${formatMonthLabel(sal.month)}</strong></td>
        <td>${sal.days_worked} days</td>
        <td>${sal.overtime_hours} hrs</td>
        <td>${fmtCurrency((sal.deductions || 0) + (sal.leave_deductions || 0) + (sal.advance_payments || 0), settings.currency)}</td>
        <td><strong>${fmtCurrency(sal.net_salary, settings.currency)}</strong></td>
        <td><button class="btn btn-sm btn-secondary slip-btn">📄 View Slip</button></td>
      `;
      tr.querySelector('.slip-btn').addEventListener('click', () => {
        const fullCalc = calculateSalaryForEmployee(empId, sal.month);
        viewPayslipHandler(fullCalc);
      });
      tbodyPayslips.appendChild(tr);
    });
  }
}

function drawEmployeeNotifications() {
  const empId = state.currentUser.employee_id;
  const list = getNotifications(empId).slice().reverse();
  const container = document.getElementById('emp-full-notifications-list');
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted);">No notifications received.</div>`;
  } else {
    list.forEach(n => {
      const card = document.createElement('div');
      card.className = `notification-inbox-card ${n.read ? 'read' : 'unread'}`;
      card.innerHTML = `
        <div class="notification-inbox-content">
          <div class="notification-inbox-header">
            <strong class="notification-title">${n.title}</strong>
            ${n.read ? '' : '<span class="badge badge-warning">New</span>'}
            <span class="notification-date">${n.date}</span>
          </div>
          <p class="notification-message">${n.message}</p>
        </div>
        ${n.read ? '' : `<button class="btn btn-sm btn-secondary mark-read-btn" data-id="${n.id}">Mark as Read</button>`}
      `;
      
      const btn = card.querySelector('.mark-read-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          markNotificationRead(n.id);
          drawEmployeeNotifications();
          updateEmployeeUnreadBadge();
        });
      }
      container.appendChild(card);
    });
  }
}

function handleClearAllNotifications() {
  const empId = state.currentUser.employee_id;
  const updated = markAllNotificationsRead(empId);
  if (updated) {
    showToast('All notifications marked as read.', 'success');
    drawEmployeeNotifications();
    updateEmployeeUnreadBadge();
  } else {
    showToast('No unread notifications.', 'info');
  }
}

function updateEmployeeUnreadBadge() {
  const empId = state.currentUser.employee_id;
  const unread = getUnreadNotificationsCount(empId);
  const badgeEl = document.getElementById('emp-unread-count');
  if (badgeEl) {
    if (unread > 0) {
      badgeEl.textContent = unread;
      badgeEl.style.display = 'inline-block';
    } else {
      badgeEl.style.display = 'none';
    }
  }
}

// ─────────────────────────────────────────────
// ADMIN: LEAVE REQUESTS PANEL
// ─────────────────────────────────────────────
function drawLeavesAdministration() {
  const filter = document.getElementById('leaves-filter').value;
  const list = getLeaves();
  const employees = getEmployees();
  const tbody = document.querySelector('#admin-leaves-table tbody');
  tbody.innerHTML = '';

  const filtered = list.filter(l => filter === 'All' || l.status === filter);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No leave applications found for status: ${filter}</td></tr>`;
    return;
  }

  // Sort: Pending first, then applied date desc
  filtered.sort((a, b) => {
    if (a.status === 'Pending' && b.status !== 'Pending') return -1;
    if (a.status !== 'Pending' && b.status === 'Pending') return 1;
    return b.applied_date.localeCompare(a.applied_date);
  });

  filtered.forEach(l => {
    const emp = employees.find(e => e.employee_id === l.employee_id);
    const empName = emp ? emp.name : 'Unknown';
    const statusClass = l.status === 'Approved' ? 'badge-success' : l.status === 'Rejected' ? 'badge-danger' : 'badge-warning';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${empName}</strong> <span class="text-muted">(${l.employee_id})</span></td>
      <td>${l.leave_type} Leave</td>
      <td>${l.start_date} to ${l.end_date}</td>
      <td>${l.days_count} days</td>
      <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${l.reason}">${l.reason}</td>
      <td>${badge(l.status, statusClass)}</td>
      <td>${l.applied_date}</td>
      <td>
        ${l.status === 'Pending'
          ? `<button class="btn btn-sm btn-primary-action review-leave-btn">✏️ Review</button>`
          : `<span style="font-size:0.85rem; color:var(--text-muted); font-style:italic;">${l.admin_remarks || 'No remarks'}</span>`}
      </td>
    `;

    const revBtn = tr.querySelector('.review-leave-btn');
    if (revBtn) {
      revBtn.addEventListener('click', () => openLeaveActionModal(l, empName));
    }
    tbody.appendChild(tr);
  });
}

function openLeaveActionModal(leave, empName) {
  state.selectedLeaveActionId = leave.id;
  document.getElementById('leave-action-emp-name').textContent = `Employee: ${empName} (${leave.employee_id})`;
  document.getElementById('leave-action-type').textContent = `Leave Type: ${leave.leave_type} Leave`;
  document.getElementById('leave-action-dates').textContent = `Dates: ${leave.start_date} to ${leave.end_date} (${leave.days_count} days)`;
  document.getElementById('leave-action-reason').textContent = `Reason: "${leave.reason}"`;
  document.getElementById('leave-action-remarks').value = '';
  document.getElementById('leave-action-modal').style.display = 'flex';
}

function closeLeaveActionModal() {
  document.getElementById('leave-action-modal').style.display = 'none';
  state.selectedLeaveActionId = null;
}

function handleLeaveReview(status) {
  if (!state.selectedLeaveActionId) return;
  const remarks = document.getElementById('leave-action-remarks').value.trim();
  
  updateLeaveStatus(state.selectedLeaveActionId, status, remarks);
  closeLeaveActionModal();
  drawLeavesAdministration();
  showToast(`Leave request ${status.toLowerCase()} successfully!`, 'success');
}

// ─────────────────────────────────────────────
// ADMIN: HOLIDAYS SETTINGS LIST
// ─────────────────────────────────────────────
function drawHolidaysList() {
  const settings = getSettings();
  const listEl = document.getElementById('settings-holidays-list');
  listEl.innerHTML = '';
  
  const holidays = settings.publicHolidays || [];
  if (holidays.length === 0) {
    listEl.innerHTML = `<li style="text-align:center; color:var(--text-muted);">No public holidays added.</li>`;
    return;
  }
  
  // Sort date ascending
  holidays.sort((a, b) => a.date.localeCompare(b.date));
  
  holidays.forEach(h => {
    const li = document.createElement('li');
    li.style.cssText = `display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--border-color); padding-bottom: 4px;`;
    li.innerHTML = `
      <span><strong>${h.date}</strong> · ${h.name}</span>
      <button class="btn btn-sm btn-icon-only remove-h-btn" data-date="${h.date}" style="background:transparent; border:none; color:var(--danger); cursor:pointer;">❌</button>
    `;
    
    li.querySelector('.remove-h-btn').addEventListener('click', () => {
      if (confirm(`Remove holiday "${h.name}"?`)) {
        const updated = holidays.filter(val => val.date !== h.date);
        saveSettings({ publicHolidays: updated });
        drawHolidaysList();
        showToast('Holiday removed.', 'info');
      }
    });
    listEl.appendChild(li);
  });
}

function addHolidayHandler() {
  const dateVal = document.getElementById('new-holiday-date').value;
  const nameVal = document.getElementById('new-holiday-name').value.trim();

  if (!dateVal || !nameVal) {
    showToast('Please enter holiday date and name.', 'error');
    return;
  }

  const settings = getSettings();
  const holidays = settings.publicHolidays || [];
  
  // Check if date already exists
  if (holidays.some(h => h.date === dateVal)) {
    showToast('A public holiday is already registered on this date.', 'error');
    return;
  }

  holidays.push({ date: dateVal, name: nameVal });
  saveSettings({ publicHolidays: holidays });
  
  document.getElementById('new-holiday-date').value = '';
  document.getElementById('new-holiday-name').value = '';
  
  drawHolidaysList();
  showToast(`Holiday "${nameVal}" added successfully!`, 'success');
}

// ─────────────────────────────────────────────
// ADMIN: ATTENDANCE HISTORY & SUMMARY TABS
// ─────────────────────────────────────────────
function switchAttendanceSubtab(subtab) {
  state.activeAttendanceSubtab = subtab;
  
  document.getElementById('btn-att-tab-mark').classList.toggle('active', subtab === 'att-mark');
  document.getElementById('btn-att-tab-summary').classList.toggle('active', subtab === 'att-summary');
  
  document.getElementById('subview-att-mark').style.display = subtab === 'att-mark' ? 'block' : 'none';
  document.getElementById('subview-att-summary').style.display = subtab === 'att-summary' ? 'block' : 'none';
  
  if (subtab === 'att-summary') {
    const monthSelector = document.getElementById('attendance-summary-month');
    if (!monthSelector.value) {
      monthSelector.value = getCurrentMonth();
    }
    drawAttendanceSummaryTable(monthSelector.value);
  } else {
    drawAttendanceMarking();
  }
}

function drawAttendanceSummaryTable(monthStr) {
  const activeEmps = getActiveEmployees();
  const tbody = document.querySelector('#attendance-summary-table tbody');
  tbody.innerHTML = '';

  if (activeEmps.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No active employees found.</td></tr>`;
    return;
  }

  activeEmps.forEach(emp => {
    const attendance = getEmployeeAttendanceForMonth(emp.employee_id, monthStr);
    
    let present = 0;
    let halfDay = 0;
    let absent = 0;
    let leave = 0;
    let holiday = 0;
    let otHours = 0;
    
    attendance.forEach(rec => {
      if (rec.status === 'Present') present++;
      else if (rec.status === 'Half Day') halfDay++;
      else if (rec.status === 'Absent') absent++;
      else if (rec.status === 'Leave') leave++;
      else if (rec.status === 'Holiday') holiday++;
      else if (rec.status === 'Overtime') {
        present++;
        otHours += parseFloat(rec.overtime_hours) || 0;
      }
    });

    const calc = calculateSalaryForEmployee(emp.employee_id, monthStr);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${emp.name}</strong> <span class="text-muted">(${emp.employee_id})</span></td>
      <td>${present}</td>
      <td>${halfDay}</td>
      <td style="color:${absent > 0 ? 'var(--danger)' : 'inherit'}">${absent}</td>
      <td>${leave}</td>
      <td>${holiday}</td>
      <td>${otHours} hrs</td>
      <td><strong>${calc.days_worked} days</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

// ─────────────────────────────────────────────
// ADMIN: REPORTS TAB SWITCHER & DRAW LOGIC
// ─────────────────────────────────────────────
function switchReportTab(tab) {
  state.activeReportTab = tab;
  
  document.getElementById('btn-rep-tab-salary').classList.toggle('active', tab === 'report-salary');
  document.getElementById('btn-rep-tab-attendance').classList.toggle('active', tab === 'report-attendance');
  document.getElementById('btn-rep-tab-leaves').classList.toggle('active', tab === 'report-leaves');
  
  document.getElementById('subview-rep-salary').style.display = tab === 'report-salary' ? 'block' : 'none';
  document.getElementById('subview-rep-attendance').style.display = tab === 'report-attendance' ? 'block' : 'none';
  document.getElementById('subview-rep-leaves').style.display = tab === 'report-leaves' ? 'block' : 'none';

  if (tab === 'report-salary') {
    // Populate employee history selector
    const selector = document.getElementById('report-salary-emp-id');
    selector.innerHTML = '';
    const employees = getEmployees();
    employees.forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp.employee_id;
      opt.textContent = `${emp.name} (${emp.employee_id})`;
      selector.appendChild(opt);
    });
    
    // Select first employee and load salary history
    if (employees.length > 0) {
      state.selectedReportSalaryEmpId = employees[0].employee_id;
      selector.value = state.selectedReportSalaryEmpId;
      drawEmployeeSalaryHistory();
    }
    
    drawReportsDashboard();
  } else if (tab === 'report-attendance') {
    const monthInput = document.getElementById('report-attendance-month');
    if (!monthInput.value) monthInput.value = getCurrentMonth();
    drawAttendanceReportTable(monthInput.value);
  } else if (tab === 'report-leaves') {
    const monthInput = document.getElementById('report-leave-month');
    if (!monthInput.value) monthInput.value = getCurrentMonth();
    drawLeaveReportTable(monthInput.value);
  }
}

function drawAttendanceReportTable(monthStr) {
  const activeEmps = getActiveEmployees();
  const tbody = document.querySelector('#reports-attendance-table tbody');
  tbody.innerHTML = '';

  if (activeEmps.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No active employees.</td></tr>`;
    return;
  }

  let totalPossibleDays = 0;
  let totalPresentDays = 0;
  let totalAbsentDays = 0;
  let totalLeaveDays = 0;

  activeEmps.forEach(emp => {
    const attendance = getEmployeeAttendanceForMonth(emp.employee_id, monthStr);
    
    let present = 0;
    let halfDay = 0;
    let absent = 0;
    let leave = 0;
    let holiday = 0;
    let otHours = 0;
    
    attendance.forEach(rec => {
      if (rec.status === 'Present') present++;
      else if (rec.status === 'Half Day') halfDay++;
      else if (rec.status === 'Absent') absent++;
      else if (rec.status === 'Leave') leave++;
      else if (rec.status === 'Holiday') holiday++;
      else if (rec.status === 'Overtime') {
        present++;
        otHours += parseFloat(rec.overtime_hours) || 0;
      }
    });

    totalPresentDays += present + (halfDay * 0.5);
    totalAbsentDays += absent + (halfDay * 0.5);
    totalLeaveDays += leave;
    totalPossibleDays += (present + halfDay + absent + leave + holiday);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${emp.name}</strong> <span class="text-muted">(${emp.employee_id})</span></td>
      <td>${badge(emp.salary_type, emp.salary_type === 'Daily' ? 'badge-info' : 'badge-accent')}</td>
      <td>${present}</td>
      <td>${halfDay}</td>
      <td style="color:${absent > 0 ? 'var(--danger)' : 'inherit'}">${absent}</td>
      <td>${leave}</td>
      <td>${holiday}</td>
      <td>${otHours} hrs</td>
    `;
    tbody.appendChild(tr);
  });

  // Calculate stats
  const avgAttRate = totalPossibleDays > 0 ? Math.round((totalPresentDays / totalPossibleDays) * 100) : 0;
  document.getElementById('report-att-rate').textContent = `${avgAttRate}%`;
  document.getElementById('report-att-total-absent').textContent = `${totalAbsentDays} days`;
  document.getElementById('report-att-total-leave').textContent = `${totalLeaveDays} days`;
}

function drawLeaveReportTable(monthStr) {
  const leaves = getLeaves();
  const employees = getEmployees();
  const tbody = document.querySelector('#reports-leaves-table tbody');
  tbody.innerHTML = '';

  const monthlyLeaves = leaves.filter(l => l.start_date.startsWith(monthStr));

  let pending = 0;
  let approved = 0;
  let rejected = 0;

  monthlyLeaves.forEach(l => {
    if (l.status === 'Pending') pending++;
    else if (l.status === 'Approved') approved++;
    else if (l.status === 'Rejected') rejected++;
  });

  // Also include overall pending requests (all time) in the count
  const allTimePending = leaves.filter(l => l.status === 'Pending').length;
  document.getElementById('report-leaves-pending').textContent = allTimePending;
  document.getElementById('report-leaves-approved').textContent = approved;
  document.getElementById('report-leaves-rejected').textContent = rejected;

  if (monthlyLeaves.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No leave applications for this month.</td></tr>`;
    return;
  }

  monthlyLeaves.forEach(l => {
    const emp = employees.find(e => e.employee_id === l.employee_id);
    const empName = emp ? emp.name : 'Unknown';
    const statusClass = l.status === 'Approved' ? 'badge-success' : l.status === 'Rejected' ? 'badge-danger' : 'badge-warning';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${empName}</strong> <span class="text-muted">(${l.employee_id})</span></td>
      <td>${l.leave_type}</td>
      <td>${l.start_date}</td>
      <td>${l.end_date}</td>
      <td>${l.days_count} days</td>
      <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${l.reason}">${l.reason}</td>
      <td>${badge(l.status, statusClass)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function drawEmployeeSalaryHistory() {
  const empId = state.selectedReportSalaryEmpId;
  const settings = getSettings();
  const salaries = getEmployeeSalaries(empId);
  const tbody = document.querySelector('#reports-emp-history-table tbody');
  tbody.innerHTML = '';

  if (salaries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No salary records found for this employee.</td></tr>`;
    return;
  }

  salaries.sort((a, b) => b.month.localeCompare(a.month));
  salaries.forEach(sal => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${formatMonthLabel(sal.month)}</strong></td>
      <td>${sal.days_worked} days</td>
      <td>${sal.overtime_hours} hrs</td>
      <td style="color:var(--danger)">${fmtCurrency((sal.deductions || 0) + (sal.leave_deductions || 0), settings.currency)}</td>
      <td style="color:var(--success)">${fmtCurrency(sal.bonus || 0, settings.currency)}</td>
      <td><strong>${fmtCurrency(sal.net_salary, settings.currency)}</strong></td>
      <td><span style="font-size:0.85rem; color:var(--text-muted);">${sal.processed_date ? new Date(sal.processed_date).toLocaleString() : '—'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ─────────────────────────────────────────────
// UTILITY: badge HTML
// ─────────────────────────────────────────────
function badge(text, cls) {
  return `<span class="badge ${cls}">${text}</span>`;
}
