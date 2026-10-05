/**
 * Runtime Error Logger
 * Централизованный модуль логирования ошибок и событий runtime.
 * - Хранит кольцевой буфер записей (по умолчанию 200) в памяти.
 * - Дублирует ошибки в console.error.
 * - Опционально выводит всплывающее уведомление (toast) в DOM.
 * - Регистрирует обработчики window.onerror, unhandledrejection и
 *   resource load errors (capture-фаза), а также React-style error
 *   boundaries через logger.runGuarded().
 */

class Logger {
    constructor(options = {}) {
        this.maxEntries = options.maxEntries || 200;
        this.enabled = options.enabled !== false;
        this.showToasts = options.showToasts !== false;
        this.toastTimeoutMs = options.toastTimeoutMs || 4000;
        this.entries = [];
        this._handlersInstalled = false;
        this._toastContainer = null;
    }

    /**
     * Базовая запись.
     * @param {'info'|'warn'|'error'} level
     * @param {string} message
     * @param {object} meta - доп. данные (стек, источник, строка и т.д.)
     */
    log(level, message, meta = {}) {
        if (!this.enabled) return null;
        const entry = {
            level,
            message: String(message),
            timestamp: Date.now(),
            time: new Date().toISOString(),
            ...meta
        };
        this.entries.push(entry);
        if (this.entries.length > this.maxEntries) {
            this.entries.splice(0, this.entries.length - this.maxEntries);
        }
        const prefix = `[${entry.time}] [${level.toUpperCase()}]`;
        if (level === 'error') {
            console.error(prefix, message, meta.stack || meta.error || '');
        } else if (level === 'warn') {
            console.warn(prefix, message, meta.error || '');
        } else {
            console.log(prefix, message);
        }
        if (level === 'error' && this.showToasts) {
            this._showToast(message);
        }
        return entry;
    }

    info(message, meta)  { return this.log('info', message, meta); }
    warn(message, meta)  { return this.log('warn', message, meta); }

    /**
     * Логирует Error или произвольное значение как ошибку runtime.
     * @param {Error|*} error
     * @param {string} context - описание места/ситуации, например "render loop"
     */
    error(error, context = '') {
        const err = error instanceof Error ? error : new Error(String(error));
        return this.log('error', context ? `${context}: ${err.message}` : err.message, {
            stack: err.stack,
            name: err.name,
            error: err
        });
    }

    /**
     * Выполняет fn, перехватывая исключения; при ошибке логирует её
     * и возвращает fallback вместо проброса наружу.
     */
    runGuarded(fn, fallback = undefined, context = '') {
        try {
            return fn();
        } catch (e) {
            this.error(e, context || 'guarded block');
            return fallback;
        }
    }

    /** Возвращает копию журнала (можно фильтровать по уровню). */
    getEntries(level) {
        return level ? this.entries.filter(e => e.level === level) : this.entries.slice();
    }

    clear() {
        this.entries = [];
    }

    /**
     * Экспорт журнала в виде JSON-строки (для скачивания файла лога).
     * Объект Error сериализуется в { name, message, stack }.
     */
    exportJSON() {
        const sanitize = (v) => {
            if (v instanceof Error) {
                return { name: v.name, message: v.message, stack: v.stack };
            }
            if (v && typeof v === 'object') {
                const out = {};
                for (const k of Object.keys(v)) {
                    if (k === 'element' || k === 'target' || k === 'currentTarget') continue; // DOM-узлы не сериализуем
                    try { out[k] = sanitize(v[k]); } catch (_) { out[k] = String(v[k]); }
                }
                return out;
            }
            return v;
        };
        return JSON.stringify({
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            url: typeof location !== 'undefined' ? location.href : '',
            exportedAt: new Date().toISOString(),
            entries: this.entries.map(sanitize)
        }, null, 2);
    }

    /** Скачивание журнала как файла app-error-log-<timestamp>.json (только в браузере). */
    downloadLog() {
        if (typeof document === 'undefined') return;
        const blob = new Blob([this.exportJSON()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `app-error-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);;
    }

    /**
     * Устанавливает глобальные обработчики runtime-ошибок.
     * Вызывается один раз; повторные вызовы игнорируются.
     */
    installGlobalHandlers() {
        if (this._handlersInstalled || typeof window === 'undefined') return;
        this._handlersInstalled = true;

        // Необработанные исключения и ошибки загрузки ресурсов (capture)
        window.addEventListener('error', (event) => {
            if (event instanceof ErrorEvent && event.error) {
                this.log('error', event.message, {
                    stack: event.error.stack,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            } else {
                // Resource load error (img/script/link)
                const target = event.target;
                this.log('error', `Resource load failed: ${target && (target.src || target.href) || 'unknown'}`, {
                    tagName: target && target.tagName
                });
            }
        }, true);

        // Необработанные отклонённые промисы
        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason;
            this.error(reason instanceof Error ? reason : new Error(String(reason)), 'Unhandled promise rejection');
        });
    }

    _getToastContainer() {
        if (this._toastContainer && document.body.contains(this._toastContainer)) {
            return this._toastContainer;
        }
        const container = document.createElement('div');
        container.id = 'logger-toast-container';
        container.style.cssText =
            'position:fixed;bottom:16px;right:16px;z-index:9999;display:flex;' +
            'flex-direction:column;gap:8px;max-width:360px;font-family:sans-serif;';
        document.body.appendChild(container);
        this._toastContainer = container;
        return container;
    }

    _showToast(message) {
        if (typeof document === 'undefined' || !document.body) return;
        try {
            const container = this._getToastContainer();
            const toast = document.createElement('div');
            toast.textContent = `⚠ ${message}`;
            toast.style.cssText =
                'background:#b71c1c;color:#fff;padding:10px 14px;border-radius:6px;' +
                'font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.35);word-break:break-word;';
            container.appendChild(toast);
            setTimeout(() => toast.remove(), this.toastTimeoutMs);
        } catch (_) {
            // toast — только эвристика; ошибка вывода не должна ломать приложение
        }
    }
}

// Единый экземпляр для всего приложения
export const logger = new Logger();

// Автоматическая установка глобальных обработчиков в браузерном окружении
if (typeof window !== 'undefined') {
    logger.installGlobalHandlers();
}

export default Logger;
