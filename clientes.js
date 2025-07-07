const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Aplicar middleware de autenticação a todas as rotas
router.use(authenticateToken);

// Listar todos os clientes
router.get('/', async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(clientes);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar cliente por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await prisma.cliente.findUnique({
      where: { id: parseInt(id) },
      include: { vendas: true }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json(cliente);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo cliente
router.post('/', async (req, res) => {
  try {
    const { nome, email, telefone, endereco, cpfCnpj } = req.body;

    // Verificar se CPF/CNPJ já existe
    const existingCliente = await prisma.cliente.findUnique({
      where: { cpfCnpj }
    });

    if (existingCliente) {
      return res.status(400).json({ error: 'Cliente já existe com este CPF/CNPJ' });
    }

    const cliente = await prisma.cliente.create({
      data: {
        nome,
        email,
        telefone,
        endereco,
        cpfCnpj
      }
    });

    res.status(201).json(cliente);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar cliente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, endereco, cpfCnpj } = req.body;

    // Verificar se o cliente existe
    const existingCliente = await prisma.cliente.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingCliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Verificar se CPF/CNPJ já existe em outro cliente
    if (cpfCnpj !== existingCliente.cpfCnpj) {
      const duplicateCliente = await prisma.cliente.findUnique({
        where: { cpfCnpj }
      });

      if (duplicateCliente) {
        return res.status(400).json({ error: 'Outro cliente já possui este CPF/CNPJ' });
      }
    }

    const cliente = await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: {
        nome,
        email,
        telefone,
        endereco,
        cpfCnpj
      }
    });

    res.json(cliente);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar cliente
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o cliente existe
    const existingCliente = await prisma.cliente.findUnique({
      where: { id: parseInt(id) },
      include: { vendas: true }
    });

    if (!existingCliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Verificar se há vendas associadas
    if (existingCliente.vendas.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir cliente com vendas associadas' 
      });
    }

    await prisma.cliente.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Cliente excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;

