import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api, setAdminSession } from '../api/client';
import { TruBrandLogo } from '../components/TruBrandLogo';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@sekolah.sch.id');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.adminLogin(email.trim(), password);
      setAdminSession(res.data.token, res.data.user);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Gagal masuk. Periksa kembali email dan kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Ornamen Geometris Merah Solid */}
      <svg
        viewBox="0 0 1200 800"
        fill="none"
        preserveAspectRatio="none"
        className="fixed inset-0 w-full h-full pointer-events-none opacity-85"
      >
        <polygon points="0,120 640,480 0,760" fill="#E11D23" fillOpacity="0.22" />
        <circle
          cx="960"
          cy="240"
          r="150"
          stroke="#E11D23"
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />
      </svg>

      <div className="w-full max-w-md relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#A3A3A3] hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Halaman Voting
        </Link>

        <div className="glass-card rounded-3xl p-7 sm:p-8">
          <TruBrandLogo size="md" />

          <div className="mt-6">
            <h1 className="text-2xl font-extrabold text-white">
              LOGIN <span className="text-[#E11D23]">ADMIN</span>
            </h1>
            <p className="text-xs text-[#A3A3A3] mt-1">
              Masuk untuk mengelola data guru, kategori, statistik, dan poster pemenang.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#D4D4D4] mb-1.5">
                Email Admin
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8C8C8C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/25 text-white text-sm font-medium focus:outline-none focus:border-[#E11D23]"
                  placeholder="admin@sekolah.sch.id"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#D4D4D4] mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8C8C8C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/25 text-white text-sm font-medium focus:outline-none focus:border-[#E11D23]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C8C8C] hover:text-white cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-[#E11D23]/20 border border-[#E11D23] px-4 py-3 text-xs font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D23]" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#E11D23] hover:bg-[#c8181e] text-white text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>{loading ? 'Memproses...' : 'Masuk Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
