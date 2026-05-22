<?php

namespace Modules\Structure\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use ShiftOneLabs\LaravelCascadeDeletes\CascadesDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;


class Region extends Model
{
    use SoftDeletes, CascadesDeletes, LogsActivity;

    protected $guarded = [];

    public function getActivityLogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logUnguarded()
            ->logOnlyDirty();
    }

    protected array $cascadeDeletes = ['cities'];

    public function cities(): HasMany
    {
        return $this->hasMany(City::class);
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function scopeSearch($query)
    {
        return $query
            ->when(request('search'), function ($q, $search) {
                $q->whereLike('name', "%$search%");
            })
            ->when(request('country_id'), function ($q, $country_id) {
                $q->where('country_id', $country_id);
            });
    }

}
