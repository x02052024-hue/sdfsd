/**
 * Main Application Module
 * Initializes and coordinates all 3D graphics modules
 */

import { Vec3, Mat4, Transform } from './core/math3d.js';
import { Camera, Projector } from './core/projection.js';
import { PointsRenderer } from './modules/points-renderer.js';
import { WireframeRenderer } from './modules/wireframe-renderer.js';
import { SurfaceRenderer } from './modules/surface-renderer.js';
import { RayTracer, Sphere, Plane } from './modules/raytracer.js';
import { MathSurfaceRenderer, MathFunctions } from './modules/math-surface-renderer.js';
import { VoxelRenderer, VoxelScene, Voxel } from './modules/voxel-renderer.js';
import { ObjectGenerators } from './generators/object-generators.js';
import { TerrainGenerator } from './generators/terrain-generator.js';
import { UIManager } from './ui/ui-manager.js';
import { SelfTester } from './core/self-test.js';

class Application {
    constructor() {
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.camera = new Camera();
        this.projector = new Projector(this.camera);
        
        this.uiManager = new UIManager();
        
        // Renderers
        this.pointsRenderer = new PointsRenderer(this.canvas);
        this.wireframeRenderer = new WireframeRenderer(this.canvas);
        this.surfaceRenderer = new SurfaceRenderer(this.canvas);
        this.rayTracer = new RayTracer(this.canvas);
        this.mathSurfaceRenderer = new MathSurfaceRenderer(this.canvas);
        this.voxelRenderer = new VoxelRenderer(this.canvas);
        
        // Current state
        this.currentModule = null;
        this.animationId = null;
        this.rotationY = 0;
        this.rotationX = 0.3;
        
        // Demo objects
        this.cubeMesh = null;
        this.sphereMesh = null;
        
        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Generate demo meshes
        this.cubeMesh = ObjectGenerators.cube(2);
        this.sphereMesh = ObjectGenerators.sphere(1.5, 16, 16);
        
        // Setup module callbacks
        this.setupModuleCallbacks();
        
        // Add self-test button to UI
        this.addSelfTestButton();
        // Start with perspective module
        this.uiManager.activateModule('perspective');
        
        // Start animation loop
        this.animate();
    }

    addSelfTestButton() {
        // Also attach to existing button in HTML if present
        const existingBtn = document.getElementById('run-self-test-btn');
        if (existingBtn) {
            existingBtn.onclick = async () => {
                console.log("Running self-tests...");
                const tester = new SelfTester();
                await tester.runAllTests();
            };
        }
        
        // Add additional button to controls panel
        const controlsPanel = document.getElementById('module-controls');
        const testBtn = document.createElement('button');
        testBtn.textContent = '🧪 Run Self-Test';
        testBtn.style.background = '#9b59b6';
        testBtn.style.marginTop = '1rem';
        testBtn.onclick = async () => {
            console.log("Running self-tests from panel...");
            const tester = new SelfTester();
            await tester.runAllTests();
        };
        controlsPanel.appendChild(testBtn);
    }

    resizeCanvas() {
        const container = document.getElementById('canvas-container');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.projector.setViewport(this.canvas.width, this.canvas.height);
    }

    setupModuleCallbacks() {
        // Perspective module
        this.uiManager.onModuleActivate('perspective', () => {
            this.currentModule = 'perspective';
            this.setupPerspectiveControls();
        });

        // Points module
        this.uiManager.onModuleActivate('points', () => {
            this.currentModule = 'points';
            this.setupPointsControls();
        });

        // Wireframe module
        this.uiManager.onModuleActivate('wireframe', () => {
            this.currentModule = 'wireframe';
            this.setupWireframeControls();
        });

        // Surface module
        this.uiManager.onModuleActivate('surface', () => {
            this.currentModule = 'surface';
            this.setupSurfaceControls();
        });

        // Ray tracing module
        this.uiManager.onModuleActivate('raytracing', () => {
            this.currentModule = 'raytracing';
            this.setupRayTracingControls();
        });

        // Math surface module
        this.uiManager.onModuleActivate('math-surface', () => {
            this.currentModule = 'math-surface';
            this.setupMathSurfaceControls();
        });

        // Voxel module
        this.uiManager.onModuleActivate('voxel', () => {
            this.currentModule = 'voxel';
            this.setupVoxelControls();
        });

        // Generators module
        this.uiManager.onModuleActivate('generators', () => {
            this.currentModule = 'generators';
            this.setupGeneratorsControls();
        });

        // Terrain module
        this.uiManager.onModuleActivate('terrain', () => {
            this.currentModule = 'terrain';
            this.setupTerrainControls();
        });
    }

    setupPerspectiveControls() {
        const controls = document.getElementById('module-controls');
        controls.innerHTML = '';
        
        const group = this.uiManager.createControlGroup('Camera Settings');
        controls.appendChild(group);
        
        this.uiManager.addSlider(group, 'Camera Distance', 3, 15, 0.1, 5, (v) => {
            this.camera.position.z = v;
        });
        
        this.uiManager.addSlider(group, 'FOV', 30, 120, 1, 60, (v) => {
            this.camera.fov = v * Math.PI / 180;
        });
        
        this.uiManager.addInfoText(group, 'Perspective projection demonstration');
    }

    setupPointsControls() {
        const controls = document.getElementById('module-controls');
        controls.innerHTML = '';
        
        const group = this.uiManager.createControlGroup('Points Settings');
        controls.appendChild(group);
        
        this.uiManager.addSlider(group, 'Point Size', 1, 10, 1, 3, (v) => {
            this.pointsRenderer.setPointSize(v);
        });
        
        this.uiManager.addCheckbox(group, 'Show Coordinates', false, (v) => {
            this.pointsRenderer.toggleCoordinates(v);
        });
        
        this.uiManager.addInfoText(group, 'Displays 3D points projected to 2D screen');
    }

    setupWireframeControls() {
        const controls = document.getElementById('module-controls');
        controls.innerHTML = '';
        
        // Set default cube mesh if not already set
        if (!this.wireframeRenderer.vertices.length) {
            this.wireframeRenderer.setMesh(this.cubeMesh.vertices, this.cubeMesh.edges);
        }
        
        const group = this.uiManager.createControlGroup('Wireframe Settings');
        controls.appendChild(group);
        
        this.uiManager.addCheckbox(group, 'Show Vertices', true, (v) => {
            this.wireframeRenderer.toggleVertices(v);
        });
        
        this.uiManager.addSlider(group, 'Line Width', 0.5, 5, 0.5, 1, (v) => {
            this.wireframeRenderer.setLineWidth(v);
        });
        
        this.uiManager.addInfoText(group, 'Renders wireframe mesh with edges and vertices');
    }

    setupSurfaceControls() {
        const controls = document.getElementById('module-controls');
        controls.innerHTML = '';
        
        // Set default sphere mesh for surface rendering
        if (!this.surfaceRenderer.vertices.length) {
            this.surfaceRenderer.setMesh(this.sphereMesh.vertices, this.sphereMesh.triangles);
        }
        
        const group = this.uiManager.createControlGroup('Surface Settings');
        controls.appendChild(group);
        
        this.uiManager.addCheckbox(group, 'Backface Culling', true, (v) => {
            this.surfaceRenderer.toggleBackfaceCulling(v);
        });
        
        this.uiManager.addCheckbox(group, 'Depth Sorting', true, (v) => {
            this.surfaceRenderer.toggleDepthSort(v);
        });
        
        this.uiManager.addCheckbox(group, 'Wireframe Mode', false, (v) => {
            this.surfaceRenderer.toggleWireframe(v);
        });
        
        this.uiManager.addInfoText(group, 'Renders triangulated surfaces with visibility testing');
    }

    setupRayTracingControls() {
        const controls = document.getElementById('module-controls');
        controls.innerHTML = '';
        
        const group = this.uiManager.createControlGroup('Ray Tracing Settings');
        controls.appendChild(group);
        
        this.uiManager.addSlider(group, 'Ambient Light', 0, 1, 0.05, 0.2, (v) => {
            this.rayTracer.setAmbientLight(v);
        });
        
        this.uiManager.addButton(group, 'Re-render', () => {
            this.renderRayTracing();
        });
        
        // Initial render
        setTimeout(() => this.renderRayTracing(), 100);
        
        this.uiManager.addInfoText(group, 'Basic ray tracing with spheres and planes');
    }

    setupMathSurfaceControls() {
        const controls = document.getElementById('module-controls');
        controls.innerHTML = '';
        
        const group = this.uiManager.createControlGroup('Math Surface Settings');
        controls.appendChild(group);
        
        const functions = [
            { value: 'sine', label: 'Sine Wave' },
            { value: 'ripple', label: 'Ripple' },
            { value: 'saddle', label: 'Saddle' },
            { value: 'gaussian', label: 'Gaussian' },
            { value: 'peaks', label: 'Peaks' },
            { value: 'spiral', label: 'Spiral' }
        ];
        
        this.uiManager.addSelect(group, 'Function', functions, 'sine', (v) => {
            this.mathSurfaceRenderer.setFunction(MathFunctions[v]);
        });
        
        this.uiManager.addInfoText(group, 'Surfaces defined by mathematical functions z = f(x,y)');
    }

    setupVoxelControls() {
        const controls = document.getElementById('module-controls');
        controls.innerHTML = '';
        
        const group = this.uiManager.createControlGroup('Voxel Settings');
        controls.appendChild(group);
        
        this.uiManager.addCheckbox(group, 'Show Edges', true, (v) => {
            this.voxelRenderer.showEdges = v;
        });
        
        this.uiManager.addButton(group, 'Generate Box', () => {
            this.generateVoxelBox();
        });
        
        // Initial voxel box
        setTimeout(() => this.generateVoxelBox(), 100);
        
        this.uiManager.addInfoText(group, 'Voxel-based rendering with occlusion culling');
    }

    setupGeneratorsControls() {
        const controls = document.getElementById('module-controls');
        controls.innerHTML = '';
        
        const group = this.uiManager.createControlGroup('Object Generators');
        controls.appendChild(group);
        
        this.uiManager.addButton(group, 'Generate Cube', () => {
            this.currentModule = 'wireframe';
            this.wireframeRenderer.setMesh(this.cubeMesh.vertices, this.cubeMesh.edges);
        });
        
        this.uiManager.addButton(group, 'Generate Sphere', () => {
            this.currentModule = 'wireframe';
            this.wireframeRenderer.setMesh(this.sphereMesh.vertices, this.sphereMesh.edges);
        });
        
        this.uiManager.addInfoText(group, 'Generate common 3D shapes');
    }

    setupTerrainControls() {
        const controls = document.getElementById('module-controls');
        controls.innerHTML = '';
        
        const group = this.uiManager.createControlGroup('Terrain Settings');
        controls.appendChild(group);
        
        this.uiManager.addButton(group, 'Generate Terrain', () => {
            this.generateTerrain();
        });
        
        this.uiManager.addInfoText(group, 'Procedural terrain generation');
    }

    generateVoxelBox() {
        const scene = new VoxelScene();
        scene.generateBox(-3, 3, 0, 3, -3, 3, '#8b4513');
        this.voxelRenderer.setScene(scene);
    }

    generateTerrain() {
        const generator = new TerrainGenerator();
        const terrain = generator.generateFractal(32, 32, 0.1, 5, 4);
        this.surfaceRenderer.setMesh(terrain.vertices, terrain.triangles);
    }

    animate() {
        this.rotationY += 0.005;
        
        switch (this.currentModule) {
            case 'perspective':
                this.renderPerspective();
                break;
            case 'points':
                this.renderPoints();
                break;
            case 'wireframe':
                this.renderWireframe();
                break;
            case 'surface':
                this.renderSurface();
                break;
            case 'raytracing':
                // Static render for ray tracing
                break;
            case 'math-surface':
                this.renderMathSurface();
                break;
            case 'voxel':
                this.renderVoxel();
                break;
            case 'generators':
                this.renderWireframe();
                break;
            case 'terrain':
                this.renderSurface();
                break;
        }
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    renderPerspective() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw a simple grid to demonstrate perspective
        const gridSize = 10;
        const gridStep = 1;
        
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 1;
        
        const viewMatrix = this.camera.getViewMatrix();
        const projMatrix = this.camera.getProjectionMatrix();
        
        // Draw grid lines
        for (let x = -gridSize; x <= gridSize; x += gridStep) {
            const p1 = this.projector.project(new Vec3(x, 0, -gridSize), viewMatrix, projMatrix);
            const p2 = this.projector.project(new Vec3(x, 0, gridSize), viewMatrix, projMatrix);
            
            if (p1 && p2) {
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);
                this.ctx.stroke();
            }
        }
        
        for (let z = -gridSize; z <= gridSize; z += gridStep) {
            const p1 = this.projector.project(new Vec3(-gridSize, 0, z), viewMatrix, projMatrix);
            const p2 = this.projector.project(new Vec3(gridSize, 0, z), viewMatrix, projMatrix);
            
            if (p1 && p2) {
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);
                this.ctx.stroke();
            }
        }
    }

    renderPoints() {
        const viewMatrix = this.camera.getViewMatrix();
        const projMatrix = this.camera.getProjectionMatrix();
        const modelMatrix = Mat4.multiply(Mat4.rotateY(this.rotationY), Mat4.rotateX(this.rotationX));
        
        const projectedPoints = this.cubeMesh.vertices.map(v => {
            const transformed = modelMatrix.transformPoint(v);
            return this.projector.project(transformed, viewMatrix, projMatrix);
        });
        
        this.pointsRenderer.render(projectedPoints);
    }

    renderWireframe() {
        const viewMatrix = this.camera.getViewMatrix();
        const projMatrix = this.camera.getProjectionMatrix();
        const modelMatrix = Mat4.multiply(Mat4.rotateY(this.rotationY), Mat4.rotateX(this.rotationX));
        
        const projectedVertices = this.wireframeRenderer.vertices.map(v => {
            const transformed = modelMatrix.transformPoint(v);
            return this.projector.project(transformed, viewMatrix, projMatrix);
        });
        
        this.wireframeRenderer.renderWithDepth(projectedVertices);
    }

    renderSurface() {
        const viewMatrix = this.camera.getViewMatrix();
        const projMatrix = this.camera.getProjectionMatrix();
        const modelMatrix = Mat4.multiply(Mat4.rotateY(this.rotationY), Mat4.rotateX(this.rotationX));
        
        const projectedVertices = this.surfaceRenderer.vertices.map(v => {
            const transformed = modelMatrix.transformPoint(v);
            return this.projector.project(transformed, viewMatrix, projMatrix);
        });
        
        this.surfaceRenderer.render(projectedVertices, this.surfaceRenderer.triangles, viewMatrix);
    }

    renderRayTracing() {
        this.rayTracer.clear();
        
        // Add some spheres
        this.rayTracer.addObject(new Sphere(new Vec3(0, 0, 0), 1, '#ff6b6b'));
        this.rayTracer.addObject(new Sphere(new Vec3(2, 0.5, 2), 0.5, '#4ecdc4'));
        this.rayTracer.addObject(new Sphere(new Vec3(-2, 0.5, 2), 0.5, '#ffe66d'));
        
        // Add a plane
        this.rayTracer.addObject(new Plane(new Vec3(0, -1, 0), new Vec3(0, 1, 0), '#333333'));
        
        this.rayTracer.renderPreview(this.camera, 2);
    }

    renderMathSurface() {
        if (!this.mathSurfaceRenderer.surface.vertices.length) {
            this.mathSurfaceRenderer.setFunction(MathFunctions.sine);
        }
        
        const viewMatrix = this.camera.getViewMatrix();
        const projMatrix = this.camera.getProjectionMatrix();
        const modelMatrix = Mat4.multiply(Mat4.rotateY(this.rotationY), Mat4.rotateX(this.rotationX));
        
        const projectedVertices = this.mathSurfaceRenderer.surface.vertices.map(v => {
            const transformed = modelMatrix.transformPoint(v);
            return this.projector.project(transformed, viewMatrix, projMatrix);
        });
        
        this.mathSurfaceRenderer.render(
            projectedVertices,
            this.mathSurfaceRenderer.surface.triangles,
            viewMatrix
        );
    }

    renderVoxel() {
        if (!this.voxelRenderer.scene.voxels.length) {
            this.generateVoxelBox();
        }
        
        const viewMatrix = this.camera.getViewMatrix();
        const projMatrix = this.camera.getProjectionMatrix();
        
        // Project all voxel vertices
        const allProjectedVertices = [];
        this.voxelRenderer.scene.voxels.forEach(voxel => {
            const vertices = voxel.getVertices();
            vertices.forEach(v => {
                const projected = this.projector.project(v, viewMatrix, projMatrix);
                allProjectedVertices.push(projected);
            });
        });
        
        this.voxelRenderer.render(allProjectedVertices, viewMatrix);
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new Application();
});

export default Application;
