<?php

namespace Modules\Turnstile\Models;

use App\Helpers\Helper;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\Worker;


class TerminalEvent extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class, 'worker_id');
    }

    public function access_level(): BelongsTo
    {
        return $this->belongsTo(HikCentralAccessLevel::class, 'hik_central_access_level_id');
    }

    public function scopeFilter($query, $user, array $filters = [])
    {
        return $query
            ->whereIn('hik_central_access_level_id', Helper::userAccessLevels($user))
            ->when(request('access_levels'), function ($query, $accessLevels) {
                $query->whereIn('hik_central_access_level_id', explode(',', $accessLevels));
            })
            ->when(request('organizations'), function ($query, $organizations) {
                $accessLevelIds = OrganizationAccessLevel::query()
                    ->whereIn('organization_id', explode(',', $organizations))
                    ->select('hik_central_access_level_id');
                if ($accessLevelIds) {
                    $query->whereIn('hik_central_access_level_id', $accessLevelIds);
                }
            });
    }

    public function scopeSearch($query): Builder
    {
        return request()->has('search') ? $query->whereHas('worker', fn($q) => $q->SearchByFullName()) : $query;
    }

}
