/**
 * Выбор модели OpenRouter: дефолт, хранение и понятная ошибка,
 * когда модель перестала быть бесплатной.
 *
 * Стаб matchMedia — здесь же, а не в test-setup.js: storage.js тянет
 * supabase.js, который дёргает matchMedia на уровне модуля (см. T1).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; }
  });
}

vi.mock('./auth.js', () => ({
  getCurrentUser: async () => null,
  getUserSettings: async () => null,
  saveUserSettings: async () => ({ success: true, error: null })
}));

const openrouter = await import('./openrouter.js');
const storage = await import('./storage.js');

const DEFAULT_MODEL = 'google/gemma-4-26b-a4b-it:free';

function mockFetch(response) {
  const fn = vi.fn(async () => response);
  vi.stubGlobal('fetch', fn);
  return fn;
}

function okResponse(content = 'готово') {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] })
  };
}

function errorResponse(status, message) {
  return {
    ok: false,
    status,
    json: async () => ({ error: { message } })
  };
}

describe('Модель OpenRouter', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    openrouter.setApiKey('sk-or-test');
    openrouter.setModel('');
  });

  it('по умолчанию используется бесплатная модель', () => {
    expect(openrouter.getModel()).toBe(DEFAULT_MODEL);
  });

  it('пустое значение возвращает дефолт, а не пустую строку', () => {
    openrouter.setModel('mistralai/devstral-2512');
    expect(openrouter.getModel()).toBe('mistralai/devstral-2512');

    openrouter.setModel('');
    expect(openrouter.getModel()).toBe(DEFAULT_MODEL);
  });

  it('выбранная модель реально уходит в запрос', async () => {
    const fetchMock = mockFetch(okResponse('улучшено'));
    openrouter.setModel('google/gemma-4-31b-it:free');

    const result = await openrouter.improveText('текст с повторами повторами');

    expect(result).toBe('улучшено');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe('google/gemma-4-31b-it:free');
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].content).toBe('текст с повторами повторами');
  });

  it('без ключа запрос не уходит вообще', async () => {
    const fetchMock = mockFetch(okResponse());
    openrouter.setApiKey('');

    await expect(openrouter.improveText('текст')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('«бесплатный период закончился» превращается в понятную подсказку', async () => {
    mockFetch(errorResponse(400,
      'The free Devstral 2 2512 period has ended. To continue using this model, please migrate to the paid slug: mistralai/devstral-2512'));
    openrouter.setModel('mistralai/devstral-2512:free');

    await expect(openrouter.translateToEnglish('привет')).rejects.toThrow(
      /больше не доступна бесплатно/
    );
  });

  it('исчезнувшая модель (404) тоже объясняется по-человечески', async () => {
    mockFetch(errorResponse(404, 'No endpoints found for some/removed-model'));

    await expect(openrouter.improveText('текст')).rejects.toThrow(/Выберите другую в настройках/);
  });

  it('обычная ошибка API передаётся как есть, без выдумок', async () => {
    mockFetch(errorResponse(429, 'Rate limit exceeded'));

    await expect(openrouter.improveText('текст')).rejects.toThrow('Rate limit exceeded');
  });
});

describe('Выбор модели хранится локально', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('сохранение и чтение переживают перезагрузку', async () => {
    await storage.saveOpenRouterModel('google/gemma-4-31b-it:free');
    expect(await storage.getOpenRouterModel()).toBe('google/gemma-4-31b-it:free');
  });

  it('пустое значение стирает выбор, а не пишет пустую строку', async () => {
    await storage.saveOpenRouterModel('google/gemma-4-31b-it:free');
    await storage.saveOpenRouterModel('');

    expect(await storage.getOpenRouterModel()).toBeNull();
  });

  it('если ничего не выбрано — null, дальше подхватится дефолт сервиса', async () => {
    expect(await storage.getOpenRouterModel()).toBeNull();
  });
});
