<?php

namespace App\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Models\Activity;

class ActivityLog extends Activity
{
    public function scopeFilterByUserOrganization($query)
    {
        $user = auth()->user();

        if ($user->hasRole('organization')) {
            $users = [$user->id];
        } else {
            $users = QueryHelper::userIds($user);
        }

        return $query->whereIn('causer_id', $users);
    }


    public function scopeSearch($query)
    {
        return $query
            ->whereHas('user', function ($query) {
                return $query->search();
            })
            ->when(request('description'), function ($query, $description) {
                return $query->where('description', $description);
            })
            ->when(request('created_at'), function ($query, $created_at) {
                return $query->whereDate('created_at', $created_at);
            })
            ->when(request('subject_type'), function ($query, $subject_type) {
                return $query->whereLike('subject_type', "%$subject_type%");
            });
    }


    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'causer_id');
    }

}
