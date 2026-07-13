import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { Spinner } from '../components/ui/Spinner';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});
type FormData = z.infer<typeof schema>;

const FEATURES = [
  'Kanban board dengan drag & drop',
  'Sprint planning & backlog management',
  'Notifikasi real-time',
  'Progress tracking per project',
];

const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Email atau password salah.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding (neobrutalism) */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col bg-neo-yellow relative overflow-hidden flex-shrink-0 border-r-3 border-gray-900">
        {/* Decorative shapes */}
        <div className="absolute top-12 right-12 w-20 h-20 rounded-full border-3 border-gray-900 bg-neo-pink"
             style={{ boxShadow: '4px 4px 0px 0px #1a1a1a' }} />
        <div className="absolute top-40 right-32 w-10 h-10 border-3 border-gray-900 bg-neo-lime rotate-12"
             style={{ boxShadow: '3px 3px 0px 0px #1a1a1a' }} />
        <div className="absolute bottom-20 left-8 w-14 h-14 rounded-full border-3 border-gray-900 bg-neo-blue"
             style={{ boxShadow: '4px 4px 0px 0px #1a1a1a' }} />
        <div className="absolute bottom-40 right-10 w-8 h-8 border-3 border-gray-900 bg-neo-orange rotate-45"
             style={{ boxShadow: '2px 2px 0px 0px #1a1a1a' }} />

        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-neo border-3 border-gray-900 flex items-center justify-center overflow-hidden"
                 style={{ boxShadow: '3px 3px 0px 0px #1a1a1a' }}>
              <img src="/logo.svg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-gray-900 text-xl">TaskFlow</span>
          </div>

          {/* Hero text */}
          <div className="py-16">
            <div className="inline-flex items-center gap-2 bg-white border-3 border-gray-900 rounded-neo px-4 py-2 mb-6"
                 style={{ boxShadow: '3px 3px 0px 0px #1a1a1a' }}>
              <span className="w-2 h-2 rounded-full bg-neo-lime border-2 border-gray-900" />
              <span className="text-xs text-gray-900 font-bold">Project Management Tool</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-gray-900 leading-tight mb-4">
              Kelola proyek<br />
              <span className="bg-neo-pink px-2 border-3 border-gray-900 inline-block rotate-[-1deg]"
                    style={{ boxShadow: '3px 3px 0px 0px #1a1a1a' }}>
                lebih efisien.
              </span>
            </h1>
            <p className="text-gray-800 text-base leading-relaxed mb-8 max-w-sm font-medium">
              Satu platform untuk tim kecil, freelancer, dan mahasiswa yang ingin mengatur proyek dengan lebih terstruktur.
            </p>
            <div className="space-y-3">
              {FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded border-2 border-gray-900 bg-neo-lime flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-gray-900" />
                  </div>
                  <span className="text-sm text-gray-900 font-medium">{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Demo hint */}
          <div className="bg-white border-3 border-gray-900 rounded-neo p-4"
               style={{ boxShadow: '4px 4px 0px 0px #1a1a1a' }}>
            <p className="text-xs text-gray-500 mb-1.5 font-bold uppercase tracking-wide">Demo Account</p>
            <p className="text-sm text-gray-900 font-mono font-bold">owner@taskflow.com</p>
            <p className="text-sm text-gray-500 font-mono">password123</p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#FFFDF5]">
        <div className="w-full max-w-[400px] animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-neo border-3 border-gray-900 flex items-center justify-center overflow-hidden"
                 style={{ boxShadow: '3px 3px 0px 0px #1a1a1a' }}>
              <img src="/logo.svg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-gray-900 text-lg">TaskFlow</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Selamat datang kembali</h2>
            <p className="text-sm text-gray-500 font-medium">Masuk ke akun TaskFlow Anda</p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 bg-neo-red/10 border-3 border-neo-red text-neo-red text-sm rounded-neo p-3.5 mb-5 font-bold" role="alert"
                 style={{ boxShadow: '3px 3px 0px 0px #FF4444' }}>
              <div className="w-2 h-2 rounded-full bg-neo-red flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="input"
                placeholder="nama@email.com"
                autoComplete="email"
                autoFocus
              />
              {errors.email && <p className="text-xs text-neo-red mt-1.5 font-bold">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0" htmlFor="password">Password</label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  {...register('password')}
                  className="input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-neo-red mt-1.5 font-bold">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              className="btn-md btn-primary w-full mt-2 justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Spinner size="sm" /> Masuk...</>
              ) : (
                <>Masuk <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6 font-medium">
            Belum punya akun?{' '}
            <Link to="/register" className="text-gray-900 font-bold hover:bg-neo-yellow px-1 transition-colors border-b-2 border-gray-900">
              Daftar gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
