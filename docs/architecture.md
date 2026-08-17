[← Быстрый старт](getting-started.md) · [Back to README](../README.md) · [Конфигурация →](configuration.md)

# Архитектура

Структура репозитория, технологический стек и архитектурные паттерны G2UI.

## Технологический стек

| Слой | Технологии |
|------|------------|
| Frontend | React 18, Vite, TypeScript, MUI, Emotion, Zustand |
| Backend | FastAPI, SQLAlchemy 2.0 async, Alembic, Pydantic v2 |
| Database | PostgreSQL 17 |
| Тестирование | Vitest (web), pytest (api), Playwright (e2e) |
| Инструменты | Ruff, mypy (api), tsc (web) |
| Деплой | Docker, docker-compose, Dokploy |

## Структура репозитория

```text
g2ui/
├── docker-compose.yml       Локальный стек: PostgreSQL + API (+ web в профиле full)
├── docker-compose.prod.yml  Продакшен API (внешняя PostgreSQL)
├── apps/
│   ├── web/                 Vite + React + TypeScript (редактор)
│   │   ├── src/
│   │   │   ├── app/         App.tsx, глобальные стили (reset.css, tokens.css)
│   │   │   ├── entities/    Доменные сущности: ui-project, font, icon, session
│   │   │   ├── pages/       Страницы: auth, editor, library
│   │   │   ├── shared/      Общее: api, assets, config, lib, ui
│   │   │   └── widgets/     Переиспользуемые виджеты
│   │   ├── e2e/             Playwright-тесты
│   │   └── tests/           Vitest-тесты
│   └── api/                 FastAPI + SQLAlchemy async
│       ├── alembic/         Миграции БД
│       ├── src/g2ui_api/    main.py, routers, schemas, models, auth, db
│       └── tests/           pytest-тесты
└── package.json             Корневые npm-скрипты
```

## Архитектурный паттерн

Проект следует паттерну **Structured Modules** (см. `.ai-factory/ARCHITECTURE.md`):
- **Backend:** каждое API-приложение организовано в слои `Controllers → Services → Repositories`
  (FastAPI: `routers` → `services` → `models/repositories`), с богатыми доменными моделями и
  инверсией зависимостей.
- **Frontend:** feature-sliced design (FSD): `app`, `entities`, `widgets`, `pages`, `shared`.

## Канонический IR

Редактор работает с каноническим IR (`UiProject → ScreenNode → WidgetNode`). Отдельной «модели
редактора» нет: store (Zustand) — прямое представление дерева проекта. Эта модель разделяется
редактором и рантаймом на устройстве.

Метаданные редактора (какой шаблон выбран, является ли карточка шаблоном, `sourceTemplateId`)
живут на карточке проекта и в `canvas.settings`, а не в IR. Создание из пользовательского
шаблона — snapshot-copy: клон дерева + resize под выбранный дисплей, без live-связи с источником.

## Синхронизация

- Без API (`VITE_API_URL` не задан) — проекты хранятся в `localStorage`.
- С API — автосохранение проектов в PostgreSQL через backend.

## Ключевые точки входа

| Файл | Назначение |
|------|------------|
| `apps/web/src/main.tsx` | Точка входа frontend |
| `apps/web/src/app/App.tsx` | Корневой React-компонент |
| `apps/web/src/entities/ui-project/index.ts` | Каноническая модель проекта (UiProject) |
| `apps/api/src/g2ui_api/main.py` | Точка входа FastAPI |
| `apps/api/src/g2ui_api/settings.py` | Конфигурация API |
| `apps/api/src/g2ui_api/db.py` | SQLAlchemy async engine |

## См. также

- [Быстрый старт](getting-started.md) — установка и запуск
- [Конфигурация](configuration.md) — переменные окружения
- [Развёртывание](deployment.md) — Docker и продакшен