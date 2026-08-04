/**
 * Voxel Renderer Module
 * Renders voxel-based scenes with simple occlusion culling
 */

import { Vec3 } from '../core/math3d.js';

export class Voxel {
    constructor(x, y, z, color = '#ff0000') {
        this.x = x;
        this.y = y;
        this.z = z;
        this.color = color;
        this.size = 1;
    }

    getVertices() {
        const h = this.size / 2;
        return [
            new Vec3(this.x - h, this.y - h, this.z - h),
            new Vec3(this.x + h, this.y - h, this.z - h),
            new Vec3(this.x + h, this.y + h, this.z - h),
            new Vec3(this.x - h, this.y + h, this.z - h),
            new Vec3(this.x - h, this.y - h, this.z + h),
            new Vec3(this.x + h, this.y - h, this.z + h),
            new Vec3(this.x + h, this.y + h, this.z + h),
            new Vec3(this.x - h, this.y + h, this.z + h)
        ];
    }

    /**
     * Get faces that should be rendered (not occluded by neighbors)
     */
    getVisibleFaces(voxelMap) {
        const faces = [];
        const h = this.size / 2;
        
        // Check each of the 6 directions
        const directions = [
            { dir: 'front', normal: new Vec3(0, 0, -1), vertices: [0, 1, 2, 3], neighbor: [this.x, this.y, this.z - this.size] },
            { dir: 'back', normal: new Vec3(0, 0, 1), vertices: [5, 4, 7, 6], neighbor: [this.x, this.y, this.z + this.size] },
            { dir: 'left', normal: new Vec3(-1, 0, 0), vertices: [4, 0, 3, 7], neighbor: [this.x - this.size, this.y, this.z] },
            { dir: 'right', normal: new Vec3(1, 0, 0), vertices: [1, 5, 6, 2], neighbor: [this.x + this.size, this.y, this.z] },
            { dir: 'bottom', normal: new Vec3(0, -1, 0), vertices: [4, 5, 1, 0], neighbor: [this.x, this.y - this.size, this.z] },
            { dir: 'top', normal: new Vec3(0, 1, 0), vertices: [3, 2, 6, 7], neighbor: [this.x, this.y + this.size, this.z] }
        ];

        directions.forEach(face => {
            const key = `${face.neighbor[0]},${face.neighbor[1]},${face.neighbor[2]}`;
            if (!voxelMap.has(key)) {
                faces.push({
                    vertices: face.vertices,
                    normal: face.normal,
                    color: this.applyShading(this.color, face.normal)
                });
            }
        });

        return faces;
    }

    applyShading(color, normal) {
        // Simple shading based on normal direction
        let intensity = 1.0;
        
        // Top faces are brighter
        if (normal.y > 0.9) {
            intensity = 1.0;
        } else if (normal.y < -0.9) {
            intensity = 0.5;
        } else if (Math.abs(normal.x) > 0.9 || Math.abs(normal.z) > 0.9) {
            intensity = 0.7;
        }
        
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        return `rgb(${Math.round(r * intensity)}, ${Math.round(g * intensity)}, ${Math.round(b * intensity)})`;
    }
}

export class VoxelScene {
    constructor() {
        this.voxels = [];
        this.voxelMap = new Map();
        this.gridSize = { x: 16, y: 16, z: 16 };
    }

    addVoxel(voxel) {
        this.voxels.push(voxel);
        const key = `${voxel.x},${voxel.y},${voxel.z}`;
        this.voxelMap.set(key, voxel);
    }

    removeVoxel(x, y, z) {
        const key = `${x},${y},${z}`;
        if (this.voxelMap.has(key)) {
            this.voxelMap.delete(key);
            this.voxels = this.voxels.filter(v => 
                v.x !== x || v.y !== y || v.z !== z
            );
        }
    }

    getVoxel(x, y, z) {
        const key = `${x},${y},${z}`;
        return this.voxelMap.get(key);
    }

    clear() {
        this.voxels = [];
        this.voxelMap.clear();
    }

    /**
     * Generate a simple terrain-like voxel structure
     */
    generateTerrain(heightMap, baseY = 0) {
        this.clear();
        
        for (let x = 0; x < this.gridSize.x; x++) {
            for (let z = 0; z < this.gridSize.z; z++) {
                const height = heightMap(x, z);
                for (let y = 0; y <= height; y++) {
                    const color = this.getVoxelColor(y, height);
                    this.addVoxel(new Voxel(
                        x * this.gridSize.x / 10 - this.gridSize.x / 2,
                        y + baseY,
                        z * this.gridSize.z / 10 - this.gridSize.z / 2,
                        color
                    ));
                }
            }
        }
    }

    getVoxelColor(y, maxHeight) {
        if (y === maxHeight) {
            return '#4a8f3a'; // Grass top
        } else if (y > maxHeight - 2) {
            return '#6b4f3a'; // Dirt
        } else {
            return '#5a5a5a'; // Stone
        }
    }

    /**
     * Generate a box structure
     */
    generateBox(minX, maxX, minY, maxY, minZ, maxZ, color = '#888888') {
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    this.addVoxel(new Voxel(x, y, z, color));
                }
            }
        }
    }
}

export class VoxelRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scene = new VoxelScene();
        this.showEdges = true;
        this.edgeColor = '#000000';
    }

    setScene(scene) {
        this.scene = scene;
    }

    render(projectedVertices, viewMatrix) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Collect all visible faces with depth
        const allFaces = [];
        
        this.scene.voxels.forEach((voxel, voxelIndex) => {
            const vertices = voxel.getVertices();
            const visibleFaces = voxel.getVisibleFaces(this.scene.voxelMap);
            
            visibleFaces.forEach(face => {
                const projectedFace = face.vertices.map(vi => projectedVertices[voxelIndex * 8 + vi]);
                
                // Check if all vertices are visible
                if (projectedFace.some(p => p === null)) {
                    return;
                }
                
                // Calculate centroid depth
                const depth = projectedFace.reduce((sum, p) => sum + p.z, 0) / projectedFace.length;
                
                // Backface culling in screen space
                const p0 = projectedFace[0];
                const p1 = projectedFace[1];
                const p2 = projectedFace[2];
                const edge1 = { x: p1.x - p0.x, y: p1.y - p0.y };
                const edge2 = { x: p2.x - p0.x, y: p2.y - p0.y };
                const cross = edge1.x * edge2.y - edge1.y * edge2.x;
                
                if (cross <= 0) {
                    return;
                }
                
                allFaces.push({
                    projected: projectedFace,
                    depth: depth,
                    color: face.color
                });
            });
        });
        
        // Sort by depth (painter's algorithm)
        allFaces.sort((a, b) => b.depth - a.depth);
        
        // Render faces
        allFaces.forEach(face => {
            this.ctx.beginPath();
            this.ctx.moveTo(face.projected[0].x, face.projected[0].y);
            for (let i = 1; i < face.projected.length; i++) {
                this.ctx.lineTo(face.projected[i].x, face.projected[i].y);
            }
            this.ctx.closePath();
            
            this.ctx.fillStyle = face.color;
            this.ctx.fill();
            
            if (this.showEdges) {
                this.ctx.strokeStyle = this.edgeColor;
                this.ctx.lineWidth = 0.5;
                this.ctx.stroke();
            }
        });
    }
}

export function createVoxelRenderer(canvas) {
    return new VoxelRenderer(canvas);
}

export function createVoxelScene() {
    return new VoxelScene();
}
