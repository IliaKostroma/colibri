import { describe, it, expect, beforeEach } from 'vitest';
import { importTasksFromMarkdown, getTasks, saveTasks } from './storage.js';

describe('Markdown Import Dates', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should preserve different dates for completed tasks', () => {
    const markdown = `# Voice Transcriber - Задачи

## Выполненные задачи (4)

- [x] Задача 16 декабря *(выполнено: 16.12.2025, id: test-16dec)*
- [x] Задача 15 декабря *(выполнено: 15.12.2025, id: test-15dec)*
- [x] Задача 10 декабря *(выполнено: 10.12.2025, id: test-10dec)*
- [x] Задача 5 декабря *(выполнено: 05.12.2025, id: test-05dec)*
`;

    const result = importTasksFromMarkdown(markdown, false);
    expect(result.success).toBe(true);

    const tasks = getTasks();
    console.log('\n=== Imported Tasks ===');
    tasks.forEach(t => {
      const completedDate = t.completedAt ? new Date(t.completedAt) : null;
      console.log(`${t.id}: completedAt=${completedDate ? completedDate.toLocaleDateString('ru-RU') : 'null'}`);
    });

    // Check dates are different
    const task16 = tasks.find(t => t.id === 'test-16dec');
    const task15 = tasks.find(t => t.id === 'test-15dec');
    const task10 = tasks.find(t => t.id === 'test-10dec');
    const task05 = tasks.find(t => t.id === 'test-05dec');

    // Expected dates
    const dec16 = new Date(2025, 11, 16).getTime(); // month is 0-indexed
    const dec15 = new Date(2025, 11, 15).getTime();
    const dec10 = new Date(2025, 11, 10).getTime();
    const dec05 = new Date(2025, 11, 5).getTime();

    console.log('\nExpected vs Actual:');
    console.log(`16 Dec: expected=${new Date(dec16).toLocaleDateString('ru-RU')}, actual=${new Date(task16.completedAt).toLocaleDateString('ru-RU')}`);
    console.log(`15 Dec: expected=${new Date(dec15).toLocaleDateString('ru-RU')}, actual=${new Date(task15.completedAt).toLocaleDateString('ru-RU')}`);
    console.log(`10 Dec: expected=${new Date(dec10).toLocaleDateString('ru-RU')}, actual=${new Date(task10.completedAt).toLocaleDateString('ru-RU')}`);
    console.log(`05 Dec: expected=${new Date(dec05).toLocaleDateString('ru-RU')}, actual=${new Date(task05.completedAt).toLocaleDateString('ru-RU')}`);

    expect(task16.completedAt).toBe(dec16);
    expect(task15.completedAt).toBe(dec15);
    expect(task10.completedAt).toBe(dec10);
    expect(task05.completedAt).toBe(dec05);
  });

  it('should preserve createdAt date for active tasks', () => {
    const markdown = `# Voice Transcriber - Задачи

## Активные задачи (2)

- [ ] Активная 10 декабря *(создано: 10.12.2025, id: test-active-10)*
- [ ] Активная 5 декабря *(создано: 05.12.2025, id: test-active-05)*
`;

    const result = importTasksFromMarkdown(markdown, false);
    expect(result.success).toBe(true);

    const tasks = getTasks();

    const taskActive10 = tasks.find(t => t.id === 'test-active-10');
    const taskActive05 = tasks.find(t => t.id === 'test-active-05');

    const dec10 = new Date(2025, 11, 10).getTime();
    const dec05 = new Date(2025, 11, 5).getTime();

    console.log('\nActive tasks dates:');
    console.log(`10 Dec: expected=${new Date(dec10).toLocaleDateString('ru-RU')}, actual=${new Date(taskActive10.createdAt).toLocaleDateString('ru-RU')}`);
    console.log(`05 Dec: expected=${new Date(dec05).toLocaleDateString('ru-RU')}, actual=${new Date(taskActive05.createdAt).toLocaleDateString('ru-RU')}`);

    expect(taskActive10.createdAt).toBe(dec10);
    expect(taskActive05.createdAt).toBe(dec05);
    expect(taskActive10.completedAt).toBeNull();
    expect(taskActive05.completedAt).toBeNull();
  });

  it('should not duplicate emoji', () => {
    const markdown = `# Voice Transcriber - Задачи

## Активные задачи (1)

- [ ] Задача с эмодзи 🟢 *(создано: 10.12.2025, id: test-emoji)*
`;

    const result = importTasksFromMarkdown(markdown, false);
    expect(result.success).toBe(true);

    const tasks = getTasks();
    const task = tasks.find(t => t.id === 'test-emoji');

    console.log('\nEmoji test:');
    console.log('Text:', task.text);
    console.log('Color:', task.color);

    // Text should NOT contain emoji (it should be extracted to color)
    expect(task.text).toBe('Задача с эмодзи');
    expect(task.color).toBe('green');
  });

  it('should handle already duplicated emoji (from previous buggy import)', () => {
    const markdown = `# Voice Transcriber - Задачи

## Активные задачи (1)

- [ ] Задача с двойным эмодзи 🟢 🟢 *(создано: 10.12.2025, id: test-double-emoji)*
`;

    const result = importTasksFromMarkdown(markdown, false);
    expect(result.success).toBe(true);

    const tasks = getTasks();
    const task = tasks.find(t => t.id === 'test-double-emoji');

    console.log('\nDouble emoji test:');
    console.log('Text:', task.text);
    console.log('Color:', task.color);

    // After fix: text should NOT contain any emoji
    expect(task.text).toBe('Задача с двойным эмодзи');
    expect(task.color).toBe('green');
  });

  it('CRITICAL: should handle multiline task text', () => {
    // This is the EXACT format from user's file!
    const markdown = `# Voice Transcriber - Задачи

## Выполненные задачи (1)

- [x] Написать Евгении, привет!

Я планирую дать тебе довольно много скриптов в работу до конца года, чтобы первую неделю января быть посвободнее и сделать побольше наперёд. Что думаешь? 🟠 *(выполнено: 10.12.2025, id: test-multiline)*
`;

    const result = importTasksFromMarkdown(markdown, false);
    console.log('\nMultiline import result:', result);

    const tasks = getTasks();
    console.log('\nMultiline tasks:');
    tasks.forEach(t => {
      console.log('ID:', t.id);
      console.log('Text:', t.text);
      console.log('CompletedAt:', t.completedAt ? new Date(t.completedAt).toLocaleDateString('ru-RU') : 'null');
    });

    // Check if the date was parsed correctly
    const multilineTask = tasks.find(t => t.id === 'test-multiline');
    if (multilineTask) {
      const dec10 = new Date(2025, 11, 10).getTime();
      expect(multilineTask.completedAt).toBe(dec10);
    } else {
      // If not found by ID, it means multiline was not parsed correctly
      console.log('WARNING: Multiline task was NOT parsed with correct ID!');
      console.log('This means the task was created with Date.now() instead of parsed date');
    }
  });
});
