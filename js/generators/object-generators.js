/**
 * Object Generators Module
 * Generates common 3D shapes (cube, sphere, cylinder, cone, torus)
 */

import { Vec3 } from '../core/math3d.js';

export const ObjectGenerators = {
    /**
     * Generate a cube mesh
     * @param {number} size - Size of the cube
     * @returns {Object} { vertices: Array<Vec3>, edges: Array<[number, number]>, triangles: Array<Object> }
     */
    cube(size = 1) {
        const h = size / 2;
        
        const vertices = [
            new Vec3(-h, -h, -h), new Vec3(h, -h, -h), new Vec3(h, h, -h), new Vec3(-h, h, -h),
            new Vec3(-h, -h, h), new Vec3(h, -h, h), new Vec3(h, h, h), new Vec3(-h, h, h)
        ];
        
        const edges = [
            [0, 1], [1, 2], [2, 3], [3, 0],
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7]
        ];
        
        const triangles = [
            { v0: 0, v1: 1, v2: 2, v3: 3, normal: new Vec3(0, 0, -1), color: '#ff6b6b' },
            { v0: 5, v1: 4, v2: 7, v3: 6, normal: new Vec3(0, 0, 1), color: '#4ecdc4' },
            { v0: 3, v1: 2, v2: 6, v3: 7, normal: new Vec3(0, 1, 0), color: '#ffe66d' },
            { v0: 4, v1: 5, v2: 1, v3: 0, normal: new Vec3(0, -1, 0), color: '#95e1d3' },
            { v0: 1, v1: 5, v2: 6, v3: 2, normal: new Vec3(1, 0, 0), color: '#f38181' },
            { v0: 4, v1: 0, v2: 3, v3: 7, normal: new Vec3(-1, 0, 0), color: '#aa96da' }
        ].flatMap(quad => this.quadToTriangles(quad));
        
        return { vertices, edges, triangles };
    },

    /**
     * Generate a sphere mesh
     * @param {number} radius - Radius of the sphere
     * @param {number} segments - Number of horizontal segments
     * @param {number} rings - Number of vertical rings
     * @returns {Object} { vertices, edges, triangles }
     */
    sphere(radius = 1, segments = 16, rings = 16) {
        const vertices = [];
        const triangles = [];
        
        for (let ring = 0; ring <= rings; ring++) {
            const theta = (ring * Math.PI) / rings;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            
            for (let segment = 0; segment <= segments; segment++) {
                const phi = (segment * 2 * Math.PI) / segments;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
                
                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;
                
                vertices.push(new Vec3(x * radius, y * radius, z * radius));
            }
        }
        
        // Generate triangles
        for (let ring = 0; ring < rings; ring++) {
            for (let segment = 0; segment < segments; segment++) {
                const first = ring * (segments + 1) + segment;
                const second = first + segments + 1;
                
                const v0 = vertices[first];
                const v1 = vertices[second];
                const v2 = vertices[second + 1];
                const v3 = vertices[first + 1];
                
                const normal = Vec3.normalize(v0);
                const color = this.getColorForSphere(ring, rings);
                
                triangles.push({ v0: first, v1: second, v2: first + 1, normal, color });
                triangles.push({ v0: second, v1: second + 1, v2: first + 1, normal, color });
            }
        }
        
        // Generate edges (simplified - just wireframe outline)
        const edges = [];
        
        return { vertices, edges, triangles };
    },

    /**
     * Generate a cylinder mesh
     * @param {number} radius - Radius of the cylinder
     * @param {number} height - Height of the cylinder
     * @param {number} segments - Number of segments around the circumference
     * @returns {Object} { vertices, edges, triangles }
     */
    cylinder(radius = 1, height = 2, segments = 16) {
        const vertices = [];
        const triangles = [];
        const halfHeight = height / 2;
        
        // Top and bottom center vertices
        const topCenter = vertices.length;
        vertices.push(new Vec3(0, halfHeight, 0));
        
        const bottomCenter = vertices.length;
        vertices.push(new Vec3(0, -halfHeight, 0));
        
        // Top and bottom rim vertices
        for (let i = 0; i < segments; i++) {
            const angle = (i * 2 * Math.PI) / segments;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            vertices.push(new Vec3(x, halfHeight, z));
            vertices.push(new Vec3(x, -halfHeight, z));
        }
        
        // Top cap triangles
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            triangles.push({
                v0: topCenter,
                v1: 2 + i * 2,
                v2: 2 + next * 2,
                normal: new Vec3(0, 1, 0),
                color: '#a8e6cf'
            });
        }
        
        // Bottom cap triangles
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            triangles.push({
                v0: bottomCenter,
                v1: 2 + next * 2 + 1,
                v2: 2 + i * 2 + 1,
                normal: new Vec3(0, -1, 0),
                color: '#dcedc1'
            });
        }
        
        // Side triangles
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            const v0 = 2 + i * 2;
            const v1 = 2 + i * 2 + 1;
            const v2 = 2 + next * 2 + 1;
            const v3 = 2 + next * 2;
            
            const edge = Vec3.sub(vertices[v1], vertices[v0]);
            const tangent = Vec3.sub(vertices[v3], vertices[v0]);
            const normal = Vec3.normalize(Vec3.cross(tangent, edge));
            
            const color = this.getColorForCylinder(i, segments);
            
            triangles.push({ v0, v1, v2, normal, color });
            triangles.push({ v0, v2, v3, normal, color });
        }
        
        const edges = [];
        return { vertices, edges, triangles };
    },

    /**
     * Generate a cone mesh
     * @param {number} radius - Radius of the cone base
     * @param {number} height - Height of the cone
     * @param {number} segments - Number of segments around the base
     * @returns {Object} { vertices, edges, triangles }
     */
    cone(radius = 1, height = 2, segments = 16) {
        const vertices = [];
        const triangles = [];
        
        // Apex vertex
        const apex = vertices.length;
        vertices.push(new Vec3(0, height / 2, 0));
        
        // Base center vertex
        const baseCenter = vertices.length;
        vertices.push(new Vec3(0, -height / 2, 0));
        
        // Base rim vertices
        for (let i = 0; i < segments; i++) {
            const angle = (i * 2 * Math.PI) / segments;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            vertices.push(new Vec3(x, -height / 2, z));
        }
        
        // Side triangles
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            const v0 = apex;
            const v1 = 2 + i;
            const v2 = 2 + next;
            
            const edge1 = Vec3.sub(vertices[v1], vertices[v0]);
            const edge2 = Vec3.sub(vertices[v2], vertices[v0]);
            const normal = Vec3.normalize(Vec3.cross(edge1, edge2));
            
            const color = this.getColorForCone(i, segments);
            
            triangles.push({ v0, v1, v2, normal, color });
        }
        
        // Base cap triangles
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            triangles.push({
                v0: baseCenter,
                v1: 2 + next,
                v2: 2 + i,
                normal: new Vec3(0, -1, 0),
                color: '#ffd3b6'
            });
        }
        
        const edges = [];
        return { vertices, edges, triangles };
    },

    /**
     * Generate a torus mesh
     * @param {number} majorRadius - Distance from center of tube to center of torus
     * @param {number} minorRadius - Radius of the tube
     * @param {number} majorSegments - Number of segments around the major axis
     * @param {number} minorSegments - Number of segments around the minor axis
     * @returns {Object} { vertices, edges, triangles }
     */
    torus(majorRadius = 2, minorRadius = 0.5, majorSegments = 16, minorSegments = 8) {
        const vertices = [];
        const triangles = [];
        
        for (let i = 0; i < majorSegments; i++) {
            const u = (i * 2 * Math.PI) / majorSegments;
            const cosU = Math.cos(u);
            const sinU = Math.sin(u);
            
            for (let j = 0; j < minorSegments; j++) {
                const v = (j * 2 * Math.PI) / minorSegments;
                const cosV = Math.cos(v);
                const sinV = Math.sin(v);
                
                const x = (majorRadius + minorRadius * cosV) * cosU;
                const y = minorRadius * sinV;
                const z = (majorRadius + minorRadius * cosV) * sinU;
                
                vertices.push(new Vec3(x, y, z));
            }
        }
        
        // Generate triangles
        for (let i = 0; i < majorSegments; i++) {
            const nextI = (i + 1) % majorSegments;
            
            for (let j = 0; j < minorSegments; j++) {
                const nextJ = (j + 1) % minorSegments;
                
                const v0 = i * minorSegments + j;
                const v1 = nextI * minorSegments + j;
                const v2 = nextI * minorSegments + nextJ;
                const v3 = i * minorSegments + nextJ;
                
                const p0 = vertices[v0];
                const p1 = vertices[v1];
                const p2 = vertices[v2];
                const p3 = vertices[v3];
                
                const edge1 = Vec3.sub(p1, p0);
                const edge2 = Vec3.sub(p3, p0);
                const normal = Vec3.normalize(Vec3.cross(edge1, edge2));
                
                const color = this.getColorForTorus(i, j, majorSegments, minorSegments);
                
                triangles.push({ v0, v1, v2, normal, color });
                triangles.push({ v0, v2, v3, normal, color });
            }
        }
        
        const edges = [];
        return { vertices, edges, triangles };
    },

    // Helper functions
    quadToTriangles(quad) {
        const { v0, v1, v2, v3, normal, color } = quad;
        return [
            { v0, v1, v2, normal, color },
            { v0, v2, v3, normal, color }
        ];
    },

    getColorForSphere(ring, rings) {
        const t = ring / rings;
        const r = Math.round(100 + 155 * t);
        const g = Math.round(100 + 100 * (1 - t));
        const b = 200;
        return `rgb(${r}, ${g}, ${b})`;
    },

    getColorForCylinder(segment, segments) {
        const t = segment / segments;
        const r = Math.round(200 * t);
        const g = Math.round(150 + 100 * (1 - t));
        const b = 150;
        return `rgb(${r}, ${g}, ${b})`;
    },

    getColorForCone(segment, segments) {
        const t = segment / segments;
        const r = 255;
        const g = Math.round(200 * (1 - t));
        const b = Math.round(150 * t);
        return `rgb(${r}, ${g}, ${b})`;
    },

    getColorForTorus(i, j, majorSegments, minorSegments) {
        const u = i / majorSegments;
        const v = j / minorSegments;
        const r = Math.round(200 * u);
        const g = Math.round(100 + 100 * v);
        const b = Math.round(150 + 100 * (1 - u));
        return `rgb(${r}, ${g}, ${b})`;
    }
};

export function generateCube(size = 1) {
    return ObjectGenerators.cube(size);
}

export function generateSphere(radius = 1, segments = 16, rings = 16) {
    return ObjectGenerators.sphere(radius, segments, rings);
}

export function generateCylinder(radius = 1, height = 2, segments = 16) {
    return ObjectGenerators.cylinder(radius, height, segments);
}

export function generateCone(radius = 1, height = 2, segments = 16) {
    return ObjectGenerators.cone(radius, height, segments);
}

export function generateTorus(majorRadius = 2, minorRadius = 0.5, majorSegments = 16, minorSegments = 8) {
    return ObjectGenerators.torus(majorRadius, minorRadius, majorSegments, minorSegments);
}
