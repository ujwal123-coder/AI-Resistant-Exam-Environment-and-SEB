<?php
// db/services.php — local_examwatermark
// Registers our AJAX function so Moodle's web service layer knows about it
// Author: Ujwal Pathak (U2650380)

defined('MOODLE_INTERNAL') || die();

$functions = [
    'local_examwatermark_log_event' => [
        'classname'     => 'local_examwatermark_external',
        'methodname'    => 'log_event',
        'description'   => 'Log a suspicious exam monitoring event (phone detected, camera denied)',
        'type'          => 'write',
        'ajax'          => true,        // allows JavaScript to call this
        'loginrequired' => true,
    ],
];
