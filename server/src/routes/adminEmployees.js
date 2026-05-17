const express = require('express');
const { EmployeeService } = require('../services/employeeService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

router.get('/', catchAsync(async (req, res) => {
  const result = await EmployeeService.getAdminEmployees();
  res.json({ success: true, data: result, message: 'Employees retrieved successfully' });
}));

router.get('/roles', catchAsync(async (req, res) => {
  const result = await EmployeeService.getRoles();
  res.json({ success: true, data: result, message: 'Employee roles retrieved successfully' });
}));

router.post('/', catchAsync(async (req, res) => {
  const result = await EmployeeService.createEmployee(req.body);
  res.status(201).json({ success: true, data: result, message: 'Employee created successfully' });
}));

router.patch('/:id', catchAsync(async (req, res) => {
  const result = await EmployeeService.updateEmployee(req.params.id, req.body);
  res.json({ success: true, data: result, message: 'Employee updated successfully' });
}));

router.delete('/:id', catchAsync(async (req, res) => {
  await EmployeeService.deleteEmployee(req.params.id);
  res.json({ success: true, data: null, message: 'Employee deleted successfully' });
}));

module.exports = router;
