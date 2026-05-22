<?php

namespace Modules\Med\Http\Controllers;

use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Jobs\DocxToPdfJob;
use App\Services\SignatureService;
use App\Traits\Base64FileUploadTrait;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Models\SendedWorkerConfirmation;
use Modules\HR\Models\Med;
use Modules\HR\Models\OrganizationPolyclinic;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Transformers\Med\MedResource;
use Modules\Med\Models\SendedWorker;
use Modules\Med\Transformers\SendedWorkerResource;
use Modules\Structure\Models\Organization;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use PhpOffice\PhpWord\TemplateProcessor;

class MedController extends Controller
{
    use Base64FileUploadTrait;

    public function __construct(
        protected SignatureService $signatureService
    )
    {
    }

    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);
        $user = auth()->user();

        $pIds = OrganizationPolyclinic::query()
            ->where('polyclinic_id', $user->organization_id)
            ->pluck('organization_id')->unique()
            ->toArray();

        $data = Med::query()
            ->when(request('organizations'), function ($query, $organizationId) {
                return $query->where('organization_id', $organizationId);
            })
            ->whereIn('organization_id', $pIds)
            ->search()
            ->with([
                'worker:id,last_name,first_name,middle_name,photo',
                'organization:id,name,name_en,name_ru,group',
                'worker_position:id,department_id,position_id,organization_id',
                'worker_position.department:id,name,level',
                'worker_position.organization:id,name,name_en,name_ru,group',
                'worker_position.position:id,name',
            ])->whereCurrent(true)->orderBy('to')->paginate($per_page);

        $data = PaginateResource::make($data, MedResource::class);

        return Helper::response(true, $data);
    }

    public function organizations(): JsonResponse
    {
        $user = auth()->user();

        $pIds = OrganizationPolyclinic::query()
            ->where('polyclinic_id', $user->organization_id)
            ->pluck('organization_id')
            ->unique()
            ->toArray();

        $data = Organization::query()->whereIn('id', $pIds)->get();

        return Helper::response(true, OrganizationListResource::collection($data));

    }

    public function sendToMed(Request $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            $request->validate([
                'polyclinic_id' => 'required|exists:organizations,id',
                'worker_id' => 'required|exists:workers,id',
                'start_date' => 'required|date',
            ]);

            $sendedWorker = SendedWorker::query()
                ->where('worker_id', $request->worker_id)
                ->where('confirmation', '!=', ConfirmationStatusEnum::SUCCESS->value)
                ->count();

            if ($sendedWorker > 0) {
                return Helper::response(trans('messages.mew_worker_already_sended'), 400);
            }

            $user = auth()->user()->load([
                'organization:id,full_name',
                'worker:id,last_name,first_name,middle_name',
            ]);

            $newMed = SendedWorker::query()->create([
                'user_id' => $user->id,
                'organization_id' => $user->organization_id,
                'polyclinic_id' => $request->polyclinic_id,
                'worker_id' => $request->worker_id,
                'worker_position_id' => $request->worker_position_id,
                'start_date' => $request->start_date,
            ]);


            $position = $user->worker->load([
                'positions.department:id,name,level',
                'positions.organization:id,name,name_en,name_ru,group',
                'positions.position:id,name',
            ])->positions->where('organization_id', $user->organization_id)->first();

            $hrPosition = PositionHelper::getShortPosition($position);
            SendedWorkerConfirmation::create([
                'sended_worker_id' => $newMed->id,
                'worker_id' => $user->worker_id,
                'position' => $hrPosition,
                'status' => ConfirmationStatusEnum::SUCCESS->value,
                'type' => 's'
            ]);

            $worker = Worker::find($request->worker_id);

            $workerPosition = WorkerPosition::with([
                'department:id,name,level',
                'organization:id,name,name_en,name_ru,group',
                'position:id,name',
            ])->find($request->worker_position_id);

            $temp = new TemplateProcessor(public_path('resumes/med/template.docx'));
            if ($request->department_position_id) {
                $newPosition = 'a';
            } else {
                $newPosition = '';
            }

            if ($request->worker_position_id) {
                $workType = 'Ishlab turgan xodim';
            } else {
                $workType = 'Yangi ishga kirayotgan xodim';
            }

            $temp->setValues([
                'number' => SendedWorker::withTrashed()->count() + 1,
                'worker_full_name' => $worker->full_name(),
                'referral_date' => Helper::getDateTex(now()),
                'birthday' => Carbon::parse($worker->birthday)->format('d.m.Y'),
                'post_name' => PositionHelper::getShortPosition($workerPosition),
                'position_experience' => Carbon::parse($workerPosition->position_date)->format('d.m.Y'),
                'new_position' => $newPosition,
                'work_type' => $workType,
                'organization_name' => $user->organization->full_name,
                'organization_phones' => Helper::phoneFormat($user->phone),
                'hr_full_name' => $user->worker->short_name(),
                'hr_position' => $hrPosition,
                'created' => Helper::getDateTex(now()),
            ]);

            $temp->setImageValue('hr_signature', [
                'path' => $this->signatureService->convertQrCode('med', $newMed->uuid, $user->worker),
                'width' => 120,
                'height' => 160
            ]);

            $tempImage = tempnam(sys_get_temp_dir(), 'photo') . '.jpg';
            $photoUrl = Helper::fileUrl($worker->photo);
            file_put_contents($tempImage, file_get_contents($photoUrl));

            $temp->setImageValue('photo', array(
                'path' => $tempImage,
                'width' => 113,
                'height' => 149,
                'ratio' => false
            ));

            unlink($tempImage);

            try {
                $fileName = $newMed->uuid . '.docx';
                $newFilePath = 'replaced-files/' . $fileName;
                $temp->saveAs('storage/' . $newFilePath);
                $filePath = $this->uploadFileFromPath('storage/' . $newFilePath, $fileName, 'med');
                DocxToPdfJob::dispatch($filePath, 'documents/med', $newMed->id, SendedWorker::class);
            } finally {
                Storage::delete($newFilePath);
            }

            return Helper::response(trans('messages.successfully_stored'), [
                'sended_worker_id' => $newMed->id,
            ]);
        });
    }

    public function sendedWorkers(): JsonResponse
    {
        $user = auth()->user();

        $workers = SendedWorker::query()
            ->filter($user, request()->all())
            ->with([
                'worker:id,last_name,first_name,middle_name,photo,birthday',
                'worker_position:id,department_id,position_id,organization_id',
                'worker_position.department:id,name,level',
                'worker_position.organization:id,name,name_en,name_ru,group',
                'worker_position.position:id,name',
                'polyclinic:id,name,name_en,name_ru,group'
            ])
            ->orderByDesc('id')
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($workers, SendedWorkerResource::class);

        return Helper::response(true, $data);
    }

    public function polyclinics(): JsonResponse
    {
        $orgs = Organization::query()->whereIn('id', [1, 156, 159, 160, 162, 161, 163, 164, 166, 165, 167, 178])->get();

        return Helper::response(true, OrganizationListResource::collection($orgs));
    }

    public function dashboard(): JsonResponse
    {
        $user = auth()->user();
        $sendedWorkers = SendedWorker::query()->filter($user, request()->all())->whereNull('status')->count();

        $sendedWorkersByYear = SendedWorker::query()
            ->filter($user, request()->all())
            ->whereConfirmation(ConfirmationStatusEnum::SUCCESS->value)
            ->count();

        $medCount = Med::query()->filter($user, request()->all())->whereCurrent(true)
            ->where('to', '<', now()->addDays(15))->count();

        $polyclinics = OrganizationPolyclinic::query()
            ->where('organization_id', $user->organization_id)
            ->count();

        return Helper::response(true, [
            'sendedWorkers' => $sendedWorkers,
            'medCount' => $medCount,
            'polyclinics' => $polyclinics,
            'sendedWorkersByYear' => $sendedWorkersByYear,
        ]);
    }

    public function destroy($sendedWorkerId): JsonResponse
    {
        $sendedWorker = SendedWorker::query()->find($sendedWorkerId);
        if ($sendedWorker->status) {
            return Helper::response(trans('messages.does_not_delete_approved_document'), [], 400);
        }

        $sendedWorker->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }

}
