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
const { stripModelWrapping } = await import('./prompts.js');

const DEFAULT_MODEL = 'openai/gpt-oss-20b:free';

function mockFetch(response) {
  const fn = vi.fn(async () => response);
  vi.stubGlobal('fetch', fn);
  return fn;
}

function okResponse(content = 'готово') {
  const body = { choices: [{ message: { content } }] };
  const res = { ok: true, json: async () => body };
  res.clone = () => ({ json: async () => body });
  return res;
}

function errorResponse(status, message) {
  const body = { error: { message } };
  const res = { ok: false, status, json: async () => body };
  res.clone = () => ({ json: async () => body });
  return res;
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
    expect(body.messages[1].content).toContain('текст с повторами повторами');
    // текст обёрнут в разделители, чтобы модель не приняла его за обращение к себе
    expect(body.messages[1].content).toContain('<<<TEXT');
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

  it('режим рассуждений выключен и длина ответа ограничена', async () => {
    const fetchMock = mockFetch(okResponse());

    await openrouter.translateToEnglish('привет');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.reasoning).toEqual({ enabled: false });
    expect(body.max_tokens).toBe(2000);
  });

  it('промт перевода запрещает варианты и пояснения', async () => {
    const fetchMock = mockFetch(okResponse());

    await openrouter.translateToEnglish('ну что давай смотреть что там кого');

    const systemPrompt = JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].content;
    expect(systemPrompt).toContain('только перевод');
    expect(systemPrompt).toContain('НЕ предлагай варианты');
    expect(systemPrompt).toContain('НЕ объясняй');
  });

  it('кавычки и вводная строка от модели срезаются', async () => {
    mockFetch(okResponse('"Alright, let\'s dive in and see what we\'ve got!"'));

    const result = await openrouter.translateToEnglish('ну что давай смотреть');

    expect(result).toBe("Alright, let's dive in and see what we've got!");
  });

  it('запрос требует строгую схему ответа — болтать негде', async () => {
    const fetchMock = mockFetch(okResponse('{"text":"Hi there!"}'));

    await openrouter.translateToEnglish('Привет!');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema.required).toEqual(['text']);
  });

  it('ответ по схеме разворачивается в чистый текст', async () => {
    mockFetch(okResponse('{"text":"Hi there!"}'));

    const result = await openrouter.translateToEnglish('Привет!');

    expect(result).toBe('Hi there!');
  });

  it('модель без схемы: повтор запроса без неё, результат всё равно чистый', async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce(errorResponse(400, 'Provider does not support response_format json_schema'))
      .mockResolvedValueOnce(okResponse('Hi there!'));
    vi.stubGlobal('fetch', fn);

    const result = await openrouter.translateToEnglish('Привет!');

    expect(result).toBe('Hi there!');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fn.mock.calls[0][1].body).response_format).toBeDefined();
    expect(JSON.parse(fn.mock.calls[1][1].body).response_format).toBeUndefined();
  });

  it('ошибка не про схему повтор не запускает', async () => {
    const fn = vi.fn().mockResolvedValue(errorResponse(429, 'Rate limit exceeded'));
    vi.stubGlobal('fetch', fn);

    await expect(openrouter.improveText('текст')).rejects.toThrow('Rate limit exceeded');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('Очистка ответа модели', () => {
  it('вводная строка перед пустой строкой убирается', () => {
    expect(stripModelWrapping('Вот перевод:\n\nLet us take a look.')).toBe('Let us take a look.');
  });

  it('кавычки вокруг всего ответа убираются', () => {
    expect(stripModelWrapping('«Let us take a look.»')).toBe('Let us take a look.');
  });

  it('кавычки внутри текста не трогаются', () => {
    const text = 'Он сказал "привет" и ушёл';
    expect(stripModelWrapping(text)).toBe(text);
  });

  it('многострочный текст с двоеточием в первой строке не калечится', () => {
    const text = 'Задача: купить молоко\nи хлеб';
    expect(stripModelWrapping(text)).toBe(text);
  });

  it('пустой ответ не роняет обработку', () => {
    expect(stripModelWrapping('')).toBe('');
    expect(stripModelWrapping(null)).toBe('');
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
