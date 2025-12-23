'use client';
import React from 'react';
import OrcamentosHub from '../orcamentosHub/orcamentosHub';

export default function AnotacoesHub() {
  const [view, setView] = React.useState('menu'); // 'menu' | 'materiais' | 'orcamentos' | 'ver_orcamentos'

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
      {view === 'materiais' && <MaterialsManager onBack={() => setView('menu')} />}

      {view === 'orcamentos' && <OrcamentosHub onBack={() => setView('menu')} />}

      {view === 'ver_orcamentos' && <VerOrcamentosPage onBack={() => setView('menu')} />}
    </div>
  );
}

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
   VIEW: VER ORÇAMENTOS (SÓ TEXTO POR AGORA)
========================= */
function VerOrcamentosPage({ onBack }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Ver Orçamentos</h3>
          <p className="text-sm text-gray-600">Por agora: apenas esta página.</p>
        </div>

        <button
          onClick={onBack}
          className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Voltar
        </button>
      </div>

      <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
        Ver Orçamentos
      </div>
    </div>
  );
}

function MaterialsManager({ onBack }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [q, setQ] = React.useState('');
  const [categoria, setCategoria] = React.useState('');

  const [modalOpen, setModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

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
  const [form, setForm] = React.useState(emptyForm);

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
      setItems(Array.isArray(data?.items) ? data.items : []);
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
    setEditing(m);
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
        precoCompra: form.precoCompra === '' ? 0 : Number(form.precoCompra),
        precoVenda: form.precoVenda === '' ? 0 : Number(form.precoVenda),
        stockAtual: form.stockAtual === '' ? 0 : Number(form.stockAtual),
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

      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await fetchMateriais();
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

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Materiais Elétricos</h3>
          <p className="text-sm text-gray-600">Gerir materiais (CRUD) via /api/materiais</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Voltar
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
          <div className="min-w-[1180px]">
            <div className="hidden md:grid grid-cols-[320px_160px_160px_140px_90px_150px_90px_120px] gap-0 bg-gray-50 border border-gray-200 rounded-t-lg">
              <div className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nome</div>
              <div className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Marca</div>
              <div className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Categoria</div>
              <div className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ref.</div>
              <div className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Unid.</div>
              <div className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Preço Venda</div>
              <div className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock</div>
              <div className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</div>
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
                      md:grid md:grid-cols-[320px_160px_160px_140px_90px_150px_90px_120px]
                      md:items-center
                      p-4 md:p-0
                    "
                  >
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
                            {m?.precoVenda != null ? `${Number(m.precoVenda).toFixed(2)} €` : '—'} •{' '}
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

                    <div className="hidden md:block px-4 py-4 font-medium text-gray-900 truncate">{m?.nome || '—'}</div>
                    <div className="hidden md:block px-4 py-4 text-gray-700 truncate">{m?.marca || '—'}</div>
                    <div className="hidden md:block px-4 py-4 text-gray-700 truncate">{m?.categoria || '—'}</div>
                    <div className="hidden md:block px-4 py-4 text-gray-700 truncate">{m?.referencia || '—'}</div>
                    <div className="hidden md:block px-4 py-4 text-gray-700">{m?.unidade || 'un'}</div>
                    <div className="hidden md:block px-4 py-4 text-gray-700">
                      {m?.precoVenda != null ? `${Number(m.precoVenda).toFixed(2)} €` : '—'}
                    </div>
                    <div className="hidden md:block px-4 py-4 text-gray-700">{m?.stockAtual ?? 0}</div>
                    <div className="hidden md:block px-4 py-4">
                      <div className="flex items-center gap-2">
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
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">{editing ? 'Editar Material' : 'Novo Material'}</h4>
              <button
                onClick={() => !saving && setModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Fechar"
                title="Fechar"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

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
                  type="number"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                  value={form.precoCompra}
                  onChange={(e) => setForm({ ...form, precoCompra: e.target.value })}
                />
              </Field>

              <Field label="Preço Venda">
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                  value={form.precoVenda}
                  onChange={(e) => setForm({ ...form, precoVenda: e.target.value })}
                />
              </Field>

              <Field label="Stock Atual">
                <input
                  type="number"
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

            <div className="mt-6 flex justify-end gap-3">
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
