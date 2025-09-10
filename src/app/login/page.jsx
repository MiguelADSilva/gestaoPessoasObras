'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  // Credenciais de teste (opcional)
  const testCredentials = [
    { email: 'miguel@email.com', password: 'miguel123' },
    { email: 'fabio@gmail.com', password: 'fabio123' },
    { email: 'teste@teste.pt', password: 'teste123' },
    { email: 'demo@demo.pt', password: 'demo123' },
  ];

  // Limpar mensagens após 5s
  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  // Helpers
  const setCookie = (name, value, days = 7) => {
    try {
      const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `${name}=${encodeURIComponent(value)}; Expires=${expires}; Path=/; SameSite=Lax`;
    } catch {}
  };

  const clearCookie = (name) => {
    try {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    } catch {}
  };

  const persistAuth = (token, user, remember) => {
    // Normaliza o user pra garantir nome/tipo presentes
    const safeUser = {
      _id: user?._id || user?.id || null,
      nome: user?.nome || user?.name || user?.displayName || user?.email || '',
      email: user?.email || '',
      tipo: (user?.tipo || user?.role || 'cliente').toLowerCase(),
      estado: user?.estado || 'ativo',
      avatar: user?.avatar || null,
      createdAt: user?.createdAt || null,
      updatedAt: user?.updatedAt || null,
    };

    if (remember) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(safeUser));
      // cookie com o token (opcional, ajuda em chamadas server-side no futuro)
      setCookie('token', token, 7);
    } else {
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(safeUser));
      // para sessão, não persistimos cookie longo
      clearCookie('token');
    }
  };

  // Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: (formData.email || '').trim(),
          password: formData.password || '',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'Erro no login. Verifique as suas credenciais.');
        return;
      }

      // Esperado do backend: { user: {...}, token: '...' }
      const token = data?.token;
      const user = data?.user;

      if (!token || !user) {
        setError('Resposta do servidor incompleta. Tente novamente.');
        return;
      }

      // GUARDA: token + (nome, tipo, etc)
      persistAuth(token, user, rememberMe);

      setSuccess('Login bem-sucedido! A redirecionar...');
      setTimeout(() => router.push('/homepage'), 800);
    } catch (err) {
      console.error('Erro no login:', err);
      setError('Erro de ligação ao servidor. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillTestCredentials = (email, password) => {
    setFormData({ email, password });
    setError('');
    setSuccess('Credenciais preenchidas! Clique em Entrar.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="bg-orange-500 py-4 sm:py-6 px-4 sm:px-6">
          <div className="flex items-center justify-center">
            <div className="bg-white p-2 sm:p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <h2 className="mt-3 sm:mt-4 text-center text-xl sm:text-2xl font-bold text-white">
            Gestão de Pessoal de Obras
          </h2>
          <p className="mt-1 sm:mt-2 text-center text-xs sm:text-sm text-orange-100">
            Acesso restrito à equipa autorizada
          </p>
        </div>

        <div className="py-6 sm:py-8 px-4 sm:px-6">
          {/* Credenciais de Teste */}
          <div className="mb-4 sm:mb-6 bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
            <h3 className="text-xs sm:text-sm font-medium text-blue-800 mb-2">Credenciais de Teste:</h3>
            <div className="space-y-1 sm:space-y-2">
              {testCredentials.map((cred, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => fillTestCredentials(cred.email, cred.password)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline block w-full text-left transition duration-200"
                >
                  {cred.email} / {cred.password}
                </button>
              ))}
              <p className="text-xs text-blue-600 mt-1 sm:mt-2">
                Ou use qualquer email com password "teste"
              </p>
            </div>
          </div>

          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            {/* Sucesso */}
            {success && (
              <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm animate-fade-in">
                <div className="flex items-center">
                  <i className="fas fa-check-circle mr-2"></i>
                  {success}
                </div>
              </div>
            )}

            {/* Erro */}
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm animate-fade-in">
                <div className="flex items-center">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  {error}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-envelope text-gray-400 text-sm"></i>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full pl-10 pr-3 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-300 text-gray-900 placeholder-gray-400 text-sm sm:text-base"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-lock text-gray-400 text-sm"></i>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full pl-10 pr-3 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-300 text-gray-900 placeholder-gray-400 text-sm sm:text-base"
                  placeholder="Sua password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  disabled={isLoading}
                />
                <span className="ml-2 block text-xs sm:text-sm text-gray-700">Lembrar-me</span>
              </label>

              <button
                type="button"
                className="text-xs sm:text-sm font-medium text-orange-600 hover:text-orange-500 transition duration-300"
                onClick={() => setError('Funcionalidade em desenvolvimento')}
              >
                Esqueceu a password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition duration-300 ${
                isLoading ? 'opacity-75 cursor-not-allowed' : 'transform hover:scale-105'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  A processar...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Entrar
                </>
              )}
            </button>
          </form>

          <div className="mt-4 sm:mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="px-2 bg-white text-gray-500">Acesso seguro</span>
              </div>
            </div>

            <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-4">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-50">
                  <i className="fas fa-shield-alt text-blue-500 text-sm sm:text-base"></i>
                </div>
                <p className="mt-1 text-xs text-gray-500">Autenticação segura</p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-green-50">
                  <i className="fas fa-user-lock text-green-500 text-sm sm:text-base"></i>
                </div>
                <p className="mt-1 text-xs text-gray-500">Dados protegidos</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 py-3 sm:py-4 px-4 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            &copy; {new Date().getFullYear()} Sistema de Gestão de Pessoal de Obras
          </p>
          <p className="text-xs text-center text-gray-400 mt-1">
            Modo de demonstração - Use credenciais de teste
          </p>
        </div>
      </div>

      {/* Estilos para animações */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
