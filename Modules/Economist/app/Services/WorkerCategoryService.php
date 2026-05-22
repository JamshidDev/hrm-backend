<?php

namespace Modules\Economist\Services;

use App\Helpers\Helper;
use Illuminate\Support\Collection;
use Modules\Economist\Models\WorkerCategory;
use Modules\Economist\Transformers\Statement\WorkerCategoryResource;
use Modules\Structure\Models\Organization;

class WorkerCategoryService
{
    public function index(array $filters, $user): Collection
    {
        $year = $filters['year'] ?? now()->year;

        $records = WorkerCategory::query()
            ->filter($user, $filters)
            ->where('year', $year)
            ->get()
            ->keyBy('month');

        return collect(range(1, 12))->map(function ($month) use ($records) {
            $record = $records->get($month);

            return [
                'month' => Helper::getMonth($month),
                'data' => $record ? new WorkerCategoryResource($record) : null,
            ];
        });
    }

    public function reportByOrganizations(array $filters, $user)
    {
        $year = $filters['year'] ?? now()->year;
        $month = $filters['month'] ?? now()->month;

        $organizations = Organization::select('id', 'name', 'parent_id')->get();
        $categories = WorkerCategory::query()
            ->filter($user, $filters)
            ->where('year', $year)
            ->where('month', $month)
            ->get()
            ->keyBy('organization_id');

        $buildTree = static function ($parentId) use (&$buildTree, $organizations, $categories) {
            return $organizations
                ->where('parent_id', $parentId)
                ->map(function ($organization) use ($buildTree, $categories) {
                    $record = $categories->get($organization->id);

                    return [
                        'id' => $organization->id,
                        'name' => $organization->name,
                        'data' => $record ? new WorkerCategoryResource($record) : null,
                        'children' => $buildTree($organization->id),
                    ];
                })
                ->values();
        };

        return $buildTree(null);
    }

    public function store(array $data, $user): void
    {
        $payload = $this->normalizePayload([
            ...$data,
            'organization_id' => $user->organization_id,
        ]);

        WorkerCategory::query()
            ->where('organization_id', $payload['organization_id'])
            ->where('year', $payload['year'])
            ->where('month', $payload['month'])
            ->delete();

        WorkerCategory::create($payload);
    }

    public function update(int $id, array $data): void
    {
        $workerCategory = WorkerCategory::query()->findOrFail($id);
        $workerCategory->update($this->normalizePayload($data));
    }

    public function destroy(int $id): void
    {
        WorkerCategory::query()->find($id)?->delete();
    }

    private function normalizePayload(array $data): array
    {
        return array_map(static function ($value) {
            if (is_string($value)) {
                $value = str_replace(' ', '', $value);
            }

            return $value ?? 0;
        }, $data);
    }
}
