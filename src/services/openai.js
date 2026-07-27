/**
 * OpenAIService - Handles text improvement and translation via OpenAI API
 * Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3
 */

import { IMPROVE_PROMPT, TRANSLATE_PROMPT, stripModelWrapping, wrapInput } from './prompts.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-3.5-turbo';

let currentModel = DEFAULT_MODEL;

let apiKey = null;

/**
 * Set the OpenAI API key
 * @param {string} key - The OpenAI API key
 */
export function setApiKey(key) {
  apiKey = key;
}

/**
 * Set the model to use for API requests
 * @param {string} model - The model name (e.g., 'gpt-3.5-turbo' or 'gpt-4o-mini')
 */
export function setModel(model) {
  currentModel = model;
}

/**
 * Get the current model
 * @returns {string} The current model name
 */
export function getModel() {
  return currentModel;
}

/**
 * Check if API key is configured
 * @returns {boolean} True if API key is set
 */
export function hasApiKey() {
  return apiKey !== null && apiKey.length > 0;
}

/**
 * Make a request to OpenAI Chat Completions API
 * @param {string} systemPrompt - The system prompt
 * @param {string} userContent - The user content to process
 * @returns {Promise<string>} The API response content
 * @throws {Error} If the request fails
 */
async function makeOpenAIRequest(systemPrompt, userContent) {
  if (!hasApiKey()) {
    throw new Error('API key not configured');
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: currentModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `API request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid API response format');
  }

  return stripModelWrapping(data.choices[0].message.content);
}

/**
 * Improve text readability and structure using OpenAI
 * Requirements: 3.1, 3.2, 3.4, 3.5, 3.6
 * @param {string} text - The text to improve
 * @returns {Promise<string>} The improved text
 * @throws {Error} If the request fails
 */
export async function improveText(text) {
  return makeOpenAIRequest(IMPROVE_PROMPT, wrapInput(text));
}

/**
 * Translate text to English using OpenAI
 * Requirements: 4.1, 4.2, 4.3
 * @param {string} text - The text to translate
 * @returns {Promise<string>} The translated text
 * @throws {Error} If the request fails
 */
export async function translateToEnglish(text) {
  return makeOpenAIRequest(TRANSLATE_PROMPT, wrapInput(text));
}
