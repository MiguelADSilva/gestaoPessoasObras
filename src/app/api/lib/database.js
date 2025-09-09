// src/app/api/lib/database.js
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('Falta MONGODB_URI no .env.local');

const DEFAULT_OPTS = {
  // evita ficar à espera para sempre se não consegue ligar
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 20000,
};

// cache global para evitar múltiplas conexões em dev/prod
let cached = globalThis.__mongo;
if (!cached) cached = globalThis.__mongo = { clientPromise: null };

function getDbNameFromUri(mongoURI) {
  try {
    const url = new URL(mongoURI);
    const name = url.pathname.replace(/^\//, '');
    return name || process.env.MONGODB_DB || 'test';
  } catch {
    const match = mongoURI.match(/\/([^/?]+)(\?|$)/);
    return (match && match[1]) || process.env.MONGODB_DB || 'test';
  }
}

export async function connectToDatabase() {
  if (!cached.clientPromise) {
    const client = new MongoClient(uri, DEFAULT_OPTS);
    cached.clientPromise = client.connect();
  }

  const client = await cached.clientPromise;
  const dbName = getDbNameFromUri(uri);
  const db = client.db(dbName);

  return { client, db };
}

export default connectToDatabase;
