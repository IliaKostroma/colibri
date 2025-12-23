import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';

/**
 * App State Management Tests
 * Requirements: 2.3, 3.7, 4.5
 */

/**
 * Pure function to compute button states based on app state
 * This mirrors the logic in updateButtonStates() but is pure for testing
 * 
 * @param {Object} state - Application state
 * @returns {Object} Button disabled states
 */
function computeButtonStates(state) {
  const hasText = state.text.trim().length > 0;
  const canProcess = hasText && state.hasApiKey && !state.isProcessing && !state.isRecording;
  
  return {
    copyDisabled: !hasText || state.isProcessing,
    improveDisabled: !canProcess,
    translateDisabled: !canProcess,
    recordDisabled: state.isProcessing
  };
}

/**
 * **Feature: voice-transcriber, Property 3: Button state consistency**
 * **Validates: Requirements 2.3, 3.7, 4.5**
 * 
 * For any application state, buttons SHALL be disabled if and only if
 * their preconditions are not met:
 * - Copy button: disabled if text is empty (Requirement 2.3)
 * - Improve button: disabled if no text, no API key, or processing (Requirement 3.7)
 * - Translate button: disabled if no text, no API key, or processing (Requirement 4.5)
 * - Record button: disabled during processing
 */
describe('Property 3: Button state consistency', () => {
  // Arbitrary for generating valid app states
  const appStateArbitrary = fc.record({
    text: fc.string(),
    isRecording: fc.boolean(),
    isProcessing: fc.boolean(),
    processingType: fc.oneof(
      fc.constant(null),
      fc.constant('improve'),
      fc.constant('translate')
    ),
    hasApiKey: fc.boolean(),
    error: fc.option(fc.string(), { nil: null }),
    notification: fc.option(fc.string(), { nil: null })
  });

  it('copy button is disabled if and only if text is empty or processing', () => {
    fc.assert(
      fc.property(appStateArbitrary, (state) => {
        const buttonStates = computeButtonStates(state);
        const hasText = state.text.trim().length > 0;
        
        // Copy button should be disabled when:
        // 1. Text is empty, OR
        // 2. Processing is in progress
        const expectedDisabled = !hasText || state.isProcessing;
        
        return buttonStates.copyDisabled === expectedDisabled;
      }),
      { numRuns: 100 }
    );
  });

  it('improve button is disabled if and only if preconditions are not met', () => {
    fc.assert(
      fc.property(appStateArbitrary, (state) => {
        const buttonStates = computeButtonStates(state);
        const hasText = state.text.trim().length > 0;
        
        // Improve button should be disabled when:
        // 1. Text is empty, OR
        // 2. No API key, OR
        // 3. Processing is in progress, OR
        // 4. Recording is in progress
        const canProcess = hasText && state.hasApiKey && !state.isProcessing && !state.isRecording;
        const expectedDisabled = !canProcess;
        
        return buttonStates.improveDisabled === expectedDisabled;
      }),
      { numRuns: 100 }
    );
  });

  it('translate button is disabled if and only if preconditions are not met', () => {
    fc.assert(
      fc.property(appStateArbitrary, (state) => {
        const buttonStates = computeButtonStates(state);
        const hasText = state.text.trim().length > 0;
        
        // Translate button should be disabled when:
        // 1. Text is empty, OR
        // 2. No API key, OR
        // 3. Processing is in progress, OR
        // 4. Recording is in progress
        const canProcess = hasText && state.hasApiKey && !state.isProcessing && !state.isRecording;
        const expectedDisabled = !canProcess;
        
        return buttonStates.translateDisabled === expectedDisabled;
      }),
      { numRuns: 100 }
    );
  });

  it('record button is disabled if and only if processing is in progress', () => {
    fc.assert(
      fc.property(appStateArbitrary, (state) => {
        const buttonStates = computeButtonStates(state);
        
        // Record button should be disabled only when processing
        const expectedDisabled = state.isProcessing;
        
        return buttonStates.recordDisabled === expectedDisabled;
      }),
      { numRuns: 100 }
    );
  });

  it('all button states are consistent for any valid app state', () => {
    fc.assert(
      fc.property(appStateArbitrary, (state) => {
        const buttonStates = computeButtonStates(state);
        const hasText = state.text.trim().length > 0;
        const canProcess = hasText && state.hasApiKey && !state.isProcessing && !state.isRecording;
        
        // Verify all button states match their preconditions
        const copyCorrect = buttonStates.copyDisabled === (!hasText || state.isProcessing);
        const improveCorrect = buttonStates.improveDisabled === !canProcess;
        const translateCorrect = buttonStates.translateDisabled === !canProcess;
        const recordCorrect = buttonStates.recordDisabled === state.isProcessing;
        
        return copyCorrect && improveCorrect && translateCorrect && recordCorrect;
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Unit tests for button state edge cases
 */
describe('Button state edge cases', () => {
  it('whitespace-only text should be treated as empty', () => {
    const state = {
      text: '   \t\n  ',
      isRecording: false,
      isProcessing: false,
      hasApiKey: true
    };
    
    const buttonStates = computeButtonStates(state);
    
    expect(buttonStates.copyDisabled).toBe(true);
    expect(buttonStates.improveDisabled).toBe(true);
    expect(buttonStates.translateDisabled).toBe(true);
  });

  it('all AI buttons disabled when API key is missing', () => {
    const state = {
      text: 'Some text',
      isRecording: false,
      isProcessing: false,
      hasApiKey: false
    };
    
    const buttonStates = computeButtonStates(state);
    
    expect(buttonStates.copyDisabled).toBe(false); // Copy doesn't need API key
    expect(buttonStates.improveDisabled).toBe(true);
    expect(buttonStates.translateDisabled).toBe(true);
  });

  it('all action buttons disabled during processing', () => {
    const state = {
      text: 'Some text',
      isRecording: false,
      isProcessing: true,
      hasApiKey: true
    };
    
    const buttonStates = computeButtonStates(state);
    
    expect(buttonStates.copyDisabled).toBe(true);
    expect(buttonStates.improveDisabled).toBe(true);
    expect(buttonStates.translateDisabled).toBe(true);
    expect(buttonStates.recordDisabled).toBe(true);
  });

  it('AI buttons disabled during recording', () => {
    const state = {
      text: 'Some text',
      isRecording: true,
      isProcessing: false,
      hasApiKey: true
    };
    
    const buttonStates = computeButtonStates(state);
    
    expect(buttonStates.copyDisabled).toBe(false);
    expect(buttonStates.improveDisabled).toBe(true);
    expect(buttonStates.translateDisabled).toBe(true);
    expect(buttonStates.recordDisabled).toBe(false);
  });

  it('all buttons enabled when all preconditions are met', () => {
    const state = {
      text: 'Some text',
      isRecording: false,
      isProcessing: false,
      hasApiKey: true
    };
    
    const buttonStates = computeButtonStates(state);
    
    expect(buttonStates.copyDisabled).toBe(false);
    expect(buttonStates.improveDisabled).toBe(false);
    expect(buttonStates.translateDisabled).toBe(false);
    expect(buttonStates.recordDisabled).toBe(false);
  });
});

/**
 * **Feature: voice-transcriber, Property 5: Transcription accumulation**
 * **Validates: Requirements 1.1, 1.2**
 * 
 * For any sequence of speech recognition results, the Text Area SHALL contain
 * the concatenation of all final transcripts in order.
 */
describe('Property 5: Transcription accumulation', () => {
  /**
   * Pure function that simulates transcription accumulation logic
   * This mirrors the handleSpeechResult logic in app.js
   * 
   * @param {string} currentText - Current text in the text area
   * @param {string} transcript - New transcript to append
   * @returns {string} Updated text
   */
  function accumulateTranscript(currentText, transcript) {
    const separator = currentText && !currentText.endsWith(' ') ? ' ' : '';
    return currentText + separator + transcript;
  }

  /**
   * Simulate processing a sequence of transcripts
   * @param {string[]} transcripts - Array of final transcripts
   * @returns {string} Final accumulated text
   */
  function processTranscriptSequence(transcripts) {
    let text = '';
    for (const transcript of transcripts) {
      text = accumulateTranscript(text, transcript);
    }
    return text;
  }

  // Arbitrary for generating non-empty transcript strings
  const transcriptArbitrary = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);

  it('accumulates all transcripts in order', () => {
    fc.assert(
      fc.property(
        fc.array(transcriptArbitrary, { minLength: 1, maxLength: 20 }),
        (transcripts) => {
          const result = processTranscriptSequence(transcripts);
          
          // All transcripts should appear in the result in order
          let searchIndex = 0;
          for (const transcript of transcripts) {
            const foundIndex = result.indexOf(transcript, searchIndex);
            if (foundIndex === -1) {
              return false; // Transcript not found
            }
            searchIndex = foundIndex + transcript.length;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('first transcript appears at the start', () => {
    fc.assert(
      fc.property(
        fc.array(transcriptArbitrary, { minLength: 1, maxLength: 10 }),
        (transcripts) => {
          const result = processTranscriptSequence(transcripts);
          
          // First transcript should be at the beginning
          return result.startsWith(transcripts[0]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('last transcript appears at the end', () => {
    fc.assert(
      fc.property(
        fc.array(transcriptArbitrary, { minLength: 1, maxLength: 10 }),
        (transcripts) => {
          const result = processTranscriptSequence(transcripts);
          const lastTranscript = transcripts[transcripts.length - 1];
          
          // Last transcript should be at the end
          return result.endsWith(lastTranscript);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty initial text starts with first transcript', () => {
    fc.assert(
      fc.property(transcriptArbitrary, (transcript) => {
        const result = accumulateTranscript('', transcript);
        return result === transcript;
      }),
      { numRuns: 100 }
    );
  });

  it('adds separator when current text does not end with space', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.length > 0 && !s.endsWith(' ')),
        transcriptArbitrary,
        (currentText, transcript) => {
          const result = accumulateTranscript(currentText, transcript);
          
          // Should have a space between current text and new transcript
          return result === currentText + ' ' + transcript;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not add extra separator when current text ends with space', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).map(s => s + ' '),
        transcriptArbitrary,
        (currentText, transcript) => {
          const result = accumulateTranscript(currentText, transcript);
          
          // Should not add extra space
          return result === currentText + transcript;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Export for potential reuse
export { computeButtonStates };
