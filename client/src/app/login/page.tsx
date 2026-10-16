'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { ShieldCheck, UserCheck, Lock } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@demo.com',
      password: 'Admin@123'
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setErrorMessage(null);
      setIsSubmitting(true);
      await login(data.email, data.password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setDemoCredentials = (role: 'Admin' | 'Staff') => {
    if (role === 'Admin') {
      setValue('email', 'admin@demo.com');
      setValue('password', 'Admin@123');
    } else {
      setValue('email', 'staff@demo.com');
      setValue('password', 'Staff@123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-background to-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-600 text-white font-black text-xl shadow-lg shadow-indigo-500/25 mb-1">
            RP
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">RetailPulse System</h1>
          <p className="text-xs text-slate-400">Inventory & Sales Management System</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
          {errorMessage && (
            <Alert
              type="error"
              message={errorMessage}
              onDismiss={() => setErrorMessage(null)}
            />
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. admin@demo.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 mt-2"
              isLoading={isSubmitting}
            >
              Sign In to Terminal
            </Button>
          </form>

          {/* Demo Credentials Quick-Select Section */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">
              Demo Credentials Hint
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDemoCredentials('Admin')}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800/80 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
                  <ShieldCheck size={14} />
                  <span>Admin</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">admin@demo.com</p>
                <p className="text-[10px] text-slate-500 font-mono">Admin@123</p>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('Staff')}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800/80 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <UserCheck size={14} />
                  <span>Staff</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">staff@demo.com</p>
                <p className="text-[10px] text-slate-500 font-mono">Staff@123</p>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <Lock size={12} />
          <span>Server-enforced role authorization & bcrypt encryption</span>
        </p>
      </div>
    </div>
  );
}
