<?php

namespace Modules\LMS\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Structure\Models\Position;


class SpecializationPosition extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'specialization_id',
        'position_id',
    ];

    protected $primaryKey = null;
    public $incrementing = false;

    public function specialization(): BelongsTo
    {
        return $this->belongsTo(Specialization::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }
}
