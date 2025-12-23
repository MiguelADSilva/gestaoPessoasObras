import mongoose from 'mongoose';

const LinhaOrcamentoSchema = new mongoose.Schema(
  {
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' }, // opcional
    descricao: { type: String, required: true },
    quantidade: { type: Number, required: true, min: 0 },
    unidade: { type: String, default: 'un' },
    precoUnitario: { type: Number, required: true, min: 0 },
    iva: { type: Number, default: 23 }, // %
    totalLinha: { type: Number, required: true },
  },
  { _id: false }
);

const OrcamentoSchema = new mongoose.Schema(
  {
    // ligação opcional à obra
    obraId: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra', default: null },
    obraNomeSnapshot: { type: String }, // guarda o nome no momento

    // dados do orçamento
    titulo: { type: String, default: 'Orçamento' },
    clienteNome: { type: String },
    clienteContacto: { type: String },

    linhas: { type: [LinhaOrcamentoSchema], default: [] },

    subtotal: { type: Number, default: 0 },
    totalIva: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    estado: {
      type: String,
      enum: ['rascunho', 'enviado', 'aceite', 'rejeitado'],
      default: 'rascunho',
    },

    notas: { type: String },

    criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.Orcamento ||
  mongoose.model('Orcamento', OrcamentoSchema);
