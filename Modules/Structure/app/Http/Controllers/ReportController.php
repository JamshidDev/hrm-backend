<?php

namespace Modules\Structure\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Structure\Http\Requests\Report\ReportCreateConfirmationRequest;
use Modules\Structure\Http\Requests\Report\ReportDetailUpdateRequest;
use Modules\Structure\Http\Requests\Report\ReportExcelRequest;
use Modules\Structure\Http\Requests\Report\ReportStoreRequest;
use Modules\Structure\Http\Requests\Report\ReportUpdateRequest;
use Modules\Structure\Models\Report;
use Modules\Structure\Models\ReportMothPer;
use Modules\Structure\Services\ReportService;
use Modules\Structure\Transformers\Report\ReportIndexResource;
use Modules\Structure\Transformers\Report\ReportMonthPerResource;
use Modules\Structure\Transformers\Report\ReportShowResource;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ReportController extends Controller
{
    public function __construct(
        public ReportService $service
    )
    {
    }

    public function generate(): JsonResponse
    {
        return $this->service->generate(request());
    }

    public function stats(): JsonResponse
    {
        return $this->service->stats(request());
    }

    public function labels(): array
    {
        return $this->service->labels();
    }

    public function store(ReportStoreRequest $request): JsonResponse
    {
        $user = auth()->user();
        $this->service->store($request->validated(), $user);
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function viewExcel(ReportExcelRequest $request): BinaryFileResponse
    {
        return match ($request->type) {
            'one' => $this->service->typeOneExcel($request->validated()),
            'two' => $this->service->typeTwoExcel($request->validated()),
            'three' => $this->service->typeThreeExcel($request->validated()),
            default => null
        };
    }

    public function index(): JsonResponse
    {
        $reports = Report::query()
            ->filter(auth()->user(), request()->all())
            ->withCount([
                'details' => function ($query) {
                    $query->select(DB::raw('count(distinct organization_id)'));
                }
            ])
            ->where('active', true)
            ->with(['organization'])
            ->paginate(request('per_page', 10));
        $data = PaginateResource::make($reports, ReportIndexResource::class);
        return Helper::response(true, $data);
    }

    public function show($reportUuid): JsonResponse
    {
        $report = Report::query()
            ->with([
                'details',
                'details.organization',
                'confirmations.worker',
                'director.worker'
            ])
            ->where('uuid', $reportUuid)
            ->first();

        if (!$report) {
            return Helper::response(false, trans('messages.not_found'), 400);
        }

        $data = new ReportShowResource($report);
        return Helper::response(true, $data);
    }

    public function destroy($reportId): JsonResponse
    {
        $this->service->delete($reportId, auth()->user());
        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function update(ReportUpdateRequest $request, $reportUuid): JsonResponse
    {
        $this->service->update($reportUuid, $request->validated());
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function updateDetail(ReportDetailUpdateRequest $request, $reportDetailId): JsonResponse
    {
        $this->service->updateDetail($reportDetailId, $request->validated(), auth()->user());
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroyDetail($reportDetailId): JsonResponse
    {
        $this->service->deleteDetail($reportDetailId);
        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function createConfirmation(ReportCreateConfirmationRequest $request): JsonResponse
    {
        $this->service->createConfirmation($request->validated());
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function deleteConfirmation($confirmationId): JsonResponse
    {
        $this->service->deleteConfirmation($confirmationId);
        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function updateReportMonthOrganizations(Request $request)
    {
        $request->validate([
            'year' => 'required|integer',
            'month' => 'required|integer',
            'organizations' => 'required|array'
        ]);
        $data = [];
        foreach ($request->organizations as $organization) {
            $data[] = [
                'year' => $request->year,
                'month' => $request->month,
                'organization_id' => $organization
            ];
        }
        ReportMothPer::query()->insertOrIgnore($data);

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroyReportMonthOrganizations($reportPerId)
    {
        ReportMothPer::findOrFail($reportPerId)->delete();
        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function indexReportMonthOrganizations()
    {
        $data = ReportMothPer::query()
            ->when(\request('year'), function ($query, $year) {
                return $query->where('year', $year);
            })
            ->when(\request('month'), function ($query, $month) {
                return $query->where('month', $month);
            })
            ->with('organization')
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($data, ReportMonthPerResource::class);

        return Helper::response(true, $data);
    }
}
