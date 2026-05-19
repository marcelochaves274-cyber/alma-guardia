'use server';

/**
 * @fileOverview Implements a Genkit flow for chatting with Gemini to define the requirements of an SGS application.
 *
 * - chatWithGeminiSGS - A function that handles the chat with Gemini to define SGS application requirements.
 * - ChatWithGeminiSGSInput - The input type for the chatWithGeminiSGS function.
 * - ChatWithGeminiSGSOutput - The return type for the chatWithGeminiSGS function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatWithGeminiSGSInputSchema = z.object({
  message: z.string().describe('The message from the user to the Gemini AI model.'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.array(z.string())
  })).optional().describe('The chat history between the user and the Gemini AI model.')
});
export type ChatWithGeminiSGSInput = z.infer<typeof ChatWithGeminiSGSInputSchema>;

const ChatWithGeminiSGSOutputSchema = z.object({
  response: z.string().describe('The response from the Gemini AI model.'),
});
export type ChatWithGeminiSGSOutput = z.infer<typeof ChatWithGeminiSGSOutputSchema>;

export async function chatWithGeminiSGS(input: ChatWithGeminiSGSInput): Promise<ChatWithGeminiSGSOutput> {
  return chatWithGeminiSGSFlow(input);
}

const chatWithGeminiSGSPrompt = ai.definePrompt({
  name: 'chatWithGeminiSGSPrompt',
  input: {schema: ChatWithGeminiSGSInputSchema},
  output: {schema: ChatWithGeminiSGSOutputSchema},
  prompt: `You are the specialized AI assistant for ALMA Guardia, a comprehensive Safety Management System (SGS) compliant with NBR ISO 21101.
  Your goal is to iteratively gather information about the desired SGS application and provide helpful suggestions and clarifications.
  Consider the existing chat history when responding.

  {{#if history}}
  Chat History:
  {{#each history}}
  {{#if (eq this.role \"user\")}}
  User: {{this.parts.0}}
  {{else}}
  Assistant: {{this.parts.0}}
  {{/if}}
  {{/each}}
  {{/if}}

  User Message: {{{message}}}`,
});

const chatWithGeminiSGSFlow = ai.defineFlow(
  {
    name: 'chatWithGeminiSGSFlow',
    inputSchema: ChatWithGeminiSGSInputSchema,
    outputSchema: ChatWithGeminiSGSOutputSchema,
  },
  async input => {
    const {
      output
    } = await chatWithGeminiSGSPrompt(input);
    
    if (!output?.response) {
      throw new Error('No response from Gemini flow');
    }
    
    return {
      response: output.response
    };
  }
);
