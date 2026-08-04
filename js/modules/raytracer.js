/**
 * Ray Tracer Module
 * Basic ray tracing renderer for educational purposes
 */

import { Vec3 } from '../core/math3d.js';

export class Ray {
    constructor(origin, direction) {
        this.origin = origin;
        this.direction = Vec3.normalize(direction);
    }

    pointAt(t) {
        return Vec3.add(this.origin, Vec3.multiply(this.direction, t));
    }
}

export class Sphere {
    constructor(center, radius, color = '#ff0000') {
        this.center = center;
        this.radius = radius;
        this.color = color;
        this.type = 'sphere';
    }

    intersect(ray) {
        const oc = Vec3.sub(ray.origin, this.center);
        const a = Vec3.dot(ray.direction, ray.direction);
        const b = 2.0 * Vec3.dot(oc, ray.direction);
        const c = Vec3.dot(oc, oc) - this.radius * this.radius;
        
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) {
            return null;
        }
        
        const t = (-b - Math.sqrt(discriminant)) / (2 * a);
        
        if (t < 0.001) {
            return null;
        }
        
        const point = ray.pointAt(t);
        const normal = Vec3.normalize(Vec3.sub(point, this.center));
        
        return {
            t: t,
            point: point,
            normal: normal,
            color: this.color,
            object: this
        };
    }
}

export class Plane {
    constructor(point, normal, color = '#00ff00') {
        this.point = point;
        this.normal = Vec3.normalize(normal);
        this.color = color;
        this.type = 'plane';
    }

    intersect(ray) {
        const denom = Vec3.dot(this.normal, ray.direction);
        
        if (Math.abs(denom) < 0.0001) {
            return null; // Ray parallel to plane
        }
        
        const t = Vec3.dot(Vec3.sub(this.point, ray.origin), this.normal) / denom;
        
        if (t < 0.001) {
            return null;
        }
        
        const point = ray.pointAt(t);
        
        return {
            t: t,
            point: point,
            normal: this.normal,
            color: this.color,
            object: this
        };
    }
}

export class RayTracer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.objects = [];
        this.lightDir = Vec3.normalize(new Vec3(1, 1, 1));
        this.ambientLight = 0.2;
        this.maxDepth = 3;
        this.backgroundColor = '#1a1a2e';
    }

    addObject(object) {
        this.objects.push(object);
    }

    clear() {
        this.objects = [];
    }

    setLightDirection(x, y, z) {
        this.lightDir = Vec3.normalize(new Vec3(x, y, z));
    }

    setAmbientLight(intensity) {
        this.ambientLight = intensity;
    }

    findIntersection(ray) {
        let closest = null;
        let minT = Infinity;
        
        for (const object of this.objects) {
            const hit = object.intersect(ray);
            
            if (hit && hit.t < minT) {
                minT = hit.t;
                closest = hit;
            }
        }
        
        return closest;
    }

    calculateColor(hit, depth) {
        if (!hit) {
            return this.backgroundColor;
        }
        
        // Ambient light
        let r = parseInt(hit.color.slice(1, 3), 16);
        let g = parseInt(hit.color.slice(3, 5), 16);
        let b = parseInt(hit.color.slice(5, 7), 16);
        
        // Diffuse lighting
        const diff = Math.max(0, Vec3.dot(hit.normal, this.lightDir));
        const diffuseIntensity = this.ambientLight + (1 - this.ambientLight) * diff;
        
        r = Math.round(r * diffuseIntensity);
        g = Math.round(g * diffuseIntensity);
        b = Math.round(b * diffuseIntensity);
        
        // Simple reflection (recursive)
        if (depth > 0) {
            const reflectDir = Vec3.sub(ray.direction, Vec3.multiply(hit.normal, 2 * Vec3.dot(ray.direction, hit.normal)));
            const reflectRay = new Ray(Vec3.add(hit.point, Vec3.multiply(hit.normal, 0.001)), reflectDir);
            const reflectHit = this.findIntersection(reflectRay);
            
            if (reflectHit) {
                const reflectColor = this.calculateColor(reflectHit, depth - 1);
                // Blend colors
                r = Math.round(r * 0.7 + parseInt(reflectColor.slice(1, 3), 16) * 0.3);
                g = Math.round(g * 0.7 + parseInt(reflectColor.slice(3, 5), 16) * 0.3);
                b = Math.round(b * 0.7 + parseInt(reflectColor.slice(5, 7), 16) * 0.3);
            }
        }
        
        return `rgb(${r}, ${g}, ${b})`;
    }

    render(camera, projector) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const imageData = this.ctx.createImageData(width, height);
        const data = imageData.data;
        
        const viewMatrix = camera.getViewMatrix();
        const projMatrix = camera.getProjectionMatrix();
        
        // Simple ray generation for each pixel
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Normalize coordinates to [-1, 1]
                const ndcX = (2 * x) / width - 1;
                const ndcY = 1 - (2 * y) / height;
                
                // Create ray direction (simplified)
                const rayDir = Vec3.normalize(new Vec3(
                    ndcX * Math.tan(camera.fov / 2) * camera.aspect,
                    ndcY * Math.tan(camera.fov / 2),
                    -1
                ));
                
                // Transform ray direction by camera rotation
                const rayOrigin = camera.position;
                const ray = new Ray(rayOrigin, rayDir);
                
                const hit = this.findIntersection(ray);
                const color = hit ? this.calculateColor(hit, this.maxDepth) : this.backgroundColor;
                
                // Parse color and set pixel
                const rgb = color.match(/\d+/g);
                if (rgb) {
                    const idx = (y * width + x) * 4;
                    data[idx] = parseInt(rgb[0]);
                    data[idx + 1] = parseInt(rgb[1]);
                    data[idx + 2] = parseInt(rgb[2]);
                    data[idx + 3] = 255;
                }
            }
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Lower quality preview render (faster, for interactive use)
     */
    renderPreview(camera, scale = 4) {
        const width = Math.floor(this.canvas.width / scale);
        const height = Math.floor(this.canvas.height / scale);
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const viewMatrix = camera.getViewMatrix();
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ndcX = (2 * x) / width - 1;
                const ndcY = 1 - (2 * y) / height;
                
                const rayDir = Vec3.normalize(new Vec3(
                    ndcX * Math.tan(camera.fov / 2) * camera.aspect,
                    ndcY * Math.tan(camera.fov / 2),
                    -1
                ));
                
                const ray = new Ray(camera.position, rayDir);
                const hit = this.findIntersection(ray);
                
                if (hit) {
                    const diff = Math.max(0, Vec3.dot(hit.normal, this.lightDir));
                    const intensity = this.ambientLight + (1 - this.ambientLight) * diff;
                    
                    const r = parseInt(hit.color.slice(1, 3), 16);
                    const g = parseInt(hit.color.slice(3, 5), 16);
                    const b = parseInt(hit.color.slice(5, 7), 16);
                    
                    this.ctx.fillStyle = `rgb(${Math.round(r * intensity)}, ${Math.round(g * intensity)}, ${Math.round(b * intensity)})`;
                    this.ctx.fillRect(x * scale, y * scale, scale, scale);
                } else {
                    this.ctx.fillStyle = this.backgroundColor;
                    this.ctx.fillRect(x * scale, y * scale, scale, scale);
                }
            }
        }
    }
}

export function createRayTracer(canvas) {
    return new RayTracer(canvas);
}
