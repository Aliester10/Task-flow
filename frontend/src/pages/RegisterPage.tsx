import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { Spinner } from '../components/ui/Spinner';

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Password tidak sama',
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

const RegisterPage: React.FC = () => {
  const { register: registerUser, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      await registerUser(data.name, data.email, data.password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Registrasi gagal. Coba lagi.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#FFFDF5] relative overflow-hidden">
      {/* Decorative shapes */}
      <div className="absolute top-10 left-10 w-16 h-16 rounded-full border-3 border-gray-900 bg-neo-pink"
           style={{ boxShadow: '4px 4px 0px 0px #1a1a1a' }} />
      <div className="absolute top-32 right-20 w-10 h-10 border-3 border-gray-900 bg-neo-lime rotate-12"
           style={{ boxShadow: '3px 3px 0px 0px #1a1a1a' }} />
      <div className="absolute bottom-16 left-24 w-12 h-12 border-3 border-gray-900 bg-neo-blue rotate-[-8deg]"
           style={{ boxShadow: '3px 3px 0px 0px #1a1a1a' }} />
      <div className="absolute bottom-32 right-16 w-8 h-8 rounded-full border-3 border-gray-900 bg-neo-yellow"
           style={{ boxShadow: '2px 2px 0px 0px #1a1a1a' }} />

      <div className="w-full max-w-[420px] animate-fade-in relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-neo border-3 border-gray-900 flex items-center justify-center overflow-hidden"
               style={{ boxShadow: '3px 3px 0px 0px #1a1a1a' }}>
            <img src="/logo.svg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-gray-900 text-lg">TaskFlow</span>
        </div>

        <div className="mb-7">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Buat akun baru</h2>
          <p className="text-sm text-gray-500 font-medium">Gratis selamanya untuk tim kecil</p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-neo-red/10 border-3 border-neo-red text-neo-red text-sm rounded-neo p-3.5 mb-5 font-bold" role="alert"
               style={{ boxShadow: '3px 3px 0px 0px #FF4444' }}>
            <div className="w-2 h-2 rounded-full bg-neo-red flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="card p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">Nama Lengkap</label>
              <input id="name" {...register('name')} className="input" placeholder="Budi Santoso" autoComplete="name" autoFocus />
              {errors.name && <p className="text-xs text-neo-red mt-1.5 font-bold">{errors.name.message}</p>}
            </div>

            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" {...register('email')} className="input" placeholder="nama@email.com" autoComplete="email" />
              {errors.email && <p className="text-xs text-neo-red mt-1.5 font-bold">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  {...register('password')}
                  className="input pr-10"
                  placeholder="Min. 6 karakter"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-neo-red mt-1.5 font-bold">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label" htmlFor="confirmPassword">Konfirmasi Password</label>
              <input id="confirmPassword" type="password" {...register('confirmPassword')}
                className="input" placeholder="Ulangi password" autoComplete="new-password" />
              {errors.confirmPassword && <p className="text-xs text-neo-red mt-1.5 font-bold">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" className="btn-md btn-primary w-full justify-center mt-1" disabled={isLoading}>
              {isLoading ? <><Spinner size="sm" /> Mendaftar...</> : <>Buat Akun <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5 font-medium">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-gray-900 font-bold hover:bg-neo-yellow px-1 transition-colors border-b-2 border-gray-900">Masuk</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
