import jwt from 'jsonwebtoken';

const FALLBACK_SECRET = 'super-secret-key-change-me';
export const JWT_SECRET = process.env.JWT_SECRET || FALLBACK_SECRET;

if (!process.env.JWT_SECRET) {
  console.warn('[SECURITY WARNING] JWT_SECRET is not set in environment variables. Set a strong JWT_SECRET in production.');
}

export const generateToken = (user) => {
  const ownerId = user.parentId || user.id;
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      parentId: user.parentId,
      ownerId,
      companyName: user.companyName
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const verifyToken = (token) => {
  const decoded = jwt.verify(token, JWT_SECRET);
  return {
    ...decoded,
    ownerId: decoded.parentId || decoded.id
  };
};

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN' && req.user?.email !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Requiere rol de Administrador.' });
  }
  next();
};
