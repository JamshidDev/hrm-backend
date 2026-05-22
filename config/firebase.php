<?php

return [
    'project_id'         => env('FIREBASE_PROJECT_ID'),
    'service_account'    => env('FIREBASE_CREDENTIALS_JSON'),
    'android_channel_id' => env('FCM_ANDROID_CHANNEL_ID', 'hrm_railway_mobile'),
];
