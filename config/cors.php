<?php

return [

    'paths' => ['api/*', 'v1/*', '*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['Content-Type', 'X-CSRF-TOKEN'],

    'max_age' => 0,

    'supports_credentials' => true,

];
