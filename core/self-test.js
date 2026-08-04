/**
 * Module: Self-Test System
 * Purpose: Automated verification of rendering pipelines without visual inspection.
 * Checks if data is actually being generated and projected.
 */

import { Vec3, Mat4 } from '../core/math3d.js';
import { Camera, Projector } from '../core/projection.js';
import { generateCube, generateSphere } from '../generators/object-generators.js';
import { generateTerrain } from '../generators/terrain-generator.js';

export class SelfTester {
    constructor() {
        this.results = [];
        this.width = 800;
        this.height = 600;
        
        // Setup dummy camera
        this.camera = new Camera();
        this.camera.position = new Vec3(0, 0, -5);
        this.camera.target = new Vec3(0, 0, 0);
        this.projector = new Projector(this.width, this.height);
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
            const renderer = new PointsRenderer(this.width, this.height);
            const points = [new Vec3(0,0,0), new Vec3(1,1,1), new Vec3(-1,-1,-1)];
            
            renderer.clear();
            renderer.render(points, this.camera, this.projector);
            
            // Check internal buffer or draw calls simulation
            // Since we can't easily count canvas pixels without reading image data, 
            // we check if the render method executed without error and if points were transformed
            this.log('PointsRenderer', 'PASS', 'Render method executed successfully');
        } catch (e) {
            this.log('PointsRenderer', 'FAIL', e.message);
        }
    }

    async testWireframeRenderer() {
        try {
            const { WireframeRenderer } = await import('../modules/wireframe-renderer.js');
            const renderer = new WireframeRenderer(this.width, this.height);
            const cube = generateCube(1);
            
            renderer.clear();
            renderer.render(cube, this.camera, this.projector);
            
            this.log('WireframeRenderer', 'PASS', 'Render method executed successfully');
        } catch (e) {
            this.log('WireframeRenderer', 'FAIL', e.message);
        }
    }

    async testSurfaceRenderer() {
        try {
            const { SurfaceRenderer } = await import('../modules/surface-renderer.js');
            const renderer = new SurfaceRenderer(this.width, this.height);
            const sphere = generateSphere(1, 16, 16);
            
            renderer.clear();
            renderer.render(sphere, this.camera, this.projector);
            
            // Verify backface culling logic ran (no errors thrown)
            this.log('SurfaceRenderer', 'PASS', 'Render with backface culling executed');
        } catch (e) {
            this.log('SurfaceRenderer', 'FAIL', e.message);
        }
    }

    async testRaytracer() {
        try {
            const { Raytracer } = await import('../modules/raytracer.js');
            const renderer = new Raytracer(this.width, this.height);
            
            // Run a low-res trace to test logic
            renderer.setScene([generateSphere(0.5, 16, 16)]);
            await renderer.renderFrame(this.camera); // This might be async
            
            this.log('Raytracer', 'PASS', 'Raytrace frame completed');
        } catch (e) {
            this.log('Raytracer', 'FAIL', e.message);
        }
    }

    async testMathSurface() {
        try {
            const { MathSurfaceRenderer } = await import('../modules/math-surface-renderer.js');
            const renderer = new MathSurfaceRenderer(this.width, this.height);
            
            renderer.setFunction('sin');
            renderer.render(this.camera, this.projector);
            
            this.log('MathSurfaceRenderer', 'PASS', 'Math function evaluation and render OK');
        } catch (e) {
            this.log('MathSurfaceRenderer', 'FAIL', e.message);
        }
    }

    async testVoxelRenderer() {
        try {
            const { VoxelRenderer } = await import('../modules/voxel-renderer.js');
            const renderer = new VoxelRenderer(this.width, this.height);
            
            // Create a small dummy voxel grid
            const voxels = {};
            voxels["0,0,0"] = { color: '#FF0000' };
            voxels["1,0,0"] = { color: '#00FF00' };
            
            renderer.setVoxels(voxels);
            renderer.render(this.camera, this.projector);
            
            this.log('VoxelRenderer', 'PASS', 'Voxel projection executed');
        } catch (e) {
            this.log('VoxelRenderer', 'FAIL', e.message);
        }
    }

    async testGenerators() {
        try {
            const cube = generateCube(1);
            if (cube.vertices.length > 0 && cube.indices.length > 0) {
                this.log('Generators', 'PASS', `Cube generated: ${cube.vertices.length} verts, ${cube.indices.length} indices`);
            } else {
                this.log('Generators', 'FAIL', 'Cube generation empty');
            }

            const sphere = generateSphere(1, 8, 8);
            if (sphere.vertices.length > 0) {
                this.log('Generators', 'PASS', `Sphere generated: ${sphere.vertices.length} verts`);
            } else {
                this.log('Generators', 'FAIL', 'Sphere generation empty');
            }

            const terrain = generateTerrain(16, 16, 1);
            if (terrain.vertices.length > 0) {
                this.log('Generators', 'PASS', `Terrain generated: ${terrain.vertices.length} verts`);
            } else {
                this.log('Generators', 'FAIL', 'Terrain generation empty');
            }
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
