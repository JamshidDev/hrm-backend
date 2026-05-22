<?php

namespace Modules\Turnstile\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;


class HCPDeviceEvent extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function device(): BelongsTo
    {
        return $this->belongsTo(HikCentralDevice::class, 'hik_central_device_id');
    }

}
