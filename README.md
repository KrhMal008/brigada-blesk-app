# Бригада Блеск · мини-приложение Telegram

Калькулятор уборки внутри Telegram: помещение, услуга, площадь, дополнительные работы, итог на лету. Выбор клиента уходит в бота кнопкой «Выбрать дату», дальше дата, время и контакты в чате. «Бригада Блеск» вымышленная компания, это демо.

Страница статическая, без сервера и сборщиков: `index.html`, `styles.css`, `app.js`, `calc.js`, `catalog.json`. Хостинг GitHub Pages.

- `catalog.json` выгружается из конфига бота командой `uv run python -m scripts.export_webapp config/demo.yaml ../brigada-blesk-app/catalog.json` (из репозитория бота). Промокоды в каталог не попадают: страница публичная, скидку проверяет бот.
- Бот не доверяет итогу со страницы: он получает только выбор (`{"v": 1, "room", "service_id", "area_m2", "addons", "promo"}`) и считает цену сам.
- `calc.js` повторяет формулу бота. Проверка: `node --test test/calc.test.mjs`, примеры в `test/cases.json` посчитаны Python-формулой бота.

Открыть вне Telegram можно, но отправка в бота работает только из кнопки меню бота.

---

# Brigada Blesk · Telegram Mini App

A cleaning price calculator inside Telegram: room, service, area, extras, live total. The choice is sent to the bot with the “Pick a date” button; date, time and contacts continue in the chat. Brigada Blesk is a fictional company, this is a demo. Static page, no backend, hosted on GitHub Pages. The bot never trusts the page total: it receives only the selection and recalculates the price.
