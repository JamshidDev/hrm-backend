<?php

namespace Modules\Exam\Services;

use App\Traits\Base64FileUploadTrait;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Modules\Exam\Enums\TopicFileEnum;
use Modules\Exam\Exceptions\ExamServiceException;
use Modules\Exam\Models\TopicFile;
use Modules\Exam\Transformers\TopicFileMinimalResource;
use Throwable;

class TopicFileService
{
    use Base64FileUploadTrait;

    public function index(int $topicId): array
    {
        $data = TopicFile::query()->where('topic_id', $topicId)->get();
        $files = [];

        foreach (TopicFileEnum::list() as $item) {
            $items = $data->where('type', $item['id']);
            $files[] = [
                'id' => $item['id'],
                'name' => $item['name'],
                'items' => TopicFileMinimalResource::collection($items),
            ];
        }

        return $files;
    }

    public function store(int $topicId, $file, mixed $active): void
    {
        DB::beginTransaction();

        try {
            TopicFile::query()->create($this->buildPayload($topicId, $file, $active));
            DB::commit();
        } catch (Throwable $e) {
            DB::rollBack();
            $this->handleFailure('Topic file store failed:', $e);
        }
    }

    public function update(int $topicId, int $topicFileId, mixed $active, $file = null): void
    {
        DB::beginTransaction();

        try {
            $topicFile = TopicFile::query()->findOrFail($topicFileId);

            if ($file) {
                $oldPath = $topicFile->file;
                $topicFile->update($this->buildPayload($topicId, $file, $active));

                if ($oldPath && Storage::disk(config('filesystems.default'))->exists($oldPath)) {
                    Storage::disk(config('filesystems.default'))->delete($oldPath);
                }
            } else {
                $topicFile->update([
                    'active' => $active,
                ]);
            }

            DB::commit();
        } catch (Throwable $e) {
            DB::rollBack();
            $this->handleFailure('Topic file update failed:', $e);
        }
    }

    public function destroy(int $topicFileId): void
    {
        TopicFile::query()->findOrFail($topicFileId)->delete();
    }

    private function handleFailure(string $message, Throwable $e): void
    {
        if ($e instanceof ExamServiceException) {
            throw $e;
        }

        Log::error($message, [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
        ]);

        throw ExamServiceException::badRequest(trans('messages.server_error'));
    }

    private function buildPayload(int $topicId, $file, mixed $active): array
    {
        $fileExtension = $file->getClientOriginalExtension();

        return [
            'topic_id' => $topicId,
            'file' => $this->uploadFormFile($file, 'topic-files', [$fileExtension]),
            'file_extension' => $fileExtension,
            'file_name' => $file->getClientOriginalName(),
            'type' => TopicFileEnum::getType($fileExtension),
            'active' => $active,
        ];
    }
}
