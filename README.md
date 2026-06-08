# G2UI

Визуальный редактор UI для встраиваемых устройств с маленькими TFT/OLED-дисплеями (ESP-IDF, ST7735 и аналоги).

G2UI позволяет проектировать экраны в браузере, хранить проекты в облаке (или локально) и экспортировать их в JSON для прошивки. Рантайм на устройстве парсит этот JSON напрямую — без отдельного шага генерации C-кода.

## Что умеет приложение

- **Библиотека проектов** — создание, переименование, удаление и предпросмотр карточек проектов.
- **Визуальный редактор** — дерево виджетов, холст с линейками и выделением, панель свойств.
- **Виджеты** — панели, метки, кнопки, иконки, bitmap-текст; абсолютная и flex-вёрстка (column/row).
- **Пресеты дисплеев** — 160×128, 128×128, 240×240 и другие типовые разрешения.
- **Undo/redo** — история изменений в редакторе.
- **Экспорт** — копирование или скачивание `*.project.json` для встраивания в прошивку через `EMBED_FILES`.
- **Синхронизация** — опциональный backend API с PostgreSQL; без API проекты сохраняются в `localStorage`.

Редактор работает с каноническим IR (`UiProject → ScreenNode → WidgetNode`). Отдельной «модели редактора» нет: store — прямое представление дерева проекта.

## Структура репозитория

```text
g2ui/
├── docker-compose.yml       Локальный стек: PostgreSQL + API (+ web в профиле full)
├── docker-compose.prod.yml  Продакшен API (внешняя PostgreSQL)
├── apps/
│   ├── web/                 Vite + React + TypeScript (редактор)
│   └── api/                 FastAPI + SQLAlchemy (хранение проектов)
└── package.json             Корневые npm-скрипты
```


## Быстрый старт

```bash
git clone <repo-url>
cd g2ui
cp .env.example .env
npm install
npm --prefix apps/web install
```

### Режим A — быстрая разработка (рекомендуется на macOS)

API и PostgreSQL в Docker, web нативно (быстрый HMR).

```bash
# Терминал 1 — API на http://localhost:58008, PostgreSQL на localhost:55432
npm run dev:docker

# Терминал 2 — web на http://localhost:5173
npm run dev:web
```

В `.env` для этого режима: `VITE_API_URL=http://localhost:58008`.

### Режим B — всё в Docker

API, web и PostgreSQL в контейнерах. Удобно для онбординга или изолированной среды.

```bash
npm run dev:docker:full
```

- Web: http://localhost:58009
- API: http://localhost:58008 (Swagger: `/docs`)

> На macOS file-watching через Docker даёт заметную задержку HMR. Для комфортной разработки используйте режим A или [OrbStack](https://orbstack.dev/).

### Остановка

```bash
npm run down
```

## Использование

1. Откройте http://localhost:5173 (режим A) или http://localhost:58009 (режим B).
2. В библиотеке создайте проект: выберите разрешение дисплея, ориентацию и шаблон (blank или hello).
3. В редакторе соберите экран: добавляйте виджеты в дереве, настраивайте свойства, перемещайте элементы на холсте.
4. Экспортируйте JSON через панель Export.
5. Положите файл в ESP-IDF-проект и подключите через `EMBED_FILES`. Компонент `g2ui` на устройстве разберёт JSON без регенерации C.

Без настроенного API (`VITE_API_URL`) проекты живут только в браузере (`localStorage`). С API — автосохранение на сервер.

## Сборка для продакшена

### Web (статика)

```bash
npm run build:web
```

Артефакты: `apps/web/dist/`. Раздавайте через любой static host; `VITE_API_URL` задаётся на этапе сборки.

### API (Docker)

```bash
# В .env укажите внешнюю PostgreSQL
docker compose -f docker-compose.prod.yml up -d --build
```

Продакшен-compose не поднимает БД — нужен готовый `DATABASE_URL`.

## Полезные команды

| Команда | Описание |
|---------|----------|
| `npm run dev:web` | Dev-сервер web |
| `npm run dev:docker` | API + PostgreSQL в Docker |
| `npm run dev:docker:full` | API + web + PostgreSQL в Docker |
| `npm run build:web` | Production-сборка web |
| `npm run test:web` | Unit/feature-тесты (Vitest) |
| `npm run test:e2e` | E2E-тесты (Playwright) |
| `npm run down` | Остановить Docker-стек |
| `npm run gen:types` | Сгенерировать TS-типы из OpenAPI API |

Первый запуск Playwright (Chromium):

```bash
npm --prefix apps/web run test:e2e:install
```

### API вне Docker

```bash
cd apps/api
uv sync
uv run uvicorn g2ui_api.main:app --reload --host 0.0.0.0 --port 8000
uv run pytest
```

### Миграции БД

```bash
cd apps/api
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
```

## Стек

| Слой | Технологии |
|------|------------|
| Frontend | React 18, Vite, TypeScript, Zustand, Vitest, Playwright |
| Backend | FastAPI, SQLAlchemy 2.0 async, Alembic |
| Database | PostgreSQL 17 |
| Deploy | Docker, Dokploy |