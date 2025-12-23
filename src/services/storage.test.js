import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  saveApiKey, getApiKey, removeApiKey,
  getTasks, saveTasks, addTask, updateTask, deleteTask, getTasksSorted, migrateTasks
} from './storage.js';

/**
 * StorageService Tests
 * Requirements: 5.2, 5.3
 */
describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /**
   * **Feature: voice-transcriber, Property 4: API key persistence round-trip**
   * **Validates: Requirements 5.2, 5.3**
   * 
   * For any valid API key string, saving to storage and then retrieving
   * SHALL return the same key value.
   */
  describe('Property 4: API key persistence round-trip', () => {
    it('should return the same key after save and get for any string', () => {
      fc.assert(
        fc.property(fc.string(), (key) => {
          saveApiKey(key);
          const retrieved = getApiKey();
          return retrieved === key;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit Tests', () => {
    it('should save and retrieve API key', () => {
      const testKey = 'sk-test-api-key-12345';
      saveApiKey(testKey);
      expect(getApiKey()).toBe(testKey);
    });

    it('should return null when no API key is stored', () => {
      expect(getApiKey()).toBeNull();
    });

    it('should remove API key', () => {
      const testKey = 'sk-test-api-key-12345';
      saveApiKey(testKey);
      expect(getApiKey()).toBe(testKey);
      
      removeApiKey();
      expect(getApiKey()).toBeNull();
    });

    it('should overwrite existing API key', () => {
      saveApiKey('first-key');
      saveApiKey('second-key');
      expect(getApiKey()).toBe('second-key');
    });
  });
});

/**
 * Tasks Storage Tests
 */
describe('Tasks Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getTasks', () => {
    it('should return empty array when no tasks stored', () => {
      expect(getTasks()).toEqual([]);
    });

    it('should return stored tasks', () => {
      const tasks = [{ id: '1', text: 'Test', completed: false, createdAt: 123 }];
      localStorage.setItem('voice-transcriber-tasks', JSON.stringify(tasks));
      expect(getTasks()).toEqual(tasks);
    });

    it('should return empty array on invalid JSON', () => {
      localStorage.setItem('voice-transcriber-tasks', 'invalid json');
      expect(getTasks()).toEqual([]);
    });
  });

  describe('saveTasks', () => {
    it('should save tasks to localStorage', () => {
      const tasks = [{ id: '1', text: 'Test', completed: false, createdAt: 123 }];
      saveTasks(tasks);
      expect(JSON.parse(localStorage.getItem('voice-transcriber-tasks'))).toEqual(tasks);
    });
  });

  describe('addTask', () => {
    it('should add a new task', () => {
      const task = addTask('Test task');
      expect(task).not.toBeNull();
      expect(task.text).toBe('Test task');
      expect(task.completed).toBe(false);
      expect(task.completedAt).toBeNull();
      expect(getTasks()).toHaveLength(1);
    });

    it('should allow unlimited tasks', () => {
      // Add many tasks - should not have limit anymore
      for (let i = 0; i < 30; i++) {
        addTask(`Task ${i}`);
      }
      expect(getTasks()).toHaveLength(30);
    });

    it('should trim task text', () => {
      const task = addTask('  Test task  ');
      expect(task.text).toBe('Test task');
    });
  });

  describe('updateTask', () => {
    it('should update task properties', () => {
      const task = addTask('Original');
      const updated = updateTask(task.id, { text: 'Updated', completed: true });
      expect(updated.text).toBe('Updated');
      expect(updated.completed).toBe(true);
    });

    it('should set completedAt when task is completed', () => {
      const task = addTask('Test');
      expect(task.completedAt).toBeNull();

      const updated = updateTask(task.id, { completed: true });
      expect(updated.completedAt).not.toBeNull();
      expect(typeof updated.completedAt).toBe('number');
    });

    it('should clear completedAt when task is uncompleted', () => {
      const task = addTask('Test');
      updateTask(task.id, { completed: true });

      const updated = updateTask(task.id, { completed: false });
      expect(updated.completedAt).toBeNull();
    });

    it('should return null for non-existent task', () => {
      expect(updateTask('non-existent', { text: 'Test' })).toBeNull();
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', () => {
      const task = addTask('To delete');
      expect(deleteTask(task.id)).toBe(true);
      expect(getTasks()).toHaveLength(0);
    });

    it('should return false for non-existent task', () => {
      expect(deleteTask('non-existent')).toBe(false);
    });
  });

  describe('getTasksSorted', () => {
    it('should sort incomplete tasks first', () => {
      const task1 = addTask('Incomplete');
      const task2 = addTask('Complete');
      updateTask(task2.id, { completed: true });

      const sorted = getTasksSorted();
      expect(sorted[0].completed).toBe(false);
      expect(sorted[1].completed).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should persist tasks across simulated page reload', () => {
      // Add task
      const task = addTask('Persistent task');

      // Simulate reading from localStorage (like on page load)
      const storedTasks = getTasks();
      expect(storedTasks).toHaveLength(1);
      expect(storedTasks[0].text).toBe('Persistent task');
      expect(storedTasks[0].id).toBe(task.id);
    });
  });

  describe('migrateTasks', () => {
    it('should add completedAt to completed tasks without it', () => {
      // Save old-format tasks (without completedAt)
      const oldTasks = [
        { id: '1', text: 'Completed', completed: true, createdAt: 123 },
        { id: '2', text: 'Incomplete', completed: false, createdAt: 456 }
      ];
      saveTasks(oldTasks);

      migrateTasks();

      const tasks = getTasks();
      expect(tasks[0].completedAt).not.toBeNull();
      expect(typeof tasks[0].completedAt).toBe('number');
      expect(tasks[1].completedAt).toBeNull();
    });

    it('should not modify tasks that already have completedAt', () => {
      const existingTasks = [
        { id: '1', text: 'Test', completed: true, createdAt: 123, completedAt: 999 }
      ];
      saveTasks(existingTasks);

      migrateTasks();

      const tasks = getTasks();
      expect(tasks[0].completedAt).toBe(999);
    });
  });
});
