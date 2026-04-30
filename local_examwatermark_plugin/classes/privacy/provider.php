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
 * Privacy provider for the local_examwatermark plugin.
 *
 * This plugin does not store any personal data. It reads user profile
 * information (name, ID number, email) at render time to generate the
 * watermark overlay, but this data is only sent to the client browser
 * as part of the page output and is not persisted anywhere by the plugin.
 *
 * @package    local_examwatermark
 * @copyright  2026 Ujwal Pathak <u2650380@example.ac.uk>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_examwatermark\privacy;

defined('MOODLE_INTERNAL') || die();

/**
 * Privacy provider implementation.
 *
 * Declares that this plugin does not store any personal user data.
 * The null_provider interface is the correct choice when a plugin
 * processes personal data only transiently (e.g., displaying it on
 * screen) without writing it to the database or file system.
 */
class provider implements \core_privacy\local\metadata\null_provider {

    /**
     * Returns a reason string explaining why no user data is stored.
     *
     * @return string The language string key for the privacy explanation.
     */
    public static function get_reason(): string {
        return 'privacy:metadata';
    }
}
