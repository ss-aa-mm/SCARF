const AlphaDial = (() => {
    const R = 100;

    function pt(deg) {
        const rad = deg * Math.PI / 180;
        return [R * Math.cos(rad), -R * Math.sin(rad)];
    }

    function arc(startDeg, endDeg) {
        const [x1, y1] = pt(startDeg);
        const [x2, y2] = pt(endDeg);
        const large = (startDeg - endDeg) > 180 ? 1 : 0;
        return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
    }

    const MODES = [
        [10,  'Performance-oriented'],
        [30,  'Performance-focused'],
        [70,  'Balanced'],
        [90,  'Sustainability-focused'],
        [100, 'Sustainability-oriented'],
    ];

    function draw(val) {
        const needleDeg = 180 - val * 1.8;

        document.getElementById('dialTrack')
            .setAttribute('d', arc(180, 0));

        document.getElementById('dialFill')
            .setAttribute('d', val > 0 ? arc(180, needleDeg) : '');

        const [nx, ny] = pt(needleDeg);
        const s = 82 / R;
        const needle = document.getElementById('dialNeedle');
        needle.setAttribute('x2', String(nx * s));
        needle.setAttribute('y2', String(ny * s));

        const tg = document.getElementById('dialTicks');
        tg.innerHTML = '';
        for (let i = 0; i <= 10; i++) {
            const deg = 180 - i * 18;
            const [cx, cy] = pt(deg);
            const major = i % 5 === 0;
            const r1 = (major ? R - 28 : R - 24) / R;
            const r2 = (R - 10) / R;
            const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            ln.setAttribute('x1', String(cx * r1)); ln.setAttribute('y1', String(cy * r1));
            ln.setAttribute('x2', String(cx * r2)); ln.setAttribute('y2', String(cy * r2));
            ln.setAttribute('stroke', 'white');
            ln.setAttribute('stroke-width', major ? '2' : '1');
            tg.appendChild(ln);
        }

        document.getElementById('alphaDisplay').textContent =
            (val / 100).toFixed(2);
        document.getElementById('alphaMode').textContent =
            MODES.find(([max]) => val <= max)?.[1] ?? 'Balanced';
        document.getElementById('alphaValue').value =
            (val / 100).toFixed(2);

        document.querySelectorAll('.stp-dial-preset').forEach(b =>
            b.classList.remove('active'));
        const exact = [0, 50, 100];
        const idx = exact.indexOf(val);
        if (idx >= 0)
            document.querySelectorAll('.stp-dial-preset')[idx].classList.add('active');
    }

    function set(v) {
        document.getElementById('alphaSlider').value = v;
        draw(v);
    }

    function init() {
        const slider = document.getElementById('alphaSlider');
        if (!slider) return;
        slider.addEventListener('input', () => draw(parseInt(slider.value)));
        draw(parseInt(slider.value));
    }

    return { init, set };
})();

document.addEventListener('DOMContentLoaded', () => AlphaDial.init());