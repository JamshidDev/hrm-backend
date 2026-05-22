<?php

namespace Modules\LMS\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Services\LMS\DocumentReplace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Exam\Models\WorkerExam;
use Modules\LMS\Models\Group;
use Modules\LMS\Models\LmsCertificate;
use Modules\LMS\Models\LmsProtocol;
use Modules\LMS\Transformers\CertificateResource;

class LmsCertificateController extends Controller
{
    public function __construct(protected DocumentReplace $replace)
    {
    }

    public function generateCertificate(Request $request): JsonResponse
    {
        $request->validate([
            'cert_from' => 'required|date_format:Y-m-d',
            'cert_to' => 'required|date_format:Y-m-d',
            'group_id' => 'required|exists:groups,id',
            'workers' => 'required|array',
            'workers.*.worker_id' => 'required',
            'workers.*.worker_position_id' => 'required',
            'protocol_date' => 'required|date_format:Y-m-d',
        ]);

        $user = auth()->user();

        $group = Group::with([
            'learning_center',
            'edu_plan',
        ])->find($request->group_id);

        $directorId = $group->learning_center?->director_id;
        if (!$directorId) {
            return Helper::response(trans('messages.director_not_found'), [], 400);
        }

        $eduPlan = $group->edu_plan;
        $eduPlanId = $group->edu_plan_id;

        $protocolData = [
            'protocol_date' => $request->protocol_date,
            'cert_from' => $request->cert_from,
            'cert_to' => $request->cert_to,
            'edu_plan_id' => $eduPlanId,
            'group_id' => $group->id,
            'organization_id' => $user->organization_id,
        ];
        if ($request->protocol_id) {
            $protocol = LmsProtocol::find($request->protocol_id);
            $protocol->update($protocolData);
        } else {
            $protocol = LmsProtocol::query()->create($protocolData);
        }

        $workerIds = collect($request->workers)->pluck('worker_id')->toArray();
        $workerExams = WorkerExam::query()
            ->with('exam')
            ->whereIn('worker_id', $workerIds)
            ->get();

        $serial = $eduPlan->serial;

        $data = [];
        $oldCertificates = LmsCertificate::query()->where('group_id', $group->id)->get();
        foreach ($request->workers as $worker) {
            if ($oldCertificates
                ->where('worker_id', $worker['worker_id'])
                ->where('confirmation', ConfirmationStatusEnum::SUCCESS->value)
                ->isNotEmpty()) {
                continue;
            }
            if (array_key_exists('start_exam_id', $worker)) {
                $workerStartExam = $workerExams->where('id', $worker['start_exam_id'])->first();
                if ($workerStartExam && $workerStartExam->exam) {
                    $start_exam_result = $workerStartExam->exam?->tests_count . '/' . $workerStartExam->result;
                } else {
                    $start_exam_result = $worker['start_exam_result'] ?? '';
                }
            } else {
                $start_exam_result = $worker['start_exam_result'];
            }
            if (array_key_exists('end_exam_id', $worker)) {
                $workerEndExam = $workerExams->where('id', $worker['end_exam_id'])->first();
                if ($workerEndExam && $workerEndExam->exam) {
                    $end_exam_result = $workerEndExam->exam?->tests_count . '/' . $workerEndExam->result;
                } else {
                    $end_exam_result = $worker['end_exam_result'] ?? '';
                }
            } else {
                $end_exam_result = $worker['end_exam_result'];
            }

            $uuid = (string)Str::uuid();

            $data[] = [
                'organization_id' => $user->organization_id,
                'edu_plan_worker_id' => $worker['id'],
                'worker_id' => $worker['worker_id'],
                'worker_position_id' => $worker['worker_position_id'],
                'lms_protocol_id' => $protocol->id,
                'group_id' => $group->id,
                'edu_plan_id' => $eduPlanId,
                'director_id' => $directorId,
                'cert_from' => $request->cert_from,
                'cert_to' => $request->cert_to,
                'start_exam_result' => $start_exam_result,
                'end_exam_result' => $end_exam_result,
                'serial' => $serial,
                'uuid' => $uuid,
                'user_id' => $user->id,
                'file' => 'lms-certificate/' . $uuid . '.docx',
                'confirmation_file' => 'documents/lms-certificate/' . $uuid . '.pdf',
            ];
        }
        $fullData = $request->all();
        $fullData['data'] = $data;
        $path = 'json/lms/protocol/' . $protocol->id . '.json';

        Storage::disk('minio')->put($path, json_encode($fullData, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT));
        LmsCertificate::upsert($data,
            ['worker_id', 'group_id'],
            [
                'worker_position_id',
                'director_id',
                'cert_from',
                'cert_to',
                'lms_protocol_id',
                'edu_plan_id',
                'start_exam_result',
                'end_exam_result',
                'serial',
                'number',
                'user_id',
                'organization_id',
            ]
        );
        $protocol = $protocol->load([
            'certificates' => function ($query) {
                $query->whereNot('confirmation', ConfirmationStatusEnum::SUCCESS->value);
            },
            'edu_plan',
            'edu_plan.specialization',
            'edu_plan.specialization.direction',
            'edu_plan.learning_center',
            'edu_plan.learning_center.director',
            'certificates.worker_position',
            'certificates.worker_position.organization',
            'certificates.worker_position.department',
            'certificates.worker_position.position',
            'certificates.worker_position.worker',
        ]);
        $this->replace->generate($protocol);
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function certificates(): JsonResponse
    {
        $list = LmsCertificate::query()
            ->when(request('edu_plan_id'), fn($query) => $query->where('edu_plan_id', request('edu_plan_id')))
            ->when(request('group_id'), fn($query) => $query->where('group_id', request('group_id')))
            ->when(request('organization_id'), function (Builder $query) {
                $query->whereHas('worker_position', function (Builder $query) {
                    $query->where('organization_id', request('organization_id'));
                });
            })
            ->when(request('search'), function (Builder $query) {
                $query->where(function ($query) {
                    $query->whereHas('worker', fn($q) => $q->searchByFullName())
                        ->orWhereLike('number', request('search'));
                });
            })
            ->when(request('year'), fn($query) => $query->whereYear('cert_from', request('year')))
            ->when(request('month'), fn($query) => $query->whereMonth('cert_from', request('month')))
            ->when(request('direction_id'), function (Builder $query) {
                $query->whereHas('edu_plan', function (Builder $query) {
                    $query->whereHas('specialization', function (Builder $query) {
                        $query->where('direction_id', request('direction_id'));
                    });
                });
            })
            ->when(request('specialization_id'), function (Builder $query) {
                $query->whereHas('edu_plan', function (Builder $query) {
                    $query->where('specialization_id', request('specialization_id'));
                });
            })
            ->with([
                'worker_position',
                'worker_position.organization',
                'worker_position.department',
                'worker_position.position',
                'worker'
            ])
            ->orderByDesc('number')
            ->paginate(request()->per_page ?? 10);

        $data = PaginateResource::make($list, CertificateResource::class);
        return Helper::response(true, $data);
    }

    public function destroy($id): JsonResponse
    {
        $cert = LmsCertificate::query()->findOrFail($id);
        if ($cert->confirmation === ConfirmationStatusEnum::SUCCESS->value){
            return Helper::response(trans('messages.does_not_delete_approved_document'), [], 400);
        }
        $cert->delete();
        return Helper::response(trans('messages.successfully_deleted'));
    }

}
