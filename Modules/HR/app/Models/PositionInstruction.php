<?php

namespace Modules\HR\Models;

use App\Helpers\Helper;
use App\Helpers\QueryHelper;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Modules\Structure\Models\Organization;
use Modules\Structure\Models\Position;


class PositionInstruction extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $model->number = Helper::generateDocumentNumber($model, self::class, 'KLY');
            $model->uuid = (string)Str::uuid();
        });
    }

    public function scopeFilter($query, array $filters = [])
    {
        $user = auth()->user();
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function director(): BelongsTo
    {
        return $this->belongsTo(ConfirmationWorker::class, 'director_id');
    }
}
