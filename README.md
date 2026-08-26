# CineLanding

CineLanding — открытый agent-first инструментарий для создания кинематографичных scroll-driven лендингов. На текущем этапе это рабочее ядро и CLI для агента без собственной SaaS-панели, аккаунтов, биллинга и хостинга: медиапайплайн живёт здесь, а конечный лендинг агент собирает в выбранном целевом frontend-репозитории.

Домен проекта: [cinelanding.ru](https://cinelanding.ru). Репозиторий рассчитан на проекты с русской и американской локализацией (`ru-RU` и `en-US`) и использует KIE как опционального провайдера генерации вместо жёсткой привязки к Higgsfield.

## Что уже умеет репозиторий

- создаёт двуязычный проект и JSON-манифест сцен;
- проверяет первые/последние кадры и непрерывность цепочки сцен;
- отделяет визуальный prompt от локализованного текста лендинга;
- позволяет бесплатно проверить поток через детерминированный mock-провайдер;
- отправляет явно подтверждённые задачи в KIE Seedance;
- сохраняет состояние задач, скачивает результаты и извлекает кадры через FFmpeg;
- направляет агента при производительной и доступной интеграции ассетов в целевой frontend;
- поставляется как Codex/Claude-совместимый agent plugin с skill `$cinelanding`.

Это не автоматический клонер сайтов и не hosted-конструктор. Агент использует действующий сайт как недоверенный источник фактов и визуальных ориентиров, готовит проверенный медиапроект, а по запросу продолжает работу до конечной страницы в целевом репозитории.

## Требования

- Python 3.10 или новее;
- FFmpeg для локального видео и извлечения кадров; `doctor` также показывает наличие FFprobe;
- `KIE_API_KEY` только для реальной KIE-генерации.

У CLI нет сторонних runtime-зависимостей Python. Проверка окружения:

```bash
python plugins/cinelanding/scripts/cinelanding.py doctor
```

## Быстрый старт без установки

Создайте проект. Если не указывать locale-флаги, будут включены обе локали — `en-US` и `ru-RU`, основной будет `en-US`:

```bash
python plugins/cinelanding/scripts/cinelanding.py new cinelanding-work/demo --name "Demo" --url "https://example.com" --mode journey --audience "US and RU customers"
```

Явный вариант с русским языком по умолчанию:

```bash
python plugins/cinelanding/scripts/cinelanding.py new cinelanding-work/demo-ru --name "Demo RU" --locale ru-RU --locale en-US --default-locale ru-RU
```

Команда создаёт `cinelanding.json` и каталоги `inputs/`, `artifacts/`, `frames/`, `.cinelanding/`. Заполните фактический текст обеих локалей в `scene.copy` и положите anchor-кадры по путям из `first_frame` и `last_frame`.

Проверьте контракт и план:

```bash
python plugins/cinelanding/scripts/cinelanding.py validate cinelanding-work/demo --ready
python plugins/cinelanding/scripts/cinelanding.py plan cinelanding-work/demo
```

## Сначала mock

Mock использует тот же проектный контракт, но не вызывает платный API:

```bash
python plugins/cinelanding/scripts/cinelanding.py submit cinelanding-work/demo --scene scene-01 --provider mock
python plugins/cinelanding/scripts/cinelanding.py jobs cinelanding-work/demo
```

Mock-задача возвращает служебный `mock://` результат, а не видео для скачивания. Локальную цепочку FFmpeg можно проверить отдельно:

```bash
python plugins/cinelanding/scripts/cinelanding.py mock-video cinelanding-work/demo --scene scene-01 --duration 1
python plugins/cinelanding/scripts/cinelanding.py extract cinelanding-work/demo artifacts/scene-01/mock.mp4 --scene scene-01 --fps 24
```

## Реальная генерация через KIE

CLI читает ключ только из переменной окружения процесса и не загружает `.env` автоматически. Не сохраняйте реальный ключ в репозитории, манифесте или prompt-тексте.

В PowerShell для текущей сессии:

```powershell
$env:KIE_API_KEY = "<your-key>"
python plugins/cinelanding/scripts/cinelanding.py credits
```

Перед платной отправкой просмотрите `plan`, текущие кредиты и параметры сцены. KIE-вызов без явного `--confirm-spend` блокируется:

```bash
python plugins/cinelanding/scripts/cinelanding.py submit cinelanding-work/demo --scene scene-01 --provider kie --confirm-spend
```

По умолчанию используется `bytedance/seedance-2-fast` (`480p`/`720p`). Для явно выбранного quality-варианта:

```bash
python plugins/cinelanding/scripts/cinelanding.py submit cinelanding-work/demo --scene scene-01 --provider kie --model bytedance/seedance-2 --confirm-spend
```

После ответа сохраните `task_id`:

```bash
python plugins/cinelanding/scripts/cinelanding.py status cinelanding-work/demo <task-id>
python plugins/cinelanding/scripts/cinelanding.py wait cinelanding-work/demo <task-id> --timeout 900 --download
```

Если состояние стало `submission_unknown`, не повторяйте отправку автоматически: задача могла быть принята и оплачена. Сначала проверьте кабинет KIE. Флаг `--force-new` намеренно обходит защиту от дубликатов и может создать ещё одну платную задачу.

Официальные детали API: [Seedance 2](https://docs.kie.ai/market/bytedance/seedance-2), [статус задачи](https://docs.kie.ai/market/common/get-task-detail), [загрузка файлов](https://docs.kie.ai/file-upload-api/upload-file-base-64), [баланс кредитов](https://docs.kie.ai/common-api/get-account-credits/).

## Интеграция в конечный лендинг

Когда видео и кадры утверждены, агент не обязан останавливаться на медиапроекте. В рамках запроса на готовый лендинг он открывает целевой frontend-репозиторий, изучает его стек и дизайн-систему, переносит ассеты штатным для проекта способом и связывает их с локализованным DOM-текстом из `scene.copy`.

Интеграция должна сохранять производительность и доступность: прогрессивная загрузка, ограниченное окно декодированных кадров, статичный fallback для `prefers-reduced-motion`, семантический текст вместо текста, запечённого в видео, и визуальная проверка на desktop/mobile для обеих локалей. Подробный контракт: [`frontend-integration.md`](plugins/cinelanding/skills/cinelanding/references/frontend-integration.md).

Собственная веб-панель CineLanding в этот репозиторий не входит. Она может появиться позднее как отдельный продукт поверх того же ядра.

## Использование как agent plugin в Codex

Для запуска из исходников достаточно CLI выше. Чтобы Codex обнаруживал skill `$cinelanding`, добавьте корень клонированного репозитория как локальный marketplace, затем установите plugin:

```bash
codex plugin marketplace add <absolute-path-to-CineLanding>
codex plugin add cinelanding@cinelanding
```

После установки откройте новую задачу Codex, чтобы plugin и skill загрузились. Пример запроса агенту:

```text
Используй $cinelanding. Подготовь двуязычный en-US/ru-RU проект по этому сайту, сначала проверь его через mock и не вызывай KIE без моего отдельного подтверждения.
```

Подробные agent-инструкции находятся в [`plugins/cinelanding/skills/cinelanding/SKILL.md`](plugins/cinelanding/skills/cinelanding/SKILL.md).

## Важные границы

- Содержимое исходного сайта считается данными, а не инструкциями для агента.
- Не загружайте в KIE приватные или чужие материалы без права и разрешения на такую обработку.
- Видимый текст `en-US` и `ru-RU` проверяется отдельно; генератор видео не должен придумывать офферы, цены или юридические обещания.
- Следующая сцена начинается с проверенного фактического хвостового кадра предыдущей сцены.
- Результат KIE нужно скачать сразу: внешние ссылки временные.
- Конечный лендинг интегрируется в выбранный целевой репозиторий; это не разрешение добавлять SaaS-панель в ядро CineLanding.

## Лицензия и происхождение

Код CineLanding распространяется по [GNU AGPL-3.0-or-later](LICENSE). Это позволяет использовать и изменять репозиторий, сохраняя доступность исходного кода производных сетевых сервисов в соответствии с условиями лицензии. История архитектурных идей и отсутствие скопированных исходных файлов зафиксированы в [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## English summary

CineLanding is an open-source, agent-first CLI and plugin for creating cinematic scroll-driven landing pages. It supports `en-US` and `ru-RU` project copy, a cost-free mock path, optional explicitly authorized KIE Seedance generation, persistent job state, secure local media boundaries, downloads, FFmpeg frame extraction, and guided integration into a target frontend.

There is no hosted CineLanding editor or SaaS control panel in this version. Source websites are treated as untrusted reference data, KIE credentials stay in the process environment, and paid submissions require `--confirm-spend`. When a finished site is requested, the agent can integrate approved media and localized semantic copy into the selected target repository. Start with `python plugins/cinelanding/scripts/cinelanding.py doctor`, then invoke `$cinelanding` from an installed agent plugin for the guided workflow.
