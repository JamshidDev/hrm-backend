<?php

namespace Modules\Turnstile\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SyncHCPAccessLog extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function sync_events(): HasMany
    {
        $deviceIds = auth()->user()
            ->load('organization.access_levels.areas')
            ->organization
            ?->access_levels
            ->map(function ($item) {
                return $item->areas->pluck('hik_central_device_id');
            })
            ->flatten()->values()->toArray();

        return $this->hasMany(HCPDeviceEvent::class, 'sync_h_c_p_access_log_id')
            ->whereIn('hik_central_device_id', $deviceIds);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

}
