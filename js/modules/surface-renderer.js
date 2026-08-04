/**
 * Surface Renderer Module
 * Renders triangulated surfaces with backface culling and painter's algorithm
 */

import { Vec3 } from '../core/math3d.js';

export class Triangle {
    constructor(v0, v1, v2, color = '#cccccc') {
        this.v0 = v0;
        this.v1 = v1;
        this.v2 = v2;
        this.color = color;
        this.normal = this.calculateNormal();
    }

    calculateNormal() {
        const edge1 = Vec3.sub(this.v1, this.v0);
        const edge2 = Vec3.sub(this.v2, this.v0);
        return Vec3.normalize(Vec3.cross(edge1, edge2));
    }

    getCentroid() {
        return new Vec3(
            (this.v0.x + this.v1.x + this.v2.x) / 3,
            (this.v0.y + this.v1.y + this.v2.y) / 3,
            (this.v0.z + this.v1.z + this.v2.z) / 3
        );
    }
}

export class SurfaceRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.triangles = [];
        this.vertices = [];
        this.enableBackfaceCulling = true;
        this.enableDepthSort = true;
        this.wireframeMode = false;
        this.wireframeColor = '#000000';
    }

    setMesh(vertices, triangles) {
        this.vertices = vertices;
        this.triangles = triangles;
    }

    addTriangle(triangle) {
        this.triangles.push(triangle);
    }

    clear() {
        this.vertices = [];
        this.triangles = [];
    }

    toggleBackfaceCulling(enable) {
        this.enableBackfaceCulling = enable;
    }

    toggleDepthSort(enable) {
        this.enableDepthSort = enable;
    }

    toggleWireframe(enable) {
        this.wireframeMode = enable;
    }

    /**
     * Check if triangle is facing the camera (backface culling)
     */
    isVisible(triangle, viewMatrix) {
        // Transform normal to view space
        const centroid = triangle.getCentroid();
        const viewCentroid = viewMatrix.transformPoint(centroid);
        
        // Simple backface culling: check if normal points toward camera
        // In view space, camera looks down -Z axis
        const viewNormal = triangle.normal;
        
        // Dot product of view direction (0, 0, -1) and normal
        const dot = -viewNormal.z;
        
        return dot > 0;
    }

    render(projectedVertices, triangles, viewMatrix) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Prepare visible triangles with depth information
        const visibleTriangles = [];
        
        triangles.forEach((tri, triIndex) => {
            const p0 = projectedVertices[tri.v0];
            const p1 = projectedVertices[tri.v1];
            const p2 = projectedVertices[tri.v2];
            
            // Skip if any vertex is behind camera
            if (p0 === null || p1 === null || p2 === null) {
                return;
            }
            
            // Backface culling
            if (this.enableBackfaceCulling) {
                // Calculate screen-space normal to determine visibility
                const edge1 = { x: p1.x - p0.x, y: p1.y - p0.y };
                const edge2 = { x: p2.x - p0.x, y: p2.y - p0.y };
                const cross = edge1.x * edge2.y - edge1.y * edge2.x;
                
                if (cross <= 0) {
                    return; // Back-facing triangle
                }
            }
            
            // Calculate average depth for sorting
            const depth = (p0.z + p1.z + p2.z) / 3;
            
            visibleTriangles.push({
                triangle: tri,
                projected: [p0, p1, p2],
                depth: depth,
                color: tri.color || '#cccccc'
            });
        });
        
        // Sort by depth (painter's algorithm: far to near)
        if (this.enableDepthSort) {
            visibleTriangles.sort((a, b) => b.depth - a.depth);
        }
        
        // Render triangles
        visibleTriangles.forEach(({ projected, color }) => {
            this.ctx.beginPath();
            this.ctx.moveTo(projected[0].x, projected[0].y);
            this.ctx.lineTo(projected[1].x, projected[1].y);
            this.ctx.lineTo(projected[2].x, projected[2].y);
            this.ctx.closePath();
            
            if (this.wireframeMode) {
                this.ctx.strokeStyle = this.wireframeColor;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            } else {
                this.ctx.fillStyle = color;
                this.ctx.fill();
                this.ctx.strokeStyle = this.wireframeColor;
                this.ctx.lineWidth = 0.5;
                this.ctx.stroke();
            }
        });
    }

    renderWithLighting(projectedVertices, triangles, viewMatrix, lightDir) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const visibleTriangles = [];
        
        triangles.forEach((tri, triIndex) => {
            const p0 = projectedVertices[tri.v0];
            const p1 = projectedVertices[tri.v1];
            const p2 = projectedVertices[tri.v2];
            
            if (p0 === null || p1 === null || p2 === null) {
                return;
            }
            
            // Backface culling in screen space
            if (this.enableBackfaceCulling) {
                const edge1 = { x: p1.x - p0.x, y: p1.y - p0.y };
                const edge2 = { x: p2.x - p0.x, y: p2.y - p0.y };
                const cross = edge1.x * edge2.y - edge1.y * edge2.x;
                
                if (cross <= 0) {
                    return;
                }
            }
            
            // Calculate lighting
            let intensity = 1.0;
            if (lightDir) {
                const dot = Vec3.dot(tri.normal, lightDir);
                intensity = Math.max(0.2, dot);
            }
            
            const depth = (p0.z + p1.z + p2.z) / 3;
            
            visibleTriangles.push({
                triangle: tri,
                projected: [p0, p1, p2],
                depth: depth,
                intensity: intensity,
                color: tri.color || '#cccccc'
            });
        });
        
        if (this.enableDepthSort) {
            visibleTriangles.sort((a, b) => b.depth - a.depth);
        }
        
        visibleTriangles.forEach(({ projected, color, intensity }) => {
            this.ctx.beginPath();
            this.ctx.moveTo(projected[0].x, projected[0].y);
            this.ctx.lineTo(projected[1].x, projected[1].y);
            this.ctx.lineTo(projected[2].x, projected[2].y);
            this.ctx.closePath();
            
            // Apply lighting to color
            const litColor = this.applyLighting(color, intensity);
            this.ctx.fillStyle = litColor;
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.lineWidth = 0.5;
            this.ctx.stroke();
        });
    }

    applyLighting(color, intensity) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        const litR = Math.round(r * intensity);
        const litG = Math.round(g * intensity);
        const litB = Math.round(b * intensity);
        
        return `rgb(${litR}, ${litG}, ${litB})`;
    }
}

export function createSurfaceRenderer(canvas) {
    return new SurfaceRenderer(canvas);
}
