const express = require('express');
const { EmployeeService } = require('../services/employeeService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Only logged-in admin users can manage employees
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// GET /api/v1/admin/employees
// Fetch all employees in the system
router.get('/', async (req, res, next) => {
  try {
    const result = await EmployeeService.getAdminEmployees();
    res.json({ success: true, data: result, message: 'Employees retrieved successfully' });
  } catch (err) {
    next(err); // Send any errors to Express's global error handler
  }
});

// GET /api/v1/admin/employees/roles
// Fetch the available roles/types for employees
router.get('/roles', async (req, res, next) => {
  try {
    const result = await EmployeeService.getRoles();
    res.json({ success: true, data: result, message: 'Employee roles retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/employees
// Create a brand new employee record
router.post('/', async (req, res, next) => {
  try {
    const result = await EmployeeService.createEmployee(req.body);
    res.status(201).json({ success: true, data: result, message: 'Employee created successfully' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/employees/:id
// Update an existing employee's details (such as role, name, status)
router.patch('/:id', async (req, res, next) => {
  try {
    const result = await EmployeeService.updateEmployee(req.params.id, req.body);
    res.json({ success: true, data: result, message: 'Employee updated successfully' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/admin/employees/:id
// Remove an employee from the system
router.delete('/:id', async (req, res, next) => {
  try {
    await EmployeeService.deleteEmployee(req.params.id);
    res.json({ success: true, data: null, message: 'Employee deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
