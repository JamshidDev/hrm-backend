<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HmacUser extends Model
{
    protected $table = 'hmac_users';

    protected $fillable = [
        'name',
        'public_key',
        'secret_key',
        'secret_type',
        'is_active',
    ];

    protected $hidden = [
        'secret_key',
    ];

    protected $casts = [
        'secret_key' => 'encrypted',
        'is_active' => 'boolean',
    ];
}
