
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
  DialogClose, HeartPulse
} from "@/components/ui/dialog";
import { type LocationData } from './map-selector';
import Image from 'next/image';
import { airwayOptions, breathingOptions, circulationOptions, exposureOptions, hemorrhageOptions, neuroOptions } from '@/lib/rpo-options';

interface Notice {
  id: string;
  collaboratorName: string;
  noticeDate: Timestamp;
  weather: string;
  description: string;
  location: string;
  mapMarker?: { x: number; y: number };
  mapLocation?: LocationData;
  status: 'pendente' | 'finalizado';
  imageUrl?: string;
  isRpo?: boolean;
  rpoData?: RpoData;
}

interface RpoData {
  date: string;
  time: string;
  location: string;
  victimName: string;
  birthDate: string;
  cpf: string;
  phone: string;
  cidade: string;
  estado: string;
  rescuerName: string;
  x: string;
  a: string;
  b: string;
  c: string;
  d: string;
  e: string;
  eDetails: string;
  s: string;
  allergies: string;
  meds: string;
  past: string;
  lastIntake: string;
  events: string;
  conduct: string;
  observations: string;
}

interface PendingNoticesProps {
  setPage: (page: string, options?: { prefill: any }) => void;
}

export function PendingNotices({ setPage }: PendingNoticesProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [allPendingNotices, setAllPendingNotices] = useState<Notice[]>([]);
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
      setAllPendingNotices(pendingNotices);
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

  const regularNotices = allPendingNotices.filter(n => !n.isRpo);
  const rpoNotices = allPendingNotices.filter(n => n.isRpo);


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

  const handleCreateFromNotice = (notice: Notice, targetPage: 'register-occurrence' | 'register-treatment' | 'register-fauna-flora-geo') => {
    let prefill: any;

    if (notice.isRpo && notice.rpoData) {
      // Mapeamento específico para RPO -> Ocorrência
      const rpoDetails = `
--- RELATÓRIO DE PRONTO ATENDIMENTO (RPO) ---

AVALIAÇÃO PRIMÁRIA (XABCDE):
X (Hemorragia): ${notice.rpoData.x || 'N/A'}
A (Vias Aéreas): ${notice.rpoData.a || 'N/A'}
B (Respiração): ${notice.rpoData.b || 'N/A'}
C (Circulação): ${notice.rpoData.c || 'N/A'}
D (Neurológico): ${notice.rpoData.d || 'N/A'}
E (Exposição): ${notice.rpoData.e ? `${notice.rpoData.e}${notice.rpoData.eDetails ? ` (${notice.rpoData.eDetails})` : ''}` : 'N/A'}

AVALIAÇÃO SECUNDÁRIA (SAMPLE):
S (Sinais/Sintomas): ${notice.rpoData.s || 'N/A'}
A (Alergias): ${notice.rpoData.allergies || 'N/A'}
M (Medicações): ${notice.rpoData.meds || 'N/A'}
P (Passado Médico): ${notice.rpoData.past || 'N/A'}
L (Líquidos/Alimentos): ${notice.rpoData.lastIntake || 'N/A'}
E (Eventos): ${notice.rpoData.events || 'N/A'}

CONDUTA:
${notice.rpoData.conduct || 'N/A'}

OBSERVAÇÕES GERAIS:
${notice.rpoData.observations || 'N/A'}
      `.trim();

      prefill = {
        noticeId: notice.id,
        occurrenceDate: notice.rpoData.date ? new Date(notice.rpoData.date + 'T00:00:00') : notice.noticeDate,
        occurrenceLocation: notice.rpoData.location, // Garante que o local do RPO seja usado
        location: notice.rpoData.location, // Adicionado para consistência com o preenchimento de avisos normais
        involvedPersonName: notice.rpoData.victimName,
        birthDate: notice.rpoData.birthDate,
        cpf: notice.rpoData.cpf,
        phone: notice.rpoData.phone,
        city: notice.rpoData.cidade,
        state: notice.rpoData.estado,
        description: rpoDetails,
      };
    } else {
      // Mapeamento padrão para avisos normais
      prefill = {
        noticeId: notice.id,
        date: notice.noticeDate,
        description: notice.description,
        location: notice.location,
        mapMarker: notice.mapMarker,
        mapLocation: notice.mapLocation,
        collaboratorName: notice.collaboratorName,
      };
    }

    setPage(targetPage, { prefill });
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
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Central de Avisos</CardTitle>
            <CardDescription>Relatos e atendimentos de campo que precisam de sua atenção.</CardDescription>
          </CardHeader>
        </Card>

        {isLoading ? renderSkeletons() : regularNotices.length > 0 ? (
          regularNotices.map(notice => (
            <Card key={notice.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50 p-4 border-b">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
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
                    <Dialog> {/* Adicionado Dialog para encapsular o trigger e o conteúdo da imagem */}
                      <DialogTrigger asChild>
                         <Button variant="outline"><ImageIcon className="mr-2" />Ver Imagem</Button>
                      </DialogTrigger>
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
                                  fill
                                  style={{objectFit: 'contain'}}
                              />
                          </div>
                          <DialogClose asChild>
                             <Button type="button" variant="outline" className="mt-4">
                              Fechar
                             </Button>
                          </DialogClose>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button onClick={() => handleCreateFromNotice(notice, 'register-occurrence')} disabled={isUpdating === notice.id}>
                    {isUpdating === notice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-2" />}
                    Criar Ocorrência
                  </Button>
                  <Button onClick={() => handleCreateFromNotice(notice, 'register-treatment')} disabled={isUpdating === notice.id}>
                    {isUpdating === notice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2" />}
                    Criar Trat. de Risco
                  </Button>
                  <Button onClick={() => handleCreateFromNotice(notice, 'register-fauna-flora-geo')} disabled={isUpdating === notice.id}>
                     {isUpdating === notice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sprout className="mr-2" />}
                    Criar Fau/Flo/Geo
                  </Button>
                  <Button variant="secondary" onClick={() => handleMarkAsResolved(notice)} disabled={isUpdating === notice.id}>
                    {isUpdating === notice.id ? <Loader2 className="mr-2 animate-spin" /> : <Check className="mr-2" />}
                    Marcar como Resolvido
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhum aviso pendente no momento.
            </CardContent>
          </Card>
        )}

        {/* Seção para RPOs */}
        <div className="mt-8">
          <Card>
            <CardHeader>
                <CardTitle>Relatórios de Pronto Atendimento (RPO) Pendentes</CardTitle>
                <CardDescription>Atendimentos de campo que precisam ser analisados e convertidos em ocorrência.</CardDescription>
            </CardHeader>
          </Card>
          {isLoading ? null : rpoNotices.length > 0 ? (
              rpoNotices.map(notice => (
                  <Card key={notice.id} className="overflow-hidden mt-6">
                      <CardHeader className="bg-muted/50 p-4 border-b">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                              <span><strong>Data:</strong> {format(notice.noticeDate.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                              <span><strong>Socorrista:</strong> {notice.rpoData?.rescuerName || 'Não informado'}</span>
                              <span><strong>Local da Ocorrência:</strong> {notice.rpoData?.location || 'Não informado'}</span>
                          </div>
                      </CardHeader>
                      <CardContent className="p-4">
                          <div className="flex-1 p-3 rounded-md bg-muted min-h-[60px] text-sm whitespace-pre-wrap">
                              {`Nome Completo: ${notice.rpoData?.victimName || 'Não informado'}
Local da Ocorrência: ${notice.rpoData?.location || 'Não informado'}

--- AVALIAÇÃO PRIMÁRIA ---
X (Hemorragia): ${notice.rpoData?.x || 'Não informado'}
   - ${hemorrhageOptions.find(o => o.value === notice.rpoData?.x)?.description || 'Descrição não disponível.'}
A (Vias Aéreas): ${notice.rpoData?.a || 'Não informado'}
   - ${airwayOptions.find(o => o.value === notice.rpoData?.a)?.description || 'Descrição não disponível.'}
B (Respiração): ${notice.rpoData?.b || 'Não informado'}
   - ${breathingOptions.find(o => o.value === notice.rpoData?.b)?.description || 'Descrição não disponível.'}
C (Circulação): ${notice.rpoData?.c || 'Não informado'}
   - ${circulationOptions.find(o => o.value === notice.rpoData?.c)?.description || 'Descrição não disponível.'}
D (Neurológico): ${notice.rpoData?.d || 'Não informado'}
   - ${neuroOptions.find(o => o.value === notice.rpoData?.d)?.description || 'Descrição não disponível.'}
E (Exposição): ${notice.rpoData?.e || notice.rpoData?.exposure || 'Não informado'}
   - ${exposureOptions.find(o => o.value === (notice.rpoData?.e || notice.rpoData?.exposure))?.description || 'Descrição não disponível.'}${notice.rpoData?.eDetails ? `
   - Detalhes: ${notice.rpoData.eDetails}` : ''}

--- AVALIAÇÃO SECUNDÁRIA ---
S (Sinais/Sintomas): ${notice.rpoData?.s || 'Não informado'}
A (Alergias): ${notice.rpoData?.allergies || 'N/A'}
M (Medicações): ${notice.rpoData?.meds || 'N/A'}
P (Passado Médico): ${notice.rpoData?.past || 'N/A'}
L (Líquidos/Alimentos): ${notice.rpoData?.lastIntake || 'N/A'}
E (Eventos): ${notice.rpoData?.events || 'N/A'}

--- CONDUTA ---
${notice.rpoData?.conduct || 'N/A'}

--- OBSERVAÇÕES GERAIS ---
${notice.rpoData?.observations || 'Nenhuma.'}`}
                          </div>
                      </CardContent>
                      <CardFooter className="p-4 border-t flex flex-col sm:flex-row gap-2 justify-end">
                        <Button variant="secondary" onClick={() => handleMarkAsResolved(notice)} disabled={isUpdating === notice.id} className="w-full sm:w-auto">
                            {isUpdating === notice.id ? <Loader2 className="mr-2 animate-spin" /> : <Check className="mr-2" />}
                            Marcar como Resolvido
                        </Button>
                        <Button onClick={() => handleCreateFromNotice(notice, 'register-occurrence')} disabled={isUpdating === notice.id} className="w-full sm:w-auto">
                            {isUpdating === notice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-2" />}
                            Criar Ocorrência
                        </Button>
                      </CardFooter>
                  </Card>
              ))
          ) : (
              <Card className="mt-6"><CardContent className="p-6 text-center text-muted-foreground">Nenhum RPO pendente no momento.</CardContent></Card>
          )}
        </div>
      </div> {/* Fim da div de conteúdo principal */}
    </> // Fim do React.Fragment
  );
}

    
