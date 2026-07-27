/**
 * OpenRouter Service - Handles text improvement and translation via OpenRouter API
 * Supports any model available on OpenRouter
 */

import { IMPROVE_PROMPT, TRANSLATE_PROMPT, stripModelWrapping } from './prompts.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Бесплатная модель по умолчанию. Проверено по каталогу OpenRouter 27.07.2026:
// google/gemma-4-26b-a4b-it:free — MoE, 3.8B активных параметров (быстрая),
// контекст 256K, сильная в русском. Список бесплатных моделей меняется —
// если эта перестанет быть бесплатной, модель можно сменить в настройках,
// свежий список: https://openrouter.ai/models?q=free
const DEFAULT_MODEL = 'google/gemma-4-26b-a4b-it:free';

let apiKey = '';
let currentModel = DEFAULT_MODEL;

/**
 * Set the OpenRouter API key
 * @param {string} key - The API key
 */
export function setApiKey(key) {
  apiKey = key;
}

/**
 * Set the model to use
 * @param {string} model - The model ID (e.g., 'google/gemini-2.0-flash-001')
 */
export function setModel(model) {
  currentModel = model || DEFAULT_MODEL;
}

/**
 * Get the current model
 * @returns {string}
 */
export function getModel() {
  return currentModel;
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
 * @param {string} systemPrompt - The system prompt
 * @param {string} userMessage - The user message content
 * @returns {Promise<string>} The response text
 */
async function makeRequest(systemPrompt, userMessage) {
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Colibri'
    },
    body: JSON.stringify({
      model: currentModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      // Многие бесплатные модели по умолчанию «думают» перед ответом: это
      // добавляет десятки секунд там, где нужна правка пары предложений.
      // OpenRouter игнорирует параметр для моделей без режима рассуждений.
      reasoning: { enabled: false },
      // Ответ всегда сопоставим по длине с исходным текстом. Потолок нужен,
      // чтобы болтливая модель не молотила минуту, расписывая варианты.
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const apiMessage = errorData.error?.message || `OpenRouter API error: ${response.status}`;

    // Самый частый сбой: модель перестала быть бесплатной или её убрали.
    // Голый ответ API («The free … period has ended») не подсказывает, что делать.
    const modelGone = response.status === 404 ||
      /free .*(period|tier).*(ended|over)|no longer|not found|migrate to the paid/i.test(apiMessage);

    if (modelGone) {
      throw new Error(
        `Модель «${currentModel}» больше не доступна бесплатно. ` +
        `Выберите другую в настройках — список бесплатных: openrouter.ai/models?q=free. ` +
        `(ответ OpenRouter: ${apiMessage})`
      );
    }

    throw new Error(apiMessage);
  }

  const data = await response.json();
  return stripModelWrapping(data.choices[0]?.message?.content || '');
}

/**
 * Improve text using OpenRouter
 * @param {string} text - Text to improve
 * @returns {Promise<string>} Improved text
 */
export async function improveText(text) {
  if (!text || !text.trim()) {
    throw new Error('Text is required');
  }

  return makeRequest(IMPROVE_PROMPT, text);
}

/**
 * Translate text to English using OpenRouter
 * @param {string} text - Text to translate
 * @returns {Promise<string>} Translated text
 */
export async function translateToEnglish(text) {
  if (!text || !text.trim()) {
    throw new Error('Text is required');
  }

  return makeRequest(TRANSLATE_PROMPT, text);
}
