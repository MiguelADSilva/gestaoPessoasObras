// models/Anotacao.js
import mongoose from 'mongoose';

const AnotacaoSchema = new mongoose.Schema({
  obra: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Obra',
    required: true
  },
  casa: {
    type: String,
    required: true,
    trim: true
  },
  // ... resto do schema igual ao anterior
});

export default mongoose.models.Anotacao || mongoose.model('Anotacao', AnotacaoSchema);