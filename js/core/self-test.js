/**
 * Module: Self-Test System
 * Purpose: Automated verification of rendering pipelines without visual inspection.
 * Checks if data is actually being generated and projected.
 */

import { Vec3, Mat4 } from './math3d.js';
import { Camera, Projector } from './projection.js';
import { generateCube, generateSphere } from '../generators/object-generators.js';
import { generateSimpleTerrain as generateTerrain } from '../generators/terrain-generator.js';

export class SelfTester {
    constructor() {
        this.results = [];
        this.width = 800;
        this.height = 600;
        
        // Setup dummy camera
        this.camera = new Camera();
        this.camera.position = new Vec3(0, 0, -5);
        this.camera.target = new Vec3(0, 0, 0);
        this.projector = new Projector(this.camera);
        this.projector.setViewport(this.width, this.height);
    }

    async runAllTests() {
        this.results = [];
        console.log("--- Starting Self-Test Suite ---");
        
        this.testMathCore();
        this.testProjection();
        await this.testPointsRenderer();
        await this.testWireframeRenderer();
        await this.testSurfaceRenderer();
        await this.testRaytracer();
        await this.testMathSurface();
        await this.testVoxelRenderer();
        await this.testGenerators();
        
        this.printResults();
        return this.results;
    }

    log(module, status, message) {
        const result = { module, status, message, timestamp: Date.now() };
        this.results.push(result);
        console.log(`[${status}] ${module}: ${message}`);
    }

    testMathCore() {
        try {
            const v1 = new Vec3(1, 2, 3);
            const v2 = new Vec3(4, 5, 6);
            const sum = v1.add(v2);
            if (sum.x === 5 && sum.y === 7 && sum.z === 9) {
                this.log('MathCore', 'PASS', 'Vec3 operations correct');
            } else {
                this.log('MathCore', 'FAIL', 'Vec3 addition incorrect');
            }

            const m = Mat4.identity();
            if (m.data[0] === 1 && m.data[5] === 1) {
                this.log('MathCore', 'PASS', 'Mat4 identity correct');
            } else {
                this.log('MathCore', 'FAIL', 'Mat4 identity broken');
            }
        } catch (e) {
            this.log('MathCore', 'FAIL', e.message);
        }
    }

    testProjection() {
        try {
            const point = new Vec3(0, 0, -2); // Point in front of camera
            const proj = this.projector.project(point, this.camera.getViewMatrix(), this.camera.getProjectionMatrix());
            
            if (proj && proj.x !== undefined && proj.y !== undefined) {
                // Check if point is within reasonable screen bounds after projection
                if (proj.x >= -1 && proj.x <= 1 && proj.y >= -1 && proj.y <= 1) {
                    this.log('Projection', 'PASS', `Point projected to screen coords: (${proj.x.toFixed(2)}, ${proj.y.toFixed(2)})`);
                } else {
                    this.log('Projection', 'WARN', `Point projected outside clip space: (${proj.x}, ${proj.y})`);
                }
            } else {
                this.log('Projection', 'FAIL', 'Projection returned null/undefined');
            }
        } catch (e) {
            this.log('Projection', 'FAIL', e.message);
        }
    }

    async testPointsRenderer() {
        try {
            const { PointsRenderer } = await import('../modules/points-renderer.js');
            // Create a temporary canvas for testing
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.width;
            tempCanvas.height = this.height;
            const renderer = new PointsRenderer(tempCanvas);
            const points = [new Vec3(0,0,0), new Vec3(1,1,1), new Vec3(-1,-1,-1)];
            
            // Project points first
            const viewMatrix = this.camera.getViewMatrix();
            const projMatrix = this.camera.getProjectionMatrix();
            const projectedPoints = this.projector.projectPoints(points, null, viewMatrix, projMatrix);
            
            // Filter out null projections (points behind camera)
            const validPoints = projectedPoints.filter(p => p !== null);
            
            renderer.clear();
            if (validPoints.length > 0) {
                renderer.render(validPoints);
                this.log('PointsRenderer', 'PASS', 'Render method executed successfully');
            } else {
                this.log('PointsRenderer', 'WARN', 'All points were behind camera or culled');
            }
        } catch (e) {
            this.log('PointsRenderer', 'FAIL', e.message);
        }
    }

    async testWireframeRenderer() {
        try {
            const { WireframeRenderer } = await import('../modules/wireframe-renderer.js');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.width;
            tempCanvas.height = this.height;
            const renderer = new WireframeRenderer(tempCanvas);
            const cube = generateCube(1);
            
            // Project vertices first
            const viewMatrix = this.camera.getViewMatrix();
            const projMatrix = this.camera.getProjectionMatrix();
            const projectedVertices = this.projector.projectPoints(cube.vertices, null, viewMatrix, projMatrix);
            
            // Filter out null projections
            const validVertices = projectedVertices.filter(v => v !== null);
            
            renderer.clear();
            if (validVertices.length > 0) {
                renderer.render(validVertices);
                this.log('WireframeRenderer', 'PASS', 'Render method executed successfully');
            } else {
                this.log('WireframeRenderer', 'WARN', 'All vertices were behind camera or culled');
            }
        } catch (e) {
            this.log('WireframeRenderer', 'FAIL', e.message);
        }
    }

    async testSurfaceRenderer() {
        try {
            const { SurfaceRenderer } = await import('../modules/surface-renderer.js');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.width;
            tempCanvas.height = this.height;
            const renderer = new SurfaceRenderer(tempCanvas);
            const sphere = generateSphere(1, 16, 16);
            
            if (!sphere || !sphere.vertices || sphere.vertices.length === 0) {
                throw new Error("Sphere generation failed");
            }
            
            // Project vertices first
            const viewMatrix = this.camera.getViewMatrix();
            const projMatrix = this.camera.getProjectionMatrix();
            const projectedVertices = this.projector.projectPoints(sphere.vertices, null, viewMatrix, projMatrix);
            
            // Filter out null projections
            const validVertices = projectedVertices.filter(v => v !== null);
            
            // Convert indices to triangles format expected by renderer
            const triangles = [];
            if (sphere.indices && sphere.indices.length > 0) {
                for (let i = 0; i < sphere.indices.length; i += 3) {
                    triangles.push({
                        v0: sphere.indices[i],
                        v1: sphere.indices[i + 1],
                        v2: sphere.indices[i + 2],
                        color: '#cccccc'
                    });
                }
            } else if (sphere.triangles && sphere.triangles.length > 0) {
                // Use triangles directly if indices are not available
                sphere.triangles.forEach(tri => {
                    triangles.push({
                        v0: tri.v0,
                        v1: tri.v1,
                        v2: tri.v2,
                        color: tri.color || '#cccccc'
                    });
                });
            }
            
            renderer.clear();
            if (validVertices.length > 0 && triangles.length > 0) {
                renderer.render(validVertices, triangles, viewMatrix);
                this.log('SurfaceRenderer', 'PASS', 'Render with backface culling executed');
            } else {
                this.log('SurfaceRenderer', 'WARN', `No valid data: ${validVertices.length} verts, ${triangles.length} triangles`);
            }
        } catch (e) {
            this.log('SurfaceRenderer', 'FAIL', e.message);
        }
    }

    async testRaytracer() {
        try {
            const { RayTracer, Sphere } = await import('../modules/raytracer.js');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 200; // Use smaller size for faster test
            tempCanvas.height = 150;
            const renderer = new RayTracer(tempCanvas);
            
            // Add a sphere to the scene
            const sphere = new Sphere(new Vec3(0, 0, -5), 1, '#ff0000');
            renderer.addObject(sphere);
            
            renderer.render(this.camera, this.projector);
            
            this.log('Raytracer', 'PASS', 'Raytrace frame completed');
        } catch (e) {
            this.log('Raytracer', 'FAIL', e.message);
        }
    }

    async testMathSurface() {
        try {
            const { MathSurfaceRenderer, MathFunctions } = await import('../modules/math-surface-renderer.js');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.width;
            tempCanvas.height = this.height;
            const renderer = new MathSurfaceRenderer(tempCanvas);
            
            // Check if MathFunctions.sin exists, otherwise use a default function
            const func = MathFunctions.sine || MathFunctions.sin || ((x, y) => Math.sin(x) * Math.cos(y));
            renderer.setFunction(func);
            
            // Generate and project vertices
            const surface = renderer.surface;
            const viewMatrix = this.camera.getViewMatrix();
            const projMatrix = this.camera.getProjectionMatrix();
            const projectedVertices = this.projector.projectPoints(surface.vertices, null, viewMatrix, projMatrix);
            
            // Filter out null projections
            const validVertices = projectedVertices.filter(v => v !== null);
            
            if (validVertices.length > 0 && surface.triangles.length > 0) {
                renderer.render(validVertices, surface.triangles, viewMatrix);
                this.log('MathSurfaceRenderer', 'PASS', 'Math function evaluation and render OK');
            } else {
                this.log('MathSurfaceRenderer', 'WARN', 'No valid vertices or triangles to render');
            }
        } catch (e) {
            this.log('MathSurfaceRenderer', 'FAIL', e.message);
        }
    }

    async testVoxelRenderer() {
        try {
            const { VoxelRenderer, VoxelScene, Voxel } = await import('../modules/voxel-renderer.js');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.width;
            tempCanvas.height = this.height;
            const renderer = new VoxelRenderer(tempCanvas);
            
            // Create a small dummy voxel scene
            const scene = new VoxelScene();
            const v1 = new Voxel(0, 0, -3, '#FF0000');
            const v2 = new Voxel(1, 0, -3, '#00FF00');
            const v3 = new Voxel(0, 1, -3, '#0000FF');
            scene.addVoxel(v1);
            scene.addVoxel(v2);
            scene.addVoxel(v3);
            
            renderer.setScene(scene);
            
            // Collect all vertices from voxels
            const allVertices = [];
            scene.voxels.forEach(voxel => {
                if (typeof voxel.getVertices === 'function') {
                    allVertices.push(...voxel.getVertices());
                }
            });
            
            if (allVertices.length === 0) {
                this.log('VoxelRenderer', 'WARN', 'No voxel vertices generated');
                return;
            }
            
            const viewMatrix = this.camera.getViewMatrix();
            const projMatrix = this.camera.getProjectionMatrix();
            const projectedVertices = this.projector.projectPoints(allVertices, null, viewMatrix, projMatrix);
            
            // Filter out null projections
            const validVertices = projectedVertices.filter(v => v !== null);
            
            if (validVertices.length > 0) {
                renderer.render(validVertices, viewMatrix);
                this.log('VoxelRenderer', 'PASS', 'Voxel projection executed');
            } else {
                this.log('VoxelRenderer', 'WARN', 'No valid voxel vertices to render');
            }
        } catch (e) {
            this.log('VoxelRenderer', 'FAIL', e.message);
        }
    }

    async testGenerators() {
        try {
            const cube = generateCube(1);
            if (!cube || !cube.vertices || cube.vertices.length === 0) {
                throw new Error("Cube has no vertices");
            }
            if (!cube.indices || cube.indices.length === 0) {
                // Some generators use triangles instead of indices
                if (!cube.triangles || cube.triangles.length === 0) {
                    throw new Error("Cube has no indices or triangles");
                }
            }
            this.log('Generators', 'PASS', `Cube generated: ${cube.vertices.length} verts`);

            const sphere = generateSphere(1, 8, 8);
            if (!sphere || !sphere.vertices || sphere.vertices.length === 0) {
                throw new Error("Sphere has no vertices");
            }
            this.log('Generators', 'PASS', `Sphere generated: ${sphere.vertices.length} verts`);

            const terrain = generateTerrain(16, 16, 1);
            if (!terrain || !terrain.vertices || terrain.vertices.length === 0) {
                throw new Error("Terrain has no vertices");
            }
            this.log('Generators', 'PASS', `Terrain generated: ${terrain.vertices.length} verts`);
        } catch (e) {
            this.log('Generators', 'FAIL', e.message);
        }
    }

    printResults() {
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const total = this.results.length;
        console.log(`--- Test Suite Finished: ${passed}/${total} Passed ---`);
        
        // Update UI Overlay if exists
        const overlay = document.getElementById('test-overlay');
        if (overlay) {
            overlay.innerHTML = `
                <h3>Self-Test Results</h3>
                <div class="summary">${passed}/${total} Passed</div>
                <ul>
                    ${this.results.map(r => `
                        <li class="${r.status === 'PASS' ? 'pass' : 'fail'}">
                            <strong>${r.module}</strong>: ${r.message}
                        </li>
                    `).join('')}
                </ul>
            `;
            overlay.style.display = 'block';
        }
    }
}

// Auto-run on load if needed, or expose to window
window.runSelfTest = async () => {
    const tester = new SelfTester();
    await tester.runAllTests();
};

console.log("SelfTest module loaded. Call window.runSelfTest() to verify engines.");
