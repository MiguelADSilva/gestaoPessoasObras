'use client';
import React from 'react';
import OrcamentosHub from '../orcamentosHub/orcamentosHub';
import VerOrcamentos from '../verOrcamentos/verOrcamentos';
import OrcamentoBuilder from '../orcamentoBuilder/orcamentoBuilder'; // ✅ ajuste conforme a tua pasta

export default function AnotacoesHub() {
  // 'menu' | 'materiais' | 'orcamentos' | 'ver_orcamentos' | 'editar_orcamento'
  const [view, setView] = React.useState('menu');

  // ✅ guarda o orçamento selecionado para edição
  const [editingOrcamento, setEditingOrcamento] = React.useState(null);

  const handleEditOrcamento = (orc) => {
    if (!orc) return;
    setEditingOrcamento(orc);
    setView('editar_orcamento');
  };

  const goMenu = () => {
    setEditingOrcamento(null);
    setView('menu');
  };

  return (
    <div className="space-y-6">
      {/* MENU (3 cards) */}
      {view === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionCard
            title="Adicionar Materiais"
            subtitle="Guardar, pesquisar, editar e eliminar materiais elétricos"
            iconClass="fa-solid fa-plug-circle-bolt"
            accent="orange"
            onClick={() => setView('materiais')}
          />

          <ActionCard
            title="Criar Orçamentos"
            subtitle="Criar orçamentos rapidamente com base em materiais e quantidades"
            iconClass="fa-solid fa-file-invoice-dollar"
            accent="blue"
            onClick={() => setView('orcamentos')}
          />

          <ActionCard
            title="Ver Orçamentos"
            subtitle="Consultar orçamentos já criados"
            iconClass="fa-solid fa-folder-open"
            accent="purple"
            onClick={() => setView('ver_orcamentos')}
          />
        </div>
      )}

      {/* VIEWS */}
      {view === 'materiais' && <MaterialsManager onBack={goMenu} />}

      {view === 'orcamentos' && <OrcamentosHub onBack={goMenu} />}

      {view === 'ver_orcamentos' && (
        <VerOrcamentos
          onBack={goMenu}
          onEdit={handleEditOrcamento} // ✅ PASSA onEdit para o filho
        />
      )}

      {/* ✅ ECRÃ DE EDIÇÃO (sem mudar URL) */}
      {view === 'editar_orcamento' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">Editar Orçamento</h3>
              <p className="text-sm text-gray-600">
                {editingOrcamento?._id
                  ? `A editar (#${String(editingOrcamento._id).slice(-6)})`
                  : 'A editar orçamento'}
              </p>
            </div>

            <button
              onClick={() => {
                setEditingOrcamento(null);
                setView('ver_orcamentos');
              }}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Voltar
            </button>
          </div>

          <div className="mt-6">
            <OrcamentoBuilder
              obra={null} // ou passa a obra se quiseres
              onBack={() => {
                setEditingOrcamento(null);
                setView('ver_orcamentos');
              }}
              initialOrcamento={editingOrcamento} // ✅ carrega tudo no builder
              orcamentoId={editingOrcamento?._id || editingOrcamento?.id || null} // ✅ opcional
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   CARD MENU
========================= */
function ActionCard({ title, subtitle, iconClass, accent = 'orange', onClick }) {
  const accentMap = {
    orange: {
      ring: 'hover:ring-orange-200',
      iconBg: 'bg-orange-100',
      iconText: 'text-orange-600',
      glow: 'before:from-orange-200/40 before:to-transparent',
    },
    blue: {
      ring: 'hover:ring-blue-200',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      glow: 'before:from-blue-200/40 before:to-transparent',
    },
    purple: {
      ring: 'hover:ring-purple-200',
      iconBg: 'bg-purple-100',
      iconText: 'text-purple-700',
      glow: 'before:from-purple-200/40 before:to-transparent',
    },
  };
  const a = accentMap[accent] || accentMap.orange;

  return (
    <button
      onClick={onClick}
      className={[
        'relative overflow-hidden text-left bg-white rounded-xl shadow-md p-6',
        'transition-transform duration-200 ease-out',
        'hover:-translate-y-1 hover:shadow-xl hover:scale-[1.01]',
        'ring-1 ring-transparent hover:ring-2',
        a.ring,
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900/20',
        // shine
        'before:content-[""] before:absolute before:inset-0 before:bg-gradient-to-r',
        a.glow,
        'before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-200',
      ].join(' ')}
    >
      <div className="flex items-start gap-4">
        <div className={`${a.iconBg} p-3 rounded-lg shrink-0`}>
          <i className={`${iconClass} ${a.iconText} text-xl`}></i>
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gray-900">
            Abrir <i className="fa-solid fa-arrow-right-long opacity-70"></i>
          </div>
        </div>
      </div>
    </button>
  );
}

/* =========================
   VIEW: MATERIAIS
   (CÓDIGO ORIGINAL DO UTILIZADOR)
========================= */
function MaterialsManager({ onBack }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [q, setQ] = React.useState('');
  const [categoria, setCategoria] = React.useState('');

  const [modalOpen, setModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  // ✅ import PDF
  const [importing, setImporting] = React.useState(false);
  const fileRef = React.useRef(null);

  // ✅ apagar todos (confirm modal)
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = React.useState(false);
  const [deletingAll, setDeletingAll] = React.useState(false);

  const emptyForm = {
    nome: '',
    categoria: '',
    marca: '',
    referencia: '',
    unidade: 'un',
    iva: 23,
    precoCompra: '',
    precoVenda: '',
    stockAtual: '',
    fornecedor: '',
    notas: '',
  };

  const getMaterialId = (m) => {
    if (!m) return null;
    if (typeof m._id === 'string') return m._id;
    if (typeof m.id === 'string') return m.id;
    if (m._id && typeof m._id.$oid === 'string') return m._id.$oid;
    if (m._id && typeof m._id.toString === 'function') return m._id.toString();
    return null;
  };

  const [form, setForm] = React.useState(emptyForm);

  // ✅ parse PT numbers (aceita "140,5")
  const parsePtNumber = (v) => {
    if (v === null || v === undefined) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    const n = Number(s.replace(/\s+/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  const money2 = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return `${n.toFixed(2)} €`;
  };

  const fetchMateriais = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (categoria.trim()) params.set('categoria', categoria.trim());
      params.set('limit', '100');

      const res = await fetch(`/api/materiais?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erro ao carregar materiais.');
      const raw = Array.isArray(data?.items) ? data.items : [];

      const normalized = raw
        .map((m) => {
          const id =
            typeof m?._id === 'string'
              ? m._id
              : m?._id && typeof m._id.$oid === 'string'
              ? m._id.$oid
              : m?.id && typeof m.id === 'string'
              ? m.id
              : null;

          return { ...m, _id: id };
        })
        .filter((m) => !!m._id);

      setItems(normalized);
    } catch (e) {
      setItems([]);
      setError(e?.message || 'Erro ao carregar materiais.');
    } finally {
      setLoading(false);
    }
  }, [q, categoria]);

  React.useEffect(() => {
    fetchMateriais();
  }, [fetchMateriais]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (m) => {
    const id = getMaterialId(m);
    setEditing({ ...m, _id: id });

    setForm({
      nome: m?.nome || '',
      categoria: m?.categoria || '',
      marca: m?.marca || '',
      referencia: m?.referencia || '',
      unidade: m?.unidade || 'un',
      iva: Number(m?.iva ?? 23),
      precoCompra: m?.precoCompra ?? '',
      precoVenda: m?.precoVenda ?? '',
      stockAtual: m?.stockAtual ?? '',
      fornecedor: m?.fornecedor || '',
      notas: m?.notas || '',
    });

    setModalOpen(true);
  };

  const submit = async () => {
    const nome = (form.nome || '').trim();
    if (!nome) return setError('O nome é obrigatório.');

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        nome,
        categoria: (form.categoria || '').trim() || 'geral',
        marca: (form.marca || '').trim(),
        referencia: (form.referencia || '').trim(),
        unidade: (form.unidade || 'un').trim(),
        iva: Number(form.iva ?? 23),

        // ✅ agora aceita vírgula e não inventa .500
        precoCompra: parsePtNumber(form.precoCompra),
        precoVenda: parsePtNumber(form.precoVenda),
        stockAtual: parsePtNumber(form.stockAtual),

        fornecedor: (form.fornecedor || '').trim(),
        notas: (form.notas || '').trim(),
      };

      const isEdit = !!editing?._id;
      const url = isEdit ? `/api/materiais/${editing._id}` : `/api/materiais`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erro ao guardar material.');

      const saved = data;

      setItems((prev) => {
        const id = saved?._id;
        if (!id) return prev;
        if (isEdit) return prev.map((it) => (it._id === id ? saved : it));
        return [saved, ...prev];
      });

      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setError('');
    } catch (e) {
      setError(e?.message || 'Erro ao guardar material.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m) => {
    if (!m?._id) return;
    if (!confirm(`Eliminar "${m.nome}"?`)) return;

    setError('');
    try {
      const res = await fetch(`/api/materiais/${m._id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erro ao eliminar.');
      await fetchMateriais();
    } catch (e) {
      setError(e?.message || 'Erro ao eliminar.');
    }
  };

  // ✅ importar PDF
  const pickPdf = () => fileRef.current?.click();

  const importPdf = async (file) => {
    if (!file) return;
    setImporting(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('file', file, file.name || 'import.pdf');

      const res = await fetch('/api/materiais/import-pdf', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erro ao importar PDF.');

      alert(`✅ Importados: ${data.createdCount ?? data.upserted ?? 0} (detetados: ${data.foundCount ?? 0})`);
      await fetchMateriais();
    } catch (e) {
      setError(e?.message || 'Erro ao importar PDF.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ✅ apagar todos os materiais
  const openDeleteAll = () => setConfirmDeleteAllOpen(true);

  const deleteAllMateriais = async () => {
    setDeletingAll(true);
    setError('');

    try {
      const res = await fetch('/api/materiais?all=1', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erro ao apagar todos os materiais.');

      setConfirmDeleteAllOpen(false);
      await fetchMateriais();
    } catch (e) {
      setError(e?.message || 'Erro ao apagar todos os materiais.');
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Materiais Elétricos</h3>
          <p className="text-sm text-gray-600">Gerir materiais (CRUD) via /api/materiais</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Voltar
          </button>

          {/* input hidden + botão Importar PDF */}
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => importPdf(e.target.files?.[0])}
          />

          <button
            onClick={pickPdf}
            disabled={importing}
            className={`px-4 py-2 rounded-md text-white ${
              importing ? 'bg-orange-400' : 'bg-orange-600 hover:bg-orange-700'
            }`}
            title="Importar materiais a partir de um PDF"
          >
            {importing ? 'A importar...' : 'Importar PDF'}
          </button>

          {/* botão apagar todos */}
          <button
            onClick={openDeleteAll}
            disabled={deletingAll || loading || items.length === 0}
            className={`px-4 py-2 rounded-md text-white ${
              deletingAll || loading || items.length === 0 ? 'bg-red-300' : 'bg-red-600 hover:bg-red-700'
            }`}
            title="Apagar todos os materiais"
          >
            {deletingAll ? 'A apagar...' : 'Apagar Todos'}
          </button>

          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700"
          >
            + Novo Material
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-600 mb-1">Pesquisar</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchMateriais()}
            placeholder="Nome, marca, referência, fornecedor..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Categoria</label>
          <input
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchMateriais()}
            placeholder="ex: cabos, disjuntores..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={fetchMateriais} className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800">
          Aplicar
        </button>
        <button
          onClick={() => {
            setQ('');
            setCategoria('');
            setTimeout(fetchMateriais, 0);
          }}
          className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Limpar
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div className="mt-4 rounded-md bg-red-50 text-red-700 p-3 text-sm">
          <i className="fa-solid fa-triangle-exclamation mr-2"></i>
          {error}
        </div>
      )}

      {/* Lista */}
      <div className="mt-5">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header (desktop) */}
            <div className="hidden md:grid grid-cols-[minmax(260px,2fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(120px,1fr)_80px_140px_80px_140px] gap-0 bg-gray-50 border border-gray-200 rounded-t-lg">
              <div className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nome</div>
              <div className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Marca</div>
              <div className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Categoria</div>
              <div className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ref.</div>
              <div className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Unid.</div>
              <div className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Preço Venda</div>
              <div className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock</div>
              <div className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Ações</div>
            </div>

            <div className="border border-gray-200 md:border-t-0 rounded-lg md:rounded-t-none overflow-hidden bg-white">
              {loading ? (
                <div className="px-4 py-6 text-center text-gray-500">A carregar materiais...</div>
              ) : items.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-500">Sem materiais registados.</div>
              ) : (
                items.map((m) => (
                  <div
                    key={m._id}
                    className="
                      border-t border-gray-200 first:border-t-0
                      md:grid md:grid-cols-[minmax(260px,2fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(120px,1fr)_80px_140px_80px_140px]
                      md:items-center
                      p-4 md:p-0
                    "
                  >
                    {/* Mobile card */}
                    <div className="md:hidden space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{m?.nome || '—'}</div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Marca:</span> {m?.marca || '—'}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Categoria:</span> {m?.categoria || '—'}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Ref:</span> {m?.referencia || '—'}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Unid:</span> {m?.unidade || 'un'} •{' '}
                            <span className="font-medium">Preço:</span>{' '}
                            {m?.precoVenda != null ? money2(m.precoVenda) : '—'} •{' '}
                            <span className="font-medium">Stock:</span> {m?.stockAtual ?? 0}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => openEdit(m)}
                            className="p-2 bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200"
                            title="Editar"
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button
                            onClick={() => remove(m)}
                            className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
                            title="Eliminar"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop cells */}
                    <div className="hidden md:block px-4 py-4 font-medium text-gray-900 truncate">{m?.nome || '—'}</div>
                    <div className="hidden md:block px-4 py-4 text-gray-700 truncate">{m?.marca || '—'}</div>
                    <div className="hidden md:block px-4 py-4 text-gray-700 truncate">{m?.categoria || '—'}</div>
                    <div className="hidden md:block px-4 py-4 text-gray-700 truncate">{m?.referencia || '—'}</div>
                    <div className="hidden md:block px-4 py-4 text-gray-700">{m?.unidade || 'un'}</div>
                    <div className="hidden md:block px-4 py-4 text-gray-700">{m?.precoVenda != null ? money2(m.precoVenda) : '—'}</div>
                    <div className="hidden md:block px-4 py-4 text-gray-700">{m?.stockAtual ?? 0}</div>

                    {/* Ações */}
                    <div className="hidden md:block px-4 py-4">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap min-w-[120px]">
                        <button
                          onClick={() => openEdit(m)}
                          className="p-2 bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200"
                          title="Editar"
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button
                          onClick={() => remove(m)}
                          className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
                          title="Eliminar"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500 md:hidden">
          Dica: podes deslizar na tabela para ver mais colunas.
        </div>
      </div>

      {/* Confirm apagar todos */}
      {confirmDeleteAllOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="p-5 border-b flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Apagar todos os materiais?</div>
                  <div className="mt-1 text-sm text-gray-600">
                    Isto vai eliminar <span className="font-medium">{items.length}</span> materiais de uma só vez.
                    Esta ação não dá para desfazer.
                  </div>
                </div>
                <button
                  onClick={() => !deletingAll && setConfirmDeleteAllOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Fechar"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              <div className="p-5">
                <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-800">
                  <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                  Confirma que queres mesmo apagar todos os materiais guardados.
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => !deletingAll && setConfirmDeleteAllOpen(false)}
                    className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                    disabled={deletingAll}
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={deleteAllMateriais}
                    className={`px-4 py-2 rounded-md text-white ${
                      deletingAll ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'
                    }`}
                    disabled={deletingAll}
                  >
                    {deletingAll ? 'A apagar...' : 'Sim, apagar tudo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal criar/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90dvh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b">
                <h4 className="text-lg font-semibold text-gray-900">
                  {editing ? 'Editar Material' : 'Novo Material'}
                </h4>

                <button
                  onClick={() => !saving && setModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Fechar"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Nome *">
                    <input
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    />
                  </Field>

                  <Field label="Categoria">
                    <input
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="cabos, disjuntores..."
                      value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    />
                  </Field>

                  <Field label="Marca">
                    <input
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                      value={form.marca}
                      onChange={(e) => setForm({ ...form, marca: e.target.value })}
                    />
                  </Field>

                  <Field label="Referência">
                    <input
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                      value={form.referencia}
                      onChange={(e) => setForm({ ...form, referencia: e.target.value })}
                    />
                  </Field>

                  <Field label="Unidade">
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                      value={form.unidade}
                      onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                    >
                      <option value="un">un</option>
                      <option value="m">m</option>
                      <option value="rolo">rolo</option>
                      <option value="cx">cx</option>
                      <option value="kg">kg</option>
                      <option value="pack">pack</option>
                    </select>
                  </Field>

                  <Field label="IVA (%)">
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                      value={form.iva}
                      onChange={(e) => setForm({ ...form, iva: e.target.value })}
                    />
                  </Field>

                  <Field label="Preço Compra">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="ex: 12,50"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                      value={form.precoCompra}
                      onChange={(e) => setForm({ ...form, precoCompra: e.target.value })}
                    />
                  </Field>

                  <Field label="Preço Venda">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="ex: 15,38"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                      value={form.precoVenda}
                      onChange={(e) => setForm({ ...form, precoVenda: e.target.value })}
                    />
                  </Field>

                  <Field label="Stock Atual">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                      value={form.stockAtual}
                      onChange={(e) => setForm({ ...form, stockAtual: e.target.value })}
                    />
                  </Field>

                  <Field label="Fornecedor">
                    <input
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                      value={form.fornecedor}
                      onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
                    />
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Notas">
                      <textarea
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                        value={form.notas}
                        onChange={(e) => setForm({ ...form, notas: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  onClick={() => !saving && setModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  onClick={submit}
                  className={`px-4 py-2 rounded-md text-white ${
                    saving ? 'bg-orange-400' : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                  disabled={saving}
                >
                  {saving ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
