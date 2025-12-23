'use client';
import React from 'react';
import OrcamentoBuilder from '../orcamentoBuilder/orcamentoBuilder'; // ajusta se necessário

export default function OrcamentosHub({ onBack }) {
  const [view, setView] = React.useState('list'); // 'list' | 'builder'
  const [obras, setObras] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [selectedObra, setSelectedObra] = React.useState(null);

  const getToken = () => {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
    } catch {
      return null;
    }
  };

  const getObraId = (o) => {
    if (!o) return null;
    if (typeof o.id === 'string') return o.id;
    if (typeof o._id === 'string') return o._id;
    if (o._id && typeof o._id.$oid === 'string') return o._id.$oid;
    if (o._id && typeof o._id.toString === 'function') return o._id.toString();
    return null;
  };

  const fetchObras = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();

      const tryUrls = ['/api/obras?limit=1000', '/api/obras'];
      let okData = null;

      for (const url of tryUrls) {
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          okData = data;
          break;
        }
      }

      if (!okData) throw new Error('Não foi possível carregar as obras.');

      const lista = Array.isArray(okData) ? okData : okData?.obras || okData?.items || [];
      const normalizadas = (Array.isArray(lista) ? lista : [])
        .map((o) => ({ ...o, _id: getObraId(o) }))
        .filter((o) => !!o._id);

      setObras(normalizadas);
    } catch (e) {
      setError(e?.message || 'Erro ao carregar obras.');
      setObras([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (view === 'list') fetchObras();
  }, [fetchObras, view]);

  // ✅ ABRIR BUILDER SEM OBRA
  const openOrcamentoSemObra = () => {
    setSelectedObra(null);
    setView('builder');
  };

  // ✅ ABRIR BUILDER COM OBRA
  const openOrcamentoComObra = (obra) => {
    setSelectedObra(obra);
    setView('builder');
  };

  const deleteObra = async (obra) => {
    const id = obra?._id;
    if (!id) return;

    if (!confirm(`Eliminar a obra "${obra?.nome || 'Sem nome'}" definitivamente?`)) return;

    setError('');
    try {
      const token = getToken();

      const res = await fetch(`/api/obras/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erro ao eliminar a obra.');

      setSelectedObra((prev) => (prev?._id === id ? null : prev));
      await fetchObras();
    } catch (e) {
      setError(e?.message || 'Erro ao eliminar a obra.');
    }
  };

  // ==========================
  // VIEW: BUILDER
  // ==========================
  if (view === 'builder') {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {selectedObra ? `Orçamento para: ${selectedObra?.nome || 'Obra'}` : 'Orçamento (obra não guardada)'}
            </h3>
            <p className="text-sm text-gray-600">
              {selectedObra
                ? 'Builder associado à obra selecionada.'
                : 'Builder de orçamento avulso (sem obra).'}
            </p>

            <div className="mt-2">
              {selectedObra ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-800">
                  <i className="fa-solid fa-briefcase"></i>
                  Orçamento para: <b className="font-semibold">{selectedObra?.nome || 'Obra'}</b>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                  <i className="fa-solid fa-file-circle-plus"></i>
                  Orçamento para obra não guardada
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setView('list')}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Voltar
          </button>
        </div>

        <div className="mt-6">
          {/* ✅ PASSA A OBRA (ou null) para o teu builder */}
          <OrcamentoBuilder obra={selectedObra} />
        </div>
      </div>
    );
  }

  // ==========================
  // VIEW: LISTA DE OBRAS
  // ==========================
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Criar Orçamentos</h3>
          <p className="text-sm text-gray-600">Escolhe uma obra (ou cria um orçamento sem obra).</p>
        </div>

        {/* Botões à direita */}
        <div className="flex items-center gap-2 sm:justify-end">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Voltar
          </button>

          <button
            onClick={openOrcamentoSemObra}
            className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 transition"
            title="Criar orçamento sem associar a obra"
          >
            Orçamento para obra não guardada
          </button>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="mt-4 rounded-md bg-red-50 text-red-700 p-3 text-sm">
          <i className="fa-solid fa-triangle-exclamation mr-2"></i>
          {error}
        </div>
      )}

      {/* Conteúdo */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-gray-800">
            Obras guardadas ({loading ? '…' : obras.length})
          </h4>

          <button
            onClick={fetchObras}
            className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
          >
            Atualizar
          </button>
        </div>

        {/* Grid de cards */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-full text-gray-500 text-sm py-6">A carregar obras...</div>
          ) : obras.length === 0 ? (
            <div className="col-span-full text-gray-500 text-sm py-6">Sem obras registadas.</div>
          ) : (
            obras.map((o) => (
              <ObraCard
                key={o._id}
                obra={o}
                onClick={() => openOrcamentoComObra(o)}   // ✅ AGORA ABRE O BUILDER
                onDelete={() => deleteObra(o)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ObraCard({ obra, onClick, onDelete }) {
  const estado = (obra?.estadoObra || obra?.estado || '').toLowerCase();

  const estadoClass =
    estado === 'andamento'
      ? 'bg-green-100 text-green-800'
      : estado === 'concluida'
      ? 'bg-blue-100 text-blue-800'
      : estado === 'suspensa'
      ? 'bg-red-100 text-red-800'
      : 'bg-yellow-100 text-yellow-800';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={[
        'relative cursor-pointer overflow-hidden bg-white rounded-xl shadow-md p-5 w-full',
        'transition-transform duration-200 ease-out',
        'hover:-translate-y-1 hover:shadow-xl hover:scale-[1.01]',
        'ring-1 ring-transparent hover:ring-2 hover:ring-blue-200',
        // 🔵 EFEITO AZUL
        'before:content-[""] before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-blue-200/30 before:to-transparent',
        'before:opacity-0 hover:before:opacity-100',
        'before:transition-opacity before:duration-200',
        'select-none',
      ].join(' ')}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h5 className="text-base font-semibold text-gray-900 truncate">
            {obra?.nome || 'Sem nome'}
          </h5>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs capitalize ${estadoClass}`}>
              {estado || '—'}
            </span>

            {obra?.localizacao && (
              <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                <i className="fa-solid fa-location-dot mr-1 opacity-70"></i>
                {obra.localizacao}
              </span>
            )}
          </div>

          <div className="mt-3 text-sm text-gray-600">
            <span className="font-medium">Tipo:</span> {obra?.tipoObra || '—'}
            {obra?.numeroCasas != null && (
              <>
                {' '}
                • <span className="font-medium">Casas:</span> {obra.numeroCasas}
              </>
            )}
          </div>
        </div>

        {/* AÇÕES */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation(); // 🔥 não ativa o card
              onDelete?.();
            }}
            className="p-2 rounded-full bg-red-100 text-red-700 hover:bg-red-200"
            title="Eliminar obra"
          >
            <i className="fa-solid fa-trash"></i>
          </button>

          <span className="text-blue-600">
            <i className="fa-solid fa-arrow-right-long opacity-70"></i>
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-4 text-xs text-gray-500">
        Clique no cartão para criar orçamento para esta obra
      </div>
    </div>
  );
}
