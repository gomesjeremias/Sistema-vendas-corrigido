const jwt = require('jsonwebtoken');


const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });

  router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  // ... lógica para salvar no banco

  const user = { id: novoUsuario.id, name, email };
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });

  return res.json({ user, token }); // <-- importante
});
};

module.exports = { authenticateToken };

