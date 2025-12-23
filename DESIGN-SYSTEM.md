# Voice Transcriber - Design System

## Overview

Минималистичный, чистый дизайн с фокусом на читаемость и usability. Стиль: современный, слегка "soft UI" с мягкими тенями и скруглениями.

---

## Color Palette

### Primary Colors

```css
--color-primary: #4f46e5;        /* Indigo - основной акцент */
--color-primary-hover: #4338ca;  /* Darker indigo для hover */
--color-primary-active: #3730a3; /* Darkest indigo для active */
```

**RGB:** `rgb(79, 70, 229)` - насыщенный индиго

### Semantic Colors

```css
--color-success: #10b981;  /* Emerald green - успех, галочки */
--color-error: #ef4444;    /* Red - ошибки, удаление */
--color-warning: #f59e0b;  /* Amber - предупреждения, оранжевый */
```

### Neutral Colors

```css
--color-bg: #ffffff;              /* Белый фон */
--color-surface: #f9fafb;         /* Светло-серая поверхность (карточки) */
--color-border: #e5e7eb;          /* Границы */
--color-text: #111827;            /* Основной текст (почти чёрный) */
--color-text-secondary: #6b7280;  /* Вторичный текст */
--color-text-muted: #9ca3af;      /* Приглушённый текст */
```

---

## Typography

### Font Family

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
```

Системный стек шрифтов для нативного вида на каждой платформе.

### Font Sizes

```css
--font-size-sm: 0.875rem;   /* 14px - мелкий текст, подписи */
--font-size-base: 1rem;     /* 16px - основной текст */
--font-size-lg: 1.125rem;   /* 18px - заголовки секций */
--font-size-xl: 1.25rem;    /* 20px - крупные заголовки */
--font-size-2xl: 1.5rem;    /* 24px - главный заголовок */
```

### Line Height

```css
line-height: 1.5;  /* Стандартный для body */
line-height: 1.6;  /* Для textarea */
```

---

## Spacing System

Кратные `0.25rem` (4px base):

```css
--spacing-xs: 0.25rem;   /* 4px */
--spacing-sm: 0.5rem;    /* 8px */
--spacing-md: 1rem;      /* 16px */
--spacing-lg: 1.5rem;    /* 24px */
--spacing-xl: 2rem;      /* 32px */
--spacing-2xl: 3rem;     /* 48px */
```

---

## Border Radius

```css
--radius-sm: 0.25rem;    /* 4px - мелкие элементы (checkbox) */
--radius-md: 0.5rem;     /* 8px - кнопки, inputs, карточки */
--radius-lg: 0.75rem;    /* 12px - модалки, textarea */
--radius-full: 9999px;   /* Круглые элементы (dots, spinner) */
```

---

## Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
```

Тени мягкие, едва заметные - создают глубину без резкости.

---

## Transitions

```css
--transition-fast: 150ms ease;   /* Быстрые hover эффекты */
--transition-base: 200ms ease;   /* Стандартные анимации */
```

---

## Task Card Component

### Structure

```
┌─────────────────────────────────────────────────────────────┐
│ [☐] Task text here                    [◉◉◉◉] [✏️] [🗑️] │
└─────────────────────────────────────────────────────────────┘
     ↑          ↑                          ↑      ↑     ↑
  checkbox   text (flex:1)           color-picker  edit delete
```

### Base Card Styles

```css
.task-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;                            /* --spacing-sm */
  padding: 0.5rem 1rem;                   /* --spacing-sm --spacing-md */
  background-color: #f9fafb;              /* --color-surface */
  border: 1px solid #e5e7eb;              /* --color-border */
  border-radius: 0.5rem;                  /* --radius-md */
  transition: background-color 150ms ease, border-color 150ms ease;
}

.task-item:hover {
  border-color: #4f46e5;                  /* --color-primary */
}
```

### Completed Task State

```css
.task-item.task-completed {
  background-color: #ffffff;              /* --color-bg */
  opacity: 0.7;
}

.task-item.task-completed .task-text {
  text-decoration: line-through;
  color: #9ca3af;                         /* --color-text-muted */
}
```

### Task Color Variants

**Green (Success/Done):**
```css
.task-item.task-color-green {
  background-color: rgba(16, 185, 129, 0.1);   /* 10% opacity */
  border-color: rgba(16, 185, 129, 0.3);       /* 30% opacity */
}
.task-item.task-color-green:hover {
  border-color: #10b981;                       /* solid */
}
```

**Orange (Warning/Important):**
```css
.task-item.task-color-orange {
  background-color: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
}
.task-item.task-color-orange:hover {
  border-color: #f59e0b;
}
```

**Purple (Primary/Focus):**
```css
.task-item.task-color-purple {
  background-color: rgba(79, 70, 229, 0.1);
  border-color: rgba(79, 70, 229, 0.3);
}
.task-item.task-color-purple:hover {
  border-color: #4f46e5;
}
```

---

## Checkbox Component

### Custom Checkbox

```css
.task-checkbox-custom {
  width: 18px;
  height: 18px;
  border: 2px solid #e5e7eb;              /* --color-border */
  border-radius: 0.25rem;                 /* --radius-sm */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}

/* Hover state */
.task-checkbox:hover .task-checkbox-custom {
  border-color: #4f46e5;                  /* --color-primary */
}

/* Checked state */
.task-checkbox input:checked + .task-checkbox-custom {
  background-color: #10b981;              /* --color-success */
  border-color: #10b981;
}

/* Checkmark (CSS-only) */
.task-checkbox input:checked + .task-checkbox-custom::after {
  content: '';
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}
```

---

## Color Picker Dots

```css
.task-color-picker {
  display: flex;
  gap: 6px;
  opacity: 0;                             /* Скрыт по умолчанию */
  transition: opacity 150ms ease;
}

.task-item:hover .task-color-picker {
  opacity: 1;                             /* Показать при hover */
}

.task-color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;                     /* Круглые */
  border: none;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 150ms ease, transform 150ms ease;
  padding: 0;
}

.task-color-dot:hover {
  opacity: 1;
  transform: scale(1.2);
}

.task-color-dot.active {
  opacity: 1;
  box-shadow: 0 0 0 2px white, 0 0 0 3px currentColor;
}

/* Color variants */
.task-color-dot--none {
  background-color: #e5e7eb;
  border: 1px solid #9ca3af;
}

.task-color-dot--green {
  background-color: #10b981;
}

.task-color-dot--orange {
  background-color: #f59e0b;
}

.task-color-dot--purple {
  background-color: #4f46e5;
}
```

---

## Action Buttons

### Icon Button (Edit/Delete)

```css
.task-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0.25rem;                 /* --radius-sm */
  color: #9ca3af;                         /* --color-text-muted */
  cursor: pointer;
  transition: all 150ms ease;
}

.task-btn:hover {
  background-color: #e5e7eb;              /* --color-border */
  color: #111827;                         /* --color-text */
}

/* Delete button special hover */
.task-btn-delete:hover {
  background-color: #ef4444;              /* --color-error */
  color: white;
}
```

### Primary Button

```css
.btn-primary {
  background-color: #4f46e5;
  color: white;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 150ms ease, transform 150ms ease;
}

.btn-primary:hover {
  background-color: #4338ca;
  transform: translateY(-1px);            /* Subtle lift */
}

.btn-primary:active {
  background-color: #3730a3;
  transform: translateY(0);
}
```

### Success Button (Create Task)

```css
.btn-task {
  background-color: #10b981;
  color: white;
}

.btn-task:hover {
  background-color: #059669;
}
```

---

## Date Separator

Разделитель между группами задач по датам:

```css
.tasks-date-separator {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  margin-top: 0.5rem;
}

/* Линии слева и справа от даты */
.tasks-date-separator::before,
.tasks-date-separator::after {
  content: '';
  flex: 1;
  height: 1px;
  background-color: #e5e7eb;              /* --color-border */
}

.tasks-date-label {
  font-size: 0.875rem;                    /* --font-size-sm */
  font-weight: 500;
  color: #9ca3af;                         /* --color-text-muted */
  white-space: nowrap;
}
```

Visual:
```
────────────── Сегодня ──────────────
────────────── Вчера ────────────────
────────────── 15 декабря 2025 ──────
```

---

## Delete Countdown State

```css
.task-item.task-deleting {
  background-color: rgba(239, 68, 68, 0.1);   /* Red with 10% opacity */
  border-color: #ef4444;                       /* --color-error */
}

.task-delete-message {
  font-size: 0.875rem;
  color: #ef4444;
}

.task-delete-timer {
  font-weight: 600;
  font-size: 1.125rem;                    /* --font-size-lg */
}

.task-delete-cancel {
  background-color: #111827;              /* --color-text */
  color: white;
  padding: 0.25rem 1rem;
  font-size: 0.875rem;
  border-radius: 0.5rem;
}
```

---

## Input Focus State

Характерный синий glow при фокусе:

```css
input:focus,
textarea:focus {
  outline: none;
  border-color: #4f46e5;                  /* --color-primary */
  box-shadow: 0 0 0 3px rgb(79 70 229 / 0.1);  /* 10% opacity ring */
}
```

---

## Notification Component

```css
.notification {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  z-index: 1000;
  animation: slideUp 0.3s ease;
}

.notification--success { background-color: #10b981; color: white; }
.notification--error { background-color: #ef4444; color: white; }
.notification--info { background-color: #111827; color: white; }
```

---

## Layout

### Container

```css
#app {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem;
  min-height: 100vh;
}
```

### Task List

```css
.tasks-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;                           /* --spacing-xs */
}
```

---

## Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 480px) {
  /* Всегда показывать actions и color picker */
  .task-actions,
  .task-color-picker {
    opacity: 1;
  }
}

/* Tablet */
@media (min-width: 481px) and (max-width: 768px) { }

/* Desktop */
@media (min-width: 769px) { }
```

---

## Key Design Principles

1. **Soft colors** - используй rgba() с низкой opacity для цветных фонов
2. **Subtle borders** - границы тонкие (1px), светлые по умолчанию, яркие при hover
3. **Smooth transitions** - все интерактивные элементы с 150ms ease
4. **Hidden until hover** - actions и color picker скрыты, появляются при наведении
5. **Consistent spacing** - кратные 4px (0.25rem base)
6. **System fonts** - нативные шрифты для каждой платформы
7. **Focus rings** - явный, но мягкий индикатор фокуса (shadow вместо outline)

---

## Color Hex Reference

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Primary | `#4f46e5` | `79, 70, 229` | Акценты, кнопки, ссылки |
| Primary Hover | `#4338ca` | `67, 56, 202` | Hover state |
| Success | `#10b981` | `16, 185, 129` | Галочки, зелёные карточки |
| Warning | `#f59e0b` | `245, 158, 11` | Оранжевые карточки |
| Error | `#ef4444` | `239, 68, 68` | Удаление, ошибки |
| Background | `#ffffff` | `255, 255, 255` | Основной фон |
| Surface | `#f9fafb` | `249, 250, 251` | Фон карточек |
| Border | `#e5e7eb` | `229, 231, 235` | Границы |
| Text | `#111827` | `17, 24, 39` | Основной текст |
| Text Secondary | `#6b7280` | `107, 114, 128` | Вторичный текст |
| Text Muted | `#9ca3af` | `156, 163, 175` | Приглушённый текст |
