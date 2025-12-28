import mongoose from "mongoose";

const LinhaSchema = new mongoose.Schema(
  {
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: "Material", default: null },
    descricao: { type: String, default: "" },
    unidade: { type: String, default: "un" },
    quantidade: { type: Number, default: 0 },
    precoUnitario: { type: Number, default: 0 },
    iva: { type: Number, default: 23 },
    totalLinha: { type: Number, default: 0 },
  },
  { _id: false }
);

const OrcamentoSchema = new mongoose.Schema(
  {
    obraId: { type: mongoose.Schema.Types.ObjectId, ref: "Obra", default: null },
    obraNomeSnapshot: { type: String, default: "" },

    titulo: { type: String, default: "Orçamento" },
    clienteNome: { type: String, default: "" },
    clienteContacto: { type: String, default: "" },
    notas: { type: String, default: "" },

    // ✅ IMPORTANTE: este campo tem de existir no schema
    descontoPercent: { type: Number, default: 0 },

    estado: { type: String, default: "rascunho" },

    linhas: { type: [LinhaSchema], default: [] },

    subtotal: { type: Number, default: 0 },
    totalIva: { type: Number, default: 0 },

    // ✅ total FINAL (já com desconto aplicado)
    total: { type: Number, default: 0 },

    criadoPor: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Orcamento || mongoose.model("Orcamento", OrcamentoSchema);
