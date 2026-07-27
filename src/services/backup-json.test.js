/**
 * JSON-бэкап: круг «экспорт → импорт» должен возвращать задачи без потерь.
 *
 * Стаб matchMedia стоит здесь, а не в test-setup.js, намеренно: supabase.js
 * дёргает его на уровне модуля, и без стаба файл падает на импорте. Общий стаб
 * в test-setup.js разбудит два устаревших сьюта (см. T1 в PROJECT_STATE.json) —
 * это отдельная задача, не хочется мешать её с этой.
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

// Без авторизации saveTasks() выходит рано и в сеть не ходит — этого достаточно:
// нас интересует сериализация и локальный кэш, а не запись в Supabase.
vi.mock('./auth.js', () => ({
  getCurrentUser: async () => null,
  getUserSettings: async () => null,
  saveUserSettings: async () => ({ success: true, error: null })
}));

const {
  exportTasks,
  importTasks,
  getTasks,
  clearTasksCache,
  exportTasksToMarkdown,
  importTasksFromMarkdown
} = await import('./storage.js');

const SAMPLE = [
  {
    id: '3f0b8d1e-1c2a-4f5b-9d7e-0a1b2c3d4e5f',
    text: 'Задача с переносом\nи второй строкой',
    completed: false,
    createdAt: 1758000000000,
    completedAt: null,
    color: 'purple'
  },
  {
    id: 'b7c6d5e4-3f2a-4b1c-8d9e-0f1a2b3c4d5e',
    text: 'Выполненная задача',
    completed: true,
    createdAt: 1757000000000,
    completedAt: 1757900000000,
    color: 'green'
  }
];

function seedCache(tasks) {
  localStorage.setItem('colibri_tasks_cache', JSON.stringify({ tasks, timestamp: Date.now() }));
}

describe('JSON-бэкап задач', () => {
  beforeEach(() => {
    clearTasksCache();
    localStorage.clear();
  });

  it('экспорт отдаёт валидный JSON с версией и задачами', () => {
    seedCache(SAMPLE);

    const data = JSON.parse(exportTasks());

    expect(data.version).toBe(1);
    expect(data.exportedAt).toBeTruthy();
    expect(data.tasks).toHaveLength(2);
  });

  it('круг экспорт → импорт возвращает задачи без потерь', async () => {
    seedCache(SAMPLE);

    const json = exportTasks();
    clearTasksCache();
    localStorage.clear();

    const result = await importTasks(json, false);

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(getTasks()).toEqual(SAMPLE);
  });

  it('переносы строк, время суток и дата создания у выполненных задач переживают круг', async () => {
    seedCache(SAMPLE);

    const json = exportTasks();
    await importTasks(json, false);

    const [active, done] = getTasks();

    // Ровно то, что теряет markdown-экспорт
    expect(active.text).toContain('\n');
    expect(done.createdAt).toBe(1757000000000);
    expect(done.completedAt).toBe(1757900000000);
    expect(done.createdAt).not.toBe(done.completedAt);
  });

  it('импорт обновляет локальный кэш сразу, не дожидаясь синка', async () => {
    seedCache([{ id: 'old', text: 'Старая', completed: false, createdAt: 1, completedAt: null, color: 'none' }]);

    await importTasks(JSON.stringify({ version: 1, tasks: SAMPLE }), false);

    expect(getTasks()).toHaveLength(2);
    expect(getTasks()[0].text).toContain('Задача с переносом');
  });

  it('режим merge не теряет существующие задачи и не плодит дубли по id', async () => {
    seedCache([SAMPLE[0]]);

    const result = await importTasks(JSON.stringify({ version: 1, tasks: SAMPLE }), true);

    expect(result.success).toBe(true);
    expect(getTasks()).toHaveLength(2);
  });

  it('мусор вместо JSON не роняет импорт и не трогает задачи', async () => {
    seedCache(SAMPLE);

    const result = await importTasks('не json вовсе', false);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(getTasks()).toHaveLength(2);
  });
});

/**
 * Тот же фикс кэша поехал и в markdown-ветку, а её собственный сьют
 * (import-dates.test.js) сейчас не собирается — см. T1. Поэтому минимальное
 * покрытие держим здесь: что кэш обновляется и какие именно потери считаются
 * ожидаемыми, чтобы markdown не начали принимать за бэкап.
 */
describe('Markdown-слепок (для чтения, не для бэкапа)', () => {
  beforeEach(() => {
    clearTasksCache();
    localStorage.clear();
  });

  it('импорт обновляет локальный кэш сразу, не дожидаясь синка', async () => {
    seedCache(SAMPLE);
    const markdown = exportTasksToMarkdown();

    clearTasksCache();
    localStorage.clear();
    seedCache([{ id: 'old', text: 'Старая', completed: false, createdAt: 1, completedAt: null, color: 'none' }]);
    clearTasksCache(); // сбрасываем модульный кэш, чтобы прочиталось из localStorage

    const result = await importTasksFromMarkdown(markdown, false);

    expect(result.success).toBe(true);
    expect(getTasks()).toHaveLength(2);
    expect(getTasks().some(t => t.text === 'Старая')).toBe(false);
  });

  it('круг через markdown теряет ровно то, о чём предупреждает интерфейс', async () => {
    seedCache(SAMPLE);

    const markdown = exportTasksToMarkdown();
    clearTasksCache();
    localStorage.clear();

    const result = await importTasksFromMarkdown(markdown, false);
    expect(result.success).toBe(true);

    const restored = getTasks();
    expect(restored).toHaveLength(2);

    const active = restored.find(t => !t.completed);
    const done = restored.find(t => t.completed);

    // id, текст, статус и цвет переживают круг
    expect(active.id).toBe(SAMPLE[0].id);
    expect(done.id).toBe(SAMPLE[1].id);
    expect(active.color).toBe('purple');
    expect(done.color).toBe('green');

    // а это — заявленные потери
    expect(active.text).not.toContain('\n');                  // переносы схлопнуты
    expect(active.createdAt).not.toBe(SAMPLE[0].createdAt);   // время суток обнулено
    expect(done.createdAt).toBe(done.completedAt);            // дата создания затёрта датой выполнения
  });
});
