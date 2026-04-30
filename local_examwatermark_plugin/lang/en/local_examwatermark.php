<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Language strings for the local_examwatermark plugin.
 *
 * @package    local_examwatermark
 * @copyright  2026 Ujwal Pathak <u2650380@example.ac.uk>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

$string['pluginname'] = 'Exam Watermark';
$string['pluginname_desc'] = 'Overlays a dynamic watermark with student identification on quiz pages to deter screen capture and mobile phone photography.';

// Admin settings strings.
$string['settings_heading'] = 'Exam Watermark Settings';
$string['settings_heading_desc'] = 'Configure how the watermark overlay appears during quiz attempts. The watermark is designed to be non-intrusive but visible enough to deter photography and screen capture.';

$string['enabled'] = 'Enable watermark';
$string['enabled_desc'] = 'When enabled, the watermark overlay will appear on all quiz attempt pages for logged-in students.';

$string['opacity'] = 'Watermark opacity';
$string['opacity_desc'] = 'Set the transparency level of the watermark text. Lower values make the watermark more transparent (0.03 = very faint, 0.15 = clearly visible). Recommended range: 0.05 to 0.10.';

$string['fontsize'] = 'Font size (px)';
$string['fontsize_desc'] = 'The size of the watermark text in pixels. Larger sizes are more visible but may be more distracting. Recommended: 16 to 24 pixels.';

$string['rotation'] = 'Text rotation (degrees)';
$string['rotation_desc'] = 'The angle of rotation for the watermark text, in degrees. A diagonal watermark (e.g., -30 degrees) is harder to crop out of photographs.';

$string['colour'] = 'Watermark colour';
$string['colour_desc'] = 'The colour of the watermark text in hexadecimal format (e.g., #000000 for black, #cc0000 for red). Choose a colour that contrasts with typical page backgrounds.';

$string['display_studentid'] = 'Show student ID number';
$string['display_studentid_desc'] = 'Include the student\'s institutional ID number in the watermark text.';

$string['display_fullname'] = 'Show full name';
$string['display_fullname_desc'] = 'Include the student\'s full name in the watermark text.';

$string['display_email'] = 'Show email address';
$string['display_email_desc'] = 'Include the student\'s email address in the watermark text.';

$string['display_timestamp'] = 'Show timestamp';
$string['display_timestamp_desc'] = 'Include the current date and time in the watermark text. This helps identify exactly when a photo was taken.';

$string['display_ipaddress'] = 'Show IP address';
$string['display_ipaddress_desc'] = 'Include the student\'s IP address in the watermark text. Useful for identifying the network location during the exam.';

$string['pattern'] = 'Watermark pattern';
$string['pattern_desc'] = 'Choose how the watermark is distributed across the screen. "Tiled" repeats the watermark in a grid pattern. "Diagonal band" places a single band across the page. "Random scatter" places watermarks at random positions.';
$string['pattern_tiled'] = 'Tiled grid';
$string['pattern_diagonal'] = 'Diagonal band';
$string['pattern_scatter'] = 'Random scatter';

$string['refresh_interval'] = 'Refresh interval (seconds)';
$string['refresh_interval_desc'] = 'How often the watermark position should shift slightly, in seconds. This prevents students from finding a "clean" area to photograph. Set to 0 to disable movement.';

// Capability strings.
$string['examwatermark:exempt'] = 'Exempt from exam watermark';
$string['examwatermark:manage'] = 'Manage exam watermark settings';

// Privacy strings.
$string['privacy:metadata'] = 'The Exam Watermark plugin does not store any personal data. It only reads user profile information (name, ID, email) at render time to generate the overlay.';
