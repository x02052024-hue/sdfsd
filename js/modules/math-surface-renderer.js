/**
 * Math Surface Renderer Module
 * Renders surfaces defined by mathematical functions z = f(x, y)
 */

import { Vec3 } from '../core/math3d.js';
import { Triangle } from './surface-renderer.js';

export class MathSurface {
    constructor() {
        this.vertices = [];
        this.triangles = [];
        this.functionX = -5;
        this.functionY = 5;
        this.stepsX = 20;
        this.stepsY = 20;
    }

    /**
     * Generate surface from mathematical function
     * @param {Function} func - Function f(x, y) => z
     * @param {number} minX - Minimum x value
     * @param {number} maxX - Maximum x value
     * @param {number} minY - Minimum y value
     * @param {number} maxY - Maximum y value
     * @param {number} stepsX - Number of steps in x direction
     * @param {number} stepsY - Number of steps in y direction
     */
    generate(func, minX, maxX, minY, maxY, stepsX = 20, stepsY = 20) {
        this.vertices = [];
        this.triangles = [];
        this.functionX = minX;
        this.functionY = maxX;
        this.stepsX = stepsX;
        this.stepsY = stepsY;

        const stepX = (maxX - minX) / stepsX;
        const stepY = (maxY - minY) / stepsY;

        // Generate vertices
        for (let i = 0; i <= stepsX; i++) {
            for (let j = 0; j <= stepsY; j++) {
                const x = minX + i * stepX;
                const y = minY + j * stepY;
                const z = func(x, y);
                this.vertices.push(new Vec3(x, y, z));
            }
        }

        // Generate triangles
        for (let i = 0; i < stepsX; i++) {
            for (let j = 0; j < stepsY; j++) {
                const idx = i * (stepsY + 1) + j;
                
                // First triangle of the quad
                this.triangles.push({
                    v0: idx,
                    v1: idx + 1,
                    v2: idx + stepsY + 1,
                    color: this.calculateColor(i, j, stepsX, stepsY)
                });

                // Second triangle of the quad
                this.triangles.push({
                    v0: idx + 1,
                    v1: idx + stepsY + 2,
                    v2: idx + stepsY + 1,
                    color: this.calculateColor(i, j, stepsX, stepsY)
                });
            }
        }

        // Recalculate normals for all triangles
        this.triangles.forEach(tri => {
            const v0 = this.vertices[tri.v0];
            const v1 = this.vertices[tri.v1];
            const v2 = this.vertices[tri.v2];
            
            const edge1 = Vec3.sub(v1, v0);
            const edge2 = Vec3.sub(v2, v0);
            tri.normal = Vec3.normalize(Vec3.cross(edge1, edge2));
        });

        return { vertices: this.vertices, triangles: this.triangles };
    }

    calculateColor(i, j, stepsX, stepsY) {
        // Color based on position (gradient)
        const r = Math.round(100 + 155 * (i / stepsX));
        const g = Math.round(100 + 155 * (j / stepsY));
        const b = 200;
        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Update vertex heights using a function (for animation)
     * @param {Function} func - Function f(x, y, time) => z
     * @param {number} time - Time parameter for animation
     */
    updateHeights(func, time) {
        const stepX = (this.functionY - this.functionX) / this.stepsX;
        const stepY = (this.functionY - this.functionX) / this.stepsY;

        let idx = 0;
        for (let i = 0; i <= this.stepsX; i++) {
            for (let j = 0; j <= this.stepsY; j++) {
                const x = this.functionX + i * stepX;
                const y = this.functionX + j * stepY;
                this.vertices[idx].z = func(x, y, time);
                idx++;
            }
        }

        // Recalculate normals
        this.triangles.forEach(tri => {
            const v0 = this.vertices[tri.v0];
            const v1 = this.vertices[tri.v1];
            const v2 = this.vertices[tri.v2];
            
            const edge1 = Vec3.sub(v1, v0);
            const edge2 = Vec3.sub(v2, v0);
            tri.normal = Vec3.normalize(Vec3.cross(edge1, edge2));
        });
    }
}

// Preset mathematical functions
export const MathFunctions = {
    plane: (x, y) => 0,
    
    sine: (x, y) => Math.sin(x) * Math.cos(y),
    
    ripple: (x, y) => {
        const dist = Math.sqrt(x * x + y * y);
        return Math.sin(dist * 2) / (dist + 0.5);
    },
    
    saddle: (x, y) => x * x - y * y,
    
    wave: (x, y, t = 0) => {
        return Math.sin(x + t) * Math.cos(y + t * 0.5);
    },
    
    gaussian: (x, y) => {
        return Math.exp(-(x * x + y * y) * 0.5);
    },
    
    peaks: (x, y) => {
        const term1 = 3 * (1 - x) ** 2 * Math.exp(-(x ** 2) - (y + 1) ** 2);
        const term2 = 10 * (x / 5 - x ** 3 - y ** 5) * Math.exp(-x ** 2 - y ** 2);
        const term3 = -1 / 3 * Math.exp(-(x + 1) ** 2 - y ** 2);
        return term1 + term2 + term3;
    },
    
    spiral: (x, y) => {
        const angle = Math.atan2(y, x);
        const dist = Math.sqrt(x * x + y * y);
        return Math.sin(angle * 3) * dist;
    }
};

export class MathSurfaceRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.surface = new MathSurface();
        this.enableBackfaceCulling = true;
        this.enableDepthSort = true;
    }

    setFunction(func, minX = -5, maxX = 5, minY = -5, maxY = 5, stepsX = 30, stepsY = 30) {
        this.surface.generate(func, minX, maxX, minY, maxY, stepsX, stepsY);
    }

    updateAnimation(time) {
        // For animated surfaces
    }

    render(projectedVertices, triangles, viewMatrix) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const visibleTriangles = [];
        
        triangles.forEach((tri) => {
            const p0 = projectedVertices[tri.v0];
            const p1 = projectedVertices[tri.v1];
            const p2 = projectedVertices[tri.v2];
            
            if (p0 === null || p1 === null || p2 === null) {
                return;
            }
            
            // Backface culling
            if (this.enableBackfaceCulling) {
                const edge1 = { x: p1.x - p0.x, y: p1.y - p0.y };
                const edge2 = { x: p2.x - p0.x, y: p2.y - p0.y };
                const cross = edge1.x * edge2.y - edge1.y * edge2.x;
                
                if (cross <= 0) {
                    return;
                }
            }
            
            const depth = (p0.z + p1.z + p2.z) / 3;
            
            visibleTriangles.push({
                projected: [p0, p1, p2],
                depth: depth,
                color: tri.color || '#cccccc'
            });
        });
        
        if (this.enableDepthSort) {
            visibleTriangles.sort((a, b) => b.depth - a.depth);
        }
        
        visibleTriangles.forEach(({ projected, color }) => {
            this.ctx.beginPath();
            this.ctx.moveTo(projected[0].x, projected[0].y);
            this.ctx.lineTo(projected[1].x, projected[1].y);
            this.ctx.lineTo(projected[2].x, projected[2].y);
            this.ctx.closePath();
            
            this.ctx.fillStyle = color;
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.lineWidth = 0.5;
            this.ctx.stroke();
        });
    }
}

export function createMathSurfaceRenderer(canvas) {
    return new MathSurfaceRenderer(canvas);
}
