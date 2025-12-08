
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';

export function ManageProfile() {
  const { toast } = useToast();
  const [adminPass, setAdminPass] = useState('');
  const [observerPass, setObserverPass] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [showObserverPass, setShowObserverPass] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handlePassChange = (value: string, setter: (val: string) => void) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length <= 6) {
      setter(numericValue);
    }
  };

  const handleSave = () => {
    // Logic to save the passcodes will go here
    setIsSaving(true);
    console.log('Admin Pass:', adminPass);
    console.log('Observer Pass:', observerPass);
    
    // Simulate saving
    setTimeout(() => {
        toast({
            title: 'Em breve!',
            description: 'A funcionalidade de salvar os passes será implementada em breve.',
        });
        setIsSaving(false);
    }, 1000);
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Perfis</CardTitle>
        <CardDescription>
          Defina os passes de 6 dígitos para os perfis de Administrador e Observador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
            <h3 className="font-semibold text-lg">Perfil Administrador</h3>
            <div className="space-y-2">
              <Label htmlFor="admin-pass">Passe</Label>
               <div className="relative">
                <Input
                  id="admin-pass"
                  type={showAdminPass ? 'text' : 'password'}
                  value={adminPass}
                  onChange={(e) => handlePassChange(e.target.value, setAdminPass)}
                  maxLength={6}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                  onClick={() => setShowAdminPass((prev) => !prev)}
                >
                  {showAdminPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>
        </div>

        <Separator />

         <div className="space-y-4">
            <h3 className="font-semibold text-lg">Perfil Observador</h3>
            <div className="space-y-2">
              <Label htmlFor="observer-pass">Passe</Label>
              <div className="relative">
                <Input
                  id="observer-pass"
                  type={showObserverPass ? 'text' : 'password'}
                  value={observerPass}
                  onChange={(e) => handlePassChange(e.target.value, setObserverPass)}
                  maxLength={6}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                  onClick={() => setShowObserverPass((prev) => !prev)}
                >
                  {showObserverPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>
        </div>
      </CardContent>
      <CardFooter className='flex justify-end'>
        <Button onClick={handleSave} disabled={isSaving || adminPass.length !== 6 || observerPass.length !== 6}>
           {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
           Salvar Passes
        </Button>
      </CardFooter>
    </Card>
  );
}
