<?php

namespace Modules\Exam\Services;

use App\Http\Resources\PaginateResource;
use Modules\Exam\Models\ExamCategory;
use Modules\Exam\Models\ExamCategoryQuestion;
use Modules\Exam\Transformers\ExamCategoryResource;

class ExamCategoryService
{
    public function index($user, $filters)
    {
        return PaginateResource::make(
            ExamCategory::query()
            ->filter($user, $filters)
                ->withCount('questions')
                ->paginate($filters['per_page'] ?? 10),
            ExamCategoryResource::class
        );
    }

    public function store(array $data, $user): void
    {
        $data['organization_id'] = $user->organization_id;
        $data['user_id'] = $user->id;

        ExamCategory::query()->create($data);
    }

    public function update(int $examCategoryId, array $data): void
    {
        ExamCategory::query()->findOrFail($examCategoryId)->update($data);
    }

    public function destroy(int $examCategoryId): void
    {
        ExamCategory::query()->findOrFail($examCategoryId)->delete();
    }

    public function clear(int $examCategoryId): void
    {
        ExamCategoryQuestion::query()->where('exam_category_id', $examCategoryId)->delete();
    }
}
