<?php

namespace Modules\Structure\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VacancyApproveOrganization extends Model
{

    protected $fillable = [
        'from_organization_id',
        'to_organization_id',
    ];

    public function from_organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'from_organization_id');
    }

    public function to_organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'to_organization_id');
    }
}
