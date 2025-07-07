const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Aplicar middleware de autenticação a todas as rotas
router.use(authenticateToken);

// Listar todos os produtos
router.get('/', async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany({
      include: {
        fornecedor: {
          select: { id: true, nome: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(produtos);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar produto por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const produto = await prisma.produto.findUnique({
      where: { id: parseInt(id) },
      include: {
        fornecedor: true,
        itensVenda: {
          include: {
            venda: true
          }
        }
      }
    });

    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json(produto);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo produto
router.post('/', async (req, res) => {
  try {
    const { nome, descricao, preco, categoria, estoque, fornecedorId } = req.body;

    // Verificar se o fornecedor existe
    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id: parseInt(fornecedorId) }
    });

    if (!fornecedor) {
      return res.status(400).json({ error: 'Fornecedor não encontrado' });
    }

    const produto = await prisma.produto.create({
      data: {
        nome,
        descricao,
        preco: parseFloat(preco),
        categoria,
        estoque: parseInt(estoque),
        fornecedorId: parseInt(fornecedorId)
      },
      include: {
        fornecedor: {
          select: { id: true, nome: true }
        }
      }
    });

    res.status(201).json(produto);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar produto
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, preco, categoria, estoque, fornecedorId } = req.body;

    // Verificar se o produto existe
    const existingProduto = await prisma.produto.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingProduto) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Verificar se o fornecedor existe
    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id: parseInt(fornecedorId) }
    });

    if (!fornecedor) {
      return res.status(400).json({ error: 'Fornecedor não encontrado' });
    }

    const produto = await prisma.produto.update({
      where: { id: parseInt(id) },
      data: {
        nome,
        descricao,
        preco: parseFloat(preco),
        categoria,
        estoque: parseInt(estoque),
        fornecedorId: parseInt(fornecedorId)
      },
      include: {
        fornecedor: {
          select: { id: true, nome: true }
        }
      }
    });

    res.json(produto);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar produto
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o produto existe
    const existingProduto = await prisma.produto.findUnique({
      where: { id: parseInt(id) },
      include: { itensVenda: true }
    });

    if (!existingProduto) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Verificar se há vendas associadas
    if (existingProduto.itensVenda.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir produto com vendas associadas' 
      });
    }

    await prisma.produto.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Produto excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;

