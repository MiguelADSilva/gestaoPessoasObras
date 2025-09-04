// models/Obra.js
import mongoose from 'mongoose';

const AnotacaoSchema = new mongoose.Schema({
  casa: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    enum: ['manutencao', 'reparacao', 'vistoria', 'observacao', 'outro'],
    default: 'observacao'
  },
  descricao: {
    type: String,
    required: true,
    maxlength: 1000
  },
  prioridade: {
    type: String,
    enum: ['baixa', 'media', 'alta', 'urgente'],
    default: 'media'
  },
  responsavel: {
    type: String,
    trim: true
  },
  dataPrevista: Date,
  dataConclusao: Date,
  estado: {
    type: String,
    enum: ['pendente', 'em_andamento', 'concluido', 'cancelado'],
    default: 'pendente'
  },
  custoEstimado: {
    type: Number,
    min: 0
  },
  imagens: [{
    url: String,
    descricao: String,
    dataUpload: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const ObraSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  localizacao: {
    type: String,
    required: true,
    trim: true
  },
  estadoObra: {
    type: String,
    enum: ['planeamento', 'andamento', 'concluida', 'suspensa'],
    default: 'planeamento'
  },
  dataInicio: {
    type: Date,
    default: Date.now
  },
  dataFimPrevista: Date,
  dataFimReal: Date,
  orcamentoTotal: {
    type: Number,
    min: 0
  },
  responsavelGeral: {
    type: String,
    trim: true
  },
  
  // Informações específicas para condomínios
  tipoObra: {
    type: String,
    enum: ['condominio', 'edificio', 'casa', 'comercial', 'outro'],
    default: 'condominio'
  },
  numeroCasas: {
    type: Number,
    min: 0,
    default: 0
  },
  casas: [{
    numero: {
      type: String,
      required: true,
      trim: true
    },
    tipo: {
      type: String,
      enum: ['t0', 't1', 't2', 't3', 't4', 'duplex', 'triplex', 'outro'],
      default: 't2'
    },
    area: Number,
    proprietario: {
      nome: String,
      contacto: String
    },
    observacoes: String
  }],
  
  // Array de anotações
  anotacoes: [AnotacaoSchema],
  
  // Métricas e estatísticas (calculadas automaticamente)
  metrics: {
    totalAnotacoes: {
      type: Number,
      default: 0
    },
    anotacoesPendentes: {
      type: Number,
      default: 0
    },
    anotacoesConcluidas: {
      type: Number,
      default: 0
    },
    custoTotalAnotacoes: {
      type: Number,
      default: 0
    }
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para atualizar métricas antes de salvar
ObraSchema.pre('save', function(next) {
  this.metrics.totalAnotacoes = this.anotacoes.length;
  this.metrics.anotacoesPendentes = this.anotacoes.filter(a => 
    a.estado === 'pendente' || a.estado === 'em_andamento'
  ).length;
  this.metrics.anotacoesConcluidas = this.anotacoes.filter(a => 
    a.estado === 'concluido'
  ).length;
  this.metrics.custoTotalAnotacoes = this.anotacoes.reduce(
    (total, anotacao) => total + (anotacao.custoEstimado || 0), 0
  );
  
  this.updatedAt = Date.now();
  next();
});

// Métodos de instância
ObraSchema.methods.adicionarAnotacao = function(anotacaoData) {
  this.anotacoes.push(anotacaoData);
  return this.save();
};

ObraSchema.methods.removerAnotacao = function(anotacaoId) {
  this.anotacoes.id(anotacaoId).remove();
  return this.save();
};

ObraSchema.methods.atualizarAnotacao = function(anotacaoId, dadosAtualizados) {
  const anotacao = this.anotacoes.id(anotacaoId);
  if (anotacao) {
    anotacao.set(dadosAtualizados);
    anotacao.updatedAt = Date.now();
  }
  return this.save();
};

ObraSchema.methods.obterAnotacoesPorCasa = function(casaNumero) {
  return this.anotacoes.filter(anotacao => 
    anotacao.casa === casaNumero
  );
};

ObraSchema.methods.obterAnotacoesPorEstado = function(estado) {
  return this.anotacoes.filter(anotacao => 
    anotacao.estado === estado
  );
};

// Índices para melhor performance
ObraSchema.index({ nome: 1, localizacao: 1 });
ObraSchema.index({ 'anotacoes.casa': 1 });
ObraSchema.index({ 'anotacoes.estado': 1 });
ObraSchema.index({ 'anotacoes.tipo': 1 });

export default mongoose.models.Obra || mongoose.model('Obra', ObraSchema);