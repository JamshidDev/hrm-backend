<?php

namespace App\Services\Deploy;

use App\Exceptions\DeployException;
use App\Http\Resources\Deploy\DeployResource;
use App\Http\Resources\PaginateResource;
use App\Models\DeployLog;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use ZipArchive;

class DeployService
{
    private const string FRONTEND_TARGET_PATH = '/var/www/frontend';
    private const string FRONTEND_BACKUP_DIR = 'app/frontend_backups';
    private const string TEMP_ZIP_NAME = 'temp_dist.zip';

    public function __construct(private readonly VersionService $versionService)
    {
    }

    public function index(array $filters)
    {
        $perPage = $filters['per_page'] ?? 10;

        $logs = DeployLog::query()->paginate($perPage);

        return PaginateResource::make($logs, DeployResource::class);
    }

    public function logBackend(int $userId, array $data): DeployLog
    {
        return DeployLog::query()->create([
            'user_id' => $userId,
            'type' => 'back',
            'changes' => $data['changes'],
            'version' => $this->versionService->nextVersion(),
            'published' => $data['published'] ?? false,
        ]);
    }

    public function uploadFrontend(int $userId, UploadedFile $zip, array $data): DeployLog
    {
        $this->backupCurrentFrontend();

        $tempPath = storage_path('app/' . self::TEMP_ZIP_NAME);
        $targetPath = self::FRONTEND_TARGET_PATH;

        File::makeDirectory($targetPath, 0755, true, true);

        $zip->move(storage_path('app'), self::TEMP_ZIP_NAME);

        $this->extractZip($tempPath, $targetPath);

        File::delete($tempPath);

        return DeployLog::query()->create([
            'user_id' => $userId,
            'type' => 'front',
            'changes' => $data['changes'] ?? null,
            'version' => $this->versionService->nextVersion(),
            'published' => $data['published'] ?? false,
        ]);
    }

    public function publish(int $id, array $data): void
    {
        DeployLog::query()->find($id)?->update([
            'published' => $data['published'],
        ]);
    }

    private function backupCurrentFrontend(): void
    {
        $lastLog = DeployLog::query()
            ->where('type', 'front')
            ->orderByDesc('version')
            ->first();

        if (!$lastLog || !File::exists(self::FRONTEND_TARGET_PATH)) {
            return;
        }

        $backupRoot = storage_path(self::FRONTEND_BACKUP_DIR);

        if (!File::exists($backupRoot)) {
            File::makeDirectory($backupRoot, 0755, true, true);
        }

        $backupFolder = $backupRoot . '/' . $lastLog->id;
        File::copyDirectory(self::FRONTEND_TARGET_PATH, $backupFolder);
        File::deleteDirectory(self::FRONTEND_TARGET_PATH);

        $lastLog->update(['path' => $backupFolder]);
    }

    private function extractZip(string $zipPath, string $targetPath): void
    {
        $zip = new ZipArchive();

        if ($zip->open($zipPath) !== true) {
            throw DeployException::uploadFailed(trans('messages.server_error'));
        }

        $zip->extractTo($targetPath);
        $zip->close();
    }
}
