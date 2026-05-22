<?php

namespace App\Services;

use App\Helpers\Helper;
use Carbon\Carbon;
use GuzzleHttp\Client;
use GuzzleHttp\Promise\PromiseInterface;
use Illuminate\Support\Facades\DB;
use Modules\Turnstile\Models\HCPDevice;
use Modules\Turnstile\Models\HikCentralAccessLevel;
use Modules\Turnstile\Models\WorkerAccessLevel;
use Modules\Turnstile\Models\WorkerHikCentral;
use RuntimeException;
use Throwable;
use function PHPUnit\Framework\isArray;

class HikCentralService
{
    protected Client $client;

    public function __construct()
    {
        $this->client = new Client([
            'base_uri' => config('services.terminal.url'),
            'timeout' => 50,
            'verify' => false,
        ]);
    }

    public function doorEventsAsync($startTime, $endTime, $doors, $pageSize = 100, $page = 1): PromiseInterface
    {
        $url = '/artemis/api/acs/v1/door/events';
        $body = [
            "pageNo" => $page,
            "pageSize" => $pageSize,
            "eventType" => 196893,
            "doorIndexCodes" => $doors,
            "startTime" => $startTime,
            "endTime" => $endTime
        ];
        $bodyJson = json_encode($body, JSON_THROW_ON_ERROR);
        $signature = $this->generateAsync('POST', $url, $bodyJson);

        return $this->client->postAsync($url, [
            'body' => $bodyJson,
            'headers' => [
                'x-ca-key' => config('services.terminal.key'),
                'x-ca-signature' => $signature,
                'x-ca-signature-headers' => 'x-ca-key',
                'Content-Type' => 'application/json',
            ],
        ]);
    }

    public function generateCurl(string $method, string $urlPath, string $body = ''): string
    {
        $key = config('services.terminal.key');
        $secret = config('services.terminal.secret');

        $message = implode("\n", [
            $method,
            '*/*',
            trim($body) ? 'application/json' : '',
            "x-ca-key:{$key}",
            $urlPath
        ]);

        return base64_encode(hash_hmac('sha256', $message, $secret, true));
    }

    public function generateAsync(string $method, string $urlPath, string $body = ''): string
    {
        $key = config('services.terminal.key');
        $secret = config('services.terminal.secret');

        $message = implode("\n", [
            $method,
            'application/json',
            "x-ca-key:{$key}",
            $urlPath
        ]);

        return base64_encode(hash_hmac('sha256', $message, $secret, true));
    }

    public function resolveAsyncDoorEventsResult(?array $result): array
    {
        if (($result['state'] ?? null) !== 'fulfilled') {
            return [
                'status' => false,
                'data' => null,
            ];
        }

        $payload = (string)$result['value']->getBody();
        $decoded = json_decode($payload);

        if (!is_object($decoded) || (int)($decoded->code ?? -1) !== 0) {
            return [
                'status' => false,
                'data' => null,
            ];
        }

        return [
            'status' => true,
            'data' => $decoded->data ?? null,
        ];
    }

    public function doorEvents($startTime, $endTime, $doors, $pageSize = 100, $page = 1): array
    {
        $url = '/artemis/api/acs/v1/door/events';
        $body = [
            "pageNo" => $page,
            "pageSize" => $pageSize,
            "eventType" => 196893,
            "doorIndexCodes" => $doors,
            "startTime" => $startTime,
            "endTime" => $endTime
        ];

        try {
            $res = $this->requestCurl($url, $body);
            return [
                'status' => true,
                'data' => $res
            ];
        } catch (Throwable $th) {
            Helper::setLog($th, 'Sync events in HCP Invalid Workers');
        }

        return [
            'status' => false,
            'data' => []
        ];
    }

    public function requestCurl($url, $body)
    {
        $body = json_encode($body, JSON_THROW_ON_ERROR);
        $signature = $this->generateCurl('POST', $url, $body);

        $attempts = 0;
        $maxAttempts = 3;
        $lastError = null;

        while ($attempts < $maxAttempts) {
            $curl = curl_init();
            curl_setopt_array($curl, array(
                CURLOPT_URL => config('services.terminal.url') . $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => '',
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 50,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => 'POST',
                CURLOPT_POSTFIELDS => $body,
                CURLOPT_HTTPHEADER => array(
                    'x-ca-key: ' . config('services.terminal.key'),
                    'x-ca-signature: ' . $signature,
                    'x-ca-signature-headers: x-ca-key',
                    'Content-Type: application/json'
                ),
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => false,
            ));

            $response = curl_exec($curl);
            if ($response !== false) {
                curl_close($curl);

                if (!json_validate($response)) {
                    throw new RuntimeException("Invalid JSON response: " . $response);
                }

                return json_decode($response, false, 512, JSON_THROW_ON_ERROR);
            }

            $lastError = curl_error($curl);
            curl_close($curl);

            $attempts++;
            if ($attempts < $maxAttempts) {
                sleep(1); // 1 sekund kutadi, keyin yana urunadi
            }
        }

        throw new RuntimeException("Curl request failed after {$maxAttempts} attempts. Last error: {$lastError}");
    }

    public function groups($pageNo = 1): array
    {
        $url = '/artemis/api/resource/v1/org/orgList';
        $body = [
            "pageNo" => $pageNo,
            "pageSize" => 500
        ];

        $res = $this->requestCurl($url, $body);

        if ((int)$res->code === 0) {
            return [
                'status' => true,
                'msg' => $res->data
            ];
        }
        return [
            'status' => false,
            'msg' => $res->msg
        ];
    }

    public function attachWorkerToAccessLevel($workerIds, $accessLevelId): array
    {
        $list = [];

        foreach ($workerIds as $workerId) {
            $list[] = [
                'id' => (string)$workerId,
            ];
        }

        $url = '/artemis/api/acs/v1/privilege/group/single/addPersons';
        $body = [
            "privilegeGroupId" => (string)$accessLevelId,
            "type" => 1,
            "list" => $list
        ];

        $res = $this->requestCurl($url, $body);
        if ((int)$res->code === 0) {
            return [
                'status' => true,
                'msg' => $res->msg
            ];
        }
        return [
            'status' => false,
            'msg' => $res->msg
        ];
    }

    public function detachWorkerFromAccessLevel($workerIds, $accessLevelId): array
    {
        $list = [];

        foreach ($workerIds as $workerId) {
            $list[] = [
                'id' => (string)$workerId,
            ];
        }

        $url = '/artemis/api/acs/v1/privilege/group/single/deletePersons';
        $body = [
            "privilegeGroupId" => (string)$accessLevelId,
            "type" => 1,
            "list" => $list
        ];

        $res = $this->requestCurl($url, $body);

        if ((int)$res->code === 0) {
            return [
                'status' => true,
                'msg' => $res->msg
            ];
        }
        return [
            'status' => false,
            'msg' => $res->msg
        ];
    }

    public function addWorkerToServer($worker, $photo, $endTime, $orgIndexCode = "1"): array
    {
        $url = '/artemis/api/resource/v1/person/single/add';
        $body = [
            "personCode" => (string)$worker->id,
            "personFamilyName" => $worker->last_name,
            "personGivenName" => $worker->first_name,
            "remark" => $worker->middle_name,
            "gender" => $worker->sex,
            "orgIndexCode" => (string)$orgIndexCode,
            "phoneNo" => "",
            "email" => "",
            "faces" => [
                [
                    "faceData" => $photo
                ]
            ],
            "cards" => [
                [
                    'cardNo' => (string)$worker->card
                ]
            ],
            "beginTime" => now()->addHour(-4)->setTimezone('+08:00')->toIso8601String(),
            "endTime" => $endTime
                ? Carbon::parse($endTime)->setTimezone('+08:00')->toIso8601String()
                : now()->addYear(2)->setTimezone('+08:00')->toIso8601String(),
        ];

        $res = $this->requestCurl($url, $body);

        if ((int)$res->code === 131) {
            $personId = $this->searchWorkerByCardNumber($worker->pin, $worker->card);
            $this->updatePersonFace($personId, $photo);
            $this->updatePerson($personId, $orgIndexCode, $worker, $endTime);
            return [
                'status' => true,
                'personId' => $personId
            ];
        }

        if ((int)$res->code === 0) {
            return [
                'status' => true,
                'personId' => $res->data
            ];
        }

        return [
            'status' => false,
            'msg' => $res->msg
        ];
    }

    public function editWorkerFromHCP($hikWorker, $endTime): array
    {
        $url = '/artemis/api/resource/v1/person/single/update';
        $worker = $hikWorker->worker;
        $body = [
            "personId" => (string)$hikWorker->hik_central_person_id,
            "personCode" => (string)$worker->id,
            "personFamilyName" => $worker->last_name,
            "personGivenName" => $worker->first_name,
            "remark" => $worker->middle_name,
            "cards" => [
                [
                    'cardNo' => (string)$worker->card
                ]
            ],
            "beginTime" => now()->addHour(-4)->setTimezone('+08:00')->toIso8601String(),
            "endTime" => $endTime
                ? Carbon::parse($endTime)->setTimezone('+08:00')->toIso8601String()
                : now()->addYear(2)->setTimezone('+08:00')->toIso8601String(),
        ];

        $res = $this->requestCurl($url, $body);

        if ((int)$res->code === 0) {
            $hikWorker->update(['to' => $endTime]);
            $hikWorker->access_levels()->update(['status' => 1]);
            return [
                'status' => true,
                'personId' => $res->data
            ];
        }

        return [
            'status' => false,
            'msg' => $res->msg
        ];
    }

    public function updatePersonFace($personId, $photo)
    {
        $url = '/artemis/api/resource/v1/person/face/update';
        $body = [
            "personId" => (string)$personId,
            "faceData" => $photo,
        ];
        return $this->requestCurl($url, $body);
    }

    public function updatePerson($personId, $orgIndexCode, $worker, $endTime)
    {
        $url = '/artemis/api/resource/v1/person/single/update';
        if ($worker->sex) {
            $gender = 1;
        } else {
            $gender = 0;
        }
        $body = [
            "personId" => (string)$personId,
            "personCode" => (string)$worker->id,
            "orgIndexCode" => (string)$orgIndexCode,
            "personFamilyName" => $worker->last_name,
            "personGivenName" => $worker->first_name,
            "remark" => $worker->middle_name,
            "gender" => $gender,
            "phoneNo" => "",
            "email" => "",
            "cards" => [
                [
                    'cardNo' => (string)$worker->card
                ]
            ],
            "beginTime" => now()->addHour(-4)->setTimezone('+08:00')->toIso8601String(),
            "endTime" => $endTime
                ? Carbon::parse($endTime)->setTimezone('+08:00')->toIso8601String()
                : now()->addYear(2)->setTimezone('+08:00')->toIso8601String(),
        ];

        return $this->requestCurl($url, $body);
    }

    public function searchWorkerByCardNumber($cardNo, $card)
    {
        $url = '/artemis/api/resource/v1/person/advance/personList';
        $body = [
            "pageNo" => 1,
            "pageSize" => 10,
            "cardNo" => (string)$card
        ];

        $res = $this->requestCurl($url, $body);

        if ((int)$res->code === 0) {
            if ($res->data?->total > 0) {
                return $res->data->list[0]->personId;
            }

            $body = [
                "pageNo" => 1,
                "pageSize" => 10,
                "cardNo" => (string)$cardNo
            ];
            $res = $this->requestCurl($url, $body);

            if ((int)$res->code === 0) {
                if ($res->data?->total > 0) {
                    return $res->data->list[0]->personId;
                }
                throw new RuntimeException(trans('messages.not_found'), 400);

            }
        }

        throw new RuntimeException($res->msg, 400);
    }

    public function accessLevels(): array
    {
        $data = [];
        $url = '/artemis/api/acs/v1/privilege/group';
        $body = [
            "pageNo" => 1,
            "pageSize" => 499,
            "type" => 1
        ];
        $res = $this->requestCurl($url, $body);
        if (empty($res->data?->list)) {
            return [
                'status' => false,
                'msg' => $res->msg
            ];
        }
        $data[] = $res->data->list;
        $body = [
            "pageNo" => 2,
            "pageSize" => 499,
            "type" => 1
        ];
        $res = $this->requestCurl($url, $body);
        if (!empty($res->data?->list)) {
            $data[] = $res->data->list;
        }

        return [
            'status' => true,
            'data' => $data
        ];
    }

    public function devices(): void
    {
        $url = '/artemis/api/resource/v1/acsDevice/acsDeviceList';
        $pageSize = 500;
        $body = [
            "pageNo" => 1,
            "pageSize" => 1,
            "type" => 1
        ];

        $res = $this->requestCurl($url, $body);
        $now = now();

        $devs = [];
        if ((int)$res->code === 0 && $res->data?->total > 0) {
            $total = $res->data->total;
            $pages = (int)ceil($total / $pageSize);
            $devices = [];

            for ($pageNo = 1; $pageNo <= $pages; $pageNo++) {
                $body = [
                    "pageNo" => $pageNo,
                    "pageSize" => $pageSize,
                    "type" => 1
                ];

                $pageRes = $this->requestCurl($url, $body);
                if ((int)$pageRes->code === 0 && !empty($pageRes->data?->list)) {
                    foreach ($pageRes->data->list as $item) {
                        $devs[] = (int)$item->acsDevIndexCode;
                        $devices[] = [
                            'device_id' => $item->acsDevIndexCode,
                            'name' => $item->acsDevName,
                            'serial_number' => $item->acsDevCode,
                            'status' => $item->status === 1,
                            'updated_at' => $now,
                            'deleted_at' => null
                        ];
                    }
                }
            }

            HCPDevice::query()
                ->withTrashed()
                ->upsert(
                    $devices,
                    ['device_id'],
                    ['name', 'serial_number', 'status', 'updated_at', 'deleted_at']
                );

            HCPDevice::query()->whereNotIn('device_id', $devs)->delete();
        }
    }

    public function getHikCentralInvalidWorkers(): void
    {
        try {
            $records = DB::connection('pgsql_hcp')
                ->table('acsauthority.authority_download_person')
                ->select('person_id', 'device_id', 'status', 'error_code', 'update_time')
                ->where('status', '!=', 0)
                ->get();

            if (count($records) === 0) {
                return;
            }

            $workerHcp = WorkerHikCentral::query()
                ->whereIn('hik_central_person_id', collect($records)->pluck('person_id'))
                ->get()->keyBy('hik_central_person_id');

            $devices = HCPDevice::query()
                ->select('device_id', 'name')
                ->get()
                ->keyBy('device_id');

            $accessLevels = HikCentralAccessLevel::query()
                ->select('id', 'devices')
                ->get();

            foreach ($accessLevels as $level) {
                if (!isarray($level->devices)) {
                    continue;
                }
                if (!$level->devices) {
                    continue;
                }
                foreach ($level->devices as $devId) {
                    $deviceToAccessLevel[$devId] = [
                        'access_level_id' => $level->id,
                        'device_name' => $devices->get($devId)?->name,
                    ];
                }
            }
            $result = [];
            foreach ($records as $rec) {
                $alDev = $deviceToAccessLevel[$rec->device_id] ?? null;
                if (!$alDev) {
                    continue;
                }
                $wH = $workerHcp[$rec->person_id] ?? null;
                if (!$wH) {
                    continue;
                }
                $key = $rec->person_id . '_' . $alDev['access_level_id'];
                if (!isset($result[$key])) {
                    $result[$key] = [
                        'hik_central_person_id' => $rec->person_id,
                        'worker_id' => $wH->worker_id,
                        'worker_hik_central_id' => $wH->id,
                        'worker_photo_id' => $wH->worker_photo_id,
                        'hik_central_key' => 1,
                        'hik_central_access_level_id' => $alDev['access_level_id'],
                        'errors' => [],
                        'status' => 3,
                    ];
                }
                $result[$key]['errors'][] = [
                    'device_id' => $rec->device_id,
                    'code' => $rec->error_code,
                    'time' => $rec->update_time,
                    'name' => $alDev['device_name'],
                ];
            }

            $result = array_map(static function ($item) {
                $item['errors'] = json_encode($item['errors'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
                return $item;
            }, $result);

            WorkerAccessLevel::query()
                ->where('status', '!=', 2)
                ->update([
                    'status' => 2,
                    'errors' => null
                ]);


            $chunks = array_chunk(array_values($result), 500);
            foreach ($chunks as $chunk) {
                WorkerAccessLevel::upsert(
                    $chunk,
                    ['hik_central_person_id', 'hik_central_access_level_id'],
                    ['errors', 'status']
                );
            }
        } catch (Throwable $th) {
            Helper::setLog($th, 'Sync HCP Invalid Workers');
        }
    }
}
