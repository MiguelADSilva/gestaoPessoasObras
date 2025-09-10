'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function Homepage() {
  const router = useRouter();

  // ========= AUTH / UI BASE =========
  const [userName, setUserName] = useState('Utilizador');
  const [role, setRole] = useState('cliente'); // admin | gestor | tecnico | cliente
  const [activePage, setActivePage] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [stats, setStats] = useState({ ativas: 0, concluidas: 0, suspensas: 0 });
const [recentObras, setRecentObras] = useState([]);

  const [colaboradoresCount, setColaboradoresCount] = useState(null);
  const [loadingCounts, setLoadingCounts] = useState(true);

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  // ========= OBRAS =========
  const [obras, setObras] = useState([]);
  const [loadingObras, setLoadingObras] = useState(false);
  const [errorObras, setErrorObras] = useState('');

  // filtros
  const [q, setQ] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [estadoFilter, setEstadoFilter] = useState(''); // '', planeamento, andamento, concluida, suspensa
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  // modais
  const [obraModalOpen, setObraModalOpen] = useState(false); // detalhes
  const [obraFormOpen, setObraFormOpen] = useState(false);   // criar/editar
  const [selectedObra, setSelectedObra] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [savingObra, setSavingObra] = useState(false);

  const emptyForm = {
    nome: '',
    localizacao: '',
    estadoObra: 'planeamento',
    dataInicio: '',
    dataFimPrevista: '',
    orcamentoTotal: '',
    responsavelGeral: '',
    responsavelGeralId: '',   // <=== novo
    tipoObra: 'condominio',
    numeroCasas: 0,
  };
  const [obraForm, setObraForm] = useState(emptyForm);

  // ========= HELPERS =========
  const getToken = () => {
    try {
      if (typeof window === 'undefined') return null;
      const t1 = localStorage.getItem('token');
      if (t1) return t1;
      const t2 = sessionStorage.getItem('token');
      if (t2) return t2;
      const m = document.cookie.match(/(?:^|; )token=([^;]*)/);
      return m ? decodeURIComponent(m[1]) : null;
    } catch {
      return null;
    }
  };

  const computeStats = (lista) => {
  const norm = (v) => (v ? String(v).toLowerCase() : '');
  let ativas = 0, concluidas = 0, suspensas = 0;

  for (const o of lista || []) {
    const st = norm(o.estadoObra || o.estado);
    if (st === 'concluida') concluidas++;
    else if (st === 'suspensa') suspensas++;
    else if (st === 'andamento' || st === 'planeamento' || !st) ativas++;
  }
  setStats({ ativas, concluidas, suspensas });
};

  const fetchUsersForResponsavel = async () => {
  setLoadingUsers(true);
  const token = getToken();
  const tryEndpoints = [
    '/api/colaboradores?limit=1000',
    '/api/users?limit=1000',
    '/api/users/list',
  ];

  for (const url of tryEndpoints) {
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      if (!res.ok) continue;

      const data = await res.json();
      // aceitar vários formatos
      const arr = Array.isArray(data) ? data
        : (data?.colaboradores || data?.users || data?.data || []);
      if (!Array.isArray(arr) || arr.length === 0) continue;

      const norm = arr.map((u) => {
        const id = (typeof u.id === 'string' && u.id) ||
                   (typeof u._id === 'string' && u._id) ||
                   (u._id && u._id.$oid) ||
                   (u._id && u._id.toString ? u._id.toString() : null);
        const nome = u.nome || u.name || u.fullName || u.email || 'Sem nome';
        return { id, nome };
      }).filter(u => !!u.id);

      if (norm.length) {
        setUsers(norm);
        break;
      }
    } catch {
      // tenta próximo endpoint
    }
  }
  setLoadingUsers(false);
};

  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  const deleteCookie = (name) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
  };

  const secureLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch {
      // ignore
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      }
      deleteCookie('token');
      deleteCookie('refreshToken');
      router.push('/'); // voltar ao login
    }
  }, [router]);

  // ========= RESPONSIVIDADE =========
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // ========= AUTH GATE =========
  useEffect(() => {
    const t = getToken();
    setIsAuthed(Boolean(t));
    setAuthChecked(true);
  }, []);

  // fechar menu ao clicar fora / Esc
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  // ========= getObraId: garante id string válido =========
  const getObraId = (o) => {
    if (!o) return null;
    if (typeof o.id === 'string') return o.id;
    if (typeof o._id === 'string') return o._id;
    if (o._id && typeof o._id.$oid === 'string') return o._id.$oid;
    if (o._id && typeof o._id.toString === 'function') return o._id.toString();
    return null;
  };

  // ========= BOOTSTRAP USER + COUNT + OBRAS =========
  useEffect(() => {
    if (!authChecked || !isAuthed) return;
    const token = getToken();

    (async () => {
      // user cache
      try {
        const raw = typeof window !== 'undefined'
          ? localStorage.getItem('user') || sessionStorage.getItem('user')
          : null;
        if (raw) {
          const u = JSON.parse(raw);
          if (u?.nome) setUserName(u.nome);
          if (u?.tipo) setRole(String(u.tipo).toLowerCase());
        }
      } catch {}

      // /me
      try {
        const meRes = await fetch('/api/users/me', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        if (meRes.ok) {
          const me = await meRes.json();
          if (me?.nome) setUserName(me.nome);
          if (me?.tipo) setRole(String(me.tipo).toLowerCase());
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(me));
            sessionStorage.setItem('user', JSON.stringify(me));
          }
        } else {
          const p = token ? parseJwt(token) : null;
          if (p?.email) setUserName(p.email);
          if (p?.tipo) setRole(String(p.tipo).toLowerCase());
        }
      } catch {
        const p = token ? parseJwt(token) : null;
        if (p?.email) setUserName(p.email);
        if (p?.tipo) setRole(String(p.tipo).toLowerCase());
      }

      // count colaboradores
      try {
        const countRes = await fetch('/api/colaboradores/count', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        if (countRes.ok) {
          const data = await countRes.json();
          setColaboradoresCount(typeof data?.count === 'number' ? data.count : 0);
        } else {
          setColaboradoresCount(0);
        }
      } catch {
        setColaboradoresCount(0);
      } finally {
        setLoadingCounts(false);
      }

      // carregar obras (filtros atuais)
      await fetchObras();
    })();
  }, [authChecked, isAuthed]);

  // ========= OBRAS: API HELPERS =========
  const buildQuery = () => {
    const params = new URLSearchParams();
    if (q) params.set('search', q.trim());
    if (localizacao) params.set('localizacao', localizacao.trim());
    if (estadoFilter) params.set('estado', estadoFilter);
    if (role === 'admin') {
      if (priceMin !== '') params.set('priceMin', priceMin);
      if (priceMax !== '') params.set('priceMax', priceMax);
    }
    const s = params.toString();
    return s ? `?${s}` : '';
  };

  const fetchObras = async () => {
  setLoadingObras(true);
  setErrorObras('');
  const token = getToken();

  try {
    const res = await fetch(`/api/obras${buildQuery()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    });

    if (!res.ok) {
      setErrorObras('Não foi possível carregar as obras.');
      setObras([]);
      setStats({ ativas: 0, concluidas: 0, suspensas: 0 });
      setRecentObras([]);
      return;
    }

    const data = await res.json();
    const lista = Array.isArray(data) ? data : (data?.obras || []);

    // normalizar estado
    const normalizadas = lista.map((o) => ({
      ...o,
      estadoObra: o.estadoObra || o.estado || 'planeamento',
    }));

    setObras(normalizadas);

    // estatísticas
    let ativas = 0, concluidas = 0, suspensas = 0;
    for (const o of normalizadas) {
      const st = String(o.estadoObra).toLowerCase();
      if (st === 'concluida') concluidas++;
      else if (st === 'suspensa') suspensas++;
      else ativas++; // planeamento/andamento/outros contam como ativas
    }
    setStats({ ativas, concluidas, suspensas });

    // atividades recentes (ordenar por dataAtualizacao/dataCriacao)
    setRecentObras(
      [...normalizadas].sort(
        (a, b) =>
          new Date(b.dataAtualizacao || b.dataCriacao || 0) -
          new Date(a.dataAtualizacao || a.dataCriacao || 0)
      )
    );
  } catch (e) {
    setErrorObras('Erro de rede ao carregar as obras.');
    setObras([]);
    setStats({ ativas: 0, concluidas: 0, suspensas: 0 });
    setRecentObras([]);
  } finally {
    setLoadingObras(false);
  }
};

  const submitObra = async () => {
    setSavingObra(true);
    setErrorObras('');
    const token = getToken();

    const payload = {
      ...obraForm,
      numeroCasas: Number(obraForm.numeroCasas || 0),
      orcamentoTotal: obraForm.orcamentoTotal === '' ? undefined : Number(obraForm.orcamentoTotal),
      dataInicio: obraForm.dataInicio ? new Date(obraForm.dataInicio) : undefined,
      dataFimPrevista: obraForm.dataFimPrevista ? new Date(obraForm.dataFimPrevista) : undefined,
    };

    try {
      const obraId = getObraId(selectedObra);
      const isEdit = isEditing && !!obraId;
      const url = isEdit ? `/api/obras/${obraId}` : '/api/obras';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Falha ao guardar a obra.');
      }
      setObraFormOpen(false);
      setSelectedObra(null);
      setIsEditing(false);
      await fetchObras(); // recarrega a lista
    } catch (e) {
      setErrorObras(e.message || 'Erro ao guardar a obra.');
    } finally {
      setSavingObra(false);
    }
  };

  const deleteObra = async (obra) => {
    const obraId = getObraId(obra);
    if (!obraId) return;
    if (!confirm('Tem a certeza que deseja eliminar esta obra?')) return;
    const token = getToken();
    try {
      const res = await fetch(`/api/obras/${obraId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Falha ao eliminar a obra.');
      }
      await fetchObras();
    } catch (e) {
      alert(e.message || 'Erro ao eliminar.');
    }
  };

  // ========= CONTADORES (Dashboard) =========
  const obrasAtivas = obras.filter((o) => o.estadoObra === 'planeamento' || o.estadoObra === 'andamento').length;
  const obrasConcluidas = obras.filter((o) => o.estadoObra === 'concluida').length;
  const obrasSuspensas = obras.filter((o) => o.estadoObra === 'suspensa').length;

  // ========= NAV =========
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-home' },
    { id: 'obras', label: 'Obras', icon: 'fas fa-hard-hat' },
    { id: 'colaboradores', label: 'Colaboradores', icon: 'fas fa-users' },
    { id: 'anotacoes', label: 'Anotações', icon: 'fas fa-sticky-note' },
    { id: 'planeamento', label: 'Planeamento', icon: 'fas fa-calendar-alt' },
  ];
  const filteredNavItems = role === 'admin' ? navItems : navItems.filter((i) => i.id !== 'colaboradores');

  // ========= RENDER =========
  const renderPageContent = () => {
    switch (activePage) {
      case 'dashboard':
  return (
    <div className="p-6 pb-24 lg:pb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {/* 1ª fila: os 3 cards atuais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Obras Ativas (mantém o teu conteúdo) */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="bg-blue-100 p-3 rounded-lg inline-block mb-4">
            <i className="fas fa-hard-hat text-blue-500 text-xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Obras Ativas</h3>
          <p className="text-3xl font-bold text-blue-600">{stats?.ativas ?? '—'}</p>
          <p className="text-gray-600 text-sm mt-2">+2 desde a última semana</p>
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Obras Concluídas</h4>
            <p className="text-green-600 font-bold">{stats?.concluidas ?? 0}</p>
          </div>
          <div className="mt-2">
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Obras Suspensas</h4>
            <p className="text-red-600 font-bold">{stats?.suspensas ?? 0}</p>
          </div>
        </div>

        {/* Colaboradores (mantém) */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="bg-green-100 p-3 rounded-lg inline-block mb-4">
            <i className="fas fa-users text-green-500 text-xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Colaboradores</h3>
          <p className="text-3xl font-bold text-green-600">{loadingCounts ? '—' : colaboradoresCount}</p>
          <p className="text-gray-600 text-sm mt-2">Total registado na conta</p>
        </div>

        {/* Tarefas Pendentes (mantém) */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="bg-orange-100 p-3 rounded-lg inline-block mb-4">
            <i className="fas fa-tasks text-orange-500 text-xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Tarefas Pendentes</h3>
          <p className="text-3xl font-bold text-orange-600">8</p>
          <p className="text-gray-600 text-sm mt-2">3 com alta prioridade</p>
        </div>
      </div>

      {/* 2ª fila: novo card Atividades Recentes */}
      <div className="mt-6 grid grid-cols-1">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="bg-orange-100 p-3 rounded-lg inline-block mb-4">
            <i className="fas fa-history text-orange-500 text-xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Atividades Recentes</h3>

          {/* Placeholder – lógica fica para amanhã */}
          <ul className="divide-y divide-gray-100 text-sm text-gray-700">
            <li className="py-2 flex items-center justify-between">
              <span className="opacity-60">Sem atividades para mostrar</span>
              <span className="text-xs text-gray-400">—</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );


      case 'obras':
  return (
    <div className="p-6 pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gestão de Obras</h2>

        {role === 'admin' && (
          <button
            onClick={() => {
              setIsEditing(false);
              setSelectedObra(null);
              setObraForm(emptyForm);
              setObraFormOpen(true);
              fetchUsersForResponsavel();
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition duration-300 flex items-center"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2 fill-current">
              <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
            </svg>
            Nova Obra
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Nome</label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Procurar por nome/responsável"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchObras()}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Localização</label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Ex: Porto, Lisboa..."
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchObras()}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Estado</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="planeamento">Planeamento</option>
              <option value="andamento">Andamento</option>
              <option value="concluida">Concluída</option>
              <option value="suspensa">Suspensa</option>
            </select>
          </div>

          {role === 'admin' ? (
            <>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Preço mín.</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="0"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchObras()}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Preço máx.</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="100000"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchObras()}
                />
              </div>
            </>
          ) : (
            <>
              <div className="hidden lg:block" />
              <div className="hidden lg:block" />
            </>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={fetchObras}
            className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800"
          >
            Aplicar filtros
          </button>
          <button
            onClick={() => {
              setQ('');
              setLocalizacao('');
              setEstadoFilter('');
              setPriceMin('');
              setPriceMax('');
              fetchObras();
            }}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-md p-6">
        {errorObras && (
          <div className="mb-4 rounded-md bg-red-50 text-red-700 p-3 text-sm">
            <svg viewBox="0 0 24 24" className="w-4 h-4 inline mr-2 fill-current">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
            {errorObras}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Localização</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {role === 'admin' ? 'Preço' : 'Responsável'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingObras ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">A carregar obras...</td>
                </tr>
              ) : obras.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">Sem obras registadas.</td>
                </tr>
              ) : (
                obras.map((obra) => {
                  const id = getObraId(obra);
                  const estado = obra?.estadoObra || obra?.estado || 'planeamento';
                  const responsavel = obra?.responsavelGeral || obra?.responsavel || '—';
                  return (
                    <tr key={id || obra?.nome}>
                      <td className="px-4 py-4 whitespace-nowrap">{obra?.nome || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{obra?.localizacao || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            estado === 'andamento'
                              ? 'bg-green-100 text-green-800'
                              : estado === 'concluida'
                              ? 'bg-blue-100 text-blue-800'
                              : estado === 'suspensa'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {estado}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {role === 'admin'
                          ? (obra?.orcamentoTotal != null ? `${obra.orcamentoTotal} €` : '—')
                          : responsavel}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {/* Lupa azul */}
                          <button
                            className="text-blue-600 hover:text-blue-800"
                            title="Ver detalhes"
                            onClick={() => {
                              setSelectedObra({ ...obra, id });
                              setObraModalOpen(true);
                            }}
                          >
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Z"/>
                            </svg>
                          </button>
                          {role === 'admin' && (
                            <>
                              {/* Lápis amarelo */}
                              <button
                                className="text-yellow-500 hover:text-yellow-600"
                                title="Editar"
                                onClick={() => {
                                  setIsEditing(true);
                                  const id = getObraId(obra);
                                  const estado = obra?.estadoObra || obra?.estado || 'planeamento';
                                  const responsavel = obra?.responsavelGeral || obra?.responsavel || '';

                                  setSelectedObra({ ...obra, id });
                                  setObraForm({
                                    nome: obra?.nome || '',
                                    localizacao: obra?.localizacao || '',
                                    estadoObra: estado,
                                    dataInicio: obra?.dataInicio ? new Date(obra.dataInicio).toISOString().slice(0, 10) : '',
                                    dataFimPrevista: obra?.dataFimPrevista ? new Date(obra.dataFimPrevista).toISOString().slice(0, 10) : '',
                                    orcamentoTotal: obra?.orcamentoTotal ?? '',
                                    responsavelGeral: responsavel,
                                    responsavelGeralId: obra?.responsavelGeralId || '',
                                    tipoObra: obra?.tipoObra || 'condominio',
                                    numeroCasas: obra?.numeroCasas ?? 0,
                                  });
                                  setObraFormOpen(true);

                                  // carregar users e garantir que o responsavel atual aparece na lista
                                  fetchUsersForResponsavel().then(() => {
                                    if (responsavel && !users.find((u) => u.nome === responsavel)) {
                                      setUsers((prev) => [...prev, { id: obra?.responsavelGeralId || 'manual', nome: responsavel }]);
                                    }
                                  });
                                }}
                              >
                                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm18.71-11.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.99-1.66Z"/>
                                </svg>
                              </button>
                              {/* X vermelho */}
                              <button
                                className="text-red-600 hover:text-red-800"
                                title="Eliminar"
                                onClick={() => deleteObra({ ...obra, id })}
                              >
                                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                                  <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.9a1 1 0 0 0 1.41-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z"/>
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALHES */}
{obraModalOpen && selectedObra && (
  <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Detalhes da Obra</h3>
        <button onClick={() => setObraModalOpen(false)} className="text-gray-500 hover:text-gray-700">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.9a1 1 0 0 0 1.41-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z"/>
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500">Nome</p>
          <p className="font-medium">{selectedObra?.nome || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Localização</p>
          <p className="font-medium">{selectedObra?.localizacao || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Estado</p>
          <p className="font-medium capitalize">{selectedObra?.estadoObra || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Tipo</p>
          <p className="font-medium capitalize">{selectedObra?.tipoObra || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Data Início</p>
          <p className="font-medium">
            {selectedObra?.dataInicio ? new Date(selectedObra.dataInicio).toLocaleDateString() : '-'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Data Fim Prevista</p>
          <p className="font-medium">
            {selectedObra?.dataFimPrevista ? new Date(selectedObra.dataFimPrevista).toLocaleDateString() : '-'}
          </p>
        </div>
        {role === 'admin' ? (
          <div>
            <p className="text-xs text-gray-500">Orçamento Total</p>
            <p className="font-medium">
              {selectedObra?.orcamentoTotal != null ? `${selectedObra.orcamentoTotal} €` : '-'}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500">Responsável Geral</p>
            <p className="font-medium">{selectedObra?.responsavelGeral || '-'}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-500">Nº Casas</p>
          <p className="font-medium">{selectedObra?.numeroCasas ?? 0}</p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setObraModalOpen(false)}
          className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Fechar
        </button>
      </div>
    </div>
  </div>
)}

{/* MODAL FORM (CRIAR/EDITAR) */}
{obraFormOpen && (
  <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {isEditing ? 'Editar Obra' : 'Nova Obra'}
        </h3>
        <button
          onClick={() => {
            if (!savingObra) {
              setObraFormOpen(false);
              setSelectedObra(null);
              setIsEditing(false);
            }
          }}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.9a1 1 0 0 0 1.41-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z"/>
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
              value={obraForm.nome}
              onChange={(e) => setObraForm({ ...obraForm, nome: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Localização</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
              value={obraForm.localizacao}
              onChange={(e) => setObraForm({ ...obraForm, localizacao: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Estado</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
              value={obraForm.estadoObra}
              onChange={(e) => setObraForm({ ...obraForm, estadoObra: e.target.value })}
            >
              <option value="planeamento">Planeamento</option>
              <option value="andamento">Andamento</option>
              <option value="concluida">Concluída</option>
              <option value="suspensa">Suspensa</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo de Obra</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
              value={obraForm.tipoObra}
              onChange={(e) => setObraForm({ ...obraForm, tipoObra: e.target.value })}
            >
              <option value="condominio">Condomínio</option>
              <option value="edificio">Edifício</option>
              <option value="casa">Casa</option>
              <option value="comercial">Comercial</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Data Início</label>
            <input
              type="date"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
              value={obraForm.dataInicio}
              onChange={(e) => setObraForm({ ...obraForm, dataInicio: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Data Fim Prevista</label>
            <input
              type="date"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
              value={obraForm.dataFimPrevista}
              onChange={(e) => setObraForm({ ...obraForm, dataFimPrevista: e.target.value })}
            />
          </div>
          {role === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Orçamento Total</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                value={obraForm.orcamentoTotal}
                onChange={(e) => setObraForm({ ...obraForm, orcamentoTotal: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Responsável Geral</label>
            <input
              list="users-resp"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder={loadingUsers ? 'A carregar utilizadores...' : 'Escolha um nome'}
              value={obraForm.responsavelGeral}
              onChange={(e) => {
                const val = e.target.value;
                const found = users.find((u) => u.nome === val);
                setObraForm({
                  ...obraForm,
                  responsavelGeral: val,
                  responsavelGeralId: found ? found.id : '', // guardamos só em memória
                });
              }}
            />
            <datalist id="users-resp">
              {users.map((u) => (
                <option key={u.id} value={u.nome} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nº de Casas</label>
            <input
              type="number"
              min="0"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
              value={obraForm.numeroCasas}
              onChange={(e) => setObraForm({ ...obraForm, numeroCasas: e.target.value })}
            />
          </div>
        </div>

        {errorObras && (
          <div className="rounded-md bg-red-50 text-red-700 p-3 text-sm">
            <svg viewBox="0 0 24 24" className="w-4 h-4 inline mr-2 fill-current">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
            {errorObras}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={() => {
              if (!savingObra) {
                setObraFormOpen(false);
                setSelectedObra(null);
                setIsEditing(false);
              }
            }}
            disabled={savingObra}
          >
            Cancelar
          </button>
          <button
            className={`px-4 py-2 rounded-md text-white ${
              savingObra ? 'bg-orange-400' : 'bg-orange-600 hover:bg-orange-700'
            }`}
            onClick={submitObra}
            disabled={savingObra}
          >
            {savingObra ? 'A guardar...' : isEditing ? 'Guardar Alterações' : 'Criar Obra'}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

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

  // ========= UI NÃO AUTENTICADO =========
  if (authChecked && !isAuthed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl shadow-lg p-6 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
            <i className="fas fa-lock text-orange-600"></i>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Sessão necessária</h1>
          <p className="mt-2 text-sm text-gray-600">
            Para aceder ao dashboard, por favor inicie sessão.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700 transition"
          >
            <i className="fas fa-sign-in-alt"></i>
            Ir para login
          </button>
        </div>
      </div>
    );
  }

  // ========= LAYOUT AUTENTICADO =========
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          {/* Identidade */}
          <div className="flex items-center">
            <div className="bg-orange-500 p-2 rounded-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="leading-tight">
              <p className="text-sm text-gray-700">{userName}</p>
              <p className="text-xs text-gray-500"><span className="font-bold uppercase">{role}</span></p>
            </div>
          </div>

          {/* Menu hambúrguer */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
              aria-haspopup="menu"
              aria-expanded={menuOpen ? 'true' : 'false'}
              aria-label="Menu"
              title="Menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <rect y="4" width="20" height="2"></rect>
                <rect y="9" width="20" height="2"></rect>
                <rect y="14" width="20" height="2"></rect>
              </svg>
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-40 overflow-hidden"
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push('/settings');
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-gray-700"
                  role="menuitem"
                >
                  <span className="text-sm">Configurações</span>
                  <span><i className="fas fa-cog"></i></span>
                </button>
                <div className="h-px bg-gray-200" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    secureLogout();
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-red-600"
                  role="menuitem"
                >
                  <span className="text-sm">Sair</span>
                  <span className="flex items-center gap-2">
                    <i className="fas fa-person-running"></i>
                    <i className="fas fa-door-open"></i>
                  </span>
                </button>
              </div>
            )}
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
                      className={`w-full flex items-center px-4 py-3 rounded-md transition duration-300 ${
                        activePage === item.id ? 'bg-orange-100 text-orange-700' : 'text-gray-700 hover:bg-gray-100'
                      }`}
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
                    className={`flex flex-col items-center py-2 px-1 rounded-md transition duration-300 ${
                      activePage === item.id ? 'text-orange-600' : 'text-gray-600'
                    }`}
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
