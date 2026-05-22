<?php

namespace Modules\Exam\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Exam\Services\ExamService;

class ExamController extends Controller
{
    public function __construct(
        private readonly ExamService $examService,
    ) {
    }

    public function enums(): JsonResponse
    {
        return Helper::response(true, $this->examService->enums(auth()->user()));
    }

    public function positions($topicId): JsonResponse
    {
        return Helper::response(true, $this->examService->positions((int) $topicId));
    }

    public function workers($topicId): JsonResponse
    {
        return Helper::response(true, $this->examService->workers((int) $topicId, request('per_page', 50)));
    }
}
