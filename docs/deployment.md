[← Конфигурация](configuration.md) · [Back to README](../README.md) · [Тестирование →](testing.md)

# Развёртывание

Сборка для продакшена и Docker-инфраструктура G2UI.

## Web (статика)

```bash
npm run build:web
```

Артефакты: `apps/web/dist/`. Раздавайте через любой static host; `VITE_API_URL` задаётся на
этапе сборки.

## API (Docker, продакшен)

```bash
# В .env укажите внешнюю PostgreSQL
docker compose -f docker-compose.prod.yml up -d --build
```

Продакшен-compose не поднимает БД — нужен готовый `DATABASE_URL`.

## Локальный Docker-стек

- `npm run dev:docker` — API + PostgreSQL в Docker (режим A).
- `npm run dev:docker:full` — API + web + PostgreSQL (режим B).
- `npm run dev:docker:build` — сборка образа full-профиля.
- `npm run down` — остановка Docker-стека.

## Health-проверка

API публикует `/healthz` (и `/api/v1/health`), используется для проверки готовности контейнера.

## См. также

- [Конфигурация](configuration.md) — переменные окружения
- [Быстрый старт](getting-started.md) — запуск в разработке
- [Тестирование](testing.md) — запуск тестов