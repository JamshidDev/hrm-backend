<?php

namespace Modules\HR\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
// use Modules\HR\Database\Factories\DepartmentLocationFactory;

class DepartmentLocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'department_id',
        'geo_type',
        'lat',
        'lng',
        'radius',
        'polygon',
        'accuracy_limit',
    ];

    protected $casts = [
        'geo_type' => 'boolean',
        'polygon' => 'array',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    // protected static function newFactory(): DepartmentLocationFactory
    // {
    //     // return DepartmentLocationFactory::new();
    // }
}
