<?php

namespace App\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Requests\Deploy\DeployIndexRequest;
use App\Http\Requests\Deploy\DeployPublishRequest;
use App\Http\Requests\Deploy\DeployStoreRequest;
use App\Http\Requests\Deploy\DeployUploadRequest;
use App\Services\Deploy\DeployService;
use Illuminate\Http\JsonResponse;

class DeployController extends Controller
{
    public function __construct(private readonly DeployService $service)
    {
    }

    public function index(DeployIndexRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->index($request->validated()));
    }

    public function store(DeployStoreRequest $request): JsonResponse
    {
        $this->service->logBackend(auth()->id(), $request->validated());

        return Helper::response(trans('messages.deploy_success'));
    }

    public function upload(DeployUploadRequest $request): JsonResponse
    {
        $this->service->uploadFrontend(
            auth()->id(),
            $request->file('zip'),
            $request->validated(),
        );

        return Helper::response(trans('messages.deploy_success'));
    }

    public function publish(int $id, DeployPublishRequest $request): JsonResponse
    {
        $this->service->publish($id, $request->validated());

        return Helper::response(trans('messages.deploy_published_success'));
    }
}
