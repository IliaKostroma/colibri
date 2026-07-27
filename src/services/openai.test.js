import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { setApiKey, hasApiKey, improveText, translateToEnglish } from './openai.js';

/**
 * OpenAIService Tests
 * Requirements: 3.1, 3.8, 4.1, 4.6
 */
describe('OpenAIService', () => {
  beforeEach(() => {
    setApiKey(null);
    vi.restoreAllMocks();
  });

  /**
   * **Feature: voice-transcriber, Property 2: Text preservation on error**
   * **Validates: Requirements 3.8, 4.6**
   * 
   * For any OpenAI API request that fails, the original text in the Text Area
   * SHALL remain unchanged. This property tests that the service throws an error
   * without modifying the input, allowing the caller to preserve the original text.
   */
  describe('Property 2: Text preservation on error', () => {
    it('improveText should throw error and not modify input on API failure', async () => {
      setApiKey('test-api-key');
      
      // Mock fetch to simulate API failure
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: 'Server error' } })
      });

      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1 }), async (originalText) => {
          const textBefore = originalText;
          
          try {
            await improveText(originalText);
            // If no error thrown, test fails
            return false;
          } catch (error) {
            // Original text should remain unchanged (immutable string)
            return originalText === textBefore && error instanceof Error;
          }
        }),
        { numRuns: 100 }
      );
    });

    it('translateToEnglish should throw error and not modify input on API failure', async () => {
      setApiKey('test-api-key');
      
      // Mock fetch to simulate API failure
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: 'Server error' } })
      });

      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1 }), async (originalText) => {
          const textBefore = originalText;
          
          try {
            await translateToEnglish(originalText);
            // If no error thrown, test fails
            return false;
          } catch (error) {
            // Original text should remain unchanged (immutable string)
            return originalText === textBefore && error instanceof Error;
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should throw error when API key is not configured', async () => {
      // No API key set
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1 }), async (text) => {
          try {
            await improveText(text);
            return false;
          } catch (error) {
            return error.message === 'API key not configured';
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit Tests', () => {
    describe('setApiKey and hasApiKey', () => {
      it('should return false when no API key is set', () => {
        expect(hasApiKey()).toBe(false);
      });

      it('should return true when API key is set', () => {
        setApiKey('sk-test-key');
        expect(hasApiKey()).toBe(true);
      });

      it('should return false when API key is empty string', () => {
        setApiKey('');
        expect(hasApiKey()).toBe(false);
      });

      it('should return false when API key is set to null', () => {
        setApiKey('sk-test-key');
        setApiKey(null);
        expect(hasApiKey()).toBe(false);
      });
    });

    describe('improveText', () => {
      it('should throw error when API key is not configured', async () => {
        await expect(improveText('test text')).rejects.toThrow('API key not configured');
      });

      it('should make correct API request with improvement prompt', async () => {
        setApiKey('sk-test-key');
        
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'Improved text' } }]
          })
        });

        const result = await improveText('Original text');
        
        expect(result).toBe('Improved text');
        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.openai.com/v1/chat/completions',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer sk-test-key'
            })
          })
        );
        
        const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(requestBody.messages[0].role).toBe('system');
        expect(requestBody.messages[0].content).toContain('редактор русского текста');
        expect(requestBody.messages[1].role).toBe('user');
        expect(requestBody.messages[1].content).toContain('Original text');
      });

      it('should throw error on API failure', async () => {
        setApiKey('sk-test-key');
        
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: { message: 'Invalid API key' } })
        });

        await expect(improveText('test')).rejects.toThrow('Invalid API key');
      });

      it('should throw error on invalid response format', async () => {
        setApiKey('sk-test-key');
        
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ invalid: 'response' })
        });

        await expect(improveText('test')).rejects.toThrow('Invalid API response format');
      });
    });

    describe('translateToEnglish', () => {
      it('should throw error when API key is not configured', async () => {
        await expect(translateToEnglish('test text')).rejects.toThrow('API key not configured');
      });

      it('should make correct API request with translation prompt', async () => {
        setApiKey('sk-test-key');
        
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'Translated text' } }]
          })
        });

        const result = await translateToEnglish('Привет мир');
        
        expect(result).toBe('Translated text');
        
        const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(requestBody.messages[0].content).toContain('с русского на английский');
        // Без этого ограничения модели возвращают эссе с вариантами перевода
        expect(requestBody.messages[0].content).toContain('только перевод');
        expect(requestBody.messages[1].content).toContain('Привет мир');
      });

      it('should throw error on API failure', async () => {
        setApiKey('sk-test-key');
        
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: { message: 'Server error' } })
        });

        await expect(translateToEnglish('test')).rejects.toThrow('Server error');
      });
    });
  });
});
