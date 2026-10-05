/**
 * Модульные тесты: js/modules/points-renderer.js и js/modules/wireframe-renderer.js
 * Рендереры точек и каркасов (проверяются с мок-объектом canvas)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { Vec3 } from '../js/core/math3d.js';
import { PointsRenderer, createPointsRenderer } from '../js/modules/points-renderer.js';
import { WireframeRenderer, createWireframeRenderer } from '../js/modules/wireframe-renderer.js';

// Мок 2D-контекста: пишет все вызовы в лог
function createMockCanvasWithLog(width = 100, height = 100) {
    const calls = [];
    const ctx = new Proxy({}, {
        get(target, prop) {
            if (prop === 'calls') return calls;
            // свойства-сеттеры (fillStyle и т.п.) просто сохраняем
            if (!(prop in target)) {
                target[prop] = (...args) => {
                    calls.push({ method: prop, args });
                };
            }
            return target[prop];
        },
        set(target, prop, value) {
            target[prop] = value;
            calls.push({ set: prop, value });
            return true;
        },
    });
    return {
        width,
        height,
        getContext: () => ctx,
        calls,
    };
}

describe('PointsRenderer', () => {
    test('createPointsRenderer возвращает экземпляр', () => {
        const r = createPointsRenderer(createMockCanvasWithLog());
        assert.ok(r instanceof PointsRenderer);
    });

    test('addPoint / setPoints / clear управляют списком точек', () => {
        const r = new PointsRenderer(createMockCanvasWithLog());
        r.addPoint(new Vec3(1, 2, 3));
        assert.equal(r.points.length, 1);
        r.setPoints([new Vec3(0, 0, 0), new Vec3(1, 1, 1)]);
        assert.equal(r.points.length, 2);
        r.clear();
        assert.equal(r.points.length, 0);
        assert.equal(r.vertices.length, 0);
        assert.equal(r.edges.length, 0);
    });

    test('setMesh сохраняет вершины и рёбра, null -> пустые массивы', () => {
        const r = new PointsRenderer(createMockCanvasWithLog());
        r.setMesh([new Vec3(0, 0, 0)], [[0, 0]]);
        assert.equal(r.vertices.length, 1);
        assert.equal(r.edges.length, 1);
        r.setMesh(null, undefined);
        assert.deepEqual(r.vertices, []);
        assert.deepEqual(r.edges, []);
    });

    test('сеттеры настроек: размер, цвет, координаты', () => {
        const r = new PointsRenderer(createMockCanvasWithLog());
        r.setPointSize(7);
        r.setPointColor('#ff0000');
        r.toggleCoordinates(true);
        assert.equal(r.pointSize, 7);
        assert.equal(r.pointColor, '#ff0000');
        assert.equal(r.showCoordinates, true);
    });

    test('render вызывает arc/fill для непустых проекций и пропускает null', () => {
        const canvas = createMockCanvasWithLog();
        const r = new PointsRenderer(canvas);
        r.render([{ x: 10, y: 20, z: 0 }, null, { x: 30, y: 40, z: 0.5 }]);

        const arcs = canvas.calls.filter(c => c.method === 'arc');
        assert.equal(arcs.length, 2, 'две валидные точки -> два arc');
        assert.deepEqual(arcs[0].args.slice(0, 2), [10, 20]);
        assert.deepEqual(arcs[1].args.slice(0, 2), [30, 40]);

        const fills = canvas.calls.filter(c => c.method === 'fill');
        assert.equal(fills.length, 2);

        const clears = canvas.calls.filter(c => c.method === 'clearRect');
        assert.equal(clears.length, 1, 'экран очищается один раз');
    });

    test('render с showCoordinates дописывает текст', () => {
        const canvas = createMockCanvasWithLog();
        const r = new PointsRenderer(canvas);
        r.toggleCoordinates(true);
        r.render([{ x: 1, y: 2, z: 0 }]);
        const texts = canvas.calls.filter(c => c.method === 'fillText');
        assert.equal(texts.length, 1);
        assert.equal(texts[0].args[0], '(0)');
    });

    test('renderWithDepth сортирует точки от дальних к ближним (по убыванию z)', () => {
        const canvas = createMockCanvasWithLog();
        const r = new PointsRenderer(canvas);
        r.renderWithDepth([
            { x: 1, y: 1, z: -0.9 },  // ближняя
            { x: 2, y: 2, z: 0.8 },   // дальняя
            null,
            { x: 3, y: 3, z: 0.0 },
        ]);
        const arcs = canvas.calls.filter(c => c.method === 'arc');
        assert.equal(arcs.length, 3, 'null пропускается');
        const order = arcs.map(a => `${a.args[0]},${a.args[1]}`);
        assert.deepEqual(order, ['2,2', '3,3', '1,1'], 'дальние рисуются первыми');
    });

    test('interpolateColor: factor=0 -> первый цвет, factor=1 -> второй', () => {
        const r = new PointsRenderer(createMockCanvasWithLog());
        assert.equal(r.interpolateColor('#000000', '#ffffff', 0), '#000000');
        assert.equal(r.interpolateColor('#000000', '#ffffff', 1), '#ffffff');
        assert.equal(r.interpolateColor('#000000', '#ffffff', 0.5), '#808080');
    });
});

describe('WireframeRenderer', () => {
    test('createWireframeRenderer возвращает экземпляр', () => {
        const r = createWireframeRenderer(createMockCanvasWithLog());
        assert.ok(r instanceof WireframeRenderer);
    });

    test('setMesh / clear', () => {
        const r = new WireframeRenderer(createMockCanvasWithLog());
        r.setMesh([new Vec3(), new Vec3()], [[0, 1]]);
        assert.equal(r.edges.length, 1);
        r.clear();
        assert.deepEqual(r.vertices, []);
        assert.deepEqual(r.edges, []);
    });

    test('render рисует линии только для рёбер, обе вершины которых спроецированы', () => {
        const canvas = createMockCanvasWithLog();
        const r = new WireframeRenderer(canvas);
        r.setMesh(
            [new Vec3(), new Vec3(), new Vec3()],
            [[0, 1], [1, 2]]
        );
        r.render([
            { x: 0, y: 0, z: 0 },
            { x: 10, y: 10, z: 0 },
            null, // третья вершина за камерой
        ]);
        const lines = canvas.calls.filter(c => c.method === 'lineTo');
        assert.equal(lines.length, 1, 'ребро [1,2] пропущено из-за null');
        assert.deepEqual(lines[0].args, [10, 10]);
    });

    test('render с showVertices рисует маркеры вершин', () => {
        const canvas = createMockCanvasWithLog();
        const r = new WireframeRenderer(canvas);
        r.toggleVertices(true);
        r.setMesh([new Vec3()], []);
        r.render([{ x: 5, y: 5, z: 0 }]);
        const arcs = canvas.calls.filter(c => c.method === 'arc');
        assert.equal(arcs.length, 1);
        r.toggleVertices(false);
        assert.equal(r.showVertices, false);
    });
});
