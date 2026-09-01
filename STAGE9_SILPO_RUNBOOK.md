# Stage 9 Silpo MCP Runbook

Эта инструкция предназначена для проверки deployed-приложения с личного компьютера. WSL, локальный Node.js, Turso CLI и Vercel CLI не требуются.

Для пошагового прохода с активной корзиной, ожидаемыми результатами и готовым шаблоном отчёта используй [PERSONAL_MACHINE_SILPO_STAGE9_CHECKLIST.md](PERSONAL_MACHINE_SILPO_STAGE9_CHECKLIST.md).

## 1. Одноразовая настройка Vercel

В Vercel создай access token в **Account Settings → Tokens**. Затем в GitHub открой:

```text
MaximusFT/horeca → Settings → Secrets and variables → Actions
```

Добавь token как:

```text
VERCEL_TOKEN
```

Другие GitHub secrets уже настроены:

```text
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
SILPO_OAUTH_ENCRYPTION_KEY
```

Запусти:

```text
Actions → Sync Vercel environment → Run workflow
```

Ожидаемый результат: workflow зелёный. Он добавляет Turso secrets в Vercel Production/Preview и выполняет production deployment.

## 2. Авторизация Silpo

На личном компьютере открой deployed URL с маршрутом:

```text
/debug/mcp
```

Нажми **Connect Silpo** и заверши вход в браузере. Телефон, пароль, OTP, cookies, access token и refresh token не отправляй в чат и не сохраняй в screenshot.

После redirect обратно на `/debug/mcp` ожидается зелёный OAuth status. Нажми **Load live tools**.

Ожидаемый результат:

```text
40 live tools returned
```

Capture от 1 сентября уже находится в `silpo-tools-2026-09-01.json`. Новый сороковой tool — `silpo_create_shopping_cart`.

## 3. Автоматическая read-only проверка

Нажми **Run Stage 9 reads**. Приложение выполняет только allowlisted reads:

```text
silpo_get_my_shopping_cart
→ silpo_get_shopping_cart_by_id
→ silpo_get_time_slots
→ silpo_find_products_batch (яйця, помідори, лосось)
```

Никакой cart mutation эта кнопка не выполняет.

### Результат A: complete

Ожидаемый report:

```text
Cart context read
Delivery slot validated
Searched: яйця, помідори, лосось
3 query groups summarized
No cart mutation was executed
```

После этого Stage 9 read spike выполнен.

### Результат B: cart_creation_required

`silpo_get_my_shopping_cart` вернул `exists=false`. Workflow правильно остановился до write.

Следующая ветка требует:

```text
silpo_find_address
→ silpo_get_available_delivery_types
→ silpo_get_time_slots
→ human approval
→ silpo_create_shopping_cart
→ silpo_get_shopping_cart_by_id
```

Не вызывай `silpo_create_shopping_cart` вручную. Передай агенту статус `cart_creation_required`; он реализует отдельную preview/approval карточку.

### Результат C: timeslot_update_required

Текущий cart timeslot отсутствует среди доступных `slots[]` или `available=false`. Workflow правильно остановился до product search.

Нажми **Find available slots**. Если Silpo вернул варианты, выбери один в approval-карточке и нажми **Approve and update cart timeslot**. Приложение выполнит ровно один `silpo_update_shopping_cart`, немедленно перечитает корзину и подтвердит выбранный slot. Затем нажми **Continue Stage 9 reads**.

Если показано **No available delivery slots**, mutation не выполнялась. Для этого branch/delivery type Silpo не предложил безопасного варианта; остановись до отдельной preview/approval ветки смены способа доставки.

## 4. Ручная schema-driven диагностика

Каждый разрешённый read tool имеет блок **Read-only spike runner**. Аргументы вводятся JSON-объектом и проверяются по captured JSON Schema до MCP-вызова.

Начальный вызов не требует аргументов:

```json
{}
```

для:

```text
silpo_get_my_shopping_cart
```

Следующие аргументы бери только из предыдущего ответа. Не придумывай UUID, slug, branchId, deliveryType или timeslot.

## 5. Что видно в Chrome DevTools

Chrome Network показывает browser → Next.js requests:

```text
POST /api/silpo/oauth/start
GET  /api/silpo/oauth/callback
GET  /api/silpo/tools
POST /api/silpo/stage9/read
POST /api/silpo/tools/call
GET  /api/silpo/trace
```

Внутренние server → `mcp.silpo.ua` requests в Chrome не видны. Их показывает секция **Safe server-side MCP trace** на `/debug/mcp`.

Trace содержит только:

- operation name;
- argument-key names;
- completed/failed;
- duration;
- structural result summary.

Trace не содержит token, raw arguments, address, phone, profile или cart contents.

## 6. Проверка trace с корпоративного ноутбука

После кликов на личном компьютере сообщи агенту, что последовательность завершена. Агент запускает:

```text
Actions → Inspect Silpo MCP trace
```

или GitHub CLI workflow с тем же именем. Так server-side MCP sequence проверяется без открытия заблокированного Vercel runtime.

## 7. Диагностика ошибок

### OAuth start: 502

Проверить:

1. `Sync Vercel environment` завершился успешно.
2. В Vercel есть все три Turso env variables.
3. Deployment был выполнен после добавления env.
4. OAuth callback URL использует тот же deployed host.

### OAuth callback: invalid_callback

Причины:

- callback открыт в другом browser/profile;
- потеряна HttpOnly session cookie;
- OAuth начат на одном deployment host, callback пришёл на другой;
- callback повторно открыт после завершения.

Начни **Connect Silpo** заново в одном browser profile.

### Load live tools: 401

OAuth tokens отсутствуют для текущей session cookie. Повтори **Connect Silpo**.

### Stage 9 reads: 422

Live response не совпал с документированным path. Сообщи агенту только:

```text
phase
expectedPaths
observedKeys
observedShape
```

`observedShape` содержит только JSON paths и типы, без значений. Не отправляй raw response.

### Stage 9 reads: 502

Открой **Refresh trace** и передай агенту operation/status/result summary. Дополнительно запусти **Inspect Silpo MCP trace**.

### GitHub Turso smoke failed

Открой failed step **Run remote encrypted-storage smoke test**. Не копируй secret values. Сообщи только exception type и message.

## 8. Безопасный набор артефактов

Можно передавать агенту:

- screenshot status/report без персональных данных;
- число tools;
- tool names и input schemas;
- Stage 9 report;
- sanitized trace;
- parser diagnostic `phase/expectedPaths/observedKeys`;
- HTTP status и error type.

Нельзя передавать:

- OTP, пароль, телефон;
- access/refresh token;
- cookies;
- raw profile/address response;
- полный cart response;
- checkout links из личной корзины.

## 9. Write gate

До отдельной реализации и проверки запрещены:

```text
silpo_create_shopping_cart
silpo_add_or_update_cart_products
silpo_remove_cart_products
silpo_clear_shopping_cart
silpo_update_shopping_cart
silpo_add_or_update_favorite_products
silpo_add_or_update_certificates
```

Первый write в Stage 9 будет добавлять только один явно подтверждённый тестовый товар, после чего приложение обязательно перечитает корзину и проверит `validations[]`.
