/**
 * Модульные тесты: js/core/projection.js
 * Камера и проекция 3D -> 2D
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { Vec3, Mat4 } from '../js/core/math3d.js';
import { Camera, Projector, createDefaultCamera, createDefaultProjector } from '../js/core/projection.js';

describe('Camera', () => {
    test('параметры по умолчанию', () => {
        const cam = new Camera();
        assert.deepEqual([cam.position.x, cam.position.y, cam.position.z], [0, 0, 5]);
        assert.equal(cam.fov, Math.PI / 3);
        assert.equal(cam.near, 0.1);
        assert.equal(cam.far, 1000);
    });

    test('getViewMatrix возвращает матрицу lookAt', () => {
        const cam = new Camera();
        const view = cam.getViewMatrix();
        assert.ok(view instanceof Mat4);
        // глаз переводится в начало координат view-пространства
        const eyeInView = view.transformPoint(cam.position);
        assert.ok(Math.abs(eyeInView.x) < 1e-9 && Math.abs(eyeInView.y) < 1e-9 && Math.abs(eyeInView.z) < 1e-9);
    });

    test('getProjectionMatrix возвращает перспективную матрицу', () => {
        const cam = new Camera();
        const proj = cam.getProjectionMatrix();
        assert.ok(proj instanceof Mat4);
        // Матрица хранится в формате column-major: элемент (row, col) — data[col*4+row],
        // поэтому коэффициент -1 при z (строка w, столбец z) лежит в data[11]
        assert.equal(proj.data[11], -1);
    });

    test('setAspect обновляет aspect', () => {
        const cam = new Camera();
        cam.setAspect(16 / 9);
        assert.equal(cam.aspect, 16 / 9);
    });

    test('createDefaultCamera создаёт камеру', () => {
        assert.ok(createDefaultCamera() instanceof Camera);
    });
});

describe('Projector', () => {
    function makeSetup() {
        const cam = new Camera();
        const proj = new Projector(cam);
        proj.setViewport(800, 600);
        return { cam, proj, view: cam.getViewMatrix(), pmat: cam.getProjectionMatrix() };
    }

    test('setViewport обновляет размеры и aspect камеры', () => {
        const cam = new Camera();
        const projector = new Projector(cam);
        projector.setViewport(1024, 768);
        assert.equal(projector.viewportWidth, 1024);
        assert.equal(projector.viewportHeight, 768);
        assert.equal(cam.aspect, 1024 / 768);
    });

    test('точка перед камерой проецируется в центр экрана', () => {
        const { proj, view, pmat } = makeSetup();
        const r = proj.project(new Vec3(0, 0, 0), view, pmat);
        assert.notEqual(r, null);
        assert.ok(Math.abs(r.x - 400) < 1e-6, `x=${r.x}`);
        assert.ok(Math.abs(r.y - 300) < 1e-6, `y=${r.y}`);
    });

    test('точка за камерой возвращает null', () => {
        const { proj, view, pmat } = makeSetup();
        // камера в (0,0,5) смотрит на начало; точка позади камеры
        const r = proj.project(new Vec3(0, 0, 10), view, pmat);
        assert.equal(r, null);
    });

    test('точка левее центра проецируется левее центра экрана', () => {
        const { proj, view, pmat } = makeSetup();
        const left = proj.project(new Vec3(-1, 0, 0), view, pmat);
        const right = proj.project(new Vec3(1, 0, 0), view, pmat);
        assert.ok(left.x < 400 && right.x > 400);
        // симметрия относительно центра
        assert.ok(Math.abs((left.x + right.x) / 2 - 400) < 1e-6);
    });

    test('более distant точка проецируется ближе к центру (эффект перспективы)', () => {
        const { proj, view, pmat } = makeSetup();
        const near = proj.project(new Vec3(2, 0, 0), view, pmat);
        const far = proj.project(new Vec3(2, 0, -10), view, pmat);
        assert.ok(Math.abs(far.x - 400) < Math.abs(near.x - 400));
    });

    test('projectPoints обрабатывает массив точек, применяя modelMatrix', () => {
        const { proj, view, pmat } = makeSetup();
        const model = Mat4.translate(0, 0, -2); // отодвигаем объект
        const points = [new Vec3(0, 0, 0), new Vec3(1, 1, 1)];
        const results = proj.projectPoints(points, model, view, pmat);
        assert.equal(results.length, 2);
        for (const r of results) assert.notEqual(r, null);
        // точка (0,0,0) после model — (0,0,-2) — должна попасть в центр
        assert.ok(Math.abs(results[0].x - 400) < 1e-6);
        assert.ok(Math.abs(results[0].y - 300) < 1e-6);
    });

    test('projectPoints без modelMatrix использует мировые координаты', () => {
        const { proj, view, pmat } = makeSetup();
        const results = proj.projectPoints([new Vec3(0, 0, 0)], null, view, pmat);
        assert.ok(Math.abs(results[0].x - 400) < 1e-6);
    });

    test('simpleProject: точка в (0,0,-focalLength) -> центр экрана, scale=1', () => {
        const cam = new Camera();
        const proj = new Projector(cam);
        proj.setViewport(800, 600);
        const r = proj.simpleProject(new Vec3(0, 0, -1), 1);
        assert.notEqual(r, null);
        assert.equal(r.x, 400);
        assert.equal(r.y, 300);
        assert.equal(r.scale, 1);
    });

    test('simpleProject возвращает null для точки za камерой (z >= 0)', () => {
        const proj = new Projector(new Camera());
        assert.equal(proj.simpleProject(new Vec3(0, 0, 0)), null);
        assert.equal(proj.simpleProject(new Vec3(0, 0, 5)), null);
    });

    test('simpleProject: x растёт пропорционально scale', () => {
        const proj = new Projector(new Camera());
        proj.setViewport(800, 600);
        const r = proj.simpleProject(new Vec3(1, 0, -2), 1);
        // scale = 1/2 => x = 1*0.5*400 + 400 = 600
        assert.equal(r.x, 600);
        assert.equal(r.y, 300);
    });

    test('createDefaultProjector создаёт проектор с камерой', () => {
        const cam = new Camera();
        const projector = createDefaultProjector(cam);
        assert.ok(projector instanceof Projector);
        assert.equal(projector.camera, cam);
    });
});
