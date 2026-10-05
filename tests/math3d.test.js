/**
 * Модульные тесты: js/core/math3d.js
 * Векторы, матрицы и трансформации
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { Vec3, Mat4, Transform } from '../js/core/math3d.js';

const EPS = 1e-9;

function assertVecClose(v, [x, y, z], msg) {
    assert.ok(Math.abs(v.x - x) < EPS, `${msg}: x ожидался ${x}, получен ${v.x}`);
    assert.ok(Math.abs(v.y - y) < EPS, `${msg}: y ожидался ${y}, получен ${v.y}`);
    assert.ok(Math.abs(v.z - z) < EPS, `${msg}: z ожидался ${z}, получен ${v.z}`);
}

describe('Vec3', () => {
    test('конструктор задаёт координаты, значения по умолчанию — нули', () => {
        const v = new Vec3(1, 2, 3);
        assert.equal(v.x, 1);
        assert.equal(v.y, 2);
        assert.equal(v.z, 3);
        assertVecClose(new Vec3(), [0, 0, 0], 'вектор по умолчанию');
    });

    test('статические add / sub / multiply', () => {
        const a = new Vec3(1, 2, 3);
        const b = new Vec3(4, 5, 6);
        assertVecClose(Vec3.add(a, b), [5, 7, 9], 'сложение');
        assertVecClose(Vec3.sub(b, a), [3, 3, 3], 'вычитание');
        assertVecClose(Vec3.multiply(a, 2), [2, 4, 6], 'умножение на скаляр');
    });

    test('инстанс-методы add / sub / multiply не мутируют исходный вектор', () => {
        const a = new Vec3(1, 1, 1);
        const b = new Vec3(2, 2, 2);
        assertVecClose(a.add(b), [3, 3, 3], 'a.add(b)');
        assertVecClose(a.sub(b), [-1, -1, -1], 'a.sub(b)');
        assertVecClose(a.multiply(3), [3, 3, 3], 'a.multiply(3)');
        assertVecClose(a, [1, 1, 1], 'a не изменён');
    });

    test('dot (скалярное произведение)', () => {
        assert.equal(Vec3.dot(new Vec3(1, 2, 3), new Vec3(4, 5, 6)), 32);
        // ортогональные векторы
        assert.equal(Vec3.dot(new Vec3(1, 0, 0), new Vec3(0, 1, 0)), 0);
    });

    test('cross (векторное произведение)', () => {
        assertVecClose(Vec3.cross(new Vec3(1, 0, 0), new Vec3(0, 1, 0)), [0, 0, 1], 'i × j = k');
        assertVecClose(Vec3.cross(new Vec3(0, 1, 0), new Vec3(1, 0, 0)), [0, 0, -1], 'j × i = -k');
        // коллинеарные векторы дают нулевой вектор
        assertVecClose(Vec3.cross(new Vec3(2, 0, 0), new Vec3(5, 0, 0)), [0, 0, 0], 'collinear');
    });

    test('length и normalize', () => {
        assert.equal(Vec3.length(new Vec3(3, 4, 0)), 5);
        const n = Vec3.normalize(new Vec3(0, 5, 0));
        assertVecClose(n, [0, 1, 0], 'нормализация');
        assert.ok(Math.abs(Vec3.length(Vec3.normalize(new Vec3(1, 2, 3))) - 1) < EPS,
            'длина нормализованного вектора = 1');
    });

    test('normalize нулевого вектора возвращает нулевой вектор (без NaN)', () => {
        const n = Vec3.normalize(new Vec3(0, 0, 0));
        assertVecClose(n, [0, 0, 0], 'нулевой вектор');
        assert.ok(!Number.isNaN(n.x) && !Number.isNaN(n.y) && !Number.isNaN(n.z));
    });

    test('clone создаёт независимую копию', () => {
        const a = new Vec3(1, 2, 3);
        const c = a.clone();
        assert.notEqual(c, a);
        assertVecClose(c, [1, 2, 3], 'копия');
    });
});

describe('Mat4', () => {
    test('по умолчанию — единичная матрица', () => {
        const m = new Mat4();
        assert.deepEqual(m.data, [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]);
        assert.deepEqual(Mat4.identity().data, m.data);
    });

    test('translate смещает точку', () => {
        const t = Mat4.translate(10, 20, 30);
        assertVecClose(t.transformPoint(new Vec3(1, 1, 1)), [11, 21, 31], 'трансляция');
    });

    test('scale масштабирует точку', () => {
        const s = Mat4.scale(2, 3, 4);
        assertVecClose(s.transformPoint(new Vec3(1, 1, 1)), [2, 3, 4], 'масштаб');
    });

    test('rotateZ на 90° переводит X в Y', () => {
        const r = Mat4.rotateZ(Math.PI / 2);
        assertVecClose(r.transformPoint(new Vec3(1, 0, 0)), [0, 1, 0], 'поворот вокруг Z');
    });

    test('rotateX на 90° переводит Y в Z', () => {
        const r = Mat4.rotateX(Math.PI / 2);
        assertVecClose(r.transformPoint(new Vec3(0, 1, 0)), [0, 0, 1], 'поворот вокруг X');
    });

    test('rotateY на 90° переводит Z в X', () => {
        const r = Mat4.rotateY(Math.PI / 2);
        assertVecClose(r.transformPoint(new Vec3(0, 0, 1)), [1, 0, 0], 'поворот вокруг Y');
    });

    test('умножение на единичную матрицу не меняет матрицу', () => {
        const a = Mat4.translate(1, 2, 3);
        const result = Mat4.multiply(a, Mat4.identity());
        assert.deepEqual(result.data, a.data);
    });

    test('модельная матрица: чистая трансляция работает корректно', () => {
        const t = new Transform();
        t.position = new Vec3(5, 1, -2);
        const p = t.getModelMatrix().transformPoint(new Vec3(1, 1, 1));
        assertVecClose(p, [6, 2, -1], 'translate только');
    });

    test('lookAt из (0,0,5) на начало координат переводит начало в (0,0,-5)', () => {
        const view = Mat4.lookAt(new Vec3(0, 0, 5), new Vec3(0, 0, 0), new Vec3(0, 1, 0));
        assertVecClose(view.transformPoint(new Vec3(0, 0, 0)), [0, 0, -5], 'view transform origin');
        assertVecClose(view.transformPoint(new Vec3(0, 0, 5)), [0, 0, 0], 'view transform eye');
    });

    test('perspective: структура матрицы и перспективное деление', () => {
        const near = 0.1, far = 100, fov = Math.PI / 2, aspect = 1;
        const p = Mat4.perspective(fov, aspect, near, far);
        const tanHalf = Math.tan(fov / 2);
        assert.ok(Math.abs(p.data[0] - 1 / tanHalf) < 1e-9);
        // NB: transformPoint не выполняет перспективное деление на w —
        // матрица column-major, поэтому clipW = viewZ * p.data[11] + p.data[15]
        const viewZ = -near;
        const clipZ = viewZ * p.data[10] + p.data[14];
        const clipW = viewZ * p.data[11] + p.data[15];
        const ndcZ = clipZ / clipW;
        assert.ok(Math.abs(ndcZ + 1) < 1e-6, `ndcZ=${ndcZ}, ожидался -1`);
    });
});

describe('Transform', () => {
    test('по умолчанию модельная матрица — единичная', () => {
        const t = new Transform();
        assert.deepEqual(t.getModelMatrix().data, Mat4.identity().data);
    });

    test('модельная матрица применяет позицию и масштаб', () => {
        const t = new Transform();
        t.position = new Vec3(5, 0, 0);
        t.scale = new Vec3(2, 2, 2);
        const p = t.getModelMatrix().transformPoint(new Vec3(1, 0, 0));
        assertVecClose(p, [7, 0, 0], 'scale затем translate');
    });

    test('поворот на 180° вокруг Y инвертирует X', () => {
        const t = new Transform();
        t.rotation = new Vec3(0, Math.PI, 0);
        const p = t.getModelMatrix().transformPoint(new Vec3(1, 0, 0));
        assert.ok(Math.abs(p.x + 1) < 1e-6 && Math.abs(p.y) < 1e-6 && Math.abs(p.z) < 1e-6,
            `ожидался (-1, 0, 0), получен (${p.x}, ${p.y}, ${p.z})`);
    });
});
