[Back to README](../README.md) · [Architecture →](architecture.md)

# Быстрый старт

Установка, настройка окружения и первый запуск редактора G2UI.

## Предварительные требования

- **Node.js** 18+ и npm
- **Docker** и **Docker Compose** (для API и PostgreSQL)
- **Python 3.14** и [uv](https://docs.astral.sh/uv/) (для запуска API вне Docker)

## Установка

```bash
git clone <repo-url>
cd g2ui
cp .env.example .env
npm install
npm --prefix apps/web install
```

## Режим A — быстрая разработка (рекомендуется на macOS)

API и PostgreSQL в Docker, web нативно (быстрый HMR).

```bash
# Терминал 1 — API на http://localhost:58008, PostgreSQL на localhost:55432
npm run dev:docker

# Терминал 2 — web на http://localhost:5173
npm run dev:web
```

В `.env` для этого режима: `VITE_API_URL=http://localhost:58008`.

## Режим B — всё в Docker

API, web и PostgreSQL в контейнерах. Удобно для онбординга или изолированной среды.

```bash
npm run dev:docker:full
```

- Web: http://localhost:58009
- API: http://localhost:58008 (Swagger: `/docs`)

> На macOS file-watching через Docker даёт заметную задержку HMR. Для комфортной
> разработки используйте режим A или [OrbStack](https://orbstack.dev/).

## Использование

1. Откройте http://localhost:5173 (режим A) или http://localhost:58009 (режим B).
2. В библиотеке создайте проект: выберите разрешение дисплея, ориентацию и шаблон (blank или hello).
3. В редакторе соберите экран: добавляйте виджеты в дереве, настраивайте свойства, перемещайте элементы на холсте.
4. Экспортируйте JSON через панель Export.
5. Положите файл в ESP-IDF-проект и подключите через `EMBED_FILES`. Компонент `g2ui` на устройстве разберёт JSON без регенерации C.

Без настроенного API (`VITE_API_URL`) проекты живут только в браузере (`localStorage`). С API — автосохранение на сервер.

## API вне Docker

```bash
cd apps/api
uv sync
uv run uvicorn g2ui_api.main:app --reload --host 0.0.0.0 --port 8000
uv run pytest
```

## Миграции БД

```bash
cd apps/api
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
```

## См. также

- [Архитектура](architecture.md) — структура проекта и паттерны
- [Конфигурация](configuration.md) — переменные окружения
- [Тестирование](testing.md) — запуск тестов