// ====== Custom Cursor ======
const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');
const hoverTargets = document.querySelectorAll('.hover-target, a, button');

let mouseX = 0, mouseY = 0;
let outlineX = 0, outlineY = 0;

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.style.left = `${mouseX}px`;
    cursorDot.style.top = `${mouseY}px`;
});

function animateCursor() {
    let distX = mouseX - outlineX;
    let distY = mouseY - outlineY;
    outlineX += distX * 0.1; // Smoother tracking
    outlineY += distY * 0.1;

    cursorOutline.style.left = `${outlineX}px`;
    cursorOutline.style.top = `${outlineY}px`;
    requestAnimationFrame(animateCursor);
}
animateCursor();

hoverTargets.forEach(target => {
    target.addEventListener('mouseenter', () => {
        cursorOutline.style.width = '60px';
        cursorOutline.style.height = '60px';
        cursorOutline.style.backgroundColor = 'rgba(212, 175, 55, 0.15)';
        cursorOutline.style.borderColor = 'rgba(212, 175, 55, 0.8)';
        cursorDot.style.transform = 'translate(-50%, -50%) scale(0.5)';
    });
    target.addEventListener('mouseleave', () => {
        cursorOutline.style.width = '40px';
        cursorOutline.style.height = '40px';
        cursorOutline.style.backgroundColor = 'transparent';
        cursorOutline.style.borderColor = 'rgba(212, 175, 55, 0.5)';
        cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
    });
});

// ====== Strings Canvas Physics ======
const canvas = document.getElementById('strings-canvas');
const ctx = canvas.getContext('2d');
const chordContainer = document.getElementById('chord-container');

let w, h;
let strings = [];
const numStrings = 6;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseSpeed = 0;

// Acoustic modern chords
const chordNames = ['Cadd9', 'G6', 'Em7', 'Dadd4', 'A7sus4', 'Fmaj7', 'Bm7(11)', 'Emaj9', 'Am9', 'D13'];
// Acoustic string colors: Bronze, Phosphor Bronze, Silver, Gold/Brass
const colors = ['#cd7f32', '#b87333', '#d4af37', '#e6e8fa', '#cca677'];

class GuitarString {
    constructor(y, color) {
        this.baseY = y;
        this.points = [];
        this.numPoints = 50;
        this.color = color;
        this.plucked = false;

        for (let i = 0; i <= this.numPoints; i++) {
            this.points.push({ x: 0, y: y, baseY: y, vy: 0 });
        }
    }

    resize(width) {
        for (let i = 0; i <= this.numPoints; i++) {
            this.points[i].x = (i / this.numPoints) * width;
        }
    }

    update() {
        let isHovered = false;
        
        for (let i = 1; i < this.numPoints; i++) {
            let p = this.points[i];
            
            // Interaction with mouse
            let dx = p.x - mouseX;
            let dy = p.y - mouseY;
            let dist = Math.sqrt(dx * dx + dy * dy);
            
            // Plucking radius string
            if (dist < 40 && Math.abs(mouseSpeed) > 1) {
                p.y += (mouseY - p.y) * 0.6; 
                isHovered = true;
                this.plucked = true;
            } else {
                // Spring physics
                let tension = 0.08;
                let dampening = 0.90;
                
                let targetY = p.baseY;
                // Pull towards neighbors to propagate wave
                let leftP = this.points[i - 1];
                let rightP = this.points[i + 1];
                if (leftP && rightP) {
                    targetY = (leftP.y + rightP.y + p.baseY * 2) / 4;
                }
                
                p.vy += (targetY - p.y) * tension;
                p.vy *= dampening;
                p.y += p.vy;
            }
        }
        
        if (this.plucked && !isHovered) {
            let maxVy = 0;
            let maxP = null;
            for (let i = 1; i < this.numPoints; i++) {
                if (Math.abs(this.points[i].vy) > maxVy) {
                    maxVy = Math.abs(this.points[i].vy);
                    maxP = this.points[i];
                }
            }
            if (maxVy > 5 && maxP) {
                spawnChord(maxP.x, maxP.y, this.color);
            }
            this.plucked = false;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        
        for (let i = 1; i < this.numPoints; i++) {
            let p = this.points[i];
            let nextP = this.points[i+1];
            if (nextP) {
                let xc = (p.x + nextP.x) / 2;
                let yc = (p.y + nextP.y) / 2;
                ctx.quadraticCurveTo(p.x, p.y, xc, yc);
            } else {
                ctx.lineTo(p.x, p.y);
            }
        }
        
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(212, 175, 55, 0.4)';
        ctx.strokeStyle = this.color;
        
        let centerVy = 0;
        for (let i = 0; i < this.numPoints; i++) {
            centerVy = Math.max(centerVy, Math.abs(this.points[i].vy));
        }
        ctx.lineWidth = 1.5 + Math.min(centerVy * 0.4, 5);
        
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

function initCanvas() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    
    strings = [];
    let spacing = h / (numStrings + 1);
    for (let i = 1; i <= numStrings; i++) {
        let color = colors[i % colors.length];
        let string = new GuitarString(spacing * i, color);
        string.resize(w);
        strings.push(string);
    }
}

initCanvas();
window.addEventListener('resize', initCanvas);

function spawnChord(x, y, color) {
    if (chordContainer.childElementCount > 6) return;
    
    const el = document.createElement('div');
    el.className = 'floating-chord';
    el.textContent = chordNames[Math.floor(Math.random() * chordNames.length)];
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.textShadow = `0 0 15px rgba(212, 175, 55, 0.6), 0 0 30px rgba(205, 127, 50, 0.4)`;
    el.style.color = color;
    
    chordContainer.appendChild(el);
    setTimeout(() => el.remove(), 1500);
}

const particles = [];
const numParticles = 50;
for(let i=0; i<numParticles; i++) {
    particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 1) * 0.5 - 0.1,
        alpha: Math.random() * 0.4 + 0.1
    });
}

function drawStrings() {
    ctx.clearRect(0, 0, w, h);
    
    // Ambient dust particles
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx += (Math.random() - 0.5) * 0.02; // Sway
        if (p.y < -10) p.y = h + 10;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.alpha})`;
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(212, 175, 55, 0.4)';
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Calculate mouse speed
    let dx = mouseX - lastMouseX;
    let dy = mouseY - lastMouseY;
    mouseSpeed = Math.sqrt(dx * dx + dy * dy);
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    
    strings.forEach(string => {
        string.update();
        string.draw(ctx);
    });
    
    requestAnimationFrame(drawStrings);
}
drawStrings();

// ====== 3D Hover Tilt Effect ======
const tiltCards = document.querySelectorAll('.hover-tilt');

tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -10; // Max 10 deg
        const rotateY = ((x - centerX) / centerX) * 10;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    });
});

// ====== Scroll Reveal ======
const reveals = document.querySelectorAll('.reveal');
const revealOptions = { margin: '0px 0px -100px 0px', threshold: 0.1 };

const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
        }
    });
}, revealOptions);

reveals.forEach(reveal => {
    revealObserver.observe(reveal);
});
