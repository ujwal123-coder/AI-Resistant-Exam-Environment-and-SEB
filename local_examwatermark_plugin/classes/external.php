<?php
// classes/external.php — local_examwatermark
// This file defines the web service function that JavaScript calls
// to log suspicious events (phone detected, camera denied, etc.)
// Author: Ujwal Pathak (U2650380)

defined('MOODLE_INTERNAL') || die();
require_once($CFG->libdir . '/externallib.php');

class local_examwatermark_external extends external_api {

    /**
     * Describes the parameters accepted by log_event()
     * JavaScript must pass all of these
     */
    public static function log_event_parameters() {
        return new external_function_parameters([
            'eventtype'   => new external_value(PARAM_ALPHANUMEXT, 'Type of event'),
            'description' => new external_value(PARAM_TEXT,        'Description'),
            'studentid'   => new external_value(PARAM_TEXT,        'Student ID number'),
            'cmid'        => new external_value(PARAM_INT,         'Course module ID'),
            'attemptid'   => new external_value(PARAM_INT,         'Quiz attempt ID'),
            'timestamp'   => new external_value(PARAM_INT,         'Unix timestamp'),
        ]);
    }

    /**
     * The actual log_event function.
     * Called by watermark.js via Moodle Ajax when a phone is detected.
     */
    public static function log_event($eventtype, $description, $studentid, $cmid, $attemptid, $timestamp) {
        global $DB, $USER;

        // Validate parameters
        $params = self::validate_parameters(self::log_event_parameters(), [
            'eventtype'   => $eventtype,
            'description' => $description,
            'studentid'   => $studentid,
            'cmid'        => $cmid,
            'attemptid'   => $attemptid,
            'timestamp'   => $timestamp,
        ]);

        // Security: only logged-in non-guest users can log events
        if (!isloggedin() || isguestuser()) {
            return ['success' => false];
        }

        // Write to the database table we defined in install.xml
        $record = new stdClass();
        $record->userid      = $USER->id;
        $record->studentid   = $params['studentid'];
        $record->cmid        = $params['cmid'];
        $record->attemptid   = $params['attemptid'];
        $record->eventtype   = $params['eventtype'];
        $record->description = $params['description'];
        $record->timecreated = time(); // use server time, not client time

        $DB->insert_record('local_examwatermark_log', $record);

        return ['success' => true];
    }

    /**
     * Describes what log_event() returns
     */
    public static function log_event_returns() {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Whether the log was saved')
        ]);
    }
}
