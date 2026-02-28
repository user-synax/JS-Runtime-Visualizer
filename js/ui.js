/**
 * UI - User interface controls and interactions
 * Handles buttons, code editor, example loading, and initialization
 */

const UI = (function () {
    // DOM Elements
    let elements = {};
    let isInitialized = false;

    // Example code snippets
    const examples = {
        closure: `// Closure Example
function createCounter() {
    var count = 0;
    
    function increment() {
        count = count + 1;
        console.log(count);
        return count;
    }
    
    return increment;
}

var counter = createCounter();
counter();
counter();
counter();`,

        async: `// Async Example - Event Loop
console.log("Start");

setTimeout(function() {
    console.log("Timeout callback");
}, 1000);

Promise.resolve().then(() => {
    console.log("Promise resolved");
});

console.log("End");`,

        hoisting: `// Hoisting Example
console.log(x);
console.log(typeof greet);

var x = 5;

function greet() {
    console.log("Hello!");
}

greet();
console.log(x);`,

        this: `// this Binding Example
var name = "Global";

function sayName() {
    console.log(name);
}

var person = {
    name: "Alice",
    greet: sayName
};

sayName();`,

        recursion: `// Recursion Example
function factorial(n) {
    console.log(n);
    if (n <= 1) {
        return 1;
    }
    return n;
}

var result = factorial(5);
console.log(result);`,

        callbacks: `// Callbacks & Event Loop
console.log("1: Start");

setTimeout(function() {
    console.log("2: First timeout");
}, 0);

setTimeout(function() {
    console.log("3: Second timeout");
}, 100);

Promise.resolve().then(() => {
    console.log("4: Promise 1");
});

Promise.resolve().then(() => {
    console.log("5: Promise 2");
});

console.log("6: End");`,

        scope: `// Scope Chain Example
var globalVar = "global";

function outer() {
    var outerVar = "outer";
    
    function inner() {
        var innerVar = "inner";
        console.log(innerVar);
        console.log(outerVar);
        console.log(globalVar);
    }
    
    inner();
}

outer();`,

        objects: `// Objects in Memory
var person = {
    name: "John",
    age: 30
};

var colors = [1, 2, 3];

console.log(person);
console.log(colors);`
    };

    /**
     * Initialize UI
     */
    function init() {
        if (isInitialized) return;

        // Cache DOM elements
        elements = {
            codeEditor: document.getElementById('code-editor'),
            btnRun: document.getElementById('btn-run'),
            btnStep: document.getElementById('btn-step'),
            btnPause: document.getElementById('btn-pause'),
            btnReset: document.getElementById('btn-reset'),
            btnClearConsole: document.getElementById('btn-clear-console'),
            speedSlider: document.getElementById('speed-slider'),
            speedValue: document.getElementById('speed-value'),
            exampleSelector: document.getElementById('examples'),
            particlesCanvas: document.getElementById('particles-canvas')
        };

        // Initialize visualizer
        Visualizer.init();

        // Initialize particles background
        Animations.initParticles(elements.particlesCanvas);

        // Bind event listeners
        bindEventListeners();

        // Load default example
        loadExample('closure');

        // Subscribe to execution state
        StateManager.subscribe('execution', handleExecutionState);

        isInitialized = true;
    }

    /**
     * Bind event listeners
     */
    function bindEventListeners() {
        // Control buttons
        elements.btnRun.addEventListener('click', handleRun);
        elements.btnStep.addEventListener('click', handleStep);
        elements.btnPause.addEventListener('click', handlePause);
        elements.btnReset.addEventListener('click', handleReset);
        elements.btnClearConsole.addEventListener('click', () => Visualizer.clearConsole());

        // Speed slider
        elements.speedSlider.addEventListener('input', handleSpeedChange);

        // Example selector
        elements.exampleSelector.addEventListener('change', (e) => loadExample(e.target.value));

        // Code editor
        elements.codeEditor.addEventListener('input', handleCodeChange);
        elements.codeEditor.addEventListener('keydown', handleEditorKeydown);
        elements.codeEditor.addEventListener('scroll', syncScroll);
    }

    /**
     * Handle Run button click
     */
    async function handleRun() {
        const code = elements.codeEditor.value;
        if (!code.trim()) {
            StateManager.logConsole('warn', 'No code to execute');
            return;
        }

        // Reset and initialize
        handleReset();
        StateManager.setCode(code);

        try {
            const parsed = Parser.parse(code);
            StateManager.setParsedCode(parsed);
            Executor.init(parsed);
            await Executor.run();
        } catch (error) {
            StateManager.logConsole('error', `Error: ${error.message}`);
        }
    }

    /**
     * Handle Step button click
     */
    async function handleStep() {
        const state = StateManager.getState();

        if (!state.isRunning) {
            // First step - initialize
            const code = elements.codeEditor.value;
            if (!code.trim()) {
                StateManager.logConsole('warn', 'No code to execute');
                return;
            }

            handleReset();
            StateManager.setCode(code);

            try {
                const parsed = Parser.parse(code);
                StateManager.setParsedCode(parsed);
                Executor.init(parsed);
            } catch (error) {
                StateManager.logConsole('error', `Error: ${error.message}`);
                return;
            }
        }

        await Executor.step();
    }

    /**
     * Handle Pause button click
     */
    function handlePause() {
        const state = StateManager.getState();

        if (state.isPaused) {
            Executor.resume();
        } else {
            Executor.pause();
        }
    }

    /**
     * Handle Reset button click
     */
    function handleReset() {
        Executor.reset();
        Visualizer.reset();
        Visualizer.updateLineNumbers(elements.codeEditor.value);
    }

    /**
     * Handle speed slider change
     */
    function handleSpeedChange(e) {
        const speed = parseInt(e.target.value);
        StateManager.setSpeed(speed);
        elements.speedValue.textContent = `${(speed / 1000).toFixed(1)}s`;
    }

    /**
     * Handle code editor changes
     */
    function handleCodeChange() {
        Visualizer.updateLineNumbers(elements.codeEditor.value);
    }

    /**
     * Handle editor keyboard shortcuts
     */
    function handleEditorKeydown(e) {
        // Tab key - insert spaces
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const value = e.target.value;
            e.target.value = value.substring(0, start) + '  ' + value.substring(end);
            e.target.selectionStart = e.target.selectionEnd = start + 2;
            handleCodeChange();
        }

        // Ctrl+Enter - Run
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleRun();
        }
    }

    /**
     * Sync scroll between editor and line numbers
     */
    function syncScroll() {
        const lineNumbers = document.getElementById('line-numbers');
        lineNumbers.scrollTop = elements.codeEditor.scrollTop;
    }

    /**
     * Handle execution state changes
     */
    function handleExecutionState(data) {
        const { isRunning, isPaused } = data;

        // Update button states
        elements.btnRun.disabled = isRunning && !isPaused;
        elements.btnStep.disabled = isRunning && !isPaused;
        elements.btnPause.disabled = !isRunning;

        // Update pause button text
        if (isPaused) {
            elements.btnPause.innerHTML = '<span class="btn-icon">&#9654;</span>Resume';
        } else {
            elements.btnPause.innerHTML = '<span class="btn-icon">&#10074;&#10074;</span>Pause';
        }

        // Visual feedback
        if (isRunning) {
            elements.btnRun.classList.add('running');
        } else {
            elements.btnRun.classList.remove('running');
        }
    }

    /**
     * Load example code
     */
    function loadExample(name) {
        const code = examples[name];
        if (code) {
            elements.codeEditor.value = code;
            handleCodeChange();
            handleReset();
        }
    }

    /**
     * Get current code
     */
    function getCode() {
        return elements.codeEditor.value;
    }

    /**
     * Set code
     */
    function setCode(code) {
        elements.codeEditor.value = code;
        handleCodeChange();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        init,
        loadExample,
        getCode,
        setCode,
        handleRun,
        handleStep,
        handlePause,
        handleReset
    };
})();
