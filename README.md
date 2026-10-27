# GARAGE Flashcards NEW

Исходный пользовательский интерфейс сохраняется. Все изменения меню выполняются через Pages CMS (`.pages.yml`) в `content/cards`, `content/sections`, `content/groups`, `content/tags`. После коммита GitHub Actions перестраивает `js/menu-data.js`.

Первоначально один раз запустите Actions → Import original GARAGE images → Run workflow. Это копирует 382 картинки из старого публичного репозитория **только в новый**. Для изменения данных используйте Pages CMS на app.pagescms.org, выбрав этот репозиторий.

Старые ссылки и пути картинок сохранены. GitHub Pages публикуется через Settings → Pages → Deploy from a branch (main / root).
