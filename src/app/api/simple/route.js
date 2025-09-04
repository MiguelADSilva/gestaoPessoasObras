import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔄 Testando conexão com MongoDB...');
    
    const { db } = await connectToDatabase();
    
    // Testar conexão
    await db.command({ ping: 1 });
    console.log('✅ MongoDB conectado com sucesso!');
    
    // Listar coleções
    const collections = await db.listCollections().toArray();
    console.log('📋 Coleções:', collections.map(c => c.name));
    
    return NextResponse.json({
      status: 'connected',
      collections: collections.map(c => c.name)
    });
    
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    
    return NextResponse.json(
      {
        status: 'disconnected',
        error: error.message,
        suggestion: 'Verifique se MongoDB está rodando e URI está correta'
      },
      { status: 500 }
    );
  }
}