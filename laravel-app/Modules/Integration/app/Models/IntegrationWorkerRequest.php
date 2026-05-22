<?php

namespace Modules\Integration\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class IntegrationWorkerRequest extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'request' => 'array'
    ];
}
