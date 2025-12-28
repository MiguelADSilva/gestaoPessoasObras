'use client';
import React from 'react';

/**
 * OrcamentoBuilder (novo + editar)
 * - Suporta: criar / editar (PUT) com orcamentoId ou initialOrcamento
 * - Suporta descontoPercent (guarda e recalcula total)
 * - ✅ Suporta checkbox "Empresa com autoliquidação" -> IVA = 0 e Total = Subtotal (antes do desconto)
 *
 * NOTA IMPORTANTE (erro 405):
 * Este componente faz fetch para /api/orcamentos e /api/orcamentos/:id
 * Confirma que tens as rotas API aqui:
 *   /app/api/orcamentos/route.js            (GET, POST)
 *   /app/api/orcamentos/[id]/route.js      (GET, PUT, DELETE)
 */

export default function OrcamentoBuilder({
  obra = null,
  onBack,
  orcamentoId = null,
  initialOrcamento = null,
  apiBase = '/api/orcamentos', // se o teu endpoint for diferente, muda aqui
}) {
  const [orcId, setOrcId] = React.useState(
    orcamentoId || initialOrcamento?._id || initialOrcamento?.id || null
  );

  const [saving, setSaving] = React.useState(false);
  const [loadingOrc, setLoadingOrc] = React.useState(false);
  const [error, setError] = React.useState('');

  // Cabeçalho / cliente / opções
  const [meta, setMeta] = React.useState({
    titulo: obra ? `Orçamento - ${obra?.nome || 'Obra'}` : 'Orçamento (sem obra)',
    clienteNome: '',
    clienteContacto: '',
    notas: '',
    descontoPercent: 0,
    autoliquidacao: false, // ✅ NOVO
  });

  function newRowId() {
    return (
      (globalThis.crypto?.randomUUID && globalThis.crypto.randomUUID()) ||
      String(Date.now() + Math.random())
    );
  }

  function novaLinhaVazia() {
    return {
      id: newRowId(),
      materialId: null,
      descricao: '',
      unidade: 'un',
      quantidade: 1,
      precoUnitario: 0,
      iva: 23,
    };
  }

  // Linhas
  const [linhas, setLinhas] = React.useState([novaLinhaVazia()]);

  // Modal materiais
  const [matModal, setMatModal] = React.useState(false);
  const [matLoading, setMatLoading] = React.useState(false);
  const [matError, setMatError] = React.useState('');
  const [matQ, setMatQ] = React.useState('');
  const [materiais, setMateriais] = React.useState([]);

  // ---------------------------
  // Helpers
  // ---------------------------
  const toNum = (v, fallback = 0) => {
    const n = Number(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : fallback;
  };

  const money = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return '—';
    return `${v.toFixed(2)} €`;
  };

  // ---------------------------
  // Hydrate (editar)
  // ---------------------------
  React.useEffect(() => {
    let ignore = false;

    const hydrate = (orc) => {
      const tituloDefault = obra ? `Orçamento - ${obra?.nome || 'Obra'}` : 'Orçamento (sem obra)';

      const descontoPercent = toNum(
        orc?.descontoPercent ??
          orc?.descontoPct ??
          orc?.descontoPerc ??
          orc?.discountPercent ??
          0,
        0
      );

      const autoliquidacao = !!(
        orc?.autoliquidacao ??
        orc?.autoLiquidacao ??
        orc?.empresaAutoliquidacao ??
        false
      );

      setMeta({
        titulo: orc?.titulo || tituloDefault,
        clienteNome: orc?.clienteNome || '',
        clienteContacto: orc?.clienteContacto || '',
        notas: orc?.notas || '',
        descontoPercent: Number.isFinite(descontoPercent) ? descontoPercent : 0,
        autoliquidacao,
      });

      const ls = Array.isArray(orc?.linhas) ? orc.linhas : [];
      const linhasHidratadas = ls.length
        ? ls.map((l) => ({
            id: newRowId(),
            materialId: l?.materialId || null,
            descricao: l?.descricao || '',
            unidade: l?.unidade || 'un',
            quantidade: toNum(l?.quantidade, 0),
            precoUnitario: toNum(l?.precoUnitario ?? l?.precoUnit, 0),
            iva: autoliquidacao ? 0 : toNum(l?.iva ?? 23, 23),
          }))
        : [novaLinhaVazia()];

      setLinhas(linhasHidratadas);
    };

    async function loadById(id) {
      setLoadingOrc(true);
      setError('');
      try {
        const res = await fetch(`${apiBase}/${id}`, { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) throw new Error(data?.error || 'Erro ao carregar orçamento.');

        if (ignore) return;
        setOrcId(data?._id || data?.id || id);
        hydrate(data);
      } catch (e) {
        if (!ignore) setError(e?.message || 'Erro ao carregar orçamento.');
      } finally {
        if (!ignore) setLoadingOrc(false);
      }
    }

    if (initialOrcamento) {
      hydrate(initialOrcamento);
      const id = initialOrcamento?._id || initialOrcamento?.id || null;
      if (id) setOrcId(id);
      return () => {
        ignore = true;
      };
    }

    if (orcamentoId) loadById(orcamentoId);

    return () => {
      ignore = true;
    };
  }, [orcamentoId, initialOrcamento, obra, apiBase]);

  // ---------------------------
  // Regras autoliquidação
  // - se activar: forçar IVA=0 nas linhas
  // ---------------------------
  React.useEffect(() => {
    if (!meta.autoliquidacao) return;
    setLinhas((prev) => prev.map((l) => ({ ...l, iva: 0 })));
  }, [meta.autoliquidacao]);

  // ---------------------------
  // Totais
  // ---------------------------
  const subtotal = React.useMemo(() => {
    return linhas.reduce((acc, l) => acc + toNum(l.quantidade, 0) * toNum(l.precoUnitario, 0), 0);
  }, [linhas]);

  const totalIva = React.useMemo(() => {
    if (meta.autoliquidacao) return 0; // ✅ IVA 0
    return linhas.reduce((acc, l) => {
      const base = toNum(l.quantidade, 0) * toNum(l.precoUnitario, 0);
      const iva = toNum(l.iva, 0);
      return acc + base * (iva / 100);
    }, 0);
  }, [linhas, meta.autoliquidacao]);

  const totalAntesDesconto = React.useMemo(() => subtotal + totalIva, [subtotal, totalIva]);

  const descontoValor = React.useMemo(() => {
    const p = toNum(meta.descontoPercent, 0);
    return totalAntesDesconto * (p / 100);
  }, [meta.descontoPercent, totalAntesDesconto]);

  const total = React.useMemo(() => {
    const v = totalAntesDesconto - descontoValor;
    return v < 0 ? 0 : v;
  }, [totalAntesDesconto, descontoValor]);

  // ---------------------------
  // Linhas CRUD
  // ---------------------------
  const setLinha = (id, patch) => {
    setLinhas((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
  };

  const addLinha = () => setLinhas((prev) => [...prev, novaLinhaVazia()]);
  const removeLinha = (id) => setLinhas((prev) => prev.filter((l) => l.id !== id));

  // ---------------------------
  // Materiais
  // ---------------------------
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
      precoUnitario: toNum(m?.precoVenda ?? 0, 0),
      iva: meta.autoliquidacao ? 0 : toNum(m?.iva ?? 23, 23),
    };
    setLinhas((prev) => [...prev, linha]);
    setMatModal(false);
  };

  // ---------------------------
  // Guardar (POST/PUT)
  // ---------------------------
  const guardar = async () => {
    setSaving(true);
    setError('');

    try {
      // normaliza linhas
      const linhasNormalizadas = (linhas || []).map((l) => {
        const quantidade = toNum(l.quantidade, 0);
        const precoUnitario = toNum(l.precoUnitario, 0);
        const ivaPct = meta.autoliquidacao ? 0 : toNum(l.iva, 0);

        const totalLinha = quantidade * precoUnitario;

        return {
          materialId: l.materialId || null,
          descricao: (l.descricao || '').trim(),
          unidade: (l.unidade || 'un').trim(),
          quantidade,
          precoUnitario,
          iva: ivaPct,
          totalLinha: Number.isFinite(totalLinha) ? totalLinha : 0,
        };
      });

      // recalcula totals finais (server deve validar também)
      const subtotalCalc = linhasNormalizadas.reduce(
        (acc, l) => acc + toNum(l.quantidade, 0) * toNum(l.precoUnitario, 0),
        0
      );

      const ivaCalc = meta.autoliquidacao
        ? 0
        : linhasNormalizadas.reduce((acc, l) => {
            const base = toNum(l.quantidade, 0) * toNum(l.precoUnitario, 0);
            return acc + base * (toNum(l.iva, 0) / 100);
          }, 0);

      const totalAntes = subtotalCalc + ivaCalc;
      const descontoPercent = toNum(meta.descontoPercent, 0);
      const descontoVal = totalAntes * (descontoPercent / 100);
      const totalCalc = Math.max(0, totalAntes - descontoVal);

      const payload = {
        obraId: obra?._id || obra?.id || null,
        obraNomeSnapshot: obra?.nome || undefined,

        titulo: (meta.titulo || '').trim() || 'Orçamento',
        clienteNome: (meta.clienteNome || '').trim(),
        clienteContacto: (meta.clienteContacto || '').trim(),
        notas: (meta.notas || '').trim(),

        // ✅ guarda isto no documento
        descontoPercent,
        autoliquidacao: !!meta.autoliquidacao,

        estado: 'rascunho',

        linhas: linhasNormalizadas,

        subtotal: Number.isFinite(subtotalCalc) ? subtotalCalc : 0,
        totalIva: Number.isFinite(ivaCalc) ? ivaCalc : 0,
        total: Number.isFinite(totalCalc) ? totalCalc : 0,
      };

      const isEdit = !!orcId;
      const url = isEdit ? `${apiBase}/${orcId}` : `${apiBase}`;
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

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {obra ? `Orçamento para: ${obra?.nome || 'Obra'}` : 'Orçamento sem obra'}
          </h3>

          <p className="text-sm text-gray-600">
            {loadingOrc
              ? 'A carregar orçamento...'
              : orcId
              ? `A editar (#${String(orcId).slice(-6)})`
              : 'Novo orçamento'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={() => setMatModal(true)}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            + Materiais
          </button>

          <button
            type="button"
            onClick={addLinha}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            + Linha
          </button>

          <button
            type="button"
            onClick={guardar}
            disabled={saving || loadingOrc}
            className={`px-4 py-2 rounded-md text-white ${
              saving || loadingOrc ? 'bg-gray-400' : 'bg-gray-900 hover:bg-gray-800'
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
            onChange={(e) => setMeta((p) => ({ ...p, titulo: e.target.value }))}
          />
        </Field>

        <Field label="Desconto global (%)">
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            value={meta.descontoPercent}
            onChange={(e) => setMeta((p) => ({ ...p, descontoPercent: e.target.value }))}
          />
        </Field>

        <Field label="Cliente (nome)">
          <input
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            value={meta.clienteNome}
            onChange={(e) => setMeta((p) => ({ ...p, clienteNome: e.target.value }))}
          />
        </Field>

        <Field label="Cliente (contacto)">
          <input
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            value={meta.clienteContacto}
            onChange={(e) => setMeta((p) => ({ ...p, clienteContacto: e.target.value }))}
          />
        </Field>

        {/* ✅ Autoliquidação */}
        <div className="md:col-span-2">
          <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-3 bg-gray-50">
            <input
              type="checkbox"
              checked={!!meta.autoliquidacao}
              onChange={(e) =>
                setMeta((p) => ({
                  ...p,
                  autoliquidacao: e.target.checked,
                }))
              }
            />
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900">
                Empresa com autoliquidação (IVA a 0%)
              </div>
              <div className="text-xs text-gray-600">
                Se ativares, o IVA passa a 0% em todas as linhas e o total (antes do desconto) fica igual ao subtotal.
              </div>
            </div>
          </label>
        </div>

        <div className="md:col-span-2">
          <Field label="Notas">
            <textarea
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              value={meta.notas}
              onChange={(e) => setMeta((p) => ({ ...p, notas: e.target.value }))}
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
              const q = toNum(l.quantidade, 0);
              const pu = toNum(l.precoUnitario, 0);
              const lineBase = q * pu;
              const ivaPct = meta.autoliquidacao ? 0 : toNum(l.iva, 0);
              const lineIva = meta.autoliquidacao ? 0 : lineBase * (ivaPct / 100);
              const lineTotal = lineBase + lineIva;

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
                      disabled={meta.autoliquidacao}
                      className={`w-full border border-gray-200 rounded-md px-2 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                        meta.autoliquidacao ? 'bg-gray-100 text-gray-500' : ''
                      }`}
                      value={meta.autoliquidacao ? 0 : l.iva}
                      onChange={(e) => setLinha(l.id, { iva: e.target.value })}
                    />
                  </Td>

                  <Td>
                    <div className="text-sm font-medium text-gray-900">{money(lineTotal)}</div>
                    {!meta.autoliquidacao && ivaPct ? (
                      <div className="text-xs text-gray-500">
                        Base: {money(lineBase)} • IVA: {money(lineIva)}
                      </div>
                    ) : null}
                  </Td>

                  <Td>
                    <button
                      type="button"
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
            <span className="font-medium text-gray-900">{money(subtotal)}</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              IVA {meta.autoliquidacao ? '(autoliquidação)' : ''}
            </span>
            <span className="font-medium text-gray-900">{money(totalIva)}</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-600">Total s/ desconto</span>
            <span className="font-medium text-gray-900">{money(totalAntesDesconto)}</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-600">Desconto ({toNum(meta.descontoPercent, 0).toFixed(2)}%)</span>
            <span className="font-medium text-gray-900">- {money(descontoValor)}</span>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-semibold text-gray-900">{money(total)}</span>
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
                type="button"
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
                type="button"
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
                      IVA
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ação
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {matLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                        A carregar…
                      </td>
                    </tr>
                  ) : materiais.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
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
                          {money(toNum(m?.precoVenda ?? 0, 0))}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {meta.autoliquidacao ? '0%' : `${toNum(m?.iva ?? 23, 23)}%`}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
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
                type="button"
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

/* Helpers UI */
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
