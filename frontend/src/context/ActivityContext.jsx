import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ActivityContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

export const ACTIVITY_TYPES = {
  MOVEMENT_ADDED:   'movement_added',
  CARD_ADDED:       'card_added',
  CARD_DELETED:     'card_deleted',
  CARD_TOGGLED:     'card_toggled',
  DOCUMENT_ADDED:   'document_added',
  DOCUMENT_DELETED: 'document_deleted',
  INVOICE_SAVED:    'invoice_saved',
  BUDGET_ADDED:     'budget_added',
  BUDGET_DELETED:   'budget_deleted',
  TRANSFER:         'transfer',
};

export function ActivityProvider({ children }) {
  const { token, user } = useAuth();
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (token && user) {
      fetch(`${API_URL}/activity`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Parse dates since JSON doesn't keep Date objects
          setActivities(data.map(d => ({ ...d, timestamp: new Date(d.createdAt) })));
        }
      })
      .catch(console.error);
    }
  }, [token, user]);

  const logActivity = useCallback(async ({ type, title, description }) => {
    try {
      const res = await fetch(`${API_URL}/activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type, title, description })
      });
      const newLog = await res.json();
      setActivities(prev => [{ ...newLog, timestamp: new Date(newLog.createdAt) }, ...prev].slice(0, 50));
    } catch (e) {
      console.error("Failed to log activity", e);
      // Fallback local if error
      const entry = { id: Date.now().toString(), type, title, description, timestamp: new Date() };
      setActivities(prev => [entry, ...prev].slice(0, 50));
    }
  }, [token]);

  return (
    <ActivityContext.Provider value={{ activities, logActivity }}>
      {children}
    </ActivityContext.Provider>
  );
}

export const useActivity = () => {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error('useActivity must be used within ActivityProvider');
  return ctx;
};
