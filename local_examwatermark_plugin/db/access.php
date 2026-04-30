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
 * Capability definitions for the local_examwatermark plugin.
 *
 * Two capabilities are defined:
 *
 * 1. local/examwatermark:exempt — Allows a user to view quiz pages
 *    without the watermark overlay. This is granted to teachers,
 *    editing teachers, and managers by default so that the watermark
 *    does not interfere when they preview quizzes.
 *
 * 2. local/examwatermark:manage — Allows a user to modify the plugin's
 *    admin settings. Granted to managers and admins by default.
 *
 * @package    local_examwatermark
 * @copyright  2026 Ujwal Pathak <u2650380@example.ac.uk>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$capabilities = [

    // Capability: Exempt from seeing the watermark overlay.
    // Teachers and managers should not see the watermark when previewing
    // quizzes, as it would be distracting and unnecessary.
    'local/examwatermark:exempt' => [
        'captype'      => 'read',
        'contextlevel' => CONTEXT_MODULE,
        'archetypes'   => [
            'editingteacher' => CAP_ALLOW,
            'teacher'        => CAP_ALLOW,
            'manager'        => CAP_ALLOW,
        ],
        'riskbitmask'  => 0,
    ],

    // Capability: Manage watermark plugin settings.
    // Only managers and admins should be able to change the watermark
    // configuration (opacity, content, pattern, etc.).
    'local/examwatermark:manage' => [
        'captype'      => 'write',
        'contextlevel' => CONTEXT_SYSTEM,
        'archetypes'   => [
            'manager' => CAP_ALLOW,
        ],
        'riskbitmask'  => RISK_CONFIG,
    ],
];
