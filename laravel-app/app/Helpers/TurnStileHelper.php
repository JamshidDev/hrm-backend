<?php

namespace App\Helpers;

use App\Traits\Base64FileUploadTrait;
use Carbon\Carbon;
use Modules\HR\Models\WorkerPhoto;

class TurnStileHelper
{
    use Base64FileUploadTrait;

    public function convertImage($worker, $photo, $photoId, $workerPhoto = null): array
    {
        if ($photoId) {
            if (!$workerPhoto) {
                $workerPhoto = WorkerPhoto::find($photoId);
            }
            $photoBase64 = base64_encode(file_get_contents(Helper::fileUrl($workerPhoto->photo)));
            if (strlen($photoBase64) >= 204800) {
                $photoBase64 = ConvertHelper::compressBase64Image($photoBase64);
                $photoBase64 = preg_replace('/^data:image\/[a-zA-Z]+;base64,/', '', $photoBase64);
            }
        } else {
            if (strlen($photo) >= 204800) {
                $photo = ConvertHelper::compressBase64Image($photo);
            }
            $photoPath = $this->uploadBase64File($photo, 'worker-photos', Helper::getFileTypes('image'), 200);
            $workerPhoto = WorkerPhoto::query()->create(['worker_id' => $worker->id, 'photo' => $photoPath]);
            $photoId = $workerPhoto->id;
            $photoBase64 = preg_replace('/^data:image\/[a-zA-Z]+;base64,/', '', $photo);
        }

        return [
            'base64' => $photoBase64,
            'photo_id' => $photoId,
        ];
    }


    public static function calcWorkDuration($events, $cDate): float|int
    {
        $totalMin = 0;
        $today = $cDate === now()->toDateString();
        $date = Carbon::parse($cDate);
        if ($today) {
            $endOfDay = now();
        } else {
            $endOfDay = $date->endOfDay();
        }
        $startOfDay = $date->copy()->startOfDay();
        $lastEventTime = $startOfDay;

        $events = collect($events)
            ->sortBy('event_date_and_time')
            ->reduce(function ($carry, $event) {
            if (!$carry->isEmpty()) {
                $last = $carry->last();
                if ($last->direction === $event->direction) {
                    $carry->pop();
                }
            }
            $carry->push($event);
            return $carry;
        }, collect());

        $in = false;
        foreach ($events as $event) {
            if (!$event->direction) { //Chiqish
                $totalMin += abs(Carbon::parse($event->event_date_and_time)->diffInMinutes($lastEventTime));
                $in = false;
            }
            if ($event->direction) { //Kirish
                $in = true;
                $lastEventTime = Carbon::parse($event->event_date_and_time);
            }
        }
        if ($in) {
            $totalMin += abs($endOfDay->diffInMinutes($lastEventTime));
        }

        return round($totalMin);
    }

    public static function calcWorkDurationDetailed($events, $cDate): array
    {
        $totalDayMin = 0;
        $totalNightMin = 0;
        $today = $cDate === now()->toDateString();
        $date = Carbon::parse($cDate);

        if ($today) {
            $endOfDay = now();
        } else {
            $endOfDay = $date->copy()->endOfDay();
        }
        $startOfDay = $date->copy()->startOfDay();

        $events = collect($events)
            ->sortBy('event_date_and_time')
            ->reduce(function ($carry, $event) {
                if (!$carry->isEmpty()) {
                    $last = $carry->last();
                    if ($last->direction === $event->direction) {
                        $carry->pop();
                    }
                }
                $carry->push($event);
                return $carry;
            }, collect());

        $in = false;
        $lastEventTime = $startOfDay;

        foreach ($events as $event) {
            $eventTime = Carbon::parse($event->event_date_and_time);

            if (!$event->direction) { // Chiqish
                [$dayMin, $nightMin] = self::splitDayNightMinutes($lastEventTime, $eventTime, $date);

                $totalDayMin += $dayMin;
                $totalNightMin += $nightMin;
                $in = false;
            }

            if ($event->direction) { // Kirish
                $in = true;
                $lastEventTime = $eventTime;
            }
        }
        if ($in) {
            [$dayMin, $nightMin] = self::splitDayNightMinutes($lastEventTime, $endOfDay, $date);
            $totalDayMin += $dayMin;
            $totalNightMin += $nightMin;
        }

        return [
            'fact_daily_minutes' => round($totalDayMin + $totalNightMin),
            'fact_daytime' => round($totalDayMin),
            'fact_evening_time' => round($totalNightMin)
        ];
    }

    /**
     * 06:00–22:00 kunduz
     * 00:00–06:00 * 22:00-00:00 kechki
     */
    private static function splitDayNightMinutes($startTime, $endTime, $baseDate): array
    {
        $dayMinutes = 0;
        $nightMinutes = 0;

        $current = $startTime->copy();

        // Kun bo'laklarini belgilash
        $dayStart = $baseDate->copy()->setTime(6, 0);   // 06:00
        $nightStart2 = $baseDate->copy()->setTime(22, 0); // 22:00
        $dayEnd = $baseDate->copy()->endOfDay();        // 23:59

        while ($current < $endTime) {
            // Keyingi chegara nuqtasini aniqlash
            $nextBoundary = null;

            if ($current < $dayStart) {
                $nextBoundary = min($dayStart, $endTime);
                $nightMinutes += $current->diffInMinutes($nextBoundary);
            }
            elseif ($current < $nightStart2) {
                $nextBoundary = min($nightStart2, $endTime);
                $dayMinutes += $current->diffInMinutes($nextBoundary);
            }
            else {
                $nextBoundary = min($dayEnd, $endTime);
                $nightMinutes += $current->diffInMinutes($nextBoundary);
            }

            $current = $nextBoundary;
        }

        return [$dayMinutes, $nightMinutes];
    }
}
