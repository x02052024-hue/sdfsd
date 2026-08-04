/**
 * Points Renderer Module
 * Displays 3D points on the 2D canvas
 */

import { Vec3 } from '../core/math3d.js';

export class PointsRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.points = [];
        this.vertices = [];
        this.edges = [];
        this.pointSize = 4;
        this.pointColor = '#00ff88';
        this.showCoordinates = false;
    }

    setMesh(vertices, edges) {
        this.vertices = vertices || [];
        this.edges = edges || [];
    }

    setPoints(points) {
        this.points = points;
    }

    addPoint(point) {
        this.points.push(point);
    }

    clear() {
        this.points = [];
        this.vertices = [];
        this.edges = [];
    }

    setPointSize(size) {
        this.pointSize = size;
    }

    setPointColor(color) {
        this.pointColor = color;
    }

    toggleCoordinates(show) {
        this.showCoordinates = show;
    }

    render(projectedPoints) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw points
        projectedPoints.forEach((proj, index) => {
            if (proj !== null) {
                this.ctx.beginPath();
                this.ctx.arc(proj.x, proj.y, this.pointSize, 0, Math.PI * 2);
                this.ctx.fillStyle = this.pointColor;
                this.ctx.fill();
                
                // Optionally show coordinates
                if (this.showCoordinates) {
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = '10px monospace';
                    this.ctx.fillText(`(${index})`, proj.x + 5, proj.y - 5);
                }
            }
        });
    }

    renderWithDepth(projectedPoints) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Sort by depth (far to near)
        const sorted = projectedPoints
            .map((proj, index) => ({ proj, index }))
            .filter(item => item.proj !== null)
            .sort((a, b) => b.proj.z - a.proj.z);
        
        // Draw points with depth-based coloring
        sorted.forEach(({ proj, index }) => {
            // Calculate brightness based on depth
            const brightness = Math.max(0.2, Math.min(1, (proj.z + 1) * 0.5));
            const color = this.interpolateColor(this.pointColor, '#000000', 1 - brightness);
            
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, this.pointSize * brightness, 0, Math.PI * 2);
            this.ctx.fillStyle = color;
            this.ctx.fill();
        });
    }

    interpolateColor(color1, color2, factor) {
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);
        
        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);
        
        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}

export function createPointsRenderer(canvas) {
    return new PointsRenderer(canvas);
}
