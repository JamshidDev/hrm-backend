<?php

namespace Modules\Turnstile\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Structure\Models\Organization;


class Terminal extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    public function scopeSearch($query)
    {
        return $query->when(request('search'), function ($q, $search) {
            $q->whereLike('name', "%$search%")
                ->orWhereLike('name_ru', "%$search%")
                ->orWhereLike('name_en', "%$search%");
        });
    }

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class,
            'organization_terminals', 'terminal_id', 'organization_id'
        );
    }

}
