<?php

namespace Modules\Structure\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class City extends Model
{
    use SoftDeletes, LogsActivity;

    protected $guarded = [];
    public function getActivityLogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logUnguarded()
            ->logOnlyDirty();
    }

    public function scopeSearch($query)
    {
        return $query
            ->when(request('search'), function ($q, $search) {
                $q->whereLike('name', "%$search%");
            })
            ->when(request('region_id'), function ($q, $region_id) {
                $q->where('region_id', $region_id);
            });
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

}
