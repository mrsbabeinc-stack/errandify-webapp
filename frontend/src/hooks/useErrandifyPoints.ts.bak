import { useState, useEffect } from 'react';
import axios from 'axios';

export function useErrandifyPoints() {
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPoints = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      setPoints(response.data.data?.errandifyPoints || 0);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch points:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoints();
  }, []);

  return { points, loading, error, refetch: fetchPoints };
}
