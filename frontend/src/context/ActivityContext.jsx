import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from '../utils/apiClient';

const ActivityContext = createContext(null);

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
      apiFetch('/activity', { token })
        .then(data => {
          if (Array.isArray(data)) {
            setActivities(data.map(d => ({ ...d, timestamp: new Date(d.createdAt) })));
          }
        })
        .catch(console.error);
    }
  }, [token, user]);

  const logActivity = useCallback(async ({ type, title, description }) => {
    try {
      const newLog = await apiFetch('/activity', {
        method: 'POST',
        token,
        body: JSON.stringify({ type, title, description })
      });
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
