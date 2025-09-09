// src/app/homepage/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Dashboard atualizado para mostrar nome + role do utilizador
 * e contar colaboradores. Fontes do user:
 * 1) localStorage('user') -> { nome, tipo }
 * 2) GET /api/users/me -> { nome, tipo }
 * 3) Fallback: decodifica JWT (email, tipo)
 */

export default function Homepage() {
  const router = useRouter();

  // ======== STATE ========
  const [userName, setUserName] = useState('Utilizador');
  const [role, setRole] = useState('cliente'); // 'admin' | 'gestor' | 'tecnico' | 'cliente'
  const [activePage, setActivePage] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(false);
  const [colaboradoresCount, setColaboradoresCount] = useState(null);
  const [loadingCounts, setLoadingCounts] = useState(true);

  // ======== HELPERS ========
  const getToken = () => {
    if (typeof window === 'undefined') return null;
    const fromLocal = localStorage.getItem('token');
    if (fromLocal) return fromLocal;
    const m = document.cookie.match(/(?:^|; )token=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : null;
  };

  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  const deleteCookie = (name) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
  };

  const secureLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch (_) {
      // ignora
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      deleteCookie('token');
      deleteCookie('refreshToken');
      router.push('/');
    }
  }, [router]);

  // ======== RESPONSIVIDADE ========
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // ======== BOOTSTRAP USER + CONTAGEM ========
  useEffect(() => {
    const bootstrap = async () => {
      const token = getToken();

      // 1) Tentar user do localStorage (render rápido)
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (raw) {
          const u = JSON.parse(raw);
          if (u?.nome) setUserName(u.nome);
          if (u?.tipo) setRole(String(u.tipo).toLowerCase());
        }
      } catch {}

      // 2) Buscar /api/users/me
      try {
        const meRes = await fetch('/api/users/me', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });

        if (!meRes.ok) {
          console.warn('Falha ao buscar /api/users/me:', meRes.status, meRes.statusText);
          // 3) Fallback: decodificar JWT para pelo menos obter email/tipo
          if (token) {
            const payload = parseJwt(token);
            if (payload?.email && (!userName || userName === 'Utilizador')) setUserName(payload.email);
            if (payload?.tipo) setRole(String(payload.tipo).toLowerCase());
          }
        } else {
          const me = await meRes.json();
          if (me?.nome) setUserName(me.nome);
          if (me?.tipo) setRole(String(me.tipo).toLowerCase());
          if (typeof window !== 'undefined') localStorage.setItem('user', JSON.stringify(me));
        }
      } catch (err) {
        console.error('Erro na chamada a /api/users/me:', err);
        if (token) {
          const payload = parseJwt(token);
          if (payload?.email && (!userName || userName === 'Utilizador')) setUserName(payload.email);
          if (payload?.tipo) setRole(String(payload.tipo).toLowerCase());
        }
      }

      // 4) Contagem de colaboradores
      try {
        const countRes = await fetch('/api/colaboradores/count', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });

        if (!countRes.ok) {
          console.warn('Falha ao buscar colaboradores:', countRes.status, countRes.statusText);
          setColaboradoresCount(0);
        } else {
          const data = await countRes.json();
          setColaboradoresCount(typeof data?.count === 'number' ? data.count : 0);
        }
      } catch (err) {
        console.error('Erro na chamada a /api/colaboradores/count:', err);
        setColaboradoresCount(0);
      } finally {
        setLoadingCounts(false);
      }
    };

    bootstrap();
  }, []); // <-- um único useEffect, sem aninhar outro

  // ======== NAV ========
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-home', path: '/homepage' },
    { id: 'obras', label: 'Obras', icon: 'fas fa-hard-hat', path: '/obras' },
    { id: 'colaboradores', label: 'Colaboradores', icon: 'fas fa-users', path: '/colaboradores' },
    { id: 'anotacoes', label: 'Anotações', icon: 'fas fa-sticky-note', path: '/anotacoes' },
    { id: 'planeamento', label: 'Planeamento', icon: 'fas fa-calendar-alt', path: '/planeamento' },
  ];

  const filteredNavItems = role === 'admin' ? navItems : navItems.filter((i) => i.id !== 'colaboradores');

  // ======== CONTEÚDO ========
  const renderPageContent = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <div className="p-6 pb-24 lg:pb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Obras Ativas */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="bg-blue-100 p-3 rounded-lg inline-block mb-4">
                  <i className="fas fa-hard-hat text-blue-500 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Obras Ativas</h3>
                <p className="text-3xl font-bold text-blue-600">12</p>
                <p className="text-gray-600 text-sm mt-2">+2 desde a última semana</p>
              </div>

              {/* Colaboradores (dinâmico) */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="bg-green-100 p-3 rounded-lg inline-block mb-4">
                  <i className="fas fa-users text-green-500 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Colaboradores</h3>
                <p className="text-3xl font-bold text-green-600">{loadingCounts ? '—' : colaboradoresCount}</p>
                <p className="text-gray-600 text-sm mt-2">Total registado na conta</p>
              </div>

              {/* Tarefas */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="bg-orange-100 p-3 rounded-lg inline-block mb-4">
                  <i className="fas fa-tasks text-orange-500 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Tarefas Pendentes</h3>
                <p className="text-3xl font-bold text-orange-600">8</p>
                <p className="text-gray-600 text-sm mt-2">3 com alta prioridade</p>
              </div>
            </div>

            <div className="mt-8 bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Últimas Atividades</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-blue-100 p-2 rounded-full mr-4">
                    <i className="fas fa-plus text-blue-500"></i>
                  </div>
                  <div>
                    <p className="font-medium">Nova obra adicionada</p>
                    <p className="text-gray-600 text-sm">Residencial Sol Nascente - há 2 horas</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-green-100 p-2 rounded-full mr-4">
                    <i className="fas fa-user-plus text-green-500"></i>
                  </div>
                  <div>
                    <p className="font-medium">Novo colaborador registado</p>
                    <p className="text-gray-600 text-sm">Carlos Silva - há 1 dia</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-orange-100 p-2 rounded-full mr-4">
                    <i className="fas fa-sticky-note text-orange-500"></i>
                  </div>
                  <div>
                    <p className="font-medium">Nova anotação adicionada</p>
                    <p className="text-gray-600 text-sm">Obra Centro Comercial - há 2 dias</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'obras':
        return (
          <div className="p-6 pb-24 lg:pb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Gestão de Obras</h2>
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Lista de Obras</h3>
                <button className="mt-4 sm:mt-0 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition duration-300 flex items-center">
                  <i className="fas fa-plus mr-2"></i> Nova Obra
                </button>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Localização</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-4 whitespace-nowrap">Residencial Sol Nascente</td>
                      <td className="px-4 py-4 whitespace-nowrap">Lisboa</td>
                      <td className="px-4 py-4 whitespace-nowrap"><span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Em Progresso</span></td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button className="text-blue-500 hover:text-blue-700 mr-3"><i className="fas fa-edit"></i></button>
                        <button className="text-red-500 hover:text-red-700"><i className="fas fa-trash"></i></button>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-4 whitespace-nowrap">Centro Comercial Atlântico</td>
                      <td className="px-4 py-4 whitespace-nowrap">Porto</td>
                      <td className="px-4 py-4 whitespace-nowrap"><span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Planeamento</span></td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button className="text-blue-500 hover:text-blue-700 mr-3"><i className="fas fa-edit"></i></button>
                        <button className="text-red-500 hover:text-red-700"><i className="fas fa-trash"></i></button>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-4 whitespace-nowrap">Hotel Costa Verde</td>
                      <td className="px-4 py-4 whitespace-nowrap">Aveiro</td>
                      <td className="px-4 py-4 whitespace-nowrap"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Concluído</span></td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button className="text-blue-500 hover:text-blue-700 mr-3"><i className="fas fa-edit"></i></button>
                        <button className="text-red-500 hover:text-red-700"><i className="fas fa-trash"></i></button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'colaboradores':
        return (
          <div className="p-6 pb-24 lg:pb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Gestão de Colaboradores</h2>
            <div className="bg-white rounded-xl shadow-md p-6">
              <p className="text-gray-600">Página de administração de colaboradores (acesso restrito a administradores).</p>
            </div>
          </div>
        );

      case 'anotacoes':
        return (
          <div className="p-6 pb-24 lg:pb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Anotações</h2>
            <div className="bg-white rounded-xl shadow-md p-6">
              <p className="text-gray-600">Página de gestão de anotações por obra.</p>
            </div>
          </div>
        );

      case 'planeamento':
        return (
          <div className="p-6 pb-24 lg:pb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Planeamento</h2>
            <div className="bg-white rounded-xl shadow-md p-6">
              <p className="text-gray-600">Página de planeamento de obras e recursos.</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-6 pb-24 lg:pb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
            <div className="bg-white rounded-xl shadow-md p-6">
              <p className="text-gray-600">Selecione uma opção no menu para começar.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          {/* Identidade: apenas nome + role em negrito */}
          <div className="flex items-center">
            <div className="bg-orange-500 p-2 rounded-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="leading-tight">
              <p className="text-sm text-gray-700">{userName}</p>
              <p className="text-xs text-gray-500">
                <span className="font-bold uppercase">{role}</span>
              </p>
            </div>
          </div>

          {/* Ações: Configurações + Sair */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/settings')}
              className="hidden sm:inline-flex items-center bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-md transition duration-200"
              aria-label="Configurações"
              title="Configurações"
            >
              <i className="fas fa-cog mr-2"></i>
              <span className="text-sm">Configurações</span>
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="inline-flex sm:hidden items-center justify-center w-10 h-10 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
              aria-label="Configurações"
              title="Configurações"
            >
              <i className="fas fa-cog"></i>
            </button>
            <button
              onClick={secureLogout}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition duration-300 flex items-center"
            >
              <i className="fas fa-sign-out-alt mr-2"></i>
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop Navigation */}
        {!isMobile && (
          <nav className="w-64 bg-white shadow-md hidden lg:block">
            <div className="p-4">
              <ul className="space-y-2">
                {filteredNavItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => setActivePage(item.id)}
                      className={`w-full flex items-center px-4 py-3 rounded-md transition duration-300 ${activePage === item.id ? 'bg-orange-100 text-orange-700' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      <i className={`${item.icon} mr-3 w-5 text-center`}></i>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {renderPageContent()}
        </main>
      </div>

      {/* Mobile Navigation Footer */}
      {isMobile && (
        <footer className="bg-white border-t border-gray-200 py-2 px-4 fixed bottom-0 w-full shadow-lg z-20">
          <nav>
            <ul className="flex justify-around">
              {filteredNavItems.map((item) => (
                <li key={item.id} className="flex-1">
                  <button
                    onClick={() => setActivePage(item.id)}
                    className={`flex flex-col items-center py-2 px-1 rounded-md transition duration-300 ${activePage === item.id ? 'text-orange-600' : 'text-gray-600'}`}
                  >
                    <i className={`${item.icon} text-lg mb-1`}></i>
                    <span className="text-xs">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </footer>
      )}
    </div>
  );
}
