'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// Componente Login
export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter(); // Use o router do Next.js

  // Credenciais de teste
  const testCredentials = [
    { email: 'admin@obras.pt', password: 'admin123' },
    { email: 'gestor@obras.pt', password: 'gestor123' },
    { email: 'teste@teste.pt', password: 'teste123' },
    { email: 'demo@demo.pt', password: 'demo123' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Simulação de processo de login
    setTimeout(() => {
      // Verificar se é uma credencial de teste
      const isValidTest = testCredentials.some(
        cred => cred.email === formData.email && cred.password === formData.password
      );
      
      if (isValidTest || formData.password === 'teste') {
        console.log('Login bem-sucedido com:', formData.email);
        setIsLoading(false);
        
        // Redirecionar para a homepage após login bem-sucedido
        // USANDO NEXT.JS ROUTING:
        router.push('/homepage');
      } else {
        setIsLoading(false);
        setError('Credenciais inválidas. Use uma das credenciais de teste.');
      }
    }, 1000);
  };

  // Preencher automaticamente com credenciais de teste
  const fillTestCredentials = (email, password) => {
    setFormData({
      email: email,
      password: password
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="bg-orange-500 py-6 px-4 sm:px-6">
          <div className="flex items-center justify-center">
            <div className="bg-white p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <h2 className="mt-4 text-center text-2xl font-bold text-white">
            Gestão de Pessoal de Obras
          </h2>
          <p className="mt-2 text-center text-sm text-orange-100">
            Acesso restrito à equipe autorizada
          </p>
        </div>
        
        <div className="py-8 px-6 sm:px-8">
          {/* Credenciais de teste para facilitar */}
          <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Credenciais de Teste:</h3>
            <div className="space-y-2">
              {testCredentials.map((cred, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => fillTestCredentials(cred.email, cred.password)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline block w-full text-left"
                >
                  {cred.email} / {cred.password}
                </button>
              ))}
              <p className="text-xs text-blue-600 mt-2">
                Ou use qualquer email com password "teste"
              </p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-envelope text-gray-400"></i>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-300 text-gray-900 placeholder-gray-400"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-lock text-gray-400"></i>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-300 text-gray-900 placeholder-gray-400"
                  placeholder="Sua password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Lembrar-me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-orange-600 hover:text-orange-500 transition duration-300">
                  Esqueceu a password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition duration-300 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    A processar...
                  </>
                ) : 'Entrar'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Acesso seguro
                </span>
              </div>
            </div>
            
            <div className="mt-4 flex justify-center space-x-4">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-50">
                  <i className="fas fa-shield-alt text-blue-500 text-xl"></i>
                </div>
                <p className="mt-2 text-xs text-gray-500">Autenticação segura</p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-50">
                  <i className="fas fa-user-lock text-green-500 text-xl"></i>
                </div>
                <p className="mt-2 text-xs text-gray-500">Dados protegidos</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 py-4 px-4 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            &copy; {new Date().getFullYear()} Sistema de Gestão de Pessoal de Obras. Todos os direitos reservados.
          </p>
          <p className="text-xs text-center text-gray-400 mt-1">
            Modo de demonstração - Use qualquer credencial de teste
          </p>
        </div>
      </div>
    </div>
  );
}