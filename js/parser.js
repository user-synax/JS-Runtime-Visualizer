/**
 * Parser - Simplified JavaScript code parser
 * Parses code into executable instructions for the visualizer
 */

const Parser = (function() {
    /**
     * Token types
     */
    const TokenType = {
        VAR: 'var',
        LET: 'let',
        CONST: 'const',
        FUNCTION: 'function',
        RETURN: 'return',
        IF: 'if',
        ELSE: 'else',
        SETTIMEOUT: 'setTimeout',
        PROMISE: 'Promise',
        CONSOLE: 'console',
        THIS: 'this',
        NEW: 'new',
        IDENTIFIER: 'identifier',
        NUMBER: 'number',
        STRING: 'string',
        BOOLEAN: 'boolean',
        OBJECT: 'object',
        ARRAY: 'array',
        ARROW: '=>',
        CALL: 'call',
        ASSIGNMENT: 'assignment',
        EXPRESSION: 'expression'
    };

    /**
     * Parse code into instructions
     * @param {string} code - JavaScript code
     * @returns {Array} Parsed instructions
     */
    function parse(code) {
        const lines = code.split('\n');
        const instructions = [];
        let lineNumber = 0;
        let inFunction = null;
        let functionBody = [];
        let braceCount = 0;
        let functionStartLine = 0;

        for (let i = 0; i < lines.length; i++) {
            lineNumber = i + 1;
            let line = lines[i].trim();
            
            // Skip empty lines and comments
            if (!line || line.startsWith('//')) continue;

            // Handle function body collection
            if (inFunction !== null) {
                braceCount += (line.match(/{/g) || []).length;
                braceCount -= (line.match(/}/g) || []).length;
                
                if (braceCount === 0) {
                    // Function ends
                    inFunction.body = functionBody.join('\n');
                    inFunction.endLine = lineNumber;
                    instructions.push(inFunction);
                    inFunction = null;
                    functionBody = [];
                } else {
                    functionBody.push(lines[i]);
                }
                continue;
            }

            // Parse function declaration
            const funcMatch = line.match(/^function\s+(\w+)\s*\(([^)]*)\)\s*{?/);
            if (funcMatch) {
                inFunction = {
                    type: 'functionDeclaration',
                    name: funcMatch[1],
                    params: funcMatch[2].split(',').map(p => p.trim()).filter(p => p),
                    line: lineNumber,
                    body: ''
                };
                braceCount = (line.match(/{/g) || []).length;
                braceCount -= (line.match(/}/g) || []).length;
                functionStartLine = lineNumber;
                if (braceCount === 0 && line.includes('{') && line.includes('}')) {
                    // Single line function
                    const bodyMatch = line.match(/{(.*)}/);
                    inFunction.body = bodyMatch ? bodyMatch[1].trim() : '';
                    inFunction.endLine = lineNumber;
                    instructions.push(inFunction);
                    inFunction = null;
                }
                continue;
            }

            // Parse variable declaration
            const varMatch = line.match(/^(var|let|const)\s+(\w+)\s*=\s*(.+?);?$/);
            if (varMatch) {
                const instruction = {
                    type: 'variableDeclaration',
                    declarationType: varMatch[1],
                    name: varMatch[2],
                    value: parseValue(varMatch[3]),
                    line: lineNumber
                };
                instructions.push(instruction);
                continue;
            }

            // Parse variable declaration without assignment
            const varDeclMatch = line.match(/^(var|let|const)\s+(\w+)\s*;?$/);
            if (varDeclMatch) {
                instructions.push({
                    type: 'variableDeclaration',
                    declarationType: varDeclMatch[1],
                    name: varDeclMatch[2],
                    value: { type: 'undefined', value: undefined },
                    line: lineNumber
                });
                continue;
            }

            // Parse setTimeout
            const setTimeoutMatch = line.match(/setTimeout\s*\(\s*(?:function\s*\(\)\s*{([^}]*)}\s*|(\w+))\s*,\s*(\d+)\s*\)/);
            if (setTimeoutMatch) {
                instructions.push({
                    type: 'setTimeout',
                    callback: setTimeoutMatch[1] || setTimeoutMatch[2],
                    delay: parseInt(setTimeoutMatch[3]),
                    line: lineNumber
                });
                continue;
            }

            // Parse setTimeout with arrow function
            const setTimeoutArrowMatch = line.match(/setTimeout\s*\(\s*\(\)\s*=>\s*{?\s*([^}]*?)\s*}?\s*,\s*(\d+)\s*\)/);
            if (setTimeoutArrowMatch) {
                instructions.push({
                    type: 'setTimeout',
                    callback: setTimeoutArrowMatch[1].trim(),
                    delay: parseInt(setTimeoutArrowMatch[2]),
                    line: lineNumber
                });
                continue;
            }

            // Parse Promise.resolve().then()
            const promiseMatch = line.match(/Promise\.resolve\s*\([^)]*\)\s*\.then\s*\(\s*(?:function\s*\(\)\s*{([^}]*)}\s*|\(\)\s*=>\s*{?\s*([^})]*?)\s*}?)\s*\)/);
            if (promiseMatch) {
                instructions.push({
                    type: 'promise',
                    callback: (promiseMatch[1] || promiseMatch[2] || '').trim(),
                    line: lineNumber
                });
                continue;
            }

            // Parse console.log
            const consoleMatch = line.match(/console\.(log|warn|error|info)\s*\(([^)]*)\)/);
            if (consoleMatch) {
                instructions.push({
                    type: 'console',
                    method: consoleMatch[1],
                    args: parseArguments(consoleMatch[2]),
                    line: lineNumber
                });
                continue;
            }

            // Parse function call
            const callMatch = line.match(/^(\w+)\s*\(([^)]*)\)\s*;?$/);
            if (callMatch) {
                instructions.push({
                    type: 'functionCall',
                    name: callMatch[1],
                    args: parseArguments(callMatch[2]),
                    line: lineNumber
                });
                continue;
            }

            // Parse method call (obj.method())
            const methodCallMatch = line.match(/^(\w+)\.(\w+)\s*\(([^)]*)\)\s*;?$/);
            if (methodCallMatch) {
                instructions.push({
                    type: 'methodCall',
                    object: methodCallMatch[1],
                    method: methodCallMatch[2],
                    args: parseArguments(methodCallMatch[3]),
                    line: lineNumber
                });
                continue;
            }

            // Parse assignment
            const assignMatch = line.match(/^(\w+)\s*=\s*(.+?);?$/);
            if (assignMatch) {
                instructions.push({
                    type: 'assignment',
                    name: assignMatch[1],
                    value: parseValue(assignMatch[2]),
                    line: lineNumber
                });
                continue;
            }

            // Parse return statement
            const returnMatch = line.match(/^return\s+(.+?);?$/);
            if (returnMatch) {
                instructions.push({
                    type: 'return',
                    value: parseValue(returnMatch[1]),
                    line: lineNumber
                });
                continue;
            }

            // Parse object creation with new
            const newMatch = line.match(/^(var|let|const)\s+(\w+)\s*=\s*new\s+(\w+)\s*\(([^)]*)\)\s*;?$/);
            if (newMatch) {
                instructions.push({
                    type: 'newObject',
                    declarationType: newMatch[1],
                    name: newMatch[2],
                    constructor: newMatch[3],
                    args: parseArguments(newMatch[4]),
                    line: lineNumber
                });
                continue;
            }
        }

        return processHoisting(instructions);
    }

    /**
     * Parse a value expression
     */
    function parseValue(expr) {
        expr = expr.trim();
        
        // Number
        if (/^-?\d+(\.\d+)?$/.test(expr)) {
            return { type: 'number', value: parseFloat(expr) };
        }
        
        // String
        if (/^["'`].*["'`]$/.test(expr)) {
            return { type: 'string', value: expr.slice(1, -1) };
        }
        
        // Boolean
        if (expr === 'true' || expr === 'false') {
            return { type: 'boolean', value: expr === 'true' };
        }
        
        // null/undefined
        if (expr === 'null') {
            return { type: 'null', value: null };
        }
        if (expr === 'undefined') {
            return { type: 'undefined', value: undefined };
        }
        
        // Array
        if (expr.startsWith('[') && expr.endsWith(']')) {
            const inner = expr.slice(1, -1).trim();
            const elements = inner ? inner.split(',').map(e => parseValue(e.trim())) : [];
            return { type: 'array', value: elements };
        }
        
        // Object
        if (expr.startsWith('{') && expr.endsWith('}')) {
            const inner = expr.slice(1, -1).trim();
            const props = {};
            if (inner) {
                const pairs = inner.split(',');
                pairs.forEach(pair => {
                    const [key, val] = pair.split(':').map(s => s.trim());
                    if (key && val) {
                        props[key.replace(/["']/g, '')] = parseValue(val);
                    }
                });
            }
            return { type: 'object', value: props };
        }
        
        // Arrow function
        if (expr.includes('=>')) {
            const arrowMatch = expr.match(/^\(?([^)]*)\)?\s*=>\s*(.+)$/);
            if (arrowMatch) {
                return {
                    type: 'arrowFunction',
                    params: arrowMatch[1].split(',').map(p => p.trim()).filter(p => p),
                    body: arrowMatch[2].trim()
                };
            }
        }
        
        // Function expression
        if (expr.startsWith('function')) {
            const funcMatch = expr.match(/^function\s*\(?([^)]*)\)?\s*{\s*(.*)?\s*}$/);
            if (funcMatch) {
                return {
                    type: 'function',
                    params: funcMatch[1] ? funcMatch[1].split(',').map(p => p.trim()).filter(p => p) : [],
                    body: funcMatch[2] || ''
                };
            }
        }
        
        // Function call as value
        const callMatch = expr.match(/^(\w+)\s*\(([^)]*)\)$/);
        if (callMatch) {
            return {
                type: 'call',
                name: callMatch[1],
                args: parseArguments(callMatch[2])
            };
        }
        
        // Property access
        if (expr.includes('.')) {
            return { type: 'propertyAccess', value: expr };
        }
        
        // Variable reference
        return { type: 'reference', value: expr };
    }

    /**
     * Parse function arguments
     */
    function parseArguments(argsStr) {
        if (!argsStr || !argsStr.trim()) return [];
        
        const args = [];
        let depth = 0;
        let current = '';
        
        for (let char of argsStr) {
            if (char === '(' || char === '[' || char === '{') depth++;
            if (char === ')' || char === ']' || char === '}') depth--;
            
            if (char === ',' && depth === 0) {
                args.push(parseValue(current.trim()));
                current = '';
            } else {
                current += char;
            }
        }
        
        if (current.trim()) {
            args.push(parseValue(current.trim()));
        }
        
        return args;
    }

    /**
     * Process hoisting - move function declarations and var declarations
     */
    function processHoisting(instructions) {
        const hoisted = [];
        const functionDeclarations = [];
        const varDeclarations = [];
        const rest = [];

        instructions.forEach(inst => {
            if (inst.type === 'functionDeclaration') {
                functionDeclarations.push({
                    ...inst,
                    hoisted: true
                });
            } else if (inst.type === 'variableDeclaration' && inst.declarationType === 'var') {
                // Hoist var declaration (but not initialization)
                varDeclarations.push({
                    type: 'hoistedVar',
                    name: inst.name,
                    line: inst.line,
                    originalLine: inst.line
                });
                rest.push(inst);
            } else {
                rest.push(inst);
            }
        });

        // Add hoisting markers
        if (functionDeclarations.length > 0 || varDeclarations.length > 0) {
            hoisted.push({
                type: 'hoistingPhase',
                functions: functionDeclarations.map(f => f.name),
                vars: varDeclarations.map(v => v.name),
                line: 0
            });
        }

        return [...hoisted, ...functionDeclarations, ...varDeclarations, ...rest];
    }

    /**
     * Parse function body for nested execution
     */
    function parseBody(body) {
        return parse(body);
    }

    /**
     * Get all function names from instructions
     */
    function getFunctionNames(instructions) {
        return instructions
            .filter(i => i.type === 'functionDeclaration')
            .map(i => i.name);
    }

    /**
     * Find function by name
     */
    function findFunction(instructions, name) {
        return instructions.find(i => i.type === 'functionDeclaration' && i.name === name);
    }

    // Public API
    return {
        parse,
        parseBody,
        parseValue,
        parseArguments,
        getFunctionNames,
        findFunction,
        TokenType
    };
})();
