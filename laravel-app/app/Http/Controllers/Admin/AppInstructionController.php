<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\AppInstructionResource;
use App\Http\Resources\PaginateResource;
use App\Models\AppInstruction;
use App\Models\AppInstructionPhoto;
use App\Traits\Base64FileUploadTrait;
use Barryvdh\DomPDF\Facade\Pdf;
use DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AppInstructionController extends Controller
{
    use Base64FileUploadTrait;

    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = AppInstruction::query()
            ->when(request('menu'), function ($query, $menu) {
                $query->where('menu', $menu);
            })
            ->when(request('sub_menu'), function ($query, $sub_menu) {
                $query->where('sub_menu', $sub_menu);
            })
            ->with('photos')
            ->paginate($per_page);

        $data = PaginateResource::make($data, AppInstructionResource::class);

        return Helper::response(true, $data);
    }

    public function store(Request $request): JsonResponse
    {
        DB::transaction(function () use ($request) {
            $request->validate([
                'menu' => 'required',
                'sub_menu' => 'required',
                'title' => 'required',
                'text' => 'required',
                'photos' => 'required|array',
                'photos.*' => 'image|mimes:jpeg,png,jpg,svg|max:2048',
            ]);

            $appIns = AppInstruction::query()->create($request->all());

            if ($request->photos) {
                foreach ($request->file('photos') as $photo) {
                    $filePath = $this->uploadFormFile($photo, 'app_instructions', Helper::getFileTypes('image'));
                    $appIns->photos()->create(['photo' => $filePath]);
                }
            }
        });

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(Request $request, $appInstructionId): JsonResponse
    {
        $appInstruction = AppInstruction::query()->findOrFail($appInstructionId);

        if (!$appInstruction) {
            return Helper::response(trans('messages.not_found'), [], 404);
        }

        DB::transaction(function () use ($request, $appInstruction) {
            $validated = $request->validate([
                'menu' => 'sometimes|required',
                'sub_menu' => 'sometimes|required',
                'title' => 'sometimes|required',
                'text' => 'sometimes|required'
            ]);

            $appInstruction->update($validated);

            if ($request->photos) {
                foreach ($request->file('photos') as $photo) {
                    $filePath = $this->uploadFormFile($photo, 'app_instructions', Helper::getFileTypes('image'));
                    $appInstruction->photos()->create(['photo' => $filePath]);
                }
            }
        });

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function detachPhoto($id): JsonResponse
    {
        $photo = AppInstructionPhoto::query()->find($id);
        Storage::disk(config('filesystems.default'))->delete($photo?->photo);
        $photo?->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function destroy($appInstructionId): JsonResponse
    {
        $appInstruction = AppInstruction::query()->with('photos')->findOrFail($appInstructionId);
        $appInstruction?->photos()->delete();
        $appInstruction?->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function exportToPdf(Request $request): BinaryFileResponse
    {
        set_time_limit(600);
        $instructions = AppInstruction::where('menu', $request->menu)->get();

        $tempFiles = [];

        foreach ($instructions as $instruction) {
            foreach ($instruction->photos as $photo) {

                $url = Helper::fileUrl($photo->photo);
                $response = Http::timeout(10)->get($url);

                if ($response->successful()) {
                    $ext = pathinfo($url, PATHINFO_EXTENSION);
                    $filename = 'temp/' . Str::random(10) . '.' . $ext;

                    Storage::disk('public')->put($filename, $response->body());
                    $photo->local_path = public_path('storage/' . $filename);
                    $tempFiles[] = public_path('storage/' . $filename);

                } else {
                    $photo->local_path = null;
                }

            }
        }

        $pdf = Pdf::loadView('instruction', compact('instructions'))->setPaper('A4', 'landscape');
        $filename = Str::slug($instructions->first()?->title ?? 'instruction') . '.pdf';
        $tempPdf = storage_path('app/public/temp/' . $filename);
        $pdf->save($tempPdf);

        foreach ($tempFiles as $file) {
            if (file_exists($file)) {
                File::delete($file);
            }
        }
        return response()->download($tempPdf)->deleteFileAfterSend();
    }
}
