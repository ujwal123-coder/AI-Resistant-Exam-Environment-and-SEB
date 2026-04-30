/**
 * Watermark overlay module for the local_examwatermark plugin.
 * v6.0 - FULL ANTI-CHEAT SUITE
 *   1. Camera-required gate (no camera = no exam)
 *   2. Frozen-frame detection (covering = instant kick)
 *   3. Stream watcher (disconnect = instant kick)
 *   4. Multi-region brightness (9 zones, not average)
 *   5. Tab switching detector (1 warning, 2nd = kick)
 *   6. DevTools detector (F12/inspect = instant kick)
 *   7. Multiple-person detection (2+ faces = kick)
 *
 * @module     local_examwatermark/watermark
 * @copyright  2026 Ujwal Pathak <u2650380@example.ac.uk>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define([], function() {
    'use strict';

    var config = {};
    var overlayElement = null;
    var canvasElement = null;
    var refreshTimer = null;
    var tamperObserver = null;

    // Detection state
    var tfModel        = null;
    var videoElement   = null;
    var videoStream    = null;
    var warningShown   = false;
    var examTerminated = false;
    var examStarted    = false;
    var detectionTimer = null;
    var streamWatchTimer = null;
    var devtoolsTimer  = null;

    // Tunable thresholds
    var DETECT_INTERVAL      = 500;
    var CONFIDENCE_PHONE     = 0.25;
    var CONFIDENCE_PERSON    = 0.50;
    var BRIGHTNESS_THRESHOLD = 35;
    var FROZEN_THRESHOLD     = 2.0;   // pixel diff below this = frozen
    var FROZEN_FRAMES_MAX    = 4;     // 4 × 500ms = 2 seconds frozen
    var CAMERA_GATE_TIMEOUT  = 8000;  // ms to wait for camera before kicking
    var TAB_SWITCH_LIMIT     = 1;     // first = warning, second = kick

    // Tracking state
    var detectionLog = [];
    var panelElement = null;
    var lastFrameData = null;
    var frozenFrames = 0;
    var tabSwitchCount = 0;
    var lastTabWarningShown = false;

    // ── WATERMARK ─────────────────────────────────────────────────

    function buildWatermarkText() {
        var text = config.watermarkText || 'EXAM';
        if (config.showTimestamp) {
            var now = new Date();
            text += ' | ' +
                now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0') + ' ' +
                String(now.getHours()).padStart(2, '0') + ':' +
                String(now.getMinutes()).padStart(2, '0') + ':' +
                String(now.getSeconds()).padStart(2, '0');
        }
        return text;
    }

    function createOverlay() {
        var existing = document.getElementById('examwatermark-overlay');
        if (existing) { existing.parentNode.removeChild(existing); }
        overlayElement = document.createElement('div');
        overlayElement.id = 'examwatermark-overlay';
        overlayElement.setAttribute('aria-hidden', 'true');
        overlayElement.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9000;overflow:hidden;';
        canvasElement = document.createElement('canvas');
        canvasElement.id = 'examwatermark-canvas';
        canvasElement.style.cssText = 'width:100%;height:100%;display:block;';
        overlayElement.appendChild(canvasElement);
        document.body.appendChild(overlayElement);
    }

    function renderWatermark() {
        if (!canvasElement) { return; }
        var w = window.innerWidth, h = window.innerHeight;
        var dpr = window.devicePixelRatio || 1;
        canvasElement.width = w * dpr;
        canvasElement.height = h * dpr;
        var ctx = canvasElement.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);
        var text = buildWatermarkText();
        var fontSize = config.fontSize || 18;
        var rotation = (config.rotation || -30) * (Math.PI / 180);
        ctx.font = fontSize + 'px "Courier New", Courier, monospace';
        ctx.fillStyle = config.colour || '#000000';
        ctx.globalAlpha = config.opacity || 0.07;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        var tw = ctx.measureText(text).width;
        var sx = tw + 80, sy = fontSize * 6;
        var diag = Math.sqrt(w*w + h*h);
        for (var y = -diag/2; y < h + diag/2; y += sy) {
            for (var x = -diag/2; x < w + diag/2; x += sx) {
                ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.fillText(text, 0, 0); ctx.restore();
            }
        }
    }

    function setupTamperDetection() {
        if (tamperObserver) { tamperObserver.disconnect(); }
        tamperObserver = new MutationObserver(function() {
            var op = document.getElementById('examwatermark-overlay');
            if (!op) { createOverlay(); renderWatermark(); return; }
            var cs = window.getComputedStyle(op);
            if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') {
                op.style.display = 'block'; op.style.visibility = 'visible'; op.style.opacity = '1';
            }
        });
        tamperObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style','class','hidden'] });
    }

    function setupRefreshTimer() {
        if (refreshTimer) { clearInterval(refreshTimer); }
        var interval = (config.refreshInterval || 30) * 1000;
        if (interval > 0) { refreshTimer = setInterval(renderWatermark, interval); }
    }

    function handleResize() {
        var t = null;
        window.addEventListener('resize', function() {
            if (t) { clearTimeout(t); }
            t = setTimeout(renderWatermark, 200);
        });
    }

    // ── SECURITY PANEL ────────────────────────────────────────────

    function createSecurityPanel() {
        var existing = document.getElementById('aree-security-panel');
        if (existing) { existing.remove(); }
        panelElement = document.createElement('div');
        panelElement.id = 'aree-security-panel';
        panelElement.style.cssText = 'position:fixed;bottom:16px;right:16px;width:280px;background:#fff;border:1px solid #dee2e6;border-radius:6px;box-shadow:0 2px 12px rgba(0,0,0,0.12);z-index:99999;font-family:Arial,sans-serif;font-size:13px;color:#343a40;overflow:hidden;pointer-events:auto;';
        panelElement.innerHTML =
            '<div style="background:#c0392b;color:#fff;padding:8px 12px;font-weight:bold;font-size:13px;display:flex;justify-content:space-between;">' +
            '  <span>&#128274; AREE Security Monitor</span>' +
            '  <span id="aree-panel-toggle" style="cursor:pointer;font-size:16px;">&#8722;</span>' +
            '</div>' +
            '<div id="aree-panel-body" style="padding:10px 12px;">' +
            '  <div style="background:#f8f9fa;border:1px solid #e9ecef;border-radius:4px;padding:7px 10px;margin-bottom:8px;font-size:12px;">' +
            '    <strong>Student:</strong> <span id="aree-student-name">…</span><br>' +
            '    <strong>ID:</strong> <span id="aree-student-id">…</span>' +
            '  </div>' +
            '  <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;"><span>SEB Monitoring</span><span id="aree-badge-seb"  style="background:#28a745;color:#fff;border-radius:3px;padding:2px 8px;font-size:11px;font-weight:bold;">ACTIVE</span></div>' +
            '  <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;"><span>Camera</span><span id="aree-badge-cam"  style="background:#6c757d;color:#fff;border-radius:3px;padding:2px 8px;font-size:11px;font-weight:bold;">Requesting…</span></div>' +
            '  <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;"><span>AI Model (COCO-SSD)</span><span id="aree-badge-tf"   style="background:#6c757d;color:#fff;border-radius:3px;padding:2px 8px;font-size:11px;font-weight:bold;">Loading…</span></div>' +
            '  <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;"><span>Scan Status</span><span id="aree-badge-scan" style="background:#6c757d;color:#fff;border-radius:3px;padding:2px 8px;font-size:11px;font-weight:bold;">Waiting</span></div>' +
            '  <div style="display:flex;justify-content:space-between;padding:5px 0;"><span>Tab Focus</span><span id="aree-badge-tab"  style="background:#28a745;color:#fff;border-radius:3px;padding:2px 8px;font-size:11px;font-weight:bold;">Focused</span></div>' +
            '  <video id="aree-cam-preview" autoplay muted playsinline style="display:none;width:100%;border-radius:4px;margin-top:8px;border:1px solid #dee2e6;max-height:120px;object-fit:cover;background:#000;"></video>' +
            '  <div style="margin-top:8px;">' +
            '    <div style="font-weight:bold;font-size:11px;color:#868e96;text-transform:uppercase;margin-bottom:4px;">Detection Log</div>' +
            '    <div id="aree-log" style="background:#f8f9fa;border:1px solid #e9ecef;border-radius:4px;padding:6px 8px;max-height:90px;overflow-y:auto;font-size:11px;font-family:monospace;"><em style="color:#adb5bd;">No events yet</em></div>' +
            '  </div>' +
            '  <div style="margin-top:8px;font-size:10px;color:#adb5bd;text-align:center;">All activity is recorded &amp; monitored</div>' +
            '</div>';
        document.body.appendChild(panelElement);
        var toggle = document.getElementById('aree-panel-toggle');
        var body = document.getElementById('aree-panel-body');
        if (toggle && body) {
            toggle.addEventListener('click', function() {
                if (body.style.display === 'none') { body.style.display = 'block'; toggle.textContent = '−'; }
                else { body.style.display = 'none'; toggle.textContent = '+'; }
            });
        }
        var nameEl = document.getElementById('aree-student-name');
        var idEl = document.getElementById('aree-student-id');
        if (nameEl) { nameEl.textContent = config.watermarkText || 'Student'; }
        if (idEl) { idEl.textContent = config.idnumber || config.userId || 'Unknown'; }
    }

    function updateBadge(id, text, colour) {
        var el = document.getElementById(id);
        if (!el) { return; }
        el.textContent = text;
        el.style.background = colour;
    }

    function addLogEntry(msg, isAlert) {
        var n = new Date();
        var t = String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0') + ':' + String(n.getSeconds()).padStart(2,'0');
        detectionLog.unshift({ time: t, msg: msg, alert: !!isAlert });
        if (detectionLog.length > 25) { detectionLog.pop(); }
        var logEl = document.getElementById('aree-log');
        if (!logEl) { return; }
        if (detectionLog.length === 0) { logEl.innerHTML = '<em style="color:#adb5bd;">No events yet</em>'; return; }
        logEl.innerHTML = detectionLog.map(function(e) {
            var c = e.alert ? '#c0392b' : '#28a745';
            return '<div style="color:' + c + ';margin-bottom:2px;">[' + e.time + '] ' + e.msg + '</div>';
        }).join('');
    }

    // ── PROTECTION 1: CAMERA-REQUIRED GATE ────────────────────────

    function showCameraGate() {
        // Block the entire page until camera is granted
        var gate = document.createElement('div');
        gate.id = 'aree-camera-gate';
        gate.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.95);z-index:2147483645;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;';
        gate.innerHTML =
            '<div style="background:#fff;border-radius:8px;padding:32px 40px;max-width:480px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,0.5);">' +
            '<div style="font-size:48px;margin-bottom:12px;">&#128247;</div>' +
            '<h2 style="color:#cc0000;margin:0 0 12px;font-size:22px;">Camera Permission Required</h2>' +
            '<p style="color:#333;font-size:14px;line-height:1.7;margin:0 0 16px;">' +
                'This examination requires webcam access for academic integrity monitoring.<br><br>' +
                '<strong>You must allow camera access to continue.</strong><br>' +
                'If you have denied permission, the exam will be terminated.' +
            '</p>' +
            '<div id="aree-gate-status" style="background:#fff3cd;border:1px solid #ffc107;border-radius:4px;padding:10px;font-size:13px;color:#856404;">Waiting for camera permission…</div>' +
            '</div>';
        document.body.appendChild(gate);
    }

    function hideCameraGate() {
        var gate = document.getElementById('aree-camera-gate');
        if (gate) { gate.remove(); }
    }

    function updateCameraGateStatus(text, isError) {
        var s = document.getElementById('aree-gate-status');
        if (!s) { return; }
        s.textContent = text;
        if (isError) {
            s.style.background = '#f8d7da';
            s.style.borderColor = '#dc3545';
            s.style.color = '#721c24';
        }
    }

    function startWebcam() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            updateBadge('aree-badge-cam', 'Not Supported', '#dc3545');
            addLogEntry('Camera API not available', true);
            updateCameraGateStatus('Camera not supported on this browser. Exam terminated.', true);
            setTimeout(function() { triggerViolation('camera_unsupported'); }, 2000);
            return;
        }

        // Camera-required gate timeout
        var gateTimer = setTimeout(function() {
            if (!examStarted) {
                addLogEntry('Camera permission timeout', true);
                updateCameraGateStatus('Camera permission denied or timed out. Exam terminated.', true);
                setTimeout(function() { triggerViolation('camera_denied'); }, 2000);
            }
        }, CAMERA_GATE_TIMEOUT);

        navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
            .then(function(stream) {
                clearTimeout(gateTimer);
                videoStream = stream;
                videoElement = document.getElementById('aree-cam-preview');
                if (!videoElement) {
                    videoElement = document.createElement('video');
                    videoElement.autoplay = true; videoElement.muted = true; videoElement.playsInline = true;
                    videoElement.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;';
                    document.body.appendChild(videoElement);
                } else {
                    videoElement.style.display = 'block';
                }
                videoElement.srcObject = stream;
                videoElement.play();
                updateBadge('aree-badge-cam', 'Active ✓', '#28a745');
                addLogEntry('Camera connected');
                examStarted = true;
                hideCameraGate();
                loadTensorFlowModel();
                startStreamWatcher();
            })
            .catch(function(err) {
                clearTimeout(gateTimer);
                updateBadge('aree-badge-cam', 'Denied', '#dc3545');
                addLogEntry('Camera denied: ' + (err.name || 'error'), true);
                updateCameraGateStatus('Camera permission denied. Exam terminated.', true);
                setTimeout(function() { triggerViolation('camera_denied'); }, 2000);
            });
    }

    // ── PROTECTION 3: STREAM WATCHER ──────────────────────────────

    function startStreamWatcher() {
        streamWatchTimer = setInterval(function() {
            if (examTerminated) { return; }
            if (!videoStream) {
                triggerViolation('camera_disconnected');
                return;
            }
            var tracks = videoStream.getVideoTracks();
            if (tracks.length === 0) {
                triggerViolation('camera_disconnected');
                return;
            }
            var track = tracks[0];
            // Track ended OR muted (camera turned off mid-exam)
            if (track.readyState === 'ended' || track.muted) {
                addLogEntry('⚠ Camera stream lost!', true);
                triggerViolation('camera_disconnected');
                return;
            }
            // Video element no longer producing frames
            if (videoElement && videoElement.readyState < 2) {
                // Wait one more cycle before kicking — could be temporary buffering
                return;
            }
        }, 1000);
    }

    function loadTensorFlowModel() {
        updateBadge('aree-badge-tf', 'Loading…', '#fd7e14');
        addLogEntry('Loading COCO-SSD model…');
        var attempts = 0;
        var waiter = setInterval(function() {
            attempts++;
            if (window.cocoSsd && window.tf) {
                clearInterval(waiter);
                window.cocoSsd.load().then(function(m) {
                    tfModel = m;
                    updateBadge('aree-badge-tf', 'Ready ✓', '#28a745');
                    updateBadge('aree-badge-scan', 'Scanning', '#17a2b8');
                    addLogEntry('COCO-SSD model ready');
                    startDetectionLoop();
                }).catch(function() {
                    updateBadge('aree-badge-tf', 'Error', '#dc3545');
                    addLogEntry('Model load failed', true);
                    triggerViolation('model_failed');
                });
            }
            if (attempts > 60) {
                clearInterval(waiter);
                updateBadge('aree-badge-tf', 'Timeout', '#dc3545');
                addLogEntry('Model load timed out', true);
                triggerViolation('model_failed');
            }
        }, 500);
    }

    // ── PROTECTION 4: MULTI-REGION BRIGHTNESS + PROTECTION 2: FROZEN-FRAME ──

    // Returns { brightness: avg, dark_zones: count, frozen: bool }
    function analyzeFrame() {
        var result = { brightness: 128, darkZones: 0, frozen: false };
        try {
            var size = 90; // 90×90 sample, divided into 3×3 zones of 30×30
            var c = document.createElement('canvas');
            c.width = size; c.height = size;
            var cx = c.getContext('2d');
            cx.drawImage(videoElement, 0, 0, size, size);
            var d = cx.getImageData(0, 0, size, size).data;

            // Multi-region: split into 9 zones (3×3 grid)
            var zoneSize = size / 3;
            var zones = [0,0,0,0,0,0,0,0,0];
            var zoneCounts = [0,0,0,0,0,0,0,0,0];
            var totalAll = 0;

            for (var y = 0; y < size; y++) {
                for (var x = 0; x < size; x++) {
                    var idx = (y * size + x) * 4;
                    var pixel = (d[idx] + d[idx+1] + d[idx+2]) / 3;
                    var zoneX = Math.min(2, Math.floor(x / zoneSize));
                    var zoneY = Math.min(2, Math.floor(y / zoneSize));
                    var zoneIdx = zoneY * 3 + zoneX;
                    zones[zoneIdx] += pixel;
                    zoneCounts[zoneIdx]++;
                    totalAll += pixel;
                }
            }

            // Count dark zones (zone average below threshold)
            var darkZones = 0;
            for (var z = 0; z < 9; z++) {
                var avg = zones[z] / zoneCounts[z];
                if (avg < BRIGHTNESS_THRESHOLD) { darkZones++; }
            }
            result.darkZones = darkZones;
            result.brightness = totalAll / (size * size);

            // Frozen-frame check: compare to last frame
            if (lastFrameData) {
                var diff = 0;
                for (var i = 0; i < d.length; i += 16) { // sample every 4th pixel for speed
                    diff += Math.abs(d[i] - lastFrameData[i]);
                }
                var avgDiff = diff / (d.length / 16);
                if (avgDiff < FROZEN_THRESHOLD) {
                    result.frozen = true;
                }
            }
            // Save current frame as Uint8ClampedArray (or copy)
            lastFrameData = new Uint8ClampedArray(d);
        } catch(e) {}
        return result;
    }

    function startDetectionLoop() {
        detectionTimer = setInterval(function() {
            if (examTerminated || warningShown) { return; }
            if (!tfModel || !videoElement || videoElement.readyState < 2) { return; }

            var analysis = analyzeFrame();

            // Camera blocked: 3+ zones dark OR overall too dark
            if (analysis.darkZones >= 3 || analysis.brightness < BRIGHTNESS_THRESHOLD) {
                updateBadge('aree-badge-scan', '⚠ BLOCKED!', '#dc3545');
                addLogEntry('⚠ Camera blocked (' + analysis.darkZones + ' dark zones)', true);
                triggerViolation('camera_blocked');
                return;
            }

            // Frozen frames
            if (analysis.frozen) {
                frozenFrames++;
                if (frozenFrames >= FROZEN_FRAMES_MAX) {
                    updateBadge('aree-badge-scan', '⚠ FROZEN!', '#dc3545');
                    addLogEntry('⚠ Camera feed frozen!', true);
                    triggerViolation('camera_frozen');
                    return;
                }
            } else {
                frozenFrames = 0;
            }

            // PROTECTION 7: AI detection — phone + person count
            tfModel.detect(videoElement).then(function(predictions) {
                if (examTerminated || warningShown) { return; }
                var phoneFound = false;
                var phoneScore = 0;
                var personCount = 0;

                predictions.forEach(function(p) {
                    if (p.class === 'cell phone' && p.score >= CONFIDENCE_PHONE) {
                        phoneFound = true;
                        if (p.score > phoneScore) { phoneScore = p.score; }
                    }
                    if (p.class === 'person' && p.score >= CONFIDENCE_PERSON) {
                        personCount++;
                    }
                });

                if (phoneFound) {
                    updateBadge('aree-badge-scan', '⚠ PHONE!', '#dc3545');
                    addLogEntry('⚠ Phone detected (' + Math.round(phoneScore*100) + '%)', true);
                    triggerViolation('phone_detected');
                    return;
                }

                if (personCount > 1) {
                    updateBadge('aree-badge-scan', '⚠ ' + personCount + ' PEOPLE!', '#dc3545');
                    addLogEntry('⚠ ' + personCount + ' people detected!', true);
                    triggerViolation('multiple_persons');
                    return;
                }

                if (personCount === 0) {
                    // No person visible — could be student moved away OR
                    // covered the camera (caught above) OR just a temporary blip
                    updateBadge('aree-badge-scan', 'No person', '#fd7e14');
                } else {
                    updateBadge('aree-badge-scan', 'Scanning', '#17a2b8');
                }
            }).catch(function(){});
        }, DETECT_INTERVAL);
    }

    // ── PROTECTION 5: TAB SWITCHING DETECTOR ──────────────────────

    function setupTabSwitchDetector() {
        document.addEventListener('visibilitychange', function() {
            if (examTerminated) { return; }
            if (document.hidden) {
                tabSwitchCount++;
                updateBadge('aree-badge-tab', 'Lost focus!', '#dc3545');
                addLogEntry('⚠ Tab switched / window minimised (#' + tabSwitchCount + ')', true);
                logDetectionEvent('tab_switch');

                if (tabSwitchCount > TAB_SWITCH_LIMIT) {
                    triggerViolation('tab_switching');
                } else {
                    // First time — just warn (don't kick yet)
                    showTabSwitchWarning();
                }
            } else {
                if (!warningShown && !examTerminated) {
                    updateBadge('aree-badge-tab', 'Focused', '#28a745');
                }
            }
        });

        // Also watch blur events as backup
        window.addEventListener('blur', function() {
            if (examTerminated || warningShown) { return; }
            updateBadge('aree-badge-tab', 'Lost focus!', '#dc3545');
        });
        window.addEventListener('focus', function() {
            if (examTerminated || warningShown) { return; }
            updateBadge('aree-badge-tab', 'Focused', '#28a745');
        });
    }

    function showTabSwitchWarning() {
        if (lastTabWarningShown) { return; }
        lastTabWarningShown = true;
        var w = document.createElement('div');
        w.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#fff3cd;border:2px solid #ffc107;color:#856404;padding:14px 20px;border-radius:6px;z-index:2147483645;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.2);max-width:500px;text-align:center;';
        w.innerHTML = '⚠ <strong>Warning:</strong> Tab/window switch detected. Switching tabs again will <strong>terminate your exam</strong>.';
        document.body.appendChild(w);
        setTimeout(function() {
            if (w.parentNode) { w.parentNode.removeChild(w); }
            lastTabWarningShown = false;
        }, 6000);
    }

    // ── PROTECTION 6: DEVTOOLS DETECTOR ───────────────────────────

    function setupDevToolsDetector() {
        // Method 1: Window size diff
        var threshold = 160;
        devtoolsTimer = setInterval(function() {
            if (examTerminated) { return; }
            var widthDiff = window.outerWidth - window.innerWidth;
            var heightDiff = window.outerHeight - window.innerHeight;
            if (widthDiff > threshold || heightDiff > threshold) {
                addLogEntry('⚠ DevTools opened!', true);
                triggerViolation('devtools_opened');
            }
        }, 1000);

        // Method 2: Block keyboard shortcuts that open devtools
        window.addEventListener('keydown', function(e) {
            if (examTerminated) { return; }
            // F12
            if (e.key === 'F12') {
                e.preventDefault();
                addLogEntry('⚠ F12 pressed!', true);
                triggerViolation('devtools_opened');
                return;
            }
            // Ctrl/Cmd + Shift + I / J / C
            if ((e.ctrlKey || e.metaKey) && e.shiftKey &&
                (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'i' || e.key === 'j' || e.key === 'c')) {
                e.preventDefault();
                addLogEntry('⚠ DevTools shortcut!', true);
                triggerViolation('devtools_opened');
                return;
            }
            // Ctrl/Cmd + U (view source)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
                e.preventDefault();
                addLogEntry('⚠ View source attempt!', true);
                triggerViolation('view_source');
                return;
            }
        }, true);

        // Method 3: console.log timing trick (devtools open = debugger is slow)
        // Disabled for performance; window-size method is reliable enough.
    }

    // ── HARD KICK ─────────────────────────────────────────────────

    function triggerViolation(eventType) {
        if (warningShown) { return; }
        warningShown = true;
        examTerminated = true;

        if (detectionTimer) { clearInterval(detectionTimer); detectionTimer = null; }
        if (streamWatchTimer) { clearInterval(streamWatchTimer); streamWatchTimer = null; }
        if (devtoolsTimer) { clearInterval(devtoolsTimer); devtoolsTimer = null; }

        lockEverything();
        logDetectionEvent(eventType);
        abandonAttemptOnServer();
        showWarningPopup(eventType);
    }

    function lockEverything() {
        var all = document.querySelectorAll('input, button, select, textarea, a');
        all.forEach(function(el) {
            try {
                el.disabled = true;
                el.style.pointerEvents = 'none';
                if (el.tagName === 'A') { el.removeAttribute('href'); }
            } catch(e) {}
        });
        window.addEventListener('keydown', function(e) {
            e.preventDefault(); e.stopPropagation();
        }, true);
        if (window.history && window.history.pushState) {
            window.history.pushState(null, '', window.location.href);
            window.addEventListener('popstate', function() {
                window.history.pushState(null, '', window.location.href);
            });
        }
        window.addEventListener('contextmenu', function(e) { e.preventDefault(); }, true);
    }

    function abandonAttemptOnServer() {
        if (!window.M || !window.M.cfg) { return; }
        var attemptId = config.attemptid || 0;
        var sesskey = window.M.cfg.sesskey || '';
        if (!attemptId || !sesskey) { return; }
        var url = window.M.cfg.wwwroot + '/mod/quiz/processattempt.php';
        var fd = new FormData();
        fd.append('attempt', attemptId);
        fd.append('finishattempt', '1');
        fd.append('timeup', '1');
        fd.append('sesskey', sesskey);
        try {
            if (navigator.sendBeacon) { navigator.sendBeacon(url, fd); }
            else { fetch(url, { method: 'POST', body: fd, credentials: 'same-origin', keepalive: true }); }
            addLogEntry('Server: attempt abandoned', true);
        } catch(e) {}
    }

    function getViolationDetails(eventType) {
        var titles = {
            phone_detected:      ['Mobile Device Detected', 'A mobile phone has been detected near your screen.', 'Using a mobile device during this examination is a violation of academic integrity policy.', '📵'],
            camera_blocked:      ['Camera Obstruction Detected', 'Your camera has been covered or blocked.', 'Blocking the camera during an examination is a violation of academic integrity policy.', '🚫'],
            camera_frozen:       ['Camera Feed Frozen', 'The camera feed has stopped updating.', 'A frozen camera feed indicates tampering or covering. This is a violation of academic integrity.', '❄️'],
            camera_disconnected: ['Camera Disconnected', 'The camera has been turned off or unplugged.', 'Disconnecting the camera during an examination is a violation of academic integrity policy.', '🔌'],
            camera_denied:       ['Camera Permission Denied', 'You did not grant camera permission.', 'Camera access is required for this examination. Without it, the exam cannot proceed.', '🚫'],
            camera_unsupported:  ['Camera Not Supported', 'Your browser does not support the required camera APIs.', 'Please use a modern browser (Chrome, Firefox, Edge, Safari) for this examination.', '⚠️'],
            tab_switching:       ['Tab Switching Detected', 'You switched away from the exam window multiple times.', 'Leaving the exam window is a violation of academic integrity policy.', '🔀'],
            devtools_opened:     ['Developer Tools Detected', 'Browser developer tools have been opened.', 'Opening developer tools during an examination is a violation of academic integrity policy.', '🛠️'],
            view_source:         ['View Source Attempt', 'An attempt to view page source was detected.', 'Inspecting page code during an examination is a violation of academic integrity policy.', '🛠️'],
            multiple_persons:    ['Multiple People Detected', 'More than one person is visible on camera.', 'Other people present during an examination is a violation of academic integrity policy.', '👥'],
            model_failed:        ['Security Module Failed', 'The AI monitoring model failed to load.', 'Without active monitoring, the exam cannot proceed for academic integrity reasons.', '⚠️']
        };
        return titles[eventType] || ['Violation Detected', 'A security violation has occurred.', 'Your exam has been terminated.', '⚠️'];
    }

    function showWarningPopup(eventType) {
        var oldW = document.getElementById('examwatermark-phone-warning');
        if (oldW) { oldW.remove(); }
        var oldOv = document.getElementById('examwatermark-phone-overlay');
        if (oldOv) { oldOv.remove(); }

        var details = getViolationDetails(eventType);
        var title = details[0], line1 = details[1], line2 = details[2], icon = details[3];

        var studentId = config.idnumber || config.userId || 'Unknown';
        var now = new Date();
        var ts = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB');
        var countdown = 8;

        var overlay = document.createElement('div');
        overlay.id = 'examwatermark-phone-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.92);z-index:2147483646;pointer-events:auto;';
        overlay.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); }, true);
        document.body.appendChild(overlay);

        var w = document.createElement('div');
        w.id = 'examwatermark-phone-warning';
        w.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border:3px solid #cc0000;border-radius:8px;padding:32px 40px;z-index:2147483647;max-width:480px;width:90%;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,0.5);font-family:Arial,sans-serif;';
        w.innerHTML =
            '<div style="font-size:48px;margin-bottom:12px;">' + icon + '</div>' +
            '<h2 style="color:#cc0000;margin:0 0 10px;font-size:22px;">&#9888; ' + title + '</h2>' +
            '<p style="color:#333;font-size:14px;line-height:1.7;margin:0 0 12px;">' +
                line1 + '<br>' +
                'Your exam attempt has been <strong>terminated and reported to your professor</strong>.<br>' +
                line2 +
            '</p>' +
            '<div style="background:#fff0f0;border:1px solid #ffcccc;border-radius:4px;padding:10px 16px;margin-bottom:16px;font-family:monospace;font-size:13px;color:#cc0000;">Student ID: ' + studentId + ' &nbsp;|&nbsp; ' + ts + '</div>' +
            '<div style="background:#cc0000;color:#fff;border-radius:6px;padding:14px;margin-bottom:16px;">' +
                '<div style="font-size:13px;margin-bottom:4px;">You will be logged out in</div>' +
                '<div id="aree-countdown" style="font-size:42px;font-weight:bold;line-height:1;">' + countdown + '</div>' +
                '<div style="font-size:12px;margin-top:2px;">seconds</div>' +
            '</div>' +
            '<div style="font-size:12px;color:#888;">&#128274; This violation has been logged with your student ID and timestamp</div>';
        document.body.appendChild(w);

        var cdEl = document.getElementById('aree-countdown');
        var t = setInterval(function() {
            countdown--;
            if (cdEl) { cdEl.textContent = countdown; }
            if (countdown <= 0) {
                clearInterval(t);
                forceLogout();
            }
        }, 1000);
    }

    function forceLogout() {
        addLogEntry('Logging student out of Moodle', true);
        if (window.M && window.M.cfg && window.M.cfg.wwwroot) {
            var sesskey = window.M.cfg.sesskey || '';
            var logoutUrl = window.M.cfg.wwwroot + '/login/logout.php?sesskey=' + sesskey;
            window.location.replace(logoutUrl);
        } else {
            window.location.replace('/login/logout.php');
        }
    }

    function logDetectionEvent(eventType) {
        var now = new Date();
        if (!window.M || !window.M.cfg || !window.M.cfg.sesskey) { return; }
        var url = window.M.cfg.wwwroot + '/lib/ajax/service.php?sesskey=' + window.M.cfg.sesskey;
        try {
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                keepalive: true,
                body: JSON.stringify([{
                    methodname: 'local_examwatermark_log_event',
                    args: {
                        eventtype: eventType || 'phone_detected',
                        description: 'Violation: ' + (eventType || 'unknown'),
                        studentid: String(config.idnumber || config.userId || ''),
                        cmid: parseInt(config.cmid || 0, 10),
                        attemptid: parseInt(config.attemptid || 0, 10),
                        timestamp: Math.floor(now.getTime() / 1000)
                    }
                }])
            }).catch(function(){});
        } catch(e) {}
    }

    // ── INIT ──────────────────────────────────────────────────────

    function init(params) {
        config = params || {};
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setup);
        } else {
            setup();
        }
    }

    function setup() {
        createOverlay();
        renderWatermark();
        setupTamperDetection();
        setupRefreshTimer();
        handleResize();
        createSecurityPanel();

        // Show camera gate IMMEDIATELY before anything else
        showCameraGate();
        startWebcam();

        // Tab switching + devtools detection start right away
        setupTabSwitchDetector();
        setupDevToolsDetector();
    }

    return { init: init };
});
