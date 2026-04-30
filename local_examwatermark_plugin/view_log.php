<?php
// view_log.php — local_examwatermark
// Admin page: shows all phone detection events logged during exams
// Access via: Site Administration → Reports → Exam Monitor Log
// Author: Ujwal Pathak (U2650380)

require_once('../../config.php');
require_login();
require_capability('moodle/site:config', context_system::instance());

$PAGE->set_url('/local/examwatermark/view_log.php');
$PAGE->set_context(context_system::instance());
$PAGE->set_title('Exam Monitor — Phone Detection Log');
$PAGE->set_heading('Exam Monitor — Phone Detection Log');

echo $OUTPUT->header();
echo $OUTPUT->heading('Suspicious Events Log');

// Get all events, most recent first
$events = $DB->get_records('local_examwatermark_log', null, 'timecreated DESC', '*', 0, 200);

if (empty($events)) {
    echo html_writer::tag('p', 'No events have been logged yet.');
} else {
    // Build an HTML table
    $table = new html_table();
    $table->head = ['Time', 'Student ID', 'User ID', 'Quiz CMID', 'Attempt ID', 'Event Type', 'Description'];
    $table->attributes['class'] = 'generaltable';

    foreach ($events as $event) {
        $row = new html_table_row();
        $row->cells = [
            userdate($event->timecreated),
            s($event->studentid),
            $event->userid,
            $event->cmid,
            $event->attemptid,
            html_writer::tag('strong', s($event->eventtype)),
            s($event->description),
        ];
        // Highlight phone_detected rows in red
        if ($event->eventtype === 'phone_detected') {
            $row->attributes['style'] = 'background:#fff0f0;';
        }
        $table->data[] = $row;
    }

    echo html_writer::table($table);
}

echo $OUTPUT->footer();
