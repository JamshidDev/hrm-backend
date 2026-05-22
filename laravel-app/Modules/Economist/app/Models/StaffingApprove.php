<?php

namespace Modules\Economist\Models;

use App\Helpers\QueryHelper;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Modules\Confirmation\Models\DocumentChat;
use Modules\Confirmation\Models\DocumentFile;
use Modules\Confirmation\Models\DocumentHistory;
use Modules\Confirmation\Models\LmsCertificateConfirmation;
use Modules\Confirmation\Models\StaffingApproveConfirmation;
use Modules\HR\Models\ConfirmationWorker;
use Modules\HR\Models\DepartmentPosition;
use Modules\HR\Models\WorkerPosition;
use Modules\Structure\Models\Organization;


class StaffingApprove extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(static function ($model) {
            $uuid = (string)Str::uuid();
            $model->uuid = $uuid;
            $model->file = 'staffing-approve/' . $uuid . '.xlsx';
            $model->confirmation_file = 'documents/staffing-approve/' . $uuid . '.pdf';
            $model->number = self::getNumber($model);
        });
    }

    private static function getNumber($model)
    {
        $lastNumber = self::query()
            ->whereYear('date', now()->year)
            ->where('organization_id', $model->organization_id)
            ->max('number');

        return $lastNumber + 1;
    }

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
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
        return $this->belongsTo(WorkerPosition::class, 'director_id', 'id');
    }

    public function confirmatory(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class, 'confirmatory_id', 'id');
    }

    public function department_positions(): BelongsToMany
    {
        return $this->belongsToMany(DepartmentPosition::class,
            'staffing_approve_positions',
            'staffing_approve_id',
            'department_position_id');
    }

    public function histories(): MorphMany
    {
        return $this->morphMany(DocumentHistory::class, 'model');
    }

    public function chats(): MorphMany
    {
        $userId = auth()->id();
        return $this->morphMany(DocumentChat::class, 'model')
            ->where(function ($query) use ($userId) {
                $query->where('sender_id', $userId)->orWhere('recipient_id', $userId);
            });
    }

    public function files(): MorphMany
    {
        return $this->morphMany(DocumentFile::class, 'model');
    }

    public static function getModelKeyName(): string
    {
        return 'staffing.approve';
    }

    public function confirmations(): HasMany
    {
        return $this->hasMany(StaffingApproveConfirmation::class, 'staffing_approve_id');
    }
}
