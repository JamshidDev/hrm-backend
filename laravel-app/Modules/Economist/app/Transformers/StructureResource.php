<?php

namespace Modules\Economist\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\ResourceCollection;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Economist\Enums\UploadStatusEnum;
use Modules\Economist\Enums\UploadTypeEnum;

class StructureResource extends JsonResource
{
    protected $deadline;
    protected $now;

    public function __construct($resource, $deadline = null, $now = null)
    {
        parent::__construct($resource);
        $this->deadline = $deadline;
        $this->now = $now;
    }

    public function toArray(Request $request): array
    {
        if (!$this->uploadStatus && $this->now->greaterThan($this->deadline)) {
            $uploadStatus = false;
        } else {
            $uploadStatus = true;
        }
        return [
            'id' => $this->id,
            'name' => $this->name . ' (' . $this->code . ')',
            'group' => $this->group,
            'uploadStats' => $this->getUploadStatsList(),
            'children' => self::collectionWithDeadline($this->whenLoaded('children'), $this->deadline, $this->now),
            'uploadStatus' => $uploadStatus,
        ];
    }

    public static function collectionWithDeadline($resource, $deadline, $now)
    {
        return new ResourceCollection(collect($resource)
            ->map(function ($item) use ($deadline, $now) {
                return new static($item, $deadline, $now);
            }));
    }

    protected function getUploadStatsList(): array
    {
        $uploads = $this->whenLoaded('economistUploads') ?? collect();

        return collect(UploadTypeEnum::cases())->mapWithKeys(function ($enum) use ($uploads) {
            $typeUploads = $uploads->where('type', $enum->value);

            return [
                $enum->value => [
                    'id' => $enum,
                    'type' => $enum->label(),
                    'uploaded_count' => $typeUploads->count(),
                    'confirmed' => $typeUploads->where('status', UploadStatusEnum::SUCCESS->value)->count() > 0,
                ]
            ];
        })->toArray();
    }

    protected function getUploadStats(): array
    {
        $uploads = $this->whenLoaded('economistUploads') ?? collect();

        $types = UploadTypeEnum::cases();
        $uploaded = 0;
        $confirmed = 0;

        foreach ($types as $enum) {
            $typeUploads = $uploads->where('type', $enum->value);
            if ($typeUploads->isNotEmpty()) {
                $uploaded++;
            }
            if ($typeUploads->where('status', ConfirmationStatusEnum::SUCCESS->value)->isNotEmpty()) {
                $confirmed++;
            }
        }

        return [
            'total_types' => count($types),
            'uploaded' => $uploaded,
            'confirmed' => $confirmed,
        ];
    }

}
