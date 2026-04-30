const SolarTimePicker = (() => {
    const NS = 'http://www.w3.org/2000/svg';
    const W = 640, H = 320;
    let worldGeo = null; // shared across all instances

    // ── Helpers ───────────────────────────────────────────────────────────────

    const pad2 = n => String(Math.floor(Math.abs(n))).padStart(2, '0');
    const fmtTime = m => pad2(m / 60) + ':' + pad2(m % 60);

    function getDoy() {
        const n = new Date();
        return Math.floor((n - new Date(n.getFullYear(), 0, 1)) / 86400e3) + 1;
    }

    function solarDeclRad(doy) {
        const B = 2 * Math.PI * (doy - 1) / 365;
        return 0.006918 - 0.399912 * Math.cos(B) + 0.070257 * Math.sin(B)
            - 0.006758 * Math.cos(2 * B) + 0.000907 * Math.sin(2 * B);
    }

    // Slider left (00:00) → +180° (right edge); slider right (24:00) → -180° (left edge)
    const subLonDeg = utcH => 180 - utcH * 15;

    function terminatorCoords(declRad, subLon, zenithOffsetDeg) {
        const cosZ = Math.cos((90 + zenithOffsetDeg) * Math.PI / 180);
        const sinD = Math.sin(declRad), cosD = Math.cos(declRad);
        const coords = [];
        for (let lon = -180; lon <= 180; lon += 0.5) {
            const cosHA = Math.cos((lon - subLon) * Math.PI / 180);
            const R = Math.sqrt(sinD * sinD + cosD * cosD * cosHA * cosHA);
            if (R < 1e-10 || Math.abs(cosZ / R) > 1) continue;
            const lat = (Math.asin(cosZ / R) - Math.atan2(cosD * cosHA, sinD)) * 180 / Math.PI;
            if (lat >= -90 && lat <= 90) coords.push([lon, lat]);
        }
        return coords;
    }

    function nightPolygon(coords, declRad) {
        if (coords.length < 2) return null;
        const pole = declRad >= 0 ? -90 : 90;
        const f = coords[0], l = coords[coords.length - 1];
        return [...coords, [l[0], pole], [f[0], pole], f];
    }

    function makeSVG(tag, attrs) {
        const el = document.createElementNS(NS, tag);
        Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
        return el;
    }

    // ── Validation ────────────────────────────────────────────────────────────

    function parseManual(raw) {
        // Accepts: "7", "07", "7:30", "07:30", "730" → { h, m } or null
        const s = raw.trim();
        let h, m;
        if (/^\d{1,2}:\d{2}$/.test(s)) {
            [h, m] = s.split(':').map(Number);
        } else if (/^\d{3,4}$/.test(s)) {
            h = Math.floor(Number(s) / 100);
            m = Number(s) % 100;
        } else if (/^\d{1,2}$/.test(s)) {
            h = Number(s); m = 0;
        } else {
            return null;
        }
        if (h < 0 || h > 23 || m < 0 || m > 59) return null;
        return { h, m, minutes: h * 60 + m };
    }

    // ── Map rendering ─────────────────────────────────────────────────────────

    function createRenderer(fieldId) {
        const projection = d3.geoEquirectangular()
            .scale(H / Math.PI)
            .translate([W / 2, H / 2]);
        const pathGen = d3.geoPath(projection);

        function renderPoly(g, coords, declRad, fill) {
            const poly = nightPolygon(coords, declRad);
            if (!poly) return;
            try {
                const d = pathGen({ type: 'Polygon', coordinates: [poly] });
                if (d) g.appendChild(makeSVG('path', { d, fill, stroke: 'none' }));
            } catch (e) {}
        }

        function updateSolar(utcMinutes) {
            const utcH = utcMinutes / 60;
            const doy = getDoy();
            const declRad = solarDeclRad(doy);
            const declDeg = declRad * 180 / Math.PI;
            const subLon = subLonDeg(utcH);

            const termCoords  = terminatorCoords(declRad, subLon, 0);
            const civilCoords = terminatorCoords(declRad, subLon, 6);
            const nautCoords  = terminatorCoords(declRad, subLon, 12);

            const g = id => document.getElementById(fieldId + '-' + id);

            g('nautG').innerHTML  = ''; renderPoly(g('nautG'),  nautCoords,  declRad, 'rgba(20,30,80,0.22)');
            g('civilG').innerHTML = ''; renderPoly(g('civilG'), civilCoords, declRad, 'rgba(20,30,80,0.32)');
            g('nightG').innerHTML = ''; renderPoly(g('nightG'), termCoords,  declRad, 'rgba(15,25,65,0.62)');

            g('termG').innerHTML = '';
            if (termCoords.length > 1) {
                try {
                    const d = pathGen({ type: 'LineString', coordinates: termCoords });
                    if (d) g('termG').appendChild(makeSVG('path', {
                        d, fill: 'none', stroke: 'rgba(255,210,80,0.65)',
                        'stroke-width': '1', 'stroke-dasharray': '4 3'
                    }));
                } catch (e) {}
            }

            g('sunG').innerHTML = '';
            const proj = projection([subLon, Math.max(-75, Math.min(75, declDeg))]);
            if (proj) {
                const [sx, sy] = proj;
                if (sx >= 0 && sx <= W && sy >= 0 && sy <= H) {
                    [
                        { r: 22, fill: 'rgba(255,180,0,0.13)' },
                        { r: 14, fill: 'rgba(255,200,0,0.22)' },
                        { r: 9,  fill: '#e86000' },
                        { r: 7,  fill: '#f5a000' },
                        { r: 5,  fill: '#ffd040' },
                    ].forEach(({ r, fill }) =>
                        g('sunG').appendChild(makeSVG('circle', { cx: sx, cy: sy, r, fill }))
                    );
                    for (let ri = 0; ri < 8; ri++) {
                        const ra = ri * Math.PI / 4, long = ri % 2 === 0;
                        g('sunG').appendChild(makeSVG('line', {
                            x1: sx + Math.cos(ra) * 11, y1: sy + Math.sin(ra) * 11,
                            x2: sx + Math.cos(ra) * (long ? 18 : 15),
                            y2: sy + Math.sin(ra) * (long ? 18 : 15),
                            stroke: 'rgba(245,160,0,0.9)',
                            'stroke-width': long ? '2' : '1.5',
                            'stroke-linecap': 'round'
                        }));
                    }
                }
            }

            g('overlayG').innerHTML = '';
            g('overlayG').appendChild(makeSVG('rect', { x: 6, y: 6, width: 80, height: 20, rx: 4, fill: 'rgba(255,255,255,0.88)' }));
            const txt = makeSVG('text', { x: 12, y: 20, 'font-size': '11', 'font-weight': '600', fill: '#1f2937', 'font-family': 'sans-serif' });
            txt.textContent = fmtTime(utcMinutes) + ' UTC';
            g('overlayG').appendChild(txt);
        }

        function buildMap(geo) {
            const svg = document.getElementById(fieldId + '-map-svg');
            svg.innerHTML = '';
            svg.appendChild(makeSVG('rect', { width: W, height: H, fill: '#a8c8e8' }));
            svg.appendChild(makeSVG('path', {
                d: pathGen(d3.geoGraticule()()) || '',
                fill: 'none', stroke: 'rgba(255,255,255,0.18)', 'stroke-width': '0.4'
            }));
            const landG = makeSVG('g');
            geo.features.forEach(f => landG.appendChild(makeSVG('path', {
                d: pathGen(f) || '', fill: '#d4ddc8', stroke: '#aab89a', 'stroke-width': '0.4'
            })));
            svg.appendChild(landG);
            ['nautG', 'civilG', 'nightG'].forEach(id => {
                const g = makeSVG('g'); g.id = fieldId + '-' + id; svg.appendChild(g);
            });
            const borderG = makeSVG('g');
            geo.features.forEach(f => borderG.appendChild(makeSVG('path', {
                d: pathGen(f) || '', fill: 'none',
                stroke: 'rgba(130,150,110,0.5)', 'stroke-width': '0.35'
            })));
            svg.appendChild(borderG);
            ['termG', 'sunG', 'overlayG'].forEach(id => {
                const g = makeSVG('g'); g.id = fieldId + '-' + id; svg.appendChild(g);
            });
            document.getElementById(fieldId + '-map-loading').style.display = 'none';
            svg.classList.remove('hidden');
            return updateSolar;
        }

        return { buildMap, updateSolar };
    }

    // ── Public init ───────────────────────────────────────────────────────────

    function init(fieldId, defaultValue) {
        const [dh, dm] = (defaultValue || '00:00').split(':').map(Number);
        const state = { minutes: dh * 60 + dm, built: false, open: false };

        const $ = suffix => document.getElementById(fieldId + '-' + suffix);
        const hidden   = document.getElementById(fieldId);
        const trigger  = $('trigger');
        const popup    = $('popup');
        const slider   = $('slider');
        const badge    = $('badge');
        const display  = $('display');
        const manual   = $('manual');
        const confirm  = $('confirm');

        const { buildMap, updateSolar } = createRenderer(fieldId);

        slider.value = state.minutes;
        badge.textContent = fmtTime(state.minutes);

        function syncAll(minutes) {
            state.minutes = minutes;
            slider.value = minutes;
            badge.textContent = fmtTime(minutes);
            manual.value = fmtTime(minutes);
            manual.classList.remove('invalid');
            if (state.built) updateSolar(minutes);
        }

        function commit() {
            const val = fmtTime(state.minutes);
            display.textContent = val + ' UTC';
            hidden.value = val;
        }

        // Slider input
        slider.addEventListener('input', () => syncAll(parseInt(slider.value)));

        // Manual text entry — validate on input, apply on Enter or blur
        manual.addEventListener('input', () => {
            const parsed = parseManual(manual.value);
            manual.classList.toggle('invalid', !parsed && manual.value.trim() !== '');
        });

        function applyManual() {
            const parsed = parseManual(manual.value);
            if (parsed) {
                syncAll(parsed.minutes);
                manual.classList.remove('invalid');
            } else if (manual.value.trim() === '') {
                // reset to current
                manual.value = fmtTime(state.minutes);
            } else {
                manual.classList.add('invalid');
            }
        }

        manual.addEventListener('blur', applyManual);
        manual.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); applyManual(); manual.blur(); }
        });

        // Trigger opens popup
        trigger.addEventListener('click', async () => {
            state.open = !state.open;
            trigger.classList.toggle('open', state.open);
            popup.classList.toggle('open', state.open);

            if (state.open && !state.built) {
                if (!worldGeo) {
                    try {
                        const res  = await fetch('/data/countries-110m.json');
                        const topo = await res.json();
                        worldGeo   = topojson.feature(topo, topo.objects.countries);
                    } catch (e) {
                        document.getElementById(fieldId + '-map-loading').textContent = 'Failed to load map.';
                        return;
                    }
                }
                buildMap(worldGeo);
                updateSolar(state.minutes);
                state.built = true;
            } else if (state.open) {
                updateSolar(state.minutes);
            }
        });

        // Close on outside click
        document.addEventListener('click', e => {
            if (!trigger.contains(e.target) && !popup.contains(e.target) && !manual.contains(e.target)) {
                state.open = false;
                trigger.classList.remove('open');
                popup.classList.remove('open');
            }
        });

        // Confirm button
        confirm.addEventListener('click', () => {
            commit();
            state.open = false;
            trigger.classList.remove('open');
            popup.classList.remove('open');
        });

        // Init display
        syncAll(state.minutes);
        commit();
    }

    return { init };
})();