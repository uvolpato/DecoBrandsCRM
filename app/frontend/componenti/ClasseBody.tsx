'use client';
import { useEffect } from 'react';

// stile.css è una copia del prototipo e lega alcune regole a una classe su <body>
// (es. body.in-accesso): la mette il layout che ne ha bisogno, e la toglie quando si esce.
export function ClasseBody({ classe }: { classe: string }) {
  useEffect(() => {
    document.body.classList.add(classe);
    return () => document.body.classList.remove(classe);
  }, [classe]);
  return null;
}
