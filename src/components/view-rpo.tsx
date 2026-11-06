'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Copy, RefreshCw, Loader2, Send, Wifi, WifiOff, CloudUpload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, setHours, setMinutes } from 'date-fns';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { addRpaToQueue, getRpaQueue } from '@/lib/rpo-offline';

interface ViewRpoProps {
  prefillData?: any | null; // Dados para preencher o formulário, se houver
  setPage: (page: string, options?: { prefill?: any }) => void; // Função para mudar a página no AppLayout
}

export function ViewRpo({ prefillData, setPage }: ViewRpoProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  // State for all form fields
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [location, setLocation] = useState('');
  const [victimName, setVictimName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [rescuerName, setRescuerName] = useState('');

  // XABCDE
  const [x, setX] = useState('');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');
  const [d, setD] = useState('');
  const [exposure, setExposure] = useState('');
  const [eDetails, setEDetails] = useState(''); // State for the new sub-field

  // SAMPLE
  const [s, setS] = useState('');
  const [allergies, setAllergies] = useState('');
  const [meds, setMeds] = useState('');
  const [past, setPast] = useState('');
  const [lastIntake, setLastIntake] = useState('');
  const [events, setEvents] = useState('');

  // Outcome
  const [conduct, setConduct] = useState('');
  const [outcome, setOutcome] = useState('');
  const [observations, setObservations] = useState('');

  // Data loading states
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineLocation, setOfflineLocation] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  useEffect(() => {
    const fetchLocations = async () => {
      const docRef = getSettingsDocRef('locations');
      if (!docRef) {
        setIsLoadingLocations(false);
        return;
      }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const sortedLocations = (data.locations || []).sort((a: string, b: string) => a.localeCompare(b));
          setLocations(sortedLocations);
          window.localStorage.setItem('sgs-rpa-locations', JSON.stringify(sortedLocations));
        }
      } catch (error) {
        console.error(`Error fetching locations:`, error);
        try {
          const cachedLocations = JSON.parse(window.localStorage.getItem('sgs-rpa-locations') || '[]');
          if (Array.isArray(cachedLocations)) setLocations(cachedLocations);
        } catch (cacheError) {
          console.error('Erro ao carregar locais salvos:', cacheError);
        }
      } finally {
        setIsLoadingLocations(false);
      }
    };
    if (user) {
      fetchLocations();
    }
  }, [getSettingsDocRef, user]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setPendingCount(getRpaQueue().filter(item => !user || item.userId === user.uid).length);

    const updateConnection = () => setIsOnline(navigator.onLine);
    const updatePendingCount = () => {
      setPendingCount(getRpaQueue().filter(item => !user || item.userId === user.uid).length);
    };
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    window.addEventListener('rpa-queue-changed', updatePendingCount);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/rpa-offline-sw.js').catch(error => {
        console.error('Erro ao registrar o cache offline do RPA:', error);
      });
    }

    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
      window.removeEventListener('rpa-queue-changed', updatePendingCount);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const draftKey = `sgs-rpa-draft-${user.uid}`;
    try {
      const savedDraft = JSON.parse(window.localStorage.getItem(draftKey) || 'null');
      if (savedDraft) {
        setDate(savedDraft.date || format(new Date(), 'yyyy-MM-dd'));
        setTime(savedDraft.time || format(new Date(), 'HH:mm'));
        setLocation(savedDraft.location || '');
        setOfflineLocation(savedDraft.offlineLocation || '');
        setVictimName(savedDraft.victimName || '');
        setBirthDate(savedDraft.birthDate || '');
        setCpf(savedDraft.cpf || '');
        setPhone(savedDraft.phone || '');
        setCidade(savedDraft.cidade || '');
        setEstado(savedDraft.estado || '');
        setRescuerName(savedDraft.rescuerName || '');
        setX(savedDraft.x || '');
        setA(savedDraft.a || '');
        setB(savedDraft.b || '');
        setC(savedDraft.c || '');
        setD(savedDraft.d || '');
        setExposure(savedDraft.exposure || '');
        setEDetails(savedDraft.eDetails || '');
        setS(savedDraft.s || '');
        setAllergies(savedDraft.allergies || '');
        setMeds(savedDraft.meds || '');
        setPast(savedDraft.past || '');
        setLastIntake(savedDraft.lastIntake || '');
        setEvents(savedDraft.events || '');
        setConduct(savedDraft.conduct || '');
        setOutcome(savedDraft.outcome || '');
        setObservations(savedDraft.observations || '');
        setHasCopied(savedDraft.hasCopied || false);
      }
    } catch (error) {
      console.error('Erro ao restaurar o rascunho offline do RPA:', error);
    } finally {
      setIsDraftLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !isDraftLoaded) return;

    const draftKey = `sgs-rpa-draft-${user.uid}`;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(draftKey, JSON.stringify({
        date, time, location, offlineLocation, victimName, birthDate, cpf, phone,
        cidade, estado, rescuerName, x, a, b, c, d, exposure, eDetails, s,
        allergies, meds, past, lastIntake, events, conduct, outcome, observations,
        hasCopied,
      }));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    user, isDraftLoaded, date, time, location, offlineLocation, victimName,
    birthDate, cpf, phone, cidade, estado, rescuerName, x, a, b, c, d,
    exposure, eDetails, s, allergies, meds, past, lastIntake, events,
    conduct, outcome, observations, hasCopied,
  ]);

  useEffect(() => {
    // Set current date and time on component mount
    const now = new Date();
    setDate(format(now, 'yyyy-MM-dd'));
    setTime(format(now, 'HH:mm'));
  }, []);

  useEffect(() => {
    if (prefillData) {
      setDate(prefillData.date || format(new Date(), 'yyyy-MM-dd'));
      setTime(prefillData.time || format(new Date(), 'HH:mm'));
      setLocation(prefillData.location || '');
      setVictimName(prefillData.victimName || '');
      setBirthDate(prefillData.birthDate || '');
      setCpf(prefillData.cpf || '');
      setPhone(prefillData.phone || '');
      setCidade(prefillData.cidade || '');
      setEstado(prefillData.estado || '');
      setRescuerName(prefillData.rescuerName || '');
      setX(prefillData.x || '');
      setA(prefillData.a || '');
      setB(prefillData.b || '');
      setC(prefillData.c || '');
      setD(prefillData.d || '');
      setExposure(prefillData.e || '');
      setEDetails(prefillData.eDetails || '');
      setS(prefillData.s || '');
      setAllergies(prefillData.allergies || '');
      setMeds(prefillData.meds || '');
      setHasCopied(false); // Garante que o fluxo de cópia seja refeito
      setPast(prefillData.past || '');
      setLastIntake(prefillData.lastIntake || '');
      setEvents(prefillData.events || '');
      setConduct(prefillData.conduct || '');
      setObservations(prefillData.observations || '');
    }
  }, [prefillData]);

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não for dígito
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    if (value.length > 5) {
      value = `${value.slice(0, 5)}/${value.slice(5)}`;
    }
    setBirthDate(value.slice(0, 10)); // Limita a 10 caracteres (dd/mm/yyyy)
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    let value = raw;
    if (raw.length > 9) {
      value = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
    } else if (raw.length > 6) {
      value = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    } else if (raw.length > 3) {
      value = `${raw.slice(0, 3)}.${raw.slice(3)}`;
    }
    setCpf(value);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    let value = raw;
    if (raw.length > 10) {
      value = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    } else if (raw.length > 6) {
      value = `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    } else if (raw.length > 2) {
      value = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    } else if (raw.length > 0) {
      value = `(${raw}`;
    }
    setPhone(value);
  };

  const handleCopyReport = () => {
    const formattedDate = date ? format(new Date(date + 'T00:00:00'), 'dd/MM/yyyy') : 'N/A';

    const reportText = `RELATÓRIO DE PRONTO ATENDIMENTO
Parque de Natureza Buraco do Padre
Socorrista: ${rescuerName || 'Não informado'}

Data: ${formattedDate}
Hora: ${time}
Local: ${(!isOnline ? offlineLocation : location) || 'Não informado'}
Nome Completo: ${victimName || 'Não informado'}
Nascimento: ${birthDate || 'N/A'}
CPF: ${cpf || 'N/A'}
Fone: ${phone || 'N/A'}
Cidade/UF: ${cidade || 'N/A'}/${estado || 'N/A'}

--- AVALIAÇÃO PRIMÁRIA (XABCDE) ---
Hemorragias: ${x || 'N/A'}
Vias Aéreas: ${a || 'N/A'}
Respiração: ${b || 'N/A'}
Circulação: ${c || 'N/A'}
Neurológico: ${d || 'N/A'}
Exposição/Ambiente: ${exposure || 'N/A'}
Detalhes da exposição: ${eDetails || 'N/A'}

--- AVALIAÇÃO SECUNDÁRIA (SAMPLE) ---
Sinais e Sintomas: ${s || 'N/A'}
Alergias: ${allergies || 'N/A'}
Medicamentos: ${meds || 'N/A'}
Passado Médico: ${past || 'N/A'}
Última Ingestão: ${lastIntake || 'N/A'}
Eventos Anteriores: ${events || 'N/A'}

--- CONDUTA E DESFECHO ---
Conduta Realizada: ${conduct || 'N/A'}
Observações Gerais:
${observations || 'Nenhuma.'}`.trim();

    navigator.clipboard.writeText(reportText).then(() => {
      toast({
        title: "Relatório Copiado!",
        description: "O botão para enviar à Central de Avisos foi liberado.",
      });
      setHasCopied(true);
    }).catch(err => {
      console.error('Failed to copy: ', err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível copiar o relatório.",
      });
    });
  };

  const resetForm = () => {
    const now = new Date();
    setDate(format(now, 'yyyy-MM-dd'));
    setTime(format(now, 'HH:mm'));
    setLocation('');
    setVictimName('');
    setBirthDate('');
    setCpf('');
    setPhone('');
    setCidade('');
    setEstado('');
    setRescuerName('');
    setX(''); setA(''); setB(''); setC(''); setD(''); setExposure('');
    setS(''); setAllergies(''); setMeds(''); setPast(''); setLastIntake(''); setEvents('');
    setConduct('');
    setOutcome('');
    setObservations('');
    setHasCopied(false);
    if (user) window.localStorage.removeItem(`sgs-rpa-draft-${user.uid}`);
    setOfflineLocation('');
    toast({ title: "Formulário Limpo", description: "Todos os campos foram redefinidos." });
  };

 const handleSendToNotices = async (e: FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você não está autenticado.' });
      return;
    }

    if (!hasCopied) {
        toast({ variant: 'destructive', title: 'Ação Necessária', description: 'Por favor, copie o relatório antes de enviá-lo.' });
        setIsSending(false);
        return;
    }
  
    setIsSending(true);
  
    try {
      const noticesCollectionRef = collection(firestore, 'sgs_genius', user.uid, 'notices');
      const effectiveLocation = (!isOnline ? offlineLocation : location) || 'Local não informado';
  
      const noticeData = {
        userId: user.uid,
        collaboratorName: rescuerName || 'Socorrista não informado',
        noticeDate: isOnline ? Timestamp.now() : new Date().toISOString(),
        location: effectiveLocation,
        status: 'pendente',
        isRpo: true,
         rpoData: {
          date: typeof date === 'string' ? date : '',
          time: typeof time === 'string' ? time : '',
          location: effectiveLocation,
          offlineLocation: !isOnline ? effectiveLocation : '',
          victimName: typeof victimName === 'string' ? victimName : '',
          birthDate: typeof birthDate === 'string' ? birthDate : '',
          cpf: typeof cpf === 'string' ? cpf : '',
          phone: typeof phone === 'string' ? phone : '',
          cidade: typeof cidade === 'string' ? cidade : '',
          estado: typeof estado === 'string' ? estado : '',
          rescuerName: typeof rescuerName === 'string' ? rescuerName : '',
          x: typeof x === 'string' ? x : '',
          a: typeof a === 'string' ? a : '',
          b: typeof b === 'string' ? b : '',
          c: typeof c === 'string' ? c : '',
          d: typeof d === 'string' ? d : '',
          e: typeof exposure === 'string' ? exposure : '',
          eDetails: typeof eDetails === 'string' ? eDetails : '',
          s: typeof s === 'string' ? s : '', allergies: typeof allergies === 'string' ? allergies : '', meds: typeof meds === 'string' ? meds : '', past: typeof past === 'string' ? past : '', lastIntake: typeof lastIntake === 'string' ? lastIntake : '', events: typeof events === 'string' ? events : '',
          conduct: typeof conduct === 'string' ? conduct : '',
          observations: typeof observations === 'string' ? observations : ''
        },
      };
  
      if (!isOnline) {
        addRpaToQueue(user.uid, noticeData as unknown as Record<string, unknown>);
        const remaining = getRpaQueue().filter(item => item.userId === user.uid).length;
        setPendingCount(remaining);
        window.localStorage.removeItem(`sgs-rpa-draft-${user.uid}`);
        toast({
          title: 'RPA salvo offline',
          description: 'O relatório ficará aguardando e será enviado automaticamente quando houver internet.',
        });
      } else {
        await addDoc(noticesCollectionRef, noticeData);
        window.localStorage.removeItem(`sgs-rpa-draft-${user.uid}`);
        toast({ title: 'Sucesso!', description: 'RPO enviado para a Central de Avisos para análise do administrador.' });

        try {
          setPage('pending-notices');
        } catch (navigationError) {
          console.error("Erro de navegação após envio do RPO:", navigationError);
        }
      }
    } catch (error) {
      console.error("ERRO RPO:", error);
      toast({ variant: 'destructive', title: 'Erro ao Enviar', description: 'Não foi possível enviar o relatório.' });
    } finally {
      setIsSending(false);
    }
  };  

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>RPA - Relatório de Pronto Atendimento</CardTitle>
          <CardDescription>Preencha os campos para gerar o relatório do atendimento.</CardDescription>
          <div className="flex flex-wrap items-center gap-3 pt-2 text-sm">
            <span className={`inline-flex items-center gap-1.5 font-medium ${isOnline ? 'text-green-700' : 'text-amber-700'}`}>
              {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {isOnline ? 'Conectado' : 'Modo offline'}
            </span>
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <CloudUpload className="h-4 w-4" />
                {pendingCount} RPA(s) aguardando envio
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Cabeçalho da Ocorrência */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold text-lg">Cabeçalho da Ocorrência</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Hora</Label><Input type="time" value={time} onChange={e => setTime(e.target.value)} required /></div>
              <div className="space-y-2">
                <Label>Local da Ocorrência</Label>
                <Select name="rpoLocation" disabled={isLoadingLocations || locations.length === 0 || !isOnline} onValueChange={setLocation} value={location}>
                  <SelectTrigger>
                    <SelectValue placeholder={!isOnline ? "Lista indisponível offline" : isLoadingLocations ? "Carregando..." : "Selecione o local"} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingLocations ? (
                      <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                    ) : (
                      locations.map((loc) => (<SelectItem key={loc} value={loc}>{loc}</SelectItem>))
                    )}
                  </SelectContent>
                </Select>
                {!isOnline && (
                  <Input
                    value={offlineLocation}
                    onChange={e => setOfflineLocation(e.target.value)}
                    placeholder="Descreva o local da ocorrência"
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-2"><Label>Socorrista</Label><Input placeholder="Nome do responsável" value={rescuerName} onChange={e => setRescuerName(e.target.value)} required /></div>
              <div className="space-y-2 lg:col-span-3"><Label>Nome Completo</Label><Input placeholder="Nome completo da vítima" value={victimName} onChange={e => setVictimName(e.target.value)} required /></div>
              <div className="space-y-2 lg:col-span-1"><Label>CPF</Label><Input placeholder="000.000.000-00" value={cpf} onChange={handleCpfChange} /></div>
              <div className="space-y-2"><Label>Data de Nascimento</Label><Input placeholder="dd/mm/aaaa" value={birthDate} onChange={handleBirthDateChange} maxLength={10} /></div>
              <div className="space-y-2"><Label>Fone</Label><Input placeholder="(00) 00000-0000" value={phone} onChange={handlePhoneChange} /></div>
              <div className="space-y-2"><Label>Cidade</Label><Input placeholder="Cidade de residência" value={cidade} onChange={e => setCidade(e.target.value)} /></div>
              <div className="space-y-2"><Label>Estado</Label><Input placeholder="UF" value={estado} onChange={e => setEstado(e.target.value)} /></div>
            </div>
          </div>

          {/* Avaliação Primária */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold text-lg">Avaliação Primária (XABCDE)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>X - Hemorragias Exsanguinantes</Label>
                <Textarea placeholder="Descreva a situação das hemorragias..." value={x} onChange={e => setX(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>A - Vias Aéreas</Label>
                <Textarea placeholder="Descreva a situação das vias aéreas..." value={a} onChange={e => setA(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>B - Respiração e Ventilação</Label>
                <Textarea placeholder="Descreva a respiração e ventilação..." value={b} onChange={e => setB(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>C - Circulação</Label>
                <Textarea placeholder="Descreva o estado circulatório..." value={c} onChange={e => setC(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>D - Estado Neurológico</Label>
                <Textarea placeholder="Descreva o estado neurológico..." value={d} onChange={e => setD(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E - Exposição</Label>
                <Textarea placeholder="Descreva a exposição e o ambiente..." value={exposure} onChange={e => setExposure(e.target.value)} />
                <Textarea placeholder="Detalhes adicionais da exposição..." value={eDetails} onChange={e => setEDetails(e.target.value)} className="mt-2" />
              </div>
            </div>
          </div>

          {/* Avaliação Secundária */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold text-lg">Histórico e Avaliação Secundária (SAMPLE)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>S - Sinais e Sintomas</Label><Textarea placeholder="O que a vítima relata sentir..." value={s} onChange={e => setS(e.target.value)} /></div>
              <div className="space-y-2"><Label>A - Alergias</Label><Textarea placeholder="Alergias conhecidas..." value={allergies} onChange={e => setAllergies(e.target.value)} /></div>
              <div className="space-y-2"><Label>M - Medicamentos em Uso</Label><Textarea placeholder="Medicamentos de uso contínuo..." value={meds} onChange={e => setMeds(e.target.value)} /></div>
              <div className="space-y-2"><Label>P - Passado Médico</Label><Textarea placeholder="Histórico de saúde relevante..." value={past} onChange={e => setPast(e.target.value)} /></div>
              <div className="space-y-2"><Label>L - Líquidos e Alimentos</Label><Textarea placeholder="Última vez que comeu ou bebeu..." value={lastIntake} onChange={e => setLastIntake(e.target.value)} /></div>
              <div className="space-y-2"><Label>E - Eventos Anteriores</Label><Textarea placeholder="O que aconteceu antes do incidente..." value={events} onChange={e => setEvents(e.target.value)} /></div>
            </div>
          </div>

          {/* Conduta e Desfecho */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold text-lg">Conduta e Desfecho</h3>
            <div className="space-y-2"><Label>Conduta Realizada no Local</Label><Textarea placeholder="Curativos, imobilização, oxigênio..." value={conduct} onChange={e => setConduct(e.target.value)} className="min-h-[120px]" /></div>
            <div className="space-y-2 pt-4"><Label>Observações Gerais</Label><Textarea placeholder="Informações adicionais relevantes..." value={observations} onChange={e => setObservations(e.target.value)} /></div>
          </div>

        </CardContent>
        <CardFooter className="flex flex-col items-end gap-2 border-t pt-6">
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button variant="outline" onClick={handleSendToNotices} type="button" disabled={!hasCopied || isSending} title={!hasCopied ? "Copie o relatório primeiro" : "Enviar para análise"}>
                    {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {isSending ? 'Enviando...' : 'Enviar para Central de Avisos'}
                </Button>
                <Button variant="secondary" onClick={handleCopyReport} type="button" disabled={isSending}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Relatório
                </Button>
            </div>
            {!hasCopied && <p className="text-xs text-muted-foreground mt-2">Copie o Relatório e o botão "Enviar" será liberado.</p>}
        </CardFooter>
      </Card>
    </div>
  );
}