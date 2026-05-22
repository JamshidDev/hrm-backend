<?php

namespace Modules\Exam\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Structure\Models\Organization;


class Topic extends Model
{
    use SoftDeletes;


    protected $guarded = ['id'];

    public function scopeSearch($query)
    {
        return $query->when(request('name'), function ($q, $name) {
            $q->whereLike('name', $name);
        });
    }

    public function exams(): HasMany
    {
        return $this->hasMany(Exam::class, 'topic_id');
    }

    public function scopeFilter($query, $user, array $filters = [])
    {
        return $query->where('user_id', $user->id);
    }

    public function files(): HasMany
    {
        return $this->hasMany(TopicFile::class, 'topic_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'topic_organizations', 'topic_id', 'organization_id');
    }

    public function hasOrganizations(): HasMany
    {
        return $this->hasMany(TopicOrganization::class);
    }
}
