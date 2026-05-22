<?php

namespace Modules\Turnstile\Services;

use App\Http\Resources\PaginateResource;
use App\Jobs\HCP\ApprovedWorkersToAccessLevelJob;
use Modules\Turnstile\Exceptions\TurnstileServiceException;
use Modules\Turnstile\Models\HikCentralAccessLevel;
use Modules\Turnstile\Models\OrganizationAccessLevel;
use Modules\Turnstile\Models\TurnstileWorkerApprove;
use Modules\Turnstile\Transformers\TurnstileApproveResource;
use Modules\Turnstile\Transformers\TurnstileWorkerApproveResource;

class WorkerTurnstileApproveService
{
    public function paginate(array $filters, $user)
    {
        $data = TurnstileWorkerApprove::query()
            ->where(function ($query) use ($user) {
                $query->where('organization_id', $user->organization_id)
                    ->orWhere('receiver_organization_id', $user->organization_id);
            })
            ->when($filters['search'] ?? null, fn($query, $search) => $query->where('title', 'like', '%' . $search . '%'))
            ->with(['organization', 'receiver_organization', 'user', 'receiver_user'])
            ->paginate($filters['per_page'] ?? 10);

        return PaginateResource::make(
            $data->through(fn($item) => new TurnstileApproveResource($item, $user)),
            TurnstileApproveResource::class
        );
    }

    public function store(array $data, $user): void
    {
        if ((int)$data['receiver_organization_id'] === (int)$user->organization_id) {
            throw TurnstileServiceException::receiverOrganizationIsCurrent(trans('messages.turnstile.receiver_organization_is_you'));
        }

        $payload = [
            'receiver_organization_id' => $data['receiver_organization_id'],
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'organization_id' => $user->organization_id,
            'user_id' => $user->id,
        ];

        if (!empty($data['approval_id'])) {
            $approval = TurnstileWorkerApprove::query()->findOrFail($data['approval_id']);
            if ($approval->approved === 2) {
                throw TurnstileServiceException::approvedCannotBeEdited(trans('messages.turnstile.approved_dont_edit'));
            }
            $approval->update($payload);
        } else {
            $approval = TurnstileWorkerApprove::query()->create($payload);
        }

        $approval->worker_positions()->sync($data['worker_position_ids']);
        $approval->access_levels()->sync($data['access_levels']);
    }

    public function show(int $approvalId): TurnstileWorkerApproveResource
    {
        $approval = TurnstileWorkerApprove::query()
            ->with([
                'worker_positions',
                'access_levels',
                'worker_positions.worker',
                'worker_positions.organization',
                'worker_positions.department',
                'worker_positions.position',
                'organization',
                'receiver_organization',
            ])
            ->findOrFail($approvalId);

        return new TurnstileWorkerApproveResource($approval);
    }

    public function approve(int $approvalId, string $status): void
    {
        $approval = TurnstileWorkerApprove::query()->findOrFail($approvalId);
        $approval->approved = $status === 'approved' ? 2 : 3;

        if ($status === 'approved') {
            ApprovedWorkersToAccessLevelJob::dispatch($approval);
        }

        $approval->save();
    }

    public function accessLevels(array $filters)
    {
        $levels = HikCentralAccessLevel::query()->select('id', 'name');

        if (!empty($filters['organization_id'])) {
            $levels->whereIn('id', OrganizationAccessLevel::query()
                ->where('organization_id', $filters['organization_id'])
                ->select('hik_central_access_level_id'));
        }

        return $levels->get();
    }

    public function destroy(int $approvalId): void
    {
        $approval = TurnstileWorkerApprove::query()->findOrFail($approvalId);

        if ($approval->approved === 2) {
            throw TurnstileServiceException::approvedCannotBeDeleted(trans('messages.turnstile.approved_dont_delete'));
        }

        $approval->delete();
    }
}
