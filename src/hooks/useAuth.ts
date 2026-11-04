import { useEffect, useState, useCallback } from 'react';
import type { UserRole } from '@/types';
import { customAuth } from '@/services/customAuth';

const mapEmployeeTypeToRole = (employeeType: string): UserRole => {
  const mapping: Record<string, UserRole> = {
    'SUPER_ADMIN': 'super_admin',
    'ADMIN': 'admin',
    'MANAGER': 'manager',
    'BRANCH_MANAGER': 'branch_manager',
    'DSA': 'dsa_partner',
    'EMPLOYEE': 'employee',
    'TL': 'team_leader',
  };
  return mapping[employeeType] || 'employee';
};

export const useAuth = () => {
  const [user, setUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('employee');
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setDisplayName(userData.name || '');
      setUserRole(userData.role || 'employee');
    }
  }, []);

  // Exposed setters for external updates
  const updateUser = useCallback((userData: any) => {
    setUser(userData);
    if (userData) {
      setDisplayName(userData.name || '');
      setUserRole(userData.role || 'employee');
    }
  }, []);

  const updateUserRole = useCallback((role: UserRole) => {
    setUserRole(role);
  }, []);

  const updateDisplayName = useCallback((name: string) => {
    setDisplayName(name);
  }, []);

  const signUp = async (email: string, password: string, name: string, teamNumber?: string, employeeType?: string, pan?: string, dob?: string, aadhaar?: string, aadhaarName?: string, aadhaarAddress?: string, aadhaarFatherName?: string, userEmail?: string) => {
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    return { error: null };
  };

  const signOut = async () => {
    await customAuth.signOut();
    setUser(null);
    setUserRole('employee');
    setDisplayName('');
  };

  const resetPassword = async (email: string) => {
    return { error: null };
  };

  return { 
    user, 
    setUser: updateUser,
    userRole, 
    setUserRole: updateUserRole,
    loading, 
    displayName,
    setDisplayName: updateDisplayName,
    signUp, 
    signIn, 
    signOut, 
    resetPassword 
  };
};