# G2UI

> Визуальный редактор UI для встраиваемых устройств с маленькими TFT/OLED-дисплеями (ESP-IDF, ST7735 и аналоги).

G2UI позволяет проектировать экраны в браузере, хранить проекты в облаке (или локально) и
экспортировать их в JSON для прошивки. Рантайм на устройстве парсит этот JSON напрямую — без
отдельного шага генерации C-кода.

## Quick Start

```bash
git clone <repo-url>
cd g2ui
cp .env.example .env
npm install
npm --prefix apps/web install

# Терминал 1 — API + PostgreSQL
npm run dev:docker

# Терминал 2 — web
npm run dev:web
```

Web: http://localhost:5173. Подробнее — [Быстрый старт](docs/getting-started.md).

## Key Features

- **Библиотека проектов** — создание, переименование, удаление и предпросмотр карточек проектов.
- **Визуальный редактор** — дерево виджетов, холст с линейками и выделением, панель свойств.
- **Виджеты** — панели, метки, кнопки, иконки, bitmap-текст; абсолютная и flex-вёрстка (column/row).
- **Пресеты дисплеев** — 160×128, 128×128, 240×240 и другие типовые разрешения.
- **Undo/redo** — история изменений в редакторе.
- **Экспорт** — копирование или скачивание `*.project.json` для встраивания в прошивку через `EMBED_FILES`.
- **Синхронизация** — опциональный backend API с PostgreSQL; без API проекты сохраняются в `localStorage`.

## Example

Проект редактируется в браузере и экспортируется в единый JSON-файл, который компонент `g2ui`
на устройстве читает напрямую — без дополнительной генерации C-кода:

```bash
# Экспорт из панели Export редактора → *.project.json
# Подключение в ESP-IDF-проекте через EMBED_FILES
```

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/getting-started.md) | Установка, режимы запуска, миграции БД |
| [Architecture](docs/architecture.md) | Структура проекта и паттерны |
| [Configuration](docs/configuration.md) | Переменные окружения |
| [Deployment](docs/deployment.md) | Docker и продакшен-развёртывание |
| [Testing](docs/testing.md) | Запуск тестов |

## Полезные команды

| Команда | Описание |
|---------|----------|
| `npm run dev:web` | Dev-сервер web |
| `npm run dev:docker` | API + PostgreSQL в Docker |
| `npm run dev:docker:full` | API + web + PostgreSQL в Docker |
| `npm run build:web` | Production-сборка web |
| `npm run test:web` | Unit/feature-тесты (Vitest) |
| `npm run test:e2e` | E2E-тесты (Playwright) |
| `npm run gen:types` | Сгенерировать TS-типы из OpenAPI API |

## License

MIT