# Кико (キコ) — личный трекер вопросов первой линии

PWA для одного пользователя: мгновенный захват вопросов, статусы как в тикетнице,
настойчивые push-напоминания про открытые вопросы, PDF-отчёт «что сделано» за период.

**Архитектура:** фронт — статический сайт на **GitHub Pages** (бесплатно, без
покупки домена), база и API — **на твоём VPS** (Postgres + Node, docker-compose,
HTTPS через Caddy + бесплатный поддомен DuckDNS).

> ⚠️ **Приватность:** в тексте вопросов не храни пароли и персональные данные,
> которые нельзя выносить за периметр компании.

## Стек

React 18 + Vite + TypeScript + Tailwind · PWA (`vite-plugin-pwa`, injectManifest) ·
Node/Express + Postgres (`server/`) · Web Push (`web-push`, VAPID) · node-cron ·
`@react-pdf/renderer` · GitHub Pages + GitHub Actions

## Локальный запуск

```bash
# 1. Postgres в Docker
docker run -d --name kiko-db -p 5432:5432 \
  -e POSTGRES_USER=kiko -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=kiko \
  postgres:16-alpine

# 2. API-сервер
cd server && npm install
DATABASE_URL=postgres://kiko:dev@localhost:5432/kiko \
  ACCESS_PASSWORD=dev JWT_SECRET=dev-secret npm run dev

# 3. Фронт (в другом терминале, из корня)
npm install
echo 'VITE_API_URL=http://localhost:3000' > .env.local
npm run dev
```

## Развёртывание с нуля

### 1. Бесплатный домен для API (VPS)

Сайту на GitHub Pages (HTTPS) нельзя ходить в API по голому `http://ip`, поэтому
API нужен HTTPS. Бесплатно:

1. Зарегистрируйся на [duckdns.org](https://www.duckdns.org) (вход через GitHub).
2. Создай поддомен (например `kiko-api`) и укажи IP своего VPS.
3. Готово — сертификат Let's Encrypt Caddy получит сам при первом запуске.

### 2. API + база на VPS

```bash
# на VPS (нужен Docker + docker compose)
git clone <твой-репозиторий> && cd <репозиторий>/server
cp .env.example .env
npx web-push generate-vapid-keys   # ключи → в .env
nano .env                          # заполни все CHANGE_ME и домен
docker compose up -d --build
curl https://kiko-api.duckdns.org/api/health   # → {"ok":true}
```

В `.env` обязательно: `DB_PASSWORD`, `ACCESS_PASSWORD` (пароль входа в приложение),
`JWT_SECRET` (`openssl rand -hex 32`), оба VAPID-ключа, `APP_URL` и `CORS_ORIGIN`
(адрес твоего GitHub Pages), `DOMAIN` (поддомен DuckDNS). Порты 80 и 443 на VPS
должны быть открыты. **Ни один секрет не коммитится — `.env` в `.gitignore`.**

### 3. Фронт на GitHub Pages

1. Запушь репозиторий на GitHub (`main`).
2. Settings → **Pages** → Source: **GitHub Actions**.
3. Settings → Secrets and variables → Actions → вкладка **Variables**:
   - `VITE_API_URL` = `https://kiko-api.duckdns.org`
   - `VITE_VAPID_PUBLIC_KEY` = публичный VAPID-ключ из шага 2
4. Пуш в `main` — экшен соберёт и выложит сайт на
   `https://твой-логин.github.io/имя-репозитория/`.

### 4. Установка на iPhone

1. Открой сайт в Safari → «Поделиться» → «На экран "Домой"».
2. Запусти Кико с домашнего экрана (пуши на iOS работают **только** из
   установленной PWA, iOS ≥ 16.4).
3. Войди по паролю (`ACCESS_PASSWORD`), нажми «Включить напоминания».
4. Настройки → «Тестовый пуш» — проверь доставку на заблокированный экран.

## Структура

```
src/                   фронт (GitHub Pages)
  screens/             Сегодня · Архив · Отчёт · Настройки · Карточка · Вход · Онбординг
  components/          карточка со свайпами, быстрый ввод, шторки, таб-бар
  lib/                 http-клиент, api, правила напоминаний, push, настройки
  pdf/                 PDF-отчёт (@react-pdf/renderer, PT Sans для кириллицы)
  sw.ts                кастомный service worker (precache + push + notificationclick)
server/                API + база (твой VPS)
  src/                 Express: auth (пароль+JWT), CRUD, отчёт, пуши, node-cron
  schema.sql           схема Postgres (накатывается сама при первом старте)
  docker-compose.yml   postgres + api + caddy (автоматический HTTPS)
.github/workflows/     деплой фронта на GitHub Pages
```

## Как это работает

- **Захват за 5 секунд:** «+» → текст → «Сохранить». Приоритет по умолчанию
  «Обычно», автор парсится эвристикой из текста (всё до первого тире/запятой).
- **Напоминания:** node-cron на сервере каждые 15 минут шлёт Web Push по
  просроченным `remind_at` и сдвигает их на следующий интервал. Ночью и в
  выходные пуши не уходят — переносятся на рабочее утро. Рабочее окно
  настраивается в приложении и хранится на сервере.
- **Эскалация:** после 3 откладываний интервал сокращается вдвое, в пуше
  появляется «⚠️ Уже N раз откладывал».
- **Утренний дайджест** в 09:15 будних: «Открыто: 4 · Срочных: 1 · Ждёшь: 2».
- **Отчёт:** статистика за период + PDF (кириллица через PT Sans), шаринг
  через `navigator.share` — на iOS сразу в Telegram/почту.
- **Вход:** один пароль (`ACCESS_PASSWORD` на сервере) → JWT на 180 дней.
  После 5 неверных попыток — блокировка на 15 минут.
