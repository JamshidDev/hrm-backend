<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Modules\Confirmation\Models\DocumentHistory;

class DocumentHistoryService
{
    public static function store($user, $modelType,$url , $model, $document, $status, $text = null): void
    {
        if ($url) {
            $newFileName = $document->uuid . time() . '.docx';
            $path = 'histories/' . $modelType . '/' . $newFileName;
            Storage::disk(config('filesystems.default'))->copy($url, $path);
        }

        DocumentHistory::create([
            'model_id' => $document->id,
            'model_type' => $model,
            'user_id' => $user->id,
            'file' => $url ? $path : null,
            'status' => $status,
            'description' => $text,
        ]);
    }
}
