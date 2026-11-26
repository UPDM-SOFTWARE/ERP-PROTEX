import express from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../lib/prisma.js';
import { generateToken } from '../lib/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');

const router = express.Router();

const VALID_CARD_TYPES = new Set(['DEBIT', 'CREDIT', 'CASH']);
const VALID_MOVEMENT_TYPES = new Set(['INCOME', 'EXPENSE']);
const ALLOWED_UPLOAD_MIMES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp'
]);

const parsePositiveAmount = (val) => {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100) / 100;
};

const parseValidDate = (val, fallback = new Date()) => {
  if (!val) return fallback;
  const d = new Date(val);
  return isNaN(d.getTime()) ? fallback : d;
};

const getResourcesForRequest = (reqPath) => {
  if (reqPath.startsWith('/cards')) return ['cards', 'movements'];
  if (reqPath.startsWith('/movements')) return ['movements', 'cards'];
  if (reqPath.startsWith('/clients')) return ['clients'];
  if (reqPath.startsWith('/budgets')) return ['budgets'];
  if (reqPath.startsWith('/documents')) return ['documents'];
  if (reqPath.startsWith('/expected-expenses')) {
    return reqPath.endsWith('/pay') ? ['expected-expenses', 'movements', 'cards'] : ['expected-expenses'];
  }
  if (reqPath.startsWith('/receivables')) {
    return reqPath.endsWith('/collect') ? ['receivables', 'movements', 'cards'] : ['receivables'];
  }
  if (reqPath.startsWith('/payables')) {
    return reqPath.endsWith('/pay') ? ['payables', 'movements', 'cards'] : ['payables'];
  }
  if (reqPath.startsWith('/activity')) return ['activity'];
  return ['all'];
};

const formatDateOnly = (d) => {
  if (!d) return null;
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString().split('T')[0];
};

const mapCard = (c) => ({
  ...c,
  balance: Number(c.balance) || 0,
  isActive: c.isActive !== false,
  bank: c.name,
  last4: c.lastFour,
  type: c.type ? c.type.charAt(0) + c.type.slice(1).toLowerCase() : 'Debit'
});

const mapMovement = (m) => ({
  ...m,
  amount: Number(m.amount) || 0,
  card: m.card ? mapCard(m.card) : undefined
});

const mapBudget = (b) => ({
  ...b,
  limit: Number(b.limit) || 0,
  spent: Number(b.spent) || 0
});

const mapDocument = (d) => ({
  ...d,
  date: formatDateOnly(d.createdAt)
});

const mapReceivable = (r) => ({
  ...r,
  amount: Number(r.amount) || 0,
  expectedDate: formatDateOnly(r.dueDate),
  paidDate: formatDateOnly(r.paidDate)
});

const mapPayable = (p) => ({
  ...p,
  amount: Number(p.amount) || 0,
  expectedDate: formatDateOnly(p.dueDate),
  paidDate: formatDateOnly(p.paidDate)
});

const mapExpectedExpense = (e) => ({
  ...e,
  amount: Number(e.amount) || 0,
  dueDate: formatDateOnly(e.dueDate) || e.dueDate
});

// Helper para responder errores
const handleError = (res, error) => {
  if (error?.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  if (error?.code === 'P2025') {
    return res.status(404).json({ error: 'Registro no encontrado' });
  }
  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor' });
};

const httpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// Middleware para emitir eventos de actualización granulares (WebSockets) automáticamente
router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const originalJson = res.json;
    res.json = function(body) {
      originalJson.call(this, body);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const io = req.app.get('io');
        if (io && req.user && req.user.ownerId) {
          const resources = getResourcesForRequest(req.path);
          io.to(req.user.ownerId).emit('updateData', {
            resources,
            actorId: req.user.id
          });
        }
      }
    };
  }
  next();
});

// --- CARDS ---
router.get('/cards', async (req, res) => {
  try {
    const cards = await prisma.card.findMany({
      where: { userId: req.user.ownerId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(cards.map(mapCard));
  } catch (error) { handleError(res, error); }
});

router.post('/cards', async (req, res) => {
  try {
    const { bank, name, type, currency, balance, last4, lastFour, color, isActive } = req.body;
    const normalizedType = type ? String(type).toUpperCase() : 'DEBIT';
    if (!VALID_CARD_TYPES.has(normalizedType)) {
      return res.status(400).json({ error: 'Tipo de tarjeta inválido (DEBIT, CREDIT o CASH)' });
    }
    const numericBalance = balance !== undefined && balance !== '' ? Number(balance) : 0;
    if (!Number.isFinite(numericBalance)) {
      return res.status(400).json({ error: 'Saldo inicial inválido' });
    }

    const card = await prisma.card.create({
      data: {
        name: String(bank || name || 'Tarjeta').trim(),
        type: normalizedType,
        currency: typeof currency === 'string' && currency.trim() ? currency.trim().toUpperCase() : 'USD',
        balance: numericBalance,
        lastFour: last4 || lastFour ? String(last4 || lastFour).slice(-4) : null,
        color: typeof color === 'string' ? color : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        userId: req.user.ownerId
      }
    });
    res.json(mapCard(card));
  } catch (error) { handleError(res, error); }
});

router.put('/cards/:id', async (req, res) => {
  try {
    const { bank, name, type, currency, balance, last4, lastFour, color, isActive } = req.body;
    const data = {};
    if (bank !== undefined || name !== undefined) data.name = String(bank || name).trim();
    if (type !== undefined) {
      const normalizedType = String(type).toUpperCase();
      if (!VALID_CARD_TYPES.has(normalizedType)) {
        return res.status(400).json({ error: 'Tipo de tarjeta inválido' });
      }
      data.type = normalizedType;
    }
    if (currency !== undefined) data.currency = String(currency).trim().toUpperCase();
    if (balance !== undefined) {
      const numericBalance = Number(balance);
      if (!Number.isFinite(numericBalance)) {
        return res.status(400).json({ error: 'Saldo inválido' });
      }
      data.balance = numericBalance;
    }
    if (last4 !== undefined || lastFour !== undefined) {
      const val = last4 ?? lastFour;
      data.lastFour = val ? String(val).slice(-4) : null;
    }
    if (color !== undefined) data.color = color;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const card = await prisma.card.update({
      where: { id: req.params.id, userId: req.user.ownerId },
      data
    });
    res.json(mapCard(card));
  } catch (error) { handleError(res, error); }
});

router.delete('/cards/:id', async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.card.findFirst({
        where: { id: req.params.id, userId: req.user.ownerId }
      });
      if (!existing) throw httpError(404, 'Tarjeta no encontrada');

      await tx.movement.deleteMany({
        where: { cardId: existing.id, userId: req.user.ownerId }
      });
      await tx.card.delete({
        where: { id: existing.id }
      });
    });
    res.json({ success: true });
  } catch (error) { handleError(res, error); }
});

// --- MOVEMENTS ---
router.get('/movements', async (req, res) => {
  try {
    const movements = await prisma.movement.findMany({
      where: { userId: req.user.ownerId },
      orderBy: { date: 'desc' },
      include: { card: true }
    });
    res.json(movements.map(mapMovement));
  } catch (error) { handleError(res, error); }
});

router.post('/movements', async (req, res) => {
  try {
    const { cardId, type, amount, description, date, category } = req.body;
    const normalizedType = String(type || 'EXPENSE').toUpperCase();
    if (!VALID_MOVEMENT_TYPES.has(normalizedType)) {
      return res.status(400).json({ error: 'Tipo de movimiento inválido (INCOME o EXPENSE)' });
    }
    const numericAmount = parsePositiveAmount(amount);
    if (!numericAmount) {
      return res.status(400).json({ error: 'El monto debe ser un número mayor a 0' });
    }
    if (!cardId) {
      return res.status(400).json({ error: 'cardId es requerido' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const card = await tx.card.findFirst({
        where: { id: cardId, userId: req.user.ownerId }
      });
      if (!card) throw httpError(404, 'Tarjeta no encontrada');

      if (normalizedType === 'EXPENSE' && Number(card.balance) < numericAmount) {
        throw httpError(400, 'Insufficient funds on the card.');
      }

      const updatedCard = await tx.card.update({
        where: { id: card.id },
        data: {
          balance: normalizedType === 'INCOME'
            ? { increment: numericAmount }
            : { decrement: numericAmount }
        }
      });

      const movement = await tx.movement.create({
        data: {
          type: normalizedType,
          amount: numericAmount,
          description: String(description || 'Movimiento').trim(),
          category: String(category || 'General').trim(),
          date: parseValidDate(date),
          cardId: card.id,
          userId: req.user.ownerId
        },
        include: { card: true }
      });

      return { movement, updatedCard };
    });

    res.json({
      ...mapMovement(result.movement),
      card: mapCard(result.updatedCard)
    });
  } catch (error) { handleError(res, error); }
});

// Transferencia atómica entre dos tarjetas del mismo equipo
router.post('/movements/transfer', async (req, res) => {
  try {
    const { sourceCardId, targetCardId, amount, description } = req.body;
    const numericAmount = parsePositiveAmount(amount);
    if (!sourceCardId || !targetCardId) {
      return res.status(400).json({ error: 'Se requieren tarjeta de origen y destino' });
    }
    if (sourceCardId === targetCardId) {
      return res.status(400).json({ error: 'La tarjeta de origen y destino deben ser distintas' });
    }
    if (!numericAmount) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    const descBase = String(description || 'Transferencia').trim();

    const result = await prisma.$transaction(async (tx) => {
      const [sourceCard, targetCard] = await Promise.all([
        tx.card.findFirst({ where: { id: sourceCardId, userId: req.user.ownerId } }),
        tx.card.findFirst({ where: { id: targetCardId, userId: req.user.ownerId } })
      ]);

      if (!sourceCard || !targetCard) {
        throw httpError(404, 'Una o ambas tarjetas no fueron encontradas');
      }
      if (Number(sourceCard.balance) < numericAmount) {
        throw httpError(400, 'Insufficient funds on the card.');
      }

      const updatedSource = await tx.card.update({
        where: { id: sourceCard.id },
        data: { balance: { decrement: numericAmount } }
      });
      const updatedTarget = await tx.card.update({
        where: { id: targetCard.id },
        data: { balance: { increment: numericAmount } }
      });

      const now = new Date();
      const expenseMov = await tx.movement.create({
        data: {
          type: 'EXPENSE',
          amount: numericAmount,
          description: `${descBase} to ${targetCard.name}`,
          category: 'Transfers',
          date: now,
          cardId: sourceCard.id,
          userId: req.user.ownerId
        },
        include: { card: true }
      });

      const incomeMov = await tx.movement.create({
        data: {
          type: 'INCOME',
          amount: numericAmount,
          description: `${descBase} from ${sourceCard.name}`,
          category: 'Transfers',
          date: now,
          cardId: targetCard.id,
          userId: req.user.ownerId
        },
        include: { card: true }
      });

      return {
        movements: [mapMovement(incomeMov), mapMovement(expenseMov)],
        cards: [mapCard(updatedSource), mapCard(updatedTarget)]
      };
    });

    res.json({ success: true, ...result });
  } catch (error) { handleError(res, error); }
});

router.delete('/movements/:id', async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.movement.findFirst({
        where: { id: req.params.id, userId: req.user.ownerId }
      });
      if (!existing) throw httpError(404, 'Movimiento no encontrado');

      const amount = Number(existing.amount) || 0;
      await tx.card.update({
        where: { id: existing.cardId },
        data: {
          balance: existing.type === 'INCOME'
            ? { decrement: amount }
            : { increment: amount }
        }
      });

      await tx.movement.delete({ where: { id: existing.id } });
    });

    res.json({ success: true });
  } catch (error) { handleError(res, error); }
});

// --- CLIENTS ---
router.get('/clients', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { userId: req.user.ownerId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(clients);
  } catch (error) { handleError(res, error); }
});

router.post('/clients', async (req, res) => {
  try {
    const { name, email, phone, address, type } = req.body;
    const client = await prisma.client.create({
      data: {
        name: name || 'Unknown',
        email: email || null,
        phone: phone || null,
        address: address || null,
        type: type || 'client',
        userId: req.user.ownerId
      }
    });
    res.json(client);
  } catch (error) { handleError(res, error); }
});

router.put('/clients/:id', async (req, res) => {
  try {
    const { name, email, phone, address, type } = req.body;
    const data = {};
    if (name !== undefined) data.name = String(name).trim() || 'Unknown';
    if (email !== undefined) data.email = email ? String(email).trim() : null;
    if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;
    if (address !== undefined) data.address = address ? String(address).trim() : null;
    if (type !== undefined && ['client', 'provider'].includes(type)) data.type = type;

    const client = await prisma.client.update({
      where: { id: req.params.id, userId: req.user.ownerId },
      data
    });
    res.json(client);
  } catch (error) { handleError(res, error); }
});

router.delete('/clients/:id', async (req, res) => {
  try {
    await prisma.client.delete({
      where: { id: req.params.id, userId: req.user.ownerId }
    });
    res.json({ success: true });
  } catch (error) { handleError(res, error); }
});

// --- BUDGETS ---
router.get('/budgets', async (req, res) => {
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId: req.user.ownerId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(budgets.map(mapBudget));
  } catch (error) { handleError(res, error); }
});

router.post('/budgets', async (req, res) => {
  try {
    const { category, limit, period, color } = req.body;
    const budget = await prisma.budget.create({
      data: {
        category: category || 'General',
        limit: parseFloat(limit) || 0,
        period: period || 'monthly',
        color: color || null,
        userId: req.user.ownerId
      }
    });
    res.json(mapBudget(budget));
  } catch (error) { handleError(res, error); }
});

router.put('/budgets/:id', async (req, res) => {
  try {
    const { category, limit, spent, period, color } = req.body;
    const data = {};
    if (category !== undefined) data.category = String(category).trim() || 'General';
    if (limit !== undefined) {
      const numLimit = Number(limit);
      if (!Number.isFinite(numLimit) || numLimit < 0) return res.status(400).json({ error: 'Límite inválido' });
      data.limit = numLimit;
    }
    if (spent !== undefined) {
      const numSpent = Number(spent);
      if (!Number.isFinite(numSpent) || numSpent < 0) return res.status(400).json({ error: 'Monto gastado inválido' });
      data.spent = numSpent;
    }
    if (period !== undefined) data.period = String(period).trim();
    if (color !== undefined) data.color = color ? String(color) : null;

    const budget = await prisma.budget.update({
      where: { id: req.params.id, userId: req.user.ownerId },
      data
    });
    res.json(mapBudget(budget));
  } catch (error) { handleError(res, error); }
});

router.delete('/budgets/:id', async (req, res) => {
  try {
    await prisma.budget.delete({
      where: { id: req.params.id, userId: req.user.ownerId }
    });
    res.json({ success: true });
  } catch (error) { handleError(res, error); }
});

// --- DOCUMENTS ---
router.get('/documents', async (req, res) => {
  try {
    const docs = await prisma.document.findMany({
      where: { userId: req.user.ownerId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(docs.map(mapDocument));
  } catch (error) { handleError(res, error); }
});

// Guarda un archivo base64 (data URL) en el directorio de uploads y devuelve su URL relativa
const saveBase64File = (fileData, name) => {
  if (typeof fileData !== 'string') return null;
  const matches = fileData.match(/^data:([A-Za-z0-9.+\/-]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;
  const mime = matches[1].toLowerCase();
  if (!ALLOWED_UPLOAD_MIMES.has(mime)) {
    throw httpError(400, 'Tipo de archivo no permitido. Solo PDF o imágenes (PNG, JPG, GIF, WEBP).');
  }
  const buffer = Buffer.from(matches[2], 'base64');
  const safeName = (name || 'file').replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${Date.now()}-${safeName}`;
  fs.writeFileSync(path.join(uploadsDir, fileName), buffer);
  return { url: `/uploads/${fileName}`, size: buffer.length, mime };
};

// Borra un archivo local de uploads a partir de su URL (absoluta o relativa)
const deleteUploadedFile = (fileUrl) => {
  if (!fileUrl || !fileUrl.includes('/uploads/')) return;
  const fileName = path.basename(fileUrl.split('/uploads/')[1] || '');
  if (!fileName) return;
  const filePath = path.join(uploadsDir, fileName);
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { console.error('Could not delete file', e); }
};

router.post('/documents', async (req, res) => {
  try {
    const { name, category, size, fileUrl, type, fileData, invoiceData } = req.body;
    let finalFileUrl = fileUrl || null;
    let finalSize = parseInt(size) || 0;

    if (fileData) {
      const saved = saveBase64File(fileData, name);
      if (saved) {
        // URL relativa: funciona con cualquier dominio
        finalFileUrl = saved.url;
        finalSize = finalSize || saved.size;
      }
    }

    const doc = await prisma.document.create({
      data: {
        name: name || 'Untitled',
        category: category || 'General',
        type: type || null,
        size: finalSize,
        fileUrl: finalFileUrl,
        invoiceData: invoiceData ?? undefined,
        userId: req.user.ownerId
      }
    });
    res.json(mapDocument(doc));
  } catch (error) { handleError(res, error); }
});

// Editar documento: renombrar y/o reemplazar el archivo (ej. factura editada).
// Mantiene el mismo ID, así que sigue siendo "la misma factura".
router.put('/documents/:id', async (req, res) => {
  try {
    const existing = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user.ownerId }
    });
    if (!existing) return res.status(404).json({ error: 'Documento no encontrado' });

    const { name, category, fileData, size, invoiceData } = req.body;
    const data = {};
    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (typeof category === 'string' && category.trim()) data.category = category.trim();
    if (invoiceData !== undefined) data.invoiceData = invoiceData;

    if (fileData) {
      const saved = saveBase64File(fileData, data.name || existing.name);
      if (saved) {
        data.fileUrl = saved.url;
        data.size = parseInt(size) || saved.size;
        // Eliminar el PDF anterior para no dejar archivos huérfanos en el volumen
        deleteUploadedFile(existing.fileUrl);
      }
    }

    const doc = await prisma.document.update({ where: { id: existing.id }, data });
    res.json(mapDocument(doc));
  } catch (error) { handleError(res, error); }
});

router.delete('/documents/:id', async (req, res) => {
  try {
    const existing = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user.ownerId }
    });
    if (existing) {
      deleteUploadedFile(existing.fileUrl);
      await prisma.document.delete({
        where: { id: existing.id }
      });
    }
    res.json({ success: true });
  } catch (error) { handleError(res, error); }
});

// --- ACTIVITY LOGS ---
router.get('/activity', async (req, res) => {
  try {
    const logs = await prisma.activityLog.findMany({
      where: { userId: req.user.ownerId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(logs);
  } catch (error) { handleError(res, error); }
});

router.post('/activity', async (req, res) => {
  try {
    const { type, title, description } = req.body;
    if (!type || !title) {
      return res.status(400).json({ error: 'type y title son requeridos' });
    }
    const log = await prisma.activityLog.create({
      data: {
        type: String(type).slice(0, 64),
        title: String(title).slice(0, 200),
        description: description ? String(description).slice(0, 500) : null,
        userId: req.user.ownerId
      }
    });
    res.json(log);
  } catch (error) { handleError(res, error); }
});

// --- EXPECTED EXPENSES ---
router.get('/expected-expenses', async (req, res) => {
  try {
    const expenses = await prisma.expectedExpense.findMany({
      where: { userId: req.user.ownerId },
      orderBy: { dueDate: 'asc' }
    });
    res.json(expenses.map(mapExpectedExpense));
  } catch (error) { handleError(res, error); }
});

router.post('/expected-expenses', async (req, res) => {
  try {
    const { description, amount, category, dueDate } = req.body;
    const numericAmount = parsePositiveAmount(amount);
    if (!numericAmount) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }
    const expense = await prisma.expectedExpense.create({
      data: {
        description: String(description || 'Gasto esperado').trim(),
        amount: numericAmount,
        category: String(category || 'General').trim(),
        dueDate: parseValidDate(dueDate),
        status: 'pending',
        userId: req.user.ownerId
      }
    });
    res.json(mapExpectedExpense(expense));
  } catch (error) { handleError(res, error); }
});

router.delete('/expected-expenses/:id', async (req, res) => {
  try {
    await prisma.expectedExpense.delete({
      where: { id: req.params.id, userId: req.user.ownerId }
    });
    res.json({ success: true });
  } catch (error) { handleError(res, error); }
});

router.put('/expected-expenses/:id/pay', async (req, res) => {
  try {
    const { cardId } = req.body || {};

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.expectedExpense.findFirst({
        where: { id: req.params.id, userId: req.user.ownerId }
      });
      if (!existing) throw httpError(404, 'Gasto esperado no encontrado');
      if (existing.status === 'paid') throw httpError(400, 'Este gasto ya fue pagado');

      let movement = null;
      let updatedCard = null;

      if (cardId) {
        const card = await tx.card.findFirst({
          where: { id: cardId, userId: req.user.ownerId }
        });
        if (!card) throw httpError(404, 'Tarjeta no encontrada');

        const numericAmount = Number(existing.amount) || 0;
        if (Number(card.balance) < numericAmount) {
          throw httpError(400, 'Insufficient funds on the card.');
        }

        updatedCard = await tx.card.update({
          where: { id: card.id },
          data: { balance: { decrement: numericAmount } }
        });

        movement = await tx.movement.create({
          data: {
            type: 'EXPENSE',
            amount: numericAmount,
            description: `Payment Made: ${existing.description}`,
            category: existing.category || 'General',
            date: new Date(),
            cardId: card.id,
            userId: req.user.ownerId
          },
          include: { card: true }
        });
      }

      const expense = await tx.expectedExpense.update({
        where: { id: existing.id },
        data: { status: 'paid' }
      });

      return { expense, movement, updatedCard };
    });

    res.json({
      ...mapExpectedExpense(result.expense),
      movement: result.movement ? mapMovement(result.movement) : undefined,
      card: result.updatedCard ? mapCard(result.updatedCard) : undefined
    });
  } catch (error) { handleError(res, error); }
});

// --- RECEIVABLES ---
router.get('/receivables', async (req, res) => {
  try {
    const items = await prisma.receivable.findMany({
      where: { userId: req.user.ownerId },
      orderBy: { dueDate: 'asc' }
    });
    res.json(items.map(mapReceivable));
  } catch (error) { handleError(res, error); }
});

router.post('/receivables', async (req, res) => {
  try {
    const { clientName, description, amount, dueDate, expectedDate } = req.body;
    const numericAmount = parsePositiveAmount(amount);
    if (!numericAmount) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }
    const item = await prisma.receivable.create({
      data: {
        clientName: String(clientName || 'Unknown').trim(),
        description: String(description || '').trim(),
        amount: numericAmount,
        dueDate: parseValidDate(dueDate || expectedDate),
        userId: req.user.ownerId
      }
    });
    res.json(mapReceivable(item));
  } catch (error) { handleError(res, error); }
});

router.put('/receivables/:id/collect', async (req, res) => {
  try {
    const { cardId } = req.body || {};

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.receivable.findFirst({
        where: { id: req.params.id, userId: req.user.ownerId }
      });
      if (!existing) throw httpError(404, 'Cuenta por cobrar no encontrada');
      if (existing.status === 'paid') throw httpError(400, 'Esta cuenta ya fue cobrada');

      let movement = null;
      let updatedCard = null;

      if (cardId) {
        const card = await tx.card.findFirst({
          where: { id: cardId, userId: req.user.ownerId }
        });
        if (!card) throw httpError(404, 'Tarjeta no encontrada');

        const numericAmount = Number(existing.amount) || 0;
        updatedCard = await tx.card.update({
          where: { id: card.id },
          data: { balance: { increment: numericAmount } }
        });

        movement = await tx.movement.create({
          data: {
            type: 'INCOME',
            amount: numericAmount,
            description: `Collection: ${existing.description || existing.clientName}`,
            category: 'Accounts Receivable',
            date: new Date(),
            cardId: card.id,
            userId: req.user.ownerId
          },
          include: { card: true }
        });
      }

      const item = await tx.receivable.update({
        where: { id: existing.id },
        data: { status: 'paid', paidDate: new Date(), cardId: cardId || null }
      });

      return { item, movement, updatedCard };
    });

    res.json({
      ...mapReceivable(result.item),
      movement: result.movement ? mapMovement(result.movement) : undefined,
      card: result.updatedCard ? mapCard(result.updatedCard) : undefined
    });
  } catch (error) { handleError(res, error); }
});

router.delete('/receivables/:id', async (req, res) => {
  try {
    await prisma.receivable.delete({
      where: { id: req.params.id, userId: req.user.ownerId }
    });
    res.json({ success: true });
  } catch (error) { handleError(res, error); }
});

// --- PAYABLES ---
router.get('/payables', async (req, res) => {
  try {
    const items = await prisma.payable.findMany({
      where: { userId: req.user.ownerId },
      orderBy: { dueDate: 'asc' }
    });
    res.json(items.map(mapPayable));
  } catch (error) { handleError(res, error); }
});

router.post('/payables', async (req, res) => {
  try {
    const { providerName, description, amount, dueDate, expectedDate } = req.body;
    const numericAmount = parsePositiveAmount(amount);
    if (!numericAmount) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }
    const item = await prisma.payable.create({
      data: {
        providerName: String(providerName || 'Unknown').trim(),
        description: String(description || '').trim(),
        amount: numericAmount,
        dueDate: parseValidDate(dueDate || expectedDate),
        userId: req.user.ownerId
      }
    });
    res.json(mapPayable(item));
  } catch (error) { handleError(res, error); }
});

router.put('/payables/:id/pay', async (req, res) => {
  try {
    const { cardId } = req.body || {};

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.payable.findFirst({
        where: { id: req.params.id, userId: req.user.ownerId }
      });
      if (!existing) throw httpError(404, 'Cuenta por pagar no encontrada');
      if (existing.status === 'paid') throw httpError(400, 'Esta cuenta ya fue pagada');

      let movement = null;
      let updatedCard = null;

      if (cardId) {
        const card = await tx.card.findFirst({
          where: { id: cardId, userId: req.user.ownerId }
        });
        if (!card) throw httpError(404, 'Tarjeta no encontrada');

        const numericAmount = Number(existing.amount) || 0;
        if (Number(card.balance) < numericAmount) {
          throw httpError(400, 'Insufficient funds on the card.');
        }

        updatedCard = await tx.card.update({
          where: { id: card.id },
          data: { balance: { decrement: numericAmount } }
        });

        movement = await tx.movement.create({
          data: {
            type: 'EXPENSE',
            amount: numericAmount,
            description: `Payment: ${existing.description || existing.providerName}`,
            category: 'Accounts Payable',
            date: new Date(),
            cardId: card.id,
            userId: req.user.ownerId
          },
          include: { card: true }
        });
      }

      const item = await tx.payable.update({
        where: { id: existing.id },
        data: { status: 'paid', paidDate: new Date(), cardId: cardId || null }
      });

      return { item, movement, updatedCard };
    });

    res.json({
      ...mapPayable(result.item),
      movement: result.movement ? mapMovement(result.movement) : undefined,
      card: result.updatedCard ? mapCard(result.updatedCard) : undefined
    });
  } catch (error) { handleError(res, error); }
});

router.delete('/payables/:id', async (req, res) => {
  try {
    await prisma.payable.delete({
      where: { id: req.params.id, userId: req.user.ownerId }
    });
    res.json({ success: true });
  } catch (error) { handleError(res, error); }
});

// --- PROFILE ---
router.put('/profile', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const data = {};
    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (typeof email === 'string' && email.trim()) {
      const normalizedEmail = email.trim();
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing && existing.id !== req.user.id) {
        return res.status(400).json({ error: 'Ese correo o usuario ya está en uso.' });
      }
      data.email = normalizedEmail;
    }
    if (typeof password === 'string' && password.length >= 6) {
      data.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data
    });
    const { password: _p, ...userWithoutPassword } = updatedUser;
    const ownerId = updatedUser.parentId || updatedUser.id;
    res.json({
      success: true,
      token: generateToken(updatedUser),
      user: { ...userWithoutPassword, ownerId }
    });
  } catch (error) { handleError(res, error); }
});

// --- TEAM ---
router.get('/team', async (req, res) => {
  try {
    const isOwner = !req.user.parentId;
    const ownerId = req.user.ownerId;
    
    // Fetch owner details
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true, name: true, email: true, companyName: true, companyLogo: true, teamCode: true }
    });

    // Fetch children
    const members = await prisma.user.findMany({
      where: { parentId: ownerId },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });

    res.json({
      isOwner,
      companyName: owner.companyName,
      companyLogo: owner.companyLogo,
      teamCode: isOwner ? owner.teamCode : null,
      owner: { id: owner.id, name: owner.name, email: owner.email },
      members
    });
  } catch (error) { handleError(res, error); }
});

router.put('/team', async (req, res) => {
  try {
    if (req.user.parentId) {
      return res.status(403).json({ error: 'Solo el dueño puede actualizar la empresa.' });
    }
    const { companyName, companyLogo } = req.body;
    
    // Si no tiene teamCode, generar uno al crear la empresa por primera vez
    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    const newTeamCode = currentUser.teamCode || Math.random().toString(36).substring(2, 8).toUpperCase();

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        companyName,
        companyLogo: companyLogo !== undefined ? companyLogo : currentUser.companyLogo,
        teamCode: newTeamCode
      }
    });
    const { password, ...userWithoutPassword } = user;
    res.json({ success: true, companyName: user.companyName, companyLogo: user.companyLogo, teamCode: user.teamCode, token: generateToken(user), user: userWithoutPassword });
  } catch (error) { handleError(res, error); }
});

router.post('/team/members', async (req, res) => {
  try {
    if (req.user.parentId) {
      return res.status(403).json({ error: 'Solo el dueño puede crear miembros.' });
    }
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email ya registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const member = await prisma.user.create({
      data: {
        name: name || (email.includes('@') ? email.split('@')[0] : email),
        email,
        password: hashedPassword,
        parentId: req.user.id,
        role: 'USER'
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    res.json(member);
  } catch (error) { handleError(res, error); }
});

router.post('/team/join', async (req, res) => {
  try {
    const { token } = req.body;
    
    // Si el usuario ya es dueño de un equipo o ya está en uno
    if (req.user.companyName) {
      return res.status(400).json({ error: 'Eres dueño de un equipo, no puedes unirte a otro.' });
    }
    
    const owner = await prisma.user.findUnique({ where: { teamCode: token } });
    if (!owner) {
      return res.status(400).json({ error: 'Código de equipo inválido.' });
    }

    // Join team
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { parentId: owner.id, role: 'USER' }
    });

    const { password: _p, ...userWithoutPassword } = updatedUser;
    res.json({ success: true, token: generateToken(updatedUser), user: userWithoutPassword });
  } catch (error) { handleError(res, error); }
});

router.post('/team/leave', async (req, res) => {
  try {
    if (req.user.parentId) {
      // User is a member, just leave
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: { parentId: null, role: 'USER' }
      });
      const { password: _p, ...userWithoutPassword } = updatedUser;
      return res.json({ success: true, message: 'Has abandonado el equipo', token: generateToken(updatedUser), user: userWithoutPassword });
    }

    // User is the OWNER
    if (!req.user.companyName) {
      return res.status(400).json({ error: 'No estás en un equipo.' });
    }

    const members = await prisma.user.findMany({ where: { parentId: req.user.id } });
    
    if (members.length === 0) {
      // Owner is alone, delete team info
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: { companyName: null, companyLogo: null, teamCode: null }
      });
      const { password: _p, ...userWithoutPassword } = updatedUser;
      return res.json({ success: true, message: 'Equipo eliminado', token: generateToken(updatedUser), user: userWithoutPassword });
    }

    // Owner has members, transfer ownership atomically
    const newOwner = members.find(m => m.role === 'ADMIN') || members[0];
    const ownerData = await prisma.user.findUnique({ where: { id: req.user.id } });

    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. Clear old owner FIRST to avoid teamCode unique constraint violation
      const clearedOwner = await tx.user.update({
        where: { id: req.user.id },
        data: { companyName: null, companyLogo: null, teamCode: null, role: 'USER' }
      });

      // 2. Update other members to point to new owner
      await tx.user.updateMany({
        where: { parentId: req.user.id, id: { not: newOwner.id } },
        data: { parentId: newOwner.id }
      });

      // 3. Promote new owner
      await tx.user.update({
        where: { id: newOwner.id },
        data: {
          parentId: null,
          role: 'USER',
          companyName: ownerData.companyName,
          companyLogo: ownerData.companyLogo,
          teamCode: ownerData.teamCode
        }
      });

      // 4. Transfer business data
      const tables = ['card', 'movement', 'invoice', 'client', 'budget', 'document', 'activityLog', 'expectedExpense', 'receivable', 'payable'];
      for (const table of tables) {
        await tx[table].updateMany({
          where: { userId: req.user.id },
          data: { userId: newOwner.id }
        });
      }

      return clearedOwner;
    });

    const { password: _p, ...userWithoutPassword } = updatedUser;
    res.json({ success: true, message: 'Has dejado el equipo y transferido la propiedad', token: generateToken(updatedUser), user: userWithoutPassword });
  } catch (error) { handleError(res, error); }
});

router.put('/team/members/:id', async (req, res) => {
  try {
    if (req.user.parentId) {
      return res.status(403).json({ error: 'Solo el dueño puede editar miembros.' });
    }
    const { name } = req.body;
    
    const member = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!member || member.parentId !== req.user.id) {
      return res.status(404).json({ error: 'Miembro no encontrado.' });
    }

    const data = { role: 'USER' }; // Prevenir escalada de privilegios a ADMIN del sistema
    if (typeof name === 'string' && name.trim()) {
      data.name = name.trim();
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    res.json(updated);
  } catch (error) { handleError(res, error); }
});

router.delete('/team/members/:id', async (req, res) => {
  try {
    if (req.user.parentId) {
      return res.status(403).json({ error: 'Solo el dueño puede eliminar miembros.' });
    }
    
    // Ensure the member belongs to this owner
    const member = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!member || member.parentId !== req.user.id) {
      return res.status(404).json({ error: 'Miembro no encontrado.' });
    }

    // Instead of deleting the user, we just kick them from the team
    await prisma.user.update({ 
      where: { id: req.params.id },
      data: { parentId: null }
    });
    res.json({ success: true });
  } catch (error) { handleError(res, error); }
});

export default router;
