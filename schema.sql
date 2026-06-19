-- AKSHA FARM Database Schema
-- Compatible with PostgreSQL / Supabase

-- 1. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    position VARCHAR(100) NOT NULL,
    join_date DATE NOT NULL,
    salary_type VARCHAR(10) CHECK (salary_type IN ('Daily', 'Monthly')),
    daily_rate DECIMAL(10, 2) DEFAULT 0.00,
    monthly_salary DECIMAL(10, 2) DEFAULT 0.00,
    status VARCHAR(10) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive'))
);

-- 2. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) REFERENCES employees(employee_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(15) CHECK (status IN ('Present', 'Absent', 'Half Day', 'Overtime')),
    overtime_hours DECIMAL(4, 2) DEFAULT 0.00,
    UNIQUE (employee_id, date)
);

-- 3. Salary Records Table
CREATE TABLE IF NOT EXISTS salary (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) REFERENCES employees(employee_id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    days_worked INT DEFAULT 0,
    overtime_hours DECIMAL(6, 2) DEFAULT 0.00,
    deductions DECIMAL(10, 2) DEFAULT 0.00,
    bonus DECIMAL(10, 2) DEFAULT 0.00,
    net_salary DECIMAL(10, 2) NOT NULL,
    processed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id, month)
);
