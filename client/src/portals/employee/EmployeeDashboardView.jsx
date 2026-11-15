/**
 * EmployeeDashboardView.jsx — Main view rendered on /employee/:username/dashboard.
 * Displays role-specific workspace:
 * - Inventory Manager -> Products & Inventory
 * - Sales Executive   -> Order Management
 * - Social Media Manager -> Products & Inventory
 */

import React from 'react';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import AdminProducts from '../admin/AdminProducts';
import AdminOrders from '../admin/AdminOrders';
import SocialProducts from './SocialProducts';

const EmployeeDashboardView = () => {
  const { employee } = useEmployeeAuth();
  const roleName = employee?.roleName;

  if (roleName === 'Sales Executive') {
    return <AdminOrders />;
  }

  if (roleName === 'Social Media Manager') {
    return <SocialProducts />;
  }

  // Inventory Manager or other employees default to Products & Inventory
  return <AdminProducts />;
};

export default EmployeeDashboardView;
