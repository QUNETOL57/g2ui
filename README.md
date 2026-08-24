# G2UI

> Визуальный редактор UI для встраиваемых устройств с маленькими TFT/OLED-дисплеями (ESP-IDF, ST7735 и аналоги).

Проектируйте экраны в браузере, храните проекты в облаке или локально и экспортируйте JSON
для прошивки. Рантайм на устройстве читает этот JSON напрямую — без генерации C-кода.

## Быстрый старт

```bash
git clone https://github.com/QUNETOL57/g2ui.git
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

## Возможности

- **Библиотека проектов** — карточки, шаблоны Blank/Hello и пользовательские шаблоны (Project → Use as template).
- **Визуальный редактор** — дерево виджетов, холст с линейками и групповым выделением, панель свойств, undo/redo, Local History.
- **Виджеты** — панели, метки, кнопки, иконки, bitmap-текст; absolute и flex (column/row).
- **Пресеты дисплеев** — 160×128, 128×128, 240×240 и другие разрешения.
- **Экспорт** — `*.project.json` для прошивки через `EMBED_FILES`.
- **Синхронизация** — опциональный API + PostgreSQL; без API — `localStorage`.

## Пример

Редактор работает с каноническим IR (intermediate representation: `UiProject → ScreenNode → WidgetNode`). Тот же JSON уходит на устройство.

```json
{
  "schemaVersion": "0.1.0",
  "id": "hello",
  "name": "Hello G2UI",
  "display": { "width": 240, "height": 240, "colorFormat": "rgb565" },
  "initialScreenId": "screen_main",
  "screens": [{ "id": "screen_main", "type": "screen", "children": [] }]
}
```

Экспорт — панель Export в редакторе. Подключение в ESP-IDF — `EMBED_FILES`.

---

## Документация

| Руководство | Описание |
|-------------|----------|
| [Быстрый старт](docs/getting-started.md) | Установка, режимы запуска, миграции БД |
| [Архитектура](docs/architecture.md) | Структура проекта и паттерны |
| [API](docs/api.md) | Эндпоинты, JWT, коды ошибок |
| [Конфигурация](docs/configuration.md) | Переменные окружения |
| [Развёртывание](docs/deployment.md) | Docker и продакшен |
| [Тестирование](docs/testing.md) | Vitest, pytest, Playwright |

## Полезные команды

| Команда | Описание |
|---------|----------|
| `npm run dev:web` | Dev-сервер web |
| `npm run dev:docker` | API + PostgreSQL в Docker |
| `npm run dev:docker:full` | API + web + PostgreSQL в Docker |
| `npm run build:web` | Production-сборка web |
| `npm run test:web` | Unit-тесты (Vitest) |
| `npm run test:e2e` | E2E (Playwright) |
| `npm run gen:types` | TS-типы из OpenAPI |

## Лицензия

MIT
