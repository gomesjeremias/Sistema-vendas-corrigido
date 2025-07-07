const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Aplicar middleware de autenticação a todas as rotas
router.use(authenticateToken);

// Listar todas as vendas
router.get('/', async (req, res) => {
  try {
    const vendas = await prisma.venda.findMany({
      include: {
        cliente: {
          select: { id: true, nome: true, email: true }
        },
        itens: {
          include: {
            produto: {
              select: { id: true, nome: true, preco: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(vendas);
  } catch (error) {
    console.error('Erro ao buscar vendas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar venda por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const venda = await prisma.venda.findUnique({
      where: { id: parseInt(id) },
      include: {
        cliente: true,
        itens: {
          include: {
            produto: true
          }
        }
      }
    });

    if (!venda) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    res.json(venda);
  } catch (error) {
    console.error('Erro ao buscar venda:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar nova venda
router.post('/', async (req, res) => {
  try {
    const { clienteId, itens } = req.body;

    // Verificar se o cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: parseInt(clienteId) }
    });

    if (!cliente) {
      return res.status(400).json({ error: 'Cliente não encontrado' });
    }

    // Verificar se todos os produtos existem e calcular total
    let total = 0;
    const itensValidados = [];

    for (const item of itens) {
      const produto = await prisma.produto.findUnique({
        where: { id: parseInt(item.produtoId) }
      });

      if (!produto) {
        return res.status(400).json({ 
          error: `Produto com ID ${item.produtoId} não encontrado` 
        });
      }

      if (produto.estoque < item.quantidade) {
        return res.status(400).json({ 
          error: `Estoque insuficiente para o produto ${produto.nome}` 
        });
      }

      const subtotal = produto.preco * item.quantidade;
      total += subtotal;

      itensValidados.push({
        produtoId: parseInt(item.produtoId),
        quantidade: parseInt(item.quantidade),
        precoUnit: produto.preco,
        subtotal: subtotal
      });
    }

    // Criar venda com transação
    const venda = await prisma.$transaction(async (prisma) => {
      // Criar a venda
      const novaVenda = await prisma.venda.create({
        data: {
          clienteId: parseInt(clienteId),
          total: total,
          status: 'A_PAGAR'
        }
      });

      // Criar itens da venda e atualizar estoque
      for (const item of itensValidados) {
        await prisma.itemVenda.create({
          data: {
            vendaId: novaVenda.id,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnit: item.precoUnit,
            subtotal: item.subtotal
          }
        });

        // Atualizar estoque do produto
        await prisma.produto.update({
          where: { id: item.produtoId },
          data: {
            estoque: {
              decrement: item.quantidade
            }
          }
        });
      }

      return novaVenda;
    });

    // Buscar venda completa para retornar
    const vendaCompleta = await prisma.venda.findUnique({
      where: { id: venda.id },
      include: {
        cliente: {
          select: { id: true, nome: true, email: true }
        },
        itens: {
          include: {
            produto: {
              select: { id: true, nome: true, preco: true }
            }
          }
        }
      }
    });

    res.status(201).json(vendaCompleta);
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar status da venda
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['A_PAGAR', 'PAGO'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const venda = await prisma.venda.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        cliente: {
          select: { id: true, nome: true, email: true }
        },
        itens: {
          include: {
            produto: {
              select: { id: true, nome: true, preco: true }
            }
          }
        }
      }
    });

    res.json(venda);
  } catch (error) {
    console.error('Erro ao atualizar status da venda:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar venda
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar venda com itens
    const venda = await prisma.venda.findUnique({
      where: { id: parseInt(id) },
      include: { itens: true }
    });

    if (!venda) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    // Deletar venda e restaurar estoque
    await prisma.$transaction(async (prisma) => {
      // Restaurar estoque dos produtos
      for (const item of venda.itens) {
        await prisma.produto.update({
          where: { id: item.produtoId },
          data: {
            estoque: {
              increment: item.quantidade
            }
          }
        });
      }

      // Deletar itens da venda
      await prisma.itemVenda.deleteMany({
        where: { vendaId: parseInt(id) }
      });

      // Deletar venda
      await prisma.venda.delete({
        where: { id: parseInt(id) }
      });
    });

    res.json({ message: 'Venda excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar venda:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Limpar todas as vendas
router.delete('/', async (req, res) => {
  try {
    await prisma.$transaction(async (prisma) => {
      // Buscar todas as vendas com itens
      const vendas = await prisma.venda.findMany({
        include: { itens: true }
      });

      // Restaurar estoque de todos os produtos
      for (const venda of vendas) {
        for (const item of venda.itens) {
          await prisma.produto.update({
            where: { id: item.produtoId },
            data: {
              estoque: {
                increment: item.quantidade
              }
            }
          });
        }
      }

      // Deletar todos os itens de venda
      await prisma.itemVenda.deleteMany();

      // Deletar todas as vendas
      await prisma.venda.deleteMany();
    });

    res.json({ message: 'Todas as vendas foram excluídas com sucesso' });
  } catch (error) {
    console.error('Erro ao limpar vendas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;

