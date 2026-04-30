<?php
// lib.php — local_examwatermark v2.0
defined('MOODLE_INTERNAL') || die();

function local_examwatermark_before_footer() {
    global $PAGE, $USER;

    if (!isloggedin() || isguestuser()) { return ''; }

    // Only run on quiz attempt pages
    $url = $PAGE->url->out_as_local_url();
    if (strpos($url, '/mod/quiz/attempt.php') === false) { return ''; }

    $context = $PAGE->context;
    if (has_capability('mod/quiz:grade', $context)) { return ''; }

    // Always show name + ID (no config dependency)
    $idnumber  = !empty($USER->idnumber) ? $USER->idnumber : $USER->username;
    $fullname  = fullname($USER);
    $attemptid = optional_param('attempt', 0, PARAM_INT);
    $cmid      = optional_param('id', 0, PARAM_INT);

    $watermarktext = s($fullname) . ' | ' . s($idnumber);

    $params = [
        'watermarkText'   => $watermarktext,
        'opacity'         => 0.07,
        'fontSize'        => 18,
        'rotation'        => -30,
        'colour'          => '#000000',
        'pattern'         => 'tiled',
        'refreshInterval' => 30,
        'showTimestamp'   => true,
        'userId'          => (int)$USER->id,
        'idnumber'        => s($idnumber),
        'cmid'            => (int)$cmid,
        'attemptid'       => (int)$attemptid,
    ];

    $PAGE->requires->js_call_amd('local_examwatermark/watermark', 'init', [$params]);

    $tf   = html_writer::tag('script', '', ['src' => 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js']);
    $coco = html_writer::tag('script', '', ['src' => 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js']);

    return $tf . $coco;
}
