<?php

namespace Modules\Confirmation\Services;

use App\Jobs\DocxToPdfJob;
use Couchbase\DocumentNotFoundException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ModelTypeEnum;
use Modules\Confirmation\Exceptions\DocumentServiceException;
use RuntimeException;

class DocumentEditorCallbackService
{
    protected const int OO_ONE = 1;     //USER LOGIN/LOGOUT
    protected const int OO_TWO = 2;     //USER EDITED DOCUMENT
    protected const int OO_THREE = 3;   //USER EDITED DOCUMENT (office is not working right now)
    protected const int OO_FOUR = 4;    //USER LOGIN/LOGOUT
    protected const int OO_FIVE = 5;    //USER OPENED/CLOSED DOCUMENT
    protected const int OO_SIX = 6;     //USER EDITED DOCUMENT
    protected const int OO_SEVEN = 7;   //USER EDITED DOCUMENT (office is not working right now)

    private function handle($request, ModelTypeEnum $modelContext): void
    {
        $this->assertValidCallbackUrls($request->url, $request->file_url);

        $document = $modelContext->model()::findOrFail($request->document_id);
        if ($document->confirmation === ConfirmationStatusEnum::SUCCESS->value) {
            throw DocumentServiceException::badRequest(trans('messages.document.already_signed'));
        }

        $path = parse_url($request->file_url, PHP_URL_PATH);
        $fileName = basename($path);
        $documentPath = $request->model . '/' . $fileName;

        $response = Http::timeout(30)->get($request->url);
        if (!$response->successful()) {
            throw new RuntimeException('OnlyOffice callback file could not be downloaded');
        }

        Storage::disk(config('filesystems.default'))->put($documentPath, $response->body());
        $document->update(['file' => $documentPath]);
        DocxToPdfJob::dispatch($documentPath, 'documents/' . $request->model, null, null);
    }

    private function assertValidCallbackUrls(?string $downloadUrl, ?string $fileUrl): void
    {
        foreach ([$downloadUrl, $fileUrl] as $url) {
            if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
                throw new RuntimeException('OnlyOffice callback URL is invalid');
            }

            $scheme = parse_url($url, PHP_URL_SCHEME);
            if (!in_array($scheme, ['http', 'https'], true)) {
                throw new RuntimeException('OnlyOffice callback URL scheme is invalid');
            }
        }

        $downloadHost = parse_url($downloadUrl, PHP_URL_HOST);
        $fileHost = parse_url($fileUrl, PHP_URL_HOST);

        $allowedHosts = config('only-office.allowed_hosts');
        if (!in_array($downloadHost, $allowedHosts) || !in_array($fileHost, $allowedHosts)) {
            throw new RuntimeException('OnlyOffice callback hosts do not match');
        }
    }

    public function updateDocument($request, $model): void
    {
        if (in_array($request->status, [self::OO_TWO, self::OO_SIX], true)) {
            $this->handle($request, $model);
        }
    }
}
