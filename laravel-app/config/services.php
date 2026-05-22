<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],
    'minio' => [
        'key' => env('MINIO_ACCESS_KEY'),
        'secret' => env('MINIO_SECRET_KEY'),
        'region' => env('MINIO_REGION', 'us-east-1'),
    ],

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
    ],

    'telegram' => [
        'bot_token' => env('TELEGRAM_BOT_TOKEN'),
    ],
    'eskiz' => [
        'email' => env('ESKIZ_EMAIL'),
        'from' => env('ESKIZ_FROM'),
        'password' => env('ESKIZ_PASSWORD'),
        'token' => env('ESKIZ_TOKEN'),
        'expired' => env('ESKIZ_EXPIRED'),
    ],
    'terminal' => [
        'key' => env('HIK_CENTRAL_KEY'),
        'secret' => env('HIK_CENTRAL_SECRET'),
        'url' => env('HIK_CENTRAL_URL')
    ],
    'zoom' => [
        'client' => env('ZOOM_CLIENT_ID'),
        'secret' => env('ZOOM_CLIENT_SECRET'),
        'account' => env('ZOOM_ACCOUNT_ID'),
        'event_secret' => env('ZOOM_EVENT_SECRET')
    ],
    'ffmpeg' => [
        'path' => env('FFMPEG_PATH', 'ffmpeg'),
    ],
    'ffprobe' => [
        'path' => env('ffprobe_path', 'ffprobe'),
    ],
    'mobile_face' => [
        'secret_key' => env('MOBILE_FACE_SECRET_KEY'),
        'public_key' => env('MOBILE_FACE_PUBLIC_KEY'),
    ],
    'socket' => [
        'secret' => env('SOCKET_SECRET'),
    ],
    'rabbitmq' => [
        'host' => env('RABBITMQ_HOST'),
        'port' => env('RABBITMQ_PORT'),
        'user' => env('RABBITMQ_USER'),
        'password' => env('RABBITMQ_PASS'),
    ],
];
