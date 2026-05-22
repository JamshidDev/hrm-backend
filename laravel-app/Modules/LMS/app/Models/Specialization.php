<?php

namespace Modules\LMS\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Structure\Models\Position;


class Specialization extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function direction(): BelongsTo
    {
        return $this->belongsTo(Direction::class);
    }

    public function scopeSearch($query)
    {
        return $query->when(request('search'), function ($q, $search) {
            $q->whereLike('name', "%$search%")->orWhereLike('name_ru', "%$search%")->orWhereLike('name_en', "%$search%");
        });
    }

    public function positions(): BelongsToMany
    {
        return $this->belongsToMany(Position::class, 'specialization_positions');
    }

    public function has_positions(): HasMany
    {
        return $this->hasMany(SpecializationPosition::class, 'specialization_id');
    }
}
