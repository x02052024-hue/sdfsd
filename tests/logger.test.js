import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import Logger from '../js/core/logger.js';

/**
 * Тесты модуля логирования runtime-ошибок.
 * Работают в Node.js (без window/document) — проверяют ядро логгера:
 * уровни, кольцевой буфер, перехват исключений и формат записей.
 */

// Заглушки console, чтобы не засорять вывод тестов
function silentLogger(options = {}) {
    const l = new Logger({ showToasts: false, ...options });
    return l;
}

describe('Logger — базовое логирование', () => {
    test('log(info) создаёт запись с уровнем, сообщением и временем', () => {
        const log = silentLogger();
        const entry = log.log('info', 'hello');
        assert.equal(entry.level, 'info');
        assert.equal(entry.message, 'hello');
        assert.ok(typeof entry.timestamp === 'number');
        assert.ok(!Number.isNaN(Date.parse(entry.time)));
        assert.equal(log.entries.length, 1);
    });

    test('error() сохраняет stack и name ошибки', () => {
        const log = silentLogger();
        const err = new TypeError('bad type');
        const entry = log.error(err, 'render loop');
        assert.equal(entry.level, 'error');
        assert.match(entry.message, /render loop: bad type/);
        assert.equal(entry.name, 'TypeError');
        assert.ok(entry.stack.includes('TypeError'));
    });

    test('error() принимает не-Error значения', () => {
        const log = silentLogger();
        const entry = log.error('plain string failure');
        assert.equal(entry.level, 'error');
        assert.equal(entry.message, 'plain string failure');
    });

    test('info()/warn() — удобные обёртки', () => {
        const log = silentLogger();
        log.info('i');
        log.warn('w');
        assert.deepEqual(log.getEntries().map(e => e.level), ['info', 'warn']);
    });

    test('отключённый логгер ничего не пишет', () => {
        const log = new Logger({ enabled: false, showToasts: false });
        assert.equal(log.log('info', 'x'), null);
        assert.equal(log.entries.length, 0);
    });
});

describe('Logger — кольцевой буфер', () => {
    test('хранит не более maxEntries записей, старые удаляются', () => {
        const log = silentLogger({ maxEntries: 5 });
        for (let i = 0; i < 10; i++) log.info(`msg ${i}`);
        assert.equal(log.entries.length, 5);
        assert.equal(log.entries[0].message, 'msg 5');
        assert.equal(log.entries[4].message, 'msg 9');
    });

    test('getEntries(level) фильтрует по уровню', () => {
        const log = silentLogger();
        log.info('a');
        log.error(new Error('b'));
        log.warn('c');
        assert.equal(log.getEntries('error').length, 1);
        assert.equal(log.getEntries().length, 3);
    });

    test('clear() очищает журнал', () => {
        const log = silentLogger();
        log.info('a');
        log.clear();
        assert.equal(log.entries.length, 0);
    });
});

describe('Logger — guarded execution (перехват runtime-исключений)', () => {
    test('runGuarded возвращает результат при успехе', () => {
        const log = silentLogger();
        assert.equal(log.runGuarded(() => 42, -1), 42);
        assert.equal(log.entries.length, 0);
    });

    test('runGuarded логирует ошибку и возвращает fallback', () => {
        const log = silentLogger();
        const result = log.runGuarded(() => {
            throw new RangeError('out of range');
        }, 'fallback', 'Render loop');
        assert.equal(result, 'fallback');
        const errors = log.getEntries('error');
        assert.equal(errors.length, 1);
        assert.match(errors[0].message, /Render loop: out of range/);
    });

    test('runGuarded не глотает ошибку без try внутри — fallback обязателен к возврату', () => {
        const log = silentLogger();
        // undefined-fallback тоже допустим
        assert.equal(log.runGuarded(() => JSON.parse('{oops')), undefined, 'JSON parse');
        assert.equal(log.getEntries('error').length, 1);
    });
});

describe('Logger — интеграция с окружением', () => {
    test('installGlobalHandlers безопасен без window (Node.js)', () => {
        const log = silentLogger();
        log.installGlobalHandlers(); // не должен бросать
        log.installGlobalHandlers(); // идемпотентно
        assert.equal(log._handlersInstalled, false); // в Node нет window
    });

    test('_showToast безопасен без document', () => {
        const log = silentLogger();
        log.showToasts = true;
        log._showToast('should not throw'); // в Node нет document — просто выход
    });
});
