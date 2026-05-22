<?php

namespace Modules\Exam\Services;

use App\Helpers\Helper;
use Illuminate\Support\Facades\Storage;
use Modules\Exam\Models\ExamVideoChunk;
use Modules\Exam\Models\WorkerExam;

class ExamVideoService
{
    public function start(int $workerExamId): array
    {
        $workerExam = WorkerExam::query()->findOrFail($workerExamId);
        $pathKey = md5($workerExamId . $workerExam->worker_id);
        $path = "exam-videos/{$pathKey}/{$workerExamId}";

        return [
            'url' => config('filesystems.disks.minio.url') . '/' . $path,
        ];
    }

    public function finish(int $workerExamId): void
    {
        $workerExam = WorkerExam::query()->findOrFail($workerExamId);
        $pathKey = md5($workerExamId . $workerExam->worker_id);
        $files = Storage::disk('minio')->files("exam-videos/{$pathKey}/{$workerExam->id}");
        $existingPaths = ExamVideoChunk::query()
            ->where('worker_exam_id', $workerExam->id)
            ->pluck('path')
            ->all();
        $timestamp = now();

        $data = collect($files)
            ->map(fn(string $item) => [
                'worker_exam_id' => $workerExam->id,
                'exam_id' => $workerExam->exam_id,
                'path' => $item,
            ])
            ->reject(fn(array $item) => in_array($item['path'], $existingPaths, true))
            ->map(fn(array $item) => $item + [
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ]);

        if ($data->isNotEmpty()) {
            ExamVideoChunk::query()->insert($data->toArray());
        }
    }

    public function show(int $workerExamId)
    {
        return ExamVideoChunk::query()
            ->where('worker_exam_id', $workerExamId)
            ->get()
            ->map(fn($item) => Helper::fileUrl($item->path));
    }
}
