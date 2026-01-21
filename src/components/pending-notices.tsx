
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser } from '@/firebase';
import { collection, onSnapshot, doc, updateDoc, Timestamp, deleteField } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, ShieldCheck, Sprout, Check, Image as ImageIcon } from 'lucide-react';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import Image from 'next/image';

interface Notice {
  id: string;
  collaboratorName: string;
  noticeDate: Timestamp;
  weather: string;
  description: string;
  location: string;
  mapMarker?: { x: number; y: number };
  status: 'pendente' | 'finalizado';
  imageUrl?: string;
}

interface PendingNoticesProps {
  setPage: (page: string, options?: { prefill: any }) => void;
}

export function PendingNotices({ setPage }: PendingNoticesProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !firestore) return;

    const noticesRef = collection(firestore, 'sgs_genius', user.uid, 'notices');
    const unsubscribe = onSnapshot(noticesRef, (snapshot) => {
      const pendingNotices = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Notice))
        .filter(notice => notice.status === 'pendente')
        .sort((a, b) => b.noticeDate.toMillis() - a.noticeDate.toMillis());
      setNotices(pendingNotices);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching notices:", error);
      toast({
        variant: "destructive",
        title: "Erro de conexão",
        description: "Não foi possível buscar os avisos pendentes."
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, firestore, toast]);

  const processNoticeAction = async (notice: Notice, callback: () => void) => {
    if (!user || !firestore) return;
    setIsUpdating(notice.id);
    try {
      // Mark notice as 'finalizado' and remove the imageUrl field
      const noticeRef = doc(firestore, 'sgs_genius', user.uid, 'notices', notice.id);
      await updateDoc(noticeRef, { status: 'finalizado', imageUrl: deleteField() });

      // Execute the callback (e.g., navigate or show toast)
      callback();

    } catch (error) {
      console.error("Error processing notice action:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível processar a ação para este aviso."
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleAction = (notice: Notice, action: 'occurrence' | 'treatment' | 'fauna') => {
    processNoticeAction(notice, () => {
      const prefill = {
        date: notice.noticeDate,
        description: notice.description,
        location: notice.location,
        mapMarker: notice.mapMarker,
        collaboratorName: notice.collaboratorName,
      };

      switch (action) {
        case 'occurrence':
          setPage('register-occurrence', { prefill });
          break;
        case 'treatment':
          setPage('register-treatment', { prefill });
          break;
        case 'fauna':
          setPage('register-fauna-flora-geo', { prefill });
          break;
      }
    });
  };

  const handleMarkAsResolved = async (notice: Notice) => {
    processNoticeAction(notice, () => {
      toast({ title: "Sucesso!", description: "Aviso marcado como resolvido." });
    });
  };

  const renderSkeletons = () => (
    Array.from({ length: 2 }).map((_, i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          <div className="flex flex-col gap-2 w-48">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </CardContent>
      </Card>
    ))
  );

  return (
    <Dialog>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Avisos Pendentes</CardTitle>
            <CardDescription>Relatos enviados pela equipe de campo que precisam de sua atenção.</CardDescription>
          </CardHeader>
        </Card>

        {isLoading ? renderSkeletons() : notices.length > 0 ? (
          notices.map(notice => (
            <Card key={notice.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50 p-4 border-b">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span><strong>Data:</strong> {format(notice.noticeDate.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  <span><strong>Por:</strong> {notice.collaboratorName}</span>
                  <span><strong>Local:</strong> {notice.location}</span>
                  <span><strong>Clima:</strong> <Badge variant="outline">{notice.weather}</Badge></span>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 p-3 rounded-md bg-muted min-h-[60px]">
                  <p>{notice.description}</p>
                </div>
                <div className="flex flex-col gap-2 w-full md:w-48">
                  {notice.imageUrl && (
                    <DialogTrigger asChild>
                       <Button variant="outline"><ImageIcon className="mr-2" />Ver Imagem</Button>
                    </DialogTrigger>
                  )}
                  <Button onClick={() => handleAction(notice, 'occurrence')} disabled={isUpdating === notice.id}>
                    {isUpdating === notice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-2" />}
                    Criar Ocorrência
                  </Button>
                  <Button onClick={() => handleAction(notice, 'treatment')} disabled={isUpdating === notice.id}>
                    {isUpdating === notice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2" />}
                    Criar Trat. de Risco
                  </Button>
                  <Button onClick={() => handleAction(notice, 'fauna')} disabled={isUpdating === notice.id}>
                     {isUpdating === notice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sprout className="mr-2" />}
                    Criar Fau/Flo/Geo
                  </Button>
                  <Button variant="secondary" onClick={() => handleMarkAsResolved(notice)} disabled={isUpdating === notice.id}>
                    {isUpdating === notice.id ? <Loader2 className="mr-2 animate-spin" /> : <Check className="mr-2" />}
                    Marcar como Resolvido
                  </Button>
                </div>
              </CardContent>
               {notice.imageUrl && (
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Imagem do Aviso</DialogTitle>
                            <DialogDescription>
                                Imagem anexada por {notice.collaboratorName} em {format(notice.noticeDate.toDate(), "dd/MM/yyyy", { locale: ptBR })}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="relative aspect-video w-full mt-4">
                            <Image
                                src={notice.imageUrl}
                                alt="Imagem do aviso"
                                layout="fill"
                                objectFit="contain"
                            />
                        </div>
                        <DialogClose asChild>
                           <Button type="button" variant="outline" className="mt-4">
                            Fechar
                           </Button>
                        </DialogClose>
                    </DialogContent>
               )}
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhum aviso pendente no momento.
            </CardContent>
          </Card>
        )}
      </div>
    </Dialog>
  );
}

    