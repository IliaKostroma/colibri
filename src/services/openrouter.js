/**
 * OpenRouter Service - Handles text improvement and translation via OpenRouter API
 * Uses preset models for better text and translation
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// OpenRouter preset models
const PRESET_IMPROVE = '@preset/bettertext';
const PRESET_TRANSLATE = '@preset/tran-sto-eng';

let apiKey = '';

/**
 * Set the OpenRouter API key
 * @param {string} key - The API key
 */
export function setApiKey(key) {
  apiKey = key;
}

/**
 * Check if API key is configured
 * @returns {boolean}
 */
export function hasApiKey() {
  return apiKey && apiKey.length > 0;
}

/**
 * Make a request to OpenRouter API
 * @param {string} model - The model/preset to use
 * @param {string} userMessage - The user message content
 * @returns {Promise<string>} The response text
 */
async function makeRequest(model, userMessage) {
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Voice Transcriber'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Improve text using OpenRouter preset
 * @param {string} text - Text to improve
 * @returns {Promise<string>} Improved text
 */
export async function improveText(text) {
  if (!text || !text.trim()) {
    throw new Error('Text is required');
  }

  return makeRequest(PRESET_IMPROVE, text);
}

/**
 * Translate text to English using OpenRouter preset
 * @param {string} text - Text to translate
 * @returns {Promise<string>} Translated text
 */
export async function translateToEnglish(text) {
  if (!text || !text.trim()) {
    throw new Error('Text is required');
  }

  return makeRequest(PRESET_TRANSLATE, text);
}
