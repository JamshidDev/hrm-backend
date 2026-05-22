<?php

namespace App\Jobs\HCP;

use App\Helpers\Helper;
use App\Http\Middleware\PreventDuplicateImport;
use Carbon\Carbon;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Modules\Turnstile\Models\HCPDevice;
use Modules\Turnstile\Models\HCPErrorLog;
use Modules\Turnstile\Models\HikCentralAccessLevel;
use Modules\Turnstile\Models\WorkerAccessLevel;
use ZipArchive;

class HCPErrorLogJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    public function middleware(): array
    {
        return [new PreventDuplicateImport('hcp_error_log_lock')];
    }

    public function handle(): void
    {
        try {
            $hour = now()->hour;
            if ($hour >= 2 && $hour < 3) {
                WorkerAccessLevel::query()
                    ->where('status', 1)
                    ->whereNull('errors')
                    ->update(['status' => 2, 'updated_at' => now()]);
            }

            $logs = HCPErrorLog::query()->where('status', false)->get();

            if ($logs->isEmpty()) {
                Cache::lock('hcp_error_log_lock')->release();
                return;
            }

            // Bazadan oldindan barcha kerakli ma’lumotlarni olamiz
            $accessLevels = HikCentralAccessLevel::query()
                ->select(['id', 'devices', 'name'])
                ->get()
                ->mapWithKeys(fn($al) => [
                    $al->id => [
                        'id' => $al->id,
                        'devices' => is_array($al->devices)
                            ? $al->devices
                            : json_decode($al->devices ?? '[]', true, 512, JSON_THROW_ON_ERROR)
                    ]
                ]);

            $allDevices = HCPDevice::query()
                ->select(['device_id', 'name'])
                ->get()
                ->keyBy('device_id');

            $workerAccesses = WorkerAccessLevel::query()
                ->get(['id', 'hik_central_person_id', 'hik_central_access_level_id', 'errors'])
                ->groupBy(fn($w) => $w->hik_central_person_id . '-' . $w->hik_central_access_level_id);

            foreach ($logs as $log) {
                $tmpPath = public_path('storage/temp/temp.zip');
                file_put_contents($tmpPath, Storage::get($log->path));

                $zip = new ZipArchive;
                if ($zip->open($tmpPath) !== true) {
                    continue;
                }

                $content = $zip->getFromIndex(0);
                $zip->close();
                $lines = explode("\n", $content);

                $updates = [];

                foreach ($lines as $line) {
                    // Person va Device ID ni ajratamiz
                    preg_match('/[Pp]erson(?:_id)?\[(\d+)]/', $line, $pMatch);
                    preg_match('/[Dd]evice(?:_id)?\[(\d+)]/', $line, $dMatch);
                    $personId = $pMatch[1] ?? null;
                    $deviceId = $dMatch[1] ?? null;

                    if (!$personId || !$deviceId) {
                        continue;
                    }

                    // Qurilma nomi
                    $device = $allDevices->get($deviceId);
                    if (!$device) {
                        continue;
                    }

                    // Qurilmaning Access Level'ini topamiz
                    $accessLevel = $accessLevels->first(
                        fn($al) => in_array($deviceId, $al['devices'] ?? [], true)
                    );
                    if (!$accessLevel) {
                        continue;
                    }

                    $key = $personId . '-' . $accessLevel['id'];

                    // Error code
                    preg_match('/0x([0-9a-fA-F]+)/', $line, $codeMatch);
                    $code = isset($codeMatch[1]) ? '0x' . $codeMatch[1] : null;

                    // Time
                    preg_match('/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})]/', $line, $timeMatch);
                    $time = isset($timeMatch[1])
                        ? Carbon::parse($timeMatch[1], 'UTC')->setTimezone('Asia/Tashkent')->toDateTimeString()
                        : now()->toDateTimeString();

                    // ✅ Success yoki ❌ Error holatini aniqlaymiz

                    [$isError, $isSuccess] = $this->detectLogStatus($line);

                    // Ma’lumotni yig‘amiz
                    $updates[$key] ??= [
                        'errors' => [],
                        'remove' => [],
                        'status' => null,
                    ];

                    if ($isError) {
                        $updates[$key]['errors'][] = [
                            'device_id' => (int)$deviceId,
                            'code' => $code,
                            'time' => $time,
                            'name' => $device->name,
                        ];
                        $updates[$key]['status'] = 3;
                    }

                    if ($isSuccess) {
                        $updates[$key]['remove'][] = (int)$deviceId;
                    }
                }

                // 🔄 Natijalarni qo‘llaymiz
                foreach ($updates as $key => $data) {
                    $workerAccess = $workerAccesses->get($key)?->first();
                    if (!$workerAccess) {
                        continue;
                    }

                    $errors = is_array($workerAccess->errors)
                        ? $workerAccess->errors
                        : json_decode($workerAccess->errors ?? '[]', true, 512, JSON_THROW_ON_ERROR);

                    // Errorlarni qo‘shamiz
                    foreach ($data['errors'] as $err) {
                        $found = false;
                        foreach ($errors as &$e) {
                            if ((int)$e['device_id'] === (int)$err['device_id']) {
                                $e = $err;
                                $found = true;
                                break;
                            }
                        }
                        if (!$found) {
                            $errors[] = $err;
                        }
                    }

                    // Success bo‘lgan device’larni o‘chiramiz
                    if (!empty($data['remove'])) {
                        $errors = array_filter($errors, static fn($e) => !in_array((int)$e['device_id'], $data['remove'], true));
                    }

                    // Status va errorsni yangilaymiz
                    $workerAccess->errors = array_values($errors);
                    if (empty($errors)) {
                        $workerAccess->status = 2;
                    } elseif ($data['status'] === 3) {
                        $workerAccess->status = 3;
                    }

                    $workerAccess->save();
                }

                $log->status = true;
                $log->save();
            }

        } catch (Exception $e) {
            Helper::setLog($e, 'HCP error log job failed:');
        } finally {
            Cache::lock('hcp_error_log_lock')->release();
        }
    }


    public function detectLogStatus(string $line): array
    {
        $line = trim(preg_replace('/[\x00-\x1F\x7F]/u', '', $line));
        $isError = str_contains($line, 'DealDoorTempalteChange Failed')
            || str_contains($line, 'Reload Person Device Access Change Failed')
            || str_contains($line, 'DeviceFail')
            || (preg_match('/error_code\[(\d+)]/', $line, $errCode) && (int)($errCode[1] ?? 0) !== 0);

        $isSuccess =
            preg_match('/make\s+it\s+success/i', $line)
            || preg_match('/status(_type)?\[[^\]]*(Suc|SUC|Success)[^\]]*]/i', $line)
            || preg_match('/status(_type)?\[[^\]]*(Suc|SUC|Success)[^\]]*error_code/i', $line);


        return [$isError, $isSuccess];
    }


}
