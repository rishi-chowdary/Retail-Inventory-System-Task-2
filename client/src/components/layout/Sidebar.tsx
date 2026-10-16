'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Layers,
  AlertTriangle,
  ShoppingCart,
  Receipt,
  BarChart3
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Products', href: '/products', icon: Package },
    { label: 'Inventory & Stock', href: '/inventory', icon: Layers },
    { label: 'Low-Stock Alerts', href: '/inventory/low-stock', icon: AlertTriangle },
    { label: 'Point of Sale', href: '/sales/new', icon: ShoppingCart },
    { label: 'Sales History', href: '/sales', icon: Receipt },
    { label: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Navigation
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && (item.href !== '/inventory' || pathname === '/inventory'));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-primary-600/15 text-primary-400 border border-primary-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon size={17} className={isActive ? 'text-primary-400' : 'text-slate-400'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
        <p className="text-[11px] font-semibold text-slate-300">RetailPulse v1.0</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Mongoose Replica Set & Atomic POS</p>
      </div>
    </aside>
  );
};
