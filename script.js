document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 요소 가져오기 ---
    const massSlider = document.getElementById('mass');
    const surfaceSelect = document.getElementById('surface');
    const appliedForceSlider = document.getElementById('appliedForce');
    const resetButton = document.getElementById('resetButton');
    const massLabel = document.getElementById('massLabel');
    const appliedForceLabel = document.getElementById('appliedForceLabel');
    const normalForceValue = document.getElementById('normalForceValue');
    const maxFrictionValue = document.getElementById('maxFrictionValue');
    const statusValue = document.getElementById('statusValue');
    const canvas = document.getElementById('frictionCanvas');
    const ctx = canvas.getContext('2d');

    // --- 물리 상수 및 데이터 ---
    const g = 9.8;
    const surfaces = {
        ice: { mu_s: 0.1, mu_k: 0.08, color: '#e0f7fa', name: '얼음' },
        wood: { mu_s: 0.4, mu_k: 0.3, color: '#d7ccc8', name: '나무' },
        concrete: { mu_s: 0.7, mu_k: 0.6, color: '#bdbdbd', name: '콘크리트' },
        sandpaper: { mu_s: 0.9, mu_k: 0.8, color: '#9e9e9e', name: '사포' }
    };

    // --- 시뮬레이션 상태 변수 ---
    let boxState = {
        x: canvas.width / 2 - 50,
        width: 100,
        vx: 0,
    };
    
    let isDragging = false;
    let dragClickOffsetX = 0;
    let appliedForce = 0;
    let forceCalculationInterval = null;
    let currentMouseX = 0;

    function getBoxRect() {
        const mass = parseFloat(massSlider.value);
        const height = 40 + mass * 2.5;
        const y = canvas.height - 50 - height;
        return { x: boxState.x, y: y, width: boxState.width, height: height };
    }

    // --- 애니메이션 루프 ---
    function animate() {
        const mass = parseFloat(massSlider.value);
        const surface = surfaces[surfaceSelect.value];
        const kineticFriction = surface.mu_k * mass * g;
        const maxStaticFriction = surface.mu_s * mass * g;
        let netForce = 0;
        
        if (Math.abs(boxState.vx) < 0.01 && Math.abs(appliedForce) <= maxStaticFriction) {
            netForce = 0;
            boxState.vx = 0;
        } else {
            // ✨ 마찰력 방향 수정: 속도가 있으면 속도의 반대방향, 없으면 가하는 힘의 반대방향
            const motionSign = boxState.vx !== 0 ? Math.sign(boxState.vx) : Math.sign(appliedForce);
            const frictionDirection = -motionSign;
            const friction = kineticFriction * frictionDirection;
            netForce = appliedForce + friction;
        }
        
        const movementScale = 10; 
        const acceleration = netForce / (mass * movementScale);
        
        const dt = 0.1;
        const initialVxSign = Math.sign(boxState.vx);
        boxState.vx += acceleration * dt;
        const finalVxSign = Math.sign(boxState.vx);

        // 마찰력에 의해 물체가 멈췄다가 반대로 가는 현상 방지
        if (initialVxSign !== 0 && initialVxSign !== finalVxSign && Math.abs(appliedForce) < kineticFriction) {
            boxState.vx = 0;
        }
        
        boxState.x += boxState.vx * dt;
        
        if (boxState.x > canvas.width + 50) boxState.x = -boxState.width;
        if (boxState.x < -boxState.width - 50) boxState.x = canvas.width;
        
        draw();
        requestAnimationFrame(animate);
    }
    
    // --- 그리기 함수 ---
    function draw() {
        const mass = parseFloat(massSlider.value);
        const surface = surfaces[surfaceSelect.value];
        const normalForce = mass * g;
        const maxStaticFriction = surface.mu_s * mass * g;
        const kineticFriction = surface.mu_k * mass * g;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = surface.color;
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
        ctx.fillStyle = '#666';
        ctx.font = '16px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(`${surface.name} (정지μ: ${surface.mu_s}, 운동μ: ${surface.mu_k})`, canvas.width / 2, canvas.height - 20);

        const boxRect = getBoxRect();
        ctx.fillStyle = '#a569bd';
        ctx.fillRect(boxRect.x, boxRect.y, boxRect.width, boxRect.height);

        updateUITexts(normalForce, maxStaticFriction);

        const arrowY = boxRect.y + boxRect.height / 2;
        let frictionToDisplay = Math.abs(boxState.vx) > 0.01 ? kineticFriction : Math.min(Math.abs(appliedForce), maxStaticFriction);
        
        if (Math.abs(appliedForce) > 0.1) {
            drawArrow(boxRect.x + boxRect.width / 2, arrowY, boxRect.x + boxRect.width / 2 + appliedForce, arrowY, '#3498db', `${appliedForce.toFixed(0)} N`);
        }
        if (frictionToDisplay > 0.1) {
            // ✨ 마찰력 화살표 방향 수정: 속도가 있으면 속도의 반대방향, 없으면 가하는 힘의 반대방향
            const moveDirection = boxState.vx !== 0 ? Math.sign(boxState.vx) : Math.sign(appliedForce);
            if(moveDirection !== 0) {
                const frictionDirection = -moveDirection;
                drawArrow(boxRect.x + boxRect.width/2, arrowY + 30, boxRect.x + boxRect.width/2 + frictionToDisplay * frictionDirection, arrowY + 30, '#e74c3c', `${frictionToDisplay.toFixed(1)} N`);
            }
        }
    }
    
    function drawArrow(fromx, fromy, tox, toy, color, text) {
        tox = fromx + (tox - fromx) * 0.2;
        const headlen = 20;
        const angle = Math.atan2(toy - fromy, tox - fromx);
        const isRight = tox > fromx;

        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 7), toy - headlen * Math.sin(angle - Math.PI / 7));
        ctx.moveTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 7), toy - headlen * Math.sin(angle + Math.PI / 7));
        ctx.stroke();
        
        ctx.fillStyle = color;
        ctx.font = '28px Segoe UI';
        ctx.textAlign = isRight ? 'left' : 'right';
        ctx.fillText(text, tox + (isRight ? 20 : -20), toy + 10);
    }

    function updateUITexts(normalForce, maxStaticFriction) {
        massLabel.textContent = `${massSlider.value}`;
        appliedForceLabel.textContent = `${parseFloat(appliedForceSlider.value).toFixed(0)}`;
        normalForceValue.textContent = normalForce.toFixed(1);
        maxFrictionValue.textContent = maxStaticFriction.toFixed(1);
        const speed = Math.abs(boxState.vx);
        if (speed > 0.01) {
            statusValue.textContent = `움직임 (속도: ${speed.toFixed(1)}m/s)`;
            statusValue.style.color = '#27ae60';
        } else {
             statusValue.textContent = '정지';
             statusValue.style.color = '#e74c3c';
        }
    }
    
    function handleSliderInput() {
        if (isDragging) return;
        appliedForce = parseFloat(appliedForceSlider.value);
    }
    
    function isMouseOverBox(mouseX, mouseY) {
        const boxRect = getBoxRect();
        const centerX = boxRect.x + boxRect.width / 2;
        const centerY = boxRect.y + boxRect.height / 2;
        const halfWidth = boxRect.width / 2;
        const halfHeight = boxRect.height / 2;
        return (mouseX >= centerX - halfWidth) && (mouseX <= centerX + halfWidth) &&
               (mouseY >= centerY - halfHeight) && (mouseY <= centerY + halfHeight);
    }

    function getEventPos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
        const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function startDrag(e) {
        if (e.type === 'touchstart') e.preventDefault();
        const pos = getEventPos(canvas, e);
        if (isMouseOverBox(pos.x, pos.y)) {
            isDragging = true;
            dragClickOffsetX = pos.x - boxState.x;
            canvas.className = 'grabbing';
            appliedForceSlider.disabled = true;
            if (!forceCalculationInterval) {
                currentMouseX = pos.x;
                forceCalculationInterval = setInterval(updateForceFromMouse, 50);
            }
        }
    }

    function drag(e) {
        if (!isDragging) return;
        if (e.type === 'touchmove') e.preventDefault();
        const pos = getEventPos(canvas, e);
        currentMouseX = pos.x;
    }

    function endDrag() {
        if (isDragging) {
            isDragging = false;
            canvas.className = '';
            appliedForceSlider.disabled = false;
            appliedForce = 0;
            appliedForceSlider.value = 0;
            appliedForceLabel.textContent = '0';
            clearInterval(forceCalculationInterval);
            forceCalculationInterval = null;
        }
    }

    function updateForceFromMouse() {
        if (!isDragging) return;
        const anchorX = boxState.x + dragClickOffsetX;
        const stretchDistance = currentMouseX - anchorX;
        let calculatedForce = stretchDistance * 0.3125;
        appliedForce = Math.max(-200, Math.min(200, calculatedForce));
        appliedForceSlider.value = Math.min(Math.abs(appliedForce), appliedForceSlider.max);
        appliedForceLabel.textContent = `${appliedForce.toFixed(0)}`;
    }

    function reset() {
        isDragging = false;
        massSlider.value = 5;
        surfaceSelect.value = 'wood';
        appliedForceSlider.value = 0;
        appliedForceSlider.disabled = false;
        canvas.className = '';
        boxState.x = canvas.width / 2 - 50;
        boxState.vx = 0;
        appliedForce = 0;
    }

    // --- 초기 설정 및 이벤트 리스너 등록 ---
    massSlider.addEventListener('input', handleSliderInput);
    surfaceSelect.addEventListener('change', handleSliderInput);
    appliedForceSlider.addEventListener('input', handleSliderInput);
    resetButton.addEventListener('click', reset);

    canvas.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);

    canvas.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', endDrag);
    
    reset();
    animate();
});