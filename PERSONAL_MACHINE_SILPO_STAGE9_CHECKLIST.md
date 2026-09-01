# Silpo Stage 9: checklist для личного компьютера

Этот файл описывает полный ручной проход deployed Silpo MCP integration. Локальный Node.js, Vercel CLI, Turso CLI и перенос скриншотов не нужны.

Production page:

```text
https://horeca-nine-alpha.vercel.app/debug/mcp
```

## Текущее подтверждённое состояние

На 1 сентября 2026 года уже подтверждено через sanitized server trace:

- OAuth работает;
- `tools/list` возвращает 40 tools;
- `silpo_get_my_shopping_cart` выполняется успешно;
- активной корзины пока нет;
- ни одна MCP mutation не выполнялась.

## Что нужно пройти

Обязательные сценарии:

- [x] A. OAuth и загрузка 40 tools.
- [x] B. Read при отсутствии активной корзины: `cart_creation_required`.
- [ ] C. Ручное создание активной корзины в официальном интерфейсе Silpo.
- [ ] D. Полный Stage 9 read sequence с корзиной, доступным слотом и поиском продуктов.
- [ ] E. Финальный sanitized trace и короткий текстовый отчёт.

Условные сценарии выполняются только если соответствующая ошибка появилась сама:

- [ ] F. Недоступный timeslot.
- [ ] G. Потерянная OAuth session, HTTP 401.
- [ ] H. Неизвестная форма live response, HTTP 422.
- [ ] I. Ошибка Silpo MCP или deployment, HTTP 502.

Не нужно искусственно вызывать F-I.

## Правила безопасности

1. Используй личный компьютер и один browser profile на протяжении всего прохода.
2. Всегда открывай production alias выше. Не переходи на URL отдельного Vercel deployment.
3. Входи в Silpo под тем же аккаунтом, в котором создаёшь корзину.
4. Не отправляй в чат телефон, пароль, OTP, cookies, token, адрес, checkout URL или raw JSON корзины.
5. Не оформляй заказ и не переходи к оплате.
6. Не запускай вручную tools, названия которых создают, обновляют, очищают или удаляют данные.
7. Кнопка **Run Stage 9 reads** выполняет только чтение.

## A. Проверка OAuth

Этот сценарий уже пройден, но повтори его, если browser session потеряна.

1. Открой production page.
2. Нажми **Connect Silpo**.
3. Заверши вход и OTP в браузере.
4. Дождись возврата на тот же адрес `/debug/mcp`.
5. Проверь зелёную плашку `OAuth completed`.

Успех:

```text
OAuth completed
```

Если появилась ошибка, перейди к G, H или I ниже по HTTP status.

## B. Проверка live tools

1. Нажми **Load live tools**.
2. Дождись списка tools.
3. Проверь строку над списком.

Успех:

```text
40 live tools returned
```

Не раскрывай schemas и не запускай отдельные tool runners, если это не попросит агент.

## C. Создание активной корзины

Корзину нужно создать вручную в официальном потребительском интерфейсе Silpo. Это осознанное действие пользователя, а не скрытая MCP mutation.

1. Не закрывая `/debug/mcp`, открой Silpo в соседней вкладке или в официальном приложении.
2. Убедись, что используется тот же Silpo account.
3. Выбери доступный способ получения заказа:
   - доставка по адресу; или
   - самовывоз из магазина.
4. Если интерфейс просит адрес, магазин или branch, выбери реальные данные только внутри Silpo. Не присылай их агенту.
5. Добавь в корзину ровно один недорогой обычный продукт. Конкретный товар не важен.
6. Открой корзину и выбери ближайший доступный timeslot, если Silpo предлагает такой выбор.
7. Проверь внутри Silpo:
   - корзина существует;
   - один продукт отображается в корзине;
   - способ получения выбран;
   - address или pickup branch выбран;
   - доступный timeslot выбран, если это требуется интерфейсом.
8. Не нажимай оформление заказа, подтверждение покупки или оплату.
9. Оставь корзину активной и вернись на `/debug/mcp` в том же browser profile.

Названия кнопок в Silpo могут отличаться. Критерий готовности: в аккаунте видна активная, но не оформленная корзина с одним продуктом и доступным способом получения.

## D. Полный Stage 9 read sequence

1. На `/debug/mcp` сначала нажми **Load live tools**.
2. Убедись, что всё ещё показано `40 live tools returned`.
3. Нажми **Run Stage 9 reads** один раз.
4. Дождись синей плашки **Stage 9 read-only report**.
5. Не нажимай кнопку повторно, пока первый вызов не завершился.

Ожидаемый успешный report сообщает:

```text
Cart context read
<delivery type> slot validated
searched яйця, помідори, лосось
<N> products returned across 3 queries
No cart mutation was executed
```

Число найденных продуктов может отличаться. Обязательные признаки успеха:

- report имеет status `complete`;
- проверен delivery slot;
- выполнены три product queries;
- последняя строка говорит `No cart mutation was executed`.

После успешного report нажми **Refresh trace** один раз.

Ожидаемая последовательность новых trace entries:

```text
silpo_get_my_shopping_cart
silpo_get_shopping_cart_by_id
silpo_get_time_slots
silpo_find_products_batch
```

Все четыре entries должны иметь зелёную точку или status `completed`.

## E. Финальный отчёт агенту

Скриншот не нужен. Пришли этот заполненный текст:

```text
Stage 9 personal run complete
OAuth completed: yes/no
Live tools: <number>
Report status: complete/cart_creation_required/timeslot_update_required/error
Delivery type: <type shown in report, or not shown>
Product query count: <number shown, or not shown>
Returned product count: <number shown, or not shown>
Trace operations completed: <comma-separated operation names>
HTTP status: <only if an error occurred>
Error type: <only the short error name, without raw response>
```

Не переписывай product names, address, branch ID, shopping cart ID или другие значения из raw response.

После сообщения агент запустит GitHub workflow **Inspect Silpo MCP trace** и проверит server-side sequence с корпоративного компьютера.

## F. Если показано `timeslot_update_required`

Это штатная безопасная остановка. Product search и mutations не выполнялись.

1. Запиши только delivery type из синей плашки.
2. Вернись в официальную корзину Silpo.
3. Выбери другой доступный timeslot вручную.
4. Вернись на `/debug/mcp`.
5. Нажми **Run Stage 9 reads** ещё раз.
6. Если status повторился, остановись и пришли:

```text
Report status: timeslot_update_required
Delivery type: <type>
```

Не запускай `silpo_update_shopping_cart` через MCP вручную.

## G. Если появился HTTP 401

Причина: deployed app не нашёл OAuth tokens для текущей browser session.

1. Не очищай cookies между OAuth start и callback.
2. Убедись, что открыт production alias, а не deployment URL.
3. Нажми **Connect Silpo** и снова заверши OAuth в том же browser profile.
4. Нажми **Load live tools**.
5. После `40 live tools returned` повтори D.

Если 401 повторился, пришли только:

```text
HTTP status: 401
Step: Connect Silpo/Load live tools/Run Stage 9 reads
Production alias used: yes
Same browser profile used: yes
```

## H. Если появился HTTP 422

Причина: реальная форма ответа Silpo отличается от paths, которые сейчас понимает parser.

Ошибка уже должна содержать безопасную структурную диагностику. Пришли только:

```text
HTTP status: 422
phase: <value>
expectedPaths: <value>
observedKeys: <value>
observedShape: <value>
```

`observedShape` содержит paths и types, но не значения. Не присылай raw result из отдельного tool runner.

После этого остановись. Агент обновит parser и выполнит новый deployment.

## I. Если появился HTTP 502

1. Нажми **Refresh trace**.
2. Найди последнюю красную entry.
3. Пришли только:

```text
HTTP status: 502
Operation: <tool name>
Status: failed
Result summary: <sanitized summary shown in trace>
```

Не повторяй запрос больше двух раз подряд. Агент проверит GitHub trace workflow и deployment logs.

## После успешной проверки

1. Не оформляй тестовый заказ.
2. Тестовый продукт можно удалить вручную в официальном Silpo UI.
3. Не используй MCP write tools для очистки.
4. Browser tab можно закрыть после отправки финального отчёта.

## MCP writes, которые запрещено запускать вручную

```text
silpo_create_shopping_cart
silpo_add_or_update_cart_products
silpo_remove_cart_products
silpo_clear_shopping_cart
silpo_update_shopping_cart
silpo_add_or_update_favorite_products
silpo_add_or_update_certificates
```

Следующий write будет реализован отдельно как preview, явное human approval, одна mutation и обязательное перечитывание корзины.