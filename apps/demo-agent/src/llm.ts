/**
 * LLM Integration via OpenRouter
 * 
 * Uses OpenRouter to access Llama 3.1 70B Instruct
 */

import axios from 'axios';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.LLM_MODEL || 'meta-llama/llama-3.1-70b-instruct';
const MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS || '1000', 10);
const TEMPERATURE = parseFloat(process.env.LLM_TEMPERATURE || '0.7');

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callLLM(messages: Message[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  try {
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: MODEL,
        messages,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://cogumi-ai-protect.app',
          'X-Title': 'COGUMI AI Protect Demo Agent',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    const content = response.data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from LLM');
    }

    return content;
  } catch (error: any) {
    if (error.response) {
      console.error('OpenRouter API error:', error.response.data);
      throw new Error(`LLM API error: ${error.response.data.error?.message || 'Unknown error'}`);
    } else if (error.request) {
      throw new Error('LLM request timeout or network error');
    } else {
      throw new Error(`LLM error: ${error.message}`);
    }
  }
}
