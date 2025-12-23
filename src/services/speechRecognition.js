/**
 * SpeechRecognitionService - Handles voice-to-text transcription using Web Speech API
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

// Get the SpeechRecognition constructor (with vendor prefix fallback)
const SpeechRecognition = typeof window !== 'undefined' 
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

let recognition = null;
let isRecording = false;

// Callbacks
let onResult = null;
let onError = null;
let onStateChange = null;

/**
 * Check if the browser supports Web Speech API
 * Requirements: 1.4
 * @returns {boolean} True if speech recognition is supported
 */
export function isSupported() {
  return SpeechRecognition !== null && SpeechRecognition !== undefined;
}

/**
 * Set the callback for receiving transcription results
 * @param {function(string, boolean): void} callback - Called with (transcript, isFinal)
 */
export function setOnResult(callback) {
  onResult = callback;
}

/**
 * Set the callback for handling errors
 * @param {function(Error): void} callback - Called with error object
 */
export function setOnError(callback) {
  onError = callback;
}

/**
 * Set the callback for state changes
 * @param {function(boolean): void} callback - Called with isRecording state
 */
export function setOnStateChange(callback) {
  onStateChange = callback;
}

/**
 * Get the current recording state
 * @returns {boolean} True if currently recording
 */
export function getIsRecording() {
  return isRecording;
}


/**
 * Initialize the SpeechRecognition instance
 * @private
 */
function initRecognition() {
  if (!isSupported()) {
    return null;
  }

  const instance = new SpeechRecognition();
  
  // Configure for continuous recognition with interim results
  instance.continuous = true;
  instance.interimResults = true;
  instance.lang = 'ru-RU'; // Default to Russian for this app
  
  // Handle results
  instance.onresult = (event) => {
    if (!onResult) return;
    
    let finalTranscript = '';
    let interimTranscript = '';
    
    // Start from resultIndex to skip already processed final results
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        // Final phrase - collect for appending to history
        finalTranscript += event.results[i][0].transcript;
      } else {
        // Interim phrase - collect for temporary display
        interimTranscript += event.results[i][0].transcript;
      }
    }
    
    // Send final transcript (will be appended to existing text)
    if (finalTranscript) {
      onResult(finalTranscript, true);
    }
    
    // Send interim transcript (will replace previous interim)
    onResult(interimTranscript, false);
  };
  
  // Handle errors
  instance.onerror = (event) => {
    const error = new Error(event.error || 'Speech recognition error');
    error.code = event.error;
    
    if (onError) {
      onError(error);
    }
    
    // Update state on error (except for 'no-speech' which doesn't stop recognition)
    if (event.error !== 'no-speech') {
      isRecording = false;
      if (onStateChange) {
        onStateChange(false);
      }
    }
  };
  
  // Handle end event
  instance.onend = () => {
    // Only update state if we were recording (prevents double state change)
    if (isRecording) {
      isRecording = false;
      if (onStateChange) {
        onStateChange(false);
      }
    }
  };
  
  // Handle start event
  instance.onstart = () => {
    isRecording = true;
    if (onStateChange) {
      onStateChange(true);
    }
  };
  
  return instance;
}

/**
 * Start speech recognition
 * Requirements: 1.1, 1.3
 * @throws {Error} If browser doesn't support speech recognition
 */
export function start() {
  if (!isSupported()) {
    const error = new Error('Speech recognition is not supported in this browser');
    if (onError) {
      onError(error);
    }
    throw error;
  }
  
  if (isRecording) {
    return; // Already recording
  }
  
  // Create new recognition instance for each session
  recognition = initRecognition();
  
  if (recognition) {
    recognition.start();
  }
}

/**
 * Stop speech recognition
 * Requirements: 1.2
 */
export function stop() {
  if (recognition && isRecording) {
    recognition.stop();
  }
}

/**
 * Abort speech recognition (stops immediately without waiting for final results)
 */
export function abort() {
  if (recognition) {
    recognition.abort();
    isRecording = false;
    if (onStateChange) {
      onStateChange(false);
    }
  }
}

/**
 * Reset the service state (useful for testing)
 * @private
 */
export function _reset() {
  if (recognition) {
    try {
      recognition.abort();
    } catch (e) {
      // Ignore errors during reset
    }
  }
  recognition = null;
  isRecording = false;
  onResult = null;
  onError = null;
  onStateChange = null;
}
