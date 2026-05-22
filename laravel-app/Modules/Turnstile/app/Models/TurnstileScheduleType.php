<?php

namespace Modules\Turnstile\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class TurnstileScheduleType extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'days' => 'array'
    ];

    public function groups(): HasMany
    {
        return $this->hasMany(TurnstileScheduleGroup::class);
    }
}
