import { SgsGeniusLogo } from '@/components/icons';

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 md:px-6">
      <SgsGeniusLogo className="h-6 w-6 text-primary" />
      <h1 className="font-headline text-xl font-semibold">SGS Genius</h1>
    </header>
  );
}
