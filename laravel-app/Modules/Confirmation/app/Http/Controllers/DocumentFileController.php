<?php

namespace Modules\Confirmation\Http\Controllers;


use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Confirmation\Enums\ModelTypeEnum;
use Modules\Confirmation\Models\DocumentFile;
use Modules\Confirmation\Transformers\DocumentFileResource;
use Modules\HR\Models\WorkerApplication;
use Modules\HR\Transformers\WorkerApplication\WorkerApplicationResource;

class DocumentFileController extends Controller
{

    use Base64FileUploadTrait;

    public function index(Request $request): JsonResponse
    {
        $model = ModelTypeEnum::tryFrom($request->model)?->model();

        $files = DocumentFile::query()
            ->where('model_type', $model)
            ->where('model_id', $request->document_id)
            ->with('worker_application')
            ->get();

        $files = DocumentFileResource::collection($files);

        return Helper::response(true, $files);
    }

    public function store(Request $request): JsonResponse
    {
        DB::transaction(function () use ($request) {
            if ($request->status === 'application') {
                $request->validate([
                    'worker_applications' => 'required',
                ]);
                $applications = explode(',', $request->worker_applications);
                foreach ($applications as $application) {
                    DocumentFile::create([
                        'model_id' => $request->document_id,
                        'model_type' => ModelTypeEnum::tryFrom($request->model)?->model(),
                        'worker_application_id' => $application,
                    ]);
                }
            } else {
                foreach ($request->files as $file) {
                    $fileName = $file->getClientOriginalName();
                    $size = $file->getSize();

                    $file = $this->uploadFormFile($file, 'document-files/' . $request->model, ['pdf', 'xlsx', 'xls', 'docx', 'png', 'jpg', 'jpeg']);

                    DocumentFile::create([
                        'model_id' => $request->document_id,
                        'model_type' => ModelTypeEnum::tryFrom($request->model)->model(),
                        'file' => $file,
                        'original_name' => $fileName,
                        'size' => $size,
                    ]);
                }
            }
        });

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(Request $request, DocumentFile $documentFile): JsonResponse
    {
        DB::transaction(function () use ($request, $documentFile) {
            if ($request->status === 'application') {
                $request->validate([
                    'worker_application_id' => 'required|integer',
                ]);

                $documentFile->update([
                    'model_id' => $request->document_id,
                    'model_type' => ModelTypeEnum::tryFrom($request->model)->model(),
                    'worker_application_id' => $request->worker_application_id,
                    'file' => null,
                    'original_name' => null,
                    'size' => null
                ]);
            } else {
                $request->validate([
                    'file' => 'file'
                ]);

                $fileName = $request->file('file')?->getClientOriginalName();
                $size = $request->file('file')?->getSize();

                $file = $this->uploadFormFile(
                    $request->file('file'),
                    'document-files/' . $request->model,
                    ['pdf', 'xlsx', 'xls', 'docx', 'png', 'jpg', 'jpeg']
                );

                $documentFile->update([
                    'file' => $file,
                    'original_name' => $fileName,
                    'size' => $size,
                ]);
            }
        });

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy(DocumentFile $documentFile): JsonResponse
    {
        $documentFile->delete();
        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function applications(Request $request): JsonResponse
    {
        $user = auth()->user();

        $data = WorkerApplication::query()
            ->organizationFilter($user, $request->all())
            ->whereNotNull('worker_id')
            ->with([
                'organization',
                'worker'
            ])
            ->orderByDesc('id')
            ->paginate($request->per_page ?? 50);

        $data = PaginateResource::make($data, WorkerApplicationResource::class);

        return Helper::response(true, $data);
    }


}
