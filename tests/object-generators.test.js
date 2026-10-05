/**
 * Модульные тесты: js/generators/object-generators.js
 * Генераторы 3D-примитивов: куб, сфера, цилиндр, конус, тор
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { Vec3 } from '../js/core/math3d.js';
import {
    ObjectGenerators,
    generateCube,
    generateSphere,
    generateCylinder,
    generateCone,
    generateTorus,
} from '../js/generators/object-generators.js';

const EPS = 1e-9;

// Общая проверка целостности меша: индексы вершин в допустимом диапазоне
function assertMeshValid(mesh, msg) {
    assert.ok(Array.isArray(mesh.vertices), `${msg}: vertices — массив`);
    assert.ok(Array.isArray(mesh.triangles), `${msg}: triangles — массив`);
    for (const tri of mesh.triangles) {
        for (const key of ['v0', 'v1', 'v2']) {
            const idx = tri[key];
            assert.ok(Number.isInteger(idx) && idx >= 0 && idx < mesh.vertices.length,
                `${msg}: индекс ${key}=${idx} вне диапазона [0, ${mesh.vertices.length})`);
        }
        assert.ok(tri.normal instanceof Vec3, `${msg}: у треугольника есть нормаль`);
    }
}

describe('generateCube / ObjectGenerators.cube', () => {
    test('куб по умолчанию: 8 вершин, 12 рёбер, 12 треугольников (6 граней)', () => {
        const cube = generateCube();
        assert.equal(cube.vertices.length, 8);
        assert.equal(cube.edges.length, 12);
        assert.equal(cube.triangles.length, 12);
        assertMeshValid(cube, 'cube');
    });

    test('рёбра куба ссылаются на существующие вершины', () => {
        const cube = generateCube(2);
        for (const [a, b] of cube.edges) {
            assert.ok(a >= 0 && a < 8 && b >= 0 && b < 8);
        }
    });

    test('размер size=2 даёт вершины на ±1 по каждой оси', () => {
        const cube = generateCube(2);
        for (const v of cube.vertices) {
            assert.ok(Math.abs(Math.abs(v.x) - 1) < EPS);
            assert.ok(Math.abs(Math.abs(v.y) - 1) < EPS);
            assert.ok(Math.abs(Math.abs(v.z) - 1) < EPS);
        }
    });

    test('граничные нормали куба покрывают все 6 направлений осей', () => {
        const cube = generateCube(1);
        const normals = cube.triangles.map(t => `${t.normal.x},${t.normal.y},${t.normal.z}`);
        const unique = new Set(normals);
        assert.equal(unique.size, 6, 'должно быть 6 уникальных нормалей');
    });
});

describe('generateSphere / ObjectGenerators.sphere', () => {
    test('сфера радиуса 1: все вершины на единичном расстоянии от центра', () => {
        const sphere = generateSphere(1, 8, 8);
        for (const v of sphere.vertices) {
            assert.ok(Math.abs(Vec3.length(v) - 1) < 1e-9, `|v| = ${Vec3.length(v)}`);
        }
    });

    test('количество вершин = (rings+1)*(segments+1)', () => {
        const segments = 10, rings = 6;
        const sphere = generateSphere(1, segments, rings);
        assert.equal(sphere.vertices.length, (rings + 1) * (segments + 1));
        assertMeshValid(sphere, 'sphere');
    });

    test('треугольников ровно 2 * segments * rings', () => {
        const segments = 10, rings = 6;
        const sphere = generateSphere(2, segments, rings);
        assert.equal(sphere.triangles.length, 2 * segments * rings);
    });

    test('радиус масштабирует вершины', () => {
        const r = 5;
        const sphere = generateSphere(r, 8, 8);
        for (const v of sphere.vertices) {
            assert.ok(Math.abs(Vec3.length(v) - r) < 1e-9);
        }
    });
});

describe('generateCylinder / ObjectGenerators.cylinder', () => {
    test('цилиндр: 2 центра + 2*segments вершин обода', () => {
        const segments = 12;
        const cyl = generateCylinder(1, 2, segments);
        assert.equal(cyl.vertices.length, 2 + 2 * segments);
        assertMeshValid(cyl, 'cylinder');
    });

    test('треугольников: 2*segments (крышки) + 2*(segments-1)? — проверяем минимум и валидность', () => {
        const segments = 12;
        const cyl = generateCylinder(1, 2, segments);
        // верхняя крышка + нижняя крышка + боковые
        assert.equal(cyl.triangles.length, segments + segments + 2 * segments);
    });

    test('вершины обода лежат на радиусе radius на уровнях ±height/2', () => {
        const radius = 3, height = 4;
        const cyl = generateCylinder(radius, height, 8);
        for (let i = 2; i < cyl.vertices.length; i++) {
            const v = cyl.vertices[i];
            const dist = Math.sqrt(v.x * v.x + v.z * v.z);
            assert.ok(Math.abs(dist - radius) < 1e-9, `dist=${dist}`);
            assert.ok(Math.abs(Math.abs(v.y) - height / 2) < 1e-9);
        }
    });
});

describe('generateCone / ObjectGenerators.cone', () => {
    test('конус: apex + центр основания + segments вершин обода', () => {
        const segments = 10;
        const cone = generateCone(1, 2, segments);
        assert.equal(cone.vertices.length, 2 + segments);
        assertMeshValid(cone, 'cone');
    });

    test('апекс конуса位于 (0, height/2, 0)', () => {
        const cone = generateCone(1, 4, 8);
        const apex = cone.vertices[0];
        assert.ok(Math.abs(apex.x) < EPS && Math.abs(apex.y - 2) < EPS && Math.abs(apex.z) < EPS);
    });

    test('боковых и базовых треугольников по segments штук каждого', () => {
        const segments = 10;
        const cone = generateCone(1, 2, segments);
        assert.equal(cone.triangles.length, 2 * segments);
    });
});

describe('generateTorus / ObjectGenerators.torus', () => {
    test('тор: majorSegments*minorSegments вершин', () => {
        const m = 16, n = 8;
        const torus = generateTorus(2, 0.5, m, n);
        assert.equal(torus.vertices.length, m * n);
        assert.equal(torus.triangles.length, 2 * m * n);
        assertMeshValid(torus, 'torus');
    });

    test('все вершины тора удовлетворяют уравнению (R + r·cos v) в плоскости XZ', () => {
        const R = 2, r = 0.5;
        const torus = generateTorus(R, r, 16, 8);
        for (const v of torus.vertices) {
            const ringDist = Math.sqrt(v.x * v.x + v.z * v.z);
            // расстояние от «трубы»: sqrt((ringDist - R)^2 + y^2) == r
            const tubeDist = Math.sqrt((ringDist - R) ** 2 + v.y * v.y);
            assert.ok(Math.abs(tubeDist - r) < 1e-9, `tubeDist=${tubeDist}`);
        }
    });
});

describe('Вспомогательные функции ObjectGenerators', () => {
    test('quadToTriangles разбивает четырёхугольник на 2 треугольника', () => {
        const quad = { v0: 0, v1: 1, v2: 2, v3: 3, normal: new Vec3(0, 0, 1), color: '#fff' };
        const tris = ObjectGenerators.quadToTriangles(quad);
        assert.equal(tris.length, 2);
        assert.deepEqual(tris[0], { v0: 0, v1: 1, v2: 2, normal: quad.normal, color: quad.color });
        assert.deepEqual(tris[1], { v0: 0, v1: 2, v2: 3, normal: quad.normal, color: quad.color });
    });

    test('getColorForSphere возвращает корректную rgb-строку', () => {
        const color = ObjectGenerators.getColorForSphere(0, 10);
        assert.match(color, /^rgb\(\d+, \d+, \d+\)$/);
        // при ring=0: r=100, g=200, b=200
        assert.equal(color, 'rgb(100, 200, 200)');
    });

    test('getColorForCylinder / Cone / Torus возвращают строки формата rgb()', () => {
        assert.match(ObjectGenerators.getColorForCylinder(4, 16), /^rgb\(\d+, \d+, \d+\)$/);
        assert.match(ObjectGenerators.getColorForCone(4, 16), /^rgb\(\d+, \d+, \d+\)$/);
        assert.match(ObjectGenerators.getColorForTorus(4, 4, 16, 8), /^rgb\(\d+, \d+, \d+\)$/);
    });
});
