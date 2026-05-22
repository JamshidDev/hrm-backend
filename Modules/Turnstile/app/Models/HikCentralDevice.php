<?php

namespace Modules\Turnstile\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class HikCentralDevice extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class,
            'user_turnstile_devices',
            'hik_central_device_id',
            'user_id');
    }

}
