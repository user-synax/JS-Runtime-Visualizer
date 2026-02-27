/**
 * Visualizer - DOM rendering for all visualization panels
 * Handles call stack, heap, scope chain, and event loop visualization
 */

const Visualizer = (function() {
    // DOM Elements
    let elements = {};
    let heapArrowsSvg = null;
    let heapObjectElements = new Map();

    /**
     * Initialize visualizer and subscribe to state changes
     */
    function init() {
        // Cache DOM elements
        elements = {
            callStack: document.getElementById('call-stack'),
            stackCount: document.getElementById('stack-count'),
            memoryHeap: document.getElementById('heap-objects'),
            heapArrows: document.getElementById('heap-arrows'),
            heapCount: document.getElementById('heap-count'),
            scopeChain: document.getElementById('scope-chain'),
            scopeCount: document.getElementById('scope-count'),
            webAPIs: document.getElementById('web-apis'),
            callbackQueue: document.getElementById('callback-queue'),
            microtaskQueue: document.getElementById('microtask-queue'),
            consoleOutput: document.getElementById('console-output'),
            lineHighlight: document.getElementById('line-highlight'),
            lineNumbers: document.getElementById('line-numbers')
        };

        heapArrowsSvg = elements.heapArrows;

        // Subscribe to state changes
        StateManager.subscribe('callStack', handleCallStackChange);
        StateManager.subscribe('heap', handleHeapChange);
        StateManager.subscribe('scopes', handleScopesChange);
        StateManager.subscribe('eventLoop', handleEventLoopChange);
        StateManager.subscribe('currentLine', handleLineChange);
        StateManager.subscribe('console', handleConsoleLog);

        // Initial render
        renderEmpty();
    }

    /**
     * Render empty states for all panels
     */
    function renderEmpty() {
        elements.callStack.innerHTML = '<div class="empty-state">Stack is empty</div>';
        elements.memoryHeap.innerHTML = '<div class="empty-state">No objects allocated</div>';
        elements.scopeChain.innerHTML = '<div class="empty-state">No active scopes</div>';
        elements.webAPIs.innerHTML = '';
        elements.callbackQueue.innerHTML = '';
        elements.microtaskQueue.innerHTML = '';
        elements.stackCount.textContent = '0';
        elements.heapCount.textContent = '0';
        elements.scopeCount.textContent = '0';
    }

    /**
     * Handle call stack changes
     */
    function handleCallStackChange(data, state) {
        const { action, frame, stack } = data;

        elements.stackCount.textContent = stack.length;

        if (action === 'reset' || stack.length === 0) {
            elements.callStack.innerHTML = '<div class="empty-state">Stack is empty</div>';
            return;
        }

        if (action === 'push') {
            // Remove empty state if present
            const emptyState = elements.callStack.querySelector('.empty-state');
            if (emptyState) emptyState.remove();

            // Create new frame element
            const frameEl = createStackFrameElement(frame);
            elements.callStack.appendChild(frameEl);

            // Update active states
            updateActiveFrame(stack);
        } else if (action === 'pop') {
            // Find and animate out the frame
            const frames = elements.callStack.querySelectorAll('.stack-frame');
            if (frames.length > 0) {
                const topFrame = frames[frames.length - 1];
                topFrame.classList.add('popping');
                setTimeout(() => {
                    topFrame.remove();
                    if (elements.callStack.children.length === 0) {
                        elements.callStack.innerHTML = '<div class="empty-state">Stack is empty</div>';
                    }
                    updateActiveFrame(stack);
                }, 300);
            }
        } else if (action === 'update') {
            // Update variables in the frame
            updateFrameVariables(frame);
        }
    }

    /**
     * Create stack frame DOM element
     */
    function createStackFrameElement(frame) {
        const el = document.createElement('div');
        el.className = 'stack-frame' + (frame.isActive ? ' active' : '');
        el.dataset.frameId = frame.id;

        const nameEl = document.createElement('div');
        nameEl.className = 'frame-name';
        nameEl.textContent = frame.name;

        const varsEl = document.createElement('div');
        varsEl.className = 'frame-vars';

        // Add variables
        Object.entries(frame.variables).forEach(([name, info]) => {
            const varEl = document.createElement('span');
            varEl.className = 'frame-var';
            varEl.innerHTML = `<span class="var-name">${name}</span>: <span class="var-value">${info.value}</span>`;
            varsEl.appendChild(varEl);
        });

        // Add this binding indicator
        if (frame.thisBinding) {
            const thisEl = document.createElement('div');
            thisEl.className = 'this-indicator';
            thisEl.innerHTML = ` = ${frame.thisBinding}`;
            el.appendChild(nameEl);
            el.appendChild(varsEl);
            el.appendChild(thisEl);
        } else {
            el.appendChild(nameEl);
            el.appendChild(varsEl);
        }

        return el;
    }

    /**
     * Update active frame highlighting
     */
    function updateActiveFrame(stack) {
        const frames = elements.callStack.querySelectorAll('.stack-frame');
        frames.forEach((frameEl, index) => {
            if (index === frames.length - 1) {
                frameEl.classList.add('active');
                Animations.pulse(frameEl);
            } else {
                frameEl.classList.remove('active');
            }
        });
    }

    /**
     * Update frame variables
     */
    function updateFrameVariables(frame) {
        const frameEl = elements.callStack.querySelector(`[data-frame-id="${frame.id}"]`);
        if (frameEl) {
            const varsEl = frameEl.querySelector('.frame-vars');
            varsEl.innerHTML = '';

            Object.entries(frame.variables).forEach(([name, info]) => {
                const varEl = document.createElement('span');
                varEl.className = 'frame-var';
                varEl.innerHTML = `<span class="var-name">${name}</span>: <span class="var-value">${info.value}</span>`;
                varsEl.appendChild(varEl);
            });
        }
    }

    /**
     * Handle heap changes
     */
    function handleHeapChange(data, state) {
        const { action, object, heap } = data;

        elements.heapCount.textContent = heap.size;

        if (action === 'reset' || heap.size === 0) {
            elements.memoryHeap.innerHTML = '<div class="empty-state">No objects allocated</div>';
            heapObjectElements.clear();
            clearArrows();
            return;
        }

        if (action === 'allocate') {
            // Remove empty state if present
            const emptyState = elements.memoryHeap.querySelector('.empty-state');
            if (emptyState) emptyState.remove();

            // Create heap object element
            const objEl = createHeapObjectElement(object);
            elements.memoryHeap.appendChild(objEl);
            heapObjectElements.set(object.id, objEl);
        } else if (action === 'deallocate') {
            const objEl = heapObjectElements.get(object.id);
            if (objEl) {
                objEl.classList.add('removing');
                setTimeout(() => {
                    objEl.remove();
                    heapObjectElements.delete(object.id);
                    if (elements.memoryHeap.children.length === 0) {
                        elements.memoryHeap.innerHTML = '<div class="empty-state">No objects allocated</div>';
                    }
                }, 400);
            }
        } else if (action === 'reference') {
            // Draw arrow between objects
            const fromEl = heapObjectElements.get(data.from);
            const toEl = heapObjectElements.get(data.to);
            if (fromEl && toEl) {
                Animations.drawArrow(heapArrowsSvg, fromEl, toEl, `arrow-${data.from}-${data.to}`);
            }
        }
    }

    /**
     * Create heap object DOM element
     */
    function createHeapObjectElement(obj) {
        const el = document.createElement('div');
        el.className = 'heap-object';
        el.dataset.heapId = obj.id;

        const typeEl = document.createElement('div');
        typeEl.className = 'heap-type';
        typeEl.textContent = obj.type;

        const contentEl = document.createElement('div');
        contentEl.className = 'heap-content';
        contentEl.textContent = formatHeapContent(obj);

        const refEl = document.createElement('span');
        refEl.className = 'heap-ref';
        refEl.textContent = obj.id;

        el.appendChild(typeEl);
        el.appendChild(contentEl);
        el.appendChild(refEl);

        return el;
    }

    /**
     * Format heap object content for display
     */
    function formatHeapContent(obj) {
        if (obj.type === 'function') {
            return `${obj.value.name || 'anonymous'}(${obj.value.params.join(', ')})`;
        }
        if (obj.type === 'array') {
            const items = Array.isArray(obj.value) ? obj.value : [];
            return `[${items.length} items]`;
        }
        if (obj.type === 'object') {
            const keys = Object.keys(obj.value || {});
            return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`;
        }
        return String(obj.value);
    }

    /**
     * Clear all heap arrows
     */
    function clearArrows() {
        const arrows = heapArrowsSvg.querySelectorAll('.heap-arrow');
        arrows.forEach(arrow => arrow.remove());
    }

    /**
     * Handle scope changes
     */
    function handleScopesChange(data, state) {
        const { action, scope, scopes } = data;

        elements.scopeCount.textContent = scopes.length;

        if (action === 'reset' || scopes.length === 0) {
            elements.scopeChain.innerHTML = '<div class="empty-state">No active scopes</div>';
            return;
        }

        // Re-render all scopes
        renderScopes(scopes);
    }

    /**
     * Render all scopes
     */
    function renderScopes(scopes) {
        elements.scopeChain.innerHTML = '';

        scopes.forEach((scope, index) => {
            const scopeEl = createScopeElement(scope, index);
            elements.scopeChain.appendChild(scopeEl);
        });
    }

    /**
     * Create scope DOM element
     */
    function createScopeElement(scope, index) {
        const el = document.createElement('div');
        el.className = 'scope-card' + (scope.type === 'global' ? ' global' : '');
        el.dataset.scopeId = scope.id;
        el.style.marginLeft = `${index * 12}px`;

        const nameEl = document.createElement('div');
        nameEl.className = 'scope-name';
        nameEl.innerHTML = `
            ${scope.name}
            <span class="scope-type">${scope.type}</span>
        `;

        const varsEl = document.createElement('div');
        varsEl.className = 'scope-vars';

        Object.entries(scope.variables).forEach(([name, info]) => {
            const varEl = document.createElement('div');
            varEl.className = 'scope-var';
            varEl.innerHTML = `
                <span class="var-name">${name}</span>
                <span class="var-type">${info.type}</span>
                <span class="var-value">${formatScopeValue(info.value)}</span>
            `;
            varsEl.appendChild(varEl);
        });

        el.appendChild(nameEl);
        el.appendChild(varsEl);

        return el;
    }

    /**
     * Format scope variable value
     */
    function formatScopeValue(value) {
        if (value === undefined) return 'undefined';
        if (value === null) return 'null';
        if (typeof value === 'string') {
            if (value.startsWith('ref_')) return `<ref:${value}>`;
            return `"${value}"`;
        }
        if (typeof value === 'object') {
            if (Array.isArray(value)) return `[${value.length}]`;
            return '{...}';
        }
        return String(value);
    }

    /**
     * Handle event loop changes
     */
    function handleEventLoopChange(data, state) {
        const { action, task, eventLoop } = data;

        if (action === 'reset') {
            elements.webAPIs.innerHTML = '';
            elements.callbackQueue.innerHTML = '';
            elements.microtaskQueue.innerHTML = '';
            return;
        }

        // Re-render event loop sections
        renderEventLoopSection(elements.webAPIs, eventLoop.webAPIs, 'timer');
        renderEventLoopSection(elements.callbackQueue, eventLoop.callbackQueue, 'callback');
        renderEventLoopSection(elements.microtaskQueue, eventLoop.microtaskQueue, 'microtask');
    }

    /**
     * Render event loop section
     */
    function renderEventLoopSection(container, tasks, type) {
        container.innerHTML = '';

        tasks.forEach(task => {
            const taskEl = createTaskElement(task, type);
            container.appendChild(taskEl);
        });
    }

    /**
     * Create task DOM element
     */
    function createTaskElement(task, type) {
        const el = document.createElement('div');
        el.className = 'event-task' + (type === 'microtask' ? ' microtask' : '');
        el.dataset.taskId = task.id;

        const nameSpan = document.createElement('span');
        nameSpan.textContent = task.name;

        el.appendChild(nameSpan);

        // Add timer for Web API tasks
        if (type === 'timer' && task.delay) {
            const timerSpan = document.createElement('span');
            timerSpan.className = 'task-timer';
            timerSpan.textContent = `${task.delay}ms`;
            el.appendChild(timerSpan);
        }

        return el;
    }

    /**
     * Handle line highlight changes
     */
    function handleLineChange(line) {
        if (line <= 0) {
            elements.lineHighlight.classList.remove('visible');
            return;
        }

        // Position highlight
        const lineHeight = 20.8; // Match CSS line height
        const top = (line - 1) * lineHeight + 16; // 16px padding

        elements.lineHighlight.style.top = `${top}px`;
        elements.lineHighlight.classList.add('visible');

        // Update line number highlighting
        const lineNums = elements.lineNumbers.querySelectorAll('.line-number');
        lineNums.forEach((el, i) => {
            if (i + 1 === line) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }

    /**
     * Handle console log
     */
    function handleConsoleLog(data) {
        const { type, args, timestamp } = data;

        const lineEl = document.createElement('div');
        lineEl.className = `console-line ${type}`;

        const prefixEl = document.createElement('span');
        prefixEl.className = 'console-prefix';
        prefixEl.textContent = `[${type}]`;

        const contentEl = document.createElement('span');
        contentEl.textContent = args.join(' ');

        lineEl.appendChild(prefixEl);
        lineEl.appendChild(contentEl);

        elements.consoleOutput.appendChild(lineEl);
        elements.consoleOutput.scrollTop = elements.consoleOutput.scrollHeight;
    }

    /**
     * Clear console output
     */
    function clearConsole() {
        elements.consoleOutput.innerHTML = '';
    }

    /**
     * Update line numbers based on code
     */
    function updateLineNumbers(code) {
        const lines = code.split('\n');
        elements.lineNumbers.innerHTML = '';

        lines.forEach((_, i) => {
            const lineEl = document.createElement('div');
            lineEl.className = 'line-number';
            lineEl.textContent = i + 1;
            elements.lineNumbers.appendChild(lineEl);
        });
    }

    /**
     * Reset all visualizations
     */
    function reset() {
        renderEmpty();
        clearConsole();
        elements.lineHighlight.classList.remove('visible');
        heapObjectElements.clear();
        clearArrows();
    }

    // Public API
    return {
        init,
        reset,
        clearConsole,
        updateLineNumbers,
        handleLineChange
    };
})();
