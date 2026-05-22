<?php

namespace Modules\Turnstile\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Structure\Models\Organization;

class HikCentralAccessLevel extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'devices' => 'array',
    ];

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class,
            'organization_access_levels',
            'hik_central_access_level_id',
            'organization_id');
    }

    public function areas(): HasMany
    {
        return $this->hasMany(HikCentralAccessLevelDevice::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(HikCentralDepartment::class, 'hik_central_department_id');
    }
}
