<?php

namespace Modules\Economist\Services;

use App\Helpers\EconomistHelper;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Economist\Enums\UploadStatusEnum;
use Modules\Economist\Enums\UploadTypeEnum;
use Modules\Economist\Exceptions\EconomistServiceException;
use Modules\Economist\Models\EconomistUpload;
use Modules\Economist\Models\OrganizationEconomistUpload;
use Modules\Economist\Services\Support\StatementCodeDictionaryService;
use Modules\Economist\Transformers\UploadHistoryResource;
use Modules\Structure\Models\Organization;

readonly class EconomistService
{
    public function __construct(
        private StatementCodeDictionaryService $statementCodeDictionaryService,
    ) {
    }

    public function structure(array $filters, $user): array
    {
        $user->load('roles.permissions', 'organization');

        if (!$user->organization_id) {
            throw EconomistServiceException::organizationNotFound(trans('messages.organization_not_found'));
        }

        $year = $filters['year'] ?? now()->year;
        $month = $filters['month'] ?? now()->month;
        $deadline = EconomistHelper::getUploadDeadline($year, $month);
        $now = now();
        $matchingNodes = Organization::query()->search()->get();

        if (!count($user->getAllPermissions())) {
            return [collect(), $deadline, $now];
        }

        if ($user->hasPermissionTo('organization-admin')) {
            $children = Organization::query()
                ->adminOrganizations($matchingNodes)
                ->with(['economistUploads', 'uploadStatus'])
                ->defaultOrder()
                ->get()
                ->toTree();
        } elseif ($user->hasPermissionTo('organization-leader')) {
            $children = Organization::query()
                ->leaderOrganizations($user)
                ->with(['economistUploads', 'uploadStatus'])
                ->defaultOrder()
                ->get()
                ->toTree();
        } else {
            $children = Organization::query()
                ->where('id', $user->organization_id)
                ->with(['economistUploads', 'uploadStatus'])
                ->get();
        }

        return [$children, $deadline, $now];
    }

    public function updateUploadStatus(array $data, $user): void
    {
        if (!$user->hasPermissionTo('economist-uploads-status')) {
            throw EconomistServiceException::permissionDenied(trans('messages.permission_denied'));
        }

        if ($data['status'] ?? false) {
            OrganizationEconomistUpload::query()->updateOrCreate([
                'organization_id' => $data['organization_id'],
                'year' => $data['year'],
                'month' => $data['month'],
            ]);

            return;
        }

        OrganizationEconomistUpload::query()
            ->where('organization_id', $data['organization_id'])
            ->where('year', $data['year'])
            ->where('month', $data['month'])
            ->forceDelete();
    }

    public function uploadHistories(array $filters): Collection
    {
        $uploads = EconomistUpload::query()
            ->where('organization_id', $filters['organization_id'])
            ->where('month', $filters['month'])
            ->where('year', $filters['year'])
            ->orderByDesc('id')
            ->get()
            ->groupBy('type');

        return collect(UploadTypeEnum::list())->map(function ($enum) use ($uploads) {
            $items = collect($uploads->get($enum['id']));

            return [
                'id' => $enum['id'],
                'name' => $enum['name'],
                'status' => $items->where('status', UploadStatusEnum::SUCCESS->value)->count() > 0,
                'count' => $items->count(),
                'data' => UploadHistoryResource::collection($items),
            ];
        });
    }

    public function enums(): array
    {
        return [
            'upload_types' => UploadTypeEnum::list(),
            'upload_statuses' => UploadStatusEnum::list(),
            'codes' => $this->statementCodeDictionaryService->names(),
        ];
    }

    public function refreshWorkersPins(array $data, $user): void
    {
        $table = $this->resolveRefreshTable($data['type']);

        DB::table($table . ' as s')
            ->when($user->allowedOrganizations(), function ($query) use ($user) {
                $query->whereIn('s.organization_id', $user->allowedOrganizations());
            })
            ->where('s.year', $data['year'])
            ->where('s.month', $data['month'])
            ->whereNull('s.worker_id')
            ->update([
                'worker_id' => DB::raw('(SELECT w.id FROM workers w WHERE w.pin = s.pin LIMIT 1)')
            ]);
    }

    private function resolveRefreshTable(string $type): string
    {
        return match ($type) {
            'statements' => 'statements',
            'tax-four-applications', 'tax_four_applications' => 'tax_four_applications',
            'tax-five-applications', 'tax_five_applications' => 'tax_five_applications',
            'pension-payments', 'pension_payments' => 'pension_payments'
        };
    }
}
