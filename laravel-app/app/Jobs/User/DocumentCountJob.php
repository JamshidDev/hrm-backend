<?php

namespace App\Jobs\User;

use App\Models\User;
use Cache;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Redis;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ModelTypeEnum;
use Modules\Confirmation\Models\CommandConfirmation;
use Modules\Confirmation\Models\ContractAdditionalConfirmation;
use Modules\Confirmation\Models\ContractConfirmation;
use Modules\Confirmation\Models\LmsCertificateConfirmation;
use Modules\Confirmation\Models\StaffingApproveConfirmation;
use Modules\Confirmation\Models\WorkerApplicationConfirmation;
use Modules\HR\Models\Command;
use Modules\HR\Models\Contract;
use Modules\HR\Models\ContractAdditional;
use Modules\HR\Models\WorkerApplication;

class DocumentCountJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    protected User $user;

    protected string|null $model;
    protected array|null $workerIds;

    public function __construct($user, $model = null, $workerIds = null)
    {
        $this->user = $user;
        $this->model = $model;
        $this->workerIds = $workerIds;
    }

    public function handle(): void
    {
        $userIds = [];
        $counts = [];
        $userId = $this->user->id;
        $organizationId = $this->user->organization_id;

        $confirmationMap = [
            'commands' => [
                'model' => CommandConfirmation::class,
                'relation' => 'command',
            ],
            'contracts' => [
                'model' => ContractConfirmation::class,
                'relation' => 'contract',
            ],
            'contract-additional' => [
                'model' => ContractAdditionalConfirmation::class,
                'relation' => 'contract_additional',
            ],
            'worker-application' => [
                'model' => WorkerApplicationConfirmation::class,
                'relation' => 'worker_application',
            ],
            'staffing-approve' => [
                'model' => StaffingApproveConfirmation::class,
                'relation' => 'staffing_approve',
            ],
            'lms-certificate' => [
                'model' => LmsCertificateConfirmation::class,
                'relation' => 'certificate',
            ],
        ];

        if ($this->model) {
            $typeModel = ModelTypeEnum::tryFrom($this->model);
            if ($this->workerIds && in_array($this->user->worker_id, $this->workerIds, true)) {
                Cache::forget("confirmation_count_user_$userId" . $this->model);
                $counts['confirmation'][$this->model] =
                    (int)Cache::remember("confirmation_count_user_$userId" . $this->model, 3600, function () use ($typeModel) {
                        return $typeModel->confirmationModelClass()::filter($this->user)
                            ->whereHas(ModelTypeEnum::tryFrom($this->model)->relation(), function ($q) {
                                $q->whereNot('confirmation', ConfirmationStatusEnum::SUCCESS->value);
                            })
                            ->count();
                    });
                $userIds[] = $userId;
            }
        } else {
            foreach ($confirmationMap as $key => $config) {
                $counts['confirmation'][$key] =
                    (int)Cache::remember("confirmation_count_user_$userId" . $key, 3600, function () use ($config) {
                        return $config['model']::query()
                            ->filter($this->user)
                            ->whereHas($config['relation'], function ($q) {
                                $q->whereNot('confirmation', ConfirmationStatusEnum::SUCCESS->value);
                            })
                            ->count();
                    });
            }
            $userIds[] = $userId;
        }

        if ($this->user->hasPermissionTo('hr')) {
            $hrMap = [
                'commands' => Command::class,
                'contracts' => Contract::class,
                'contract-additional' => ContractAdditional::class,
                'worker-applications' => WorkerApplication::class,
            ];
            if ($this->model) {
                $model = $typeModel?->model();
                $query = $model::where('organization_id', $organizationId);
                Cache::forget("hr_count_user_$organizationId" . $this->model);
                $counts['hr'][$this->model] =
                    (int)Cache::remember("hr_count_user_$organizationId" . $this->model, 3600 * 60, function () use ($query) {
                        return $query
                            ->whereNot('confirmation', ConfirmationStatusEnum::SUCCESS->value)
                            ->count();
                    });

                $users = User::query()
                    ->where('organization_id', $organizationId)
                    ->whereHas('roles.permissions', fn($q) => $q->where('name', 'hr'))
                    ->pluck('id')
                    ->toArray();
                $userIds = array_unique(array_merge($userIds, $users));

            } else {
                foreach ($hrMap as $key => $model) {
                    $query = $model::where('organization_id', $organizationId);
                    $counts['hr'][$key] =
                        (int)Cache::remember("hr_count_user_$organizationId" . $key, 3600 * 60, function () use ($query) {
                            return $query
                                ->whereNot('confirmation', ConfirmationStatusEnum::SUCCESS->value)
                                ->count();
                        });
                }
            }
        }

        $data = [
            'type' => 'document.counts',
            'counts' => $counts
        ];

        sleep(2);
        foreach ($userIds as $userId) {
            $msgData = json_encode(['userId' => $userId, 'data' => $data], JSON_THROW_ON_ERROR);
            Redis::publish('notifications', $msgData);
        }
    }
}
