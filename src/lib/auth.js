import jwt from 'jsonwebtoken';
import { connectToDatabase } from './database';

export async function authenticateToken(request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Token de autenticação não fornecido' };
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar se usuário ainda existe
    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({
      _id: new ObjectId(decoded.userId)
    });

    if (!user || user.estado !== 'ativo') {
      return { error: 'Utilizador não encontrado ou inativo' };
    }

    return { user: { ...user, _id: user._id.toString() } };

  } catch (error) {
    return { error: 'Token inválido ou expirado' };
  }
}