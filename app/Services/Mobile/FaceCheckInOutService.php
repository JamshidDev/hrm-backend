<?php

namespace App\Services\Mobile;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Modules\HR\Models\DepartmentLocation;
use Modules\Turnstile\Models\TerminalEvent;

class FaceCheckInOutService
{

    public function __construct()
    {
    }

    public function lastEvent($user): ?array
    {
        $event = TerminalEvent::query()
            ->where('worker_id', $user->worker_id)
            ->latest('event_date_and_time')
            ->first();

        if (!$event) {
            return null;
        }

        return [
            'event_date_and_time' => $event->event_date_and_time,
            'direction' => $event->direction,
            'auth_type' => $event->auth_type,
            'device_name' => $event->device_name
        ];
    }

    public function checkLocation(array $data, $user): array
    {
        $lat = (float)$data['lat'];
        $lng = (float)$data['lng'];
        $accuracy = array_key_exists('accuracy', $data) ? (float)$data['accuracy'] : null;

        $locations = Cache::remember(
            $this->departmentLocationsCacheKey($user),
            now()->addSeconds(10),
            fn() => DepartmentLocation::query()
                ->with(['department:id,name,organization_id', 'department.organization:id,name'])
                ->get()
        );

        $matches = $locations
            ->map(fn(DepartmentLocation $location) => $this->matchLocationPayload($location, $lat, $lng, $accuracy))
            ->filter()
            ->values()
            ->sortBy(fn(array $item) => $item['distance'] ?? PHP_FLOAT_MAX)
            ->values();

        return [
            'lat' => $lat,
            'lng' => $lng,
            'accuracy' => $accuracy,
            'count' => $matches->count(),
            'departments' => $matches,
        ];
    }

    private function departmentLocationsCacheKey($user): string
    {
        return 'department_locations:visible:user:' . $user->id;
    }

    private function matchLocationPayload(DepartmentLocation $location, float $lat, float $lng, ?float $accuracy): ?array
    {
        if ($location->geo_type === true) {
            // polygon
            if (!$this->pointInPolygon($lat, $lng, collect($location->polygon))) {
                return null;
            }
            $distance = $this->distanceInMeters(
                $lat, $lng,
                $location->lat, $location->lng
            );
            return $this->buildMatchPayload($location, $accuracy, $distance, null);
        } else {
            // circle
            $distance = $this->distanceInMeters($lat, $lng, (float)$location->lat, (float)$location->lng);
            $effectiveRadius = (float)$location->radius + ($accuracy ?? 0);

            if ($distance > $effectiveRadius) {
                return null;
            }

            return $this->buildMatchPayload(
                $location,
                $accuracy,
                round($distance, 2),
                round($effectiveRadius, 2)
            );
        }
    }

    private function buildMatchPayload(
        DepartmentLocation $location,
        ?float $accuracy,
        ?float $distance,
        ?float $effectiveRadius
    ): array {
        return [
            'department_location_id' => $location->id,
            'department_id' => $location->department_id,
            'department_name' => $location->department?->name,
            'organization_id' => $location->department?->organization_id,
            'organization_name' => $location->department?->organization?->name,
            'geo_type' => $location->geo_type,
            'radius' => $location->radius,
            'effective_radius' => $effectiveRadius,
            'accuracy_limit' => $location->accuracy_limit,
            'distance' => $distance,
            'accuracy' => $accuracy,
            'inside' => true,
        ];
    }

    private function distanceInMeters(float $fromLat, float $fromLng, float $toLat, float $toLng): float
    {
        $earthRadius = 6371000;

        $latDelta = deg2rad($toLat - $fromLat);
        $lngDelta = deg2rad($toLng - $fromLng);

        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($fromLat)) * cos(deg2rad($toLat)) * sin($lngDelta / 2) ** 2;

        return 2 * $earthRadius * asin(min(1, sqrt($a)));
    }

    private function pointInPolygon(float $lat, float $lng, Collection $polygon): bool
    {
        if ($polygon->count() < 3) {
            return false;
        }

        $inside = false;
        $points = $polygon
            ->map(fn($point) => [
                'lat' => (float)($point['lat'] ?? 0),
                'lng' => (float)($point['lng'] ?? 0),
            ])
            ->values();

        $j = $points->count() - 1;

        for ($i = 0; $i < $points->count(); $i++) {
            $current = $points[$i];
            $previous = $points[$j];

            if ($this->isPointOnSegment($lat, $lng, $previous, $current)) {
                return true;
            }

            if ($previous['lat'] == $current['lat']) {
                $j = $i;
                continue;
            }

            $intersects = (($current['lat'] > $lat) !== ($previous['lat'] > $lat))
                && ($lng < (($previous['lng'] - $current['lng']) * ($lat - $current['lat']) / ($previous['lat'] - $current['lat']) + $current['lng']));

            if ($intersects) {
                $inside = !$inside;
            }

            $j = $i;
        }

        return $inside;
    }

    private function isPointOnSegment(float $lat, float $lng, array $start, array $end): bool
    {
        $crossProduct = ($lng - $start['lng']) * ($end['lat'] - $start['lat'])
            - ($lat - $start['lat']) * ($end['lng'] - $start['lng']);

        if (abs($crossProduct) > 0.0000001) {
            return false;
        }

        return $lng >= min($start['lng'], $end['lng'])
            && $lng <= max($start['lng'], $end['lng'])
            && $lat >= min($start['lat'], $end['lat'])
            && $lat <= max($start['lat'], $end['lat']);
    }
}
