'use client';

import { useState, useEffect, useCallback, useMemo, FormEvent } from 'react'; 
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
import { Copy, RefreshCw, Loader2, Send } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { format, setHours, setMinutes } from 'date-fns';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { hemorrhageOptions, airwayOptions, breathingOptions, circulationOptions, neuroOptions, exposureOptions } from '@/lib/rpo-options';

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
          setLocations((data.locations || []).sort((a: string, b: string) => a.localeCompare(b)));
        }
      } catch (error) {
        console.error(`Error fetching locations:`, error);
      } finally {
        setIsLoadingLocations(false);
      }
    };
    if (user) {
      fetchLocations();
    }
  }, [getSettingsDocRef, user]);

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

  const airwayOptions = [
    { value: 'Pérveas e livres', description: 'Vias aéreas limpas e desimpedidas; paciente respira ou fala sem obstrução.' },
    { value: 'Obstruídas por secreção/vômito', description: 'Realizada a limpeza e aspiração das vias aéreas no local.' },
    { value: 'Obstruídas por queda da língua', description: 'Realizada manobra manual de abertura das vias aéreas.' },
    { value: 'Obstrução total por corpo estranho', description: 'O corpo estranho foi removido com sucesso no local.' }
  ];

  const breathingOptions = [
    { value: 'Eupneico e estável', description: 'Respiração normal, sem esforço e pele de cor normal.' },
    { value: 'Taquipneico sem esforço', description: 'Respiração rápida, mas sem sinais de cansaço ou uso de músculos do pescoço/peito.' },
    { value: 'Dispneia com esforço', description: 'Respiração visivelmente difícil, rápida, com uso de musculatura acessória (esforço respiratório).' },
    { value: 'Respiração superficial/fraca', description: 'Expansão do peito muito reduzida, movimentos lentos ou ineficazes.' },
    { value: 'Apneia / Parada', description: 'Paciente não respira ou apresenta apenas gasping (suspiros agonizantes).' }
  ];

  const circulationOptions = [
    { value: 'Pulso presente, cheio e rítmico', description: 'Boa perfusão, pele de coloração normal e estável.' },
    { value: 'Pulso rápido (taquicardia) e pele pálida/fria', description: 'Sinais de alerta ou princípio de choque; monitorando atentamente.' },
    { value: 'Pulso fraco / filiforme', description: 'Circulação comprometida, perfusão periférica lentificada, Paciente aquecido, posicionado em decúbito dorsal.' },
    { value: 'Ausência de pulso / PCR', description: 'Parada cardiorrespiratória confirmada; iniciado protocolo de RCP.' }
  ];

  const neuroOptions = [
    { value: 'Alerta e orientado', description: 'Vítima responde prontamente, consciente e orientada no tempo e espaço.' },
    { value: 'Responde a estímulo verbal', description: 'Vítima sonolenta ou confusa, mas reage ao ser chamada pelo nome.' },
    { value: 'Responde apenas a estímulo doloroso', description: 'Vítima não responde à voz, reagindo apenas com movimento ou careta ao estímulo de dor.' },
    { value: 'Inconsciente (sem resposta)', description: 'Vítima irresponsiva a qualquer estímulo (quadro crítico).' }
  ];

  const exposureOptions = [
    { value: 'Exposto e protegido', description: 'Paciente totalmente examinado, sem lesões ocultas graves encontradas e aquecido (com manta/cobertor).' },
    { value: 'Lesões em membros', description: 'Presença de fraturas, deformidades ou ferimentos visíveis em braços/pernas; mantido aquecido.' },
    { value: 'Trauma em dorso/costas', description: 'Lesões ou dor na região posterior do corpo encontradas após rolamento em bloco.' },
    { value: 'Risco de Hipotermia', description: 'Paciente com a pele muito fria ou tremores; realizado o aquecimento imediato com mantas.' }
  ];

  const handleCopyReport = () => {
    const formattedDate = date ? format(new Date(date + 'T00:00:00'), 'dd/MM/yyyy') : 'N/A';

    const reportText = `RELATÓRIO DE PRONTO ATENDIMENTO
Parque de Natureza Buraco do Padre
Socorrista: ${rescuerName || 'Não informado'}

Data: ${formattedDate}
Hora: ${time}
Local: ${location || 'Não informado'}
Nome Completo: ${victimName || 'Não informado'}
Nascimento: ${birthDate || 'N/A'}
CPF: ${cpf || 'N/A'}
Fone: ${phone || 'N/A'}
Cidade/UF: ${cidade || 'N/A'}/${estado || 'N/A'}

--- AVALIAÇÃO PRIMÁRIA (XABCDE) ---
Hemorragias: ${x || 'N/A'}
   - ${hemorrhageOptions.find(o => o.value === x)?.description || 'Descrição não disponível.'}
Vias Aéreas: ${a || 'N/A'}
   - ${airwayOptions.find(o => o.value === a)?.description || 'Descrição não disponível.'}
Respiração: ${b || 'N/A'}
   - ${breathingOptions.find(o => o.value === b)?.description || 'Descrição não disponível.'}
Circulação: ${c || 'N/A'}
   - ${circulationOptions.find(o => o.value === c)?.description || 'Descrição não disponível.'}
Neurológico: ${d || 'N/A'}
   - ${neuroOptions.find(o => o.value === d)?.description || 'Descrição não disponível.'}
Exposição/Ambiente: ${exposure || 'N/A'}
   - ${exposureOptions.find(o => o.value === exposure)?.description || 'Descrição não disponível.'}${eDetails ? `\n   - Detalhes: ${eDetails}` : ''}

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
    setX(''); setA(''); setB(''); setC(''); setD(''); setEx('');
    setS(''); setAllergies(''); setMeds(''); setPast(''); setLastIntake(''); setEvents('');
    setConduct('');
    setOutcome('');
    setObservations('');
    setHasCopied(false);
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
  
      const noticeData = {
        userId: user.uid,
        collaboratorName: rescuerName || 'Socorrista não informado',
        noticeDate: Timestamp.now(),
        location: location || 'Local não informado',
        status: 'pendente',
        isRpo: true,
         rpoData: {
          date: typeof date === 'string' ? date : '',
          time: typeof time === 'string' ? time : '',
          location: typeof location === 'string' ? location : '',
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
          eDetails: (exposure === 'Lesões em membros' || exposure === 'Trauma em dorso/costas') && typeof eDetails === 'string' ? eDetails : '',
          s: typeof s === 'string' ? s : '', allergies: typeof allergies === 'string' ? allergies : '', meds: typeof meds === 'string' ? meds : '', past: typeof past === 'string' ? past : '', lastIntake: typeof lastIntake === 'string' ? lastIntake : '', events: typeof events === 'string' ? events : '',
          conduct: typeof conduct === 'string' ? conduct : '',
          observations: typeof observations === 'string' ? observations : ''
        },
      };
  
      await addDoc(noticesCollectionRef, noticeData);
      
      // Exibe o toast de sucesso imediatamente após o salvamento
      toast({ title: 'Sucesso!', description: 'RPO enviado para a Central de Avisos para análise do administrador.' });
      
      // Tenta redirecionar a página de forma segura
      try {
        setPage('pending-notices');
      } catch (navigationError) {
        console.error("Erro de navegação após envio do RPO:", navigationError);
      }
    } catch (error) {
      console.error("ERRO RPO:", error);
      toast({ variant: 'destructive', title: 'Erro ao Enviar', description: 'Não foi possível enviar o relatório.' });
    } finally {
      setIsSending(false);
    }
  };  

  const selectedAirwayDescription = useMemo(() => {
    return airwayOptions.find(opt => opt.value === a)?.description;
  }, [a, airwayOptions]);

  const selectedBreathingDescription = useMemo(() => {
    return breathingOptions.find(opt => opt.value === b)?.description;
  }, [b]);

  const selectedCirculationDescription = useMemo(() => {
    return circulationOptions.find(opt => opt.value === c)?.description;
  }, [c]);

  const selectedNeuroDescription = useMemo(() => {
    return neuroOptions.find(opt => opt.value === d)?.description;
  }, [d]);

  const selectedExposureDescription = useMemo(() => {
    return exposureOptions.find(opt => opt.value === exposure)?.description;
  }, [exposure]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>RPA - Relatório de Pronto Atendimento</CardTitle>
          <CardDescription>Preencha os campos para gerar o relatório do atendimento.</CardDescription>
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
                <Select name="rpoLocation" required disabled={isLoadingLocations || locations.length === 0} onValueChange={setLocation} value={location}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingLocations ? "Carregando..." : "Selecione o local"} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingLocations ? (
                      <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                    ) : (
                      locations.map((loc) => (<SelectItem key={loc} value={loc}>{loc}</SelectItem>))
                    )}
                  </SelectContent>
                </Select>
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
                <Select onValueChange={setX} value={x}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a situação da hemorragia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sem hemorragias graves aparentes">Sem hemorragias graves aparentes</SelectItem>
                    <SelectItem value="Contido com curativo compressivo">Contido com curativo compressivo</SelectItem>
                    <SelectItem value="Contido com torniquete">Contido com torniquete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>A - Vias Aéreas</Label>
                <Select onValueChange={setA} value={a}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a situação das vias aéreas" />
                  </SelectTrigger>
                  <SelectContent>{airwayOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.value}</SelectItem>)}</SelectContent>
                </Select>
                {selectedAirwayDescription && <p className="text-xs text-muted-foreground p-2 bg-muted rounded-md">{selectedAirwayDescription}</p>}
              </div>
              <div className="space-y-2">
                <Label>B - Boa Respiração e Ventilação</Label>
                <Select onValueChange={setB} value={b}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o padrão respiratório" />
                  </SelectTrigger>
                  <SelectContent>{breathingOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.value}</SelectItem>)}</SelectContent>
                </Select>
                {selectedBreathingDescription && <p className="text-xs text-muted-foreground p-2 bg-muted rounded-md">{selectedBreathingDescription}</p>}
              </div>
              <div className="space-y-2">
                <Label>C - Circulação</Label>
                <Select onValueChange={setC} value={c}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status circulatório" />
                  </SelectTrigger>
                  <SelectContent>{circulationOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.value}</SelectItem>)}</SelectContent>
                </Select>
                {selectedCirculationDescription && <p className="text-xs text-muted-foreground p-2 bg-muted rounded-md">{selectedCirculationDescription}</p>}
              </div>
              <div className="space-y-2">
                <Label>D - Estado Neurológico</Label>
                <Select onValueChange={setD} value={d}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado neurológico" />
                  </SelectTrigger>
                  <SelectContent>{neuroOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.value}</SelectItem>)}</SelectContent>
                </Select>
                {selectedNeuroDescription && <p className="text-xs text-muted-foreground p-2 bg-muted rounded-md">{selectedNeuroDescription}</p>}
              </div>
              <div className="space-y-2">
                <Label>E - Exposição</Label>
                <Select onValueChange={(value) => { setExposure(value); setEDetails(''); }} value={exposure}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a situação de exposição" />
                  </SelectTrigger>
                  <SelectContent>{exposureOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.value}</SelectItem>)}</SelectContent>
                </Select>
                {selectedExposureDescription && <p className="text-xs text-muted-foreground p-2 bg-muted rounded-md">{selectedExposureDescription}</p>}
                {(exposure === 'Lesões em membros' || exposure === 'Trauma em dorso/costas') && (
                  <Textarea placeholder={exposure === 'Lesões em membros' ? "Especifique o membro afetado..." : "Especifique a região do dorso..."} value={eDetails} onChange={(ev) => setEDetails(ev.target.value)} className="mt-2" />
                )}
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