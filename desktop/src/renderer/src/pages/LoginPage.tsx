import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../lib/api';
import { useAuthStore, AuthUser } from '../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login(username.trim(), password);
      const { token, user } = res.data;
      login(token, user as AuthUser);

      if (user.role === 'FACTORY') navigate('/factory');
      else if (user.role === 'ADMIN') navigate('/admin');
      else navigate('/branch');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'خطأ في تسجيل الدخول، حاول مرة أخرى';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #F7F1E6 0%, #EDE3CC 100%)' }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10"
          style={{ background: '#D8A027', filter: 'blur(80px)', transform: 'translate(-30%, -30%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10"
          style={{ background: '#3B2615', filter: 'blur(80px)', transform: 'translate(30%, 30%)' }}
        />
      </div>

      <div className="relative w-full max-w-md mx-4">
        {/* Card */}
        <div
          className="bg-card rounded-3xl shadow-2xl border border-border overflow-hidden"
          style={{ boxShadow: '0 20px 60px rgba(59,38,21,0.15)' }}
        >
          {/* Header */}
          <div
            className="px-8 py-8 text-center"
            style={{ background: 'linear-gradient(135deg, #3B2615 0%, #5C3D1E 100%)' }}
          >
            {/* Logo placeholder */}
            <div className="w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden bg-gold/20 flex items-center justify-center border-2 border-gold/30">
              <img
                src="/logo.png"
                alt="شعار المشالح"
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = `<span style="font-size:2.5rem">👘</span>`;
                }}
              />
            </div>
            <h1 className="text-2xl font-bold text-gold tracking-wide">
              المشالح العربية الخاصة
            </h1>
            <p className="text-gold/60 text-sm mt-1">نظام إدارة الطلبات</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-xl font-bold text-brown-dark mb-6 text-center">
              تسجيل الدخول
            </h2>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="input-label">اسم المستخدم</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field text-lg"
                  placeholder="أدخل اسم المستخدم"
                  autoComplete="username"
                  dir="ltr"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="input-label">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field text-lg pr-12"
                    placeholder="أدخل كلمة المرور"
                    autoComplete="current-password"
                    dir="ltr"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-brown transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary btn-lg w-full mt-2"
                style={{ background: loading ? '#9E8672' : undefined }}
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    جاري التحقق...
                  </span>
                ) : (
                  <span className="flex items-center gap-2 justify-center">
                    <LogIn size={20} />
                    دخول
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-muted text-xs mt-4">
          نظام إدارة المشالح العربية الخاصة — الإصدار 1.0
        </p>
      </div>
    </div>
  );
}
