/**
 * COLIBRI - Main Application Entry Point
 *
 * Task management app with voice transcription and AI-powered text processing.
 */

import * as storage from './services/storage.js';
import * as openai from './services/openai.js';
import * as openrouter from './services/openrouter.js';
import * as speechRecognition from './services/speechRecognition.js';
import { signIn, signUp, signOut, getCurrentUser, onAuthStateChange } from './services/auth.js';

// ============================================================================
// App State
// ============================================================================

/** @type {Object} */
const state = {
  text: '',
  isRecording: false,
  isProcessing: false,
  processingType: null,
  hasApiKey: false,
  provider: 'openai',
  error: null,
  notification: null,
  originalText: null,
  isAuthenticated: false,
  user: null
};

// ============================================================================
// DOM Elements
// ============================================================================

const elements = {
  textArea: null,
  recordBtn: null,
  copyBtn: null,
  improveBtn: null,
  translateBtn: null,
  undoBtn: null,
  createTaskBtn: null,
  settingsBtn: null,
  settingsModal: null,
  modalBackdrop: null,
  modalCloseBtn: null,
  providerSelect: null,
  apiKeyInput: null,
  openrouterApiKeyInput: null,
  modelSelect: null,
  openaiSettings: null,
  openrouterSettings: null,
  saveApiKeyBtn: null,
  exportMarkdownBtn: null,
  importMarkdownBtn: null,
  markdownFileInput: null,
  notification: null,
  tasksSection: null,
  tasksList: null,
  tasksCount: null,
  // Auth elements
  authModal: null,
  authForm: null,
  authEmail: null,
  authPassword: null,
  authLoginBtn: null,
  authSignupBtn: null,
  authError: null,
  userEmail: null,
  logoutBtn: null,
  mainContent: null,
  header: null,
  loadingScreen: null
};

// ============================================================================
// Auth State Caching (for instant UI on page load)
// ============================================================================

const AUTH_CACHE_KEY = 'colibri_auth_cache';

function getCachedAuthState() {
  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // Ignore errors (PWA, private browsing, etc.)
  }
  return null;
}

function setCachedAuthState(isAuthenticated, userEmail) {
  try {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
      isAuthenticated,
      userEmail,
      timestamp: Date.now()
    }));
  } catch (e) {
    // Ignore errors
  }
}

function clearCachedAuthState() {
  try {
    localStorage.removeItem(AUTH_CACHE_KEY);
  } catch (e) {
    // Ignore errors
  }
}

// ============================================================================
// State Management
// ============================================================================

export function updateState(updates) {
  Object.assign(state, updates);
  updateUI();
}

export function getState() {
  return { ...state };
}

// ============================================================================
// UI Update Functions
// ============================================================================

function updateUI() {
  updateButtonStates();
  updateRecordingIndicator();
  updateProcessingIndicator();
  updateAuthUI();
}

function hideLoadingScreen() {
  if (elements.loadingScreen) {
    elements.loadingScreen.hidden = true;
  }
}

function updateAuthUI() {
  if (!elements.authModal || !elements.mainContent) return;

  if (state.isAuthenticated) {
    elements.authModal.hidden = true;
    elements.mainContent.hidden = false;
    if (elements.header) {
      elements.header.hidden = false;
    }
    if (elements.userEmail) {
      elements.userEmail.textContent = state.user?.email || '';
      elements.userEmail.hidden = false;
    }
    if (elements.logoutBtn) {
      elements.logoutBtn.hidden = false;
    }
    // Cache auth state for next page load
    setCachedAuthState(true, state.user?.email);
  } else {
    elements.authModal.hidden = false;
    elements.mainContent.hidden = true;
    if (elements.header) {
      elements.header.hidden = true;
    }
    if (elements.userEmail) {
      elements.userEmail.hidden = true;
    }
    if (elements.logoutBtn) {
      elements.logoutBtn.hidden = true;
    }
  }

  // Always hide loading screen after auth UI update
  hideLoadingScreen();
}

function updateButtonStates() {
  if (!elements.copyBtn || !elements.improveBtn || !elements.translateBtn || !elements.recordBtn) {
    return;
  }

  const hasText = state.text.trim().length > 0;
  const canProcess = hasText && state.hasApiKey && !state.isProcessing && !state.isRecording;

  elements.copyBtn.disabled = !hasText || state.isProcessing;
  elements.improveBtn.disabled = !canProcess;
  elements.translateBtn.disabled = !canProcess;
  elements.recordBtn.disabled = state.isProcessing;

  if (elements.undoBtn) {
    elements.undoBtn.disabled = !state.originalText || state.isProcessing;
    elements.undoBtn.hidden = !state.originalText;
  }

  if (elements.createTaskBtn) {
    elements.createTaskBtn.disabled = !hasText || state.isProcessing || state.isRecording;
  }
}

function updateRecordingIndicator() {
  if (!elements.recordBtn) return;

  if (state.isRecording) {
    elements.recordBtn.classList.add('recording');
    elements.recordBtn.setAttribute('aria-label', 'Остановить запись');
    elements.recordBtn.setAttribute('title', 'Остановить запись');
    const btnText = elements.recordBtn.querySelector('.btn-text');
    if (btnText) btnText.textContent = 'Стоп';
  } else {
    elements.recordBtn.classList.remove('recording');
    elements.recordBtn.setAttribute('aria-label', 'Начать запись');
    elements.recordBtn.setAttribute('title', 'Начать запись');
    const btnText = elements.recordBtn.querySelector('.btn-text');
    if (btnText) btnText.textContent = 'Запись';
  }
}

function updateProcessingIndicator() {
  if (!elements.improveBtn || !elements.translateBtn) return;

  if (state.isProcessing && state.processingType === 'improve') {
    elements.improveBtn.classList.add('loading');
  } else {
    elements.improveBtn.classList.remove('loading');
  }

  if (state.isProcessing && state.processingType === 'translate') {
    elements.translateBtn.classList.add('loading');
  } else {
    elements.translateBtn.classList.remove('loading');
  }
}

// ============================================================================
// Authentication
// ============================================================================

async function handleLogin(e) {
  e.preventDefault();

  const email = elements.authEmail?.value.trim();
  const password = elements.authPassword?.value;

  if (!email || !password) {
    showAuthError('Введите email и пароль');
    return;
  }

  setAuthLoading(true);
  hideAuthError();

  const { user, error } = await signIn(email, password);

  setAuthLoading(false);

  if (error) {
    showAuthError(translateAuthError(error));
    return;
  }

  if (user) {
    updateState({ isAuthenticated: true, user });
    await loadUserData();
  }
}

async function handleSignup(e) {
  e.preventDefault();

  const email = elements.authEmail?.value.trim();
  const password = elements.authPassword?.value;

  if (!email || !password) {
    showAuthError('Введите email и пароль');
    return;
  }

  if (password.length < 6) {
    showAuthError('Пароль должен быть минимум 6 символов');
    return;
  }

  setAuthLoading(true, 'signup');
  hideAuthError();

  const { user, error } = await signUp(email, password);

  setAuthLoading(false);

  if (error) {
    showAuthError(translateAuthError(error));
    return;
  }

  if (user) {
    showNotification('Аккаунт создан! Проверьте email для подтверждения.', 'success', 5000);
  }
}

async function handleLogout() {
  // Stop background sync
  storage.stopAutoSync();

  await signOut();
  clearCachedAuthState();
  storage.clearTasksCache();
  updateState({ isAuthenticated: false, user: null, hasApiKey: false });
  // Clear tasks list
  if (elements.tasksList) {
    elements.tasksList.innerHTML = '';
  }
}

function translateAuthError(error) {
  const errorMap = {
    'Invalid login credentials': 'Неверный email или пароль',
    'Email not confirmed': 'Email не подтверждён. Проверьте почту.',
    'User already registered': 'Пользователь уже зарегистрирован',
    'Password should be at least 6 characters': 'Пароль должен быть минимум 6 символов',
    'Unable to validate email address: invalid format': 'Неверный формат email'
  };
  return errorMap[error] || error;
}

function showAuthError(message) {
  if (elements.authError) {
    elements.authError.textContent = message;
    elements.authError.hidden = false;
  }
}

function hideAuthError() {
  if (elements.authError) {
    elements.authError.hidden = true;
  }
}

function setAuthLoading(loading, type = 'login') {
  if (elements.authLoginBtn) {
    elements.authLoginBtn.classList.toggle('loading', loading && type === 'login');
    elements.authLoginBtn.disabled = loading;
  }
  if (elements.authSignupBtn) {
    elements.authSignupBtn.classList.toggle('loading', loading && type === 'signup');
    elements.authSignupBtn.disabled = loading;
  }
}

// ============================================================================
// Notification System
// ============================================================================

let notificationTimeout = null;

export function showNotification(message, type = 'info', duration = 3000) {
  if (!elements.notification) return;

  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
    notificationTimeout = null;
  }

  elements.notification.textContent = message;
  elements.notification.className = `notification notification--${type}`;
  elements.notification.hidden = false;

  updateState({ notification: message });

  if (duration > 0) {
    notificationTimeout = setTimeout(() => {
      hideNotification();
    }, duration);
  }
}

export function hideNotification() {
  if (!elements.notification) return;

  elements.notification.hidden = true;
  elements.notification.textContent = '';
  updateState({ notification: null });
}

export function showError(message) {
  showNotification(message, 'error', 5000);
  updateState({ error: message });
}

export function clearError() {
  updateState({ error: null });
}

// ============================================================================
// Settings Modal
// ============================================================================

function updateProviderSettingsVisibility() {
  const provider = elements.providerSelect?.value || 'openai';

  if (elements.openaiSettings) {
    elements.openaiSettings.style.display = provider === 'openai' ? 'block' : 'none';
  }
  if (elements.openrouterSettings) {
    elements.openrouterSettings.style.display = provider === 'openrouter' ? 'block' : 'none';
  }
}

export async function openSettingsModal() {
  if (!elements.settingsModal) return;

  // Load current provider
  if (elements.providerSelect) {
    const currentProvider = await storage.getProvider();
    elements.providerSelect.value = currentProvider;
  }

  // Load current OpenAI API key
  if (elements.apiKeyInput) {
    const currentKey = await storage.getApiKey();
    elements.apiKeyInput.value = currentKey || '';
  }

  // Load current OpenRouter API key
  if (elements.openrouterApiKeyInput) {
    const currentKey = await storage.getOpenRouterApiKey();
    elements.openrouterApiKeyInput.value = currentKey || '';
  }

  // Load current model selection
  if (elements.modelSelect) {
    const currentModel = await storage.getModel() || 'gpt-3.5-turbo';
    elements.modelSelect.value = currentModel;
  }

  updateProviderSettingsVisibility();
  elements.settingsModal.hidden = false;
}

export function closeSettingsModal() {
  if (!elements.settingsModal) return;
  elements.settingsModal.hidden = true;
}

export async function saveSettings() {
  // Save provider selection
  const provider = elements.providerSelect?.value || 'openai';
  await storage.saveProvider(provider);
  updateState({ provider });

  // Save OpenAI settings
  if (elements.apiKeyInput) {
    const key = elements.apiKeyInput.value.trim();
    if (key) {
      await storage.saveApiKey(key);
      openai.setApiKey(key);
    }
  }

  // Save OpenRouter settings
  if (elements.openrouterApiKeyInput) {
    const key = elements.openrouterApiKeyInput.value.trim();
    if (key) {
      await storage.saveOpenRouterApiKey(key);
      openrouter.setApiKey(key);
    }
  }

  // Save model selection (for OpenAI)
  if (elements.modelSelect) {
    const model = elements.modelSelect.value;
    await storage.saveModel(model);
    openai.setModel(model);
  }

  // Update hasApiKey based on current provider
  const hasKey = provider === 'openrouter'
    ? !!(await storage.getOpenRouterApiKey())
    : !!(await storage.getApiKey());
  updateState({ hasApiKey: hasKey });

  showNotification('Настройки сохранены', 'success');
  closeSettingsModal();
}

export function exportMarkdownFile() {
  const tasks = storage.getTasks();

  if (tasks.length === 0) {
    showNotification('Нет задач для экспорта', 'error');
    return;
  }

  try {
    const markdown = storage.exportTasksToMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    a.download = `colibri-snapshot-${timestamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification(`Слепок сохранен: ${tasks.length} задач`, 'success');
  } catch (error) {
    console.error('Export error:', error);
    showNotification('Ошибка при экспорте задач', 'error');
  }
}

export function importMarkdownFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const markdown = e.target.result;
      const result = await storage.importTasksFromMarkdown(markdown, false);

      if (result.success) {
        showNotification(`Слепок восстановлен: ${result.count} задач`, 'success');
        renderTasks();

        if (elements.markdownFileInput) {
          elements.markdownFileInput.value = '';
        }
      } else {
        showNotification(`Ошибка: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Import error:', error);
      showNotification('Ошибка при чтении файла', 'error');
    }
  };

  reader.onerror = function() {
    showNotification('Ошибка при чтении файла', 'error');
  };

  reader.readAsText(file);
}

// ============================================================================
// Text Area Handling
// ============================================================================

let confirmedText = '';

export function setText(newText) {
  confirmedText = newText;
  updateState({ text: newText });
  if (elements.textArea && elements.textArea.value !== newText) {
    elements.textArea.value = newText;
  }
}

function handleTextAreaInput() {
  if (!elements.textArea) return;
  const newText = elements.textArea.value;
  confirmedText = newText;
  updateState({ text: newText });
}

// ============================================================================
// Recording Handlers
// ============================================================================

export function toggleRecording() {
  if (state.isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

export function startRecording() {
  if (!speechRecognition.isSupported()) {
    showError('Ваш браузер не поддерживает распознавание речи. Используйте Chrome или Edge.');
    return;
  }

  try {
    speechRecognition.start();
  } catch (error) {
    showError('Не удалось начать запись: ' + error.message);
  }
}

export function stopRecording() {
  speechRecognition.stop();
}

function handleSpeechResult(transcript, isFinal) {
  if (isFinal) {
    const separator = confirmedText && !confirmedText.endsWith(' ') ? ' ' : '';
    confirmedText = confirmedText + separator + transcript;
    setText(confirmedText);
  } else {
    const separator = confirmedText && !confirmedText.endsWith(' ') ? ' ' : '';
    const previewText = confirmedText + separator + transcript;
    if (elements.textArea) {
      elements.textArea.value = previewText;
    }
  }
}

function handleSpeechError(error) {
  if (error.code === 'not-allowed') {
    showError('Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.');
  } else if (error.code === 'no-speech') {
    // Ignore
  } else {
    showError('Ошибка распознавания речи: ' + error.message);
  }
}

function handleSpeechStateChange(isRecording) {
  updateState({ isRecording });
}

// ============================================================================
// Copy Handler
// ============================================================================

export async function copyToClipboard() {
  if (!state.text.trim()) return;

  try {
    await navigator.clipboard.writeText(state.text);
    showNotification('Текст скопирован', 'success', 2000);
  } catch (error) {
    showError('Не удалось скопировать текст');
  }
}

// ============================================================================
// AI Processing Handlers
// ============================================================================

function getAIService() {
  return state.provider === 'openrouter' ? openrouter : openai;
}

export async function improveText() {
  if (!state.text.trim() || state.isProcessing) return;

  if (!state.hasApiKey) {
    const providerName = state.provider === 'openrouter' ? 'OpenRouter' : 'OpenAI';
    showNotification(`Введите API ключ ${providerName} в настройках`, 'error');
    openSettingsModal();
    return;
  }

  const originalText = state.text;
  updateState({ isProcessing: true, processingType: 'improve' });
  clearError();

  try {
    const aiService = getAIService();
    const improvedText = await aiService.improveText(originalText);
    if (!state.originalText) {
      updateState({ originalText: originalText });
    }
    setText(improvedText);
    showNotification('Текст улучшен', 'success');
  } catch (error) {
    setText(originalText);
    showError('Ошибка при улучшении текста: ' + error.message);
  } finally {
    updateState({ isProcessing: false, processingType: null });
  }
}

export async function translateText() {
  if (!state.text.trim() || state.isProcessing) return;

  if (!state.hasApiKey) {
    const providerName = state.provider === 'openrouter' ? 'OpenRouter' : 'OpenAI';
    showNotification(`Введите API ключ ${providerName} в настройках`, 'error');
    openSettingsModal();
    return;
  }

  const originalText = state.text;
  updateState({ isProcessing: true, processingType: 'translate' });
  clearError();

  try {
    const aiService = getAIService();
    const translatedText = await aiService.translateToEnglish(originalText);
    if (!state.originalText) {
      updateState({ originalText: originalText });
    }
    setText(translatedText);
    showNotification('Текст переведён', 'success');
  } catch (error) {
    setText(originalText);
    showError('Ошибка при переводе текста: ' + error.message);
  } finally {
    updateState({ isProcessing: false, processingType: null });
  }
}

export function undoProcessing() {
  if (!state.originalText) return;

  setText(state.originalText);
  updateState({ originalText: null });
  showNotification('Текст восстановлен', 'success');
}

// ============================================================================
// Tasks Management
// ============================================================================

function linkifyText(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function createTask() {
  const text = state.text.trim();
  if (!text) return;

  try {
    storage.addTask(text);
    setText('');
    renderTasks();
    showNotification('Задача создана', 'success');
  } catch (error) {
    showError(error.message || 'Не удалось создать задачу');
  }
}

export function toggleTaskComplete(taskId) {
  // Optimistic UI update - update DOM immediately
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
  const checkbox = taskElement?.querySelector('input[type="checkbox"]');
  const isNowCompleted = checkbox?.checked;

  if (taskElement) {
    taskElement.classList.toggle('task-completed', isNowCompleted);
  }

  // Update in background (non-blocking)
  storage.updateTask(taskId, { completed: isNowCompleted });

  // Re-render to move task to correct section
  renderTasks();
}

export function startEditTask(taskId) {
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
  if (!taskElement) return;

  const tasks = storage.getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const textSpan = taskElement.querySelector('.task-text');
  const currentText = task.text;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'task-edit-input';
  input.value = currentText;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveEditTask(taskId, input.value);
    } else if (e.key === 'Escape') {
      renderTasks();
    }
  });

  input.addEventListener('blur', () => {
    saveEditTask(taskId, input.value);
  });

  textSpan.innerHTML = '';
  textSpan.appendChild(input);
  input.focus();
  input.select();
}

export function saveEditTask(taskId, newText) {
  const trimmedText = newText.trim();
  if (trimmedText) {
    storage.updateTask(taskId, { text: trimmedText });
  }
  renderTasks();
}

const deleteTimers = new Map();

export function startDeleteCountdown(taskId) {
  if (deleteTimers.has(taskId)) return;

  const endsAt = Date.now() + 5000;

  const timeoutId = setTimeout(() => {
    deleteTimers.delete(taskId);
    storage.deleteTask(taskId);
    renderTasks();
  }, 5000);

  deleteTimers.set(taskId, { timeoutId, endsAt });
  renderTasks();
}

export function cancelDeleteCountdown(taskId) {
  const timer = deleteTimers.get(taskId);
  if (timer) {
    clearTimeout(timer.timeoutId);
    deleteTimers.delete(taskId);
  }
  renderTasks();
}

export function isTaskDeleting(taskId) {
  return deleteTimers.has(taskId);
}

export function getDeleteCountdown(taskId) {
  const timer = deleteTimers.get(taskId);
  if (!timer) return 0;
  return Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
}

export function deleteTask(taskId) {
  startDeleteCountdown(taskId);
}

function formatDateLabel(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Сегодня';
  }
  if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Вчера';
  }

  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getDateKey(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function setTaskColor(taskId, color) {
  // Optimistic UI update - update DOM immediately
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);

  if (taskElement) {
    // Remove old color classes
    taskElement.classList.remove('task-color-green', 'task-color-orange', 'task-color-purple');
    // Add new color class
    if (color !== 'none') {
      taskElement.classList.add(`task-color-${color}`);
    }
    // Update active dot
    taskElement.querySelectorAll('.task-color-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.color === color);
    });
  }

  // Update in background (no await - fire and forget)
  storage.updateTask(taskId, { color });
}

function createDeleteCountdownElement(task) {
  const li = document.createElement('li');
  li.className = 'task-item task-deleting';
  li.dataset.taskId = task.id;

  const countdown = getDeleteCountdown(task.id);

  li.innerHTML = `
    <div class="task-delete-countdown">
      <span class="task-delete-message">
        Удаление через <span class="task-delete-timer">${countdown}</span>
      </span>
      <button class="task-delete-cancel">Отмена</button>
    </div>
  `;

  const timerSpan = li.querySelector('.task-delete-timer');
  const cancelBtn = li.querySelector('.task-delete-cancel');

  cancelBtn.addEventListener('click', () => {
    cancelDeleteCountdown(task.id);
  });

  const updateTimer = () => {
    if (!isTaskDeleting(task.id)) return;
    const remaining = getDeleteCountdown(task.id);
    if (timerSpan) {
      timerSpan.textContent = remaining;
    }
    if (remaining > 0) {
      requestAnimationFrame(updateTimer);
    }
  };
  requestAnimationFrame(updateTimer);

  return li;
}

function createTaskElement(task) {
  if (isTaskDeleting(task.id)) {
    return createDeleteCountdownElement(task);
  }

  const li = document.createElement('li');
  const colorClass = task.color && task.color !== 'none' ? `task-color-${task.color}` : '';
  li.className = `task-item ${task.completed ? 'task-completed' : ''} ${colorClass}`.trim();
  li.dataset.taskId = task.id;

  const escapedText = escapeHtml(task.text);
  const linkedText = linkifyText(escapedText);
  const currentColor = task.color || 'none';

  li.innerHTML = `
    <label class="task-checkbox">
      <input type="checkbox" ${task.completed ? 'checked' : ''} aria-label="Отметить выполненной">
      <span class="task-checkbox-custom"></span>
    </label>
    <span class="task-text">${linkedText}</span>
    <div class="task-color-picker">
      <button class="task-color-dot task-color-dot--none ${currentColor === 'none' ? 'active' : ''}"
              data-color="none" aria-label="Без цвета" title="Без цвета"></button>
      <button class="task-color-dot task-color-dot--purple ${currentColor === 'purple' ? 'active' : ''}"
              data-color="purple" aria-label="Фиолетовый" title="Фиолетовый"></button>
      <button class="task-color-dot task-color-dot--green ${currentColor === 'green' ? 'active' : ''}"
              data-color="green" aria-label="Зелёный" title="Зелёный"></button>
      <button class="task-color-dot task-color-dot--orange ${currentColor === 'orange' ? 'active' : ''}"
              data-color="orange" aria-label="Оранжевый" title="Оранжевый"></button>
    </div>
    <div class="task-actions">
      <button class="task-btn task-btn-edit" aria-label="Редактировать" title="Редактировать">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
      <button class="task-btn task-btn-delete" aria-label="Удалить" title="Удалить">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `;

  const checkbox = li.querySelector('input[type="checkbox"]');
  checkbox.addEventListener('change', () => toggleTaskComplete(task.id));

  const editBtn = li.querySelector('.task-btn-edit');
  editBtn.addEventListener('click', () => startEditTask(task.id));

  const deleteBtn = li.querySelector('.task-btn-delete');
  deleteBtn.addEventListener('click', () => deleteTask(task.id));

  const colorDots = li.querySelectorAll('.task-color-dot');
  colorDots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      const color = dot.dataset.color;
      setTaskColor(task.id, color);
    });
  });

  return li;
}

function createDateSeparator(label) {
  const li = document.createElement('li');
  li.className = 'tasks-date-separator';
  li.innerHTML = `<span class="tasks-date-label">${label}</span>`;
  return li;
}

// Debounce timer for renderTasks
let renderDebounceTimer = null;
let isRendering = false;

/**
 * Render tasks from given array
 */
function renderTasksFromArray(tasks) {
  if (!elements.tasksList || !elements.tasksCount) return;

  const total = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;

  elements.tasksCount.textContent = total > 0 ? `(${completedCount}/${total})` : '';
  elements.tasksList.innerHTML = '';

  if (tasks.length === 0) {
    elements.tasksList.innerHTML = '<li class="tasks-empty">Нет задач</li>';
    return;
  }

  // Sort: incomplete first (newest), then completed (by completion date)
  const incompleteTasks = tasks.filter(t => !t.completed).sort((a, b) => b.createdAt - a.createdAt);
  const completedTasks = tasks.filter(t => t.completed).sort((a, b) => (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt));

  incompleteTasks.forEach(task => {
    elements.tasksList.appendChild(createTaskElement(task));
  });

  if (completedTasks.length > 0) {
    const groupedByDate = new Map();

    completedTasks.forEach(task => {
      const dateKey = getDateKey(task.completedAt || task.createdAt);
      if (!groupedByDate.has(dateKey)) {
        groupedByDate.set(dateKey, []);
      }
      groupedByDate.get(dateKey).push(task);
    });

    groupedByDate.forEach((dateTasks, dateKey) => {
      const firstTask = dateTasks[0];
      const timestamp = firstTask.completedAt || firstTask.createdAt;
      const dateLabel = formatDateLabel(timestamp);

      elements.tasksList.appendChild(createDateSeparator(dateLabel));

      dateTasks.forEach(task => {
        elements.tasksList.appendChild(createTaskElement(task));
      });
    });
  }
}

/**
 * Render tasks with debouncing to prevent multiple rapid re-renders
 */
export function renderTasks() {
  // Clear any pending render
  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer);
  }

  // If already rendering, schedule for later
  if (isRendering) {
    renderDebounceTimer = setTimeout(() => renderTasks(), 100);
    return;
  }

  isRendering = true;

  try {
    // Render from cache (instant UI)
    const tasks = storage.getTasks();
    renderTasksFromArray(tasks);
  } catch (error) {
    console.error('Error rendering tasks:', error);
  } finally {
    isRendering = false;
  }
}

// ============================================================================
// Event Binding
// ============================================================================

function bindEvents() {
  elements.textArea?.addEventListener('input', handleTextAreaInput);
  elements.recordBtn?.addEventListener('click', toggleRecording);
  elements.copyBtn?.addEventListener('click', copyToClipboard);
  elements.improveBtn?.addEventListener('click', improveText);
  elements.translateBtn?.addEventListener('click', translateText);
  elements.undoBtn?.addEventListener('click', undoProcessing);
  elements.createTaskBtn?.addEventListener('click', createTask);
  elements.settingsBtn?.addEventListener('click', openSettingsModal);
  elements.modalCloseBtn?.addEventListener('click', closeSettingsModal);
  elements.modalBackdrop?.addEventListener('click', closeSettingsModal);
  elements.saveApiKeyBtn?.addEventListener('click', saveSettings);
  elements.providerSelect?.addEventListener('change', updateProviderSettingsVisibility);
  elements.exportMarkdownBtn?.addEventListener('click', exportMarkdownFile);
  elements.importMarkdownBtn?.addEventListener('click', () => {
    elements.markdownFileInput?.click();
  });
  elements.markdownFileInput?.addEventListener('change', importMarkdownFile);

  // Auth events
  elements.authForm?.addEventListener('submit', handleLogin);
  elements.authSignupBtn?.addEventListener('click', handleSignup);
  elements.logoutBtn?.addEventListener('click', handleLogout);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.settingsModal && !elements.settingsModal.hidden) {
      closeSettingsModal();
    }
  });

  elements.apiKeyInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveSettings();
    }
  });
  elements.openrouterApiKeyInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveSettings();
    }
  });

  // Debug buttons
  document.getElementById('debug-btn')?.addEventListener('click', showDebugInfo);
  document.getElementById('clear-cache-btn')?.addEventListener('click', clearAllCacheAndReload);
}

// ============================================================================
// Debug Functions
// ============================================================================

async function showDebugInfo() {
  const output = document.getElementById('debug-output');
  if (!output) return;

  output.style.display = 'block';
  output.textContent = 'Загрузка...';

  try {
    const cachedTasks = storage.getTasksFromCache();
    let serverTasks = [];
    let serverError = null;

    try {
      serverTasks = await storage.getTasks(true); // force refresh
    } catch (e) {
      serverError = e.message;
    }

    const info = [
      `📱 User Agent: ${navigator.userAgent.slice(0, 50)}...`,
      `👤 User: ${state.user?.email || 'не авторизован'}`,
      `🔐 Authenticated: ${state.isAuthenticated}`,
      `💾 Cached tasks: ${cachedTasks.length}`,
      `☁️ Server tasks: ${serverError ? 'ОШИБКА: ' + serverError : serverTasks.length}`,
      `📶 Online: ${navigator.onLine}`,
      `🕐 Time: ${new Date().toLocaleString('ru-RU')}`,
      ``,
      `LocalStorage test: ${testLocalStorage() ? 'OK' : 'FAILED'}`,
    ];

    output.textContent = info.join('\n');
  } catch (e) {
    output.textContent = 'Ошибка диагностики: ' + e.message;
  }
}

function testLocalStorage() {
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return true;
  } catch (e) {
    return false;
  }
}

function clearAllCacheAndReload() {
  if (!confirm('Очистить весь кэш и перезагрузить? Вам нужно будет войти заново.')) {
    return;
  }

  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.error('Failed to clear storage:', e);
  }

  window.location.reload();
}

function initSpeechRecognition() {
  speechRecognition.setOnResult(handleSpeechResult);
  speechRecognition.setOnError(handleSpeechError);
  speechRecognition.setOnStateChange(handleSpeechStateChange);
}

// ============================================================================
// Initialization
// ============================================================================

function cacheElements() {
  elements.textArea = document.getElementById('text-area');
  elements.recordBtn = document.getElementById('record-btn');
  elements.copyBtn = document.getElementById('copy-btn');
  elements.improveBtn = document.getElementById('improve-btn');
  elements.translateBtn = document.getElementById('translate-btn');
  elements.undoBtn = document.getElementById('undo-btn');
  elements.createTaskBtn = document.getElementById('create-task-btn');
  elements.settingsBtn = document.getElementById('settings-btn');
  elements.settingsModal = document.getElementById('settings-modal');
  elements.modalBackdrop = document.querySelector('#settings-modal .modal__backdrop');
  elements.modalCloseBtn = document.getElementById('modal-close-btn');
  elements.providerSelect = document.getElementById('provider-select');
  elements.apiKeyInput = document.getElementById('api-key-input');
  elements.openrouterApiKeyInput = document.getElementById('openrouter-api-key-input');
  elements.modelSelect = document.getElementById('model-select');
  elements.openaiSettings = document.getElementById('openai-settings');
  elements.openrouterSettings = document.getElementById('openrouter-settings');
  elements.saveApiKeyBtn = document.getElementById('save-api-key-btn');
  elements.exportMarkdownBtn = document.getElementById('export-markdown-btn');
  elements.importMarkdownBtn = document.getElementById('import-markdown-btn');
  elements.markdownFileInput = document.getElementById('markdown-file-input');
  elements.notification = document.getElementById('notification');
  elements.tasksSection = document.getElementById('tasks-section');
  elements.tasksList = document.getElementById('tasks-list');
  elements.tasksCount = document.getElementById('tasks-count');

  // Auth elements
  elements.authModal = document.getElementById('auth-modal');
  elements.authForm = document.getElementById('auth-form');
  elements.authEmail = document.getElementById('auth-email');
  elements.authPassword = document.getElementById('auth-password');
  elements.authLoginBtn = document.getElementById('auth-login-btn');
  elements.authSignupBtn = document.getElementById('auth-signup-btn');
  elements.authError = document.getElementById('auth-error');
  elements.userEmail = document.getElementById('user-email');
  elements.logoutBtn = document.getElementById('logout-btn');
  elements.mainContent = document.querySelector('.main');
  elements.header = document.querySelector('.header');
  elements.loadingScreen = document.getElementById('loading-screen');
}

async function loadUserData() {
  // Load tasks from cache immediately (instant UI)
  renderTasks();

  // Setup sync status listener to re-render when sync completes
  storage.onSyncStatusChange((status) => {
    // Re-render tasks when sync completes with fresh data
    if (!status.isSyncing && status.queueSize === 0) {
      renderTasks();
    }
  });

  // Start automatic background sync
  storage.startAutoSync();

  // Load settings in background (non-blocking, with timeout)
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Settings load timeout')), 3000)
    );

    const settingsPromise = (async () => {
      const savedProvider = await storage.getProvider();
      updateState({ provider: savedProvider });

      const savedOpenAIKey = await storage.getApiKey();
      if (savedOpenAIKey) {
        openai.setApiKey(savedOpenAIKey);
      }

      const savedModel = await storage.getModel();
      if (savedModel) {
        openai.setModel(savedModel);
      }

      const savedOpenRouterKey = await storage.getOpenRouterApiKey();
      if (savedOpenRouterKey) {
        openrouter.setApiKey(savedOpenRouterKey);
      }

      const hasKey = savedProvider === 'openrouter'
        ? !!savedOpenRouterKey
        : !!savedOpenAIKey;
      updateState({ hasApiKey: hasKey });
    })();

    await Promise.race([settingsPromise, timeoutPromise]);
  } catch (error) {
    console.warn('Failed to load settings, using defaults:', error);
    // App will work without settings - just no AI features
    updateState({ hasApiKey: false });
  }
}

async function init() {
  cacheElements();
  initSpeechRecognition();
  bindEvents();

  // Check cached auth state for instant UI (prevents flash)
  const cachedAuth = getCachedAuthState();

  // If we have cached auth, show main UI immediately while we verify
  if (cachedAuth?.isAuthenticated) {
    // Show main UI instantly based on cache
    if (elements.header) elements.header.hidden = false;
    if (elements.mainContent) elements.mainContent.hidden = false;
    if (elements.authModal) elements.authModal.hidden = true;
    if (elements.loadingScreen) elements.loadingScreen.hidden = true;
    if (elements.userEmail) {
      elements.userEmail.textContent = cachedAuth.userEmail || '';
      elements.userEmail.hidden = false;
    }
    if (elements.logoutBtn) elements.logoutBtn.hidden = false;
  }

  // Now verify with server (with timeout)
  try {
    const authTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Auth timeout')), 5000)
    );

    const user = await Promise.race([getCurrentUser(), authTimeout]);

    if (user) {
      updateState({ isAuthenticated: true, user });
      await loadUserData();
    } else {
      // User not logged in - clear cache and show login
      clearCachedAuthState();
      updateState({ isAuthenticated: false, user: null });
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    // On error, if we had cache, keep showing main UI
    // Otherwise show login
    if (!cachedAuth?.isAuthenticated) {
      updateState({ isAuthenticated: false, user: null });
    } else {
      // Keep cached state but show warning
      console.warn('Working offline with cached auth');
    }
    hideLoadingScreen();
  }

  updateUI();

  // Listen for auth state changes
  onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      updateState({ isAuthenticated: true, user: session.user });
      await loadUserData();
    } else if (event === 'SIGNED_OUT') {
      clearCachedAuthState();
      storage.clearTasksCache();
      updateState({ isAuthenticated: false, user: null, hasApiKey: false });
      if (elements.tasksList) {
        elements.tasksList.innerHTML = '';
      }
    }
  });

  console.log('COLIBRI initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  state,
  elements,
  updateUI,
  updateButtonStates
};
