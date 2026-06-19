// AKSHA FARM - Local Storage Database Layer

// Key names for LocalStorage
const KEYS = {
  EMPLOYEES: 'aksha_employees',
  ATTENDANCE: 'aksha_attendance',
  SALARIES: 'aksha_salaries',
  SETTINGS: 'aksha_settings',
  LEAVES: 'aksha_leaves',
  NOTIFICATIONS: 'aksha_notifications'
};

// Default Settings
const DEFAULT_SETTINGS = {
  companyName: 'AKSHA POULTRY FARM',
  companyAddress: '423/1,KEKUNAGOLLA,KEKUNAGOLLA.',
  companyPhone: '+94768470361',
  currency: 'Rs.',
  defaultOvertimeRate: 350, // Per hour for monthly workers
  defaultDeductionRate: 200, // Optional standard deduction value
  leaveLimits: {
    Annual: 14,
    Sick: 7,
    Casual: 7,
    Emergency: 3,
    Unpaid: 999
  },
  publicHolidays: [
    { date: '2026-01-01', name: 'New Year\'s Day' },
    { date: '2026-04-13', name: 'Sinhala & Tamil New Year Eve' },
    { date: '2026-04-14', name: 'Sinhala & Tamil New Year Day' },
    { date: '2026-05-01', name: 'May Day' },
    { date: '2026-06-15', name: 'Poson Full Moon Poya Day' }
  ]
};

// Initial Seed Data
const DEFAULT_EMPLOYEES = [
  { employee_id: 'EMP001', name: 'Ahmed Perera', phone: '+94 71 888 1111', position: 'Harvester', join_date: '2025-01-10', salary_type: 'Daily', daily_rate: 1500, monthly_salary: 0, status: 'Active', nic: '951234567V', address: '12 Main St, Kurunegala', password: 'password123' },
  { employee_id: 'EMP002', name: 'Nimal Silva', phone: '+94 77 222 3333', position: 'Tractor Driver', join_date: '2025-03-15', salary_type: 'Daily', daily_rate: 1800, monthly_salary: 0, status: 'Active', nic: '921112223V', address: '45 Negombo Rd, Kurunegala', password: 'password123' },
  { employee_id: 'EMP003', name: 'Siri Fernando', phone: '+94 76 333 4444', position: 'Farm Supervisor', join_date: '2024-06-01', salary_type: 'Monthly', daily_rate: 0, monthly_salary: 45000, status: 'Active', nic: '883334445V', address: '88 Colombo Rd, Kurunegala', password: 'password123' },
  { employee_id: 'EMP004', name: 'Kamal Gunawardena', phone: '+94 72 444 5555', position: 'Poultry Caretaker', join_date: '2025-11-20', salary_type: 'Monthly', daily_rate: 0, monthly_salary: 38000, status: 'Active', nic: '984445556V', address: '102 Dambulla Rd, Kurunegala', password: 'password123' },
  { employee_id: 'EMP005', name: 'Fatima Razak', phone: '+94 75 555 6666', position: 'Egg Grader', join_date: '2026-02-01', salary_type: 'Daily', daily_rate: 1200, monthly_salary: 0, status: 'Active', nic: '975556667V', address: '15 Puttalam Rd, Kurunegala', password: 'password123' }
];

const DEFAULT_LEAVES = [
  { id: 'LV001', employee_id: 'EMP001', leave_type: 'Sick', start_date: '2026-06-02', end_date: '2026-06-03', days_count: 2, reason: 'Flu and fever', status: 'Approved', applied_date: '2026-06-01', admin_remarks: 'Approved by supervisor Siri' },
  { id: 'LV002', employee_id: 'EMP004', leave_type: 'Annual', start_date: '2026-06-10', end_date: '2026-06-12', days_count: 3, reason: 'Family function', status: 'Approved', applied_date: '2026-06-08', admin_remarks: 'Cover arranged' },
  { id: 'LV003', employee_id: 'EMP002', leave_type: 'Casual', start_date: '2026-06-22', end_date: '2026-06-23', days_count: 2, reason: 'Personal work', status: 'Pending', applied_date: '2026-06-18', admin_remarks: '' }
];

const DEFAULT_NOTIFICATIONS = [
  { id: 'NT001', employee_id: 'EMP001', title: 'Leave Approved', message: 'Your Sick leave request for 2026-06-02 to 2026-06-03 has been approved.', type: 'Leave_Approved', date: '2026-06-01', read: true },
  { id: 'NT002', employee_id: 'EMP004', title: 'Leave Approved', message: 'Your Annual leave request for 2026-06-10 to 2026-06-12 has been approved.', type: 'Leave_Approved', date: '2026-06-08', read: true },
  { id: 'NT003', employee_id: 'EMP001', title: 'May Salary Processed', message: 'Your salary for May 2026 has been processed. Net salary: Rs. 36,000.', type: 'Salary_Processed', date: '2026-06-01', read: false }
];

// Helper: Get today's date string YYYY-MM-DD
function getTodayDateString() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset*60*1000));
  return localDate.toISOString().split('T')[0];
}

// Seed function to populate localStorage with initial values
export function initializeDatabase() {
  const currentSettings = localStorage.getItem(KEYS.SETTINGS);
  if (!currentSettings) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  } else {
    try {
      const parsed = JSON.parse(currentSettings);
      let updated = false;
      // If the address, phone or name matches the old default, force update it.
      if (parsed.companyAddress === 'Negombo Road, Kurunegala, Sri Lanka' || parsed.companyAddress === 'Negombo Rd, Kurunegala, Sri Lanka' || !parsed.companyAddress) {
        parsed.companyAddress = DEFAULT_SETTINGS.companyAddress;
        updated = true;
      }
      if (parsed.companyPhone === '+94 77 123 4567' || parsed.companyPhone === '+94771234567' || !parsed.companyPhone) {
        parsed.companyPhone = DEFAULT_SETTINGS.companyPhone;
        updated = true;
      }
      if (parsed.companyName === 'AKSHA FARM' || !parsed.companyName) {
        parsed.companyName = DEFAULT_SETTINGS.companyName;
        updated = true;
      }
      if (updated) {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(parsed));
      }
    } catch (e) {
      console.error("Failed to migrate settings:", e);
    }
  }
  
  if (!localStorage.getItem(KEYS.EMPLOYEES)) {
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(DEFAULT_EMPLOYEES));
  }

  if (!localStorage.getItem(KEYS.LEAVES)) {
    localStorage.setItem(KEYS.LEAVES, JSON.stringify(DEFAULT_LEAVES));
  }

  if (!localStorage.getItem(KEYS.NOTIFICATIONS)) {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(DEFAULT_NOTIFICATIONS));
  }
  
  if (!localStorage.getItem(KEYS.ATTENDANCE)) {
    const attendanceList = [];
    
    // Seed attendance for past 17 days of June 2026
    for (let day = 1; day < 18; day++) {
      const dateStr = `2026-06-${day.toString().padStart(2, '0')}`;
      
      DEFAULT_EMPLOYEES.forEach(emp => {
        // Simple random/pattern distribution for attendance
        let status = 'Present';
        let otHours = 0;
        
        // Siri is always present
        if (emp.employee_id === 'EMP003') {
          status = 'Present';
          if (day % 4 === 0) {
            status = 'Overtime';
            otHours = 3;
          }
        } 
        // Ahmed is absent on 2nd and 12th, has 2 Half Days, and on Leave on 2nd-3rd (Sick)
        else if (emp.employee_id === 'EMP001') {
          if (day === 2 || day === 3) {
            status = 'Leave';
          } else if (day === 12) {
            status = 'Absent';
          } else if (day === 5 || day === 15) {
            status = 'Half Day';
          }
        } 
        // Nimal has perfect attendance, some overtime
        else if (emp.employee_id === 'EMP002') {
          if (day % 5 === 0) {
            status = 'Overtime';
            otHours = 2;
          }
        }
        // Kamal has some absent days, on leave June 10-12
        else if (emp.employee_id === 'EMP004') {
          if (day >= 10 && day <= 12) {
            status = 'Leave';
          } else if (day === 7) {
            status = 'Absent';
          } else if (day === 14) {
            status = 'Half Day';
          }
        }
        // Fatima has average attendance
        else if (emp.employee_id === 'EMP005') {
          if (day === 3 || day === 10) {
            status = 'Absent';
          }
        }

        attendanceList.push({
          id: `${emp.employee_id}_${dateStr}`,
          employee_id: emp.employee_id,
          date: dateStr,
          status: status,
          overtime_hours: otHours
        });
      });
    }

    // Seed "Today" (June 18, 2026) attendance partly marked
    const todayStr = '2026-06-18';
    attendanceList.push({ id: `EMP001_${todayStr}`, employee_id: 'EMP001', date: todayStr, status: 'Present', overtime_hours: 0 });
    attendanceList.push({ id: `EMP002_${todayStr}`, employee_id: 'EMP002', date: todayStr, status: 'Present', overtime_hours: 0 });
    attendanceList.push({ id: `EMP003_${todayStr}`, employee_id: 'EMP003', date: todayStr, status: 'Present', overtime_hours: 2 });
    attendanceList.push({ id: `EMP004_${todayStr}`, employee_id: 'EMP004', date: todayStr, status: 'Absent', overtime_hours: 0 });
    attendanceList.push({ id: `EMP005_${todayStr}`, employee_id: 'EMP005', date: todayStr, status: 'Half Day', overtime_hours: 0 });

    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(attendanceList));
  }

  if (!localStorage.getItem(KEYS.SALARIES)) {
    // Seed May 2026 salaries as processed history
    const seededSalaries = [
      {
        id: 'EMP001_2026-05',
        employee_id: 'EMP001',
        month: '2026-05',
        days_worked: 24, // worked 24 days out of 26 workdays
        overtime_hours: 0,
        deductions: 0,
        bonus: 0,
        advance_payments: 0,
        leave_deductions: 0,
        net_salary: 36000 // 24 * 1500
      },
      {
        id: 'EMP002_2026-05',
        employee_id: 'EMP002',
        month: '2026-05',
        days_worked: 26,
        overtime_hours: 8,
        deductions: 0,
        bonus: 0,
        advance_payments: 0,
        leave_deductions: 0,
        net_salary: 46800 // 26 * 1800
      },
      {
        id: 'EMP003_2026-05',
        employee_id: 'EMP003',
        month: '2026-05',
        days_worked: 26,
        overtime_hours: 12, // 12 hrs * 350 = 4200
        deductions: 1000,
        bonus: 2000,
        advance_payments: 0,
        leave_deductions: 0,
        net_salary: 50200 // 45000 + 4200 - 1000 + 2000
      },
      {
        id: 'EMP004_2026-05',
        employee_id: 'EMP004',
        month: '2026-05',
        days_worked: 25,
        overtime_hours: 0,
        deductions: 500,
        bonus: 0,
        advance_payments: 0,
        leave_deductions: 0,
        net_salary: 37500 // 38000 - 500
      }
    ];
    localStorage.setItem(KEYS.SALARIES, JSON.stringify(seededSalaries));
  }
}

// Ensure database is initialized immediately
initializeDatabase();

// --- Employees API ---
export function getEmployees() {
  return JSON.parse(localStorage.getItem(KEYS.EMPLOYEES)) || [];
}

export function getActiveEmployees() {
  return getEmployees().filter(emp => emp.status === 'Active');
}

export function saveEmployee(employee) {
  const employees = getEmployees();
  const index = employees.findIndex(emp => emp.employee_id === employee.employee_id);
  
  if (index >= 0) {
    employees[index] = { ...employees[index], ...employee };
  } else {
    // Check if employee ID already exists
    const exists = employees.some(emp => emp.employee_id === employee.employee_id);
    if (exists) throw new Error(`Employee ID ${employee.employee_id} already exists.`);
    
    employee.status = employee.status || 'Active';
    employees.push(employee);
  }
  
  localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees));
  return employee;
}

export function deactivateEmployee(employeeId) {
  const employees = getEmployees();
  const index = employees.findIndex(emp => emp.employee_id === employeeId);
  if (index >= 0) {
    employees[index].status = 'Inactive';
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees));
    return true;
  }
  return false;
}

export function activateEmployee(employeeId) {
  const employees = getEmployees();
  const index = employees.findIndex(emp => emp.employee_id === employeeId);
  if (index >= 0) {
    employees[index].status = 'Active';
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees));
    return true;
  }
  return false;
}

export function deleteEmployee(employeeId) {
  // Delete from employees
  const employees = getEmployees();
  const filteredEmployees = employees.filter(emp => emp.employee_id !== employeeId);
  localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(filteredEmployees));

  // Delete from attendance
  const attendance = JSON.parse(localStorage.getItem(KEYS.ATTENDANCE)) || [];
  const filteredAttendance = attendance.filter(rec => rec.employee_id !== employeeId);
  localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(filteredAttendance));

  // Delete from salaries
  const salaries = JSON.parse(localStorage.getItem(KEYS.SALARIES)) || [];
  const filteredSalaries = salaries.filter(rec => rec.employee_id !== employeeId);
  localStorage.setItem(KEYS.SALARIES, JSON.stringify(filteredSalaries));

  // Delete from leaves
  const leaves = JSON.parse(localStorage.getItem(KEYS.LEAVES)) || [];
  const filteredLeaves = leaves.filter(rec => rec.employee_id !== employeeId);
  localStorage.setItem(KEYS.LEAVES, JSON.stringify(filteredLeaves));

  // Delete from notifications
  const notifications = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS)) || [];
  const filteredNotifications = notifications.filter(rec => rec.employee_id !== employeeId);
  localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(filteredNotifications));

  return true;
}


// --- Attendance API ---
export function getAttendance() {
  return JSON.parse(localStorage.getItem(KEYS.ATTENDANCE)) || [];
}

export function getAttendanceByDate(dateStr) {
  const list = getAttendance();
  return list.filter(record => record.date === dateStr);
}

export function getAttendanceForMonth(monthStr) {
  const list = getAttendance();
  return list.filter(record => record.date.startsWith(monthStr));
}

export function getEmployeeAttendanceForMonth(employeeId, monthStr) {
  const list = getAttendance();
  return list.filter(record => record.employee_id === employeeId && record.date.startsWith(monthStr));
}

export function saveDailyAttendance(dateStr, records) {
  const currentAttendance = getAttendance();
  
  // records is an array of { employee_id, status, overtime_hours }
  records.forEach(rec => {
    const recordId = `${rec.employee_id}_${dateStr}`;
    const index = currentAttendance.findIndex(r => r.id === recordId);
    
    const newRecord = {
      id: recordId,
      employee_id: rec.employee_id,
      date: dateStr,
      status: rec.status,
      overtime_hours: parseFloat(rec.overtime_hours) || 0
    };
    
    if (index >= 0) {
      currentAttendance[index] = newRecord;
    } else {
      currentAttendance.push(newRecord);
    }
  });
  
  localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(currentAttendance));
}

// --- Salary & Payroll API ---
export function getSalaries() {
  return JSON.parse(localStorage.getItem(KEYS.SALARIES)) || [];
}

export function getSalariesByMonth(monthStr) {
  const list = getSalaries();
  return list.filter(record => record.month === monthStr);
}

export function getEmployeeSalaries(employeeId) {
  const list = getSalaries();
  return list.filter(record => record.employee_id === employeeId);
}

export function saveSalary(salaryRecord) {
  const salaries = getSalaries();
  const recordId = `${salaryRecord.employee_id}_${salaryRecord.month}`;
  const index = salaries.findIndex(s => s.id === recordId);
  
  const record = {
    id: recordId,
    ...salaryRecord
  };
  
  if (index >= 0) {
    salaries[index] = record;
  } else {
    salaries.push(record);
  }
  
  localStorage.setItem(KEYS.SALARIES, JSON.stringify(salaries));
  return record;
}

export function deleteSalary(employeeId, month) {
  const salaries = getSalaries();
  const recordId = `${employeeId}_${month}`;
  const filtered = salaries.filter(s => s.id !== recordId);
  localStorage.setItem(KEYS.SALARIES, JSON.stringify(filtered));
  return true;
}

// Compute salary preview for an employee for a specific month based on attendance
export function calculateSalaryForEmployee(employeeId, monthStr) {
  const employees = getEmployees();
  const employee = employees.find(emp => emp.employee_id === employeeId);
  if (!employee) throw new Error('Employee not found');
  
  const attendance = getEmployeeAttendanceForMonth(employeeId, monthStr);
  const settings = getSettings();
  
  let daysWorked = 0;
  let otHours = 0;
  let absentDays = 0;
  let halfDays = 0;
  let unpaidLeaves = 0;
  
  attendance.forEach(att => {
    if (att.status === 'Present') {
      daysWorked += 1;
    } else if (att.status === 'Half Day') {
      daysWorked += 0.5;
      halfDays += 0.5;
    } else if (att.status === 'Overtime') {
      daysWorked += 1;
      otHours += parseFloat(att.overtime_hours) || 0;
    } else if (att.status === 'Holiday') {
      daysWorked += 1; // public holidays are paid
    } else if (att.status === 'Absent') {
      absentDays += 1;
    } else if (att.status === 'Leave') {
      // Check if this was an approved leave of type Unpaid
      const dateStr = att.date;
      const leaves = getLeaves();
      const matchingLeave = leaves.find(l => 
        l.employee_id === employeeId && 
        l.status === 'Approved' && 
        dateStr >= l.start_date && 
        dateStr <= l.end_date
      );
      if (matchingLeave && matchingLeave.leave_type === 'Unpaid') {
        unpaidLeaves += 1;
      } else if (!matchingLeave) {
        unpaidLeaves += 1; // default to unpaid if no request is approved
      } else {
        // Approved paid leave:
        if (employee.salary_type === 'Monthly') {
          // monthly worker gets paid for approved paid leaves, no deduction.
        } else {
          // daily worker: leaves are unpaid
        }
      }
    }
  });

  let basePay = 0;
  let otPay = 0;
  let deductions = 0;
  let leaveDeductions = 0;
  let advancePayments = 0;
  let bonus = 0;
  let netSalary = 0;
  
  if (employee.salary_type === 'Daily') {
    basePay = daysWorked * employee.daily_rate;
    otPay = otHours * (employee.daily_rate / 8); // simple daily-overtime calculation
    netSalary = basePay + otPay;
  } else {
    // Monthly workers
    basePay = employee.monthly_salary;
    
    // Deduct for absent days, half days, and unpaid leaves
    const totalLostDays = absentDays + halfDays + unpaidLeaves;
    
    // Standard deduction: (Monthly Base / 26) * lost days
    if (totalLostDays > 0) {
      leaveDeductions = Math.round((employee.monthly_salary / 26) * totalLostDays);
    }
    
    otPay = otHours * settings.defaultOvertimeRate;
    netSalary = basePay + otPay - leaveDeductions;
  }
  
  // Round values
  netSalary = Math.max(0, Math.round(netSalary));
  leaveDeductions = Math.round(leaveDeductions);
  otPay = Math.round(otPay);
  basePay = Math.round(basePay);

  // Check if a saved record already exists for this month to load any manually saved values
  const salaries = getSalaries();
  const existingRecord = salaries.find(s => s.employee_id === employeeId && s.month === monthStr);
  
  if (existingRecord) {
    return {
      employee_id: employeeId,
      name: employee.name,
      salary_type: employee.salary_type,
      rate: employee.salary_type === 'Daily' ? employee.daily_rate : employee.monthly_salary,
      month: monthStr,
      days_worked: existingRecord.days_worked,
      overtime_hours: existingRecord.overtime_hours,
      ot_pay: existingRecord.overtime_hours * (employee.salary_type === 'Daily' ? (employee.daily_rate / 8) : settings.defaultOvertimeRate),
      deductions: existingRecord.deductions || 0,
      leave_deductions: existingRecord.leave_deductions || 0,
      advance_payments: existingRecord.advance_payments || 0,
      bonus: existingRecord.bonus || 0,
      net_salary: existingRecord.net_salary,
      is_processed: true
    };
  }
  
  return {
    employee_id: employeeId,
    name: employee.name,
    salary_type: employee.salary_type,
    rate: employee.salary_type === 'Daily' ? employee.daily_rate : employee.monthly_salary,
    month: monthStr,
    days_worked: daysWorked,
    overtime_hours: otHours,
    ot_pay: otPay,
    deductions: deductions,
    leave_deductions: leaveDeductions,
    advance_payments: advancePayments,
    bonus: bonus,
    net_salary: netSalary,
    is_processed: false
  };
}

// --- Settings API ---
export function getSettings() {
  return JSON.parse(localStorage.getItem(KEYS.SETTINGS)) || DEFAULT_SETTINGS;
}

export function saveSettings(settings) {
  const currentSettings = getSettings();
  const newSettings = { ...currentSettings, ...settings };
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(newSettings));
  return newSettings;
}

// --- Leaves API ---
export function getLeaves() {
  return JSON.parse(localStorage.getItem(KEYS.LEAVES)) || [];
}

export function getEmployeeLeaves(employeeId) {
  return getLeaves().filter(l => l.employee_id === employeeId);
}

export function saveLeaveApplication(leave) {
  const leaves = getLeaves();
  const id = leave.id || `LV${String(leaves.length + 1).padStart(3, '0')}`;
  
  const newLeave = {
    id,
    applied_date: getTodayDateString(),
    status: 'Pending',
    admin_remarks: '',
    ...leave
  };
  
  const index = leaves.findIndex(l => l.id === id);
  if (index >= 0) {
    leaves[index] = newLeave;
  } else {
    leaves.push(newLeave);
  }
  
  localStorage.setItem(KEYS.LEAVES, JSON.stringify(leaves));
  return newLeave;
}

export function updateLeaveStatus(leaveId, status, remarks) {
  const leaves = getLeaves();
  const index = leaves.findIndex(l => l.id === leaveId);
  if (index >= 0) {
    leaves[index].status = status;
    leaves[index].admin_remarks = remarks;
    localStorage.setItem(KEYS.LEAVES, JSON.stringify(leaves));
    
    // Create notification for employee
    const empId = leaves[index].employee_id;
    const leaveType = leaves[index].leave_type;
    const dates = `${leaves[index].start_date} to ${leaves[index].end_date}`;
    createNotification(
      empId,
      `Leave ${status}`,
      `Your request for ${leaveType} leave (${dates}) has been ${status.toLowerCase()}.${remarks ? ' Remarks: ' + remarks : ''}`,
      `Leave_${status}`
    );
    return leaves[index];
  }
  return null;
}

// Compute Leave Balances for an employee
export function calculateLeaveBalances(employeeId) {
  const settings = getSettings();
  const leaves = getEmployeeLeaves(employeeId);
  
  const limits = settings.leaveLimits || {
    Annual: 14,
    Sick: 7,
    Casual: 7,
    Emergency: 3
  };
  
  const used = {
    Annual: 0,
    Sick: 0,
    Casual: 0,
    Emergency: 0,
    Unpaid: 0
  };
  
  // Sum approved leaves
  leaves.forEach(l => {
    if (l.status === 'Approved') {
      const type = l.leave_type;
      if (used.hasOwnProperty(type)) {
        used[type] += parseFloat(l.days_count) || 0;
      }
    }
  });
  
  const balances = {
    Annual: Math.max(0, limits.Annual - used.Annual),
    Sick: Math.max(0, limits.Sick - used.Sick),
    Casual: Math.max(0, limits.Casual - used.Casual),
    Emergency: Math.max(0, limits.Emergency - used.Emergency),
    Unpaid: used.Unpaid // Unpaid has no limit but show usage
  };
  
  return { used, limits, balances };
}

// --- Notifications API ---
export function getNotifications(employeeId) {
  const all = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS)) || [];
  return all.filter(n => n.employee_id === employeeId);
}

export function getUnreadNotificationsCount(employeeId) {
  return getNotifications(employeeId).filter(n => !n.read).length;
}

export function createNotification(employeeId, title, message, type) {
  const all = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS)) || [];
  const id = `NT${String(all.length + 1).padStart(3, '0')}`;
  const newNotif = {
    id,
    employee_id: employeeId,
    title,
    message,
    type,
    date: getTodayDateString(),
    read: false
  };
  all.push(newNotif);
  localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(all));
  return newNotif;
}

export function markNotificationRead(id) {
  const all = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS)) || [];
  const index = all.findIndex(n => n.id === id);
  if (index >= 0) {
    all[index].read = true;
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(all));
    return true;
  }
  return false;
}

export function markAllNotificationsRead(employeeId) {
  const all = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS)) || [];
  let updated = false;
  all.forEach(n => {
    if (n.employee_id === employeeId && !n.read) {
      n.read = true;
      updated = true;
    }
  });
  if (updated) {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(all));
  }
  return updated;
}
