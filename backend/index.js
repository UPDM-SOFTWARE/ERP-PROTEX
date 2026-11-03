import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import http from 'http';
import prisma from './lib/prisma.js';
import apiRouter from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.set('io', io);
app.set('trust proxy', true);
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

app.use(cors()); // Allow all origins
app.use(express.json({ limit: '50mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
// Serve uploads directory statically
app.use('/uploads', express.static(uploadsDir));

// --- Inicializar Super Admin ---
async function initSuperAdmin() {
  try {
    const adminExists = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    const hashedPassword = await bcrypt.hash('admin123', 10);

    if (!adminExists) {
      console.log('No admin found. Creating default Super Admin...');
      await prisma.user.create({
        data: {
          email: 'admin',
          name: 'admin',
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
      console.log('Super Admin created: admin / admin123');
    } else {
      // Update existing admin to ensure they can login with just "admin"
      if (adminExists.email !== 'admin' && adminExists.name !== 'admin') {
        await prisma.user.update({
          where: { id: adminExists.id },
          data: { email: 'admin', name: 'admin' }
        });
        console.log('Super Admin updated to use "admin" as username.');
      }
    }
  } catch (error) {
    console.error('Error initializing super admin:', error);
  }
}

// --- Middleware para verificar Token ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    req.user.ownerId = user.parentId || user.id;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN' && req.user?.email !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Requiere rol de Administrador.' });
  }
  next();
};

// --- Rutas de Autenticación ---

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { name: email }
        ]
      }
    });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, parentId: user.parentId, companyName: user.companyName },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // No enviar la contraseña al cliente
    const { password: _, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// --- Rutas de Usuarios (Admin Only) ---

// Obtener todos los usuarios
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Crear un nuevo usuario
app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
        role: 'USER' // Super Admin can only create normal users to prevent super admin cloning
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// Eliminar un usuario
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent super admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }

    const userToDelete = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToDelete) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Optional: Prevent deleting the main admin
    if (userToDelete.email === 'admin') {
      return res.status(400).json({ error: 'No se puede eliminar al Administrador principal' });
    }

    await prisma.user.delete({ where: { id: userId } });
    
    res.json({ success: true, message: 'Usuario eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// --- Healthcheck para Railway ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// --- Montar Rutas Adicionales ---
app.use('/api', authenticateToken, apiRouter);

// --- Servir Frontend compilado (Monorepo en producción) ---
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/^(?!\/(api|uploads)).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

io.on('connection', (socket) => {
  socket.on('joinRoom', (ownerId) => {
    socket.join(ownerId);
  });
});

// Inicializar y arrancar servidor
initSuperAdmin().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

// Trigger restart
