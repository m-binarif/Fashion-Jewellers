/**
 * employeeService.js — Employee CRUD and role management.
 */

const pool = require('../db/pool');
const AppError = require('../utils/AppError');

const EmployeeService = {
  async getAdminEmployees() {
    const { rows } = await pool.query(
      `SELECT e.employee_id AS id, e.emp_name AS name, e.email,
              e.phone_number AS phone, e.cnic, e.username, e.increment,
              e.role_id AS "roleId", rt.role_name AS role,
              e.hire_date AS "hireDate", e.created_at AS "createdAt",
              (e.is_active = 1) AS "isActive"
       FROM employee e
       LEFT JOIN role_type rt ON e.role_id = rt.role_id
       WHERE e.is_active = 1 ORDER BY e.created_at DESC`
    );
    return rows;
  },

  async deleteEmployee(employeeId) {
    const result = await pool.query('UPDATE employee SET is_active = 0 WHERE employee_id = $1', [employeeId]);
    if (result.rowCount === 0) throw new AppError('Employee not found', 404);
  },

  async getRoles() {
    const { rows } = await pool.query('SELECT role_id AS id, role_name AS name, basic_salary AS salary FROM role_type ORDER BY role_name ASC');
    return rows;
  },

  async createEmployee(data) {
    const { name, email, phone, cnic, username, password, roleId, increment = 0, hireDate } = data;

    if (!name || !email || !phone || !cnic || !username || !password || !roleId) {
      throw new AppError('All required fields must be provided', 400);
    }

    const { getNextId } = require('../utils/idGenerator');
    const bcrypt = require('bcrypt');

    // Check if email already in use
    const { rows: existingEmail } = await pool.query('SELECT employee_id FROM employee WHERE email = $1', [email]);
    if (existingEmail.length > 0) throw new AppError('Email already in use by another employee', 409);

    // Check if username already in use
    const { rows: existingUsername } = await pool.query('SELECT employee_id FROM employee WHERE username = $1', [username]);
    if (existingUsername.length > 0) throw new AppError('Username already in use', 409);

    const employeeId = await getNextId(pool, 'employee', 'employee_id', 'EMP');
    const passwordHash = await bcrypt.hash(password, 12);
    const resolvedHireDate = hireDate || new Date().toISOString().split('T')[0];

    await pool.query(
      `INSERT INTO employee (employee_id, emp_name, email, phone_number, hire_date, cnic, username, password, increment, role_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)`,
      [employeeId, name.trim(), email.trim(), phone.trim(), resolvedHireDate, cnic.trim(), username.trim(), passwordHash, Number(increment), roleId]
    );

    return { id: employeeId, name, email, phone, roleId };
  },

  async updateEmployee(employeeId, data) {
    const { name, email, phone, cnic, username, password, roleId, increment } = data;

    if (!name || !email || !phone || !cnic || !username || !roleId) {
      throw new AppError('All required fields must be provided', 400);
    }

    const bcrypt = require('bcrypt');

    // Check email uniqueness
    const { rows: existingEmail } = await pool.query('SELECT employee_id FROM employee WHERE email = $1 AND employee_id <> $2', [email, employeeId]);
    if (existingEmail.length > 0) throw new AppError('Email already in use by another employee', 409);

    // Check username uniqueness
    const { rows: existingUsername } = await pool.query('SELECT employee_id FROM employee WHERE username = $1 AND employee_id <> $2', [username, employeeId]);
    if (existingUsername.length > 0) throw new AppError('Username already in use', 409);

    let query = `UPDATE employee SET emp_name = $1, email = $2, phone_number = $3, cnic = $4, username = $5, role_id = $6`;
    const params = [name.trim(), email.trim(), phone.trim(), cnic.trim(), username.trim(), roleId];
    let idx = 7;

    if (increment !== undefined && increment !== null) {
      query += `, increment = $${idx++}`;
      params.push(Number(increment));
    }

    if (password && password.trim().length > 0) {
      const passwordHash = await bcrypt.hash(password, 12);
      query += `, password = $${idx++}`;
      params.push(passwordHash);
    }

    query += ` WHERE employee_id = $${idx}`;
    params.push(employeeId);

    const result = await pool.query(query, params);
    if (result.rowCount === 0) throw new AppError('Employee not found', 404);

    return { id: employeeId, name, email, phone, roleId };
  }
};

module.exports = { EmployeeService };
