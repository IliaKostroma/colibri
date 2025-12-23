import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

/**
 * SpeechRecognitionService Tests
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

// Mock SpeechRecognition class
class MockSpeechRecognition {
  constructor() {
    this.continuous = false;
    this.interimResults = false;
    this.lang = '';
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this.onstart = null;
    this._isRunning = false;
  }

  start() {
    if (this._isRunning) {
      throw new Error('Already running');
    }
    this._isRunning = true;
    // Simulate async start event
    setTimeout(() => {
      if (this.onstart) this.onstart();
    }, 0);
  }

  stop() {
    if (this._isRunning) {
      this._isRunning = false;
      // Simulate async end event
      setTimeout(() => {
        if (this.onend) this.onend();
      }, 0);
    }
  }

  abort() {
    this._isRunning = false;
    if (this.onend) this.onend();
  }
}

describe('SpeechRecognitionService', () => {
  let speechRecognitionModule;
  
  beforeEach(async () => {
    // Setup mock before importing module
    window.SpeechRecognition = MockSpeechRecognition;
    window.webkitSpeechRecognition = MockSpeechRecognition;
    
    // Clear module cache and reimport
    vi.resetModules();
    speechRecognitionModule = await import('./speechRecognition.js');
    
    vi.useFakeTimers();
  });

  afterEach(() => {
    speechRecognitionModule._reset();
    vi.useRealTimers();
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  });


  /**
   * **Feature: voice-transcriber, Property 1: Recording state consistency**
   * **Validates: Requirements 1.1, 1.2, 1.3**
   * 
   * For any sequence of start/stop recording operations, the UI recording indicator
   * state (via onStateChange callback) SHALL always match the actual recording state
   * (via getIsRecording()).
   */
  describe('Property 1: Recording state consistency', () => {
    it('state reported via callback should always match getIsRecording() for any operation sequence', () => {
      // Generate arbitrary sequences of operations
      const operationArb = fc.constantFrom('start', 'stop', 'abort');
      const operationSequenceArb = fc.array(operationArb, { minLength: 1, maxLength: 20 });

      fc.assert(
        fc.property(operationSequenceArb, (operations) => {
          speechRecognitionModule._reset();
          
          let callbackState = false;
          speechRecognitionModule.setOnStateChange((isRecording) => {
            callbackState = isRecording;
          });

          for (const op of operations) {
            try {
              if (op === 'start') {
                speechRecognitionModule.start();
                vi.runAllTimers();
              } else if (op === 'stop') {
                speechRecognitionModule.stop();
                vi.runAllTimers();
              } else if (op === 'abort') {
                speechRecognitionModule.abort();
                vi.runAllTimers();
              }
            } catch (e) {
              // Ignore errors (e.g., starting when already started)
            }

            // After each operation, callback state must match getIsRecording()
            if (callbackState !== speechRecognitionModule.getIsRecording()) {
              return false;
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('starting recording should set state to true, stopping should set to false', () => {
      fc.assert(
        fc.property(fc.nat(10), (repeatCount) => {
          speechRecognitionModule._reset();
          
          const stateHistory = [];
          speechRecognitionModule.setOnStateChange((isRecording) => {
            stateHistory.push(isRecording);
          });

          // Perform start/stop cycles
          for (let i = 0; i < repeatCount; i++) {
            speechRecognitionModule.start();
            vi.runAllTimers();
            
            if (speechRecognitionModule.getIsRecording() !== true) return false;
            
            speechRecognitionModule.stop();
            vi.runAllTimers();
            
            if (speechRecognitionModule.getIsRecording() !== false) return false;
          }

          // Verify state transitions alternate correctly
          for (let i = 0; i < stateHistory.length; i++) {
            const expectedState = i % 2 === 0; // true, false, true, false...
            if (stateHistory[i] !== expectedState) return false;
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });


  describe('Unit Tests', () => {
    describe('isSupported', () => {
      it('should return true when SpeechRecognition is available', () => {
        expect(speechRecognitionModule.isSupported()).toBe(true);
      });

      it('should return false when SpeechRecognition is not available', async () => {
        delete window.SpeechRecognition;
        delete window.webkitSpeechRecognition;
        
        vi.resetModules();
        const freshModule = await import('./speechRecognition.js');
        
        expect(freshModule.isSupported()).toBe(false);
      });
    });

    describe('start/stop state transitions', () => {
      it('should start recording and update state', () => {
        const stateChanges = [];
        speechRecognitionModule.setOnStateChange((isRecording) => stateChanges.push(isRecording));

        expect(speechRecognitionModule.getIsRecording()).toBe(false);
        
        speechRecognitionModule.start();
        vi.runAllTimers();
        
        expect(speechRecognitionModule.getIsRecording()).toBe(true);
        expect(stateChanges).toContain(true);
      });

      it('should stop recording and update state', () => {
        const stateChanges = [];
        speechRecognitionModule.setOnStateChange((isRecording) => stateChanges.push(isRecording));

        speechRecognitionModule.start();
        vi.runAllTimers();
        
        speechRecognitionModule.stop();
        vi.runAllTimers();
        
        expect(speechRecognitionModule.getIsRecording()).toBe(false);
        expect(stateChanges).toEqual([true, false]);
      });

      it('should not start again if already recording', () => {
        speechRecognitionModule.start();
        vi.runAllTimers();
        
        // Second start should be ignored (no error thrown)
        speechRecognitionModule.start();
        vi.runAllTimers();
        
        expect(speechRecognitionModule.getIsRecording()).toBe(true);
      });

      it('should handle stop when not recording', () => {
        // Should not throw
        speechRecognitionModule.stop();
        vi.runAllTimers();
        
        expect(speechRecognitionModule.getIsRecording()).toBe(false);
      });

      it('should abort recording immediately', () => {
        const stateChanges = [];
        speechRecognitionModule.setOnStateChange((isRecording) => stateChanges.push(isRecording));

        speechRecognitionModule.start();
        vi.runAllTimers();
        
        speechRecognitionModule.abort();
        
        expect(speechRecognitionModule.getIsRecording()).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should throw error when starting without browser support', async () => {
        delete window.SpeechRecognition;
        delete window.webkitSpeechRecognition;
        
        vi.resetModules();
        const freshModule = await import('./speechRecognition.js');
        
        const errors = [];
        freshModule.setOnError((error) => errors.push(error));
        
        expect(() => freshModule.start()).toThrow('Speech recognition is not supported in this browser');
        expect(errors.length).toBe(1);
      });
    });

    describe('reset functionality', () => {
      it('should reset all state and callbacks', () => {
        let callbackCalled = false;
        speechRecognitionModule.setOnStateChange(() => { callbackCalled = true; });
        
        speechRecognitionModule.start();
        vi.runAllTimers();
        
        speechRecognitionModule._reset();
        
        expect(speechRecognitionModule.getIsRecording()).toBe(false);
      });
    });
  });
});
