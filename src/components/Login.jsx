import React, { useState, useEffect } from 'react';
import { loginWithEmail as doLoginV2, isAuthenticated, getCurrentUser, setupAdmin, changePassword } from '../supabase-auth';

function Login({ onLoginComplete }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  
  const [loading, setLoading] = useState(false);
  const [showAdminSetup, setShowAdminSetup] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [adminMsg, setAdminMsg] = useState('');
  const [showChangePass, setShowChangePass] = useState(null); // Disabled - only admin can change
  const [changePassEmail, setChangePassEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [changePassCode, setChangePassCode] = useState('');
  const [changePassMsg, setChangePassMsg] = useState('');

  useEffect(() => {
    // Check for existing valid session
    if (isAuthenticated()) {
      const user = getCurrentUser()
      if (user && onLoginComplete) {
        localStorage.setItem('supabaseUser', JSON.stringify(user))
        onLoginComplete()
      }
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await doLoginV2(email, password)
      
      if (!result.success) {
        setError(result.error || 'Credenciales incorrectas');
        setLoading(false);
        return;
      }
      
      // Store user data in localStorage for App.jsx to read
      localStorage.setItem('supabaseUser', JSON.stringify(result.user))
      
      // Trigger login complete
      if (onLoginComplete) onLoginComplete();
      
    } catch (err) {
      console.error(err);
      setError('Credenciales incorrectas o usuario no encontrado.');
    }
    setLoading(false);
  };

  const handleAdminSetup = async (e) => {
    e.preventDefault();
    if (!adminEmail || !secretCode) {
      setAdminMsg('Completa todos los campos');
      return;
    }
    setLoading(true);
    const result = await setupAdmin(adminEmail, secretCode);
    setAdminMsg(result.message || result.error);
    setLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!changePassEmail || !newPass || !changePassCode) {
      setChangePassMsg('Completa todos los campos');
      return;
    }
    setLoading(true);
    const result = await changePassword(changePassEmail, newPass, changePassCode);
    setChangePassMsg(result.message || result.error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden px-4">
      
      {/* Background Decorators */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md surface-workbench border border-white/10 rounded-3xl p-8 relative z-10 shadow-2xl">
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-[0_0_25px_rgba(255,146,56,0.3)] mb-6">
            <img src="/images/logo_nando.jpg" alt="Nando" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-headline font-black tracking-tight text-on-surface uppercase text-center">Vulcanizadora<br/><span className="text-primary text-xl">Nando</span></h1>
          <p className="text-slate-400 mt-2 text-sm text-center">Plataforma Administrativa Multi-Sucursal</p>
        </div>

        {error && (
          <div className="bg-error-container/20 border border-error text-error text-sm font-bold p-4 rounded-xl mb-6 text-center animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase font-black tracking-widest text-slate-500">Correo Electrónico</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full input-industrial pl-12 py-4 text-sm"
                placeholder="admin@vnando.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase font-black tracking-widest text-slate-500">Contraseña</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full input-industrial pl-12 py-4 text-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(255,146,56,0.2)] flex justify-center items-center gap-2 ${loading ? 'bg-surface-container-highest text-slate-500 cursor-not-allowed border border-white/5' : 'btn-primary hover:shadow-[0_0_25px_rgba(255,146,56,0.5)]'}`}
          >
            {loading ? 'Verificando...' : 'Acceder al Sistema'}
            {!loading && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Soporte Técnico de Sistema</p>
          <p className="text-xs text-slate-400">¿Problemas para entrar? Contacta al administrador general.</p>
          <button
            type="button"
            onClick={() => setShowAdminSetup(!showAdminSetup)}
            className="text-[10px] text-slate-600 mt-2 underline"
          >
            {showAdminSetup ? 'Ocultar' : '¿Eres admin?'}
          </button>
        </div>

        {showAdminSetup && (
          <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-white/10">
            <p className="text-xs text-slate-400 mb-3">Configurar Administrador</p>
            <form onSubmit={handleAdminSetup} className="space-y-2">
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full input-industrial py-2 text-xs"
                placeholder="Tu correo"
              />
              <input
                type="password"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                className="w-full input-industrial py-2 text-xs"
                placeholder="Código secreto"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-primary/20 text-primary text-xs font-bold rounded-lg"
              >
                Activar Admin
              </button>
              {adminMsg && (
                <p className={`text-xs text-center ${adminMsg.includes('inválido') ? 'text-error' : 'text-green-400'}`}>
                  {adminMsg}
                </p>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;