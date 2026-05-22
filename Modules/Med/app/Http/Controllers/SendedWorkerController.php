<?php

namespace Modules\Med\Http\Controllers;

use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use App\Helpers\SignatureHelper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Jobs\DocxToPdfJob;
use App\Services\SignatureService;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Models\SendedWorkerConfirmation;
use Modules\HR\Enums\MedStatusEnum;
use Modules\HR\Models\Med;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Transformers\Worker\WorkerInfoResource;
use Modules\Med\Models\SendedWorker;
use Modules\Med\Models\SendedWorkerCommission;
use Modules\Med\Transformers\SendedWorkerResource;
use PhpOffice\PhpWord\TemplateProcessor;

class SendedWorkerController extends Controller
{
    use Base64FileUploadTrait;

    public function __construct(
        protected SignatureService $signatureService
    )
    {
    }

    public function index(): JsonResponse
    {
        $user = auth()->user();

        $data = SendedWorker::query()
            ->where('polyclinic_id', $user->organization_id)
            ->with([
                'worker:id,last_name,first_name,middle_name,photo,birthday',
                'worker_position:id,department_id,position_id,organization_id',
                'worker_position.department:id,name,level',
                'worker_position.organization:id,name,name_en,name_ru,group',
                'worker_position.position:id,name',
                'polyclinic:id,name,name_en,name_ru,group',
            ])
            ->orderByDesc('id')
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($data, SendedWorkerResource::class);

        return Helper::response(true, $data);
    }

    public function commissions($ticketId): JsonResponse
    {
        $data = SendedWorkerCommission::query()
            ->where('sended_worker_id', $ticketId)
            ->with([
                'commission.department:id,name,level',
                'commission.position:id,name',
                'commission.organization:id,name,full_name',
                'commission.worker:id,last_name,first_name,middle_name,photo,birthday',
            ])
            ->get()
            ->map(function ($commission) {
                return [
                    'id' => $commission->id,
                    'worker' => new WorkerInfoResource($commission->commission->worker),
                    'position' => PositionHelper::getShortPosition($commission->commission),
                ];
            });

        return Helper::response(true, $data);
    }

    public function attachCommission(Request $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            $request->validate([
                'worker_positions' => 'required|array',
                'commission_leader_id' => 'required|integer',
                'tickets' => 'required|array',
            ]);

            foreach ($request->tickets as $ticketId) {
                $ticket = SendedWorker::query()->findOrFail($ticketId);
                $ticket->update([
                    'commission_leader_id' => $request->commission_leader_id,
                ]);

                $workerPosition = WorkerPosition::with([
                    'department:id,name,level',
                    'position:id,name',
                    'organization:id,name,full_name',
                ])->find($request->commission_leader_id);

                SendedWorkerConfirmation::create([
                    'sended_worker_id' => $ticketId,
                    'worker_id' => $ticket->worker_id,
                    'position' => PositionHelper::getShortPosition($workerPosition),
                    'type' => 's'
                ]);

                foreach ($request->worker_positions as $worker_position) {
                    SendedWorkerCommission::query()->create([
                        'sended_worker_id' => $ticketId,
                        'commission_id' => $worker_position,
                    ]);
                }
            }

            return Helper::response(trans('messages.successfully_attached'));
        });
    }


    public function detachCommission($id): JsonResponse
    {
        SendedWorkerCommission::query()->where('sended_worker_id', $id)->delete();
        $ticket = SendedWorker::query()->with('commission_leader')->find($id);

        if ($ticket->status) {
            return Helper::response(trans('messages.does_not_delete_approved_document'), [], 400);
        }

        SendedWorkerConfirmation::query()
            ->where('sended_worker_id', $id)
            ->where('worker_id', $ticket->commission_leader?->worker_id)
            ->delete();

        $ticket?->update([
            'commission_leader_id' => null,
        ]);

        return Helper::response(trans('messages.successfully_detached'));
    }


    public function confirmDocument($ticketId, Request $request): JsonResponse
    {
        $request->validate([
            'med_status' => 'required',
            'med_date' => 'required',
            'to' => 'required'
        ]);

        return DB::transaction(function () use ($request, $ticketId) {
            $ticket = SendedWorker::query()->with([
                'commission_leader.worker',
                'commissions.commission.worker:id,last_name,first_name,middle_name',
            ])->find($ticketId);

            if ($ticket->status) {
                return Helper::response(trans('messages.all_ready_confirm_document'), [], 400);
            }

            if (!$ticket) {
                return Helper::response(trans('messages.not_found'), [], 400);
            }

            $ticket->update([
                'status' => $request->med_status,
                'comment' => $request->comment,
                'confirmation' => ConfirmationStatusEnum::SUCCESS->value,
            ]);

            $worker = $ticket->commission_leader->worker;
            $temp = new TemplateProcessor(Helper::fileUrl($ticket->file));

            $commissions = $ticket->commissions->map(function ($commission) {
                return $commission->commission->worker->short_name();
            })->toArray();

            $temp->setValues([
                'med_status' => MedStatusEnum::get($request->med_status),
                'to' => $request->to,
                'med_date' => $request->med_date,
                'commission_leader' => $worker->short_name(),
                'commissions' => implode(', ', $commissions),
            ]);

            $temp->setImageValue('commission_signature', [
                'path' => $this->signatureService->convertQrCode('med', $ticket->uuid, $worker),
                'width'  => 120,
                'height' => 160
            ]);

            $fileName = $ticket->uuid . '.docx';
            $newFilePath = 'replaced-files/' . $fileName;
            $temp->saveAs('storage/' . $newFilePath);
            $filePath = $this->uploadFileFromPath('storage/' . $newFilePath, $fileName, 'med');
            DocxToPdfJob::dispatch($filePath, 'documents/med', $ticket->id, SendedWorker::class);
            Storage::delete($newFilePath);

            Med::updateOrCreate([
                'worker_id' => $ticket->worker_id,
                'from' => $request->med_date,
            ], [
                'to' => $request->to,
                'worker_position_id' => $ticket->worker_position_id,
                'organization_id' => $ticket->organization_id,
                'status' => $request->med_status,
                'comment' => $request->comment,
                'file' => $ticket->confirmation_file,
                'currency' => true
            ]);

            return Helper::response(trans('messages.successfully_updated'));
        });
    }

}
