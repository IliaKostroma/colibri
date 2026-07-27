/**
 * OpenRouter Service - Handles text improvement and translation via OpenRouter API
 * Supports any model available on OpenRouter
 */

import { IMPROVE_PROMPT, TRANSLATE_PROMPT, stripModelWrapping, wrapInput } from './prompts.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Бесплатная модель по умолчанию (каталог OpenRouter на 27.07.2026).
// Сначала стояла google/gemma-4-26b-a4b-it:free — на живой проверке она
// игнорировала инструкции: вместо перевода выдавала разбор с вариантами
// и просьбу прислать текст подлиннее. Заменена на gpt-oss-20b:free —
// 3.6B активных параметров, заметно послушнее к формату ответа.
// Если и она перестанет быть бесплатной, модель меняется в настройках,
// свежий список: https://openrouter.ai/models?q=free
const DEFAULT_MODEL = 'openai/gpt-oss-20b:free';

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
 * Схема ответа. Инструкции в промте модель может проигнорировать —
 * Илья получал вместо перевода разбор с вариантами и вопросом «а дайте
 * текст подлиннее». Строгая схема убирает саму возможность болтать:
 * ответ обязан быть объектом с единственным полем.
 */
const RESULT_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'result',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Готовый текст целиком, без пояснений и вариантов'
        }
      },
      required: ['text'],
      additionalProperties: false
    }
  }
};

/**
 * Отправить запрос в OpenRouter
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {boolean} withSchema - требовать строгую схему ответа
 * @returns {Promise<Response>}
 */
function postCompletion(systemPrompt, userMessage, withSchema) {
  const body = {
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
  };

  if (withSchema) {
    body.response_format = RESULT_SCHEMA;
  }

  return fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Colibri'
    },
    body: JSON.stringify(body)
  });
}

/**
 * Отказ вызван именно строгой схемой, а не чем-то ещё?
 * @param {Response} response
 * @returns {Promise<boolean>}
 */
async function isSchemaRejection(response) {
  const data = await response.clone().json().catch(() => ({}));
  const message = data.error?.message || '';
  return /response_format|json_schema|structured output|schema/i.test(message);
}

/**
 * Достать текст из ответа: сначала пробуем поле схемы, иначе берём как есть
 * @param {string} content
 * @returns {string}
 */
function extractText(content) {
  const raw = (content || '').trim();
  if (!raw) return '';

  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.text === 'string') {
        return stripModelWrapping(parsed.text);
      }
    } catch (e) {
      // неJSON — работаем с сырым текстом ниже
    }
  }

  return stripModelWrapping(raw);
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

  let response = await postCompletion(systemPrompt, userMessage, true);

  // Не все модели умеют строгую схему ответа. Если провайдер отказал именно
  // из-за неё — повторяем без схемы, тогда работает промт + очистка ответа.
  if (!response.ok && await isSchemaRejection(response)) {
    response = await postCompletion(systemPrompt, userMessage, false);
  }

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
  return extractText(data.choices[0]?.message?.content);
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

  return makeRequest(IMPROVE_PROMPT, wrapInput(text));
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

  return makeRequest(TRANSLATE_PROMPT, wrapInput(text));
}
