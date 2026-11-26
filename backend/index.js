import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import http from 'http';
import prisma from './lib/prisma.js';
import apiRouter from './routes/api.js';
import { generateToken, verifyToken, authenticateToken, requireAdmin } from './lib/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = allowedOrigins.length > 0
  ? {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Origen no permitido por CORS'));
      },
      credentials: true
    }
  : { origin: true, credentials: true };

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: allowedOrigins.length > 0
    ? { origin: allowedOrigins, credentials: true }
    : { origin: '*' }
});

app.set('io', io);
app.set('trust proxy', true);
const PORT = process.env.PORT || 3001;

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// --- Rate Limiter en memoria para rutas de autenticación ---
const authRateBuckets = new Map();
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_REQUESTS = 25;

const authRateLimiter = (req, res, next) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = authRateBuckets.get(ip);

  if (!entry || now > entry.resetAt) {
    authRateBuckets.set(ip, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return next();
  }

  entry.count += 1;
  if (entry.count > AUTH_MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    res.set('Retry-After', String(retryAfterSec));
    return res.status(429).json({ error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' });
  }
  return next();
};

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of authRateBuckets.entries()) {
    if (now > entry.resetAt) authRateBuckets.delete(ip);
  }
}, AUTH_WINDOW_MS).unref();

// Ensure uploads directory exists (supports Railway Volume via RAILWAY_VOLUME_MOUNT_PATH or UPLOADS_DIR)
const uploadsDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Servir archivos subidos SOLO a usuarios autenticados dueños del documento
app.get('/uploads/:filename', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
    const token = headerToken || queryToken;

    if (!token) {
      return res.status(401).json({ error: 'Token requerido para acceder a archivos' });
    }

    let user;
    try {
      user = verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const safeFileName = path.basename(req.params.filename || '');
    if (!safeFileName || safeFileName !== req.params.filename) {
      return res.status(400).json({ error: 'Nombre de archivo inválido' });
    }

    const doc = await prisma.document.findFirst({
      where: {
        userId: user.ownerId,
        fileUrl: { endsWith: `/uploads/${safeFileName}` }
      },
      select: { id: true, type: true, name: true }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const filePath = path.join(uploadsDir, safeFileName);
    const resolvedUploads = path.resolve(uploadsDir);
    const resolvedFile = path.resolve(filePath);
    if (!resolvedFile.startsWith(resolvedUploads + path.sep) || !fs.existsSync(resolvedFile)) {
      return res.status(404).json({ error: 'Archivo no disponible en disco' });
    }

    if (doc.type) {
      res.type(doc.type);
    }
    res.set('Cache-Control', 'private, max-age=3600');
    return res.sendFile(resolvedFile);
  } catch (error) {
    console.error('Error serving upload:', error);
    return res.status(500).json({ error: 'Error al obtener el archivo' });
  }
});

// --- Inicializar Super Admin ---
async function initSuperAdmin() {
  try {
    const adminExists = await prisma.user.findFirst({
      where: {
        OR: [
          { role: 'ADMIN' },
          { email: 'admin' }
        ]
      }
    });

    const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);

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
      console.log('Super Admin created.');
    } else {
      const updateData = {
        email: 'admin',
        name: adminExists.name || 'admin',
        role: 'ADMIN'
      };
      if (process.env.ADMIN_PASSWORD) {
        updateData.password = hashedPassword;
      }
      await prisma.user.update({
        where: { id: adminExists.id },
        data: updateData
      });
      console.log('Super Admin role ADMIN verified.');
    }
  } catch (error) {
    console.error('Error initializing super admin:', error);
  }
}

// --- Rutas de Autenticación ---

// LOGIN
app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    
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

    const ownerId = user.parentId || user.id;
    const token = generateToken(user);

    // No enviar la contraseña al cliente
    const { password: _, ...userWithoutPassword } = user;

    res.json({ token, user: { ...userWithoutPassword, ownerId } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// REGISTER CON KEY
app.post('/api/auth/register', authRateLimiter, async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const key = typeof req.body.key === 'string' ? req.body.key.trim().toUpperCase() : '';

    if (!email || !password || !key) {
      return res.status(400).json({ error: 'Usuario, contraseña y key son requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const regKey = await tx.registrationKey.findUnique({ where: { code: key } });
      if (!regKey || regKey.used) {
        return { error: 'Key inválida o ya utilizada', status: 400 };
      }

      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser) {
        return { error: 'Ese usuario ya está registrado', status: 400 };
      }

      const claim = await tx.registrationKey.updateMany({
        where: { id: regKey.id, used: false },
        data: { used: true, usedBy: email, usedAt: new Date() }
      });
      if (claim.count === 0) {
        return { error: 'Key inválida o ya utilizada', status: 400 };
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await tx.user.create({
        data: {
          email,
          name: email.includes('@') ? email.split('@')[0] : email,
          password: hashedPassword,
          role: 'USER'
        }
      });

      return { user: newUser };
    });

    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    const user = result.user;
    const ownerId = user.parentId || user.id;
    const token = generateToken(user);

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({ token, user: { ...userWithoutPassword, ownerId } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar usuario' });
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

// --- Rutas de Registration Keys (Admin Only) ---

app.get('/api/keys', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const keys = await prisma.registrationKey.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(keys);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener las keys' });
  }
});

app.post('/api/keys', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const code = `PROTEX-${part1}-${part2}`;

    const newKey = await prisma.registrationKey.create({
      data: { code }
    });
    res.status(201).json(newKey);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar la key' });
  }
});

app.delete('/api/keys/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.registrationKey.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la key' });
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

// Autenticar conexiones de Socket.IO con JWT y unir solo a la sala del propio ownerId
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
  if (!token) {
    return next(new Error('Token requerido'));
  }
  try {
    socket.user = verifyToken(token);
    return next();
  } catch {
    return next(new Error('Token inválido'));
  }
});

io.on('connection', (socket) => {
  if (socket.user?.ownerId) {
    socket.join(socket.user.ownerId);
  }
});

// Inicializar y arrancar servidor
initSuperAdmin().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

// Trigger restart
