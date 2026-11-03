import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useActivity, ACTIVITY_TYPES } from './ActivityContext';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';

const FinanceContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

export function FinanceProvider({ children }) {
  const { logActivity } = useActivity();
  const { token, user } = useAuth();
  
  const [cards, setCards] = useState([]);
  const [movements, setMovements] = useState([]);
  const [expectedExpenses, setExpectedExpenses] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [payables, setPayables] = useState([]);
  const [clients, setClients] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [budgetCardIds, setBudgetCardIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper fetch function with authorization
  const apiCall = async (endpoint, options = {}) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const fetchAllData = useCallback(() => {
    Promise.all([
      apiCall('/cards'),
      apiCall('/movements'),
      apiCall('/clients'),
      apiCall('/budgets'),
      apiCall('/documents'),
      apiCall('/expected-expenses'),
      apiCall('/receivables'),
      apiCall('/payables')
    ]).then(([c, m, cl, b, d, e, r, p]) => {
      setCards(c);
      setBudgetCardIds(c.map(card => card.id));
      setMovements(m);
      setClients(cl);
      setBudgets(b);
      setDocuments(d);
      setExpectedExpenses(e);
      setReceivables(r);
      setPayables(p);
      setLoading(false);
    }).catch(err => {
      console.error("Error loading finance data:", err);
      setLoading(false);
    });
  }, [token]);

  useEffect(() => {
    if (token && user) {
      fetchAllData();

      const socketUrl = API_URL.startsWith('http') ? API_URL.replace(/\/api\/?$/, '') : window.location.origin;
      const socket = io(socketUrl, {
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 5,
        timeout: 10000
      });
      
      // Join the team's room to receive real-time updates
      socket.emit('joinRoom', user.ownerId);

      socket.on('updateData', () => {
        fetchAllData();
      });

      return () => {
        socket.disconnect();
      };
    } else {
      setLoading(false);
    }
  }, [token, user, fetchAllData]);

  // -- CARDS --
  const addCard = async (card) => {
    try {
      const newCard = await apiCall('/cards', { method: 'POST', body: JSON.stringify(card) });
      setCards(prev => [newCard, ...prev]);
      logActivity({ type: ACTIVITY_TYPES.CARD_ADDED, title: 'Card added', description: `${card.name}` });
    } catch (e) { console.error(e); }
  };
  const deleteCard = async (id) => {
    try {
      await apiCall(`/cards/${id}`, { method: 'DELETE' });
      const card = cards.find(c => c.id === id);
      setCards(cards.filter(c => c.id !== id));
      if (card) logActivity({ type: ACTIVITY_TYPES.CARD_DELETED, title: 'Card deleted', description: `${card.name}` });
    } catch (e) { console.error(e); }
  };
  const toggleCardStatus = async (id) => {
    setCards(cards.map(c => c.id === id ? { ...c, isActive: c.isActive === false ? true : false } : c));
  };

  // -- MOVEMENTS --
  const addMovement = async (movement) => {
    try {
      if (movement.type === 'EXPENSE' || movement.type === 'expense') {
        const card = cards.find(c => c.id === movement.cardId);
        if (!card || Number(card.balance) < Number(movement.amount)) {
          return { success: false, error: 'Insufficient funds on the card.' };
        }
      }
      const mov = await apiCall('/movements', { 
        method: 'POST', 
        body: JSON.stringify({ ...movement, type: movement.type.toUpperCase() }) 
      });
      setMovements([mov, ...movements]);
      
      const updatedCards = await apiCall('/cards');
      setCards(updatedCards);

      const card = cards.find(c => c.id === movement.cardId);
      logActivity({
        type: ACTIVITY_TYPES.MOVEMENT_ADDED,
        title: movement.type === 'income' || movement.type === 'INCOME' ? 'Income recorded' : 'Expense recorded',
        description: `${movement.description || movement.category} — $${Number(movement.amount).toFixed(2)} (${card?.name ?? '?'})`
      });
      return { success: true };
    } catch (e) { console.error(e); return { success: false, error: e.message }; }
  };

  const transferBetweenCards = async (sourceId, targetId, amount, description = 'Transferencia') => {
    const resExp = await addMovement({ cardId: sourceId, type: 'EXPENSE', amount, description: `${description} to another account`, category: 'Transfers' });
    if (!resExp.success) return resExp;
    await addMovement({ cardId: targetId, type: 'INCOME', amount, description: `${description} from another account`, category: 'Transfers' });
    
    const src = cards.find(c => c.id === sourceId);
    const tgt = cards.find(c => c.id === targetId);
    logActivity({ type: ACTIVITY_TYPES.TRANSFER, title: 'Transfer completed', description: `$${Number(amount).toFixed(2)} from ${src?.name ?? '?'} to ${tgt?.name ?? '?'}` });
    return { success: true };
  };

  // -- CLIENTS --
  const addClient = async (client) => {
    try {
      const c = await apiCall('/clients', { method: 'POST', body: JSON.stringify(client) });
      setClients([c, ...clients]);
    } catch (e) { console.error(e); }
  };
  const updateClient = async (id, updates) => {
    try {
      const c = await apiCall(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
      setClients(clients.map(cl => cl.id === id ? c : cl));
    } catch (e) { console.error(e); }
  };
  const deleteClient = async (id) => {
    try {
      await apiCall(`/clients/${id}`, { method: 'DELETE' });
      setClients(clients.filter(c => c.id !== id));
    } catch (e) { console.error(e); }
  };

  // -- BUDGETS --
  const addBudget = async (budget) => {
    try {
      const b = await apiCall('/budgets', { method: 'POST', body: JSON.stringify(budget) });
      setBudgets([b, ...budgets]);
      logActivity({ type: ACTIVITY_TYPES.BUDGET_ADDED, title: 'Budget created', description: `Category: ${budget.category}` });
    } catch (e) { console.error(e); }
  };
  const updateBudget = async (id, updates) => {
    try {
      const b = await apiCall(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
      setBudgets(budgets.map(bgt => bgt.id === id ? b : bgt));
    } catch (e) { console.error(e); }
  };
  const deleteBudget = async (id) => {
    try {
      await apiCall(`/budgets/${id}`, { method: 'DELETE' });
      setBudgets(budgets.filter(b => b.id !== id));
      logActivity({ type: ACTIVITY_TYPES.BUDGET_DELETED, title: 'Budget deleted', description: `ID: ${id}` });
    } catch (e) { console.error(e); }
  };
  const toggleBudgetCard = (id) => {
    setBudgetCardIds(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]);
  };
  const getBudgetTotalBalance = () => {
    return cards.filter(c => c.isActive !== false && budgetCardIds.includes(c.id)).reduce((acc, card) => acc + Number(card.balance), 0);
  };

  // -- DOCUMENTS --
  const addDocument = async (doc) => {
    try {
      const payload = { ...doc };
      if (doc.url) {
        payload.fileData = doc.url;
        delete payload.url;
      }
      const d = await apiCall('/documents', { method: 'POST', body: JSON.stringify(payload) });
      setDocuments([d, ...documents]);
      logActivity({ type: ACTIVITY_TYPES.DOCUMENT_ADDED, title: 'Document saved', description: doc.name });
    } catch (e) { console.error(e); }
  };
  const deleteDocument = async (id) => {
    try {
      await apiCall(`/documents/${id}`, { method: 'DELETE' });
      setDocuments(documents.filter(d => d.id !== id));
      logActivity({ type: ACTIVITY_TYPES.DOCUMENT_DELETED, title: 'Document deleted', description: `ID: ${id}` });
    } catch (e) { console.error(e); }
  };
  const updateDocument = async (id, updates) => {
    setDocuments(documents.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  // -- EXPECTED EXPENSES --
  const addExpectedExpense = async (expense) => {
    try {
      const e = await apiCall('/expected-expenses', { method: 'POST', body: JSON.stringify(expense) });
      setExpectedExpenses([...expectedExpenses, e]);
    } catch (e) { console.error(e); }
  };
  const deleteExpectedExpense = async (id) => {
    try {
      await apiCall(`/expected-expenses/${id}`, { method: 'DELETE' });
      setExpectedExpenses(expectedExpenses.filter(e => e.id !== id));
    } catch (e) { console.error(e); }
  };
  const payExpectedExpense = async (id, cardId) => {
    try {
      const expense = expectedExpenses.find(e => e.id === id);
      if (!expense) return { success: false, error: 'Expected expense not found.' };
      const movRes = await addMovement({
        cardId, type: 'EXPENSE', amount: expense.amount, category: expense.category,
        description: `Payment Made: ${expense.description}`,
      });
      if (movRes.success) {
        const e = await apiCall(`/expected-expenses/${id}/pay`, { method: 'PUT' });
        setExpectedExpenses(expectedExpenses.map(ex => ex.id === id ? e : ex));
      }
      return movRes;
    } catch (e) { console.error(e); return { success: false, error: e.message }; }
  };

  // -- RECEIVABLES --
  const addReceivable = async (item) => {
    try {
      const r = await apiCall('/receivables', { method: 'POST', body: JSON.stringify(item) });
      setReceivables([r, ...receivables]);
    } catch (e) { console.error(e); }
  };
  const collectReceivable = async (id, cardId) => {
    try {
      const rec = receivables.find(r => r.id === id);
      if (!rec) return { success: false, error: 'Not found.' };
      const movRes = await addMovement({
        cardId, type: 'INCOME', amount: rec.amount, category: 'Accounts Receivable',
        description: `Collection: ${rec.description}`
      });
      if (movRes.success) {
        const r = await apiCall(`/receivables/${id}/collect`, { method: 'PUT', body: JSON.stringify({ cardId }) });
        setReceivables(receivables.map(item => item.id === id ? r : item));
      }
      return movRes;
    } catch (e) { console.error(e); return { success: false, error: e.message }; }
  };

  // -- PAYABLES --
  const addPayable = async (item) => {
    try {
      const p = await apiCall('/payables', { method: 'POST', body: JSON.stringify(item) });
      setPayables([p, ...payables]);
    } catch (e) { console.error(e); }
  };
  const payPayable = async (id, cardId) => {
    try {
      const pay = payables.find(p => p.id === id);
      if (!pay) return { success: false, error: 'Not found.' };
      const movRes = await addMovement({
        cardId, type: 'EXPENSE', amount: pay.amount, category: 'Accounts Payable',
        description: `Payment: ${pay.description}`
      });
      if (movRes.success) {
        const p = await apiCall(`/payables/${id}/pay`, { method: 'PUT', body: JSON.stringify({ cardId }) });
        setPayables(payables.map(item => item.id === id ? p : item));
      }
      return movRes;
    } catch (e) { console.error(e); return { success: false, error: e.message }; }
  };

  const getTotalBalance = () => {
    return cards.filter(c => c.isActive !== false).reduce((acc, card) => acc + Number(card.balance), 0);
  };

  return (
    <FinanceContext.Provider value={{
      cards, addCard, deleteCard, toggleCardStatus,
      movements, addMovement, transferBetweenCards,
      expectedExpenses, addExpectedExpense, payExpectedExpense, deleteExpectedExpense,
      receivables, addReceivable, collectReceivable,
      payables, addPayable, payPayable,
      documents, addDocument, deleteDocument, updateDocument,
      budgets, addBudget, updateBudget, deleteBudget,
      budgetCardIds, toggleBudgetCard, getBudgetTotalBalance,
      clients, addClient, deleteClient, updateClient,
      getTotalBalance
    }}>
      {!loading && children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
