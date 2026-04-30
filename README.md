# AI-Resistant Exam Environment (AREE)

**Author:** Ujwal Pathak
**Student ID:** U2650380
**Module:** CN6000 Final Year Project
**Institution:** University of East London
**Submission Date:** April 2026

---

## 1. Overview

AREE is a two-layer proctoring system for Moodle that defends online examinations against AI-era cheating methods.

**Layer 1 — Safe Exam Browser (SEB)**
A kiosk-mode browser that prevents OS-level exam circumvention: screenshots, copy/paste, tab switching, application switching, screen sharing, and developer tools.

**Layer 2 — `local_examwatermark` Moodle plugin**
A real-time AI monitoring layer that detects physical-world cheating that SEB cannot see: mobile phones, camera obstruction, multiple persons in frame, and frozen camera feeds.

The two layers together address the full attack surface of a remote examination — digital threats (Layer 1) and physical threats (Layer 2).

---

## 2. What's in this Submission

```
AREE_CN6000_Final/
├── local_examwatermark_plugin/   ← Moodle plugin folder (drop into /local/)
│   ├── amd/
│   │   ├── src/watermark.js          (development source)
│   │   └── build/watermark.min.js    (production build)
│   ├── classes/                       (web service + privacy provider)
│   ├── db/                            (DB schema + services + capabilities)
│   ├── lang/en/                       (English language pack)
│   ├── pix/                           (icon assets)
│   ├── lib.php                        (Moodle hook — injects plugin on quiz pages)
│   ├── settings.php                   (admin settings page)
│   ├── styles.css                     (overlay & panel styles)
│   ├── version.php                    (plugin version metadata)
│   └── view_log.php                   (admin log viewer)
├── config.seb                         (Safe Exam Browser configuration)
└── README.md                          (this file)
```

---

## 3. Plugin Features (`local_examwatermark` v6.0)

The plugin runs on every Moodle quiz attempt page and provides 7 active protections:

| # | Protection | Behaviour |
|---|---|---|
| 1 | **Camera-required gate** | A black-screen overlay blocks the quiz until the student grants camera permission. If permission is denied or times out (8 s), the attempt is terminated. |
| 2 | **Frozen-frame detection** | Compares consecutive video frames; if the feed stops changing for 2 seconds (camera covered with a static object), the attempt is terminated. |
| 3 | **Stream watcher** | Polls the camera stream every second; if the camera is unplugged, disabled, or the track ends, the attempt is terminated. |
| 4 | **Multi-region brightness** | Splits each frame into a 3×3 grid; if 3 or more zones drop below the brightness threshold, the camera is judged covered and the attempt is terminated. |
| 5 | **Tab-switching detector** | First switch out of the exam window shows a banner warning; a second switch terminates the attempt. |
| 6 | **DevTools detector** | Detects F12, Ctrl/Cmd+Shift+I/J/C, Ctrl/Cmd+U, and the window-size delta caused by docked DevTools. Any of these terminates the attempt. |
| 7 | **Multi-person & phone detection** | Uses TensorFlow.js with the COCO-SSD model running on the live webcam feed. A `cell phone` prediction (≥ 25 % confidence) or more than one `person` prediction (≥ 50 % confidence) terminates the attempt. |

**Termination flow** (any violation):

1. UI is locked — every input, button, link, keyboard shortcut, right-click is disabled.
2. The Moodle attempt is abandoned server-side via `processattempt.php?finishattempt=1&timeup=1` using `navigator.sendBeacon()`. Even if the student closes the tab the request still goes through.
3. The violation is logged with student ID, attempt ID, course module ID, event type, and Unix timestamp via the plugin's web service.
4. A non-dismissible warning popup with an 8-second countdown is shown.
5. After the countdown, the student is logged out of Moodle entirely (`/login/logout.php`).

The student cannot return to the attempt — server-side it is already marked finished.

The plugin also draws a tamper-resistant identity watermark (full name + student ID + timestamp) tiled across the entire viewport to deter screenshot-based answer leakage.

---

## 4. How to Install

### Prerequisites

- Moodle 4.x running on Apache + MySQL/MariaDB + PHP 8.1+
- A modern browser with camera support (Chrome, Firefox, Edge, Safari)
- Safe Exam Browser 3.6+ on student machines (Windows recommended)

### Installation steps

1. **Copy the plugin folder** to your Moodle installation:
   ```
   <moodle root>/local/examwatermark/
   ```
   (Rename `local_examwatermark_plugin` to `examwatermark` when copying.)

2. **Visit the Moodle site as administrator**. Moodle will detect the new plugin and run the database installer (it creates the detection-log table).

3. **Purge caches:**
   ```
   <moodle root>/admin/purgecaches.php
   ```

4. **Configure a quiz** to use Safe Exam Browser:
   - Quiz settings → Safe Exam Browser → "Require the use of Safe Exam Browser" = **Yes**
   - Upload the supplied `config.seb` (or use it as a template).

### SEB config — IMPORTANT before deployment

Open `config.seb` in the SEB Configuration Tool (Windows) and update one field:

```
Start URL → http://localhost/moodle/mod/quiz/view.php?id=<your_quiz_cmid>
```

If deploying on a real server, change `localhost` to the Moodle hostname.

---

## 5. Platform Notes — Mac vs Windows

**Important honesty for the marker:** Safe Exam Browser on macOS does **not** expose the camera API to embedded web content. This is a documented limitation of SEB's macOS WebKit implementation, not a fault of this plugin. On Mac, SEB will load the quiz, lock the OS, and block screenshots/copy/etc., but the plugin's camera-based detections will report "Not Available" because no `getUserMedia` permission can be granted inside SEB's macOS webview.

**Windows SEB has full camera support** — all 7 protections work. For full-feature evaluation of this submission please test on Windows.

The plugin itself works identically on Mac and Windows when accessed through a normal browser (Chrome / Firefox / Edge / Safari). SEB is only required for the screenshot / copy / OS-lockdown layer.

---

## 6. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       STUDENT'S COMPUTER                        │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │           SAFE EXAM BROWSER (kiosk mode)                │  │
│   │  • Blocks screenshots, copy/paste, Cmd+Tab, F12         │  │
│   │  • Locks OS, disables app switching                     │  │
│   │  • Whitelists Moodle URL + TensorFlow CDN only          │  │
│   │                                                         │  │
│   │  ┌─────────────────────────────────────────────────┐    │  │
│   │  │           MOODLE QUIZ PAGE                      │    │  │
│   │  │                                                 │    │  │
│   │  │  ┌─────────────────────────────────────────┐    │    │  │
│   │  │  │   local_examwatermark plugin (JS)       │    │    │  │
│   │  │  │   • Camera gate                         │    │    │  │
│   │  │  │   • Watermark overlay                   │    │    │  │
│   │  │  │   • COCO-SSD detection (phone/person)   │    │    │  │
│   │  │  │   • Brightness + frozen-frame analysis  │    │    │  │
│   │  │  │   • Tab/DevTools/stream watchers        │    │    │  │
│   │  │  └─────────────────────────────────────────┘    │    │  │
│   │  └─────────────────────────────────────────────────┘    │  │
│   └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼ (HTTPS)
┌─────────────────────────────────────────────────────────────────┐
│                        MOODLE SERVER                            │
│   • Stores attempts, marks them "finished" on violation         │
│   • local_examwatermark_log table records every event           │
│   • Web service: local_examwatermark_log_event                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Threat Coverage Matrix

| Threat | SEB | Plugin | Combined |
|---|---|---|---|
| Screenshot (Cmd+Shift+3, PrintScreen) | ✅ | ❌ | ✅ |
| Copy text, paste into ChatGPT in another tab | ✅ | ❌ | ✅ |
| Cmd+Tab to other application | ✅ | ✅ (detect+kick) | ✅ |
| Open browser developer tools | ✅ | ✅ | ✅ |
| Switch to another browser tab | ✅ | ✅ | ✅ |
| View page source (Cmd+U) | ✅ | ✅ | ✅ |
| Right-click → Inspect | ✅ | ✅ | ✅ |
| **Hold up mobile phone with answers** | ❌ | ✅ | ✅ |
| **Cover the webcam with hand/paper** | ❌ | ✅ | ✅ |
| **Unplug webcam mid-exam** | ❌ | ✅ | ✅ |
| **Have a second person in the room helping** | ❌ | ✅ | ✅ |
| **Freeze the camera with a static photo** | ❌ | ✅ | ✅ |
| **Refuse camera permission entirely** | ❌ | ✅ | ✅ |

---

## 8. Web Service & Database

The plugin defines an external function `local_examwatermark_log_event` that writes to the `local_examwatermark_log` table:

| Column | Type | Notes |
|---|---|---|
| `id` | int | auto-increment |
| `userid` | int | FK to `mdl_user` |
| `idnumber` | varchar | student ID number |
| `eventtype` | varchar | `phone_detected`, `camera_blocked`, `camera_frozen`, `camera_disconnected`, `camera_denied`, `tab_switching`, `devtools_opened`, `multiple_persons`, `view_source`, `model_failed` |
| `description` | text | human-readable summary |
| `cmid` | int | course module ID |
| `attemptid` | int | quiz attempt ID |
| `timestamp` | int | Unix timestamp of the event |

Administrators can view logs via the admin user interface (`local/examwatermark/view_log.php`).

---

## 9. Privacy & Compliance

- **No video is recorded or transmitted.** All ML inference (COCO-SSD via TensorFlow.js) runs entirely in the student's browser. The webcam stream never leaves the device.
- **Only metadata is stored:** event type, timestamp, student ID, course module ID. No images, no biometric data, no raw frames.
- A `classes/privacy/provider.php` implementation is included to comply with Moodle's GDPR privacy API (data export, deletion, contextlist).
- The student is shown a clear visible "AREE Security Monitor" panel during the exam, including a live camera preview, so they always know monitoring is active and what is being checked.

---

## 10. Testing Notes for the Marker

**Quickest way to verify all 7 protections without SEB:**

1. Install plugin → log in as a student → start any quiz.
2. The quiz page should immediately ask for camera permission.
3. Try each of the 8 cheat attempts below. Each should terminate the attempt and log the student out:

   | Attempt | Expected outcome |
   |---|---|
   | Hold a mobile phone in front of the camera | Phone detected popup → 8s countdown → logout |
   | Cover the camera with your hand | Camera obstruction popup → countdown → logout |
   | Hold a printed photo in front of the camera (frozen frame) | Camera frozen popup → countdown → logout |
   | Press F12 | DevTools popup → countdown → logout |
   | Switch to another tab twice | Warning, then on second switch: countdown → logout |
   | Have a second person stand behind you | Multiple-people popup → countdown → logout |
   | Refuse camera permission when asked | Camera-denied popup → logout |
   | Unplug the camera mid-exam (USB webcam) | Camera-disconnected popup → logout |

4. After any violation, log back in and reopen the same quiz — the attempt is already marked finished server-side, the student cannot continue.

**To verify the SEB layer:** open `config.seb` on Windows and confirm screenshots, Cmd+Tab, and copy-paste-out-of-window are all blocked.

---

## 11. Known Limitations

- **macOS SEB camera limitation** — see Section 5.
- **TensorFlow.js model load** — first quiz attempt requires ~10 seconds to download the COCO-SSD model (3.8 MB) from `cdn.jsdelivr.net`. On subsequent attempts it is cached.
- **Lighting** — extremely poor room lighting can trigger false camera-blocked alerts. Threshold is tunable via the `BRIGHTNESS_THRESHOLD` constant in `watermark.js`.
- **Plain photo of a person** — the multi-person detector will trigger on *any* visible person including a printed photo of the student. This is intentional (a printed answer sheet held up will fail brightness/frozen checks first).

---

## 12. Contact

Ujwal Pathak — `u2650380@uel.ac.uk`

University of East London, School of Architecture, Computing and Engineering.
