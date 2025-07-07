const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Aplicar middleware de autenticação a todas as rotas
router.use(authenticateToken);

// Listar todos os fornecedores
router.get('/', async (req, res) => {
  try {
    const fornecedores = await prisma.fornecedor.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(fornecedores);
  } catch (error) {
    console.error('Erro ao buscar fornecedores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar fornecedor por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id: parseInt(id) },
      include: { produtos: true }
    });

    if (!fornecedor) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }

    res.json(fornecedor);
  } catch (error) {
    console.error('Erro ao buscar fornecedor:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo fornecedor
router.post('/', async (req, res) => {
  try {
    const { nome, email, telefone, endereco, cnpj } = req.body;

    // Verificar se CNPJ já existe
    const existingFornecedor = await prisma.fornecedor.findUnique({
      where: { cnpj }
    });

    if (existingFornecedor) {
      return res.status(400).json({ error: 'Fornecedor já existe com este CNPJ' });
    }

    const fornecedor = await prisma.fornecedor.create({
      data: {
        nome,
        email,
        telefone,
        endereco,
        cnpj
      }
    });

    res.status(201).json(fornecedor);
  } catch (error) {
    console.error('Erro ao criar fornecedor:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar fornecedor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, endereco, cnpj } = req.body;

    // Verificar se o fornecedor existe
    const existingFornecedor = await prisma.fornecedor.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingFornecedor) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }

    // Verificar se CNPJ já existe em outro fornecedor
    if (cnpj !== existingFornecedor.cnpj) {
      const duplicateFornecedor = await prisma.fornecedor.findUnique({
        where: { cnpj }
      });

      if (duplicateFornecedor) {
        return res.status(400).json({ error: 'Outro fornecedor já possui este CNPJ' });
      }
    }

    const fornecedor = await prisma.fornecedor.update({
      where: { id: parseInt(id) },
      data: {
        nome,
        email,
        telefone,
        endereco,
        cnpj
      }
    });

    res.json(fornecedor);
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar fornecedor
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o fornecedor existe
    const existingFornecedor = await prisma.fornecedor.findUnique({
      where: { id: parseInt(id) },
      include: { produtos: true }
    });

    if (!existingFornecedor) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }

    // Verificar se há produtos associados
    if (existingFornecedor.produtos.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir fornecedor com produtos associados' 
      });
    }

    await prisma.fornecedor.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Fornecedor excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar fornecedor:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;

