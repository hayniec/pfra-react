import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HistoryEntry } from '../types';

const STORAGE_KEY = 'pfra-history';

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setEntries(JSON.parse(stored) as HistoryEntry[]);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const persist = (items: HistoryEntry[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {});
  };

  const save = (entry: Omit<HistoryEntry, 'id' | 'savedAt'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),
    };
    const updated = [newEntry, ...entries];
    setEntries(updated);
    persist(updated);
  };

  const remove = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    persist(updated);
  };

  const clearAll = () => {
    setEntries([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  const importEntries = (incoming: HistoryEntry[]) => {
    const existingIds = new Set(entries.map((e) => e.id));
    const newOnes = incoming.filter((e) => !existingIds.has(e.id));
    if (newOnes.length === 0) return;
    const merged = [...entries, ...newOnes].sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
    setEntries(merged);
    persist(merged);
  };

  return { entries, save, remove, clearAll, importEntries, loaded };
}
