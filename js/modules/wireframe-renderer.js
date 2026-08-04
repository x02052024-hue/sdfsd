/**
 * Wireframe Renderer Module
 * Displays 3D wireframe meshes on the 2D canvas
 */

import { Vec3 } from '../core/math3d.js';

export class WireframeRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.vertices = [];
        this.edges = [];
        this.lineColor = '#00aaff';
        this.lineWidth = 1;
        this.showVertices = true;
        this.vertexSize = 2;
        this.vertexColor = '#ffffff';
    }

    setMesh(vertices, edges) {
        this.vertices = vertices;
        this.edges = edges;
    }

    clear() {
        this.vertices = [];
        this.edges = [];
    }

    setLineColor(color) {
        this.lineColor = color;
    }

    setLineWidth(width) {
        this.lineWidth = width;
    }

    toggleVertices(show) {
        this.showVertices = show;
    }

    render(projectedVertices) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw edges
        this.ctx.strokeStyle = this.lineColor;
        this.ctx.lineWidth = this.lineWidth;
        
        this.edges.forEach(edge => {
            const p1 = projectedVertices[edge[0]];
            const p2 = projectedVertices[edge[1]];
            
            if (p1 !== null && p2 !== null) {
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);
                this.ctx.stroke();
            }
        });
        
        // Draw vertices
        if (this.showVertices) {
            projectedVertices.forEach((proj, index) => {
                if (proj !== null) {
                    this.ctx.beginPath();
                    this.ctx.arc(proj.x, proj.y, this.vertexSize, 0, Math.PI * 2);
                    this.ctx.fillStyle = this.vertexColor;
                    this.ctx.fill();
                }
            });
        }
    }

    renderWithDepth(projectedVertices) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate average depth for each edge
        const edgeDepths = this.edges.map((edge, index) => {
            const p1 = projectedVertices[edge[0]];
            const p2 = projectedVertices[edge[1]];
            
            if (p1 === null || p2 === null) {
                return { edgeIndex: index, depth: Infinity, visible: false };
            }
            
            return {
                edgeIndex: index,
                depth: (p1.z + p2.z) * 0.5,
                visible: true
            };
        }).filter(e => e.visible);
        
        // Sort edges by depth (far to near)
        edgeDepths.sort((a, b) => b.depth - a.depth);
        
        // Draw edges with depth-based coloring
        edgeDepths.forEach(({ edgeIndex, depth }) => {
            const edge = this.edges[edgeIndex];
            const p1 = projectedVertices[edge[0]];
            const p2 = projectedVertices[edge[1]];
            
            // Calculate brightness based on depth
            const brightness = Math.max(0.2, Math.min(1, (depth + 1) * 0.5));
            const color = this.interpolateColor(this.lineColor, '#000000', 1 - brightness);
            
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = this.lineWidth * brightness;
            
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.stroke();
        });
        
        // Draw vertices
        if (this.showVertices) {
            const sortedVertices = projectedVertices
                .map((proj, index) => ({ proj, index }))
                .filter(item => item.proj !== null)
                .sort((a, b) => b.proj.z - a.proj.z);
            
            sortedVertices.forEach(({ proj }) => {
                const brightness = Math.max(0.3, Math.min(1, (proj.z + 1) * 0.5));
                
                this.ctx.beginPath();
                this.ctx.arc(proj.x, proj.y, this.vertexSize * brightness, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
                this.ctx.fill();
            });
        }
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

export function createWireframeRenderer(canvas) {
    return new WireframeRenderer(canvas);
}
