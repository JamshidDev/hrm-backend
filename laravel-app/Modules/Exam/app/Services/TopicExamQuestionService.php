<?php

namespace Modules\Exam\Services;

use Exception;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Excel as ExcelType;
use Modules\Exam\Models\Exam;
use Modules\Exam\Models\ExamCategory;
use Modules\Exam\Models\ExamCategoryOption;
use Modules\Exam\Models\ExamCategoryQuestion;
use Modules\Exam\Models\ExamTest;
use Modules\Exam\Transformers\TopicExamCategoriesResource;
use Excel;

class TopicExamQuestionService
{
    public function attachQuestions(int $examId, array $questions): void
    {
        DB::transaction(function () use ($examId, $questions) {
            ExamTest::query()->where('exam_id', $examId)->forceDelete();

            if (empty($questions)) {
                return;
            }

            $timestamp = now();
            ExamTest::query()->insert(array_map(
                static fn(array $question) => [
                    'exam_id' => $examId,
                    'exam_category_id' => $question['exam_category_id'],
                    'count' => $question['count'],
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ],
                $questions
            ));
        });
    }

    public function questions(int $examId)
    {
        $exam = Exam::with('categories.category')->findOrFail($examId);
        return TopicExamCategoriesResource::collection($exam->categories ?? []);
    }

    public function detachQuestion(int $questionId): void
    {
        ExamTest::query()->find($questionId)?->forceDelete();
    }

    public function preview($file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $readerType = match ($extension) {
            'csv' => ExcelType::CSV,
            'xls' => ExcelType::XLS,
            'xlsx' => ExcelType::XLSX,
            default => throw new Exception("Noto'g'ri fayl turi: $extension"),
        };

        $rows = Excel::toArray((object) [], $file, null, $readerType)[0] ?? [];
        $previewRows = array_slice($rows, 0, 10);

        $maxCols = 0;
        foreach ($previewRows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $filledCells = array_filter($row, static fn($cell) => $cell !== null && trim($cell) !== '');
            $maxCols = max($maxCols, count($filledCells));
        }

        $usedCols = min(10, $maxCols);
        $headers = [];
        for ($i = 0; $i < $usedCols; $i++) {
            $headers[] = $this->numToExcelColumn($i);
        }

        $trimmedRows = array_map(static function ($row) use ($usedCols) {
            return is_array($row) ? array_slice($row, 0, $usedCols) : [];
        }, $previewRows);

        return [
            'headers' => $headers,
            'preview' => $trimmedRows,
        ];
    }

    public function import(int $categoryId, $file, array $mapping, int $startRow = 1): void
    {
        ExamCategory::query()->findOrFail($categoryId);
        $rows = Excel::toArray((object) [], $file)[0] ?? [];
        $rows = array_slice($rows, $startRow);

        DB::transaction(function () use ($rows, $mapping, $categoryId) {
            foreach ($rows as $row) {
                $questionText = '';
                $options = [];

                foreach ($mapping as $column => $field) {
                    $columnIndex = $this->excelColumnToIndex($column);
                    $value = $row[$columnIndex] ?? null;

                    if ($value === null || trim($value) === '') {
                        continue;
                    }

                    if ($field === 'ques') {
                        $questionText = $value;
                        continue;
                    }

                    if (str_starts_with($field, 'option_')) {
                        $options[] = [
                            'text' => $value,
                            'is_correct' => str_ends_with($field, '_correct'),
                        ];
                    }
                }

                if (!$questionText) {
                    continue;
                }

                $question = ExamCategoryQuestion::query()->create([
                    'exam_category_id' => $categoryId,
                    'ques' => $questionText,
                ]);

                $this->insertQuestionOptions($question->id, $options);
            }
        });
    }

    private function numToExcelColumn(int $index): string
    {
        $letters = '';
        while ($index >= 0) {
            $letters = chr($index % 26 + 65) . $letters;
            $index = intdiv($index, 26) - 1;
        }
        return $letters;
    }

    private function excelColumnToIndex(string $column): int
    {
        $index = 0;
        $column = strtoupper($column);
        $length = strlen($column);

        for ($i = 0; $i < $length; $i++) {
            $char = $column[$i];
            $index = $index * 26 + (ord($char) - ord('A') + 1);
        }

        return $index - 1;
    }

    private function insertQuestionOptions(int $questionId, array $options): void
    {
        if (empty($options)) {
            return;
        }

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
