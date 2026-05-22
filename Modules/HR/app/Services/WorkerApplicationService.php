<?php

namespace Modules\HR\Services;

use App\Helpers\ConvertHelper;
use App\Http\Resources\PaginateResource;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;
use Modules\Confirmation\Models\WorkerApplicationConfirmation;
use Modules\Confirmation\Transformers\WorkerPositionMinimalResource;
use Modules\HR\DTO\WorkerApplicationDTO;
use Modules\HR\DTO\WorkerApplicationUrlDTO;
use Modules\HR\Enums\ConfirmationWorkerLevelEnum;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\ConfirmationWorker;
use Modules\HR\Models\Vacation;
use Modules\HR\Models\WorkerApplication;
use Modules\HR\Models\WorkerPosition;

class WorkerApplicationService
{
    public function __construct(
        public WorkerApplicationReplaceService $workerApplicationReplaceService
    )
    {
    }

    public function create(WorkerApplicationDTO $dto, $user): WorkerApplication
    {
        return DB::transaction(function () use ($dto, $user) {

            $director = ConfirmationWorker::findOrFail($dto->directorId);

            $application = WorkerApplication::create([
                'organization_id' => $director->organization_id,
                'worker_id' => $user->worker_id,
                'user_id' => $user->id,
                'director_id' => $dto->directorId,
                'worker_position_id' => $dto->workerPositionId,
                'type' => $dto->type,
                'generate' => 3
            ]);

            $this->generateFile($dto, $user, $director, $application);
            $this->storeConfirmations($application, $director, $user->worker_id, $dto->confirmations);
            $this->storePayloadJson($application, $dto->payload);

            return $application;
        });
    }

    public function update(
        WorkerApplication    $application,
        WorkerApplicationDTO $dto,
                             $user
    ): void
    {
        DB::transaction(function () use ($application, $dto, $user) {
            $director = ConfirmationWorker::findOrFail($dto->directorId);

            $application->update([
                'director_id' => $dto->directorId,
                'worker_position_id' => $dto->workerPositionId,
                'type' => $dto->type,
                'generate' => 3
            ]);

            $this->generateFile($dto, $user, $director, $application);
            $this->storeConfirmations($application, $director, $user->worker_id, $dto->confirmations);
            $this->storePayloadJson($application, $dto->payload);
        });
    }

    public function delete(WorkerApplication $application): void
    {
        $application->delete();
    }

    /* ================= ACCEPT / REJECT ================= */

    public function accept(
        WorkerApplication $application,
        bool              $status,
        ?string           $comment,
                          $user
    ): void
    {
        $application->update(['status' => $status]);

        if (!$status) {
            //
        }
    }


    public function generateSignedUrl(WorkerApplicationUrlDTO $dto): string
    {
        $expires = now()->addDay();

        $payload = [
            ...get_object_vars($dto),
            'expires' => $expires->timestamp,
        ];

        $token = JWT::encode($payload, config('jwt.secret'), 'HS256');

        return URL::temporarySignedRoute(
            'api.document.signature.application.generate-url',
            $expires,
            ['token' => $token]
        );
    }

    public function confirmBySignature($request): array
    {
        return DB::transaction(function () use ($request) {

            if (!$request->hasValidSignature()) {
                throw HRServiceException::tokenExpired(trans('messages.token_is_expired'));
            }

            $data = JWT::decode($request->token, new Key(config('jwt.secret'), 'HS256'));

            if ($data->expires < now()->timestamp) {
                throw HRServiceException::tokenExpired(trans('messages.token_is_expired'));
            }

            $application = WorkerApplication::with(['director.worker'])->findOrFail($data->application);

            if ($request->status === 'check') {
                return ['application' => $application];
            }

            WorkerApplicationConfirmation::create([
                'worker_application_id' => $application->id,
                'worker_id' => $application->director->worker_id,
                'type' => 'd',
                'signature' => $request->key,
                'status' => ConfirmationStatusEnum::SUCCESS->value,
                'confirmation_type' => ConfirmationTypeEnum::BIOMETRIC->value,
            ]);

            return [
                'file' => $application->file,
            ];
        });
    }

    /* ================= HELPERS ================= */

    public function getStoredJson(int $applicationId): array
    {
        $path = "json/worker-application/{$applicationId}.json";

        return json_decode(
            Storage::get($path),
            true,
            512,
            JSON_THROW_ON_ERROR
        );
    }

    public function availableConfirmations(int $directorId, $user, int $perPage)
    {
        $orgIds = [
            $user->organization_id,
            ConfirmationWorker::find($directorId)?->organization_id,
        ];

        return WorkerPosition::query()
            ->whereHas('organization', fn($q) => $q->whereIn('id', $orgIds))
            ->when(request('search'), function (Builder $query) {
                $query->whereHas('worker', fn($q) => $q->searchByFullName());
            })
            ->whereStatus(PositionStatusEnum::ACTIVE->value)
            ->paginate($perPage);
    }

    public function directors(int $organizationId)
    {
        return ConfirmationWorker::query()
            ->when(request('search'), function (Builder $query) {
                $query->whereHas('worker', fn($q) => $q->searchByFullName());
            })
            ->whereLevel(ConfirmationWorkerLevelEnum::DIRECTOR->value)
            ->where('organization_id', $organizationId)
            ->get();
    }

    public function myPositions($user): AnonymousResourceCollection
    {
        $positions = WorkerPosition::where('worker_id', $user->worker_id)
            ->whereStatus(PositionStatusEnum::ACTIVE->value)
            ->with([
                'organization',
                'department',
                'position'
            ])
            ->get();
        return WorkerPositionMinimalResource::collection($positions);
    }

    public function temporaryWorkers($request, int $perPage): PaginateResource
    {
        $ids = Vacation::query()
            ->when($request->organization_id, fn($q) => $q->where('organization_id', $request->organization_id))
            ->when($request->organizations, fn($q) => $q->whereIn('organization_id', explode(',', $request->organizations)))
            ->select('worker_position_id');
        return PaginateResource::make(WorkerPosition::whereIn('id', $ids)->paginate($perPage),
            \Modules\HR\Transformers\WorkerPosition\WorkerPositionMinimalResource::class);
    }

    private function generateFile($dto, $user, $director, $application): void
    {
        $workerPosition = $dto->workerPositionId
            ? WorkerPosition::find($dto->workerPositionId)
            : null;

        $file = $this->workerApplicationReplaceService->workerApplicationReplace(
            $dto->payload,
            $user,
            $director,
            $workerPosition,
            $application->uuid
        );
        ConvertHelper::docxToPdf($file, 'documents/worker-application', 'minio');
    }

    private function storePayloadJson(WorkerApplication $application, array $payload): void
    {
        Storage::put(
            "json/worker-application/{$application->id}.json",
            json_encode($payload, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT)
        );
    }

    private function storeConfirmations(
        WorkerApplication  $application,
        ConfirmationWorker $director,
        int                $workerId,
        array              $confirmations
    ): void
    {
        WorkerApplicationConfirmation::where('worker_application_id', $application->id)->delete();

        WorkerApplicationConfirmation::create([
            'worker_application_id' => $application->id,
            'type' => 'w',
            'worker_id' => $workerId,
        ]);

        WorkerApplicationConfirmation::create([
            'worker_application_id' => $application->id,
            'type' => 'd',
            'worker_id' => $director->worker_id,
            'position' => $director->position,
        ]);
    }
}
