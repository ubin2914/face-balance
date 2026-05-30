import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { AnalysisResult } from '@/utils/analysis';

const STORAGE_KEY = 'face_balance_history';

export async function saveRecord(record: AnalysisResult): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const existing: AnalysisResult[] = raw ? JSON.parse(raw) : [];
  const updated = [record, ...existing].slice(0, 50);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function useHistory() {
  const [records, setRecords] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      setRecords(raw ? JSON.parse(raw) : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const clear = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setRecords([]);
  }, []);

  return { records, loading, reload, clear };
}
