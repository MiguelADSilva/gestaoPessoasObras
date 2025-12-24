'use client';
import React from 'react';

export default function VerOrcamentos({ onBack }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [q, setQ] = React.useState('');
  const [selected, setSelected] = React.useState(null);

  // ✅ NOVO: email
  const [emailTo, setEmailTo] = React.useState('');
  const [sendingEmail, setSendingEmail] = React.useState(false);
  const [emailMsg, setEmailMsg] = React.useState('');

  const getId = (o) => o?._id || o?.id || null;

  const fetchOrcamentos = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/orcamentos', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erro ao carregar orçamentos.');

      const lista = Array.isArray(data) ? data : (data?.items || []);
      setItems(Array.isArray(lista) ? lista : []);
    } catch (e) {
      setError(e?.message || 'Erro ao carregar orçamentos.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchOrcamentos();
  }, [fetchOrcamentos]);

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;

    return items.filter((o) => {
      const titulo = (o?.titulo || '').toLowerCase();
      const cliente = (o?.clienteNome || '').toLowerCase();
      const obraSnap = (o?.obraNomeSnapshot || '').toLowerCase();
      const obraId = String(o?.obraId || '').toLowerCase();
      return (
        titulo.includes(term) ||
        cliente.includes(term) ||
        obraSnap.includes(term) ||
        obraId.includes(term)
      );
    });
  }, [items, q]);

  const fmtMoney = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return '—';
    return `${v.toFixed(2)} €`;
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '—';
    return dt.toLocaleString('pt-PT');
  };

  const deleteOrcamento = async (orc) => {
    const id = getId(orc);
    if (!id) return;

    if (!confirm(`Eliminar o orçamento "${orc?.titulo || 'Sem título'}"?`)) return;

    setError('');
    try {
      const res = await fetch(`/api/orcamentos/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erro ao eliminar orçamento.');

      setSelected((prev) => (getId(prev) === id ? null : prev));
      await fetchOrcamentos();
    } catch (e) {
      setError(e?.message || 'Erro ao eliminar orçamento.');
    }
  };

  // ✅ NOVO: quando selecionas orçamento, pré-preenche email com contacto do cliente (se existir)
  React.useEffect(() => {
    if (!selected) {
      setEmailTo('');
      setEmailMsg('');
      return;
    }
    setEmailTo(selected?.clienteEmail || selected?.email || selected?.clienteContactoEmail || '');
    setEmailMsg('');
  }, [selected]);

  // ✅ NOVO: enviar por email
  const sendEmail = async () => {
    const id = getId(selected);
    if (!id) return;

    const to = (emailTo || '').trim();
    if (!to) {
      setEmailMsg('Indica um email de destino.');
      return;
    }

    setSendingEmail(true);
    setEmailMsg('');
    setError('');

    try {
      const res = await fetch(`/api/orcamentos/${id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erro ao enviar email.');

      setEmailMsg('✅ Email enviado com sucesso.');
    } catch (e) {
      setEmailMsg('');
      setError(e?.message || 'Erro ao enviar email.');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Ver Orçamentos</h3>
          <p className="text-sm text-gray-600">
            Consultar e gerir orçamentos guardados.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:justify-end">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Voltar
          </button>

          <button
            onClick={fetchOrcamentos}
            className="px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-600 mb-1">Pesquisar</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Título, cliente, obra..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div className="flex items-end">
          <div className="w-full rounded-lg bg-purple-50 border border-purple-100 px-3 py-2 text-sm text-purple-900">
            <span className="font-medium">Total:</span>{' '}
            {loading ? '…' : filtered.length}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-md bg-red-50 text-red-700 p-3 text-sm">
          <i className="fa-solid fa-triangle-exclamation mr-2"></i>
          {error}
        </div>
      )}

      {/* List */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cards */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {loading ? (
              <div className="col-span-full text-gray-500 text-sm py-6">
                A carregar orçamentos...
              </div>
            ) : filtered.length === 0 ? (
              <div className="col-span-full text-gray-500 text-sm py-6">
                Sem orçamentos.
              </div>
            ) : (
              filtered.map((o) => {
                const id = getId(o);
                const selectedId = getId(selected);
                const isSelected = id && selectedId && id === selectedId;

                return (
                  <div
                    key={id || Math.random()}
                    onClick={() => setSelected(o)}
                    className={[
                      'relative cursor-pointer overflow-hidden bg-white rounded-xl shadow-md p-5 w-full',
                      'transition-transform duration-200 ease-out',
                      'hover:-translate-y-1 hover:shadow-xl hover:scale-[1.01]',
                      'ring-1 ring-transparent hover:ring-2 hover:ring-purple-200',
                      isSelected ? 'ring-2 ring-purple-400' : '',
                      'before:content-[""] before:absolute before:inset-0',
                      'before:bg-gradient-to-r before:from-purple-200/30 before:to-transparent',
                      'before:opacity-0 hover:before:opacity-100',
                      'before:transition-opacity before:duration-200',
                    ].join(' ')}
                  >
                    <div className="relative z-10 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500">
                          {fmtDate(o?.createdAt || o?.dataCriacao)}
                        </div>

                        <h5 className="mt-1 text-base font-semibold text-gray-900 truncate">
                          {o?.titulo || 'Sem título'}
                        </h5>

                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Cliente:</span>{' '}
                          {o?.clienteNome || '—'}
                        </div>

                        <div className="mt-1 text-sm text-gray-600">
                          <span className="font-medium">Obra:</span>{' '}
                          {o?.obraNomeSnapshot || (o?.obraId ? `#${String(o.obraId).slice(-6)}` : 'Sem obra')}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="text-sm">
                            <span className="text-gray-500">Total</span>
                            <div className="font-semibold text-gray-900">
                              {fmtMoney(o?.total || o?.totals?.total)}
                            </div>
                          </div>

                          <span className="text-purple-700">
                            <i className="fa-solid fa-arrow-right-long opacity-70"></i>
                          </span>
                        </div>
                      </div>

                      {/* Delete (não dispara o click do card) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteOrcamento(o);
                        }}
                        className="p-2 rounded-full bg-red-100 text-red-700 hover:bg-red-200 shrink-0"
                        title="Eliminar orçamento"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>

                    <div className="relative z-10 mt-4 text-xs text-gray-500">
                      Clique para ver detalhes
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-gray-900">Detalhes</h4>
              {selected && (
                <button
                  onClick={() => setSelected(null)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                  title="Fechar"
                >
                  Fechar
                </button>
              )}
            </div>

            {!selected ? (
              <div className="mt-4 text-sm text-gray-600">
                Seleciona um orçamento para ver os detalhes.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-xs text-gray-500">Título</div>
                  <div className="font-medium text-gray-900">{selected?.titulo || '—'}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Cliente</div>
                  <div className="text-sm text-gray-900">
                    {selected?.clienteNome || '—'}{' '}
                    {selected?.clienteContacto ? (
                      <span className="text-gray-500">({selected.clienteContacto})</span>
                    ) : null}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Obra</div>
                  <div className="text-sm text-gray-900">
                    {selected?.obraNomeSnapshot || (selected?.obraId ? String(selected.obraId) : 'Sem obra')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <MiniStat label="Subtotal" value={fmtMoney(selected?.subtotal || selected?.totals?.subtotal)} />
                  <MiniStat label="IVA" value={fmtMoney(selected?.totalIva || selected?.totals?.iva)} />
                  <MiniStat label="Total" value={fmtMoney(selected?.total || selected?.totals?.total)} />
                  <MiniStat label="Linhas" value={String((selected?.linhas || []).length)} />
                </div>

                {/* ✅ NOVO: Enviar por Email */}
                <div className="pt-2">
                  <div className="text-xs text-gray-500 mb-2">Enviar por email</div>

                  <div className="flex flex-col gap-2">
                    <input
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="ex: cliente@email.com"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                    />

                    <button
                      type="button"
                      onClick={sendEmail}
                      disabled={sendingEmail}
                      className={`w-full px-4 py-2 rounded-md text-white ${
                        sendingEmail ? 'bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                    >
                      {sendingEmail ? 'A enviar...' : 'Enviar Orçamento'}
                    </button>

                    {emailMsg ? (
                      <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-md p-2">
                        {emailMsg}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-xs text-gray-500 mb-2">Linhas</div>
                  <div className="max-h-[45vh] overflow-auto rounded-lg border border-gray-200">
                    {(selected?.linhas || []).length === 0 ? (
                      <div className="px-3 py-3 text-sm text-gray-600">Sem linhas.</div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qtd</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Preço</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(selected?.linhas || []).map((l, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {l?.descricao || '—'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-700 text-right">
                                {Number(l?.quantidade ?? 0)}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-700 text-right">
                                {fmtMoney(l?.precoUnitario ?? l?.precoUnit ?? 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {selected?.notas ? (
                  <div className="pt-2">
                    <div className="text-xs text-gray-500">Notas</div>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap">{selected.notas}</div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}
