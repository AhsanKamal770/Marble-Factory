import { db } from '../../db/index.js';

export const employeesPayrollService = {
  // Employee Operations
  async getAllEmployees() {
    try {
      if (db.employees) {
        return await db.employees.toArray();
      }
      return [];
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  },

  async addEmployee(employeeData) {
    try {
      if (db.employees) {
        return await db.employees.add(employeeData);
      }
      throw new Error('employees store is not defined');
    } catch (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  },

  async updateEmployee(id, employeeData) {
    try {
      if (db.employees) {
        return await db.employees.update(id, employeeData);
      }
      throw new Error('employees store is not defined');
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  },

  async deleteEmployee(id) {
    try {
      if (db.employees) {
        return await db.employees.delete(id);
      }
      throw new Error('employees store is not defined');
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  },

  // Advance Operations
  async getAllAdvances() {
    try {
      if (db.employee_advances) {
        return await db.employee_advances.toArray();
      }
      return [];
    } catch (error) {
      console.error('Error fetching advances:', error);
      throw error;
    }
  },

  async addAdvance(advanceData) {
    try {
      if (db.employee_advances) {
        return await db.employee_advances.add(advanceData);
      }
      throw new Error('employee_advances store is not defined');
    } catch (error) {
      console.error('Error adding advance:', error);
      throw error;
    }
  },

  async deleteAdvance(id) {
    try {
      if (db.employee_advances) {
        return await db.employee_advances.delete(id);
      }
      throw new Error('employee_advances store is not defined');
    } catch (error) {
      console.error('Error deleting advance:', error);
      throw error;
    }
  },

  // Payroll Operations
  async getAllPayrolls() {
    try {
      if (db.payrolls) {
        return await db.payrolls.toArray();
      }
      return [];
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      throw error;
    }
  },

  async addPayroll(payrollData) {
    try {
      if (db.payrolls) {
        return await db.payrolls.add(payrollData);
      }
      throw new Error('payrolls store is not defined');
    } catch (error) {
      console.error('Error adding payroll:', error);
      throw error;
    }
  }
};
