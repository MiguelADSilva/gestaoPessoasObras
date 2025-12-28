'use client';
import React from 'react';

export default function OrcamentoBuilder({
  obra = null,
  onBack,
  orcamentoId = null, // ✅ passa este id quando queres editar
  initialOrcamento = null, // ✅ ou passa o objeto orçamento (opcional)
}) {
  const [orcId, setOrcId] = React.useState(
    orcamentoId || initialOrcamento?._id || initialOrcamento?.id || null
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const makeRowId = () =>
    (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);

  function novaLinhaVazia() {
    return {
      id: makeRowId(),
      materialId: null,
      descricao: '',
      unidade: 'un',
      quantidade: 1,
      precoUnitario: 0,
      iva: 23,
    };
  }

  // Cabeçalho / cliente
  const [meta, setMeta] = React.useState({
    titulo: obra ? `Orçamento - ${obra?.nome || 'Obra'}` : 'Orçamento (sem obra)',
    clienteNome: '',
    clienteContacto: '',
    notas: '',
    descontoPercent: 0,
  });

  // Linhas
  const [linhas, setLinhas] = React.useState([novaLinhaVazia()]);

  // Modal materiais
  const [matModal, setMatModal] = React.useState(false);
  const [matLoading, setMatLoading] = React.useState(false);
  const [matError, setMatError] = React.useState('');
  const [matQ, setMatQ] = React.useState('');
  const [materiais, setMateriais] = React.useState([]);

  // ✅ Carregar orçamento para edição (via id ou initialOrcamento)
  React.useEffect(() => {
    let ignore = false;

    const hydrate = (orc) => {
      const tituloDefault = obra ? `Orçamento - ${obra?.nome || 'Obra'}` : 'Orçamento (sem obra)';

      const descontoPercent = Number(
        orc?.descontoPercent ??
          orc?.descontoPct ??
          orc?.descontoPerc ??
          orc?.discountPercent ??
          0
      );

      setMeta({
        titulo: (orc?.titulo || tituloDefault),
        clienteNome: (orc?.clienteNome || ''),
        clienteContacto: (orc?.clienteContacto || ''),
        notas: (orc?.notas || ''),
        descontoPercent: Number.isFinite(descontoPercent) ? descontoPercent : 0,
      });

      const ls = Array.isArray(orc?.linhas) ? orc.linhas : [];
      const linhasHidratadas = ls.length
        ? ls.map((l) => ({
            id: makeRowId(),
            materialId: l?.materialId || null,
            descricao: l?.descricao || '',
            unidade: l?.unidade || 'un',
            quantidade: Number(l?.quantidade ?? 0),
            precoUnitario: Number(l?.precoUnitario ?? l?.precoUnit ?? 0),
            iva: Number(l?.iva ?? 23),
          }))
        : [novaLinhaVazia()];

      setLinhas(linhasHidratadas);
    };

    async function loadById(id) {
      try {
        setError('');
        const res = await fetch(`/api/orcamentos/${id}`, { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) throw new Error(data?.error || 'Erro ao carregar orçamento.');

        if (ignore) return;
        setOrcId(data?._id || data?.id || id);
        hydrate(data);
      } catch (e) {
        if (ignore) return;
        setError(e?.message || 'Erro ao carregar orçamento.');
      }
    }

    // prioridade: initialOrcamento
    if (initialOrcamento) {
      hydrate(initialOrcamento);
      const id = initialOrcamento?._id || initialOrcamento?.id || null;
      if (id) setOrcId(id);
      return () => {
        ignore = true;
      };
    }

    // senão: orcamentoId
    if (orcamentoId) {
      loadById(orcamentoId);
    }

    return () => {
      ignore = true;
    };
  }, [orcamentoId, initialOrcamento, obra]);

  const subtotal = React.useMemo(() => {
    return linhas.reduce(
      (acc, l) => acc + (Number(l.quantidade) || 0) * (Number(l.precoUnitario) || 0),
      0
    );
  }, [linhas]);

  const totalIva = React.useMemo(() => {
    return linhas.reduce((acc, l) => {
      const base = (Number(l.quantidade) || 0) * (Number(l.precoUnitario) || 0);
      const iva = Number(l.iva) || 0;
      return acc + base * (iva / 100);
    }, 0);
  }, [linhas]);

  const descontoValor = React.useMemo(() => {
    const p = Number(meta.descontoPercent) || 0;
    return (subtotal + totalIva) * (p / 100);
  }, [meta.descontoPercent, subtotal, totalIva]);

  const total = React.useMemo(() => {
    return subtotal + totalIva - descontoValor;
  }, [subtotal, totalIva, descontoValor]);

  const setLinha = (id, patch) => {
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const addLinha = () => setLinhas((prev) => [...prev, novaLinhaVazia()]);
  const removeLinha = (id) => setLinhas((prev) => prev.filter((l) => l.id !== id));

  const fetchMateriais = React.useCallback(async () => {
    setMatLoading(true);
    setMatError('');
    try {
      const params = new URLSearchParams();
      if (matQ.trim()) params.set('q', matQ.trim());
      params.set('limit', '50');

      const res = await fetch(`/api/materiais?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erro ao carregar materiais.');
      setMateriais(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setMateriais([]);
      setMatError(e?.message || 'Erro ao carregar materiais.');
    } finally {
      setMatLoading(false);
    }
  }, [matQ]);

  React.useEffect(() => {
    if (!matModal) return;
    fetchMateriais();
  }, [matModal, fetchMateriais]);

  const addMaterialAsLinha = (m) => {
    const linha = {
      ...novaLinhaVazia(),
      materialId: m?._id || null,
      descricao: [m?.nome, m?.marca].filter(Boolean).join(' - ') || m?.nome || '',
      unidade: m?.unidade || 'un',
      quantidade: 1,
      precoUnitario: Number(m?.precoVenda ?? 0),
      iva: Number(m?.iva ?? 23),
    };
    setLinhas((prev) => [...prev, linha]);
    setMatModal(false);
  };

  const guardarRascunho = async () => {
    setSaving(true);
    setError('');

    try {
      // ✅ normaliza linhas (sem NaN)
      const linhasNormalizadas = linhas.map((l) => {
        const q = Number(l.quantidade);
        const pu = Number(l.precoUnitario);
        const iv = Number(l.iva);

        const quantidade = Number.isFinite(q) ? q : 0;
        const precoUnitario = Number.isFinite(pu) ? pu : 0;
        const iva = Number.isFinite(iv) ? iv : 0;

        const totalLinha = quantidade * precoUnitario;

        return {
          materialId: l.materialId || null,
          descricao: (l.descricao || '').trim(),
          unidade: (l.unidade || 'un').trim(),
          quantidade,
          precoUnitario,
          iva,
          totalLinha: Number.isFinite(totalLinha) ? totalLinha : 0,
        };
      });

      const subtotalCalc = linhasNormalizadas.reduce(
        (acc, l) => acc + Number(l.quantidade) * Number(l.precoUnitario),
        0
      );

      const totalIvaCalc = linhasNormalizadas.reduce((acc, l) => {
        const base = Number(l.quantidade) * Number(l.precoUnitario);
        return acc + base * ((Number(l.iva) || 0) / 100);
      }, 0);

      const descontoP = Number(meta.descontoPercent);
      const descontoPercent = Number.isFinite(descontoP) ? descontoP : 0;

      const totalAntesDesconto = subtotalCalc + totalIvaCalc;
      const descontoValorCalc = totalAntesDesconto * (descontoPercent / 100);
      const totalCalc = totalAntesDesconto - descontoValorCalc;

      const payload = {
        obraId: obra?._id || obra?.id || null,
        obraNomeSnapshot: obra?.nome || undefined,

        titulo: (meta.titulo || '').trim() || 'Orçamento',
        clienteNome: (meta.clienteNome || '').trim(),
        clienteContacto: (meta.clienteContacto || '').trim(),
        notas: (meta.notas || '').trim(),

        descontoPercent,
        estado: 'rascunho',

        linhas: linhasNormalizadas,

        subtotal: Number.isFinite(subtotalCalc) ? subtotalCalc : 0,
        totalIva: Number.isFinite(totalIvaCalc) ? totalIvaCalc : 0,
        total: Number.isFinite(totalCalc) ? totalCalc : 0,
      };

      const isEdit = !!orcId;
      const url = isEdit ? `/api/orcamentos/${orcId}` : `/api/orcamentos`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erro ao guardar orçamento.');

      const newId = data?._id || data?.id || orcId;
      if (newId) setOrcId(newId);
    } catch (e) {
      setError(e?.message || 'Erro ao guardar orçamento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {obra ? `Orçamento para: ${obra?.nome || 'Obra'}` : 'Orçamento sem obra'}
          </h3>
          <p className="text-sm text-gray-600">
            {orcId ? `A editar (#${String(orcId).slice(-6)})` : 'Novo orçamento'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Voltar
          </button>

          <button
            onClick={() => setMatModal(true)}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            + Materiais
          </button>

          <button
            onClick={addLinha}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            + Linha
          </button>

          <button
            onClick={guardarRascunho}
            disabled={saving}
            className={`px-4 py-2 rounded-md text-white ${
              saving ? 'bg-gray-400' : 'bg-gray-900 hover:bg-gray-800'
            }`}
          >
            {saving ? 'A guardar…' : 'Guardar'}
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

      {/* Meta */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Título">
          <input
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            value={meta.titulo}
            onChange={(e) => setMeta({ ...meta, titulo: e.target.value })}
          />
        </Field>

        <Field label="Desconto global (%)">
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            value={meta.descontoPercent}
            onChange={(e) => setMeta({ ...meta, descontoPercent: e.target.value })}
          />
        </Field>

        <Field label="Cliente (nome)">
          <input
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            value={meta.clienteNome}
            onChange={(e) => setMeta({ ...meta, clienteNome: e.target.value })}
          />
        </Field>

        <Field label="Cliente (contacto)">
          <input
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            value={meta.clienteContacto}
            onChange={(e) => setMeta({ ...meta, clienteContacto: e.target.value })}
          />
        </Field>

        <div className="md:col-span-2">
          <Field label="Notas">
            <textarea
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              value={meta.notas}
              onChange={(e) => setMeta({ ...meta, notas: e.target.value })}
            />
          </Field>
        </div>
      </div>

      {/* Linhas */}
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full table-fixed border-separate border-spacing-0">
          <thead className="bg-gray-50">
            <tr>
              <Th w="w-[40%]">Descrição</Th>
              <Th w="w-[10%]">Qtd</Th>
              <Th w="w-[10%]">Unid</Th>
              <Th w="w-[15%]">Preço</Th>
              <Th w="w-[10%]">IVA%</Th>
              <Th w="w-[15%]">Total</Th>
              <Th w="w-[90px]">Ações</Th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {linhas.map((l) => {
              const lineTotal = (Number(l.quantidade) || 0) * (Number(l.precoUnitario) || 0);
              return (
                <tr key={l.id} className="align-middle">
                  <Td>
                    <input
                      className="w-full border border-gray-200 rounded-md px-2 py-2 focus:ring-blue-500 focus:border-blue-500"
                      value={l.descricao}
                      onChange={(e) => setLinha(l.id, { descricao: e.target.value })}
                      placeholder="Ex: Mão de obra / Cabo 3G2.5..."
                    />
                  </Td>

                  <Td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full border border-gray-200 rounded-md px-2 py-2 focus:ring-blue-500 focus:border-blue-500"
                      value={l.quantidade}
                      onChange={(e) => setLinha(l.id, { quantidade: e.target.value })}
                    />
                  </Td>

                  <Td>
                    <select
                      className="w-full border border-gray-200 rounded-md px-2 py-2 focus:ring-blue-500 focus:border-blue-500"
                      value={l.unidade}
                      onChange={(e) => setLinha(l.id, { unidade: e.target.value })}
                    >
                      <option value="un">un</option>
                      <option value="m">m</option>
                      <option value="rolo">rolo</option>
                      <option value="cx">cx</option>
                      <option value="kg">kg</option>
                      <option value="pack">pack</option>
                    </select>
                  </Td>

                  <Td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full border border-gray-200 rounded-md px-2 py-2 focus:ring-blue-500 focus:border-blue-500"
                      value={l.precoUnitario}
                      onChange={(e) => setLinha(l.id, { precoUnitario: e.target.value })}
                    />
                  </Td>

                  <Td>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      className="w-full border border-gray-200 rounded-md px-2 py-2 focus:ring-blue-500 focus:border-blue-500"
                      value={l.iva}
                      onChange={(e) => setLinha(l.id, { iva: e.target.value })}
                    />
                  </Td>

                  <Td>
                    <div className="text-sm font-medium text-gray-900">{lineTotal.toFixed(2)} €</div>
                  </Td>

                  <Td>
                    <button
                      onClick={() => removeLinha(l.id)}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                      title="Remover linha"
                      aria-label="Remover linha"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totais */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
          Dica: usa “+ Materiais” para puxar preços automaticamente.
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">{subtotal.toFixed(2)} €</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-600">IVA</span>
            <span className="font-medium text-gray-900">{totalIva.toFixed(2)} €</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-600">Desconto</span>
            <span className="font-medium text-gray-900">- {descontoValor.toFixed(2)} €</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-semibold text-gray-900">{total.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* Modal Materiais */}
      {matModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Adicionar Material</h4>
                <p className="text-sm text-gray-600">
                  Escolhe um material para criar uma linha automaticamente.
                </p>
              </div>
              <button
                onClick={() => setMatModal(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Fechar"
                title="Fechar"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <input
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Pesquisar (nome, marca, referência...)"
                value={matQ}
                onChange={(e) => setMatQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchMateriais()}
              />
              <button
                onClick={fetchMateriais}
                className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800"
              >
                Pesquisar
              </button>
            </div>

            {matError && (
              <div className="mt-3 rounded-md bg-red-50 text-red-700 p-3 text-sm">
                <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                {matError}
              </div>
            )}

            <div className="mt-4 max-h-[55vh] overflow-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Material
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ref.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Preço
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {matLoading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                        A carregar…
                      </td>
                    </tr>
                  ) : materiais.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                        Sem resultados.
                      </td>
                    </tr>
                  ) : (
                    materiais.map((m) => (
                      <tr key={m._id} className="align-middle">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{m?.nome || '—'}</div>
                          {m?.marca ? <div className="text-sm text-gray-500">{m.marca}</div> : null}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{m?.referencia || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {Number(m?.precoVenda ?? 0).toFixed(2)} €
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => addMaterialAsLinha(m)}
                            className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm"
                          >
                            Adicionar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setMatModal(false)}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Helpers */
function Th({ children, w }) {
  return (
    <th className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase ${w || ''}`}>
      {children}
    </th>
  );
}
function Td({ children }) {
  return <td className="px-3 py-3 align-middle">{children}</td>;
}
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
