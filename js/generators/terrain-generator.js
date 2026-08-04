/**
 * Terrain Generator Module
 * Generates heightmap-based terrain using various algorithms
 */

import { Vec3 } from '../core/math3d.js';

export class TerrainGenerator {
    constructor() {
        this.seed = Math.random();
        this.width = 64;
        this.depth = 64;
        this.scale = 1;
        this.heightScale = 1;
    }

    setSeed(seed) {
        this.seed = seed;
    }

    /**
     * Generate terrain using simple noise
     * @param {number} width - Width of terrain grid
     * @param {number} depth - Depth of terrain grid
     * @param {number} scale - Scale factor for coordinates
     * @param {number} heightScale - Maximum height multiplier
     * @returns {Object} { heights: number[][], vertices: Vec3[], triangles: Array }
     */
    generate(width = 64, depth = 64, scale = 0.1, heightScale = 10) {
        this.width = width;
        this.depth = depth;
        this.scale = scale;
        this.heightScale = heightScale;

        const heights = [];
        const vertices = [];
        const triangles = [];

        // Generate height values
        for (let x = 0; x < width; x++) {
            heights[x] = [];
            for (let z = 0; z < depth; z++) {
                const height = this.getNoise(x * scale, z * scale);
                heights[x][z] = height * heightScale;
                
                vertices.push(new Vec3(
                    x - width / 2,
                    heights[x][z],
                    z - depth / 2
                ));
            }
        }

        // Generate triangles
        for (let x = 0; x < width - 1; x++) {
            for (let z = 0; z < depth - 1; z++) {
                const idx = x * depth + z;
                const nextRow = (x + 1) * depth + z;

                // First triangle
                triangles.push({
                    v0: idx,
                    v1: nextRow,
                    v2: idx + 1,
                    normal: this.calculateNormal(vertices, idx, nextRow, idx + 1),
                    color: this.getTerrainColor(heights[x][z])
                });

                // Second triangle
                triangles.push({
                    v0: nextRow,
                    v1: nextRow + 1,
                    v2: idx + 1,
                    normal: this.calculateNormal(vertices, nextRow, nextRow + 1, idx + 1),
                    color: this.getTerrainColor(heights[x][z])
                });
            }
        }

        return { heights, vertices, triangles };
    }

    /**
     * Simple pseudo-random noise function
     */
    getNoise(x, z) {
        const n = Math.sin(x * 12.9898 + z * 78.233 + this.seed) * 43758.5453;
        const noise1 = n - Math.floor(n);
        
        const n2 = Math.sin(x * 17.3421 + z * 91.7342 + this.seed * 2) * 32145.2341;
        const noise2 = n2 - Math.floor(n2);
        
        // Combine multiple frequencies for more natural look
        return (noise1 * 0.7 + noise2 * 0.3);
    }

    /**
     * Generate terrain with multiple octaves of noise (fractal brownian motion)
     */
    generateFractal(width = 64, depth = 64, scale = 0.1, heightScale = 10, octaves = 4) {
        this.width = width;
        this.depth = depth;
        this.scale = scale;
        this.heightScale = heightScale;

        const heights = [];
        const vertices = [];
        const triangles = [];

        for (let x = 0; x < width; x++) {
            heights[x] = [];
            for (let z = 0; z < depth; z++) {
                let height = 0;
                let amplitude = 1;
                let frequency = 1;
                let maxValue = 0;

                for (let o = 0; o < octaves; o++) {
                    height += this.getNoise(x * scale * frequency, z * scale * frequency) * amplitude;
                    maxValue += amplitude;
                    amplitude *= 0.5;
                    frequency *= 2;
                }

                height /= maxValue;
                heights[x][z] = height * heightScale;

                vertices.push(new Vec3(
                    x - width / 2,
                    heights[x][z],
                    z - depth / 2
                ));
            }
        }

        // Generate triangles (same as above)
        for (let x = 0; x < width - 1; x++) {
            for (let z = 0; z < depth - 1; z++) {
                const idx = x * depth + z;
                const nextRow = (x + 1) * depth + z;

                triangles.push({
                    v0: idx,
                    v1: nextRow,
                    v2: idx + 1,
                    normal: this.calculateNormal(vertices, idx, nextRow, idx + 1),
                    color: this.getTerrainColor(heights[x][z])
                });

                triangles.push({
                    v0: nextRow,
                    v1: nextRow + 1,
                    v2: idx + 1,
                    normal: this.calculateNormal(vertices, nextRow, nextRow + 1, idx + 1),
                    color: this.getTerrainColor(heights[x][z])
                });
            }
        }

        return { heights, vertices, triangles };
    }

    calculateNormal(vertices, i0, i1, i2) {
        const v0 = vertices[i0];
        const v1 = vertices[i1];
        const v2 = vertices[i2];

        const edge1 = Vec3.sub(v1, v0);
        const edge2 = Vec3.sub(v2, v0);
        return Vec3.normalize(Vec3.cross(edge1, edge2));
    }

    getTerrainColor(height) {
        // Color based on height
        if (height < 0.2) {
            return '#4a6fa5'; // Water/deep
        } else if (height < 0.35) {
            return '#e0c896'; // Sand/beach
        } else if (height < 0.6) {
            return '#5a8f3a'; // Grass
        } else if (height < 0.8) {
            return '#6b6b6b'; // Rock
        } else {
            return '#ffffff'; // Snow
        }
    }

    /**
     * Generate a diamond-square heightmap
     */
    generateDiamondSquare(size = 64, roughness = 0.5) {
        const sideLength = size + 1;
        const heights = new Array(sideLength).fill(0).map(() => new Array(sideLength).fill(0));

        // Initialize corners
        heights[0][0] = Math.random();
        heights[0][sideLength - 1] = Math.random();
        heights[sideLength - 1][0] = Math.random();
        heights[sideLength - 1][sideLength - 1] = Math.random();

        let step = sideLength - 1;
        let scale = 1;

        while (step > 1) {
            const half = Math.floor(step / 2);

            // Diamond step
            for (let y = 0; y < sideLength - 1; y += step) {
                for (let x = 0; x < sideLength - 1; x += step) {
                    const avg = (heights[y][x] + heights[y][x + step] +
                                heights[y + step][x] + heights[y + step][x + step]) / 4;
                    heights[y + half][x + half] = avg + (Math.random() - 0.5) * scale;
                }
            }

            // Square step
            for (let y = 0; y < sideLength; y += half) {
                for (let x = (y % step === 0 ? 0 : half); x < sideLength; x += step) {
                    let sum = 0;
                    let count = 0;

                    if (y >= half) { sum += heights[y - half][x]; count++; }
                    if (y + half < sideLength) { sum += heights[y + half][x]; count++; }
                    if (x >= half) { sum += heights[y][x - half]; count++; }
                    if (x + half < sideLength) { sum += heights[y][x + half]; count++; }

                    heights[y][x] = sum / count + (Math.random() - 0.5) * scale;
                }
            }

            step = half;
            scale *= roughness;
        }

        // Normalize heights to [0, 1]
        let min = Infinity, max = -Infinity;
        for (let y = 0; y < sideLength; y++) {
            for (let x = 0; x < sideLength; x++) {
                min = Math.min(min, heights[y][x]);
                max = Math.max(max, heights[y][x]);
            }
        }

        for (let y = 0; y < sideLength; y++) {
            for (let x = 0; x < sideLength; x++) {
                heights[y][x] = (heights[y][x] - min) / (max - min);
            }
        }

        return heights;
    }
}

export function createTerrainGenerator() {
    return new TerrainGenerator();
}

export function generateSimpleTerrain(width = 32, depth = 32, heightScale = 5) {
    const generator = new TerrainGenerator();
    return generator.generate(width, depth, 0.1, heightScale);
}

export function generateFractalTerrain(width = 64, depth = 64, heightScale = 10, octaves = 4) {
    const generator = new TerrainGenerator();
    return generator.generateFractal(width, depth, 0.1, heightScale, octaves);
}
