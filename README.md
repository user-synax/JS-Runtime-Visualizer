# JS Runtime Visualizer

An animated, dark-themed JavaScript runtime simulator that visually explains how JavaScript executes code step-by-step.

---
Live: https://js-visual.netlify.app/
## 📌 Overview

JS Runtime Visualizer is a frontend-only educational tool designed to demonstrate how JavaScript works internally.

Instead of simply running code, it simulates:

- Execution Context creation
- Call Stack push/pop behavior
- Memory Heap allocations
- Scope Chain resolution
- Closures
- Hoisting
- `this` binding
- Event Loop (Macrotasks & Microtasks)

The goal is to bridge the gap between writing JavaScript and understanding the engine behavior behind it.

---

## ✨ Features

### 🧠 Interactive Code Execution
- Editable code panel
- Step-by-step execution
- Run / Pause / Reset controls
- Execution speed control

### 📚 Call Stack Visualization
- Animated push and pop transitions
- Active frame highlighting
- Function-local variable display

### 🗄 Memory Heap Simulation
- Object and function allocation
- Reference visualization
- Garbage collection fade-out effect

### 🌳 Scope Chain Viewer
- Nested scope representation
- Variable resolution tracing
- Hoisting visualization

### 🔁 Event Loop Simulation
- Web APIs section
- Callback Queue
- Microtask Queue
- Task movement animation
- Microtask priority handling

### 🎨 UI & Animation
- Fully dark UI
- Glassmorphism panels
- Smooth transitions
- Neon accent highlights
- Animated gradient background
- Responsive layout

---

## 🛠 Tech Stack

- HTML5  
- CSS3 (Custom animations)  
- Vanilla JavaScript (ES6+)  
- SVG for reference arrows  
- No frameworks  
- No backend  

---

## 📁 Project Structure

```
/index.html
/styles.css
/js
   stateManager.js
   parser.js
   executor.js
   visualizer.js
   animations.js
   ui.js
```

---

## 🏗 Architecture Overview

### stateManager.js
- Central runtime state store  
- Maintains call stack, heap, scopes, event loop  

### parser.js
- Converts input code into simplified executable steps  

### executor.js
- Executes one instruction at a time  
- Updates runtime state  

### visualizer.js
- Renders runtime state to UI  
- Synchronizes animations  

### animations.js
- Handles push/pop effects  
- Task movement transitions  
- Highlight animations  

### ui.js
- Editor controls  
- Buttons and interaction handling  

---

## 🧩 Runtime Model

The application maintains a simplified runtime state object:

```js
{
  callStack: [],
  heap: {},
  scopes: [],
  eventLoop: {
    webAPIs: [],
    callbackQueue: [],
    microtaskQueue: []
  },
  currentLine: number
}
```

Each execution step updates this model, which then triggers UI re-rendering.

---

## ⚙ How It Works

1. User writes or selects example code.  
2. The parser converts the code into simplified executable steps.  
3. The executor runs one step at a time.  
4. State changes are pushed to the state manager.  
5. The visualizer re-renders panels with animations.  

This creates a synchronized visual representation of the JavaScript runtime lifecycle.

---

## 📘 Example Concepts Demonstrated

- Closure memory retention  
- Lexical scoping  
- Variable hoisting  
- Function execution context creation  
- Event loop priority (microtask vs macrotask)  
- `this` binding differences  

---

## 🚀 Running Locally

1. Clone the repository:

```bash
git clone https://github.com/your-username/js-runtime-visualizer.git
```

2. Navigate into the project:

```bash
cd js-runtime-visualizer
```

3. Open `index.html` in a modern browser.

No build step required.

---

## 🎓 Educational Use Case

This tool is useful for:

- Frontend developers preparing for interviews  
- CS students learning runtime internals  
- Engineers who want a deeper understanding of the event loop  
- Visual learners who prefer interactive explanations  

---

## 🔮 Future Improvements

- AST-based parsing (Acorn / Babel)  
- Breakpoint support  
- Timeline scrubber  
- Memory profiling view  
- WebWorker simulation  
- React version for extensibility  

---

## 👨‍💻 Author

Developed as a portfolio-level frontend engineering project focused on runtime simulation, UI animation, and architecture clarity.

---

## 📜 License

MIT License
