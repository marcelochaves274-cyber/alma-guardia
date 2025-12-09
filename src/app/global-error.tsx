'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SgsGeniusLogo } from '@/components/icons';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <html>
      <body>
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
            <div className="max-w-md">
                <SgsGeniusLogo className="mx-auto h-16 w-16 text-destructive mb-6" />
                <h1 className="text-3xl font-bold text-foreground">Ocorreu um Erro</h1>
                <p className="mt-4 text-muted-foreground">
                    Pedimos desculpas, mas encontramos um problema inesperado. Isso pode ser um problema temporário de sincronização.
                </p>
                 <p className="mt-2 text-sm text-muted-foreground">
                    Recarregar a página geralmente resolve o problema.
                </p>
                <div className="mt-8 flex justify-center gap-4">
                    <Button onClick={handleReload}>
                        Recarregar a Página
                    </Button>
                </div>
                 <div className="mt-10 text-xs text-muted-foreground/50">
                    <p>Detalhe do erro (para suporte):</p>
                    <p className="font-mono">{error.message || 'Erro desconhecido'}</p>
                 </div>
            </div>
        </div>
      </body>
    </html>
  );
}
