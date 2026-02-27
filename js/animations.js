/**
 * Animations - Animation utilities and effects
 * Provides smooth animations using CSS and requestAnimationFrame
 */

const Animations = (function() {
    /**
     * Animate element entrance
     * @param {HTMLElement} element - Element to animate
     * @param {Object} options - Animation options
     */
    function animateIn(element, options = {}) {
        const defaults = {
            duration: 300,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: 'translateY(20px)',
            opacity: 0
        };
        const config = { ...defaults, ...options };
        
        element.style.opacity = config.opacity;
        element.style.transform = config.transform;
        element.style.transition = `all ${config.duration}ms ${config.easing}`;
        
        // Force reflow
        element.offsetHeight;
        
        requestAnimationFrame(() => {
            element.style.opacity = 1;
            element.style.transform = 'translateY(0) scale(1)';
        });
        
        return new Promise(resolve => {
            setTimeout(resolve, config.duration);
        });
    }

    /**
     * Animate element exit
     * @param {HTMLElement} element - Element to animate
     * @param {Object} options - Animation options
     */
    function animateOut(element, options = {}) {
        const defaults = {
            duration: 300,
            easing: 'ease-out',
            transform: 'translateY(-20px)',
            opacity: 0
        };
        const config = { ...defaults, ...options };
        
        element.style.transition = `all ${config.duration}ms ${config.easing}`;
        
        requestAnimationFrame(() => {
            element.style.opacity = config.opacity;
            element.style.transform = config.transform;
        });
        
        return new Promise(resolve => {
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
                resolve();
            }, config.duration);
        });
    }

    /**
     * Pulse highlight effect
     * @param {HTMLElement} element - Element to pulse
     * @param {string} color - Glow color (CSS)
     */
    function pulse(element, color = 'rgba(79, 158, 255, 0.5)') {
        const originalBoxShadow = element.style.boxShadow;
        
        element.style.transition = 'box-shadow 250ms ease-out';
        element.style.boxShadow = `0 0 20px ${color}, 0 0 40px ${color}`;
        
        setTimeout(() => {
            element.style.boxShadow = originalBoxShadow;
        }, 500);
    }

    /**
     * Typewriter text animation
     * @param {HTMLElement} element - Element to animate
     * @param {string} text - Text to type
     * @param {number} speed - Characters per interval
     */
    function typewriter(element, text, speed = 30) {
        return new Promise(resolve => {
            let index = 0;
            element.textContent = '';
            
            const interval = setInterval(() => {
                if (index < text.length) {
                    element.textContent += text[index];
                    index++;
                } else {
                    clearInterval(interval);
                    resolve();
                }
            }, speed);
        });
    }

    /**
     * Draw SVG arrow between elements
     * @param {SVGElement} svg - SVG container
     * @param {HTMLElement} from - Source element
     * @param {HTMLElement} to - Target element
     * @param {string} id - Arrow ID
     */
    function drawArrow(svg, from, to, id) {
        // Ensure defs and marker exist
        let defs = svg.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
            marker.setAttribute('id', 'arrowhead');
            marker.setAttribute('markerWidth', '10');
            marker.setAttribute('markerHeight', '7');
            marker.setAttribute('refX', '9');
            marker.setAttribute('refY', '3.5');
            marker.setAttribute('orient', 'auto');
            
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
            polygon.setAttribute('fill', '#a855f7');
            
            marker.appendChild(polygon);
            defs.appendChild(marker);
            svg.appendChild(defs);
        }
        
        const fromRect = from.getBoundingClientRect();
        const toRect = to.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        
        const x1 = fromRect.right - svgRect.left;
        const y1 = fromRect.top + fromRect.height / 2 - svgRect.top;
        const x2 = toRect.left - svgRect.left;
        const y2 = toRect.top + toRect.height / 2 - svgRect.top;
        
        // Create curved path
        const midX = (x1 + x2) / 2;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('id', id);
        path.setAttribute('class', 'heap-arrow');
        path.setAttribute('d', `M ${x1} ${y1} Q ${midX} ${y1}, ${midX} ${(y1 + y2) / 2} T ${x2} ${y2}`);
        path.setAttribute('marker-end', 'url(#arrowhead)');
        
        // Animate drawing
        const length = path.getTotalLength ? path.getTotalLength() : 100;
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;
        path.style.transition = 'stroke-dashoffset 500ms ease-out';
        
        svg.appendChild(path);
        
        requestAnimationFrame(() => {
            path.style.strokeDashoffset = 0;
        });
        
        return path;
    }

    /**
     * Remove SVG arrow with animation
     * @param {SVGElement} svg - SVG container
     * @param {string} id - Arrow ID
     */
    function removeArrow(svg, id) {
        const path = svg.getElementById(id);
        if (path) {
            path.style.opacity = 0;
            setTimeout(() => {
                if (path.parentNode) {
                    path.parentNode.removeChild(path);
                }
            }, 300);
        }
    }

    /**
     * Move element along path (for event loop visualization)
     * @param {HTMLElement} element - Element to move
     * @param {Object} start - Start position {x, y}
     * @param {Object} end - End position {x, y}
     */
    function moveElement(element, start, end, duration = 500) {
        return new Promise(resolve => {
            const startTime = performance.now();
            
            function animate(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Ease out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                
                const x = start.x + (end.x - start.x) * eased;
                const y = start.y + (end.y - start.y) * eased;
                
                element.style.transform = `translate(${x}px, ${y}px)`;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            }
            
            requestAnimationFrame(animate);
        });
    }

    /**
     * Scale bounce animation
     * @param {HTMLElement} element - Element to animate
     */
    function scaleBounce(element) {
        element.style.transition = 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)';
        element.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 150);
    }

    /**
     * Shake animation for errors
     * @param {HTMLElement} element - Element to shake
     */
    function shake(element) {
        element.style.animation = 'none';
        element.offsetHeight; // Trigger reflow
        element.style.animation = 'shake 0.5s ease-out';
    }

    /**
     * Highlight variable lookup path
     * @param {HTMLElement[]} elements - Elements in the lookup path
     */
    function highlightPath(elements, delay = 200) {
        return new Promise(resolve => {
            elements.forEach((el, index) => {
                setTimeout(() => {
                    el.classList.add('highlighting');
                    setTimeout(() => {
                        el.classList.remove('highlighting');
                        if (index === elements.length - 1) {
                            resolve();
                        }
                    }, 500);
                }, index * delay);
            });
        });
    }

    /**
     * Create floating particles background
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    function initParticles(canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        let animationId;
        
        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        
        function createParticle() {
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.3 + 0.1
            };
        }
        
        function init() {
            resize();
            particles = [];
            for (let i = 0; i < 50; i++) {
                particles.push(createParticle());
            }
        }
        
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;
                
                // Wrap around edges
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
                
                // Draw particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(79, 158, 255, ${p.opacity})`;
                ctx.fill();
            });
            
            animationId = requestAnimationFrame(animate);
        }
        
        window.addEventListener('resize', resize);
        init();
        animate();
        
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
        };
    }

    /**
     * Countdown timer animation for Web API tasks
     * @param {HTMLElement} element - Timer element
     * @param {number} duration - Duration in ms
     */
    function countdownTimer(element, duration) {
        return new Promise(resolve => {
            const startTime = Date.now();
            
            function update() {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, duration - elapsed);
                
                element.textContent = `${(remaining / 1000).toFixed(1)}s`;
                
                if (remaining > 0) {
                    requestAnimationFrame(update);
                } else {
                    resolve();
                }
            }
            
            update();
        });
    }

    // Add shake keyframes dynamically
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);

    // Public API
    return {
        animateIn,
        animateOut,
        pulse,
        typewriter,
        drawArrow,
        removeArrow,
        moveElement,
        scaleBounce,
        shake,
        highlightPath,
        initParticles,
        countdownTimer
    };
})();
