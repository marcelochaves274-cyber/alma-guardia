import { Header } from '@/components/header';
import { Chat } from '@/components/chat';
import { SgsConfiguration } from '@/components/sgs-configuration';

export default function Home() {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-full max-w-md flex-col border-r lg:flex">
          <SgsConfiguration />
        </aside>
        <main className="flex flex-1 flex-col overflow-hidden p-4 md:p-6">
          <Chat />
        </main>
      </div>
    </div>
  );
}
