const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Simulação de banco de dados em memória
let users = [];

// Rota de Registro
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Verificar se o usuário já existe
    const existingUser = users.find(user => user.email === email);

    if (existingUser) {
      return res.status(400).json({ error: "Usuário já existe com este email" });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar novo usuário
    const newUser = {
      id: users.length + 1,
      name,
      email,
      password: hashedPassword,
      createdAt: new Date()
    };

    users.push(newUser);

    // Gerar token JWT
    const user = { id: newUser.id, name: newUser.name, email: newUser.email };
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.status(201).json({ user, token });
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Rota de Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuário
    const user = users.find(user => user.email === email);

    if (!user) {
      return res.status(400).json({ error: "Credenciais inválidas" });
    }

    // Comparar senha
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Credenciais inválidas" });
    }

    // Gerar token JWT
    const userPayload = { id: user.id, name: user.name, email: user.email };
    const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ user: userPayload, token });
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

module.exports = router;

