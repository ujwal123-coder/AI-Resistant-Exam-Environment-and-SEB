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
 * Admin settings for the local_examwatermark plugin.
 *
 * These settings allow administrators to configure the watermark
 * appearance, content, and behaviour without modifying any code.
 * All settings are stored in the mdl_config_plugins table under
 * the 'local_examwatermark' plugin namespace.
 *
 * @package    local_examwatermark
 * @copyright  2026 Ujwal Pathak <u2650380@example.ac.uk>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {

    // Create a new settings page under the "Local plugins" category.
    $settings = new admin_settingpage(
        'local_examwatermark',
        get_string('pluginname', 'local_examwatermark')
    );

    // Add the settings page to the admin tree.
    $ADMIN->add('localplugins', $settings);

    // ---------------------------------------------------------------
    // Section: General settings.
    // ---------------------------------------------------------------

    $settings->add(new admin_setting_heading(
        'local_examwatermark/settings_heading',
        get_string('settings_heading', 'local_examwatermark'),
        get_string('settings_heading_desc', 'local_examwatermark')
    ));

    // Enable/disable the watermark globally.
    $settings->add(new admin_setting_configcheckbox(
        'local_examwatermark/enabled',
        get_string('enabled', 'local_examwatermark'),
        get_string('enabled_desc', 'local_examwatermark'),
        0  // Disabled by default for safety.
    ));

    // ---------------------------------------------------------------
    // Section: Watermark content — what information to display.
    // ---------------------------------------------------------------

    $settings->add(new admin_setting_configcheckbox(
        'local_examwatermark/display_studentid',
        get_string('display_studentid', 'local_examwatermark'),
        get_string('display_studentid_desc', 'local_examwatermark'),
        1  // Enabled by default — the primary identifier.
    ));

    $settings->add(new admin_setting_configcheckbox(
        'local_examwatermark/display_fullname',
        get_string('display_fullname', 'local_examwatermark'),
        get_string('display_fullname_desc', 'local_examwatermark'),
        1  // Enabled by default.
    ));

    $settings->add(new admin_setting_configcheckbox(
        'local_examwatermark/display_email',
        get_string('display_email', 'local_examwatermark'),
        get_string('display_email_desc', 'local_examwatermark'),
        0  // Disabled by default — may be too much text.
    ));

    $settings->add(new admin_setting_configcheckbox(
        'local_examwatermark/display_timestamp',
        get_string('display_timestamp', 'local_examwatermark'),
        get_string('display_timestamp_desc', 'local_examwatermark'),
        1  // Enabled by default — helps trace when photos were taken.
    ));

    $settings->add(new admin_setting_configcheckbox(
        'local_examwatermark/display_ipaddress',
        get_string('display_ipaddress', 'local_examwatermark'),
        get_string('display_ipaddress_desc', 'local_examwatermark'),
        0  // Disabled by default — privacy consideration.
    ));

    // ---------------------------------------------------------------
    // Section: Watermark appearance.
    // ---------------------------------------------------------------

    // Opacity slider (stored as a text value, validated as float).
    $settings->add(new admin_setting_configtext(
        'local_examwatermark/opacity',
        get_string('opacity', 'local_examwatermark'),
        get_string('opacity_desc', 'local_examwatermark'),
        '0.07',
        PARAM_FLOAT
    ));

    // Font size in pixels.
    $settings->add(new admin_setting_configtext(
        'local_examwatermark/fontsize',
        get_string('fontsize', 'local_examwatermark'),
        get_string('fontsize_desc', 'local_examwatermark'),
        '18',
        PARAM_INT
    ));

    // Rotation angle in degrees.
    $settings->add(new admin_setting_configtext(
        'local_examwatermark/rotation',
        get_string('rotation', 'local_examwatermark'),
        get_string('rotation_desc', 'local_examwatermark'),
        '-30',
        PARAM_INT
    ));

    // Watermark text colour (hex).
    $settings->add(new admin_setting_configcolourpicker(
        'local_examwatermark/colour',
        get_string('colour', 'local_examwatermark'),
        get_string('colour_desc', 'local_examwatermark'),
        '#000000'
    ));

    // Watermark pattern type.
    $patternoptions = [
        'tiled'    => get_string('pattern_tiled', 'local_examwatermark'),
        'diagonal' => get_string('pattern_diagonal', 'local_examwatermark'),
        'scatter'  => get_string('pattern_scatter', 'local_examwatermark'),
    ];
    $settings->add(new admin_setting_configselect(
        'local_examwatermark/pattern',
        get_string('pattern', 'local_examwatermark'),
        get_string('pattern_desc', 'local_examwatermark'),
        'tiled',
        $patternoptions
    ));

    // Refresh interval in seconds.
    $settings->add(new admin_setting_configtext(
        'local_examwatermark/refresh_interval',
        get_string('refresh_interval', 'local_examwatermark'),
        get_string('refresh_interval_desc', 'local_examwatermark'),
        '30',
        PARAM_INT
    ));
}
