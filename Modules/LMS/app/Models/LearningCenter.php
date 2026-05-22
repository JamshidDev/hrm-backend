<?php

namespace Modules\LMS\Models;

use App\Models\User;
use Dyrynda\Database\Support\CascadeSoftDeletes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\WorkerPosition;


class LearningCenter extends Model
{
    use SoftDeletes, CascadeSoftDeletes;

    protected array $cascadeDeletes = ['users', 'groups', 'edu_plans'];

    protected $guarded = ['id'];

    public function scopeSearch($query)
    {
        return $query->when(request('search'), function ($q, $search) {
            $q->whereLike('name', "%$search%")
                ->orWhereLike('name_ru', "%$search%")
                ->orWhereLike('name_en', "%$search%");
        });
    }

    public function groups(): HasMany
    {
        return $this->hasMany(Group::class);
    }

    public function director(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class, 'director_id');
    }

    public function edu_plans(): HasMany
    {
        return $this->hasMany(EduPlan::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class,
            'learning_center_users', 'learning_center_id', 'user_id')
            ->withPivot(['status']);
    }
}
