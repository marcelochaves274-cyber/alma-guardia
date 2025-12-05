'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, Send, User } from 'lucide-react';
import { handleChat } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

type Message = {
  role: 'user' | 'model';
  parts: string[];
};

export function Chat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      parts: [
        'Olá! Sou o SGS Genius. Vamos construir seu aplicativo SGS juntos. Comece me dizendo o que você tem em mente.',
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const sendMessage = async () => {
    if (!input.trim()) return;
    const currentInput = input;

    const userMessage: Message = { role: 'user', parts: [currentInput] };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = messages.map((msg) => ({
        role: msg.role,
        parts: msg.parts.map((p) => p),
      }));

      const res = await handleChat({ message: currentInput, history: chatHistory });
      const modelMessage: Message = { role: 'model', parts: [res.response] };
      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error('Error calling AI:', error);
      toast({
        variant: "destructive",
        title: "Erro de comunicação",
        description: "Não foi possível conectar com a IA. Por favor, tente novamente.",
      });
      // Rollback user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <Card className="flex h-full w-full flex-col shadow-lg">
      <CardHeader>
        <CardTitle>Chat SGS com IA</CardTitle>
        <CardDescription>Converse com a IA para definir os requisitos do seu aplicativo.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="pr-4">
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-start gap-4 ${
                  message.role === 'user' ? 'justify-end' : ''
                }`}
              >
                {message.role === 'model' && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="bg-transparent">
                      <Bot className="h-5 w-5 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-xl rounded-lg px-4 py-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.parts[0]}</p>
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="bg-background">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-4">
                <Avatar className="h-8 w-8 border">
                   <AvatarFallback className="bg-transparent">
                      <Bot className="h-5 w-5 text-primary" />
                    </AvatarFallback>
                </Avatar>
                <div className="max-w-md rounded-lg p-3 shadow-sm bg-card">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-foreground [animation-delay:-0.3s]"></div>
                    <div className="h-2 w-2 animate-pulse rounded-full bg-foreground [animation-delay:-0.15s]"></div>
                    <div className="h-2 w-2 animate-pulse rounded-full bg-foreground"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <form
          onSubmit={handleFormSubmit}
          className="flex w-full items-start gap-4"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Explique o que você precisa no seu app..."
            className="flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={isLoading}
            rows={1}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
            aria-label="Enviar mensagem"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
