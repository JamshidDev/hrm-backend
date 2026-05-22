<?php

namespace Modules\HR\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Structure\Models\Organization;


class OrganizationDocument extends Model
{
    use SoftDeletes;


    protected $guarded = ['id'];


    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeVisibleToUser($query, User $user)
    {
        $orgId = $user->organization_id;
        $childOrgIds = Organization::getAllChildrenIds($orgId);
        $allOrgIds = array_merge([$orgId], $childOrgIds);

        return $query->where(function ($q) use ($orgId, $allOrgIds) {
            $q->where('visibility_type', 'ALL')
                ->orWhere(function ($q) use ($orgId) {
                    $q->where('visibility_type', 'OWN')
                        ->where('organization_id', $orgId);
                })
                ->orWhere(function ($q) use ($allOrgIds) {
                    $q->where('visibility_type', 'OWN_AND_BELOW')
                        ->whereIn('organization_id', $allOrgIds);
                });
        });
    }
}
