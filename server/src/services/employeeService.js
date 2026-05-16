/**
 * employeeService.js — Employee listing, deactivation.
 */

const pool = require('../db/pool');
const AppError = require('../utils/AppError');

const EmployeeService = {
  async getAdminEmployees() {
    const { rows } = await pool.query(
      `SELECT e.employee_id AS id, e.emp_name AS name, e.email,
              c.phone_number AS phone, rt.role_name AS role,
              e.hire_date AS "createdAt", e.is_active AS "isActive"
       FROM employee e
       LEFT JOIN emp_contacts c ON e.employee_id = c.employee_id
       LEFT JOIN role_type rt ON e.role_id = rt.role_id
       WHERE e.is_active = 1 ORDER BY e.created_at DESC`
    );
    return rows;
  },

  async deleteEmployee(employeeId) {
    const result = await pool.query('UPDATE employee SET is_active = 0 WHERE employee_id = $1', [employeeId]);
    if (result.rowCount === 0) throw new AppError('Employee not found', 404);
  }
};

module.exports = { EmployeeService };
