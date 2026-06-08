'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileDown, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Separator } from './ui/separator';
import { useFirestore, useUser } from '@/firebase';
import { doc, writeBatch, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import Papa from 'papaparse';
import { useProfile } from '@/context/profile-context';

type ImportType = 'equipments' | 'occurrences' | 'treatments' | 'faunaFloraGeo';

export function ManageDataTransfer() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const { profile } = useProfile();
  const isAdmin = profile === 'admin';
  
  const [isImporting, setIsImporting] = useState<ImportType | null>(null);
  const [lastImported, setLastImported] = useState<{ type: ImportType, count: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentImportType, setCurrentImportType] = useState<ImportType | null>(null);

  // Limpa a mensagem de sucesso após 5 segundos
  useEffect(() => {
    if (lastImported) {
      const timer = setTimeout(() => {
        setLastImported(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastImported]);

  const parseDateString = (dateString: string): Date | null => {
    if (!dateString || typeof dateString !== 'string') return null;
    // Busca grupos de números (Dia, Mês, Ano)
    const parts = dateString.match(/\d+/g);
    if (!parts || parts.length < 3) return null;
    
    let year, month, day;
    if (dateString.includes('/')) {
      // Padrão DD/MM/AAAA
      [day, month, year] = parts.map(Number);
    } else if (dateString.includes('-')) {
      // Padrão AAAA-MM-DD
      [year, month, day] = parts.map(Number);
    } else {
      // Tentativa genérica
      [day, month, year] = parts.map(Number);
    }

    if (year < 100) year += 2000; // Converte 25 para 2025
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    
    return new Date(year, month - 1, day);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>, type: ImportType) => {
    const file = event.target.files?.[0];
    if (!file || !firestore || !user) return;

    setIsImporting(type);
    Papa.parse(file, {
      header: false,
      skipEmptyLines: 'greedy',
      delimiter: "", // Detecta automaticamente se é vírgula ou ponto e vírgula
      quoteChar: '"',
      encoding: "ISO-8859-1", // Padrão do Excel no Brasil
      transform: (value) => value?.trim() || '',
      complete: async (results) => {
        const rawData = results.data as string[][];
        let data = rawData.filter(row => 
          Array.isArray(row) && row.some(cell => cell && cell.toString().trim() !== '')
        );

        if (data.length === 0) {
          toast({ variant: 'destructive', title: 'Arquivo inválido', description: 'O arquivo CSV não contém dados utilizáveis.' });
          setIsImporting(null);
          return;
        }

        try {
          let collectionName = '';
          let totalImportedCount = 0;

          switch(type) {
            case 'equipments': collectionName = 'equipments'; break;
            case 'occurrences': collectionName = 'chat_messages'; break;
            case 'treatments': collectionName = 'risk_treatments'; break;
            case 'faunaFloraGeo': collectionName = 'fauna_flora_geo'; break;
          }
          const collectionRef = collection(firestore, 'sgs_genius', user.uid, collectionName);

          // Firestore batch limit is 500 operations. We need to chunk the data.
          const chunkSize = 500;
          for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            const batch = writeBatch(firestore);

            chunk.forEach(row => {
              let importData: any = null;

              if (!row || row.length < 2) return;

              if (type === 'equipments') {
                const [eqType, brand, model, lot, mfgDate, loc, details, status, lastInsp, nextInsp] = row;
                if (!eqType || row.length < 2) return;
                if (eqType?.toLowerCase().includes('tip') || brand?.toLowerCase().includes('mar')) return;

                if (eqType || brand) {
                  importData = {
                    userId: user.uid, createdAt: serverTimestamp(),
                    equipmentType: eqType, brand, model: model || '', lotCaUiaa: lot || '',
                    manufacturingDate: parseDateString(mfgDate) ? Timestamp.fromDate(parseDateString(mfgDate)!) : null,
                    storageLocation: loc || '', storageDetails: details || '',
                    status: (status || 'operacional').toLowerCase().includes('descart') ? 'descartado' : (status || 'operacional').toLowerCase().includes('manut') ? 'em manutencao' : 'operacional',
                    lastInspectionDate: parseDateString(lastInsp) ? Timestamp.fromDate(parseDateString(lastInsp)!) : null,
                    nextInspectionDate: parseDateString(nextInsp) ? Timestamp.fromDate(parseDateString(nextInsp)!) : null,
                  };
                }
              } else if (type === 'occurrences') {
                // Segue rigorosamente a ordem do formulário Registrar:
                // Data, Local, Tipo, Faixa Etária, Descrição, Nome, Nasc, CPF, Cidade, Estado, Fone, Análise
                const cols = row.map(c => c?.toString().trim() || '');
                if (cols.length < 4) return;

                const validDate = parseDateString(cols[0]);
                if (!validDate || cols[0].toLowerCase().includes('dat')) return;
                if (cols[1]?.toLowerCase().includes('loc')) return;

                let loc = cols[1];
                let occType = cols[2];
                let age = cols[3];
                let description = "";
                let name = "", bDate = "", cpf = "", city = "", state = "", phone = "", anal = "";

                // Reconstrução em caso de separadores extras (shift)
                if (cols.length > 12) {
                  const extra = cols.length - 12;
                  description = cols.slice(4, 5 + extra).join('; ');
                  [name, bDate, cpf, city, state, phone, anal] = cols.slice(5 + extra);
                } else {
                  description = cols[4] || '';
                  [name, bDate, cpf, city, state, phone, anal] = cols.slice(5);
                }

                importData = {
                    userId: user.uid, 
                    createdAt: serverTimestamp(),
                    occurrenceDate: Timestamp.fromDate(validDate),
                    occurrenceLocation: loc, 
                    occurrenceType: occType || '', 
                    ageGroup: age || '',
                    description: description, 
                    involvedPersonName: name || '', 
                    birthDate: bDate || '',
                    cpf: cpf || '', city: city || '', state: state || '', phone: phone || '', 
                    analysis: (anal || 'baixa').toLowerCase()
                };
              } else if (type === 'treatments') {
                // ORDEM RIGOROSA: Data, Local, Tipo, Descrição, Prob(1-5), Cons(1-5), Trat.Prop, Ação, Situação, Prazo
                const cols = row.map(c => c?.toString()?.trim() || ''); // Ensure all cells are trimmed
                
                const validDate = parseDateString(cols[0]);
                if (!validDate || cols[0].toLowerCase().includes('dat')) return; // Skip header or invalid date
                // Skip if location is header or empty
                if (cols[1]?.toLowerCase().includes('loc') || !cols[1]) return; 

                const MIN_EXPECTED_COLS = 11; // Data, Local, Tipo, Descrição, Prob, Cons, Tratamento, Ação, Situação, Prazo, Análise
                if (cols.length < MIN_EXPECTED_COLS) {
                  console.warn(`Pulando linha devido a colunas insuficientes para tratamentos (esperado ${MIN_EXPECTED_COLS}, encontrado ${cols.length}): ${row.join(',')}`);
                  return;
                }

                let treatmentLocation = cols[1];
                let treatmentType = cols[2]; // Tipo is at cols[2]
                let description = ""; // Inicializa descrição
                let prob = "", cons = "", proposed = "", action = "", situation = "", cDateStr = "", anal = "";
                
                const DESCRIPTION_INDEX = 3; // Descrição is at cols[3]
                const PROB_INDEX = 4; // Prob is at cols[4]

                // Reconstrução em caso de separadores extras (shift)
                if (cols.length > MIN_EXPECTED_COLS) {
                  const extraColsInDescription = cols.length - MIN_EXPECTED_COLS;
                  description = cols.slice(DESCRIPTION_INDEX, DESCRIPTION_INDEX + 1 + extraColsInDescription).join('; ');
                  // Atribui os campos restantes a partir da posição deslocada
                  const shiftedProbIndex = PROB_INDEX + extraColsInDescription;
                  prob = cols[shiftedProbIndex] || '';
                  cons = cols[shiftedProbIndex + 1] || '';
                  proposed = cols[shiftedProbIndex + 2] || '';
                  action = cols[shiftedProbIndex + 3] || '';
                  situation = cols[shiftedProbIndex + 4] || '';
                  cDateStr = cols[shiftedProbIndex + 5] || '';
                  anal = cols[shiftedProbIndex + 6] || '';
                } else {
                  description = cols[DESCRIPTION_INDEX] || '';
                  cons = cols[5] || '';
                  proposed = cols[6] || '';
                  action = cols[7] || '';
                  situation = cols[8] || '';
                  cDateStr = cols[9] || '';
                  anal = cols[10] || ''; // Captura a coluna Análise
                }

                // Garante que Probabilidade e Consequência sejam números de 1 a 5
                const probVal = Math.min(5, Math.max(1, parseInt(prob?.replace(/\D/g, '') || '1') || 1));
                const consVal = Math.min(5, Math.max(1, parseInt(cons?.replace(/\D/g, '') || '1') || 1));

                importData = { // Ensure analysis is also saved
                  userId: user.uid, createdAt: serverTimestamp(), treatmentDate: Timestamp.fromDate(validDate),
                  treatmentLocation: treatmentLocation || 'Não informado', treatmentType: treatmentType || 'Outros',
                  description: description, probability: String(probVal), consequence: String(consVal),
                  riskLevel: Math.min(25, Math.max(1, probVal * consVal)), proposedTreatment: proposed || '',
                  actionTaken: action || '', situation: (situation || 'pendente').toLowerCase().includes('finaliz') ? 'finalizado' : 'pendente',
                  completionDate: parseDateString(cDateStr) ? Timestamp.fromDate(parseDateString(cDateStr)!) : null,
                  analysis: anal || '' // Ensure analysis is also saved
                };
              } else if (type === 'faunaFloraGeo') {
                const cols = row.map(c => c?.toString().trim() || '');
                const [date, loc, specType, desc, anal] = cols;
                const validDate = parseDateString(date);
                if (!validDate || !loc || date?.toLowerCase().includes('dat')) return;

                if (loc && specType && validDate) {
                  importData = {
                    userId: user.uid, createdAt: serverTimestamp(),
                    date: Timestamp.fromDate(validDate),
                    location: loc, speciesType: specType, description: desc || '', analysis: anal || 'baixa'
                  };
                }
              }

              if (importData) {
                const newDocRef = doc(collectionRef);
                batch.set(newDocRef, importData);
                totalImportedCount++;
              }
            });

            await batch.commit();
          }

          toast({ title: 'Importação Concluída!', description: `${totalImportedCount} registros foram processados e salvos com sucesso.` });
          setLastImported({ type, count: totalImportedCount });
        } catch (error) {
          toast({ variant: 'destructive', title: 'Erro na Importação', description: 'Erro ao salvar dados no banco.' });
        } finally {
          setIsImporting(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      },
      error: () => {
        toast({ variant: 'destructive', title: 'Erro de Leitura', description: 'Não foi possível ler o arquivo CSV.' });
        setIsImporting(null);
      }
    });
  };

  const triggerFileInput = (type: ImportType) => {
    setCurrentImportType(type);
    fileInputRef.current?.click();
  };

  const renderImportSection = (type: ImportType, title: string, columns: string) => (
    <div className="space-y-4 p-4 border rounded-lg bg-card shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">Ordem das colunas: <code className="text-xs bg-muted p-1 rounded">{columns}</code></p>
          {lastImported?.type === type && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 animate-in fade-in slide-in-from-left-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Sucesso! {lastImported.count} registros adicionados.
            </div>
          )}
          {isImporting === type && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary animate-pulse">
              <Clock className="h-3.5 w-3.5" />
              Aguarde, processando banco de dados...
            </div>
          )}
        </div>
        <Button 
          onClick={() => triggerFileInput(type)} 
          disabled={!!isImporting}
          variant={lastImported?.type === type ? "secondary" : "outline"}
          className="shrink-0"
        >
          {isImporting === type ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
           lastImported?.type === type ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
          {isImporting === type ? 'Importando...' : lastImported?.type === type ? 'Concluído' : 'Importar CSV'}
        </Button>
      </div>
    </div>
  );

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <h2 className="text-xl font-bold">Acesso Restrito</h2>
            <p className="text-muted-foreground">Apenas administradores podem gerenciar importações de dados.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Importações</CardTitle>
          <CardDescription>
            Central de processamento de dados em lote para todos os módulos do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
            <p className="text-sm font-medium">Instruções Gerais:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground mt-2 space-y-1">
              <li>Arquivos devem estar no formato CSV (separador ponto e vírgula <code className="bg-background px-1">;</code> ou vírgula).</li>
              <li>O sistema agora tenta corrigir automaticamente textos que contêm pontos e vírgulas.</li>
              <li><strong>Atenção:</strong> Evite "Enters" dentro das células do Excel, pois eles quebram o arquivo.</li>
              <li>Não inclua linha de cabeçalho.</li>
              <li>Datas: <code className="bg-background px-1">DD/MM/AAAA</code> ou <code className="bg-background px-1">AAAA-MM-DD</code>.</li>
              <li>Codificação recomendada: <code className="bg-background px-1">ISO-8859-1</code> (Excel) ou <code className="bg-background px-1">UTF-8</code>.</li>
            </ul>
          </div>

          <div className="grid gap-6">
            {renderImportSection(
              'equipments', 
              'Equipamentos', 
              'tipo, marca, modelo, lote/ca, data_fab, local, detalhes, status, ultima_vist, proxima_vist'
            )}
            
            {renderImportSection(
              'occurrences', 
              'Ocorrências (Acidentes/Incidentes)', 
              'Data, Local, Tipo, Faixa Etária, Descrição, Nome, Nasc, CPF, Cidade, Estado, Fone, Análise'
            )}

            {renderImportSection(
              'treatments', 
              'Tratamentos de Risco', 
              'Data, Local, Tipo, Descrição, Probabilidade (1-5), Consequência (1-5), Tratamento Proposto, Ação, Situação, Prazo, Análise'
            )}

            {renderImportSection(
              'faunaFloraGeo', 
              'Fauna, Flora e Geo', 
              'data, local, especie_tipo, descricao, analise'
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => currentImportType && handleFileImport(e, currentImportType)}
            accept=".csv"
          />
        </CardContent>
        <CardFooter className="flex justify-between bg-muted/20 border-t py-4">
          <p className="text-xs text-muted-foreground italic">
            *Nota: A importação de grandes volumes de dados pode levar alguns segundos para sincronizar em todos os dispositivos.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}