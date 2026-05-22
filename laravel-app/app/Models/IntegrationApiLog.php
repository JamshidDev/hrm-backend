<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class IntegrationApiLog extends Model
{
    protected $guarded = ['id'];

    protected $table = 'integration_api_logs';

    protected $casts = [
        'request_headers' => 'array',
        'request_body' => 'array',
        'response_body' => 'array',
    ];

    public function model(): MorphTo
    {
        return $this->morphTo();
    }
}
