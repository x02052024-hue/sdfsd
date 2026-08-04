/**
 * UI Manager Module
 * Handles user interface interactions and controls
 */

export class UIManager {
    constructor() {
        this.currentModule = null;
        this.controlsPanel = document.getElementById('module-controls');
        this.navButtons = document.querySelectorAll('#main-nav button');
        this.callbacks = {};
        
        this.setupNavigation();
    }

    setupNavigation() {
        this.navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const moduleName = e.target.dataset.module;
                this.activateModule(moduleName);
            });
        });
    }

    activateModule(moduleName) {
        // Update active button state
        this.navButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.module === moduleName) {
                btn.classList.add('active');
            }
        });

        // Clear current controls
        this.controlsPanel.innerHTML = '';
        this.currentModule = moduleName;

        // Notify listeners
        if (this.callbacks[moduleName]) {
            this.callbacks[moduleName].forEach(callback => callback());
        }
    }

    onModuleActivate(moduleName, callback) {
        if (!this.callbacks[moduleName]) {
            this.callbacks[moduleName] = [];
        }
        this.callbacks[moduleName].push(callback);
    }

    /**
     * Create a control group in the panel
     */
    createControlGroup(title) {
        const group = document.createElement('div');
        group.className = 'control-group';
        
        const heading = document.createElement('h3');
        heading.textContent = title;
        group.appendChild(heading);
        
        return group;
    }

    /**
     * Add a slider control
     */
    addSlider(group, label, min, max, step, defaultValue, onChange) {
        const container = document.createElement('div');
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        container.appendChild(labelEl);
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = defaultValue;
        container.appendChild(slider);
        
        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = `: ${defaultValue}`;
        valueDisplay.style.marginLeft = '0.5rem';
        container.appendChild(valueDisplay);
        
        slider.addEventListener('input', (e) => {
            valueDisplay.textContent = `: ${e.target.value}`;
            onChange(parseFloat(e.target.value));
        });
        
        group.appendChild(container);
        return slider;
    }

    /**
     * Add a number input control
     */
    addNumberInput(group, label, defaultValue, onChange) {
        const container = document.createElement('div');
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        container.appendChild(labelEl);
        
        const input = document.createElement('input');
        input.type = 'number';
        input.value = defaultValue;
        container.appendChild(input);
        
        input.addEventListener('input', (e) => {
            onChange(parseFloat(e.target.value));
        });
        
        group.appendChild(container);
        return input;
    }

    /**
     * Add a checkbox control
     */
    addCheckbox(group, label, checked, onChange) {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '0.5rem';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = checked;
        container.appendChild(checkbox);
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        container.appendChild(labelEl);
        
        checkbox.addEventListener('change', (e) => {
            onChange(e.target.checked);
        });
        
        group.appendChild(container);
        return checkbox;
    }

    /**
     * Add a select dropdown control
     */
    addSelect(group, label, options, defaultValue, onChange) {
        const container = document.createElement('div');
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        container.appendChild(labelEl);
        
        const select = document.createElement('select');
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            if (opt.value === defaultValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        container.appendChild(select);
        
        select.addEventListener('change', (e) => {
            onChange(e.target.value);
        });
        
        group.appendChild(container);
        return select;
    }

    /**
     * Add a button control
     */
    addButton(group, label, onClick) {
        const button = document.createElement('button');
        button.textContent = label;
        button.addEventListener('click', onClick);
        group.appendChild(button);
        return button;
    }

    /**
     * Add a color picker control
     */
    addColorPicker(group, label, defaultValue, onChange) {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '0.5rem';
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        container.appendChild(labelEl);
        
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = defaultValue;
        container.appendChild(colorInput);
        
        colorInput.addEventListener('input', (e) => {
            onChange(e.target.value);
        });
        
        group.appendChild(container);
        return colorInput;
    }

    /**
     * Display information text
     */
    addInfoText(group, text) {
        const infoEl = document.createElement('p');
        infoEl.textContent = text;
        infoEl.style.fontSize = '0.85rem';
        infoEl.style.color = '#aaa';
        infoEl.style.marginTop = '0.5rem';
        group.appendChild(infoEl);
    }

    /**
     * Clear all controls
     */
    clearControls() {
        this.controlsPanel.innerHTML = '';
    }

    /**
     * Show module-specific controls
     */
    showModuleControls(moduleName, setupCallback) {
        this.clearControls();
        setupCallback(this);
    }
}

export function createUIManager() {
    return new UIManager();
}
