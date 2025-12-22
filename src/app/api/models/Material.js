// src/models/Material.js
import mongoose from 'mongoose';

const MaterialSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    categoria: { type: String, default: 'geral', trim: true }, // ex: "cabos", "disjuntores", "tubagem"
    marca: { type: String, default: '', trim: true },
    referencia: { type: String, default: '', trim: true }, // SKU / referência fornecedor

    unidade: { type: String, default: 'un', trim: true }, // un, m, rolo, cx, etc.
    iva: { type: Number, default: 23 }, // PT: 23 por defeito

    precoCompra: { type: Number, default: 0 },
    precoVenda: { type: Number, default: 0 },

    stockAtual: { type: Number, default: 0 },

    fornecedor: { type: String, default: '', trim: true },
    notas: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

// Índices úteis (pesquisa rápida)
MaterialSchema.index({ nome: 'text', referencia: 'text', marca: 'text', categoria: 'text' });

export default mongoose.models.Material || mongoose.model('Material', MaterialSchema);