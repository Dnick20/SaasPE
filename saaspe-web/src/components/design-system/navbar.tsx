'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/authStore';
import { authApi } from '@/lib/api/auth';
import { NavbarTokenBalance } from '@/components/layout/NavbarTokenBalance';

interface DesignSystemNavbarProps {
  breadcrumb?: string;
}

export function DesignSystemNavbar({ breadcrumb = 'Dashboard' }: DesignSystemNavbarProps) {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  return (
    <nav className="fixed top-0 left-64 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-10">
      {/* Left side - Breadcrumb */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-600">{breadcrumb}</span>
      </div>

      {/* Right side - Company name, Token balance, User info, Logout */}
      <div className="flex items-center gap-4">
        <span className="text-lg font-bold text-blue-600">SaaSOPE</span>
        
        <NavbarTokenBalance />

        <div className="flex items-center gap-2 text-sm text-slate-700">
          <User className="h-5 w-5" />
          <span className="font-medium">
            {user?.firstName} {user?.lastName}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="gap-2 text-sm"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </nav>
  );
}

