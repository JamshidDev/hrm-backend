<?php

namespace Modules\HR\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\Structure\Models\Organization;

class Med extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function boot()
    {
        parent::boot();

        static::creating(static function ($model) {
            static::query()->where('worker_id', $model->worker_id)->update(['current' => false]);
            $model->current = true;
        });

        static::deleted(static function ($model) {
            if ($model->current) {
                $latest = static::where('worker_id', $model->worker_id)->latest('id')->first();
                $latest?->update(['current' => true]);
            }
        });
    }

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function worker_position(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class)->whereStatus(PositionStatusEnum::ACTIVE->value);
    }

    public function scopeSearch($query): Builder
    {
        return request()->has('search') ? $query->whereHas('worker', fn($q) => $q->SearchByFullName()) : $query;
    }

}
