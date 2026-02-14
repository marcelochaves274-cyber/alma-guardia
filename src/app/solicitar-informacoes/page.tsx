'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function SolicitarInformacoesPage() {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !companyName || !email || !phone) {
        toast({
            variant: "destructive",
            title: "Campos obrigatórios",
            description: "Por favor, preencha todos os campos.",
        });
        return;
    }
    setIsSubmitting(true);

    const message = `Olá, gostaria de solicitar mais informações sobre o SGS APP.\n\n*Nome:* ${name}\n*Empresa:* ${companyName}\n*Email:* ${email}\n*Telefone:* ${phone}`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/5542998345594?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');

    toast({
      title: 'Quase lá!',
      description: 'Sua mensagem está pronta para ser enviada no WhatsApp.',
    });
    
    setName('');
    setCompanyName('');
    setEmail('');
    setPhone('');
    setIsSubmitting(false);
  };

  return (
    <div 
        className="flex min-h-screen w-full flex-col items-center justify-center bg-cover bg-center p-4"
        style={{ backgroundImage: `url('https://i.ibb.co/TxQh0pBC/Fundo-Rel-Informa-es.png')` }}
    >
      
        <Card className="relative mx-auto w-full max-w-lg border-none bg-card/10 shadow-2xl backdrop-blur-sm">
          <CardHeader className="text-center">
            <Link href="/" className="absolute left-4 top-4 text-muted-foreground hover:text-foreground transition-colors" aria-label="Voltar para a página inicial">
              <Button variant="ghost">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Voltar
              </Button>
            </Link>
            
            <div className="flex justify-center items-center gap-3 pt-8 md:pt-0">
                <Image
                    src="https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/Logo%20da%20SGS%20APP%20Arenito.jpg?alt=media&token=56ad9d35-b9ec-42cd-bc0f-d9ade32406db"
                    alt="SGS APP Logo"
                    width={40}
                    height={40}
                    className="object-contain rounded-md"
                />
                <span className="text-2xl font-bold text-primary">SGS APP</span>
            </div>
            
            <div className="pt-6">
                <CardTitle className="text-3xl font-bold">Solicitar Informações</CardTitle>
                <CardDescription className="pt-2 text-base text-foreground/90">
                    Preencha o formulário e nossa equipe entrará em contato.
                </CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nome da sua empresa"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enviar para WhatsApp
              </Button>
            </CardFooter>
          </form>
        </Card>
        
    </div>
  );
}
