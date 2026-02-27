/**
 * State Manager - Central state management with event emitter pattern
 * Manages all runtime state: call stack, heap, scopes, event loop, etc.
 */

const StateManager = (function() {
    // Private state
    let state = {
        code: '',
        parsedCode: [],
        callStack: [],
        heap: new Map(),
        heapIdCounter: 0,
        scopes: [],
        scopeIdCounter: 0,
        eventLoop: {
            webAPIs: [],
            callbackQueue: [],
            microtaskQueue: []
        },
        currentLine: -1,
        currentStep: 0,
        isRunning: false,
        isPaused: false,
        speed: 1000,
        executionQueue: [],
        timers: []
    };

    // Event subscribers
    const subscribers = {
        callStack: [],
        heap: [],
        scopes: [],
        eventLoop: [],
        currentLine: [],
        execution: [],
        console: [],
        all: []
    };

    /**
     * Subscribe to state changes
     * @param {string} event - Event name or 'all' for all events
     * @param {function} callback - Callback function
     * @returns {function} Unsubscribe function
     */
    function subscribe(event, callback) {
        if (subscribers[event]) {
            subscribers[event].push(callback);
            return () => {
                const index = subscribers[event].indexOf(callback);
                if (index > -1) subscribers[event].splice(index, 1);
            };
        }
        return () => {};
    }

    /**
     * Notify subscribers of state change
     * @param {string} event - Event name
     * @param {any} data - Event data
     */
    function notify(event, data) {
        if (subscribers[event]) {
            subscribers[event].forEach(cb => cb(data, state));
        }
        subscribers.all.forEach(cb => cb(event, data, state));
    }

    /**
     * Get current state (read-only copy)
     */
    function getState() {
        return {
            ...state,
            callStack: [...state.callStack],
            heap: new Map(state.heap),
            scopes: [...state.scopes],
            eventLoop: {
                webAPIs: [...state.eventLoop.webAPIs],
                callbackQueue: [...state.eventLoop.callbackQueue],
                microtaskQueue: [...state.eventLoop.microtaskQueue]
            }
        };
    }

    /**
     * Set code and reset state
     */
    function setCode(code) {
        state.code = code;
        notify('code', code);
    }

    /**
     * Set parsed code
     */
    function setParsedCode(parsed) {
        state.parsedCode = parsed;
    }

    /**
     * Push frame onto call stack
     */
    function pushCallStack(frame) {
        const newFrame = {
            id: Date.now() + Math.random(),
            name: frame.name || 'anonymous',
            type: frame.type || 'function',
            variables: frame.variables || {},
            thisBinding: frame.thisBinding || 'window',
            line: frame.line || 0,
            isActive: true
        };
        
        // Deactivate previous top frame
        if (state.callStack.length > 0) {
            state.callStack[state.callStack.length - 1].isActive = false;
        }
        
        state.callStack.push(newFrame);
        notify('callStack', { action: 'push', frame: newFrame, stack: [...state.callStack] });
        return newFrame;
    }

    /**
     * Pop frame from call stack
     */
    function popCallStack() {
        const frame = state.callStack.pop();
        
        // Activate new top frame
        if (state.callStack.length > 0) {
            state.callStack[state.callStack.length - 1].isActive = true;
        }
        
        notify('callStack', { action: 'pop', frame, stack: [...state.callStack] });
        return frame;
    }

    /**
     * Update variable in top frame
     */
    function updateFrameVariable(name, value, type) {
        if (state.callStack.length > 0) {
            const topFrame = state.callStack[state.callStack.length - 1];
            topFrame.variables[name] = { value, type };
            notify('callStack', { action: 'update', frame: topFrame, stack: [...state.callStack] });
        }
    }

    /**
     * Allocate object in heap
     */
    function allocateHeap(type, value, refId = null) {
        const id = refId || `ref_${++state.heapIdCounter}`;
        const heapObj = {
            id,
            type,
            value,
            references: [],
            createdAt: Date.now()
        };
        state.heap.set(id, heapObj);
        notify('heap', { action: 'allocate', object: heapObj, heap: new Map(state.heap) });
        return id;
    }

    /**
     * Add reference between heap objects
     */
    function addHeapReference(fromId, toId) {
        const obj = state.heap.get(fromId);
        if (obj && !obj.references.includes(toId)) {
            obj.references.push(toId);
            notify('heap', { action: 'reference', from: fromId, to: toId, heap: new Map(state.heap) });
        }
    }

    /**
     * Deallocate (garbage collect) heap object
     */
    function deallocateHeap(id) {
        const obj = state.heap.get(id);
        if (obj) {
            state.heap.delete(id);
            notify('heap', { action: 'deallocate', object: obj, heap: new Map(state.heap) });
        }
    }

    /**
     * Create new scope
     */
    function createScope(name, type, parentId = null) {
        const scope = {
            id: `scope_${++state.scopeIdCounter}`,
            name,
            type, // 'global', 'function', 'block'
            parentId,
            variables: {},
            createdAt: Date.now()
        };
        state.scopes.push(scope);
        notify('scopes', { action: 'create', scope, scopes: [...state.scopes] });
        return scope;
    }

    /**
     * Add variable to scope
     */
    function addScopeVariable(scopeId, name, value, varType, declarationType) {
        const scope = state.scopes.find(s => s.id === scopeId);
        if (scope) {
            scope.variables[name] = { 
                value, 
                type: varType,
                declarationType // 'var', 'let', 'const'
            };
            notify('scopes', { action: 'addVariable', scope, scopes: [...state.scopes] });
        }
    }

    /**
     * Update variable in scope
     */
    function updateScopeVariable(scopeId, name, value) {
        const scope = state.scopes.find(s => s.id === scopeId);
        if (scope && scope.variables[name]) {
            scope.variables[name].value = value;
            notify('scopes', { action: 'updateVariable', scope, variable: name, scopes: [...state.scopes] });
        }
    }

    /**
     * Destroy scope
     */
    function destroyScope(scopeId) {
        const index = state.scopes.findIndex(s => s.id === scopeId);
        if (index > -1) {
            const scope = state.scopes.splice(index, 1)[0];
            notify('scopes', { action: 'destroy', scope, scopes: [...state.scopes] });
        }
    }

    /**
     * Add task to Web API
     */
    function addToWebAPI(task) {
        const apiTask = {
            id: Date.now() + Math.random(),
            name: task.name,
            callback: task.callback,
            delay: task.delay || 0,
            startTime: Date.now(),
            type: task.type || 'timer'
        };
        state.eventLoop.webAPIs.push(apiTask);
        notify('eventLoop', { action: 'addWebAPI', task: apiTask, eventLoop: { ...state.eventLoop } });
        return apiTask;
    }

    /**
     * Move task from Web API to Callback Queue
     */
    function moveToCallbackQueue(taskId) {
        const index = state.eventLoop.webAPIs.findIndex(t => t.id === taskId);
        if (index > -1) {
            const task = state.eventLoop.webAPIs.splice(index, 1)[0];
            state.eventLoop.callbackQueue.push(task);
            notify('eventLoop', { 
                action: 'moveToCallback', 
                task, 
                eventLoop: { ...state.eventLoop } 
            });
            return task;
        }
    }

    /**
     * Add task to Microtask Queue
     */
    function addToMicrotaskQueue(task) {
        const microTask = {
            id: Date.now() + Math.random(),
            name: task.name,
            callback: task.callback,
            type: 'microtask'
        };
        state.eventLoop.microtaskQueue.push(microTask);
        notify('eventLoop', { 
            action: 'addMicrotask', 
            task: microTask, 
            eventLoop: { ...state.eventLoop } 
        });
        return microTask;
    }

    /**
     * Process next microtask
     */
    function processNextMicrotask() {
        if (state.eventLoop.microtaskQueue.length > 0) {
            const task = state.eventLoop.microtaskQueue.shift();
            notify('eventLoop', { 
                action: 'processMicrotask', 
                task, 
                eventLoop: { ...state.eventLoop } 
            });
            return task;
        }
        return null;
    }

    /**
     * Process next callback
     */
    function processNextCallback() {
        if (state.eventLoop.callbackQueue.length > 0) {
            const task = state.eventLoop.callbackQueue.shift();
            notify('eventLoop', { 
                action: 'processCallback', 
                task, 
                eventLoop: { ...state.eventLoop } 
            });
            return task;
        }
        return null;
    }

    /**
     * Set current line highlight
     */
    function setCurrentLine(line) {
        state.currentLine = line;
        notify('currentLine', line);
    }

    /**
     * Increment step counter
     */
    function incrementStep() {
        state.currentStep++;
        return state.currentStep;
    }

    /**
     * Set execution state
     */
    function setExecutionState(isRunning, isPaused = false) {
        state.isRunning = isRunning;
        state.isPaused = isPaused;
        notify('execution', { isRunning, isPaused });
    }

    /**
     * Set speed
     */
    function setSpeed(speed) {
        state.speed = speed;
    }

    /**
     * Log to console
     */
    function logConsole(type, ...args) {
        notify('console', { type, args, timestamp: Date.now() });
    }

    /**
     * Add timer reference
     */
    function addTimer(timerId) {
        state.timers.push(timerId);
    }

    /**
     * Reset all state
     */
    function reset() {
        // Clear all timers
        state.timers.forEach(id => clearTimeout(id));
        
        state = {
            code: state.code, // Keep the code
            parsedCode: [],
            callStack: [],
            heap: new Map(),
            heapIdCounter: 0,
            scopes: [],
            scopeIdCounter: 0,
            eventLoop: {
                webAPIs: [],
                callbackQueue: [],
                microtaskQueue: []
            },
            currentLine: -1,
            currentStep: 0,
            isRunning: false,
            isPaused: false,
            speed: state.speed, // Keep the speed
            executionQueue: [],
            timers: []
        };
        
        notify('callStack', { action: 'reset', stack: [] });
        notify('heap', { action: 'reset', heap: new Map() });
        notify('scopes', { action: 'reset', scopes: [] });
        notify('eventLoop', { action: 'reset', eventLoop: state.eventLoop });
        notify('currentLine', -1);
        notify('execution', { isRunning: false, isPaused: false });
    }

    // Public API
    return {
        subscribe,
        getState,
        setCode,
        setParsedCode,
        pushCallStack,
        popCallStack,
        updateFrameVariable,
        allocateHeap,
        addHeapReference,
        deallocateHeap,
        createScope,
        addScopeVariable,
        updateScopeVariable,
        destroyScope,
        addToWebAPI,
        moveToCallbackQueue,
        addToMicrotaskQueue,
        processNextMicrotask,
        processNextCallback,
        setCurrentLine,
        incrementStep,
        setExecutionState,
        setSpeed,
        logConsole,
        addTimer,
        reset
    };
})();
