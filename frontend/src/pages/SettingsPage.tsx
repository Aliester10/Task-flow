import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Check, Camera, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { authService } from '../services/auth.service';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';

const profileSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  avatarUrl: z.string().url('URL tidak valid').optional().or(z.literal('')),
});
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Password lama wajib diisi'),
  password: z.string().min(6, 'Min. 6 karakter'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Password tidak sama', path: ['confirmPassword'] });

type ProfileData = z.infer<typeof profileSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

const SettingsPage: React.FC = () => {
  const { user, updateUser, logout } = useAuthStore();
  const [profileOk, setProfileOk] = useState(false);
  const [passOk, setPassOk] = useState(false);
  const [profileErr, setProfileErr] = useState('');
  const [passErr, setPassErr] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const { register: rP, handleSubmit: hsP, formState: { errors: eP } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', avatarUrl: user?.avatarUrl || '' },
  });
  const { register: rPw, handleSubmit: hsPw, formState: { errors: ePw }, reset: resetPw } = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfile = async (data: ProfileData) => {
    setSavingProfile(true); setProfileErr(''); setProfileOk(false);
    try {
      const updated = await authService.updateProfile({ name: data.name, avatarUrl: data.avatarUrl || null });
      updateUser(updated); setProfileOk(true); setTimeout(() => setProfileOk(false), 3000);
    } catch (err: unknown) {
      setProfileErr((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Gagal menyimpan.');
    } finally { setSavingProfile(false); }
  };

  const onPassword = async (data: PasswordData) => {
    setSavingPass(true); setPassErr(''); setPassOk(false);
    try {
      await authService.updateProfile({ currentPassword: data.currentPassword, password: data.password });
      setPassOk(true); resetPw(); setTimeout(() => setPassOk(false), 3000);
    } catch (err: unknown) {
      setPassErr((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Gagal mengubah password.');
    } finally { setSavingPass(false); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Pengaturan Akun</h1>
        <p className="text-sm text-gray-500 mt-0.5 font-medium">Kelola profil dan keamanan akun Anda</p>
      </div>

      {/* Profile Card */}
      <div className="card mb-5 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b-3 border-gray-900 bg-neo-blue/30">
          <div className="w-8 h-8 rounded-neo bg-neo-blue border-2 border-gray-900 flex items-center justify-center"
               style={{ boxShadow: '2px 2px 0px 0px #1a1a1a' }}>
            <User className="w-4 h-4 text-gray-900" />
          </div>
          <h2 className="text-sm font-bold text-gray-900">Profil</h2>
        </div>

        <div className="p-6">
          {/* Avatar preview */}
          {user && (
            <div className="flex items-center gap-4 mb-6 p-4 rounded-neo bg-neo-cream border-3 border-gray-900"
                 style={{ boxShadow: '3px 3px 0px 0px #1a1a1a' }}>
              <div className="relative">
                <Avatar name={user.name} avatarUrl={user.avatarUrl} size="xl" />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-neo-yellow rounded-neo border-2 border-gray-900 flex items-center justify-center"
                     style={{ boxShadow: '1px 1px 0px 0px #1a1a1a' }}>
                  <Camera className="w-3.5 h-3.5 text-gray-900" />
                </div>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">{user.name}</p>
                <p className="text-sm text-gray-500 font-medium">{user.email}</p>
              </div>
            </div>
          )}

          <form onSubmit={hsP(onProfile)} className="space-y-4">
            <div>
              <label className="label" htmlFor="set-name">Nama Lengkap</label>
              <input id="set-name" {...rP('name')} className="input" />
              {eP.name && <p className="text-xs text-neo-red mt-1.5 font-bold">{eP.name.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="set-avatar">
                URL Avatar <span className="text-gray-400 normal-case font-normal">(opsional)</span>
              </label>
              <input id="set-avatar" {...rP('avatarUrl')} className="input" placeholder="https://example.com/photo.jpg" />
              {eP.avatarUrl && <p className="text-xs text-neo-red mt-1.5 font-bold">{eP.avatarUrl.message}</p>}
            </div>
            {profileErr && <p className="text-xs text-neo-red font-bold">{profileErr}</p>}
            <button type="submit" className="btn-sm btn-primary" disabled={savingProfile}>
              {savingProfile ? <Spinner size="sm" /> : profileOk ? <><Check className="w-3.5 h-3.5" /> Tersimpan</> : 'Simpan Profil'}
            </button>
          </form>
        </div>
      </div>

      {/* Password Card */}
      <div className="card mb-5 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b-3 border-gray-900 bg-neo-yellow/30">
          <div className="w-8 h-8 rounded-neo bg-neo-yellow border-2 border-gray-900 flex items-center justify-center"
               style={{ boxShadow: '2px 2px 0px 0px #1a1a1a' }}>
            <Lock className="w-4 h-4 text-gray-900" />
          </div>
          <h2 className="text-sm font-bold text-gray-900">Ubah Password</h2>
        </div>
        <div className="p-6">
          <form onSubmit={hsPw(onPassword)} className="space-y-4">
            <div>
              <label className="label" htmlFor="cur-pass">Password Lama</label>
              <input id="cur-pass" type="password" {...rPw('currentPassword')} className="input" autoComplete="current-password" />
              {ePw.currentPassword && <p className="text-xs text-neo-red mt-1.5 font-bold">{ePw.currentPassword.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="new-pass">Password Baru</label>
                <input id="new-pass" type="password" {...rPw('password')} className="input" placeholder="Min. 6 karakter" autoComplete="new-password" />
                {ePw.password && <p className="text-xs text-neo-red mt-1.5 font-bold">{ePw.password.message}</p>}
              </div>
              <div>
                <label className="label" htmlFor="conf-pass">Konfirmasi</label>
                <input id="conf-pass" type="password" {...rPw('confirmPassword')} className="input" autoComplete="new-password" />
                {ePw.confirmPassword && <p className="text-xs text-neo-red mt-1.5 font-bold">{ePw.confirmPassword.message}</p>}
              </div>
            </div>
            {passErr && <p className="text-xs text-neo-red font-bold">{passErr}</p>}
            <button type="submit" className="btn-sm btn-primary" disabled={savingPass}>
              {savingPass ? <Spinner size="sm" /> : passOk ? <><Check className="w-3.5 h-3.5" /> Diubah</> : 'Ubah Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card overflow-hidden border-neo-red">
        <div className="flex items-center gap-3 px-6 py-4 border-b-3 border-neo-red bg-neo-red/10">
          <h2 className="text-sm font-bold text-neo-red">Danger Zone</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">Logout dari semua perangkat</p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Sesi aktif akan dihentikan</p>
            </div>
            <button onClick={logout} className="btn-sm btn-danger gap-1.5">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
