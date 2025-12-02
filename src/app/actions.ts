'use server';

import {
  chatWithGeminiSGS,
  type ChatWithGeminiSGSInput,
  type ChatWithGeminiSGSOutput,
} from '@/ai/flows/chat-with-gemini-sgs';
import {
  suggestSgsCapabilities,
  type SuggestSgsCapabilitiesInput,
  type SuggestSgsCapabilitiesOutput,
} from '@/ai/flows/suggest-sgs-capabilities';

export async function handleChat(
  input: ChatWithGeminiSGSInput
): Promise<ChatWithGeminiSGSOutput> {
  return await chatWithGeminiSGS(input);
}

export async function handleSuggestCapabilities(
  input: SuggestSgsCapabilitiesInput
): Promise<SuggestSgsCapabilitiesOutput> {
  return await suggestSgsCapabilities(input);
}
