import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

// No Netlify, não temos variável NODE_ENV='development' no build
// Precisamos de uma solução mais robusta
if (typeof window === 'undefined') {
  // Estamos no lado do servidor
  if (process.env.NODE_ENV === 'development') {
    // Modo desenvolvimento - usa global para hot reload
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    // Modo produção - nova conexão (Netlify functions são stateless)
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
} else {
  // Estamos no lado do cliente - não deve acontecer
  clientPromise = null;
}

// Função principal melhorada para Netlify
export async function connectToDatabase() {
  try {
    if (!clientPromise) {
      throw new Error('MongoDB client is not initialized');
    }
    
    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB || getDatabaseNameFromURI(uri);
    const db = client.db(dbName);
    
    return { client, db };
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error(`Failed to connect to database: ${error.message}`);
  }
}

// Helper function para extrair o nome do database da URI
function getDatabaseNameFromURI(mongoURI) {
  try {
    const url = new URL(mongoURI);
    // Remove a barra inicial do pathname
    return url.pathname.replace(/^\//, '');
  } catch (error) {
    // Fallback para URI antiga ou padrão
    const match = mongoURI.match(/\/([^/?]+)(\?|$)/);
    return match ? match[1] : 'test';
  }
}

// Export para compatibilidade
export default connectToDatabase;