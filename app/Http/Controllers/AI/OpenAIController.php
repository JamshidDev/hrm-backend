<?php

namespace App\Http\Controllers\AI;

use App\Exceptions\AIServiceException;
use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Requests\AI\AILawyerRequest;
use App\Http\Requests\AI\AILikeRequest;
use App\Http\Requests\AI\AIQuestionsByDateRequest;
use App\Services\AI\OpenAIService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OpenAIController extends Controller
{
    public function __construct(private readonly OpenAIService $service)
    {
    }

    public function getAiLawyer(Request $request): StreamedResponse|Response
    {
        if ($request->getMethod() === 'OPTIONS') {
            return response('', 200, [
                'Access-Control-Allow-Origin' => '*',
                'Access-Control-Allow-Methods' => 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization',
            ]);
        }

        $question = $request->input('question');

        if (!$question) {
            throw AIServiceException::emptyQuestion("Savol bo'sh bo'lmasligi mumkin!");
        }

        return $this->service->streamLawyerAnswer(auth()->id(), $question);
    }

    public function likeDislikeQuestion(int $id, AILikeRequest $request): JsonResponse
    {
        $this->service->ratingQuestion($id, $request->boolean('like'));

        return Helper::response(trans('messages.successfully_liked'));
    }

    public function getAiQuestion(AIQuestionsByDateRequest $request): JsonResponse
    {
        return Helper::response(
            true,
            $this->service->questionsByDate(auth()->id(), $request->validated('date'))
        );
    }

    public function getGroupByAiList(Request $request): JsonResponse
    {
        return Helper::response(
            true,
            $this->service->groupedHistory(auth()->id(), (int)$request->input('per_page', 10))
        );
    }
}
