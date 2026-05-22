<?php

namespace Modules\Economist\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\Economist\Http\Requests\Statement\MultiStatementWorkersRequest;
use Modules\Economist\Http\Requests\Statement\StatementCountRequest;
use Modules\Economist\Http\Requests\Statement\StatementDecodingByOrganizationRequest;
use Modules\Economist\Http\Requests\Statement\StatementDecodingRequest;
use Modules\Economist\Http\Requests\Statement\StatementExportWithCodesByYearRequest;
use Modules\Economist\Http\Requests\Statement\StatementExportWithCodesRequest;
use Modules\Economist\Http\Requests\Statement\StatementIndexRequest;
use Modules\Economist\Http\Requests\Statement\StatementShowRequest;
use Modules\Economist\Http\Requests\Statement\StatementsByPositionRequest;
use Modules\Economist\Services\StatementService;
use Modules\Economist\Transformers\Statement\StatementResource;

class StatementController extends Controller
{
    public function __construct(
        private readonly StatementService $service
    ) {
    }

    public function index(StatementIndexRequest $request): JsonResponse
    {
        $data = $this->service->paginate(
            $request->validated(),
            auth()->user()
        );

        return Helper::response(true, PaginateResource::make($data, StatementResource::class));
    }

    public function exportWithCodes(StatementExportWithCodesRequest $request): JsonResponse
    {
        $this->service->exportWithCodes(
            $request->validated(),
            auth()->user()
        );

        return Helper::response(trans('messages.successfully_exported'));
    }

    public function exportWithCodesByYear(StatementExportWithCodesByYearRequest $request): JsonResponse
    {
        $this->service->exportWithCodesByYear(
            $request->validated(),
            auth()->user()
        );

        return Helper::response(trans('messages.successfully_exported'));
    }

    public function multiStatementWorkers(MultiStatementWorkersRequest $request): JsonResponse
    {
        $this->service->exportMultipleStatementWorkers(
            $request->validated(),
            auth()->user()
        );

        return Helper::response(trans('messages.successfully_exported'));
    }

    public function count(StatementCountRequest $request): JsonResponse
    {
        $count = $this->service->count(
            $request->validated(),
            auth()->user()
        );

        return Helper::response(true, $count);
    }

    public function show(StatementShowRequest $request, string $statement): JsonResponse
    {
        $data = $this->service->show(
            $statement,
            $request->validated(),
            auth()->user()
        );

        return Helper::response(true, $data);
    }

    public function downloadExample(): JsonResponse
    {
        return Helper::response(true, [
            'url' => asset('resumes/economist/statement_example.xlsx')
        ]);
    }

    public function decodingStatement(StatementDecodingRequest $request): JsonResponse
    {
        $result = $this->service->decodingStatement(
            $request->validated(),
            auth()->user()
        );

        if (is_string($result)) {
            return Helper::response($result);
        }

        return Helper::response(true, $result);
    }

    public function decodingStatementByOrganization(StatementDecodingByOrganizationRequest $request): JsonResponse
    {
        $result = $this->service->decodingStatementByOrganization(
            $request->validated(),
            auth()->user()
        );

        if (is_string($result)) {
            return Helper::response($result);
        }

        return Helper::response(true, $result);
    }

    public function downloadWorkersByPositions(StatementsByPositionRequest $request): JsonResponse
    {
        $this->service->downloadWorkersByPositions(
            $request->validated(),
            auth()->user()
        );

        return Helper::response(trans('messages.successfully_exported'));
    }
}
