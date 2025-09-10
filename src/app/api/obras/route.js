// src/app/api/obras/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '../lib/database';

// GET - Obter todas as obras (com pesquisa/filtros/paginação)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = (searchParams.get('search') || '').trim();
    const localizacao = (searchParams.get('localizacao') || '').trim();

    // compat: alguns docs têm "estado", outros "estadoObra"
    const estado = (searchParams.get('estado') || '').trim();
    const estadoObra = (searchParams.get('estadoObra') || '').trim();
    const estadoFinal = estado || estadoObra;

    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');

    const page = Math.max(parseInt(searchParams.get('page')) || 1, 1);
    const limit = Math.max(parseInt(searchParams.get('limit')) || 10, 1);

    const { db } = await connectToDatabase();

    // Construir query com AND entre os vários critérios.
    const andParts = [];

    if (search) {
      andParts.push({
        $or: [
          { nome: { $regex: search, $options: 'i' } },
          { localizacao: { $regex: search, $options: 'i' } },
          { responsavelGeral: { $regex: search, $options: 'i' } }, // campo atual
          { responsavel: { $regex: search, $options: 'i' } },      // compat antigo
        ],
      });
    }

    if (localizacao) {
      andParts.push({ localizacao: { $regex: localizacao, $options: 'i' } });
    }

    if (estadoFinal) {
      andParts.push({
        $or: [{ estado: estadoFinal }, { estadoObra: estadoFinal }],
      });
    }

    if (priceMin || priceMax) {
      const range = {};
      if (priceMin !== null && priceMin !== '' && !Number.isNaN(Number(priceMin))) {
        range.$gte = Number(priceMin);
      }
      if (priceMax !== null && priceMax !== '' && !Number.isNaN(Number(priceMax))) {
        range.$lte = Number(priceMax);
      }
      andParts.push({ orcamentoTotal: range });
    }

    const query = andParts.length ? { $and: andParts } : {};

    // Paginação
    const skip = (page - 1) * limit;

    const obrasRaw = await db
      .collection('obras')
      .find(query)
      .sort({ dataCriacao: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection('obras').countDocuments(query);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    // Normalizar resposta (garantir id string e estadoObra)
    const obras = obrasRaw.map((o) => ({
      ...o,
      id: o._id?.toString(),
      _id: o._id?.toString(), // opcional manter para compat
      estadoObra: o.estadoObra || o.estado || 'planeamento',
    }));

    return NextResponse.json({
      obras,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar obras:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar obras' },
      { status: 500 }
    );
  }
}

// POST - Criar nova obra
export async function POST(request) {
  try {
    const obraData = await request.json();

    // Validação básica
    if (!obraData.nome || !obraData.localizacao) {
      return NextResponse.json(
        { error: 'Nome e localização são obrigatórios' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Verificar duplicado simples
    const obraExistente = await db.collection('obras').findOne({
      nome: obraData.nome,
      localizacao: obraData.localizacao,
    });

    if (obraExistente) {
      return NextResponse.json(
        { error: 'Já existe uma obra com este nome e localização' },
        { status: 409 }
      );
    }

    // Normalização de campos
    const estadoFinal = obraData.estadoObra || obraData.estado || 'planeamento';

    const obraCompleta = {
      ...obraData,
      estadoObra: estadoFinal,
      estado: estadoFinal, // compat
      dataCriacao: new Date(),
      dataAtualizacao: new Date(),
    };

    const result = await db.collection('obras').insertOne(obraCompleta);

    const obraCriadaRaw = await db.collection('obras').findOne({
      _id: result.insertedId,
    });

    const obraCriada = {
      ...obraCriadaRaw,
      id: obraCriadaRaw._id?.toString(),
      _id: obraCriadaRaw._id?.toString(),
      estadoObra: obraCriadaRaw.estadoObra || obraCriadaRaw.estado || 'planeamento',
    };

    return NextResponse.json(
      { message: 'Obra criada com sucesso', obra: obraCriada },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar obra:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao criar obra' },
      { status: 500 }
    );
  }
}
