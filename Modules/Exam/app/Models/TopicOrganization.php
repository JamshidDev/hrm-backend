<?php

namespace Modules\Exam\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;


class TopicOrganization extends Model
{

    protected $guarded = ['id'];

    public function topics(): BelongsToMany
    {
        return $this->belongsToMany(Topic::class, 'topic_organizations', 'organization_id', 'topic_id');
    }
}
