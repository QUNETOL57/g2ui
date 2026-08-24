# AGENTS.md

> Файл структурной карты проекта. Помогает AI-агентам и разработчикам быстро ориентироваться в кодовой базе.

## Обзор проекта

G2UI — веб-приложение для проектирования пользовательских интерфейсов на встраиваемых
устройствах с TFT/OLED-дисплеями (ESP-IDF, ST7735). Редактор работает в браузере,
экспортирует проекты в JSON для прошивки на устройство.

## Технологический стек

- **Язык (Frontend):** TypeScript / React 18
- **Frontend:** Vite, MUI, Emotion, Zustand
- **Язык (Backend):** Python 3.14
- **Backend:** FastAPI, SQLAlchemy 2.0 async, Alembic, Pydantic v2
- **База данных:** PostgreSQL 17
- **Тестирование:** Vitest (web), pytest (api), Playwright (e2e)
- **Инструменты:** Ruff, mypy (api), tsc (web)
- **Деплой:** Docker, docker-compose, Dokploy

## Структура проекта

```
g2ui/
├── apps/
│   ├── web/                 # Vite + React + TypeScript (редактор)
│   │   ├── src/
│   │   │   ├── app/         # App.tsx, глобальные стили (reset.css, tokens.css)
│   │   │   ├── entities/    # Доменные сущности: ui-project, font, icon, session
│   │   │   ├── pages/       # Страницы: auth, editor, library
│   │   │   ├── shared/      # Общее: api, assets, config, lib, ui
│   │   │   └── widgets/     # Переиспользуемые виджеты
│   │   ├── e2e/             # Playwright-тесты
│   │   └── tests/           # Vitest-тесты
│   └── api/                 # FastAPI + SQLAlchemy async
│       ├── alembic/         # Миграции БД
│       ├── src/g2ui_api/    # main.py, routers, schemas, models, canvas_revisions, auth, db
│       └── tests/           # pytest-тесты
├── docker-compose.yml       # Локальный стек: PostgreSQL + API
├── docker-compose.prod.yml  # Продакшен API
├── .ai-factory/             # AI Factory конфигурация
│   ├── config.yaml          # Настройки AI Factory
│   ├── DESCRIPTION.md       # Описание проекта
│   ├── rules/               # Правила проекта
│   └── ...
├── .agents/skills/          # Установленные скиллы
│   ├── fastapi/             # FastAPI best practices
│   └── vercel-react-best-practices/  # React best practices
```

## Ключевые точки входа

| Файл | Назначение |
|------|------------|
| `apps/web/src/main.tsx` | Точка входа frontend-приложения |
| `apps/web/src/app/App.tsx` | Корневой компонент React |
| `apps/web/src/entities/ui-project/index.ts` | Каноническая модель проекта (UiProject) |
| `apps/api/src/g2ui_api/main.py` | Точка входа FastAPI-приложения |
| `apps/api/src/g2ui_api/settings.py` | Конфигурация API (Pydantic Settings) |
| `apps/api/src/g2ui_api/db.py` | Настройка SQLAlchemy async engine |
| `apps/api/src/g2ui_api/canvas_revisions/` | Structured Module: серверные ревизии canvas |
| `apps/api/alembic/` | Миграции базы данных |
| `docker-compose.yml` | Локальный стек разработки |
| `.env` | Переменные окружения |

## Документация

| Документ | Путь | Описание |
|----------|------|----------|
| README | `README.md` | Главная страница проекта (landing page) |
| Быстрый старт | `docs/getting-started.md` | Установка, режимы запуска, миграции БД |
| Архитектура | `docs/architecture.md` | Структура проекта и паттерны |
| API | `docs/api.md` | Эндпоинты, JWT, коды ошибок |
| Конфигурация | `docs/configuration.md` | Переменные окружения |
| Развёртывание | `docs/deployment.md` | Docker и продакшен-развёртывание |
| Тестирование | `docs/testing.md` | Запуск тестов |
| Описание проекта | `.ai-factory/DESCRIPTION.md` | Спецификация проекта |
| Архитектура (AI) | `.ai-factory/ARCHITECTURE.md` | Архитектурные гайдлайны |

## AI Context Files

| Файл | Назначение |
|------|------------|
| `AGENTS.md` | Структурная карта проекта (текущий файл) |
| `.ai-factory/DESCRIPTION.md` | Полное описание проекта, стека и требований |
| `.ai-factory/ARCHITECTURE.md` | Архитектурные решения и паттерны |
| `.ai-factory/config.yaml` | Настройки AI Factory |
| `.ai-factory/rules/base.md` | Базовые правила и конвенции проекта |
| `.ai-factory/skill-context/aif-best-practices/SKILL.md` | Project-level overrides для `/aif-best-practices` |
| `.cursor/rules/` | Cursor-правила: архитектура, frontend, backend, тесты |

## Правила для агентов

- Декомпозируйте shell-команды: не объединяйте `git checkout` и `git pull` в одну команду.
  - Неправильно: `git checkout main && git pull`
  - Правильно: сначала `git checkout main`, затем `git pull origin main`
- При работе с кодом соблюдайте конвенции из `.ai-factory/rules/base.md` и `.ai-factory/skill-context/aif-best-practices/SKILL.md`.
- Все AI Factory команды доступны через `/aif-*` слэш-команды.