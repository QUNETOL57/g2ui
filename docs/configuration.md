[← Архитектура](architecture.md) · [Back to README](../README.md) · [Развёртывание →](deployment.md)

# Конфигурация

Переменные окружения и файлы конфигурации G2UI.

## Файл `.env`

Скопируйте `.env.example` в `.env` в корне проекта и при необходимости измените значения.

## Переменные окружения

### База данных

| Переменная | Значение по умолчанию | Описание |
|------------|----------------------|----------|
| `POSTGRES_DB` | `g2ui` | Имя БД (контейнер) |
| `POSTGRES_USER` | `g2ui` | Пользователь БД (контейнер) |
| `POSTGRES_PASSWORD` | `g2ui` | Пароль БД (контейнер) |
| `POSTGRES_PORT` | `55432` | Публикуемый порт PostgreSQL |
| `LOCAL_DATABASE_URL` | `postgresql+asyncpg://g2ui:g2ui@db:5432/g2ui` | URL для API в контейнере |
| `DATABASE_URL` | задаётся в settings | URL для API вне Docker и продакшена |

`docker-compose.prod.yml` использует `DATABASE_URL` — в продакшене замените строку подключения
на внешнюю PostgreSQL.

### API

| Переменная | Значение по умолчанию | Описание |
|------------|----------------------|----------|
| `API_HOST` | `0.0.0.0` | Хост API |
| `API_PORT` | `8000` | Порт API (в Docker публикуется на 58008) |
| `API_CORS_ORIGINS` | `http://localhost:5173` | Разрешённые CORS-происхождения (через запятую) |
| `JWT_SECRET` | dev-значение | Секрет для JWT — **обязательно сменить в проде** |
| `JWT_ALGORITHM` | `HS256` | Алгоритм JWT |
| `ACCESS_TOKEN_TTL_MIN` | `1440` | Время жизни access-токена (минуты) |
| `MAX_CANVASES_PER_USER` | `30` | Лимит проектов на пользователя |

### Frontend

| Переменная | Значение по умолчанию | Описание |
|------------|----------------------|----------|
| `VITE_API_URL` | `http://localhost:58008` | URL backend API для web (задаётся на этапе сборки) |

## Значения Settings (Python)

Дефолты в `apps/api/src/g2ui_api/settings.py` (Pydantic Settings):

- `database_url`: `postgresql+asyncpg://postgres:postgres@localhost:5432/postgres`
- `api_host`: `0.0.0.0`, `api_port`: `8000`
- `api_cors_origins`: `http://localhost:5173`
- `jwt_secret`, `jwt_algorithm`, `access_token_ttl_min`, `max_canvases_per_user`

## См. также

- [Быстрый старт](getting-started.md) — установка и запуск
- [Развёртывание](deployment.md) — Docker и продакшен