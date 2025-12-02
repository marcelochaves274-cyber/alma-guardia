'use server';
/**
 * @fileOverview An AI agent that suggests capabilities for an SGS application.
 *
 * - suggestSgsCapabilities - A function that suggests capabilities for an SGS application.
 * - SuggestSgsCapabilitiesInput - The input type for the suggestSgsCapabilities function.
 * - SuggestSgsCapabilitiesOutput - The return type for the suggestSgsCapabilities function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestSgsCapabilitiesInputSchema = z.object({
  currentSgsDescription: z
    .string()
    .describe('The current description of the SGS application.'),
  userEvolvingUnderstanding: z
    .string()
    .describe('The user evolving understanding of the SGS needs.'),
});
export type SuggestSgsCapabilitiesInput = z.infer<typeof SuggestSgsCapabilitiesInputSchema>;

const SuggestSgsCapabilitiesOutputSchema = z.object({
  suggestedCapabilities: z
    .string()
    .describe('The suggested capabilities or features to add to the SGS application.'),
});
export type SuggestSgsCapabilitiesOutput = z.infer<typeof SuggestSgsCapabilitiesOutputSchema>;

export async function suggestSgsCapabilities(
  input: SuggestSgsCapabilitiesInput
): Promise<SuggestSgsCapabilitiesOutput> {
  return suggestSgsCapabilitiesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestSgsCapabilitiesPrompt',
  input: {schema: SuggestSgsCapabilitiesInputSchema},
  output: {schema: SuggestSgsCapabilitiesOutputSchema},
  prompt: `You are an AI assistant helping users to define the capabilities of their SGS application.

  Based on the current description of the SGS application and the user's evolving understanding of their needs, suggest specific capabilities or features that could be added to the application.

  Current SGS Application Description: {{{currentSgsDescription}}}

  User's Evolving Understanding: {{{userEvolvingUnderstanding}}}

  Suggested Capabilities:`,
});

const suggestSgsCapabilitiesFlow = ai.defineFlow(
  {
    name: 'suggestSgsCapabilitiesFlow',
    inputSchema: SuggestSgsCapabilitiesInputSchema,
    outputSchema: SuggestSgsCapabilitiesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
