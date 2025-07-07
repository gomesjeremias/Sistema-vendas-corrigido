const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Aplicar middleware de autenticação a todas as rotas
router.use(authenticateToken);

// Obter dados do dashboard
router.get('/', async (req, res) => {
  try {
    // Vendas a pagar
    const vendasAPagar = await prisma.venda.findMany({
      where: { status: 'A_PAGAR' },
      include: {
        cliente: {
          select: { id: true, nome: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Vendas pagas
    const vendasPagas = await prisma.venda.findMany({
      where: { status: 'PAGO' },
      include: {
        cliente: {
          select: { id: true, nome: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calcular totais
    const totalAPagar = vendasAPagar.reduce((sum, venda) => sum + venda.total, 0);
    const totalPago = vendasPagas.reduce((sum, venda) => sum + venda.total, 0);

    // Estatísticas gerais
    const totalClientes = await prisma.cliente.count();
    const totalFornecedores = await prisma.fornecedor.count();
    const totalProdutos = await prisma.produto.count();
    const totalVendas = await prisma.venda.count();

    // Produtos com estoque baixo (menos de 10 unidades)
    const produtosEstoqueBaixo = await prisma.produto.findMany({
      where: { estoque: { lt: 10 } },
      include: {
        fornecedor: {
          select: { nome: true }
        }
      },
      orderBy: { estoque: 'asc' }
    });

    // Vendas por mês (últimos 6 meses)
    const seiseMesesAtras = new Date();
    seiseMesesAtras.setMonth(seiseMesesAtras.getMonth() - 6);

    const vendasPorMes = await prisma.venda.groupBy({
      by: ['dataVenda'],
      where: {
        dataVenda: {
          gte: seiseMesesAtras
        }
      },
      _sum: {
        total: true
      },
      _count: {
        id: true
      }
    });

    // Agrupar vendas por mês/ano
    const vendasMensais = {};
    vendasPorMes.forEach(venda => {
      const data = new Date(venda.dataVenda);
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      
      if (!vendasMensais[chave]) {
        vendasMensais[chave] = {
          mes: chave,
          total: 0,
          quantidade: 0
        };
      }
      
      vendasMensais[chave].total += venda._sum.total || 0;
      vendasMensais[chave].quantidade += venda._count.id || 0;
    });

    const vendasMensaisArray = Object.values(vendasMensais).sort((a, b) => a.mes.localeCompare(b.mes));

    res.json({
      resumo: {
        totalAPagar,
        totalPago,
        totalClientes,
        totalFornecedores,
        totalProdutos,
        totalVendas
      },
      vendasAPagar,
      vendasPagas,
      produtosEstoqueBaixo,
      vendasMensais: vendasMensaisArray
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter estatísticas de vendas por período
router.get('/vendas-periodo', async (req, res) => {
  try {
    const { inicio, fim } = req.query;

    const filtros = {};
    if (inicio && fim) {
      filtros.dataVenda = {
        gte: new Date(inicio),
        lte: new Date(fim)
      };
    }

    const vendas = await prisma.venda.findMany({
      where: filtros,
      include: {
        cliente: {
          select: { nome: true }
        }
      }
    });

    const totalVendas = vendas.length;
    const totalFaturamento = vendas.reduce((sum, venda) => sum + venda.total, 0);
    const vendasPagas = vendas.filter(v => v.status === 'PAGO');
    const vendasAPagar = vendas.filter(v => v.status === 'A_PAGAR');

    res.json({
      periodo: { inicio, fim },
      totalVendas,
      totalFaturamento,
      vendasPagas: {
        quantidade: vendasPagas.length,
        total: vendasPagas.reduce((sum, venda) => sum + venda.total, 0)
      },
      vendasAPagar: {
        quantidade: vendasAPagar.length,
        total: vendasAPagar.reduce((sum, venda) => sum + venda.total, 0)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar vendas por período:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;

