/**
 * Math3D Core Module
 * Basic 3D mathematics utilities for vector and matrix operations
 */

export class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static add(a, b) {
        return new Vec3(a.x + b.x, a.y + b.y, a.z + b.z);
    }

    static sub(a, b) {
        return new Vec3(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    static multiply(v, scalar) {
        return new Vec3(v.x * scalar, v.y * scalar, v.z * scalar);
    }

    static dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    static cross(a, b) {
        return new Vec3(
            a.y * b.z - a.z * b.y,
            a.z * b.x - a.x * b.z,
            a.x * b.y - a.y * b.x
        );
    }

    static normalize(v) {
        const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        if (length === 0) return new Vec3(0, 0, 0);
        return new Vec3(v.x / length, v.y / length, v.z / length);
    }

    static length(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    clone() {
        return new Vec3(this.x, this.y, this.z);
    }

    add(v) {
        return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    sub(v) {
        return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    multiply(scalar) {
        return new Vec3(this.x * scalar, this.y * scalar, this.z * scalar);
    }
}

export class Mat4 {
    constructor() {
        // Identity matrix by default
        this.data = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
    }

    static identity() {
        return new Mat4();
    }

    static perspective(fov, aspect, near, far) {
        const tanHalfFov = Math.tan(fov / 2);
        const m = new Mat4();
        m.data = [
            1 / (aspect * tanHalfFov), 0, 0, 0,
            0, 1 / tanHalfFov, 0, 0,
            0, 0, -(far + near) / (far - near), -1,
            0, 0, -(2 * far * near) / (far - near), 0
        ];
        return m;
    }

    static lookAt(eye, center, up) {
        const z = Vec3.normalize(Vec3.sub(eye, center));
        const x = Vec3.normalize(Vec3.cross(up, z));
        const y = Vec3.cross(z, x);

        const m = new Mat4();
        m.data = [
            x.x, y.x, z.x, 0,
            x.y, y.y, z.y, 0,
            x.z, y.z, z.z, 0,
            -Vec3.dot(x, eye), -Vec3.dot(y, eye), -Vec3.dot(z, eye), 1
        ];
        return m;
    }

    static rotateX(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const m = new Mat4();
        m.data = [
            1, 0, 0, 0,
            0, c, s, 0,
            0, -s, c, 0,
            0, 0, 0, 1
        ];
        return m;
    }

    static rotateY(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const m = new Mat4();
        m.data = [
            c, 0, -s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1
        ];
        return m;
    }

    static rotateZ(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const m = new Mat4();
        m.data = [
            c, s, 0, 0,
            -s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
        return m;
    }

    static translate(x, y, z) {
        const m = new Mat4();
        m.data[12] = x;
        m.data[13] = y;
        m.data[14] = z;
        return m;
    }

    static scale(x, y, z) {
        const m = new Mat4();
        m.data[0] = x;
        m.data[5] = y;
        m.data[10] = z;
        return m;
    }

    static multiply(a, b) {
        const result = new Mat4();
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                let sum = 0;
                for (let k = 0; k < 4; k++) {
                    sum += a.data[i * 4 + k] * b.data[k * 4 + j];
                }
                result.data[i * 4 + j] = sum;
            }
        }
        return result;
    }

    transformPoint(point) {
        const x = point.x;
        const y = point.y;
        const z = point.z;
        
        return new Vec3(
            this.data[0] * x + this.data[4] * y + this.data[8] * z + this.data[12],
            this.data[1] * x + this.data[5] * y + this.data[9] * z + this.data[13],
            this.data[2] * x + this.data[6] * y + this.data[10] * z + this.data[14]
        );
    }
}

export class Transform {
    constructor() {
        this.position = new Vec3(0, 0, 0);
        this.rotation = new Vec3(0, 0, 0);
        this.scale = new Vec3(1, 1, 1);
    }

    getModelMatrix() {
        const T = Mat4.translate(this.position.x, this.position.y, this.position.z);
        const RX = Mat4.rotateX(this.rotation.x);
        const RY = Mat4.rotateY(this.rotation.y);
        const RZ = Mat4.rotateZ(this.rotation.z);
        const S = Mat4.scale(this.scale.x, this.scale.y, this.scale.z);
        
        return Mat4.multiply(Mat4.multiply(Mat4.multiply(T, RX), RY), Mat4.multiply(RZ, S));
    }
}
