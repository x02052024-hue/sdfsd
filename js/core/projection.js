/**
 * Projection Module
 * Handles perspective projection of 3D points to 2D screen coordinates
 */

import { Vec3, Mat4 } from './math3d.js';

export class Camera {
    constructor() {
        this.position = new Vec3(0, 0, 5);
        this.target = new Vec3(0, 0, 0);
        this.up = new Vec3(0, 1, 0);
        this.fov = Math.PI / 3; // 60 degrees
        this.near = 0.1;
        this.far = 1000;
        this.aspect = 1;
    }

    getViewMatrix() {
        return Mat4.lookAt(this.position, this.target, this.up);
    }

    getProjectionMatrix() {
        return Mat4.perspective(this.fov, this.aspect, this.near, this.far);
    }

    setAspect(aspect) {
        this.aspect = aspect;
    }
}

export class Projector {
    constructor(camera) {
        this.camera = camera;
        this.viewportWidth = 800;
        this.viewportHeight = 600;
    }

    setViewport(width, height) {
        this.viewportWidth = width;
        this.viewportHeight = height;
        if (this.camera) {
            this.camera.setAspect(width / height);
        }
    }

    /**
     * Project a 3D point to 2D screen coordinates
     * @param {Vec3} point - 3D point in world space
     * @param {Mat4} viewMatrix - View matrix
     * @param {Mat4} projMatrix - Projection matrix
     * @returns {Object} Screen coordinates and depth, or null if behind camera
     */
    project(point, viewMatrix, projMatrix) {
        // Transform to view space
        const viewPoint = viewMatrix.transformPoint(point);
        
        // Check if point is behind camera
        if (viewPoint.z >= 0) {
            return null;
        }

        // Transform to clip space
        const clipPoint = projMatrix.transformPoint(viewPoint);
        
        // Perspective divide to get NDC
        const ndcX = clipPoint.x / clipPoint.w;
        const ndcY = clipPoint.y / clipPoint.w;
        const ndcZ = clipPoint.z / clipPoint.w;
        
        // Convert to screen coordinates
        const screenX = (ndcX + 1) * 0.5 * this.viewportWidth;
        const screenY = (1 - ndcY) * 0.5 * this.viewportHeight;
        
        return {
            x: screenX,
            y: screenY,
            z: ndcZ,
            w: clipPoint.w
        };
    }

    /**
     * Project multiple points
     * @param {Array<Vec3>} points - Array of 3D points
     * @param {Mat4} modelMatrix - Model matrix
     * @param {Mat4} viewMatrix - View matrix
     * @param {Mat4} projMatrix - Projection matrix
     * @returns {Array<Object>} Array of projected points
     */
    projectPoints(points, modelMatrix, viewMatrix, projMatrix) {
        return points.map(point => {
            const worldPoint = modelMatrix ? modelMatrix.transformPoint(point) : point;
            return this.project(worldPoint, viewMatrix, projMatrix);
        });
    }

    /**
     * Simple perspective projection without matrices (for educational purposes)
     * @param {Vec3} point - 3D point
     * @param {number} focalLength - Focal length (distance from camera to projection plane)
     * @returns {Object} Screen coordinates
     */
    simpleProject(point, focalLength = 1) {
        if (point.z >= 0) {
            return null;
        }
        
        const scale = focalLength / -point.z;
        return {
            x: point.x * scale * this.viewportWidth * 0.5 + this.viewportWidth * 0.5,
            y: -point.y * scale * this.viewportHeight * 0.5 + this.viewportHeight * 0.5,
            z: point.z,
            scale: scale
        };
    }
}

export function createDefaultCamera() {
    return new Camera();
}

export function createDefaultProjector(camera) {
    const projector = new Projector(camera);
    return projector;
}
