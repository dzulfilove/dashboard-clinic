import { useState, useEffect } from 'react';

export function useRecharts() {
  const [recharts, setRecharts] = useState<any>(null);

  useEffect(() => {
    import('recharts').then((module) => {
      setRecharts(module);
    });
  }, []);

  return recharts;
}
