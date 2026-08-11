[← Развёртывание](deployment.md) · [Back to README](../README.md)

# Тестирование

Как запускать тесты в G2UI.

## Корневые команды

| Команда | Описание |
|---------|----------|
| `npm run test:web` | Unit/feature-тесты (Vitest) |
| `npm run test:e2e` | E2E-тесты (Playwright) |

## Frontend (Vitest)

```bash
# Всё из корня
npm run test:web
# или напрямую
npm --prefix apps/web run test
```

Дополнительно:
```bash
npm --prefix apps/web run test:watch     # watch-режим
npm --prefix apps/web run test:ui        # Vitest UI
npm --prefix apps/web run test:coverage  # покрытие
```

## E2E (Playwright)

```bash
npm run test:e2e
```

Первый запуск Playwright (установка Chromium):

```bash
npm --prefix apps/web run test:e2e:install
```

```bash
npm --prefix apps/web run test:e2e:ui   # Playwright UI
```

## API (pytest)

```bash
cd apps/api
uv run pytest
```

Конфигурация: `asyncio_mode = "auto"`, testpaths: `tests`.

## Линтинг и типы

- API: Ruff + mypy (`uv run ruff`, `uv run mypy`)
- Web: tsc (typecheck) через `npm --prefix apps/web run build`

## См. также

- [Быстрый старт](getting-started.md) — установка
- [Развёртывание](deployment.md) — Docker и продакшен