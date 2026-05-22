<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MobileVersion extends Model
{
    protected $fillable = [
        'platform',
        'latest_version',
        'min_supported_version',
        'force_update',
        'store_url',
        'is_active'
    ];
}
