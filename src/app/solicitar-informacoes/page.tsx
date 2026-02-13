'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { SgsAppLogo } from '@/components/icons';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

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
        style={{ backgroundImage: `url('https://i.ibb.co/Q3WmHzF/Design-sem-nome-1.png')` }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full">
        <Card className="mx-auto w-full max-w-lg border-none bg-card/90 shadow-2xl backdrop-blur-sm">
          <CardHeader className="text-center">
            <Link href="/" className="absolute left-4 top-4 text-muted-foreground hover:text-foreground transition-colors" aria-label="Voltar para a página inicial">
              <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="mb-4 flex justify-center pt-8 md:pt-0">
              <SgsAppLogo className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Solicitar Informações</CardTitle>
            <CardDescription>
              Preencha o formulário e nossa equipe entrará em contato.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
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
    </div>
  );
}
