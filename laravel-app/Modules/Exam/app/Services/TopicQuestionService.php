<?php

namespace Modules\Exam\Services;

use App\Http\Resources\PaginateResource;
use Illuminate\Support\Facades\DB;
use Modules\Exam\Models\ExamCategoryOption;
use Modules\Exam\Models\ExamCategoryQuestion;
use Modules\Exam\Transformers\TopicQuestionResource;

class TopicQuestionService
{
    public function index(int $categoryId, int $perPage)
    {
        return PaginateResource::make(
            ExamCategoryQuestion::query()
                ->where('exam_category_id', $categoryId)
                ->with(['options', 'exam_category'])
                ->paginate($perPage),
            TopicQuestionResource::class
        );
    }

    public function show(int $questionId)
    {
        return new TopicQuestionResource(ExamCategoryQuestion::query()->findOrFail($questionId));
    }

    public function store(int $categoryId, array $data): void
    {
        DB::transaction(function () use ($categoryId, $data) {
            $question = ExamCategoryQuestion::query()->create([
                'exam_category_id' => $categoryId,
                'ques' => $data['ques'],
            ]);

            $this->insertOptions($question->id, $data['options']);
        });
    }

    public function update(int $categoryId, int $questionId, array $data): void
    {
        $question = ExamCategoryQuestion::query()->findOrFail($questionId);

        DB::transaction(function () use ($categoryId, $data, $question) {
            $question->update([
                'exam_category_id' => $categoryId,
                'ques' => $data['ques'],
            ]);

            ExamCategoryOption::query()->where('category_question_id', $question->id)->delete();
            $this->insertOptions($question->id, $data['options']);
        });
    }

    public function destroy(int $questionId): void
    {
        ExamCategoryQuestion::query()->findOrFail($questionId)->delete();
    }

    private function insertOptions(int $questionId, array $options): void
    {
        $timestamp = now();

        ExamCategoryOption::query()->insert(array_map(
            static fn(array $option) => [
                'category_question_id' => $questionId,
                'text' => $option['text'],
                'is_correct' => $option['is_correct'],
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            $options
        ));
    }
}
