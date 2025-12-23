/**
 * StorageService - Handles tasks and settings persistence with Supabase
 */

import { supabase } from './supabase.js';
import { getCurrentUser, getUserSettings, saveUserSettings } from './auth.js';

// ============================================================================
// User Settings (from Supabase)
// ============================================================================

/**
 * Get API key for the current provider
 * @returns {Promise<string | null>}
 */
export async function getApiKey() {
  const settings = await getUserSettings();
  return settings?.openai_api_key || null;
}

/**
 * Save API key
 * @param {string} key
 */
export async function saveApiKey(key) {
  await saveUserSettings({ openai_api_key: key });
}

/**
 * Get OpenRouter API key
 * @returns {Promise<string | null>}
 */
export async function getOpenRouterApiKey() {
  const settings = await getUserSettings();
  return settings?.openrouter_api_key || null;
}

/**
 * Save OpenRouter API key
 * @param {string} key
 */
export async function saveOpenRouterApiKey(key) {
  await saveUserSettings({ openrouter_api_key: key });
}

/**
 * Get AI provider
 * @returns {Promise<string>}
 */
export async function getProvider() {
  const settings = await getUserSettings();
  return settings?.ai_provider || 'openai';
}

/**
 * Save AI provider
 * @param {string} provider
 */
export async function saveProvider(provider) {
  await saveUserSettings({ ai_provider: provider });
}

/**
 * Get AI model
 * @returns {Promise<string | null>}
 */
export async function getModel() {
  const settings = await getUserSettings();
  return settings?.ai_model || null;
}

/**
 * Save AI model
 * @param {string} model
 */
export async function saveModel(model) {
  await saveUserSettings({ ai_model: model });
}

// ============================================================================
// Tasks Storage (Supabase)
// ============================================================================

/**
 * @typedef {'none' | 'green' | 'orange' | 'purple'} TaskColor
 */

/**
 * @typedef {Object} Task
 * @property {string} id - Unique task ID (UUID)
 * @property {string} text - Task text content
 * @property {boolean} completed - Whether task is completed
 * @property {string} created_at - ISO timestamp when task was created
 * @property {string | null} completed_at - ISO timestamp when task was completed
 * @property {TaskColor} color - Task color marker
 */

/**
 * Get all tasks from Supabase
 * @returns {Promise<Task[]>} Array of tasks
 */
export async function getTasks() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  // Convert to legacy format for compatibility
  return data.map(task => ({
    id: task.id,
    text: task.text,
    completed: task.completed,
    createdAt: new Date(task.created_at).getTime(),
    completedAt: task.completed_at ? new Date(task.completed_at).getTime() : null,
    color: task.color || 'none'
  }));
}

/**
 * Check if string is valid UUID
 * @param {string} str
 * @returns {boolean}
 */
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Save tasks to Supabase (bulk replace)
 * @param {Task[]} tasks - Array of tasks to save
 */
export async function saveTasks(tasks) {
  const user = await getCurrentUser();
  if (!user) return;

  // Delete all existing tasks
  await supabase.from('tasks').delete().eq('user_id', user.id);

  // Insert new tasks
  if (tasks.length > 0) {
    const tasksToInsert = tasks.map(task => ({
      // Generate new UUID if old id is not valid UUID (e.g., timestamp-based ids from localStorage)
      id: isValidUUID(task.id) ? task.id : crypto.randomUUID(),
      user_id: user.id,
      text: task.text,
      completed: task.completed,
      color: task.color || 'none',
      created_at: new Date(task.createdAt).toISOString(),
      completed_at: task.completedAt ? new Date(task.completedAt).toISOString() : null
    }));

    const { error } = await supabase.from('tasks').insert(tasksToInsert);
    if (error) {
      console.error('Error saving tasks:', error);
    }
  }
}

/**
 * Add a new task
 * @param {string} text - Task text
 * @returns {Promise<Task | null>} The created task
 */
export async function addTask(text) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      text: text.trim(),
      completed: false,
      color: 'none'
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding task:', error);
    return null;
  }

  return {
    id: data.id,
    text: data.text,
    completed: data.completed,
    createdAt: new Date(data.created_at).getTime(),
    completedAt: null,
    color: data.color
  };
}

/**
 * Update a task
 * @param {string} id - Task ID
 * @param {Partial<Task>} updates - Properties to update
 * @returns {Promise<Task | null>} Updated task or null if not found
 */
export async function updateTask(id, updates) {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabaseUpdates = {};

  if (updates.text !== undefined) supabaseUpdates.text = updates.text;
  if (updates.completed !== undefined) {
    supabaseUpdates.completed = updates.completed;
    if (updates.completed) {
      supabaseUpdates.completed_at = new Date().toISOString();
    } else {
      supabaseUpdates.completed_at = null;
    }
  }
  if (updates.color !== undefined) supabaseUpdates.color = updates.color;

  const { data, error } = await supabase
    .from('tasks')
    .update(supabaseUpdates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    return null;
  }

  return {
    id: data.id,
    text: data.text,
    completed: data.completed,
    createdAt: new Date(data.created_at).getTime(),
    completedAt: data.completed_at ? new Date(data.completed_at).getTime() : null,
    color: data.color
  };
}

/**
 * Delete a task
 * @param {string} id - Task ID
 * @returns {Promise<boolean>} True if deleted
 */
export async function deleteTask(id) {
  const user = await getCurrentUser();
  if (!user) return false;

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }

  return true;
}

/**
 * Get tasks sorted: incomplete first (newest first), then completed (newest first)
 * @returns {Promise<Task[]>} Sorted tasks
 */
export async function getTasksSorted() {
  const tasks = await getTasks();
  const incomplete = tasks.filter(t => !t.completed).sort((a, b) => b.createdAt - a.createdAt);
  const completed = tasks.filter(t => t.completed).sort((a, b) => (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt));
  return [...incomplete, ...completed];
}

/**
 * Migrate existing tasks - no-op for Supabase (migrations handled by SQL)
 */
export function migrateTasks() {
  // No migration needed - handled by database schema
}

// ============================================================================
// Export/Import Functions
// ============================================================================

/**
 * Format timestamp to DD.MM.YYYY format
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted date string
 */
function formatDateDDMMYYYY(timestamp) {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Export tasks to JSON string
 * @returns {Promise<string>} JSON string of all tasks
 */
export async function exportTasks() {
  const tasks = await getTasks();
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks: tasks
  }, null, 2);
}

/**
 * Import tasks from JSON string
 * @param {string} jsonString - JSON string with tasks
 * @param {boolean} merge - If true, merge with existing tasks. If false, replace all tasks.
 * @returns {Promise<{success: boolean, count: number, error?: string}>} Import result
 */
export async function importTasks(jsonString, merge = false) {
  try {
    const data = JSON.parse(jsonString);

    if (!data.tasks || !Array.isArray(data.tasks)) {
      return { success: false, count: 0, error: 'Неверный формат данных' };
    }

    let tasksToSave = data.tasks;

    if (merge) {
      const existingTasks = await getTasks();
      const existingIds = new Set(existingTasks.map(t => t.id));
      const newTasks = tasksToSave.filter(t => !existingIds.has(t.id));
      tasksToSave = [...existingTasks, ...newTasks];
    }

    await saveTasks(tasksToSave);
    return { success: true, count: tasksToSave.length };
  } catch (error) {
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Export tasks to Markdown format
 * @returns {Promise<string>} Markdown formatted tasks
 */
export async function exportTasksToMarkdown() {
  const tasks = await getTasksSorted();
  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let markdown = `# 📋 COLIBRI - Задачи\n\n`;
  markdown += `**Экспортировано:** ${dateStr}\n`;
  markdown += `**Всего задач:** ${tasks.length}\n\n`;

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  if (activeTasks.length > 0) {
    markdown += `## ⏳ Активные задачи (${activeTasks.length})\n\n`;
    activeTasks.forEach(task => {
      const date = formatDateDDMMYYYY(task.createdAt);
      const colorEmoji = {
        'none': '',
        'green': '🟢',
        'orange': '🟠',
        'purple': '🟣'
      }[task.color] || '';

      const singleLineText = task.text.replace(/[\r\n]+/g, ' ').trim();
      markdown += `- [ ] ${singleLineText}`;
      if (colorEmoji) markdown += ` ${colorEmoji}`;
      markdown += ` *(создано: ${date}, id: ${task.id})*\n`;
    });
    markdown += `\n`;
  }

  if (completedTasks.length > 0) {
    markdown += `## ✅ Выполненные задачи (${completedTasks.length})\n\n`;
    completedTasks.forEach(task => {
      const date = formatDateDDMMYYYY(task.completedAt || task.createdAt);
      const colorEmoji = {
        'none': '',
        'green': '🟢',
        'orange': '🟠',
        'purple': '🟣'
      }[task.color] || '';

      const singleLineText = task.text.replace(/[\r\n]+/g, ' ').trim();
      markdown += `- [x] ${singleLineText}`;
      if (colorEmoji) markdown += ` ${colorEmoji}`;
      markdown += ` *(выполнено: ${date}, id: ${task.id})*\n`;
    });
  }

  markdown += `\n---\n*Создано с помощью COLIBRI*\n`;

  return markdown;
}

/**
 * Import tasks from Markdown format
 * @param {string} markdown - Markdown text with tasks
 * @param {boolean} merge - If true, merge with existing tasks. If false, replace all tasks.
 * @returns {Promise<{success: boolean, count: number, error?: string}>} Import result
 */
export async function importTasksFromMarkdown(markdown, merge = false) {
  try {
    const lines = markdown.split('\n');
    const tasks = [];

    for (const line of lines) {
      const trimmed = line.trim();

      const match = trimmed.match(/^-\s*\[([ xX])\]\s+(.+)$/);
      if (!match) continue;

      const [, checkmark, rest] = match;
      const completed = checkmark.toLowerCase() === 'x';

      let text = rest;
      let id = null;
      let createdAt = Date.now();
      let completedAt = completed ? Date.now() : null;
      let color = 'none';

      const metaRegex = /\s*\*\((создано|выполнено):\s*(\d{1,2}\.\d{1,2}\.\d{4}),\s*id:\s*([^\)]+)\)\*\s*$/;
      const metaMatch = rest.match(metaRegex);

      if (metaMatch) {
        const withoutMeta = rest.replace(metaRegex, '').trim();
        const dateStr = metaMatch[2].trim();
        id = metaMatch[3].trim();

        if (withoutMeta.includes('🟢')) color = 'green';
        else if (withoutMeta.includes('🟠')) color = 'orange';
        else if (withoutMeta.includes('🟣')) color = 'purple';

        if (color !== 'none') {
          text = withoutMeta.replace(/\s*(🟢|🟠|🟣)+/g, '').trim();
        } else {
          text = withoutMeta;
        }

        const dateParts = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (dateParts) {
          const day = parseInt(dateParts[1], 10);
          const month = parseInt(dateParts[2], 10) - 1;
          const year = parseInt(dateParts[3], 10);
          const parsedDate = new Date(year, month, day).getTime();

          if (completed) {
            completedAt = parsedDate;
            createdAt = parsedDate;
          } else {
            createdAt = parsedDate;
          }
        }
      } else {
        if (rest.includes('🟢')) color = 'green';
        else if (rest.includes('🟠')) color = 'orange';
        else if (rest.includes('🟣')) color = 'purple';

        if (color !== 'none') {
          text = rest.replace(/\s*(🟢|🟠|🟣)+/g, '').trim();
        } else {
          text = rest.trim();
        }
      }

      tasks.push({
        id: id || crypto.randomUUID(),
        text: text,
        completed: completed,
        createdAt: createdAt,
        completedAt: completedAt,
        color: color
      });
    }

    if (tasks.length === 0) {
      return { success: false, count: 0, error: 'Задачи не найдены в Markdown' };
    }

    let tasksToSave = tasks;

    if (merge) {
      const existingTasks = await getTasks();
      const existingIds = new Set(existingTasks.map(t => t.id));
      const newTasks = tasksToSave.filter(t => !existingIds.has(t.id));
      tasksToSave = [...existingTasks, ...newTasks];
    }

    await saveTasks(tasksToSave);
    return { success: true, count: tasksToSave.length };

  } catch (error) {
    return { success: false, count: 0, error: error.message };
  }
}
