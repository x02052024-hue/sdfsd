/**
 * Модульные тесты: js/modules/raytracer.js
 * Лучи, пересечения сфера/плоскость, трассировщик (с мок-объектом canvas)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { Vec3 } from '../js/core/math3d.js';
import { Camera, Projector } from '../js/core/projection.js';
import { Ray, Sphere, Plane, RayTracer, createRayTracer } from '../js/modules/raytracer.js';

const EPS = 1e-9;

// Минимальный mock canvas для Node-окружения
function createMockCanvas(width = 100, height = 100) {
    return {
        width,
        height,
        getContext() {
            return {
                createImageData(w, h) {
                    return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
                },
                putImageData() {},
                clearRect() {},
                fillRect() {},
                set fillStyle(v) {},
                get fillStyle() { return '#000000'; },
            };
        },
    };
}

describe('Ray', () => {
    test('нормализует направление в конструкторе', () => {
        const ray = new Ray(new Vec3(0, 0, 0), new Vec3(0, 10, 0));
        assert.ok(Math.abs(Vec3.length(ray.direction) - 1) < EPS);
        assertVecClose(ray.direction, [0, 1, 0]);
    });

    test('pointAt(t) возвращает origin + direction * t', () => {
        const ray = new Ray(new Vec3(1, 2, 3), new Vec3(0, 0, -1));
        const p = ray.pointAt(5);
        assertVecClose(p, [1, 2, -2]);
    });
});

function assertVecClose(v, [x, y, z], msg = '') {
    assert.ok(Math.abs(v.x - x) < 1e-6, `${msg} x: ${v.x} != ${x}`);
    assert.ok(Math.abs(v.y - y) < 1e-6, `${msg} y: ${v.y} != ${y}`);
    assert.ok(Math.abs(v.z - z) < 1e-6, `${msg} z: ${v.z} != ${z}`);
}

describe('Sphere.intersect', () => {
    const sphere = new Sphere(new Vec3(0, 0, 0), 1, '#ff0000');

    test('луч, направленный в центр сферы, пересекает её в ближайшей точке', () => {
        const ray = new Ray(new Vec3(0, 0, 5), new Vec3(0, 0, -1));
        const hit = sphere.intersect(ray);
        assert.notEqual(hit, null);
        assert.ok(Math.abs(hit.t - 4) < 1e-6, `t=${hit.t}`);
        assertVecClose(hit.point, [0, 0, 1], 'точка входа');
        assertVecClose(hit.normal, [0, 0, 1], 'нормаль наружу');
        assert.equal(hit.object, sphere);
    });

    test('луч, проходящий мимо сферы, не даёт пересечения', () => {
        const ray = new Ray(new Vec3(0, 5, 5), new Vec3(0, 0, -1));
        assert.equal(sphere.intersect(ray), null);
    });

    test('касательный луч (discriminant ~ 0) всё ещё может не дать t > epsilon — проверка граничного случая', () => {
        // луч точно по касательной: расстояние до центра == radius
        const ray = new Ray(new Vec3(0, 1, 5), new Vec3(0, 0, -1));
        const hit = sphere.intersect(ray);
        // t = 5, но точка касания (0,1,0): нормаль (0,1,0)
        if (hit) {
            assert.ok(Math.abs(hit.t - 5) < 1e-3, `t=${hit.t}`);
            assertVecClose(hit.normal, [0, 1, 0]);
        }
    });

    test('луч от поверхности внутрь сферы не пересекает (t < 0.001 отбрасывается)', () => {
        const ray = new Ray(new Vec3(0, 0, 1), new Vec3(0, 0, -1));
        const hit = sphere.intersect(ray);
        // первый корень t ~= 0 -> отбрасывается из-за epsilon 0.001
        assert.equal(hit, null);
    });

    test('луч, направленный от сферы, не пересекает её', () => {
        const ray = new Ray(new Vec3(0, 0, 5), new Vec3(0, 0, 1));
        assert.equal(sphere.intersect(ray), null);
    });
});

describe('Plane.intersect', () => {
    const plane = new Plane(new Vec3(0, 0, 0), new Vec3(0, 1, 0), '#00ff00');

    test('луч сверху вниз пересекает горизонтальную плоскость', () => {
        const ray = new Ray(new Vec3(0, 5, 0), new Vec3(0, -1, 0));
        const hit = plane.intersect(ray);
        assert.notEqual(hit, null);
        assert.ok(Math.abs(hit.t - 5) < 1e-6);
        assertVecClose(hit.point, [0, 0, 0]);
        assertVecClose(hit.normal, [0, 1, 0]);
    });

    test('параллельный плоскости луч не пересекает её', () => {
        const ray = new Ray(new Vec3(0, 5, 0), new Vec3(1, 0, 0));
        assert.equal(plane.intersect(ray), null);
    });

    test('луч, направленный прочь от плоскости, не пересекает её (t < 0)', () => {
        const ray = new Ray(new Vec3(0, 5, 0), new Vec3(0, 1, 0));
        assert.equal(plane.intersect(ray), null);
    });

    test('нормаль плоскости нормализуется в конструкторе', () => {
        const p = new Plane(new Vec3(0, 0, 0), new Vec3(0, 2, 0));
        assert.ok(Math.abs(Vec3.length(p.normal) - 1) < EPS);
    });
});

describe('RayTracer', () => {
    test('addObject / clear управляют списком объектов', () => {
        const tracer = new RayTracer(createMockCanvas());
        const s = new Sphere(new Vec3(0, 0, 0), 1);
        tracer.addObject(s);
        assert.equal(tracer.objects.length, 1);
        tracer.clear();
        assert.equal(tracer.objects.length, 0);
    });

    test('setLightDirection нормализует вектор света', () => {
        const tracer = new RayTracer(createMockCanvas());
        tracer.setLightDirection(2, 2, 2);
        assert.ok(Math.abs(Vec3.length(tracer.lightDir) - 1) < EPS);
    });

    test('findIntersection возвращает ближайший объект', () => {
        const tracer = new RayTracer(createMockCanvas());
        const near = new Sphere(new Vec3(0, 0, -2), 0.5);
        const far = new Sphere(new Vec3(0, 0, -5), 0.5);
        tracer.addObject(far);
        tracer.addObject(near);
        const ray = new Ray(new Vec3(0, 0, 0), new Vec3(0, 0, -1));
        const hit = tracer.findIntersection(ray);
        assert.notEqual(hit, null);
        assert.equal(hit.object, near);
    });

    test('findIntersection возвращает null, если ничего нет', () => {
        const tracer = new RayTracer(createMockCanvas());
        const ray = new Ray(new Vec3(0, 0, 0), new Vec3(0, 1, 0));
        assert.equal(tracer.findIntersection(ray), null);
    });

    test('calculateColor без попадания возвращает цвет фона', () => {
        const tracer = new RayTracer(createMockCanvas());
        assert.equal(tracer.calculateColor(null, 0), tracer.backgroundColor);
    });

    test('calculateColor с прямым попаданием лицом к свету ярче, чем грань от света', () => {
        const tracer = new RayTracer(createMockCanvas());
        tracer.setAmbientLight(0);
        tracer.setLightDirection(0, 0, 1);

        const sphere = new Sphere(new Vec3(0, 0, 0), 1, '#ffffff');
        // фронтальная точка (нормаль совпадает со светом)
        const frontHit = sphere.intersect(new Ray(new Vec3(0, 0, 5), new Vec3(0, 0, -1)));
        const frontColor = tracer.calculateColor(frontHit, 0);

        // боковая точка (нормаль перпендикулярна свету) -> только ambient = 0 -> чёрный
        const sideHit = { ...frontHit, normal: new Vec3(1, 0, 0) };
        const sideColor = tracer.calculateColor(sideHit, 0);

        assert.equal(frontColor, 'rgb(255, 255, 255)');
        assert.equal(sideColor, 'rgb(0, 0, 0)');
    });

    test('ambient light ограничивает минимальную яркость', () => {
        const tracer = new RayTracer(createMockCanvas());
        tracer.setAmbientLight(0.5);
        tracer.setLightDirection(0, 0, 1);
        const sphere = new Sphere(new Vec3(0, 0, 0), 1, '#ffffff');
        const hit = sphere.intersect(new Ray(new Vec3(0, 0, 5), new Vec3(0, 0, -1)));
        const sideHit = { ...hit, normal: new Vec3(1, 0, 0) };
        const color = tracer.calculateColor(sideHit, 0);
        assert.equal(color, 'rgb(128, 128, 128)'); // 255 * 0.5 -> 127.5 -> round = 128
    });

    test('render заполняет пиксели imageData и вызывает putImageData', () => {
        const canvas = createMockCanvas(20, 20);
        let putData = null;
        const tracer = new RayTracer(canvas);
        tracer.ctx.putImageData = (img) => { putData = img; };
        tracer.addObject(new Sphere(new Vec3(0, 0, 0), 1));

        const cam = new Camera();
        const projector = new Projector(cam);
        projector.setViewport(canvas.width, canvas.height);

        tracer.render(cam, projector);

        assert.notEqual(putData, null, 'putImageData должен быть вызван');
        assert.equal(putData.width, 20);
        assert.equal(putData.height, 20);
        // как минимум один пиксель не должен быть цветом фона (сфера на луче из (0,0,5))
        const hasNonBackground = putData.data.some((v, i) => i % 4 !== 3 && v !== 0);
        assert.ok(hasNonBackground, 'на изображении должны появиться пиксели сферы');
    });

    test('renderPreview выполняется без ошибок на mock-canvas', () => {
        const canvas = createMockCanvas(20, 20);
        const tracer = new RayTracer(canvas);
        tracer.addObject(new Sphere(new Vec3(0, 0, 0), 1));
        const cam = new Camera();
        tracer.renderPreview(cam, 4); // не должно выбросить исключение
    });

    test('createRayTracer возвращает экземпляр RayTracer', () => {
        const tracer = createRayTracer(createMockCanvas());
        assert.ok(tracer instanceof RayTracer);
    });
});
