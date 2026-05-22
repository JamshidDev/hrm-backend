<?php

namespace Modules\Exam\Services\Support;

use Modules\Exam\Models\Exam;
use Modules\Exam\Models\ExamCategoryQuestion;

class WorkerExamQuestionBuilderService
{
    public function buildForExam(Exam $exam): array
    {
        $questions = [];

        foreach ($exam->exam_tests as $examTest) {
            if ((int) $examTest->count <= 0) {
                continue;
            }

            $categoryQuestions = ExamCategoryQuestion::query()
                ->where('exam_category_id', $examTest->exam_category_id)
                ->inRandomOrder()
                ->limit((int) $examTest->count)
                ->with(['options' => fn($query) => $query->select('id', 'category_question_id', 'text', 'is_correct')])
                ->get();

            foreach ($categoryQuestions as $question) {
                $question->setRelation('options', $question->options->shuffle()->values());
                $questions[] = $question;
            }
        }

        return $questions;
    }
}
