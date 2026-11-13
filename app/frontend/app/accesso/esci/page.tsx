'use client';
import { useEffect } from 'react';
import { esci } from '@/lib/api';

// Esci: chiude la sessione sul server (anche la riga in sessioni) e torna all'accesso (A6-02).
export default function Pagina() {
  useEffect(() => {
    void esci();
  }, []);
  return null;
}
