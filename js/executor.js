/**
 * Executor - Step-by-step JavaScript execution engine
 * Simulates JavaScript runtime behavior for visualization
 */

const Executor = (function() {
    let instructions = [];
    let currentIndex = 0;
    let executionStack = [];
    let globalScope = null;
    let isRunning = false;
    let isPaused = false;
    let stepResolve = null;
    let pendingTimers = [];
    let pendingMicrotasks = [];

    /**
     * Initialize executor with parsed instructions
     */
    function init(parsedInstructions) {
        instructions = parsedInstructions;
        currentIndex = 0;
        executionStack = [];
        pendingTimers = [];
        pendingMicrotasks = [];
        
        // Create global execution context
        globalScope = StateManager.createScope('Global', 'global');
        StateManager.pushCallStack({
            name: 'Global Execution Context',
            type: 'global',
            variables: {},
            thisBinding: 'window',
            line: 0
        });
    }

    /**
     * Execute next instruction
     */
    async function step() {
        if (currentIndex >= instructions.length) {
            // Check for pending async tasks
            await processEventLoop();
            return false;
        }

        const instruction = instructions[currentIndex];
        StateManager.setCurrentLine(instruction.line);
        StateManager.incrementStep();
        
        await executeInstruction(instruction);
        currentIndex++;
        
        return currentIndex < instructions.length || hasPendingTasks();
    }

    /**
     * Execute a single instruction
     */
    async function executeInstruction(instruction) {
        const state = StateManager.getState();
        
        switch (instruction.type) {
            case 'hoistingPhase':
                await executeHoisting(instruction);
                break;
                
            case 'functionDeclaration':
                await executeFunctionDeclaration(instruction);
                break;
                
            case 'hoistedVar':
                await executeHoistedVar(instruction);
                break;
                
            case 'variableDeclaration':
                await executeVariableDeclaration(instruction);
                break;
                
            case 'assignment':
                await executeAssignment(instruction);
                break;
                
            case 'functionCall':
                await executeFunctionCall(instruction);
                break;
                
            case 'methodCall':
                await executeMethodCall(instruction);
                break;
                
            case 'console':
                await executeConsole(instruction);
                break;
                
            case 'setTimeout':
                await executeSetTimeout(instruction);
                break;
                
            case 'promise':
                await executePromise(instruction);
                break;
                
            case 'return':
                await executeReturn(instruction);
                break;
                
            case 'newObject':
                await executeNewObject(instruction);
                break;
        }
    }

    /**
     * Execute hoisting phase visualization
     */
    async function executeHoisting(instruction) {
        StateManager.logConsole('info', `Hoisting: Functions [${instruction.functions.join(', ')}], Vars [${instruction.vars.join(', ')}]`);
    }

    /**
     * Execute function declaration
     */
    async function executeFunctionDeclaration(instruction) {
        // Store function in heap
        const funcId = StateManager.allocateHeap('function', {
            name: instruction.name,
            params: instruction.params,
            body: instruction.body,
            closure: getCurrentScopeId()
        });
        
        // Add to current scope
        StateManager.addScopeVariable(
            getCurrentScopeId(),
            instruction.name,
            funcId,
            'function',
            'function'
        );
        
        // Update call stack frame
        StateManager.updateFrameVariable(instruction.name, `[Function: ${instruction.name}]`, 'function');
    }

    /**
     * Execute hoisted var (undefined initialization)
     */
    async function executeHoistedVar(instruction) {
        StateManager.addScopeVariable(
            getCurrentScopeId(),
            instruction.name,
            undefined,
            'undefined',
            'var'
        );
        StateManager.updateFrameVariable(instruction.name, 'undefined', 'undefined');
    }

    /**
     * Execute variable declaration
     */
    async function executeVariableDeclaration(instruction) {
        const value = await resolveValue(instruction.value);
        const valueType = getValueType(value);
        
        // For objects/arrays/functions, store in heap
        let storedValue = value;
        if (typeof value === 'object' && value !== null) {
            const heapId = StateManager.allocateHeap(
                Array.isArray(value) ? 'array' : 'object',
                value
            );
            storedValue = heapId;
        }
        
        StateManager.addScopeVariable(
            getCurrentScopeId(),
            instruction.name,
            storedValue,
            valueType,
            instruction.declarationType
        );
        
        StateManager.updateFrameVariable(
            instruction.name, 
            formatValue(value), 
            valueType
        );
    }

    /**
     * Execute assignment
     */
    async function executeAssignment(instruction) {
        const value = await resolveValue(instruction.value);
        const valueType = getValueType(value);
        
        StateManager.updateScopeVariable(
            findVariableScope(instruction.name),
            instruction.name,
            value
        );
        
        StateManager.updateFrameVariable(instruction.name, formatValue(value), valueType);
    }

    /**
     * Execute function call
     */
    async function executeFunctionCall(instruction) {
        const func = findFunction(instruction.name);
        if (!func) {
            StateManager.logConsole('error', `ReferenceError: ${instruction.name} is not defined`);
            return;
        }
        
        // Resolve arguments
        const args = await Promise.all(instruction.args.map(arg => resolveValue(arg)));
        
        // Create new execution context
        const funcScope = StateManager.createScope(instruction.name, 'function', getCurrentScopeId());
        
        // Push call stack frame
        const frame = StateManager.pushCallStack({
            name: instruction.name,
            type: 'function',
            variables: {},
            thisBinding: 'window', // Default this binding
            line: func.line
        });
        
        // Bind parameters
        func.params.forEach((param, i) => {
            const value = args[i] !== undefined ? args[i] : undefined;
            StateManager.addScopeVariable(funcScope.id, param, value, getValueType(value), 'param');
            StateManager.updateFrameVariable(param, formatValue(value), getValueType(value));
        });
        
        // Execute function body
        if (func.body) {
            const bodyInstructions = Parser.parseBody(func.body);
            for (const bodyInst of bodyInstructions) {
                StateManager.setCurrentLine(bodyInst.line || func.line);
                await executeInstruction(bodyInst);
                await delay();
            }
        }
        
        // Pop execution context
        StateManager.popCallStack();
        StateManager.destroyScope(funcScope.id);
    }

    /**
     * Execute method call
     */
    async function executeMethodCall(instruction) {
        if (instruction.object === 'console') {
            await executeConsole({
                method: instruction.method,
                args: instruction.args,
                line: instruction.line
            });
        }
    }

    /**
     * Execute console methods
     */
    async function executeConsole(instruction) {
        const args = await Promise.all(instruction.args.map(arg => resolveValue(arg)));
        const formatted = args.map(formatValue).join(' ');
        StateManager.logConsole(instruction.method, formatted);
    }

    /**
     * Execute setTimeout
     */
    async function executeSetTimeout(instruction) {
        const taskId = Date.now() + Math.random();
        
        // Add to Web APIs
        const task = StateManager.addToWebAPI({
            id: taskId,
            name: `setTimeout`,
            callback: instruction.callback,
            delay: instruction.delay,
            type: 'timer'
        });
        
        StateManager.logConsole('info', `setTimeout registered (${instruction.delay}ms)`);
        
        // Schedule move to callback queue
        const timerId = setTimeout(() => {
            StateManager.moveToCallbackQueue(task.id);
        }, Math.min(instruction.delay, StateManager.getState().speed));
        
        StateManager.addTimer(timerId);
        pendingTimers.push({ id: taskId, callback: instruction.callback });
    }

    /**
     * Execute Promise.resolve().then()
     */
    async function executePromise(instruction) {
        // Add to microtask queue immediately
        StateManager.addToMicrotaskQueue({
            name: 'Promise.then',
            callback: instruction.callback
        });
        
        StateManager.logConsole('info', 'Promise.then added to microtask queue');
        pendingMicrotasks.push({ callback: instruction.callback });
    }

    /**
     * Execute return statement
     */
    async function executeReturn(instruction) {
        const value = await resolveValue(instruction.value);
        StateManager.logConsole('log', `Return: ${formatValue(value)}`);
    }

    /**
     * Execute new Object creation
     */
    async function executeNewObject(instruction) {
        const obj = {};
        const heapId = StateManager.allocateHeap('object', obj);
        
        StateManager.addScopeVariable(
            getCurrentScopeId(),
            instruction.name,
            heapId,
            'object',
            instruction.declarationType
        );
        
        StateManager.updateFrameVariable(instruction.name, `{...}`, 'object');
    }

    /**
     * Process event loop (microtasks and callbacks)
     */
    async function processEventLoop() {
        const state = StateManager.getState();
        
        // Process all microtasks first
        while (state.eventLoop.microtaskQueue.length > 0 || pendingMicrotasks.length > 0) {
            const task = StateManager.processNextMicrotask();
            if (task && task.callback) {
                StateManager.logConsole('info', `Executing microtask: ${task.name}`);
                await delay();
                
                // Execute callback code
                const callbackInstructions = Parser.parseBody(task.callback);
                for (const inst of callbackInstructions) {
                    await executeInstruction(inst);
                    await delay();
                }
            }
            pendingMicrotasks.shift();
        }
        
        // Process one callback
        const callbackState = StateManager.getState();
        if (callbackState.eventLoop.callbackQueue.length > 0 || pendingTimers.length > 0) {
            const callback = StateManager.processNextCallback();
            if (callback && callback.callback) {
                StateManager.logConsole('info', `Executing callback: ${callback.name}`);
                
                // Create execution context for callback
                const callbackScope = StateManager.createScope('setTimeout callback', 'function', globalScope.id);
                StateManager.pushCallStack({
                    name: 'setTimeout callback',
                    type: 'function',
                    variables: {},
                    thisBinding: 'window',
                    line: 0
                });
                
                await delay();
                
                // Execute callback code
                const callbackInstructions = Parser.parseBody(callback.callback);
                for (const inst of callbackInstructions) {
                    await executeInstruction(inst);
                    await delay();
                }
                
                StateManager.popCallStack();
                StateManager.destroyScope(callbackScope.id);
            }
            pendingTimers.shift();
        }
        
        return hasPendingTasks();
    }

    /**
     * Check if there are pending async tasks
     */
    function hasPendingTasks() {
        const state = StateManager.getState();
        return state.eventLoop.webAPIs.length > 0 ||
               state.eventLoop.callbackQueue.length > 0 ||
               state.eventLoop.microtaskQueue.length > 0 ||
               pendingTimers.length > 0 ||
               pendingMicrotasks.length > 0;
    }

    /**
     * Resolve a value expression
     */
    async function resolveValue(valueExpr) {
        if (!valueExpr) return undefined;
        
        switch (valueExpr.type) {
            case 'number':
            case 'string':
            case 'boolean':
            case 'null':
            case 'undefined':
                return valueExpr.value;
                
            case 'array':
                return await Promise.all(valueExpr.value.map(v => resolveValue(v)));
                
            case 'object':
                const obj = {};
                for (const [key, val] of Object.entries(valueExpr.value)) {
                    obj[key] = await resolveValue(val);
                }
                return obj;
                
            case 'reference':
                return lookupVariable(valueExpr.value);
                
            case 'call':
                // Execute function and return result
                await executeFunctionCall({ name: valueExpr.name, args: valueExpr.args });
                return undefined; // Simplified - would need return value tracking
                
            case 'function':
            case 'arrowFunction':
                return valueExpr; // Return function definition
                
            default:
                return valueExpr.value;
        }
    }

    /**
     * Look up variable in scope chain
     */
    function lookupVariable(name) {
        const state = StateManager.getState();
        
        // Search from current scope up to global
        for (let i = state.scopes.length - 1; i >= 0; i--) {
            const scope = state.scopes[i];
            if (scope.variables[name] !== undefined) {
                return scope.variables[name].value;
            }
        }
        
        return undefined;
    }

    /**
     * Find variable's scope
     */
    function findVariableScope(name) {
        const state = StateManager.getState();
        
        for (let i = state.scopes.length - 1; i >= 0; i--) {
            if (state.scopes[i].variables[name] !== undefined) {
                return state.scopes[i].id;
            }
        }
        
        return getCurrentScopeId();
    }

    /**
     * Find function definition
     */
    function findFunction(name) {
        return instructions.find(i => i.type === 'functionDeclaration' && i.name === name);
    }

    /**
     * Get current scope ID
     */
    function getCurrentScopeId() {
        const state = StateManager.getState();
        return state.scopes.length > 0 ? state.scopes[state.scopes.length - 1].id : null;
    }

    /**
     * Get value type string
     */
    function getValueType(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'object' && value.type === 'function') return 'function';
        if (typeof value === 'object' && value.type === 'arrowFunction') return 'function';
        return typeof value;
    }

    /**
     * Format value for display
     */
    function formatValue(value) {
        if (value === undefined) return 'undefined';
        if (value === null) return 'null';
        if (typeof value === 'string') return `"${value}"`;
        if (typeof value === 'function') return '[Function]';
        if (Array.isArray(value)) {
            if (value.length <= 3) {
                return `[${value.map(formatValue).join(', ')}]`;
            }
            return `[${value.length} items]`;
        }
        if (typeof value === 'object') {
            if (value.type === 'function' || value.type === 'arrowFunction') {
                return '[Function]';
            }
            const keys = Object.keys(value);
            if (keys.length <= 2) {
                return `{${keys.map(k => `${k}: ${formatValue(value[k])}`).join(', ')}}`;
            }
            return `{...}`;
        }
        return String(value);
    }

    /**
     * Delay for visualization
     */
    function delay() {
        const state = StateManager.getState();
        return new Promise(resolve => {
            const timerId = setTimeout(resolve, state.speed);
            StateManager.addTimer(timerId);
        });
    }

    /**
     * Run all instructions
     */
    async function run() {
        isRunning = true;
        isPaused = false;
        StateManager.setExecutionState(true, false);
        
        while (await step()) {
            if (!isRunning) break;
            
            while (isPaused) {
                await new Promise(resolve => { stepResolve = resolve; });
            }
            
            await delay();
        }
        
        isRunning = false;
        StateManager.setExecutionState(false, false);
        StateManager.logConsole('info', 'Execution completed');
    }

    /**
     * Pause execution
     */
    function pause() {
        isPaused = true;
        StateManager.setExecutionState(true, true);
    }

    /**
     * Resume execution
     */
    function resume() {
        isPaused = false;
        StateManager.setExecutionState(true, false);
        if (stepResolve) {
            stepResolve();
            stepResolve = null;
        }
    }

    /**
     * Stop execution
     */
    function stop() {
        isRunning = false;
        isPaused = false;
        StateManager.setExecutionState(false, false);
    }

    /**
     * Single step (for step button)
     */
    async function singleStep() {
        if (!isRunning) {
            isRunning = true;
            isPaused = true;
            StateManager.setExecutionState(true, true);
        }
        
        const hasMore = await step();
        
        if (!hasMore) {
            isRunning = false;
            isPaused = false;
            StateManager.setExecutionState(false, false);
            StateManager.logConsole('info', 'Execution completed');
        }
        
        return hasMore;
    }

    /**
     * Reset executor
     */
    function reset() {
        stop();
        currentIndex = 0;
        executionStack = [];
        pendingTimers = [];
        pendingMicrotasks = [];
        StateManager.reset();
    }

    // Public API
    return {
        init,
        run,
        step: singleStep,
        pause,
        resume,
        stop,
        reset,
        hasPendingTasks
    };
})();
