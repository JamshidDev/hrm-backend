<?php

namespace App\Helpers;

use Modules\Confirmation\Enums\ModelTypeEnum;
use Modules\Confirmation\Exceptions\DocumentServiceException;

class DocumentHelper
{
    public static function checkModel($request)
    {
        $modelType = ModelTypeEnum::tryFrom($request->model)?->model();

        $document = $modelType::with(['confirmations.worker'])
            ->withCount(['histories', 'chats', 'files'])
            ->find($request->document_id);

        if (!$document) {
            throw DocumentServiceException::documentNotFound(trans('messages.document.not_found'));
        }

        return $document;
    }

}
