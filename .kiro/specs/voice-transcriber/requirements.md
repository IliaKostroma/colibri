# Requirements Document

## Introduction

Voice Transcriber (pisec) — веб-приложение для онлайн-транскрибации голоса в текст с возможностью улучшения и перевода текста с помощью AI. Приложение предоставляет простой и современный интерфейс для записи речи, отображения транскрипции в реальном времени, а также инструменты для обработки текста через OpenAI API.

## Glossary

- **Transcriber**: Компонент системы, отвечающий за преобразование речи в текст с использованием Web Speech API
- **Text Area**: Текстовое поле для отображения и редактирования транскрибированного текста
- **OpenAI API**: Внешний сервис для улучшения и перевода текста
- **Recording State**: Состояние записи (активна/неактивна)
- **API Key**: Ключ доступа к OpenAI API, вводимый пользователем

## Requirements

### Requirement 1

**User Story:** As a user, I want to transcribe my speech to text in real-time, so that I can quickly capture my thoughts without typing.

#### Acceptance Criteria

1. WHEN a user clicks the record button THEN the Transcriber SHALL start capturing audio from the microphone and display transcribed text in the Text Area in real-time
2. WHEN a user clicks the stop button THEN the Transcriber SHALL stop capturing audio and preserve the transcribed text in the Text Area
3. WHILE the Transcriber is recording THEN the Transcriber SHALL display a visual indicator showing the active recording state
4. IF the browser does not support Web Speech API THEN the Transcriber SHALL display an error message informing the user about browser incompatibility

### Requirement 2

**User Story:** As a user, I want to copy the transcribed text to clipboard, so that I can easily use it in other applications.

#### Acceptance Criteria

1. WHEN a user clicks the copy button THEN the Transcriber SHALL copy the current Text Area content to the system clipboard
2. WHEN the copy operation completes successfully THEN the Transcriber SHALL display a brief visual confirmation to the user
3. IF the Text Area is empty THEN the copy button SHALL remain disabled

### Requirement 3

**User Story:** As a user, I want to improve my transcribed text using AI, so that it becomes more readable and structured.

#### Acceptance Criteria

1. WHEN a user clicks the improve button THEN the Transcriber SHALL send the Text Area content to OpenAI API with a prompt to improve readability
2. WHEN the OpenAI API returns the improved text THEN the Transcriber SHALL replace the Text Area content with the improved version
3. WHILE the improvement request is processing THEN the Transcriber SHALL display a loading indicator and disable the improve button
4. THE improvement prompt SHALL instruct the AI to preserve the original meaning while making text more readable and structured
5. THE improvement prompt SHALL instruct the AI to remove repetitions and filler words
6. THE improvement prompt SHALL instruct the AI to identify brand names and technology terms spoken in Russian and display them correctly in English (e.g., "ютуб" → "YouTube")
7. IF the OpenAI API key is not configured THEN the Transcriber SHALL prompt the user to enter the API key before processing
8. IF the OpenAI API request fails THEN the Transcriber SHALL display an error message and preserve the original text

### Requirement 4

**User Story:** As a user, I want to translate my text to English, so that I can communicate with international colleagues.

#### Acceptance Criteria

1. WHEN a user clicks the translate button THEN the Transcriber SHALL send the Text Area content to OpenAI API with a translation prompt
2. WHEN the OpenAI API returns the translated text THEN the Transcriber SHALL replace the Text Area content with the English translation
3. THE translation prompt SHALL instruct the AI to translate to friendly corporate English style
4. WHILE the translation request is processing THEN the Transcriber SHALL display a loading indicator and disable the translate button
5. IF the Text Area is empty THEN the translate button SHALL remain disabled
6. IF the OpenAI API request fails THEN the Transcriber SHALL display an error message and preserve the original text

### Requirement 5

**User Story:** As a user, I want to configure my OpenAI API key, so that I can use AI features for text improvement and translation.

#### Acceptance Criteria

1. WHEN a user opens the settings menu THEN the Transcriber SHALL display an input field for the OpenAI API key
2. WHEN a user saves the API key THEN the Transcriber SHALL store the key securely in browser local storage
3. WHEN the application loads THEN the Transcriber SHALL retrieve the stored API key from local storage if available
4. THE Transcriber SHALL mask the API key input field to prevent shoulder surfing

### Requirement 6

**User Story:** As a user, I want a modern and responsive interface, so that I can use the application comfortably on any device.

#### Acceptance Criteria

1. THE Transcriber interface SHALL adapt to screen sizes from 320px to 2560px width
2. THE Transcriber SHALL use a clean, modern visual design with consistent spacing and typography
3. THE Transcriber SHALL provide clear visual feedback for all interactive elements (buttons, inputs)
4. WHILE any operation is in progress THEN the Transcriber SHALL display appropriate loading states
5. THE Transcriber SHALL support both light appearance mode
