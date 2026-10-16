'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { ShoppingCart, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { Button } from '../ui/Button';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
            RP
          </div>
          <span className="font-bold text-lg text-slate-100 tracking-tight">RetailPulse</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/sales/new">
          <Button size="sm" variant="primary" className="gap-2">
            <ShoppingCart size={15} />
            <span>New Sale</span>
          </Button>
        </Link>

        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700">
                <UserIcon size={16} />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-medium text-slate-200 leading-tight">{user.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield size={10} className={user.role === 'Admin' ? 'text-indigo-400' : 'text-emerald-400'} />
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-400 p-2"
            >
              <LogOut size={16} />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
