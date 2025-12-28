'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';

// ⚠️ MUDA ESTE IMPORT PARA O CAMINHO REAL DO TEU OrcamentoBuilder
// Opção A (recomendado): se tiveres OrcamentoBuilder em src/components/OrcamentoBuilder.jsx
import OrcamentoBuilder from '../orcamentoBuilder/orcamentoBuilder';

// Se o teu builder estiver noutro sítio, usa caminho relativo, por ex:
// import OrcamentoBuilder from '../../../components/OrcamentoBuilder';

export default function EditarOrcamentoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [orc, setOrc] = React.useState(null);

  React.useEffect(() => {
    if (!id) return;

    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`/api/orcamentos/${id}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Erro ao carregar orçamento.');

        if (mounted) setOrc(data);
      } catch (e) {
        if (mounted) setError(e?.message || 'Erro ao carregar orçamento.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-600">
        A carregar orçamento...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 text-red-700 p-3 text-sm">{error}</div>
        <button
          className="mt-4 px-4 py-2 rounded-md border border-gray-300"
          onClick={() => router.back()}
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Passamos o orçamento carregado ao builder para entrar em modo edição */}
      <OrcamentoBuilder
        obra={null}
        initialOrcamento={orc}
        onBack={() => router.back()}
      />
    </div>
  );
}
